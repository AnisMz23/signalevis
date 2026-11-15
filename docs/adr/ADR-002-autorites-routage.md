# ADR-002 — Autorités, canaux et responsabilités à Lévis

| | |
|---|---|
| **Ticket** | [KAN-24](https://signalevis.atlassian.net/browse/KAN-24) (spike T2) — débloque [KAN-20](https://signalevis.atlassian.net/browse/KAN-20) (S2.1), [KAN-21](https://signalevis.atlassian.net/browse/KAN-21) (S2.2), [KAN-22](https://signalevis.atlassian.net/browse/KAN-22) (S2.3) |
| **Statut** | Proposé — recherche documentaire terminée ; démarches auprès des autorités en attente (PO) |
| **Date** | 2026-11-15 |
| **Décideur** | Product Owner |
| **Annexe** | [Kit de prise de contact](../spikes/KAN-24-kit-contact.md) |

## Contexte

L'épopée F2 suppose qu'un signalement peut être **livré** à l'autorité compétente (courriel structuré
S2.2, API/Open311 S2.3). Ce spike vérifie, autorité par autorité, si ce postulat tient : quels canaux
existent, lesquels accepteraient un flux venant d'un tiers, et ce qu'il advient du MVP sans accord.

**Méthode.** Recherche documentaire sur les sites officiels (2026-11-15). Les champs *contact*,
*volume attendu* et *accord de principe* (KAN-24 CA2) exigent des échanges directs : ils sont marqués
« à obtenir » et seront complétés par le PO à l'aide du kit en annexe.

## 1. Inventaire des canaux actuels (KAN-24 CA1)

| Autorité | Périmètre (pour notre catalogue) | Canaux citoyens publics | Canal machine (API / Open311) | Source |
|---|---|---|---|---|
| **Ville de Lévis** | Rues municipales (nids-de-poule, chaussée), éclairage de rue, parcs et mobilier urbain, aqueduc/égouts | **311** (depuis Lévis) · 418 839-2002 (interurbain) · formulaire « Joindre la Ville » · **Espace citoyen** (requêtes en ligne avec suivi) · clavardage · formulaire dédié nids-de-poule. Lun-ven ~8 h 30–16 h 30 ; formulaire seul en dehors des heures. | Aucun publié. **Aucune adresse courriel publiée.** | [Nous joindre](https://levis.ca/fr/ville/decouvrir-levis/nous-joindre), [Signaler un bris](https://levis.ca/fr/services/travaux-entretien-et-entraves/signaler-un-bris-ou-un-besoin-dentretien), [Signaler un nid-de-poule](https://levis.ca/fr/services/travaux-entretien-et-entraves/signaler-un-nid-de-poule), [Espace citoyen](https://espace.levis.ca/) |
| **SPVL** (police de Lévis) | Sécurité non urgente (véhicule abandonné, nuisance) ; **urgences municipales hors heures** (bris d'aqueduc, affaissement de chaussée le soir/week-end) | **418 832-2911** (non urgent) · 911 (urgence) | Aucun publié. Aucune déclaration en ligne mentionnée. | [Service de police](https://levis.ca/fr/services/securite-publique/service-de-police) |
| **Hydro-Québec** | Réseau électrique : fil tombé, poteau endommagé, panne | **1 800 790-2424** (panne ou équipement endommagé) · 911 si danger imminent (fil au sol) | Aucun canal d'entrée tiers publié (carte des pannes en lecture seule). | [Hydro-Québec — en cas de panne](https://pannes.hydroquebec.com/pannes/en-cas-de-panne), [Guide municipalités](https://pannes.hydroquebec.com/data/administrations-municipales/pdf/2018G978-F-10-municipalite-urgence.pdf) |
| **MTMD** (Transports Québec) | « Autoroutes, bretelles et routes numérotées » — à Lévis notamment A-20, A-73, routes 116, 132 (route Marie-Victorin), route des Rivières, une partie des routes Kennedy et des Îles | **511** (1 888 355-0511 hors Québec). Pas de formulaire web de signalement identifié. | Aucun canal d'entrée. Québec 511 diffuse l'état du réseau (sortant seulement). | [Lévis — nids-de-poule](https://levis.ca/fr/services/travaux-entretien-et-entraves/signaler-un-nid-de-poule), [MTMD — coordonnées](https://www.quebec.ca/gouvernement/ministere/transports/coordonnees) |
| **STLévis** | Abribus, poteaux d'arrêt (propriété de la Société — règlement 192) | **418 837-2401** (lun-ven 8 h–17 h 30) · page « Commentaires » · réseaux sociaux | Aucun publié. Aucune adresse courriel publiée. | [Nous joindre](https://www.stlevis.ca/nous-joindre), [Règlement 192](https://www.stlevis.ca/sites/default/files/public/assets/stlevis/reglements-politiques/reglement-192-vf2025-03-27.pdf) |

### Constats

1. **Aucune des 5 autorités n'expose d'API ni d'Open311.** S2.3 (KAN-22) est hors MVP, comme son
   raffinement technique le prévoit ; garder l'interface (Strategy) sans l'implémenter.
2. **Aucune n'expose d'adresse courriel publique de réception.** Le canal courriel de S2.2 (KAN-21)
   **n'existe que si une autorité fournit une adresse dédiée** — c'est donc un résultat d'entente,
   pas une donnée disponible.
3. **La Ville de Lévis n'a pas de « 311 » au sens Open311** : 311 est sa ligne téléphonique.
   KAN-20 CA1 (« Ville de Lévis (311/requêtes citoyennes) ») doit se lire « ligne 311 + Espace citoyen ».
4. **Le SPVL joue un double rôle** : sécurité non urgente *et* relais des urgences municipales hors
   heures. Le routage doit tenir compte de l'heure, pas seulement du type.

## 2. Matrice type → autorité (version de travail)

Catégories alignées sur KAN-12 (S1.1). « Canal cible » = canal que le MVP utiliserait si l'autorité
l'accepte ; « Repli » = ce que l'app fait sans accord.

| Catégorie > Type | Autorité primaire | Condition / zone grise | Canal cible | Repli sans accord |
|---|---|---|---|---|
| Voirie > Nid-de-poule | Ville de Lévis | **MTMD si route numérotée / autoroute / bretelle** → géographique (KAN-25) | Courriel dédié Ville | Lien Espace citoyen / formulaire nid-de-poule ; 511 si MTMD |
| Voirie > Affaissement de chaussée | Ville de Lévis | **Urgent** : SPVL 418 832-2911 hors heures ; MTMD si route numérotée | Courriel dédié Ville | Appel 311 (heures) / SPVL (hors heures) |
| Voirie > Signalisation endommagée | Ville de Lévis | MTMD sur son réseau | Courriel dédié Ville | Formulaire Ville / 511 |
| Éclairage > Lampadaire défectueux | Ville de Lévis | **Zone grise** : la Ville liste « lampadaire brûlé » et a un contrat d'entretien de l'éclairage public ; luminaires sur autoroute → MTMD (511) ; à confirmer si certains luminaires sont installés sur poteaux Hydro-Québec | Courriel dédié Ville | Formulaire Ville |
| Électricité > Fil tombé / poteau endommagé | Hydro-Québec | **Danger** si fil au sol → 911 ; type à marquer `is_emergency` (bloque la soumission, S1.7) | Aucun (téléphone uniquement) | Bouton d'appel 1 800 790-2424 |
| Parcs > Mobilier urbain endommagé | Ville de Lévis | — | Courriel dédié Ville | Formulaire Ville |
| Aqueduc/égouts > Fuite, refoulement | Ville de Lévis | **Urgent** (liste Ville) → appel 311 / SPVL hors heures ; ne pas différer via l'app | — | Bouton d'appel |
| Transport > Abribus endommagé | STLévis | Propriété STLévis (règl. 192) ; mobilier près d'un arrêt peut être municipal | Courriel dédié STLévis | Appel 418 837-2401 / page Commentaires |
| Sécurité > Véhicule abandonné | SPVL | Non urgent | Courriel dédié SPVL (peu probable) | Appel 418 832-2911 |

### Implications pour les stories

- **KAN-20 (S2.1)** : ajouter à `routing_rule` une dimension **fenêtre horaire** (urgences hors heures
  → SPVL) et un **canal de repli** par règle (lien, téléphone). Écart à signaler en commentaire.
- **KAN-12 / S1.7** : « Fil tombé » et « Fuite / refoulement » doivent être des types urgents
  (`is_emergency`) qui orientent vers un appel, pas vers une soumission.
- **KAN-25** : la distinction Ville ↔ MTMD est entièrement géographique et touche les types
  Voirie et Éclairage — c'est le principal risque d'erreur de routage.

## 3. Statut des démarches (KAN-24 CA2)

| Autorité | Canal acceptable | Contact | Volume attendu | Accord de principe |
|---|---|---|---|---|
| Ville de Lévis | À obtenir | À obtenir | À obtenir | À obtenir |
| SPVL | À obtenir | À obtenir | À obtenir | À obtenir |
| Hydro-Québec | Probablement aucun (téléphone) | À obtenir | — | Peu probable |
| MTMD | Probablement aucun (511) | À obtenir | — | Peu probable |
| STLévis | À obtenir | À obtenir | À obtenir | À obtenir |

**Volume attendu** — estimation à valider : hypothèse ADR-001 de 1 000 signalements/mois au pilote ;
répartition par autorité à mesurer, la Ville recevant vraisemblablement la majorité (voirie, éclairage, parcs).

## 4. Scénarios et grille Go/No-Go (KAN-24 CA3)

### Scénarios

| Scénario | Condition | Ce que fait le MVP | Valeur pour le citoyen | Valeur pour l'autorité |
|---|---|---|---|---|
| **A — Pilote livré** | ≥ 1 autorité fournit une adresse dédiée + accepte le format | Livraison directe par courriel structuré (S2.2) pour cette autorité ; repli pour les autres | Forte : un seul geste, suivi | Forte : signalement complet, dédupliqué |
| **B — Relais courriel non sollicité** | Aucun accord, mais on envoie quand même au formulaire / à une adresse générale | **Déconseillé** : non sollicité, risque d'être perçu comme du pourriel, aucun suivi possible, risque réputationnel avant même le pilote | Faible | Négative |
| **C — Aiguillage assisté** | Aucun accord | L'app identifie l'autorité et **oriente le citoyen vers le canal officiel** (lien Espace citoyen, appel 311/511/Hydro), avec un résumé prêt à copier et les photos | Moyenne : bon interlocuteur, bonne info | Neutre : signalement mieux qualifié |

**Lecture.** Le critère CA3 oppose « pilote » et « simple relais courriel ». La recherche montre que
le relais courriel (B) n'est **pas** le repli naturel : sans adresse fournie par l'autorité, il n'y a
nulle part où l'envoyer proprement. Le vrai repli est **C — Aiguillage assisté**, qui ne demande
aucun accord et conserve la valeur de capture (F1) et de qualification.

### Grille de choix de l'autorité pilote

| Critère | Poids | Ville de Lévis | STLévis | SPVL | Hydro-Québec | MTMD |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Part des signalements attendus | 3 | Élevée | Faible | Faible | Faible | Moyenne |
| Probabilité d'accord (taille, proximité, agilité) | 3 | Moyenne | **Élevée** | Faible | Faible | Faible |
| Effort d'intégration côté autorité | 2 | Moyen | Faible | Moyen | — | — |
| Valeur démonstrative pour les autres | 2 | **Élevée** | Moyenne | Moyenne | Faible | Moyenne |

**Recommandation.** Démarcher **en parallèle la Ville de Lévis (cible principale) et la STLévis
(pilote le plus atteignable)**. La STLévis est petite et maîtresse de son périmètre (abribus) : un
accord y est plus rapide et constitue une preuve de concept utilisable auprès de la Ville.
Hydro-Québec et MTMD : ne pas démarcher pour le MVP, utiliser l'aiguillage assisté.

### Décision proposée

- **Go** sur l'épopée F2 avec livraison directe **si** un accord (Ville ou STLévis) est obtenu
  avant le début de S2.2 ; sinon **Go en scénario C** (aiguillage assisté) et S2.2 reporté.
- **Le scénario B est écarté.**
- **Date butoir** des démarches : à fixer par le PO (proposition : 3 semaines).

## Écarts avec le ticket

- **Timebox (3 jours) dépassée par nature** : les accords dépendent des autorités. L'ADR est livré
  en deux temps — « Proposé » (recherche, matrice, grille) puis « Accepté » (résultats des démarches
  et décision Go/No-Go du PO).
- **CA3** : le repli recommandé n'est pas le « relais courriel » mentionné, mais l'aiguillage assisté (scénario C).

## Validation

- **Proposé** le 2026-11-15. Passage à « Accepté » après : (1) retour des démarches ou date butoir
  atteinte, (2) décision Go/No-Go du PO consignée ici et en commentaire sur KAN-24 et KAN-21.
