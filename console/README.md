# Console web — Signalement Lévis (KAN-63)

Next.js 16 (App Router, TypeScript strict). Une seule console, menus selon le rôle :
super admin → `/platform/...` ; admin d'organisation et répartiteur → `/org/...` ; autres profils → accès refusé.

- **Lire `AGENTS.md`** avant toute modification : Next.js 16 diffère des versions connues (ex. `proxy.ts`
  remplace `middleware.ts`). Doc versionnée : `node_modules/next/dist/docs/`.
- Backend : uniquement via l'API `/v1` (`src/lib/api/client.ts`, contrat `docs/api/openapi.yaml`).
- SDK Supabase : uniquement dans `src/lib/auth/` (session par cookies, `@supabase/ssr`).
- Les claims du JWT servent à la navigation ; les droits sont reconfirmés par `GET /v1/me` (ADR-003 D3).
- Textes : `src/i18n/fr.json` via `t()` ; couleurs : `src/theme/tokens.ts` (toute nouvelle paire texte/fond
  ajoutée à `textPairs`, contrôlée ≥ 4,5:1 par `__tests__/ca4_design.test.ts`).

## Commandes

```bash
npm run check
```

(= typecheck + lint + tests). Build :

```bash
npm run build
```

## Configuration (valeurs publiques, aucun secret)

Voir `.env.example`. En local : copier en `.env.local`. Sur Vercel : Settings → Environment Variables.

## Déploiement Vercel (CA6)

1. vercel.com → Add New → Project → importer `AnisMz23/signalevis`.
2. **Root Directory : `console`** ; framework détecté : Next.js.
3. Variables : les 3 de `.env.example` (staging d'abord).
4. Supabase (staging) → Authentication → URL Configuration : ajouter l'URL Vercel
   (`https://<projet>.vercel.app/**`) aux Redirect URLs, sinon le lien magique échoue.
   Le code à usage unique fonctionne sans cette étape si le gabarit de courriel contient `{{ .Token }}`.
