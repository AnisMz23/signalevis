-- KAN-52 — Tests du catalogue de services (CA1–CA5) et des politiques RLS du socle ADR-003.
-- Toute donnée de test est annulée : les tests tournent dans un sous-bloc qui se termine par une
-- exception technique P0099, interceptée. Toute AUTRE exception = échec (règle CLAUDE.md).
-- Données de test placées dans une zone FICTIVE (≈ -75°, 48.7°) pour ne pas interférer avec
-- les organisations de démonstration de Lévis (KAN-51).
do $t$
declare
  n int; v0 bigint; v1 bigint; res jsonb; codes text[];
  ville uuid := gen_random_uuid(); mtmd uuid := gen_random_uuid(); stl uuid := gen_random_uuid();
  u_admin uuid := gen_random_uuid(); u_membre uuid := gen_random_uuid(); u_citoyen uuid := gen_random_uuid();
  box text := 'MULTIPOLYGON(((-75.30 48.70,-75.00 48.70,-75.00 48.85,-75.30 48.85,-75.30 48.70)))';
  route132 extensions.geometry := extensions.st_multi(extensions.st_buffer(
    extensions.st_geogfromtext('LINESTRING(-75.25 48.80,-75.05 48.80)'), 30)::extensions.geometry);
  st_nid uuid; st_lamp uuid; st_fuite uuid; st_abri uuid; st_gliss uuid;
  d_voirie uuid; d_eclairage uuid; d_transport uuid;
begin
  begin
    ------------------------------------------------------------------ CA1 — domaines initiaux
    select count(*) into n from public.domain where code in
      ('voirie','eclairage','proprete','securite','transport','electricite','routier_provincial');
    if n <> 7 then raise exception 'CA1 échec : % domaines initiaux sur 7', n; end if;

    ------------------------------------------------------------------ CA2 — service type
    select count(*) into n from public.service_template;
    if n < 15 then raise exception 'CA2 échec : % services types (≥ 15 attendus)', n; end if;
    select count(*) into n from public.service_template
      where trim(label_fr) = '' or trim(category) = '' or trim(icon) = '';
    if n <> 0 then raise exception 'CA2 échec : % services sans libellé, catégorie ou icône', n; end if;
    select array_agg(code order by code) into codes from public.service_template where is_emergency;
    if codes <> array['fil_tombe'] then raise exception 'CA2 échec : urgences 911 = % (fil_tombe seul attendu)', codes; end if;
    begin
      insert into public.service_template (domain_id, code, category, label_fr, icon, default_priority, default_sla_hours)
      select id, 'test_prio', 'Test', 'Test', 'x', 'urgent', 24 from public.domain where code = 'voirie';
      raise exception 'CA2 échec : priorité invalide acceptée';
    exception when check_violation then null;
    end;

    ------------------------------------------------------------------ CA5 — catalog_version
    select catalog_version into v0 from public.app_settings;
    update public.service_template set label_en = label_en where code = 'graffiti';
    select catalog_version into v1 from public.app_settings;
    if v1 <> v0 + 1 then raise exception 'CA5 échec : catalog_version % → % (+1 attendu)', v0, v1; end if;

    ------------------------------------------------------------------ données de test (annulées)
    select id into st_nid   from public.service_template where code = 'nid_de_poule';
    select id into st_lamp  from public.service_template where code = 'lampadaire';
    select id into st_fuite from public.service_template where code = 'fuite_eau';
    select id into st_abri  from public.service_template where code = 'abribus';
    select id into st_gliss from public.service_template where code = 'glissiere';
    select id into d_voirie    from public.domain where code = 'voirie';
    select id into d_eclairage from public.domain where code = 'eclairage';
    select id into d_transport from public.domain where code = 'transport';

    insert into public.organization (id, name, slug, status, default_territory) values
      (ville, 'Ville de Lévis — test', 'test-ville', 'demo', extensions.st_geomfromtext(box, 4326)),
      (mtmd,  'MTMD — test',           'test-mtmd',  'demo', route132),
      (stl,   'STLévis — test',        'test-stl',   'demo', extensions.st_geomfromtext(box, 4326));
    insert into public.org_domain values
      (ville, d_voirie), (ville, d_eclairage), (mtmd, d_voirie), (stl, d_transport);
    insert into public.org_service (org_id, service_template_id) values
      (ville, st_nid), (ville, st_lamp), (ville, st_fuite), (mtmd, st_nid), (stl, st_abri);

    -- KAN-55 : un service hors des domaines de l'organisation est refusé
    begin
      insert into public.org_service (org_id, service_template_id) values (ville, st_gliss);
      raise exception 'Intégrité échec : service hors domaine accepté';
    exception when check_violation then null;
    end;

    ------------------------------------------------------------------ CA4 — filtrage par position
    res := public.available_services(48.75, -75.15);             -- rue municipale
    select array_agg(s ->> 'code' order by s ->> 'code') into codes from jsonb_array_elements(res -> 'services') s;
    if codes <> array['abribus','fuite_eau','lampadaire','nid_de_poule'] then
      raise exception 'CA4 échec (rue) : %', codes; end if;
    if (select s ->> 'recipient' from jsonb_array_elements(res -> 'services') s where s ->> 'code' = 'nid_de_poule')
       <> 'Ville de Lévis — test' then raise exception 'CA4 échec : destinataire nid-de-poule (rue)'; end if;
    if (res -> 'services' -> 0 ->> 'recipient_is_demo')::boolean is not true then
      raise exception 'CA4 échec : indicateur démo absent'; end if;

    res := public.available_services(48.80, -75.15);             -- sur la route 132
    if (select s ->> 'recipient' from jsonb_array_elements(res -> 'services') s where s ->> 'code' = 'nid_de_poule')
       <> 'MTMD — test' then raise exception 'CA4 échec : la route 132 doit aller au MTMD'; end if;

    res := public.available_services(46.50, -70.50);             -- hors territoire
    if jsonb_array_length(res -> 'services') <> 0 then raise exception 'CA4 échec : services hors territoire'; end if;

    update public.organization set status = 'suspended' where id = stl;
    res := public.available_services(48.75, -75.15);
    if exists (select 1 from jsonb_array_elements(res -> 'services') s where s ->> 'code' = 'abribus') then
      raise exception 'CA4 échec : organisation suspendue encore proposée'; end if;

    ------------------------------------------------------------------ CA3 — désactivation, pas de suppression
    update public.service_template set active = false where id = st_lamp;
    res := public.available_services(48.75, -75.15);
    if exists (select 1 from jsonb_array_elements(res -> 'services') s where s ->> 'code' = 'lampadaire') then
      raise exception 'CA3 échec : service désactivé encore proposé'; end if;
    begin
      delete from public.service_template where id = st_lamp;
      raise exception 'CA3 échec : suppression d''un service type acceptée';
    exception when restrict_violation then null;
    end;

    ------------------------------------------------------------------ RLS — anonyme
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    execute 'set local role anon';
    select count(*) into n from public.service_template where code = 'lampadaire';
    if n <> 0 then raise exception 'RLS échec : anonyme voit un service désactivé'; end if;
    select count(*) into n from public.service_template;
    if n < 14 then raise exception 'RLS échec : anonyme ne voit que % services actifs', n; end if;
    select count(*) into n from public.organization;
    if n <> 0 then raise exception 'RLS échec : anonyme voit % organisations', n; end if;
    begin
      perform public.available_services(48.75, -75.15);
      raise exception 'RLS échec : available_services appelable par anon (doit passer par /v1)';
    exception when insufficient_privilege then null;
    end;
    execute 'reset role';

    ------------------------------------------------------------------ RLS — comptes de test (annulés)
    insert into auth.users (id, aud, role, email) values
      (u_admin,   'authenticated', 'authenticated', 'admin@kan52.test'),
      (u_membre,  'authenticated', 'authenticated', 'membre@kan52.test'),
      (u_citoyen, 'authenticated', 'authenticated', 'citoyen@kan52.test');
    insert into public.platform_admin values (u_admin);
    update public.organization set status = 'demo' where id = stl;
    insert into public.membership (user_id, org_id, role, status) values (u_membre, ville, 'dispatcher', 'active');

    -- Citoyen : ne modifie pas le catalogue
    perform set_config('request.jwt.claims', json_build_object('sub', u_citoyen, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
      insert into public.domain (code, label_fr) values ('pirate', 'Pirate');
      raise exception 'RLS échec : un citoyen crée un domaine';
    exception when insufficient_privilege then null;
    end;
    update public.app_settings set catalog_version = 0;
    execute 'reset role';
    if (select catalog_version from public.app_settings) = 0 then
      raise exception 'RLS échec : un citoyen modifie catalog_version'; end if;

    -- Membre de la Ville : voit sa seule organisation et ses services
    perform set_config('request.jwt.claims', json_build_object('sub', u_membre, 'role', 'authenticated',
      'org_id', ville, 'org_role', 'dispatcher')::text, true);
    execute 'set local role authenticated';
    select count(*) into n from public.organization;
    if n <> 1 then raise exception 'RLS échec : membre voit % organisations (1 attendue)', n; end if;
    select count(*) into n from public.org_service;
    if n <> 3 then raise exception 'RLS échec : membre voit % services d''organisation (3 attendus)', n; end if;
    execute 'reset role';

    -- Claim falsifié (org_id d'une autre organisation) : rien
    perform set_config('request.jwt.claims', json_build_object('sub', u_membre, 'role', 'authenticated',
      'org_id', mtmd, 'org_role', 'dispatcher')::text, true);
    execute 'set local role authenticated';
    select count(*) into n from public.organization;
    execute 'reset role';
    if n <> 0 then raise exception 'RLS échec : claim org_id falsifié accepté'; end if;

    -- Super admin (claim + ligne platform_admin) : gère le catalogue
    perform set_config('request.jwt.claims', json_build_object('sub', u_admin, 'role', 'authenticated',
      'is_platform_admin', true)::text, true);
    execute 'set local role authenticated';
    insert into public.domain (code, label_fr) values ('test_admin', 'Test super admin');
    select count(*) into n from public.organization;
    execute 'reset role';
    if n <> (select count(*) from public.organization) then
      raise exception 'RLS échec : super admin voit % organisations (toutes attendues)', n; end if;

    -- Faux super admin (claim sans ligne platform_admin) : refusé
    perform set_config('request.jwt.claims', json_build_object('sub', u_citoyen, 'role', 'authenticated',
      'is_platform_admin', true)::text, true);
    execute 'set local role authenticated';
    begin
      insert into public.domain (code, label_fr) values ('faux_admin', 'Faux');
      raise exception 'RLS échec : faux super admin accepté';
    exception when insufficient_privilege then null;
    end;
    execute 'reset role';

    raise exception using errcode = 'P0099', message = 'annulation des données de test';
  exception when sqlstate 'P0099' then
    null;   -- tout est annulé ; on arrive ici seulement si tous les tests ont réussi
  end;
end
$t$;

select 'KAN-52 OK — CA1, CA2, CA3, CA4, CA5 et RLS' as resultat,
       (select count(*) from public.organization) as organisations_restantes;
