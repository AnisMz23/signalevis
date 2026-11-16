# Plateforme SaaS multi-organisation

Décision PO du 2026-11-16. Statut : **acceptée** ; modèle de données à figer par l'ADR-003 (KAN-50).

## Modèle

```
Plateforme (super admin)
 └── Organisation (cliente : Ville de Lévis, STLévis, …)
      ├── Domaine(s) d'activité → services activés
      ├── Territoire(s) desservi(s)
      └── Membres : org_admin · dispatcher · field_worker
```

- Le **citoyen n'appartient à aucune organisation** : il signale une fois, le routage choisit l'organisation.
- **Hypothèse MVP (à confirmer)** : un utilisateur appartient à une seule organisation (`membership.user_id` unique). Le modèle reste compatible multi-organisation.
- Le **travailleur terrain** est dans le pitch en version minimale (même app Expo, mode selon le rôle).

## Rôles et permissions

| Action | super admin | org_admin | dispatcher | field_worker | citoyen |
|---|---|---|---|---|---|
| Gérer organisations, domaines, services types, `routing_priority` | ✔ | — | — | — | — |
| Voir le contenu des signalements d'une organisation | seulement avec accès support actif | ✔ | ✔ | ses interventions | les siens |
| Gérer membres, services activés, territoire | — | ✔ | — | — | — |
| Trier, assigner, changer le statut, répondre | — | ✔ | ✔ | — | — |
| Mettre à jour ses interventions terrain | — | — | — | ✔ | — |

## Modèle de données cible (à valider dans ADR-003)

| Table | Rôle |
|---|---|
| `organization` | client ; `status demo\|active\|suspended` ; remplace `authority` (absorbe `delivery_mode`, `demo_target`, `live_target`, `agreement_ref`) |
| `domain`, `service_template` | catalogue global géré par le super admin = catalogue citoyen |
| `org_domain`, `org_service` | services activés par organisation : `enabled`, `label_override`, `sla_hours`, `routing_priority`, `territory geometry(MultiPolygon,4326)` |
| `membership` | `user_id` (unique au MVP), `org_id`, `role`, `status invited\|active\|disabled` |
| `platform_admin` | comptes super admin |
| `report_assignment` | résultat du routage ; base de visibilité dans la console |
| `work_order`, `work_order_event` | interventions terrain et leur historique (append-only) |
| `support_access_grant`, `audit_log` | accès support temporaire, journal append-only |

JWT (Custom Access Token Hook) : `org_id`, `org_role`, `is_platform_admin`. RLS : `org_id = (auth.jwt() ->> 'org_id')::uuid`.

## Routage

`route_report()` : service type choisi par le citoyen → `org_service` dont le territoire couvre la position (`ST_Covers`) → plage horaire → territoire le plus petit → `routing_priority` → sinon « À trier ». Organisation `suspended` ignorée ; organisation `demo` → cible de démonstration uniquement.

## Ordre de développement

1. **KAN-50** (spike ADR-003) avant tout le reste.
2. **KAN-12 et KAN-20 sont bloqués** jusqu'à la validation de l'ADR-003 (sinon migration `report_type` → `service_template`).
3. Puis F9 → F10 → F5 → F11.

## Backlog Jira (label `saas`)

| Feature | Clé | Stories | Pts |
|---|---|---|---|
| F5 – Console organisation (réécrite) | KAN-8 | KAN-33 file dispatcher (8) · KAN-34 statut/réponse (5) · KAN-35 réacheminement (3) · KAN-58 assignation terrain (5) | 21 |
| F9 – Plateforme super admin | KAN-47 | KAN-50 spike ADR-003 (3) · KAN-51 organisations (5) · KAN-52 domaines et services types (5) · KAN-53 accès support + audit (3) | 16 |
| F10 – Administration d'organisation | KAN-48 | KAN-54 membres et rôles (5) · KAN-55 services (5) · KAN-56 territoire (5) · KAN-57 désactivation (2) | 17 |
| F11 – Travailleur terrain (minimal) | KAN-49 | KAN-59 mode terrain (3) · KAN-60 mes interventions (3) · KAN-61 statut terrain (3) · KAN-62 clôture + photo (3) | 12 |

Les détails (critères d'acceptation, raffinement) sont dans Jira, qui fait foi. Voir aussi `docs/product/raffinement-technique-v2.md` et `docs/design/console/`.

## Points ouverts

- Confirmer l'hypothèse mono-organisation.
- Loi 25 : plateforme responsable (saisie citoyenne) vs sous-traitant (données des organisations) → KAN-29.
- Maquettes manquantes : travailleur terrain (F11), accès support, journal d'audit.
