-- KAN-50 — Prototype jetable du modèle multi-tenant (ADR-003).
-- Exécuté sur signalevis-staging le 2026-11-16. TOUT est annulé : le bloc se termine par une
-- exception volontaire (« PROTO_RESULTATS ») qui force le ROLLBACK. Aucune trace en base.
-- Ce n'est pas du code de production : il valide les choix de l'ADR-003 par des tests réels.
--
-- Le hook JWT (Custom Access Token Hook) n'est pas activé ici : ses claims sont simulés avec
-- set_config('request.jwt.claims', …), exactement ce que lisent auth.uid() et auth.jwt().

do $proto$
declare
  ville uuid := gen_random_uuid(); mtmd uuid := gen_random_uuid(); stl uuid := gen_random_uuid();
  u_disp_v uuid := gen_random_uuid(); u_disp_m uuid := gen_random_uuid();
  u_fw1 uuid := gen_random_uuid(); u_fw2 uuid := gen_random_uuid();
  u_cit uuid := gen_random_uuid(); u_sa uuid := gen_random_uuid();
  r1 uuid := gen_random_uuid(); r2 uuid := gen_random_uuid(); r3 uuid := gen_random_uuid();
  s_ville_nid uuid := gen_random_uuid(); s_mtmd_nid uuid := gen_random_uuid();
  s_ville_lamp uuid := gen_random_uuid(); s_stl_lamp uuid := gen_random_uuid();
  n int; res text := ''; got uuid; ok boolean;
  box text := 'MULTIPOLYGON(((-71.30 46.70,-71.00 46.70,-71.00 46.85,-71.30 46.85,-71.30 46.70)))';
begin
  ------------------------------------------------------------------ schéma
  create schema proto;
  create table proto.organization(
    id uuid primary key, name text not null,
    status text not null check (status in ('demo','active','suspended')),
    delivery_mode text not null default 'demo' check (delivery_mode in ('demo','live')),
    agreement_ref text,
    constraint demo_implique_envoi_demo check (status <> 'demo' or delivery_mode = 'demo'),
    constraint active_exige_accord check (status <> 'active' or agreement_ref is not null),
    constraint live_exige_accord check (delivery_mode = 'demo' or agreement_ref is not null));
  create table proto.platform_admin(user_id uuid primary key);
  create table proto.membership(
    user_id uuid primary key,                      -- mono-organisation au MVP
    org_id uuid not null references proto.organization,
    role text not null check (role in ('org_admin','dispatcher','field_worker')),
    status text not null check (status in ('invited','active','disabled')));
  create table proto.org_service(
    id uuid primary key, org_id uuid not null references proto.organization,
    service_code text not null, enabled boolean not null default true,
    routing_priority int not null default 100,
    territory extensions.geometry(MultiPolygon,4326) not null);
  create table proto.report(
    id uuid primary key, citizen_id uuid not null, service_code text not null,
    description text, citizen_contact text,         -- identité : jamais visible côté organisation
    location extensions.geometry(Point,4326) not null);
  create table proto.report_assignment(
    report_id uuid references proto.report, org_id uuid references proto.organization,
    org_service_id uuid, active boolean not null default true,
    primary key (report_id, org_id));
  create unique index une_affectation_active on proto.report_assignment(report_id) where active;
  create table proto.work_order(
    id uuid primary key default gen_random_uuid(), report_id uuid references proto.report,
    org_id uuid references proto.organization, assignee_id uuid not null);
  create table proto.support_access_grant(
    org_id uuid references proto.organization, expires_at timestamptz not null, revoked_at timestamptz);

  ------------------------------------------------------------------ fonctions d'accès
  -- Organisation courante = claim JWT CONFIRMÉ en base (membre actif, organisation non suspendue).
  -- Corrige le délai de révocation d'un JWT déjà émis (suspension, retrait d'un membre).
  create function proto.current_org() returns uuid language sql stable security definer
    set search_path = '' as $f$
    select m.org_id from proto.membership m join proto.organization o on o.id = m.org_id
    where m.user_id = auth.uid() and m.status = 'active' and o.status <> 'suspended'
      and m.org_id = nullif(auth.jwt() ->> 'org_id', '')::uuid $f$;
  create function proto.current_org_role() returns text language sql stable security definer
    set search_path = '' as $f$
    select m.role from proto.membership m join proto.organization o on o.id = m.org_id
    where m.user_id = auth.uid() and m.status = 'active' and o.status <> 'suspended'
      and m.org_id = nullif(auth.jwt() ->> 'org_id', '')::uuid $f$;
  create function proto.support_allowed(p_org uuid) returns boolean language sql stable
    security definer set search_path = '' as $f$
    select coalesce((auth.jwt() ->> 'is_platform_admin')::boolean, false)
       and exists (select 1 from proto.platform_admin where user_id = auth.uid())
       and exists (select 1 from proto.support_access_grant g where g.org_id = p_org
                   and g.revoked_at is null and g.expires_at > now()) $f$;
  -- Super admin : agrégats seulement, jamais de contenu.
  create function proto.platform_org_stats() returns table(org_id uuid, nb_membres bigint, nb_signalements bigint)
    language sql stable security definer set search_path = '' as $f$
    select o.id,
           (select count(*) from proto.membership m where m.org_id = o.id and m.status = 'active'),
           (select count(*) from proto.report_assignment a where a.org_id = o.id)
    from proto.organization o
    where coalesce((auth.jwt() ->> 'is_platform_admin')::boolean, false)
      and exists (select 1 from proto.platform_admin where user_id = auth.uid()) $f$;
  -- Routage : service + ST_Covers → organisation non suspendue → plus petit territoire → priorité.
  create function proto.route_report(p_service text, p_point extensions.geometry) returns uuid
    language sql stable security definer set search_path = '' as $f$
    select s.id from proto.org_service s join proto.organization o on o.id = s.org_id
    where s.service_code = p_service and s.enabled and o.status <> 'suspended'
      and extensions.st_covers(s.territory, p_point)
    order by extensions.st_area(s.territory::extensions.geography), s.routing_priority
    limit 1 $f$;

  ------------------------------------------------------------------ RLS
  alter table proto.organization enable row level security;
  alter table proto.membership enable row level security;
  alter table proto.org_service enable row level security;
  alter table proto.report enable row level security;
  alter table proto.report_assignment enable row level security;
  alter table proto.work_order enable row level security;
  alter table proto.support_access_grant enable row level security;
  alter table proto.platform_admin enable row level security;

  create policy org_lit_la_sienne on proto.organization for select to authenticated
    using (id = (select proto.current_org()));
  create policy citoyen_ses_signalements on proto.report for select to authenticated
    using (citizen_id = auth.uid());               -- aucun accès direct pour les organisations
  create policy affectations_org on proto.report_assignment for select to authenticated
    using ((org_id = (select proto.current_org())
            and (select proto.current_org_role()) in ('org_admin','dispatcher'))
           or proto.support_allowed(org_id));
  create policy interventions on proto.work_order for select to authenticated
    using (org_id = (select proto.current_org())
           and ((select proto.current_org_role()) in ('org_admin','dispatcher')
                or assignee_id = auth.uid()));

  -- Vues par rôle : la RLS filtre des LIGNES ; les vues retirent les COLONNES sensibles.
  create view proto.v_org_report with (security_barrier) as
    select r.id, r.service_code, r.description, r.location, a.org_id
    from proto.report r join proto.report_assignment a on a.report_id = r.id and a.active
    where (a.org_id = (select proto.current_org())
           and (select proto.current_org_role()) in ('org_admin','dispatcher'))
       or proto.support_allowed(a.org_id);
  create view proto.v_my_work_orders with (security_barrier) as
    select w.id, r.service_code, r.description, r.location
    from proto.work_order w join proto.report r on r.id = w.report_id
    where w.assignee_id = auth.uid() and w.org_id = (select proto.current_org());

  grant usage on schema proto to authenticated;
  grant select on all tables in schema proto to authenticated;
  grant execute on all functions in schema proto to authenticated;

  ------------------------------------------------------------------ données fictives
  insert into proto.organization(id, name, status) values
    (ville, 'Ville de Lévis — démo', 'demo'), (mtmd, 'MTMD — démo', 'demo'), (stl, 'STLévis — démo', 'demo');
  insert into proto.platform_admin values (u_sa);
  insert into proto.membership values
    (u_disp_v, ville, 'dispatcher', 'active'), (u_disp_m, mtmd, 'dispatcher', 'active'),
    (u_fw1, ville, 'field_worker', 'active'), (u_fw2, ville, 'field_worker', 'active');
  insert into proto.org_service(id, org_id, service_code, routing_priority, territory) values
    (s_ville_nid,  ville, 'nid_de_poule', 100, extensions.st_geomfromtext(box, 4326)),
    (s_ville_lamp, ville, 'lampadaire',   100, extensions.st_geomfromtext(box, 4326)),
    (s_stl_lamp,   stl,   'lampadaire',    50, extensions.st_geomfromtext(box, 4326)),
    (s_mtmd_nid,   mtmd,  'nid_de_poule', 100, extensions.st_multi(extensions.st_buffer(
        extensions.st_geogfromtext('LINESTRING(-71.25 46.80,-71.05 46.80)'), 30)::extensions.geometry));
  insert into proto.report values
    (r1, u_cit, 'nid_de_poule', 'Trou rue municipale', 'citoyen@exemple.test', extensions.st_setsrid(extensions.st_point(-71.15, 46.75), 4326)),
    (r2, u_cit, 'nid_de_poule', 'Trou route 132',      'citoyen@exemple.test', extensions.st_setsrid(extensions.st_point(-71.15, 46.80), 4326)),
    (r3, gen_random_uuid(), 'nid_de_poule', 'Autre trou', 'autre@exemple.test', extensions.st_setsrid(extensions.st_point(-71.20, 46.72), 4326));
  insert into proto.report_assignment(report_id, org_id) values (r1, ville), (r2, mtmd), (r3, ville);
  insert into proto.work_order(report_id, org_id, assignee_id) values (r1, ville, u_fw1), (r3, ville, u_fw2);

  ------------------------------------------------------------------ T1 contraintes KAN-46
  begin
    insert into proto.organization(id, name, status) values (gen_random_uuid(), 'X', 'active');
    raise exception 'ECHEC T1 : organisation active sans accord acceptée';
  exception when check_violation then res := res || 'T1 ok (active sans accord refusée) | ';
  end;
  begin
    insert into proto.organization(id, name, status, delivery_mode, agreement_ref)
      values (gen_random_uuid(), 'Y', 'demo', 'live', 'ACC-1');
    raise exception 'ECHEC T1b : organisation demo en envoi réel acceptée';
  exception when check_violation then res := res || 'T1b ok (demo + live refusé) | ';
  end;

  ------------------------------------------------------------------ T2 routage
  got := proto.route_report('nid_de_poule', extensions.st_setsrid(extensions.st_point(-71.15, 46.80), 4326));
  if got <> s_mtmd_nid then raise exception 'ECHEC T2a : route 132 → %', got; end if;
  got := proto.route_report('nid_de_poule', extensions.st_setsrid(extensions.st_point(-71.15, 46.75), 4326));
  if got <> s_ville_nid then raise exception 'ECHEC T2b : rue municipale → %', got; end if;
  got := proto.route_report('nid_de_poule', extensions.st_setsrid(extensions.st_point(-70.50, 46.50), 4326));
  if got is not null then raise exception 'ECHEC T2c : hors territoire → %', got; end if;
  got := proto.route_report('lampadaire', extensions.st_setsrid(extensions.st_point(-71.15, 46.75), 4326));
  if got <> s_stl_lamp then raise exception 'ECHEC T2d : même territoire, priorité 50 attendue → %', got; end if;
  update proto.organization set status = 'suspended' where id = stl;
  got := proto.route_report('lampadaire', extensions.st_setsrid(extensions.st_point(-71.15, 46.75), 4326));
  if got <> s_ville_lamp then raise exception 'ECHEC T2e : organisation suspendue non ignorée → %', got; end if;
  update proto.organization set status = 'demo' where id = stl;
  res := res || 'T2 ok (MTMD sur la 132, Ville ailleurs, À trier hors zone, priorité, suspendue ignorée) | ';

  ------------------------------------------------------------------ T3 isolement dispatcher
  perform set_config('request.jwt.claims', json_build_object('sub', u_disp_v, 'role', 'authenticated',
    'org_id', ville, 'org_role', 'dispatcher', 'is_platform_admin', false)::text, true);
  execute 'set local role authenticated';
  select count(*) into n from proto.report_assignment;
  if n <> 2 then raise exception 'ECHEC T3a : dispatcher Ville voit % affectations (2 attendues)', n; end if;
  select count(*) into n from proto.v_org_report;
  if n <> 2 then raise exception 'ECHEC T3b : vue org → % (2 attendus)', n; end if;
  select count(*) into n from proto.report;
  if n <> 0 then raise exception 'ECHEC T3c : accès direct à report → % lignes (0 attendue)', n; end if;
  execute 'reset role';
  res := res || 'T3 ok (Ville voit 2/3, aucun accès direct à la table report) | ';

  ------------------------------------------------------------------ T4 colonnes sensibles
  select count(*) into n from information_schema.columns
  where table_schema = 'proto' and table_name in ('v_org_report','v_my_work_orders')
    and column_name in ('citizen_id','citizen_contact');
  if n <> 0 then raise exception 'ECHEC T4 : identité citoyenne exposée dans une vue'; end if;
  res := res || 'T4 ok (identité citoyenne absente des vues organisation et terrain) | ';

  ------------------------------------------------------------------ T5 JWT falsifié
  perform set_config('request.jwt.claims', json_build_object('sub', u_disp_m, 'role', 'authenticated',
    'org_id', ville, 'org_role', 'dispatcher', 'is_platform_admin', false)::text, true);
  execute 'set local role authenticated';
  select count(*) into n from proto.v_org_report;
  execute 'reset role';
  if n <> 0 then raise exception 'ECHEC T5 : claim org_id non vérifié (% lignes)', n; end if;
  res := res || 'T5 ok (claim org_id incohérent avec la base → 0) | ';

  ------------------------------------------------------------------ T6 suspension immédiate
  update proto.organization set status = 'suspended' where id = ville;
  perform set_config('request.jwt.claims', json_build_object('sub', u_disp_v, 'role', 'authenticated',
    'org_id', ville, 'org_role', 'dispatcher', 'is_platform_admin', false)::text, true);
  execute 'set local role authenticated';
  select count(*) into n from proto.report_assignment;
  execute 'reset role';
  if n <> 0 then raise exception 'ECHEC T6 : JWT encore valide après suspension (% lignes)', n; end if;
  update proto.organization set status = 'demo' where id = ville;
  res := res || 'T6 ok (suspension effective sans attendre l''expiration du JWT) | ';

  ------------------------------------------------------------------ T7 travailleur terrain
  perform set_config('request.jwt.claims', json_build_object('sub', u_fw1, 'role', 'authenticated',
    'org_id', ville, 'org_role', 'field_worker', 'is_platform_admin', false)::text, true);
  execute 'set local role authenticated';
  select count(*) into n from proto.v_my_work_orders;
  if n <> 1 then raise exception 'ECHEC T7a : terrain voit % interventions (1 attendue)', n; end if;
  select count(*) into n from proto.v_org_report;
  if n <> 0 then raise exception 'ECHEC T7b : terrain voit la file dispatcher (% lignes)', n; end if;
  select count(*) into n from proto.work_order;
  if n <> 1 then raise exception 'ECHEC T7c : terrain voit % work_orders (1 attendu)', n; end if;
  execute 'reset role';
  res := res || 'T7 ok (terrain : ses interventions seulement, pas de file) | ';

  ------------------------------------------------------------------ T8 citoyen
  perform set_config('request.jwt.claims', json_build_object('sub', u_cit, 'role', 'authenticated',
    'is_platform_admin', false)::text, true);
  execute 'set local role authenticated';
  select count(*) into n from proto.report;
  if n <> 2 then raise exception 'ECHEC T8a : citoyen voit % signalements (2 attendus)', n; end if;
  select count(*) into n from proto.report_assignment;
  if n <> 0 then raise exception 'ECHEC T8b : citoyen voit des affectations'; end if;
  execute 'reset role';
  res := res || 'T8 ok (citoyen : ses signalements seulement) | ';

  ------------------------------------------------------------------ T9 super admin et accès support
  perform set_config('request.jwt.claims', json_build_object('sub', u_sa, 'role', 'authenticated',
    'is_platform_admin', true)::text, true);
  execute 'set local role authenticated';
  select count(*) into n from proto.v_org_report;
  if n <> 0 then raise exception 'ECHEC T9a : super admin voit du contenu sans accès support'; end if;
  select count(*) into n from proto.platform_org_stats();
  if n <> 3 then raise exception 'ECHEC T9b : agrégats → % organisations (3 attendues)', n; end if;
  execute 'reset role';
  insert into proto.support_access_grant values (ville, now() + interval '2 hours', null);
  execute 'set local role authenticated';
  select count(*) into n from proto.v_org_report;
  if n <> 2 then raise exception 'ECHEC T9c : accès support actif → % (2 attendus)', n; end if;
  execute 'reset role';
  update proto.support_access_grant set expires_at = now() - interval '1 minute' where org_id = ville;
  execute 'set local role authenticated';
  select count(*) into n from proto.v_org_report;
  if n <> 0 then raise exception 'ECHEC T9d : accès support expiré encore actif'; end if;
  execute 'reset role';
  -- Un faux super admin (claim sans ligne platform_admin) ne voit rien.
  perform set_config('request.jwt.claims', json_build_object('sub', u_cit, 'role', 'authenticated',
    'is_platform_admin', true)::text, true);
  execute 'set local role authenticated';
  select count(*) into n from proto.platform_org_stats();
  execute 'reset role';
  if n <> 0 then raise exception 'ECHEC T9e : claim is_platform_admin non vérifié'; end if;
  res := res || 'T9 ok (super admin : agrégats seulement ; support : accordé / expiré ; faux claim refusé)';

  raise exception 'PROTO_RESULTATS % ', res;   -- force le ROLLBACK de tout le prototype
end
$proto$;
