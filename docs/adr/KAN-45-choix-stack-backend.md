# ADR-001 — Choix de la stack backend : Supabase vs AWS natif

| | |
|---|---|
| **Ticket** | [KAN-45](https://signalevis.atlassian.net/browse/KAN-45) (spike T1) — débloque [KAN-42](https://signalevis.atlassian.net/browse/KAN-42) (S8.2) |
| **Statut** | Proposé — en attente de validation PO |
| **Date** | 2026-11-15 |
| **Décideur** | Product Owner (aucun architecte dans l'équipe — voir § Validation et révision) |

## Contexte

Le MVP exige un backend géospatial (PostgreSQL + PostGIS), hébergé au Canada, multi-tenant
(chaque autorité ne voit que ses signalements), avec stockage de photos, authentification
citoyenne et environnements dev / staging / prod (KAN-42, CA1–CA3).

**Contrainte déterminante : composition de l'équipe.** Le produit est construit par le PO avec
Claude Code, **sans développeur ni expertise infrastructure**, au moins jusqu'au pilote.
Le critère « compétences équipe » se traduit donc par : *maintenabilité sans expertise infra*.
Il reçoit la pondération la plus forte.

## Options évaluées

- **A — Supabase** (plan Pro, région `ca-central-1`) : Postgres managé + Auth + Storage + RLS + Edge Functions.
- **B — AWS natif** (`ca-central-1`) : RDS PostgreSQL + S3 + Lambda/API Gateway (ou ECS) + Cognito, infrastructure as code.

## Évaluation

Pondération : 1 (faible) à 3 (forte). Note : 1 (défavorable) à 5 (favorable).

| Critère (CA1 de KAN-45) | Poids | A — Supabase | B — AWS natif |
|---|:-:|:-:|:-:|
| Compétences équipe / maintenabilité sans infra | **3** | **5** — console, migrations, auth et stockage intégrés | **1** — VPC, IAM, sauvegardes, patchs, IaC à maintenir seul |
| Résidence des données au Canada | 3 | 4 — région spécifique `ca-central-1` (Montréal) | 5 — contrôle total de la région, service par service |
| RLS multi-tenant | 2 | 5 — RLS Postgres natif, intégré à l'auth (JWT) | 4 — RLS Postgres possible, mais l'intégration Cognito → rôle Postgres est à construire |
| PostGIS | 2 | 4 — extension disponible ; **Postgres 17** par défaut (voir écart) | 5 — RDS PostgreSQL 16 ou 17 au choix, PostGIS supporté |
| Coût 1 000 / 10 000 signalements/mois | 2 | 4 — prévisible, plafond de dépense par défaut | 3 — base faible, mais coûts cachés (NAT, Multi-AZ, temps humain) |
| Dépendance fournisseur (lock-in) | 2 | 3 — Postgres standard, mais Auth/Storage/Edge propriétaires → atténué par la contrainte de réversibilité | 3 — services AWS propriétaires (Cognito, Lambda) aussi |
| **Total pondéré** (max 70) | | **59** | **48** |

### Résidence des données

- Supabase liste **Canada (Central), `ca-central-1`** parmi ses régions spécifiques. La base Postgres,
  l'Auth et les objets Storage restent dans la région choisie.
  Sources : [Supabase — Available regions](https://supabase.com/docs/guides/platform/regions),
  [supabase.com/regions](https://supabase.com/regions).
- **Choisir la région spécifique, jamais une région générale (« Americas »)** : la documentation
  avertit qu'une région générale peut déployer hors de la juridiction voulue.
- La documentation précise aussi : *« Region selection is a data-location control, not proof of
  regulatory compliance. »* La conformité Loi 25 reste à établir dans KAN-29 (spike T4),
  notamment pour les sous-traitants (envoi de courriels d'auth, journaux, support).
- `ca-central-1` est situé à Montréal : les données restent au Québec, ce qui simplifie l'analyse
  de communication hors Québec (Loi 25).

### Estimation de coût (USD/mois, tarifs publiés au 2026-11-15)

Hypothèses : 3 photos max × 800 Ko (S1.2 / KAN-13) = 2,4 Mo max par signalement ;
~5 Ko de données par signalement ; chaque photo consultée ~3 fois (autorité + citoyen) ;
MAU citoyens ≤ volume de signalements.

| Volume | Photos ajoutées / mois | Cumul photos à 12 mois | Egress / mois |
|---|---|---|---|
| 1 000 signalements | ≤ 2,4 Go | ≤ 29 Go | ≤ 7 Go |
| 10 000 signalements | ≤ 24 Go | ≤ 288 Go | ≤ 72 Go |

**A — Supabase** ([tarifs](https://supabase.com/pricing)) : Pro 25 $ inclut 10 $ de crédit compute
(= 1 instance Micro), 8 Go disque, 100 Go stockage fichiers (0,0213 $/Go au-delà), 250 Go egress,
100 000 MAU. Plafond de dépense activé par défaut.

| Poste | 1 000 / mois | 10 000 / mois (à 12 mois) |
|---|---|---|
| Prod (Pro + Micro) | 25 $ | 25 $ |
| Compute plus robuste (Small, 15 $ au lieu de 10 $) | — | +5 $ |
| Staging (2ᵉ projet, Micro) | 10 $ | 10 $ |
| Dépassement stockage photos (288 − 100 Go) | 0 $ | ~4 $ |
| Dev | 0 $ (Supabase CLI en local) | 0 $ |
| **Total** | **~35 $** | **~45 $** |

> Le plan Free est exclu pour la prod : projets mis en pause après 1 semaine d'inactivité.

**B — AWS natif** (estimation indicative — à confirmer avec l'AWS Pricing Calculator) :
RDS `db.t4g.micro` en `ca-central-1` ≈ 0,018 $/h ≈ 13 $/mois en mono-AZ, ≈ 0,035 $/h en Multi-AZ
([Sparecores](https://sparecores.com/database/aws/db.t4g.micro)). À ajouter : stockage RDS et
sauvegardes, S3, API Gateway/Lambda, Cognito, et **NAT Gateway** si les Lambda accèdent à RDS en VPC
privé (souvent le premier poste de coût d'un petit projet AWS). Le tout doublé pour staging.
Ordre de grandeur : **~40–90 $/mois**, hors temps humain de configuration et d'exploitation.

**Lecture :** l'écart de coût d'infrastructure est négligeable aux deux volumes. Le coût
discriminant est le **temps d'exploitation**, qui défavorise fortement B pour une équipe sans infra.

## Décision

**Option A — Supabase, plan Pro, région spécifique Canada (Central) `ca-central-1`.**

## Contraintes de réversibilité (obligatoires)

Objectif : pouvoir migrer vers Postgres managé + services standard (option B ou autre) sans réécriture.

1. **Logique métier en SQL versionné** : schéma, contraintes, fonctions, triggers et politiques RLS
   dans `supabase/migrations/` (Supabase CLI), revus en PR. Aucune modification de schéma via la console.
2. **Code applicatif** porteur des règles produit ; **Edge Functions minces** (adaptateurs :
   webhooks, envoi courriel/push, génération de vignettes), sans logique métier.
3. **Aucune dépendance propriétaire sans interface** : l'app accède à l'auth, au stockage et aux
   notifications via des modules internes (`auth`, `storage`, `notifications`) qui encapsulent le SDK
   Supabase. Remplacer Supabase = réécrire ces adaptateurs, pas l'application.
4. **API contractuelle** : l'API publique `/v1` (KAN-42 CA2) est décrite en OpenAPI ; la console
   autorité et les intégrations tierces (Open311) dépendent du contrat, pas de PostgREST directement.
5. **Données exportables** : sauvegarde `pg_dump` et export du stockage documentés dès S8.2.

## Conséquences

- **Positives** : mise en place S8.2 en jours, pas en semaines ; RLS multi-tenant natif ;
  Auth et Storage prêts pour F1/F3 ; coût prévisible.
- **Négatives / risques** :
  - Dépendance à un fournisseur unique — atténuée par les contraintes ci-dessus.
  - La conformité Loi 25 (sous-traitants, journaux, courriels d'auth) n'est pas acquise par le
    simple choix de région → à traiter dans KAN-29.
  - Version Postgres imposée par la plateforme (voir écart ci-dessous).

## Écarts avec les tickets

- **KAN-42 CA1 exige PostgreSQL 16.** Supabase crée les nouveaux projets en **Postgres 17**
  ([changelog Supabase](https://supabase.com/changelog/35851-forthcoming-postgres-17-release-notes)).
  Recommandation : accepter Postgres 17 (aucune fonctionnalité du MVP ne dépend de la 16).
  Décision PO requise — signalée en commentaire sur KAN-42.
- **Version PostGIS** : non publiée dans les sources consultées ; à vérifier au démarrage de S8.2
  (`SELECT postgis_full_version();`).
- **KAN-45 CA2 exige une validation « PO + architecte ».** Aucun architecte dans l'équipe → validation PO seule (ci-dessous).

## Validation et révision

- **Validée par le PO.** Pas d'architecte dans l'équipe à la date de la décision.
- **Clause de révision** — cet ADR est réexaminé si l'un des événements suivants survient :
  1. arrivée d'un architecte ou d'un développeur senior dans l'équipe ;
  2. exigence d'audit de sécurité ou de conformité formulée par une autorité ;
  3. volume supérieur à **10 000 signalements/mois**.
