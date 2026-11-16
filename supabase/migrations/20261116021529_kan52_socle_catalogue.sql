-- KAN-52 — Socle du catalogue de services et des organisations (ADR-003, accepté le 2026-11-16).
-- Structure seulement pour organization / org_domain / org_service / membership : leur gestion
-- (écrans, invitations, territoires) relève de KAN-51, KAN-54, KAN-55, KAN-56.

------------------------------------------------------------------------------ schéma privé
-- Fonctions d'accès utilisées par la RLS ; schéma non exposé par l'API PostgREST.
create schema if not exists private;
grant usage on schema private to authenticated;

------------------------------------------------------------------------------ paramètres
create table public.app_settings (
  id                  boolean primary key default true check (id),   -- une seule ligne
  catalog_version     bigint  not null default 1,
  allow_live_delivery boolean not null default false                 -- second verrou KAN-46
);
insert into public.app_settings default values;

------------------------------------------------------------------------------ plateforme
create table public.platform_admin (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create table public.organization (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (length(trim(name)) between 2 and 120),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  status            text not null default 'demo' check (status in ('demo', 'active', 'suspended')),
  plan              text,
  default_territory extensions.geometry(MultiPolygon, 4326)
                    check (default_territory is null or extensions.st_isvalid(default_territory)),
  delivery_mode     text not null default 'demo' check (delivery_mode in ('demo', 'live')),
  demo_target       text,
  live_target       text,
  agreement_ref     text,
  created_at        timestamptz not null default now(),
  -- Garde-fous KAN-46 / ADR-003 D2
  constraint demo_implique_envoi_demo check (status <> 'demo' or delivery_mode = 'demo'),
  constraint active_exige_accord      check (status <> 'active' or agreement_ref is not null),
  constraint live_exige_accord        check (delivery_mode = 'demo' or agreement_ref is not null)
);
create index organization_default_territory_gix on public.organization using gist (default_territory);

-- Mono-organisation au MVP (ADR-003 D1) : user_id est la clé primaire.
create table public.membership (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  org_id     uuid not null references public.organization (id) on delete cascade,
  role       text not null check (role in ('org_admin', 'dispatcher', 'field_worker')),
  status     text not null default 'invited' check (status in ('invited', 'active', 'disabled')),
  invited_at timestamptz not null default now()
);
create index membership_org_id_idx on public.membership (org_id);

------------------------------------------------------------------------------ catalogue
create table public.domain (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique check (code ~ '^[a-z0-9_]+$'),
  label_fr   text not null,
  label_en   text,
  sort_order int  not null default 100
);

create table public.service_template (
  id                uuid primary key default gen_random_uuid(),
  domain_id         uuid not null references public.domain (id) on delete restrict,
  code              text not null unique check (code ~ '^[a-z0-9_]+$'),
  category          text not null,                          -- regroupement affiché au citoyen
  label_fr          text not null,
  label_en          text,
  icon              text not null,
  default_priority  text not null default 'medium' check (default_priority in ('low', 'medium', 'high')),
  default_sla_hours int  not null check (default_sla_hours between 1 and 2160),
  is_emergency      boolean not null default false,         -- → écran 911 bloquant (KAN-18)
  active            boolean not null default true,
  sort_order        int  not null default 100
);
create index service_template_domain_idx on public.service_template (domain_id);

create table public.org_domain (
  org_id    uuid not null references public.organization (id) on delete cascade,
  domain_id uuid not null references public.domain (id) on delete restrict,
  primary key (org_id, domain_id)
);

create table public.org_service (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references public.organization (id) on delete cascade,
  service_template_id uuid not null references public.service_template (id) on delete restrict,
  enabled             boolean not null default true,
  label_override      text,
  sla_hours           int check (sla_hours is null or sla_hours between 1 and 2160),
  routing_priority    int not null default 100 check (routing_priority between 1 and 1000),
  territory           extensions.geometry(MultiPolygon, 4326)
                      check (territory is null or extensions.st_isvalid(territory)),
  schedule            jsonb,                                  -- KAN-20 CA5 (décision PO en attente)
  unique (org_id, service_template_id)
);
create index org_service_template_idx on public.org_service (service_template_id);
create index org_service_territory_gix on public.org_service using gist (territory);

------------------------------------------------------------------------------ fonctions d'accès (ADR-003 D3)
-- Le claim JWT n'est jamais suffisant : il est confirmé en base à chaque requête.
create function private.is_platform_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((auth.jwt() ->> 'is_platform_admin')::boolean, false)
     and exists (select 1 from public.platform_admin where user_id = auth.uid());
$$;

create function private.current_org() returns uuid
language sql stable security definer set search_path = '' as $$
  select m.org_id
  from public.membership m join public.organization o on o.id = m.org_id
  where m.user_id = auth.uid() and m.status = 'active' and o.status <> 'suspended'
    and m.org_id = nullif(auth.jwt() ->> 'org_id', '')::uuid;
$$;

create function private.current_org_role() returns text
language sql stable security definer set search_path = '' as $$
  select m.role
  from public.membership m join public.organization o on o.id = m.org_id
  where m.user_id = auth.uid() and m.status = 'active' and o.status <> 'suspended'
    and m.org_id = nullif(auth.jwt() ->> 'org_id', '')::uuid;
$$;

revoke all on function private.is_platform_admin(), private.current_org(), private.current_org_role() from public;
grant execute on function private.is_platform_admin(), private.current_org(), private.current_org_role() to authenticated;

------------------------------------------------------------------------------ règles d'intégrité
-- CA3 : un service type ou un domaine ne se supprime jamais ; on le désactive (active = false),
-- pour que les signalements existants restent consultables.
create function private.forbid_delete() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Suppression interdite sur % : désactiver plutôt (active = false)', tg_table_name
    using errcode = 'restrict_violation';
end;
$$;
create trigger service_template_no_delete before delete on public.service_template
  for each row execute function private.forbid_delete();
create trigger domain_no_delete before delete on public.domain
  for each row execute function private.forbid_delete();

-- KAN-55 : un org_service ne référence qu'un service type d'un domaine de l'organisation.
create function private.check_org_service_domain() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from public.service_template st
    join public.org_domain od on od.domain_id = st.domain_id and od.org_id = new.org_id
    where st.id = new.service_template_id
  ) then
    raise exception 'Le service type n''appartient à aucun domaine de l''organisation'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger org_service_domain_check before insert or update of org_id, service_template_id
  on public.org_service for each row execute function private.check_org_service_domain();

-- CA5 : toute modification du catalogue (ou de ce qui le filtre) incrémente catalog_version.
create function private.bump_catalog_version() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.app_settings set catalog_version = catalog_version + 1 where id;
  return null;
end;
$$;
create trigger domain_catalog_version after insert or update or delete on public.domain
  for each statement execute function private.bump_catalog_version();
create trigger service_template_catalog_version after insert or update or delete on public.service_template
  for each statement execute function private.bump_catalog_version();
create trigger org_domain_catalog_version after insert or update or delete on public.org_domain
  for each statement execute function private.bump_catalog_version();
create trigger org_service_catalog_version after insert or update or delete on public.org_service
  for each statement execute function private.bump_catalog_version();
create trigger organization_catalog_version after insert or delete or update of status, default_territory
  on public.organization for each statement execute function private.bump_catalog_version();

------------------------------------------------------------------------------ RLS
alter table public.app_settings     enable row level security;
alter table public.platform_admin   enable row level security;   -- aucune politique : lu par fonctions seulement
alter table public.organization     enable row level security;
alter table public.membership       enable row level security;
alter table public.domain           enable row level security;
alter table public.service_template enable row level security;
alter table public.org_domain       enable row level security;
alter table public.org_service      enable row level security;

-- Paramètres : lecture publique (catalog_version), écriture super admin.
create policy app_settings_lecture on public.app_settings for select to anon, authenticated using (true);
create policy app_settings_super_admin on public.app_settings for update to authenticated
  using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));

-- Catalogue : lecture publique des éléments actifs, gestion par le super admin.
create policy domain_lecture on public.domain for select to anon, authenticated using (true);
create policy domain_super_admin on public.domain for all to authenticated
  using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));
create policy service_template_lecture on public.service_template for select to anon, authenticated
  using (active or (select private.is_platform_admin()));
create policy service_template_super_admin on public.service_template for all to authenticated
  using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));

-- Organisations : chaque membre lit la sienne ; le super admin gère tout.
create policy organization_lecture on public.organization for select to authenticated
  using (id = (select private.current_org()) or (select private.is_platform_admin()));
create policy organization_super_admin on public.organization for all to authenticated
  using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));

create policy membership_lecture on public.membership for select to authenticated
  using (user_id = auth.uid() or (select private.is_platform_admin()));
create policy membership_super_admin on public.membership for all to authenticated
  using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));

create policy org_domain_lecture on public.org_domain for select to authenticated
  using (org_id = (select private.current_org()) or (select private.is_platform_admin()));
create policy org_domain_super_admin on public.org_domain for all to authenticated
  using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));

create policy org_service_lecture on public.org_service for select to authenticated
  using (org_id = (select private.current_org()) or (select private.is_platform_admin()));
create policy org_service_super_admin on public.org_service for all to authenticated
  using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));
-- Écriture par l'admin d'organisation : ajoutée par KAN-55.

------------------------------------------------------------------------------ catalogue citoyen (CA4)
-- Services proposés à une position : service actif, activé par une organisation non suspendue
-- (active ou demo) dont le territoire couvre le point. Le destinataire prévu suit l'ordre de
-- routage de l'ADR-003 D4 : plus petit territoire, puis routing_priority croissant.
-- Appelée par l'API /v1 (Edge Function, rôle service_role) : jamais exposée directement.
create function public.available_services(p_lat double precision, p_lng double precision)
returns jsonb
language sql stable security definer set search_path = '' as $$
  with pt as (
    select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326) as geom
  ),
  candidates as (
    select distinct on (st.id)
      st.id, st.code, st.category, st.icon, st.is_emergency, st.default_priority, st.sort_order,
      coalesce(os.label_override, st.label_fr) as label_fr,
      st.label_en,
      d.code as domain_code, d.label_fr as domain_label_fr, d.sort_order as domain_sort,
      o.name as organization_name, o.status as organization_status
    from public.service_template st
    join public.domain d       on d.id = st.domain_id
    join public.org_service os on os.service_template_id = st.id and os.enabled
    join public.organization o on o.id = os.org_id and o.status in ('active', 'demo')
    cross join pt
    where st.active
      and extensions.st_covers(coalesce(os.territory, o.default_territory), pt.geom)
    order by st.id,
             extensions.st_area(coalesce(os.territory, o.default_territory)::extensions.geography),
             os.routing_priority
  )
  select jsonb_build_object(
    'catalog_version', (select catalog_version from public.app_settings where id),
    'services', coalesce(jsonb_agg(jsonb_build_object(
        'code', c.code,
        'domain', c.domain_code,
        'domain_label', c.domain_label_fr,
        'category', c.category,
        'label', c.label_fr,
        'label_en', c.label_en,
        'icon', c.icon,
        'is_emergency', c.is_emergency,
        'default_priority', c.default_priority,
        'recipient', c.organization_name,
        'recipient_is_demo', c.organization_status = 'demo'
      ) order by c.domain_sort, c.sort_order, c.label_fr), '[]'::jsonb))
  from candidates c;
$$;
revoke all on function public.available_services(double precision, double precision) from public, anon, authenticated;
grant execute on function public.available_services(double precision, double precision) to service_role;

comment on function public.available_services(double precision, double precision) is
  'KAN-52 CA4 — catalogue citoyen filtré par position. Accès : service_role (API /v1) uniquement.';
