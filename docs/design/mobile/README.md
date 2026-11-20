# Maquettes — app mobile citoyenne

Source : fichier Figma **« Signalement Lévis – MVP UX/UI »** (`HhQawU6MA9j9pFfNfLEm00`), lu par l'API REST
Figma (le connecteur MCP Figma est limité sur le plan Starter). Cadres 390 × 844, mode clair seulement.

## Écrans

| # | Écran | Nœud Figma | Ticket | État |
|---|---|---|---|---|
| 01 | Accueil | [`6:33`](https://www.figma.com/design/HhQawU6MA9j9pFfNfLEm00?node-id=6-33) | KAN-41, KAN-18 (bannière 911) | Implémenté |
| 02 | Type d'anomalie | [`6:105`](https://www.figma.com/design/HhQawU6MA9j9pFfNfLEm00?node-id=6-105) | KAN-12 | Implémenté (+ 2ᵉ niveau : types) |
| 03 | Photos | [`6:237`](https://www.figma.com/design/HhQawU6MA9j9pFfNfLEm00?node-id=6-237) | KAN-13 | À faire |
| 04 | Localisation | [`6:287`](https://www.figma.com/design/HhQawU6MA9j9pFfNfLEm00?node-id=6-287) | KAN-14 | À faire |
| 05 | Détails | [`7:222`](https://www.figma.com/design/HhQawU6MA9j9pFfNfLEm00?node-id=7-222) | KAN-15, KAN-16 | À faire |
| 06 | Récapitulatif | [`7:272`](https://www.figma.com/design/HhQawU6MA9j9pFfNfLEm00?node-id=7-272) | KAN-17 | À faire |
| 07 | Confirmation | [`7:320`](https://www.figma.com/design/HhQawU6MA9j9pFfNfLEm00?node-id=7-320) | KAN-17 | À faire |
| 08 | Mes signalements | [`7:361`](https://www.figma.com/design/HhQawU6MA9j9pFfNfLEm00?node-id=7-361) | KAN-30 | État vide seulement |
| 09 | Urgence (bloquant) | [`7:419`](https://www.figma.com/design/HhQawU6MA9j9pFfNfLEm00?node-id=7-419) | KAN-12 CA4 | Implémenté |

## Système visuel (dans le code : `app/src/theme/index.ts`)

Identique à la console (`docs/design/console/README.md`) : sable `#FBF7F0`, vert sapin `#1F4D3A`,
texte `#1E2A24` / `#5B6660`, contours `#E2D3B8`, sélection `#E3EFE8`, terracotta `#D9643A` (décoratif),
police Nunito 400 / 600 / 700, cartes 16 px, boutons et champs en pilule.

**Écarts d'accessibilité (WCAG 2.1 AA)** : rouge `#C8372D` → `#C0322A` (4,31:1 → 4,67:1 sur `#FBE5E2`) ;
vert succès `#3E8E5E` → `#327549` (3,40:1 → 4,71:1 sur `#E3EFE8`).

## Icônes

Exportées telles quelles depuis Figma : `app/assets/icons/*.svg` (originaux) et `app/src/ui/icons.ts`
(généré, couleur de trait en `currentColor`). Le réseau routier provincial n'a pas d'icône dédiée :
il reprend celle de la voirie.

## Écarts produit retenus (décision PO du 2026-11-20)

1. Type d'anomalie : la grille du design n'a qu'un niveau ; la catégorie choisie affiche ses types (KAN-12 CA1).
2. Catégories : seules celles renvoyées par l'API pour la position (pas de liste figée « Parcs », « Autre »…).
3. Destinataire : celui renvoyé par l'API, avec la mention démo (« Ville de Lévis — démo », ADR-002).
4. Accueil : « acheminement vers le bon destinataire » au lieu de « envoi direct à la bonne autorité » (ADR-002).
