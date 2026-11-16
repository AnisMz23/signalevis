-- KAN-51 — Gestion des organisations par le super admin : création, statut, liste agrégée,
-- invitation du premier admin, journal d'audit (ADR-003 D2, D3, D7).
-- Toutes les fonctions publiques vérifient le super admin EN BASE (private.is_platform_admin()).

------------------------------------------------------------------------------ contact (CA1)
alter table public.organization
  add column contact_email text check (contact_email is null or contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  add column contact_phone text;

------------------------------------------------------------------------------ journal d'audit (append-only)
create table public.audit_log (
  id        bigint generated always as identity primary key,
  at        timestamptz not null default now(),
  actor_id  uuid,
  org_id    uuid references public.organization (id) on delete set null,
  action    text not null,
  entity    text not null,
  entity_id uuid,
  before    jsonb,
  after     jsonb
);
create index audit_log_org_idx on public.audit_log (org_id, at desc);

-- Append-only réel : même le service_role (qui contourne la RLS) ne peut ni modifier ni supprimer.
create function private.forbid_audit_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Le journal d''audit est en ajout seul' using errcode = 'insufficient_privilege';
end;
$$;
create trigger audit_log_append_only before update or delete on public.audit_log
  for each row execute function private.forbid_audit_change();
create trigger audit_log_no_truncate before truncate on public.audit_log
  for each statement execute function private.forbid_audit_change();

alter table public.audit_log enable row level security;
create policy audit_log_lecture on public.audit_log for select to authenticated
  using ((select private.is_platform_admin())
         or (org_id = (select private.current_org()) and (select private.current_org_role()) = 'org_admin'));
-- Aucune politique d'écriture : seules les fonctions SECURITY DEFINER ci-dessous écrivent.

create function private.audit(p_action text, p_entity text, p_entity_id uuid, p_org uuid,
                              p_before jsonb, p_after jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_log (actor_id, org_id, action, entity, entity_id, before, after)
  values (auth.uid(), p_org, p_action, p_entity, p_entity_id, p_before, p_after);
$$;
revoke all on function private.audit(text, text, uuid, uuid, jsonb, jsonb) from public;

create function private.require_platform_admin() returns void
language plpgsql stable set search_path = '' as $$
begin
  if not coalesce(private.is_platform_admin(), false) then
    raise exception 'Réservé au super admin' using errcode = 'insufficient_privilege';
  end if;
end;
$$;
revoke all on function private.require_platform_admin() from public;
grant execute on function private.require_platform_admin() to authenticated;

------------------------------------------------------------------------------ invitations (CA2)
-- L'invitation vaut 7 jours. Le courriel lui-même (lien Supabase) peut être renvoyé tant que
-- l'invitation est valide ; la membership passe à « active » à la première confirmation.
create table public.invitation (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organization (id) on delete cascade,
  email        text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role         text not null default 'org_admin' check (role in ('org_admin', 'dispatcher', 'field_worker')),
  invited_by   uuid,
  user_id      uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '7 days',
  last_sent_at timestamptz,
  send_count   int not null default 0,
  accepted_at  timestamptz,
  revoked_at   timestamptz
);
create unique index invitation_une_en_cours on public.invitation (org_id, email)
  where accepted_at is null and revoked_at is null;

alter table public.invitation enable row level security;
create policy invitation_lecture on public.invitation for select to authenticated
  using ((select private.is_platform_admin())
         or (org_id = (select private.current_org()) and (select private.current_org_role()) = 'org_admin'));

------------------------------------------------------------------------------ fonctions super admin
-- CA1 : créer une organisation (toujours en mode d'envoi « demo » à la création).
create function public.create_organization(
  p_name text, p_slug text, p_domains text[], p_status text default 'demo',
  p_contact_email text default null, p_contact_phone text default null, p_agreement_ref text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_missing text[];
begin
  perform private.require_platform_admin();

  select array_agg(c) into v_missing
  from unnest(coalesce(p_domains, '{}')) c
  where not exists (select 1 from public.domain d where d.code = c);
  if v_missing is not null then
    raise exception 'Domaine(s) inconnu(s) : %', array_to_string(v_missing, ', ') using errcode = 'check_violation';
  end if;
  if coalesce(cardinality(p_domains), 0) = 0 then
    raise exception 'Au moins un domaine d''activité est requis' using errcode = 'check_violation';
  end if;

  insert into public.organization (name, slug, status, contact_email, contact_phone, agreement_ref)
  values (trim(p_name), lower(trim(p_slug)), p_status, lower(p_contact_email), p_contact_phone, p_agreement_ref)
  returning id into v_id;

  insert into public.org_domain (org_id, domain_id)
  select v_id, d.id from public.domain d where d.code = any (p_domains);

  perform private.audit('organization.create', 'organization', v_id, v_id, null,
    jsonb_build_object('name', p_name, 'slug', p_slug, 'status', p_status, 'domains', p_domains));
  return v_id;
end;
$$;

-- CA4 : changer le statut (suspension / réactivation / passage en active avec accord).
create function public.set_organization_status(p_org uuid, p_status text, p_agreement_ref text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_before jsonb;
begin
  perform private.require_platform_admin();
  select jsonb_build_object('status', status, 'agreement_ref', agreement_ref) into v_before
  from public.organization where id = p_org for update;
  if v_before is null then
    raise exception 'Organisation introuvable' using errcode = 'no_data_found';
  end if;

  update public.organization
     set status = p_status,
         agreement_ref = coalesce(p_agreement_ref, agreement_ref)
   where id = p_org;

  perform private.audit('organization.status', 'organization', p_org, p_org, v_before,
    jsonb_build_object('status', p_status, 'agreement_ref', coalesce(p_agreement_ref, v_before ->> 'agreement_ref')));
end;
$$;

-- CA3 : liste avec agrégats seulement (aucun contenu de signalement — ADR-003 D7).
-- reports_30d : NULL tant que la table des signalements n'existe pas (KAN-17), plutôt qu'un faux 0.
create function public.list_organizations()
returns table (id uuid, name text, slug text, status text, domains text[],
               active_members bigint, pending_invitations bigint, reports_30d bigint, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_platform_admin();
  return query
  select o.id, o.name, o.slug, o.status,
         coalesce((select array_agg(d.code order by d.sort_order) from public.org_domain od
                   join public.domain d on d.id = od.domain_id where od.org_id = o.id), '{}'),
         (select count(*) from public.membership m where m.org_id = o.id and m.status = 'active'),
         (select count(*) from public.invitation i where i.org_id = o.id and i.accepted_at is null
                 and i.revoked_at is null and i.expires_at > now()),
         null::bigint,
         o.created_at
  from public.organization o
  order by o.name;
end;
$$;

-- CA2 : préparer (ou renvoyer) l'invitation. Appelée par l'API /v1 avec le JWT de l'appelant.
create function public.create_invitation(p_org uuid, p_email text, p_role text default 'org_admin')
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(p_email));
  v_org_status text;
  v_inv public.invitation;
  v_other_org uuid;
  v_resend boolean := false;
begin
  perform private.require_platform_admin();

  select status into v_org_status from public.organization where id = p_org;
  if v_org_status is null then
    raise exception 'Organisation introuvable' using errcode = 'no_data_found';
  elsif v_org_status = 'suspended' then
    raise exception 'Organisation suspendue : invitation impossible' using errcode = 'check_violation';
  end if;

  -- Mono-organisation (ADR-003 D1) : un compte déjà membre d'une AUTRE organisation est refusé.
  select m.org_id into v_other_org
  from public.membership m join auth.users u on u.id = m.user_id
  where lower(u.email) = v_email and m.org_id <> p_org;
  if v_other_org is not null then
    raise exception 'Ce courriel appartient déjà à une autre organisation' using errcode = 'unique_violation';
  end if;

  select * into v_inv from public.invitation
  where org_id = p_org and email = v_email and accepted_at is null and revoked_at is null
  for update;

  if found and v_inv.expires_at > now() then
    v_resend := true;                                   -- renvoi : même invitation, nouvel envoi
  else
    if found then                                       -- expirée : on la clôt, on en crée une neuve
      update public.invitation set revoked_at = now() where id = v_inv.id;
    end if;
    insert into public.invitation (org_id, email, role, invited_by)
    values (p_org, v_email, p_role, auth.uid())
    returning * into v_inv;
  end if;

  update public.invitation set last_sent_at = now(), send_count = send_count + 1
  where id = v_inv.id returning * into v_inv;

  perform private.audit(case when v_resend then 'invitation.resend' else 'invitation.create' end,
    'invitation', v_inv.id, p_org, null, jsonb_build_object('email', v_email, 'role', p_role));

  return jsonb_build_object('invitation_id', v_inv.id, 'email', v_inv.email, 'role', v_inv.role,
                            'expires_at', v_inv.expires_at, 'resend', v_resend);
end;
$$;

-- Rattache le compte Supabase créé par l'envoi du courriel (appel serveur, service_role seulement).
create function public.attach_invited_user(p_invitation uuid, p_user uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.invitation;
begin
  select * into v_inv from public.invitation where id = p_invitation;
  update public.invitation set user_id = p_user where id = p_invitation;
  insert into public.membership (user_id, org_id, role, status)
  values (p_user, v_inv.org_id, v_inv.role, 'invited')
  on conflict (user_id) do nothing;
end;
$$;

revoke all on function
  public.create_organization(text, text, text[], text, text, text, text),
  public.set_organization_status(uuid, text, text),
  public.list_organizations(),
  public.create_invitation(uuid, text, text),
  public.attach_invited_user(uuid, uuid)
from public, anon;
grant execute on function
  public.create_organization(text, text, text[], text, text, text, text),
  public.set_organization_status(uuid, text, text),
  public.list_organizations(),
  public.create_invitation(uuid, text, text)
to authenticated;
revoke execute on function public.attach_invited_user(uuid, uuid) from authenticated;
grant execute on function public.attach_invited_user(uuid, uuid) to service_role;

------------------------------------------------------------------------------ activation à la confirmation
-- Quand le compte invité confirme son courriel (clic sur le lien), la membership devient active
-- si l'invitation est encore valide (7 jours) ; sinon elle reste « invited ».
create function private.activate_invited_membership() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is not null and (old.email_confirmed_at is null or old.last_sign_in_at is distinct from new.last_sign_in_at) then
    with valid as (
      update public.invitation i
         set accepted_at = now()
       where i.user_id = new.id and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
      returning i.org_id, i.id
    )
    update public.membership m
       set status = 'active'
      from valid
     where m.user_id = new.id and m.org_id = valid.org_id and m.status = 'invited';
  end if;
  return new;
end;
$$;
create trigger on_auth_user_confirmed after update of email_confirmed_at, last_sign_in_at on auth.users
  for each row execute function private.activate_invited_membership();
