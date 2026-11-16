# Maquettes — console web SaaS

Référence visuelle pour F5 (console organisation), F9 (super admin) et F10 (administration d'organisation).
Produites le 2026-11-16 hors Figma (quota MCP Figma atteint) ; à reporter dans Figma, page « Console web », quand possible.

## Comment lire ces fichiers

Chaque `*.dc.html` est **une maquette, pas du code de production**. Format « Design Component » :
`{{trou}}` = valeur calculée dans `renderVals()`, `<sc-for>` = répétition, `<sc-if>` = condition.
Le script `support.js` référencé n'est pas fourni : les fichiers ne s'ouvrent pas tels quels dans un navigateur.

À reprendre dans la console Next.js : structure des écrans, libellés FR, colonnes, filtres, états, règles d'accessibilité.
À ne pas reprendre : le markup brut, les styles inline et les données d'exemple (noms, références, chiffres fictifs).

## Système visuel

| Jeton | Valeur | Usage |
|---|---|---|
| Vert sapin | `#1F4D3A` | navigation, boutons primaires, états sélectionnés |
| Sable | `#FBF7F0` | fond de page |
| Terracotta | `#D9643A` | accent décoratif seulement (contraste insuffisant pour du texte) |
| Terracotta texte | `#8A3414` sur `#FBE3D8` | priorité élevée, alertes |
| Texte secondaire | `#4F5F57` | ≥ 4,5:1 sur sable et blanc |
| Police | Nunito 400 / 600 / 700 / 800 | |
| Rayons | 10–16 px (cartes 16, champs 10, pastilles 999) | |
| Cibles tactiles | ≥ 44 px | |

## Écrans

| Fichier | Rôle | Écran | Tickets |
|---|---|---|---|
| `SA-Organisations.dc.html` | Super admin | Liste des organisations, filtres de statut, agrégats seulement | KAN-51, KAN-53 |
| `SA-Organisation-new.dc.html` | Super admin | Création : domaines, statut Démo, boîte de démonstration, invitation du 1er admin | KAN-51, KAN-46 |
| `SA-Catalogue.dc.html` | Super admin | Domaines et services types (priorité, délai cible, urgence 911, actif) | KAN-52 |
| `AD-Membres.dc.html` | Admin d'organisation | Membres, rôles, statuts, invitation | KAN-54, KAN-57 |
| `AD-Services.dc.html` | Admin d'organisation | Activation et paramètres des services, aperçu citoyen | KAN-55 |
| `AD-Territoire.dc.html` | Admin d'organisation | Territoire par défaut / par service, chevauchements | KAN-56 |
| `DI-File.dc.html` | Dispatcher | File : onglets À trier / En cours / À valider / En retard / Fermés | KAN-33 |
| `DI-Detail.dc.html` | Dispatcher | Détail, assignation terrain, statut et réponse citoyen | KAN-58, KAN-34, KAN-35 |

## Règles visibles dans les maquettes

- Le super admin ne voit que des agrégats ; le contenu exige un accès support accordé (KAN-53).
- Toute organisation en statut Démo affiche un badge « Démonstration » ; aucun logo d'autorité (ADR-002, KAN-46).
- Statut « Active » indisponible sans référence d'accord (KAN-46).
- L'identité du citoyen n'est jamais affichée au dispatcher ni au travailleur terrain.
- Une seule console web ; les menus dépendent du rôle (`org_role`).

## Hors maquette

Écrans travailleur terrain (F11), accès support, journal d'audit, états d'erreur / chargement / vide.
