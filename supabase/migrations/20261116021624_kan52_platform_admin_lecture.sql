-- KAN-52 — Politique explicite sur platform_admin (advisor Supabase « RLS enabled, no policy »).
-- Un utilisateur lit uniquement sa propre ligne ; aucune écriture via l'API (migrations seulement).
create policy platform_admin_lecture_soi on public.platform_admin for select to authenticated
  using (user_id = auth.uid());
