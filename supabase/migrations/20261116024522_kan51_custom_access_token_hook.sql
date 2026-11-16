-- KAN-51 CA4 / ADR-003 D3 — Custom Access Token Hook.
-- À activer dans le tableau de bord : Authentication → Hooks → Customize Access Token (JWT) Claims,
-- type Postgres, schéma public, fonction custom_access_token_hook. Staging d'abord.
--
-- Ajoute au JWT : org_id, org_role (membership active d'une organisation non suspendue) et
-- is_platform_admin. Refuse l'émission du jeton pour un membre d'une organisation suspendue.
-- Les claims restent toujours reconfirmés en base par la RLS (private.current_org()).
create function public.custom_access_token_hook(event jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_user   uuid  := (event ->> 'user_id')::uuid;
  v_claims jsonb := coalesce(event -> 'claims', '{}'::jsonb) - 'org_id' - 'org_role' - 'is_platform_admin';
  v_admin  boolean;
  m        record;
begin
  v_admin := exists (select 1 from public.platform_admin where user_id = v_user);

  select ms.org_id, ms.role, ms.status, o.status as org_status
    into m
    from public.membership ms
    join public.organization o on o.id = ms.org_id
   where ms.user_id = v_user;

  if found and m.org_status = 'suspended' and not v_admin then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403,
      'message', 'Votre organisation est suspendue. Communiquez avec le soutien de la plateforme.'));
  end if;

  v_claims := v_claims || jsonb_build_object('is_platform_admin', v_admin);
  if found and m.status = 'active' then
    v_claims := v_claims || jsonb_build_object('org_id', m.org_id, 'org_role', m.role);
  end if;

  return jsonb_build_object('claims', v_claims);
end;
$$;

revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;

comment on function public.custom_access_token_hook(jsonb) is
  'KAN-51 / ADR-003 D3 — claims org_id, org_role, is_platform_admin ; refuse les membres d''organisation suspendue.';
