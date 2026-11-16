-- KAN-51 CA2 — Rattachement de l'invitation au compte Supabase, par courriel.
-- Remplace attach_invited_user (identifiant fourni par l'appelant) : la base retrouve elle-même
-- le compte à partir du courriel de l'invitation (nouvel invité ou renvoi). service_role seulement.
drop function public.attach_invited_user(uuid, uuid);

create function public.link_invitation(p_invitation uuid)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_inv  public.invitation;
  v_user uuid;
begin
  select * into v_inv from public.invitation
  where id = p_invitation and accepted_at is null and revoked_at is null and expires_at > now();
  if not found then
    raise exception 'Invitation introuvable, expirée ou close' using errcode = 'no_data_found';
  end if;

  select id into v_user from auth.users where lower(email) = v_inv.email;
  if v_user is null then
    raise exception 'Compte non créé pour %', v_inv.email using errcode = 'no_data_found';
  end if;

  update public.invitation set user_id = v_user where id = p_invitation;
  insert into public.membership (user_id, org_id, role, status)
  values (v_user, v_inv.org_id, v_inv.role, 'invited')
  on conflict (user_id) do nothing;
  return v_user;
end;
$$;
revoke all on function public.link_invitation(uuid) from public, anon, authenticated;
grant execute on function public.link_invitation(uuid) to service_role;
