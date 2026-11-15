-- KAN-42 CA1 / CA2 (base) — échoue avec une exception si une vérification ne passe pas.
-- Exécution : coller dans l'éditeur SQL du projet, ou via Claude Code (outil execute_sql).
do $$
declare
  v_pg_major int := current_setting('server_version_num')::int / 10000;
  v_postgis  text;
  v_anon_can boolean;
begin
  -- CA1 : PostgreSQL 17 (ADR-001, décision PO du 2026-11-15)
  if v_pg_major <> 17 then
    raise exception 'CA1 échec : PostgreSQL % au lieu de 17', v_pg_major;
  end if;

  -- CA1 : PostGIS installé dans le schéma extensions
  select extversion into v_postgis
  from pg_extension e join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'postgis' and n.nspname = 'extensions';
  if v_postgis is null then
    raise exception 'CA1 échec : PostGIS absent du schéma extensions';
  end if;

  -- CA1 : PostGIS fonctionnel (calcul géographique réel)
  if extensions.st_distance(
       extensions.st_geogfromtext('POINT(-71.1789 46.8034)'),
       extensions.st_geogfromtext('POINT(-71.1689 46.8034)')
     ) not between 700 and 800 then
    raise exception 'CA1 échec : calcul de distance PostGIS incorrect';
  end if;

  -- CA2 (base) : health_check réservé à service_role
  select has_function_privilege('anon', 'public.health_check()', 'execute') into v_anon_can;
  if v_anon_can then
    raise exception 'CA2 échec : health_check exécutable par anon';
  end if;

  raise notice 'CA1/CA2 OK — PostgreSQL %, PostGIS %', v_pg_major, v_postgis;
end
$$;

select 'CA1/CA2 OK' as resultat, public.health_check() as sante;
