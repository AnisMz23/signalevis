-- KAN-51 — Tests organisations (CA1–CA5), invitations, audit, hook JWT, données de démo.
-- Données de test annulées (sous-bloc terminé par P0099). Toute autre exception = échec.
do $t$
declare
  n int; v jsonb; v2 jsonb; org uuid; org2 uuid; res jsonb; r jsonb;
  u_sa uuid := gen_random_uuid(); u_x uuid := gen_random_uuid(); u_inv uuid := gen_random_uuid();
  u_other uuid := gen_random_uuid();
  sa_claims text; x_claims text;
begin
  ---------------------------------------------------------------- données de démo (hors sous-bloc : lecture seule)
  select count(*) into n from public.organization
   where slug in ('ville-levis-demo','mtmd-demo','stlevis-demo') and status = 'demo' and delivery_mode = 'demo';
  if n <> 3 then raise exception 'Démo échec : % organisations de démo sur 3', n; end if;
  res := public.available_services(46.76, -71.18);
  if jsonb_array_length(res -> 'services') < 10 then raise exception 'Démo échec : catalogue à Lévis presque vide'; end if;
  res := public.available_services(46.81, -71.17);
  if (select s ->> 'recipient' from jsonb_array_elements(res -> 'services') s where s ->> 'code' = 'nid_de_poule')
     <> 'MTMD — démo' then raise exception 'Démo échec : la route 132 doit aller au MTMD'; end if;

  begin
    insert into auth.users (id, aud, role, email) values
      (u_sa, 'authenticated', 'authenticated', 'sa@kan51.test'),
      (u_x, 'authenticated', 'authenticated', 'x@kan51.test'),
      (u_inv, 'authenticated', 'authenticated', 'invite@kan51.test'),
      (u_other, 'authenticated', 'authenticated', 'autre@kan51.test');
    insert into public.platform_admin values (u_sa);
    sa_claims := json_build_object('sub', u_sa, 'role', 'authenticated', 'is_platform_admin', true)::text;
    x_claims  := json_build_object('sub', u_x,  'role', 'authenticated', 'is_platform_admin', true)::text;  -- faux super admin

    ---------------------------------------------------------------- non super admin : tout refusé
    perform set_config('request.jwt.claims', x_claims, true);
    execute 'set local role authenticated';
    begin perform public.create_organization('Pirate', 'pirate', array['voirie']);
          raise exception 'Droits échec : création par un non-super-admin';
    exception when insufficient_privilege then null; end;
    begin perform * from public.list_organizations();
          raise exception 'Droits échec : liste par un non-super-admin';
    exception when insufficient_privilege then null; end;
    select count(*) into n from public.organization;
    if n <> 0 then raise exception 'RLS échec : un non-membre voit % organisations', n; end if;
    execute 'reset role';

    ---------------------------------------------------------------- CA1 — création
    perform set_config('request.jwt.claims', sa_claims, true);
    execute 'set local role authenticated';
    org := public.create_organization('Org Test KAN-51', 'org-test-kan51', array['voirie','eclairage'],
                                      'demo', 'Contact@Exemple.test', '418 555-0100');
    if (select contact_email from public.organization where id = org) <> 'contact@exemple.test' then
      raise exception 'CA1 échec : courriel de contact non normalisé'; end if;
    select count(*) into n from public.org_domain where org_id = org;
    if n <> 2 then raise exception 'CA1 échec : % domaines associés (2 attendus)', n; end if;
    begin perform public.create_organization('Doublon', 'org-test-kan51', array['voirie']);
          raise exception 'CA1 échec : identifiant court en double accepté';
    exception when unique_violation then null; end;
    begin perform public.create_organization('Inconnu', 'org-inconnu', array['espace']);
          raise exception 'CA1 échec : domaine inconnu accepté';
    exception when check_violation then null; end;
    begin perform public.create_organization('Sans domaine', 'org-vide', array[]::text[]);
          raise exception 'CA1 échec : organisation sans domaine acceptée';
    exception when check_violation then null; end;

    ---------------------------------------------------------------- CA5 — démo jamais en réel
    begin perform public.create_organization('Active sans accord', 'org-active', array['voirie'], 'active');
          raise exception 'CA5 échec : organisation active sans accord acceptée';
    exception when check_violation then null; end;
    begin update public.organization set delivery_mode = 'live', agreement_ref = 'X' where id = org;
          raise exception 'CA5 échec : organisation demo passée en envoi réel';
    exception when check_violation then null; end;

    ---------------------------------------------------------------- CA2 — invitation, renvoi, mono-organisation
    v := public.create_invitation(org, 'Invite@KAN51.test');
    if (v ->> 'resend')::boolean or v ->> 'email' <> 'invite@kan51.test' then raise exception 'CA2 échec : création %', v; end if;
    if (v ->> 'expires_at')::timestamptz not between now() + interval '6 days 23 hours' and now() + interval '7 days 1 hour' then
      raise exception 'CA2 échec : expiration % (7 jours attendus)', v ->> 'expires_at'; end if;
    v2 := public.create_invitation(org, 'invite@kan51.test');
    if not (v2 ->> 'resend')::boolean or v2 ->> 'invitation_id' <> v ->> 'invitation_id' then
      raise exception 'CA2 échec : le renvoi doit réutiliser l''invitation'; end if;
    execute 'reset role';

    perform public.link_invitation((v ->> 'invitation_id')::uuid);      -- appel serveur (service_role)
    if (select status from public.membership where user_id = u_inv) <> 'invited' then
      raise exception 'CA2 échec : membership non créée en « invited »'; end if;
    update auth.users set email_confirmed_at = now() where id = u_inv;  -- clic sur le lien
    if (select status from public.membership where user_id = u_inv) <> 'active' then
      raise exception 'CA2 échec : membership non activée à la confirmation'; end if;
    if (select accepted_at from public.invitation where id = (v ->> 'invitation_id')::uuid) is null then
      raise exception 'CA2 échec : invitation non marquée acceptée (usage unique)'; end if;

    -- Invitation expirée : pas d'activation
    perform set_config('request.jwt.claims', sa_claims, true);
    execute 'set local role authenticated';
    org2 := public.create_organization('Org Test 2', 'org-test2-kan51', array['transport']);
    v := public.create_invitation(org2, 'autre@kan51.test');
    execute 'reset role';
    perform public.link_invitation((v ->> 'invitation_id')::uuid);
    update public.invitation set expires_at = now() - interval '1 minute' where id = (v ->> 'invitation_id')::uuid;
    update auth.users set email_confirmed_at = now() where id = u_other;
    if (select status from public.membership where user_id = u_other) <> 'invited' then
      raise exception 'CA2 échec : invitation expirée a activé le compte'; end if;
    begin perform public.link_invitation((v ->> 'invitation_id')::uuid);
          raise exception 'CA2 échec : lien d''une invitation expirée accepté';
    exception when no_data_found then null; end;

    -- Mono-organisation : un membre de org ne peut pas être invité dans org2
    perform set_config('request.jwt.claims', sa_claims, true);
    execute 'set local role authenticated';
    begin perform public.create_invitation(org2, 'invite@kan51.test');
          raise exception 'CA2 échec : courriel déjà membre ailleurs accepté';
    exception when unique_violation then null; end;

    ---------------------------------------------------------------- CA3 — liste agrégée
    select to_jsonb(l) into r from public.list_organizations() l where l.id = org;
    if (r ->> 'active_members')::int <> 1 or (r ->> 'pending_invitations')::int <> 0
       or r -> 'reports_30d' <> 'null'::jsonb then raise exception 'CA3 échec : agrégats %', r; end if;
    select count(*) into n from public.list_organizations();
    if n < 5 then raise exception 'CA3 échec : % organisations listées', n; end if;

    ---------------------------------------------------------------- CA4 — suspension
    perform public.set_organization_status(org, 'suspended');
    execute 'reset role';
    r := public.custom_access_token_hook(jsonb_build_object('user_id', u_inv, 'claims', '{"role":"authenticated"}'::jsonb));
    if (r -> 'error' ->> 'http_code')::int <> 403 then raise exception 'CA4 échec : connexion d''un membre suspendu acceptée'; end if;
    perform set_config('request.jwt.claims',
      json_build_object('sub', u_inv, 'role', 'authenticated', 'org_id', org, 'org_role', 'org_admin')::text, true);
    execute 'set local role authenticated';
    select count(*) into n from public.organization;
    execute 'reset role';
    if n <> 0 then raise exception 'CA4 échec : JWT encore valide après suspension'; end if;
    perform set_config('request.jwt.claims', sa_claims, true);
    execute 'set local role authenticated';
    begin perform public.create_invitation(org, 'nouveau@kan51.test');
          raise exception 'CA4 échec : invitation dans une organisation suspendue';
    exception when check_violation then null; end;
    perform public.set_organization_status(org, 'demo');
    execute 'reset role';

    -- RLS (DoD) : le membre réactivé ne voit que SON organisation
    perform set_config('request.jwt.claims',
      json_build_object('sub', u_inv, 'role', 'authenticated', 'org_id', org, 'org_role', 'org_admin')::text, true);
    execute 'set local role authenticated';
    select count(*) into n from public.organization;
    if n <> 1 then raise exception 'RLS échec : membre voit % organisations (1 attendue)', n; end if;
    select count(*) into n from public.audit_log;
    if n = 0 then raise exception 'Audit échec : l''admin d''organisation ne voit pas son journal'; end if;
    select count(*) into n from public.audit_log where org_id <> org;
    if n <> 0 then raise exception 'Audit échec : journal d''une autre organisation visible'; end if;
    execute 'reset role';

    ---------------------------------------------------------------- audit append-only
    select count(*) into n from public.audit_log where org_id = org
      and action in ('organization.create','invitation.create','invitation.resend','organization.status');
    if n < 5 then raise exception 'Audit échec : % entrées pour l''organisation (≥ 5 attendues)', n; end if;
    begin update public.audit_log set action = 'falsifie' where org_id = org;
          raise exception 'Audit échec : modification du journal acceptée';
    exception when insufficient_privilege then null; end;
    begin delete from public.audit_log where org_id = org;
          raise exception 'Audit échec : suppression du journal acceptée';
    exception when insufficient_privilege then null; end;

    raise exception using errcode = 'P0099', message = 'annulation des données de test';
  exception when sqlstate 'P0099' then null;
  end;
end
$t$;

select 'KAN-51 OK — CA1 à CA5, invitations, audit, hook, démo' as resultat,
       (select count(*) from auth.users where email like '%@kan51.test') as comptes_test_restants,
       (select count(*) from public.organization) as organisations;
