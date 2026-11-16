# Raffinement technique v2 — alignement ADR-001 / ADR-002

Date : 2026-11-15. Les descriptions Jira d'origine ne sont pas modifiées : les commentaires « Raffinement technique v2 » sur chaque ticket **font foi**. Ce fichier en est le résumé.

## Décisions sources

- **ADR-001** (KAN-45, accepté) : Supabase, région `ca-central-1`, PostgreSQL 17 / PostGIS 3.3.7 ; logique métier en SQL versionné, Edge Functions minces, SDK Supabase encapsulé. Plan Free pendant le pitch, Pro avant le pilote.
- **ADR-002** (KAN-24, accepté pour le pitch) : mode démo (boîtes `demo-…`). Aucune autorité de Lévis n'expose d'API / Open311 ni d'adresse courriel publique. Le SPVL reçoit aussi les urgences municipales hors heures → routage dépendant de l'heure.

## Changements par ticket

| Ticket | Changement |
|---|---|
| KAN-12 Catalogue | Vue PostgREST `v1_report_types` ; cache par `catalog_version` (pas d'ETag) ; recherche sans accents côté client. **Voir aussi impact SaaS : bloqué par KAN-50.** |
| KAN-13 Photos | Supabase Storage, bucket privé, `createSignedUploadUrl` (durée fixée par Supabase) ; RLS `storage.objects`, max 3 par trigger ; EXIF supprimé par ré-encodage `expo-image-manipulator` ; vignettes côté client tant que plan Free. |
| KAN-14 Géolocalisation | `expo-location` ; Edge Function `geocode-reverse` (Adresses Québec) + table `geocode_cache` ; validation du territoire dans la RPC, pas dans l'Edge Function. |
| KAN-17 Soumission | RPC `submit_report(payload, idempotency_key)` transactionnelle (territoire, débit, doublons, référence `LEV-AAAA-NNNNNN`) ; outbox = Supabase Queues (pgmq) ; transitions par table + trigger. |
| KAN-20 Routage | CA à ajouter : plage horaire par règle (America/Toronto, jours fériés). **Voir aussi impact SaaS : bloqué par KAN-50.** |
| KAN-21 Courriel | Worker `deliver-email` sur pgmq ; fournisseur à décider (SES `ca-central-1` vs Postmark / Resend US → ÉFVP) ; liens photos signés 30 jours. |
| KAN-22 Open311 | Hors MVP (aucune API côté autorités) ; garder l'interface de canal. |
| KAN-23 Audit | Append-only réel : `REVOKE UPDATE, DELETE` + trigger (le `service_role` contourne la RLS). |
| KAN-26 Mode invité | Supabase Auth anonyme ; conversion sur le même `user_id` (aucune migration) ; CAPTCHA. |
| KAN-27 Compte | OTP courriel Supabase ; SMTP personnalisé obligatoire ; pas de SSO social au MVP. |
| KAN-28 Loi 25 | Sous-traitants hors Canada à inscrire à l'ÉFVP : service push Expo, fournisseur courriel (si non SES), Sentry, analytics. Purge `pg_cron`. |
| KAN-31 Push | Expo Push ; payload minimal (aucune description ni adresse) ; nécessite un build de développement. |
| KAN-33 Console | Next.js + `@supabase/ssr` ; Custom Access Token Hook (`org_id`, `org_role`). Réécrit le 2026-11-16 pour le SaaS. |
| KAN-38 Modération | Recommandé : aucune photo publique au MVP ; sinon Rekognition `ca-central-1`. Décision PO requise. |
| KAN-39 Débit | Limite dans `submit_report()` (pas de passerelle) ; App Attest / Play Integrity reportés. |
| KAN-40 Hors-ligne | `expo-sqlite` + `expo-background-task` ; TUS inutile au MVP (photos ≤ 800 Ko). |
| KAN-43 CI/CD | GitHub Actions : pgTAP, `supabase db push`, `functions deploy`, advisors Supabase en CI. |
| KAN-46 (nouveau) | Mode démo : `delivery_mode`, double verrou anti-envoi réel, résultat `blocked_demo_mode`. |

## Décisions PO en attente

1. KAN-20 : critère « routage selon plage horaire ».
2. KAN-21 / KAN-27 : fournisseur courriel (Canada vs US).
3. KAN-22 : passer en `post-mvp`.
4. KAN-38 / KAN-32 : photos publiques au MVP ou non.
5. KAN-13 : durée fixe des URL d'upload signées ; vignettes côté client.
6. KAN-39 : App Attest / Play Integrity après le pitch.
