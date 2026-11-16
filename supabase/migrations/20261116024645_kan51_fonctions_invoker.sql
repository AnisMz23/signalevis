-- KAN-51 — Correctif advisor Supabase 0029 : les fonctions super admin passent en SECURITY INVOKER.
-- Elles s'exécutent avec les droits de l'appelant : la RLS (politiques *_super_admin) s'applique
-- directement, en plus du contrôle explicite private.require_platform_admin().
-- Seules deux opérations gardent des droits élevés, dans le schéma privé (non exposé par l'API) :
-- l'écriture du journal d'audit et la vérification « courriel déjà membre ailleurs » (lit auth.users).

alter function public.create_organization(text, text, text[], text, text, text, text) security invoker;
alter function public.set_organization_status(uuid, text, text) security invoker;
alter function public.list_organizations() security invoker;

grant execute on function private.audit(text, text, uuid, uuid, jsonb, jsonb) to authenticated;

create policy invitation_super_admin on public.invitation for all to authenticated
  using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));

create function private.email_other_org(p_email text, p_org uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select m.org_id from public.membership m join auth.users u on u.id = m.user_id
  where lower(u.email) = lower(p_email) and m.org_id <> p_org
  limit 1;
$$;
revoke all on function private.email_other_org(text, uuid) from public;
grant execute on function private.email_other_org(text, uuid) to authenticated;

create or replace function public.create_invitation(p_org uuid, p_email text, p_role text default 'org_admin')
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_email text := lower(trim(p_email));
  v_org_status text;
  v_inv public.invitation;
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
  if private.email_other_org(v_email, p_org) is not null then
    raise exception 'Ce courriel appartient déjà à une autre organisation' using errcode = 'unique_violation';
  end if;

  select * into v_inv from public.invitation
  where org_id = p_org and email = v_email and accepted_at is null and revoked_at is null
  for update;

  if found and v_inv.expires_at > now() then
    v_resend := true;
  else
    if found then
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
