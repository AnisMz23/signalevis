-- KAN-52 — Correctif détecté par les tests : la politique de lecture de service_template appelait
-- private.is_platform_admin(), non exécutable par le rôle anon → lecture du catalogue impossible
-- pour un visiteur anonyme. Politiques séparées par rôle.
drop policy service_template_lecture on public.service_template;

create policy service_template_lecture_anon on public.service_template for select to anon
  using (active);
create policy service_template_lecture on public.service_template for select to authenticated
  using (active or (select private.is_platform_admin()));
