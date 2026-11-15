# Signalement Lévis

Application citoyenne de signalement d'anomalies (Lévis, QC). MVP : app mobile Expo + backend PostGIS hébergé au Canada.

## Jira
- Site : signalevis.atlassian.net — Projet : KAN — Filtre : labels = signalement-levis
- Hiérarchie : Epic (F1–F8) > Story / Task. Les spikes sont des Task avec le label `spike`.
- Chaque ticket contient : Récit, Critères d'acceptation numérotés, Raffinement technique, DoD.
  Les critères d'acceptation font foi ; le raffinement technique est une recommandation, pas un ordre.
- Estimation et priorité : en-tête de la description.
- Branche : feat/KAN-<n>-<slug> ; commits : "KAN-<n>: <message>" ; PR liée au ticket.
- Ne jamais modifier la description d'un ticket. Écarts ou questions → commentaire Jira.
- Reporter une décision dans un ticket = commentaire Jira, jamais modification de la description.
- Statuts du workflow : Idea → To Do → In Progress → Testing → Done.

## Jira — règles d'exécution
- Avant de coder : lire le ticket, son Epic parent et les tickets référencés (ex. « voir S1.7 »).
  Si une dépendance n'est pas terminée → commentaire Jira + arrêt, et le signaler.
- Toujours proposer un plan court (fichiers touchés, mapping critère → test) et attendre l'accord avant de coder.
- Transitions autorisées : vers « In Progress » au démarrage uniquement. Le ticket reste en
  « In Progress » quand la PR est ouverte (pas de statut de revue dans le workflow).
  Jamais vers « Testing » ni « Done » : la validation PO et le déploiement staging sont hors périmètre.
- Chaque critère d'acceptation est couvert par au moins un test, référencé « CA<n> » dans le nom du test.
- Fin de ticket : commentaire Jira avec lien PR, tableau critère → test/fichier, écarts vs raffinement technique.
- Spike (label `spike`) : livrable = `docs/adr/ADR-<nnn>-<slug>.md` (numérotation séquentielle,
  ticket KAN-<n> dans l'en-tête) + recommandation en commentaire Jira. Pas de code de production.
- Tous les libellés visibles par l'utilisateur sont en français (Québec).

## Ordre de réalisation
Les spikes d'architecture débloquent le reste.
- KAN-45 (T1 – stack backend) : ADR-001 accepté le 2026-11-15.
- KAN-24 (T2 – autorités) : ADR-002 accepté le 2026-11-15 en mode démo (pitch).
- Spikes restants : KAN-29, KAN-25, KAN-19. Une story ne démarre qu'une fois ses spikes acceptés.

## Phase actuelle : pitch (ADR-002)
- Le produit vise une démonstration. Les autorités reçoivent les signalements dans des boîtes de démo
  contrôlées par l'équipe (`demo-…`), jamais sur leurs canaux réels.
- Données fictives autorisées, mais toujours identifiables comme telles. Ne jamais présenter une
  autorité comme partenaire, ni utiliser son logo ou son identité visuelle.

## Stack (ADR-001 — docs/adr/ADR-001-backend.md)
- Backend : Supabase, plan Pro, région spécifique Canada (Central) `ca-central-1` — jamais une région générale.
- Base : PostgreSQL 17 + PostGIS 3.3.7. Auth, Storage (photos) et Edge Functions Supabase.
- Mobile : Expo (React Native, TypeScript).
- Environnements : prod = projet Pro, staging = 2ᵉ projet, dev = Supabase CLI en local.

## Modèle d'architecture (contraintes de réversibilité de l'ADR-001)
- Logique métier en SQL versionné : schéma, fonctions, triggers et politiques RLS dans
  `supabase/migrations/`. Jamais de modification de schéma via la console Supabase.
- Multi-tenant par RLS : chaque autorité ne voit que ses signalements ; toute nouvelle table
  porte une politique RLS dès sa migration de création.
- Edge Functions minces : adaptateurs (webhooks, courriel/push, vignettes), aucune logique métier.
- SDK Supabase jamais appelé directement depuis l'interface : passer par les modules internes
  `auth`, `storage`, `notifications`.
- API publique `/v1` décrite en OpenAPI ; la console autorité et les intégrations dépendent du contrat.
- Toute dérogation à ces règles = commentaire Jira + mise à jour de l'ADR, jamais en silence.

## Environnements Supabase (KAN-42)
| Env | Projet | Réf. | URL API /v1 |
|---|---|---|---|
| staging | signalevis-staging | `sxwdmeprtrkvxjhqeqmx` | https://sxwdmeprtrkvxjhqeqmx.supabase.co/functions/v1/v1 |
| prod | signalevis-prod | `orkjzimjypavjqztafzl` | https://orkjzimjypavjqztafzl.supabase.co/functions/v1/v1 |
- Pas d'environnement dev local pour la phase pitch : staging en tient lieu.
- Plan Free : un projet inactif 7 jours est mis en pause → le réactiver avant toute démo.

## Déploiement et tests
Toujours **staging d'abord**, prod seulement si tous les tests passent sur staging.
1. Migration : fichier `supabase/migrations/<version>_<nom>.sql`, appliqué via l'outil Supabase
   `apply_migration` ; renommer le fichier avec la version enregistrée en prod (`list_migrations`).
2. Edge Function : `supabase/functions/<nom>/` déployée via `deploy_edge_function`.
3. Tests base : exécuter `supabase/tests/database/*.sql` (outil `execute_sql`) — une exception = échec.
4. Tests API :
   ```bash
   tests/api/ca2_health.sh staging
   ```
5. Sécurité : `get_advisors` (security) doit être vide après toute migration.
6. Contrat : toute nouvelle route `/v1` est d'abord ajoutée à `docs/api/openapi.yaml`.
