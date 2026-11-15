-- KAN-42 CA2 : fonction de santé utilisée par GET /v1/health.
-- Réservée au rôle service_role (Edge Function) : jamais appelable par anon ou authenticated.
create or replace function public.health_check()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'postgres', current_setting('server_version'),
    'postgis',  extensions.postgis_lib_version()
  );
$$;

revoke execute on function public.health_check() from public, anon, authenticated;
grant execute on function public.health_check() to service_role;

comment on function public.health_check() is
  'KAN-42 — état de la base pour GET /v1/health. Accès : service_role uniquement.';
