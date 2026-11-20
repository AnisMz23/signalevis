-- KAN-63 — Profil de l'utilisateur connecté pour la console (GET /v1/me).
-- Droits confirmés en base (ADR-003 D3) : le claim JWT seul ne suffit jamais.
-- SECURITY INVOKER : la lecture de l'organisation passe par la RLS (organization_lecture).
create function public.me() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'is_platform_admin', (select private.is_platform_admin()),
    'org_role', (select private.current_org_role()),
    'organization', (
      select jsonb_build_object('id', o.id, 'name', o.name, 'slug', o.slug, 'status', o.status)
      from public.organization o
      where o.id = (select private.current_org())
    )
  );
$$;

revoke all on function public.me() from public, anon;
grant execute on function public.me() to authenticated;
