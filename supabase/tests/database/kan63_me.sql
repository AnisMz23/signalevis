-- KAN-63 — GET /v1/me : profil confirmé en base (super admin, membre, citoyen, faux claims).
-- Données de test annulées (sous-bloc terminé par P0099). Toute autre exception = échec.
do $t$
declare
  r jsonb; org uuid := gen_random_uuid();
  u_sa uuid := gen_random_uuid(); u_disp uuid := gen_random_uuid();
  u_cit uuid := gen_random_uuid(); u_fake uuid := gen_random_uuid();
begin
  begin
    insert into auth.users (id, aud, role, email) values
      (u_sa, 'authenticated', 'authenticated', 'sa@kan63.test'),
      (u_disp, 'authenticated', 'authenticated', 'disp@kan63.test'),
      (u_cit, 'authenticated', 'authenticated', 'cit@kan63.test'),
      (u_fake, 'authenticated', 'authenticated', 'fake@kan63.test');
    insert into public.platform_admin values (u_sa);
    insert into public.organization (id, name, slug, status, default_territory)
      values (org, 'Org test KAN-63 — démo', 'kan63-test', 'demo',
              extensions.st_multi(extensions.st_makeenvelope(-75.1, 48.6, -74.9, 48.8, 4326)));
    insert into public.membership (user_id, org_id, role, status) values (u_disp, org, 'dispatcher', 'active');
    execute 'set local role authenticated';

    -- super admin (claim confirmé par platform_admin)
    perform set_config('request.jwt.claims',
      json_build_object('sub', u_sa, 'role', 'authenticated', 'is_platform_admin', true)::text, true);
    r := public.me();
    if not (r ->> 'is_platform_admin')::boolean or r -> 'organization' <> 'null'::jsonb
      then raise exception 'CA2 échec : super admin %', r; end if;

    -- dispatcher d'une organisation de démo
    perform set_config('request.jwt.claims',
      json_build_object('sub', u_disp, 'role', 'authenticated', 'org_id', org, 'org_role', 'dispatcher')::text, true);
    r := public.me();
    if r ->> 'org_role' <> 'dispatcher' or r #>> '{organization,status}' <> 'demo'
       or (r ->> 'is_platform_admin')::boolean
      then raise exception 'CA2/CA5 échec : dispatcher %', r; end if;

    -- citoyen : aucun rôle
    perform set_config('request.jwt.claims', json_build_object('sub', u_cit, 'role', 'authenticated')::text, true);
    r := public.me();
    if (r ->> 'is_platform_admin')::boolean or r ->> 'org_role' is not null or r -> 'organization' <> 'null'::jsonb
      then raise exception 'CA3 échec : citoyen %', r; end if;

    -- faux claims (super admin et org_role sans base) : refusés
    perform set_config('request.jwt.claims', json_build_object('sub', u_fake, 'role', 'authenticated',
      'is_platform_admin', true, 'org_id', org, 'org_role', 'org_admin')::text, true);
    r := public.me();
    if (r ->> 'is_platform_admin')::boolean or r ->> 'org_role' is not null or r -> 'organization' <> 'null'::jsonb
      then raise exception 'CA3 échec : faux claims acceptés %', r; end if;

    raise exception using errcode = 'P0099';
  exception when sqlstate 'P0099' then null;
  end;
end $t$;
select 'KAN-63 OK' as resultat;
