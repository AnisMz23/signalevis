# ADR-003 — Modèle multi-tenant, rôles et catalogue de services

| | |
|---|---|
| **Ticket** | [KAN-50](https://signalevis.atlassian.net/browse/KAN-50) (spike T6) — débloque KAN-12, KAN-20, KAN-33, KAN-46, F9, F10, F11 |
| **Statut** | Accepté — validé par le PO le 2026-11-16 |
| **Date** | 2026-11-16 |
| **Décideur** | Product Owner |
| **Prototype** | [`docs/spikes/KAN-50-prototype-rls.sql`](../spikes/KAN-50-prototype-rls.sql) — exécuté sur staging, 9/9 tests réussis, entièrement annulé (aucune trace en base) |

## Contexte

Décision PO du 2026-11-16 : la plateforme devient un SaaS multi-organisation
(super admin → organisations → membres ; citoyen hors organisation). Voir
`docs/product/plateforme-saas.md`.

**Sources lues** (règle « Avant de coder un ticket KAN ») :
KAN-50 et KAN-47 (aucun commentaire) ; KAN-20 « Raffinement technique v2 » (15 nov.) et
« Impact plateforme SaaS » (16 nov.) ; KAN-33 réécrit le 16 nov. ; KAN-46 « Impact plateforme SaaS » ;
KAN-51, KAN-52, KAN-53 ; KAN-12 « Impact plateforme SaaS » ; maquettes `docs/design/console/`.

## Décisions

### D1 — Appartenance mono-organisation au MVP (KAN-50 CA4)

- `membership.user_id` est la clé primaire : un utilisateur = une organisation.
- Un `platform_admin` n'a pas de `membership` (rôles exclusifs au MVP, vérifié par trigger).
- Le modèle reste compatible multi-organisation : il suffira de passer la clé à `(user_id, org_id)`
  et d'ajouter un sélecteur d'organisation (le JWT porte déjà l'organisation *courante*).

### D2 — `authority` est fusionnée dans `organization` (KAN-50 CA4, KAN-46)

`organization` absorbe `delivery_mode`, `demo_target`, `live_target`, `agreement_ref`.
Garde-fous en base (testés, **T1**) :

| Contrainte | Effet |
|---|---|
| `status <> 'demo' OR delivery_mode = 'demo'` | une organisation de démonstration n'envoie jamais en réel |
| `status <> 'active' OR agreement_ref IS NOT NULL` | pas d'organisation active sans accord |
| `delivery_mode = 'demo' OR agreement_ref IS NOT NULL` | pas d'envoi réel sans accord |

Le second verrou de KAN-46 (`app_settings.allow_live_delivery = false`) reste vérifié par le worker.

### D3 — JWT : claims émis, mais toujours confirmés en base (KAN-50 CA3)

Le Custom Access Token Hook ajoute :

| Claim | Valeur | Citoyen |
|---|---|---|
| `org_id` | organisation de la `membership` active | absent |
| `org_role` | `org_admin` · `dispatcher` · `field_worker` | absent |
| `is_platform_admin` | `true` si ligne dans `platform_admin` | `false` |

Le hook n'émet pas `org_id` si la membership est `invited`/`disabled` ou l'organisation `suspended`.

**Problème identifié** : un JWT reste valide jusqu'à son expiration (~1 h). Une suspension (KAN-51 CA4)
ou un retrait de membre ne serait donc pas immédiat, et un claim ne prouve rien à lui seul.

**Décision** : les politiques RLS n'utilisent jamais le claim seul. Elles appellent
`current_org()` / `current_org_role()` (fonctions `SECURITY DEFINER`, `search_path = ''`) qui renvoient
l'organisation **seulement si** le claim correspond à une membership `active` d'une organisation non
suspendue. Appel sous forme `(select current_org())` → évalué une fois par requête (une lecture par clé primaire).

- Prototype **T5** : un claim `org_id` falsifié → 0 ligne.
- Prototype **T6** : organisation suspendue avec JWT encore valide → 0 ligne, immédiatement.
- Même règle pour `is_platform_admin` : confirmé par la table `platform_admin` (**T9e**).

### D4 — Routage entre organisations dont les territoires se chevauchent (KAN-50 CA4, KAN-20)

`route_report(service_template_id, point, horodatage)` retient l'`org_service` qui :

1. est activé (`enabled`) pour le service type choisi par le citoyen ;
2. appartient à une organisation **non suspendue** ;
3. couvre le point : `ST_Covers(coalesce(org_service.territory, organization.default_territory), point)` ;
4. est dans sa **plage horaire** (`schedule`, fuseau `America/Toronto`, table `holiday`) — *sous réserve
   de la décision PO sur KAN-20 CA5* ;
5. puis, en cas d'égalité : **plus petit territoire** (`ST_Area` en géographie), puis `routing_priority` croissant ;
6. sinon : aucune affectation → file **« À trier »** de la plateforme.

Prototype **T2** : nid-de-poule sur la route 132 → MTMD (tampon 30 m, plus petit que la Ville) ;
ailleurs → Ville ; hors territoire → « À trier » ; même territoire → priorité ; organisation suspendue ignorée.
La règle « plus petit territoire » règle naturellement le cas Ville / MTMD de l'ADR-002, sans règle spéciale.

Organisation `demo` → la livraison est résolue vers sa cible de démonstration (KAN-46).

### D5 — Affectation : une seule active, historique conservé

- `report_assignment(report_id, org_id, org_service_id, active, assigned_at, reason)` ;
  index unique partiel `(report_id) WHERE active` → **une seule organisation responsable à la fois**.
- Réacheminement (KAN-35) : l'affectation courante passe à `active = false`, une nouvelle est créée.
- « Autorités en copie » (ancien KAN-20 CA2) : **hors MVP**.

### D6 — Identité du citoyen : séparée physiquement des données de signalement

La RLS filtre des **lignes**, pas des **colonnes**. La règle « l'identité du citoyen n'est jamais
affichée au dispatcher ni au travailleur terrain » ne peut donc pas reposer sur une politique RLS seule.

**Décision** : l'identité est dans une table séparée `report_reporter(report_id, citizen_id, contact…)`,
lisible uniquement par le citoyen concerné (et la plateforme pour la file « À trier »). La table
`report` ne contient aucune donnée identifiante ; les organisations y accèdent via leur affectation.

Le prototype a validé le principe avec des vues à colonnes restreintes (**T3**, **T4**). La séparation
en table est retenue pour la production : elle donne la même garantie sans vue `SECURITY DEFINER`
(signalée par les advisors de sécurité Supabase).

### D7 — Super admin : agrégats par défaut, contenu seulement avec accès support

- Agrégats (nombre de membres, signalements 30 j) via fonctions `SECURITY DEFINER` qui ne renvoient
  que des totaux (**T9b**) — alimente la maquette `SA-Organisations`.
- Contenu d'une organisation : seulement si `support_access_grant` actif, en lecture seule, journalisé
  (**T9c**, accès expiré → refusé **T9d**).

### D8 — Matrice rôles × permissions et RLS (KAN-50 CA2)

| Données | Super admin | org_admin | dispatcher | field_worker | Citoyen |
|---|---|---|---|---|---|
| `organization` (la sienne) | toutes, gestion | lecture | lecture | lecture | — |
| `domain`, `service_template` | gestion | lecture | lecture | — | lecture (catalogue) |
| `org_domain`, `org_service`, territoire | gestion de `routing_priority` | gestion | lecture | — | — |
| `membership` de son organisation | agrégats | gestion | lecture | soi-même | — |
| `report` routé vers son organisation | support actif | lecture | lecture | via ses interventions | — |
| `report` « À trier » (sans affectation) | lecture, réaffectation | — | — | — | — |
| `report` + `report_reporter` | — | — | — | — | les siens |
| `report_assignment` | support actif | lecture, réacheminement | lecture, réacheminement | — | — |
| `work_order`, `work_order_event` | support actif | gestion | gestion | les siennes, statut terrain | — |
| `support_access_grant` | lecture des siens | gestion | — | — | — |
| `audit_log` | sa plateforme | son organisation | — | — | — |

Politiques types (toutes testées dans le prototype) :

```sql
-- file dispatcher (T3)
using ( org_id = (select current_org()) and (select current_org_role()) in ('org_admin','dispatcher')
        or support_allowed(org_id) )
-- travailleur terrain (T7)
using ( org_id = (select current_org())
        and ((select current_org_role()) in ('org_admin','dispatcher') or assignee_id = auth.uid()) )
-- citoyen (T8)
using ( citizen_id = auth.uid() )
```

Règle transverse : écritures sensibles (`audit_log`, `work_order_event`, `delivery_attempt`)
**append-only** : `REVOKE UPDATE, DELETE` + trigger (le `service_role` contourne la RLS).

### D9 — Modèle de données (KAN-50 CA1)

Tables du critère 1, **plus** quatre tables requises par les tickets liés :

| Table | Colonnes clés | Origine |
|---|---|---|
| `organization` | `id, name, slug UNIQUE, status demo\|active\|suspended, plan, default_territory, delivery_mode, demo_target, live_target, agreement_ref` | CA1, D2 |
| `domain` | `id, code, label_fr` | CA1, KAN-52 |
| `service_template` | `id, domain_id, code, label_fr, label_en, icon, default_priority, default_sla_hours, is_emergency, active` | CA1, KAN-52 |
| `org_domain` | `org_id, domain_id` — un service n'est activable que dans un domaine de l'organisation | CA1 |
| `org_service` | `id, org_id, service_template_id, enabled, label_override, sla_hours, routing_priority, territory MultiPolygon NULL, schedule jsonb NULL` | CA1, D4 |
| `membership` | `user_id PK, org_id, role, status invited\|active\|disabled, invited_at` | CA1, D1 |
| `platform_admin` | `user_id PK` | CA1 |
| `work_order` | `id, report_id, org_id, assignee_id, status, due_at, instructions` | CA1, F11 |
| `support_access_grant` | `org_id, granted_by, reason, expires_at (1–72 h), revoked_at` | CA1, KAN-53 |
| `audit_log` | `id, at, actor_id, org_id, action, before, after` (append-only) | CA1 |
| **`report_assignment`** | `report_id, org_id, org_service_id, active, assigned_at, reason` | KAN-20, KAN-33, D5 |
| **`report_reporter`** | `report_id, citizen_id, contact` | D6 |
| **`work_order_event`** | `work_order_id, at, actor_id, status, note, photo_path` (append-only) | KAN-61, KAN-62 |
| **`district`**, **`holiday`** | secteurs de Lévis ; jours fériés du Québec | KAN-33 CA3 ; KAN-20 |

`app_settings` (déjà prévu) porte `catalog_version` (KAN-12) et `allow_live_delivery` (KAN-46).

### D10 — Qualification Loi 25 (KAN-50 CA5)

| Traitement | Rôle de la plateforme | Conséquence |
|---|---|---|
| Saisie citoyenne, compte, routage, file « À trier » | **Responsable** | politique de confidentialité, consentement (KAN-28), ÉFVP (KAN-29) |
| Données traitées par une organisation (dispatch, interventions, réponses) | **Sous-traitant** de l'organisation | entente de traitement avec chaque organisation ; accès support encadré (D7) |

Impacts à reporter dans **KAN-29** : registre des deux rôles, entente type de sous-traitance,
journalisation des accès support, séparation de l'identité (D6) comme mesure de minimisation.

## Conséquences

- **Positives** : isolement vérifié par tests réels avant tout développement ; révocation immédiate ;
  identité citoyenne protégée par construction ; routage Ville / MTMD sans règle spéciale.
- **Coûts** : une lecture `membership` par requête (clé primaire, négligeable au volume MVP) ;
  tests pgTAP d'isolement obligatoires pour chaque nouvelle table (DoD KAN-33, KAN-51, KAN-53).
- **Migration** : aucune donnée existante (`authority`, `report_type` n'ont jamais été créées) — le
  blocage de KAN-12 et KAN-20 a évité toute migration.

## Écarts avec les tickets

| Ticket | Écart | Proposition |
|---|---|---|
| KAN-50 CA1 | Liste de tables incomplète | Ajout de `report_assignment`, `report_reporter`, `work_order_event`, `district`, `holiday` (D9) |
| KAN-50 (raffinement) | `membership.status active\|disabled` | Ajout de `invited` (maquette AD-Membres, KAN-54) |
| KAN-33 (raffinement) | RLS sur le claim `org_id` seul | Claim confirmé en base (D3) |
| KAN-20 (ancien CA2) | Autorités en copie | Hors MVP (D5) |
| KAN-20 CA5 | Plage horaire | Prévue dans le modèle ; **décision PO toujours requise** |

## Décisions PO requises

1. ~~Valider l'ADR (CA6)~~ — **validé** le 2026-11-16.
2. ~~File « À trier »~~ — **validé** le 2026-11-16 : le super admin voit le contenu des signalements
   **sans affectation** pour les réaffecter (D8), en exception à « agrégats seulement ». Justification :
   la plateforme est responsable de la saisie citoyenne (D10) ; menu « À trier » de la maquette super admin.
3. **KAN-20 CA5** : routage selon la plage horaire — **toujours en attente**. Le modèle le permet
   (`org_service.schedule`, `holiday`) ; sans décision, l'étape 4 de D4 est ignorée.

## Validation

- **Accepté** le 2026-11-16 par le PO (CA6), avec la décision « File À trier ».
- Reports effectués en commentaire sur KAN-12, KAN-20, KAN-33, KAN-46 (DoD) ; blocage de KAN-12 /
  KAN-20 levé dans `CLAUDE.md`.
- **Révision** si : passage multi-organisation par utilisateur, organisation avec plus de quelques
  milliers de membres (coût de `current_org()` à remesurer), ou exigence d'audit externe.
