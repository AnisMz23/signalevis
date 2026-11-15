# Kit de prise de contact — autorités pilotes (KAN-24)

> **Phase pitch** : démarches reportées après le pitch (ADR-002, décision PO du 2026-11-15).

Annexe de l'[ADR-002](../adr/ADR-002-autorites-routage.md). À utiliser par le PO.

## Ordre recommandé

1. **STLévis** — pilote le plus atteignable (petite organisation, périmètre clair : abribus).
2. **Ville de Lévis** — cible principale (majorité des signalements). Viser la direction des
   travaux publics / relations avec les citoyens, pas seulement la ligne 311.
3. **SPVL** — optionnel ; volume faible.
4. Hydro-Québec, MTMD — ne pas démarcher pour le MVP (aiguillage assisté vers 1 800 790-2424 / 511).

Canal d'approche : appel au service à la clientèle pour obtenir le **nom du bon gestionnaire**,
puis courriel ci-dessous. STLévis : 418 837-2401. Ville : 311 ou formulaire « Joindre la Ville ».

## Courriel type

> **Objet** : Signalement Lévis — projet pilote de signalements citoyens enrichis (15 min de votre temps)
>
> Bonjour [Nom],
>
> Je développe **Signalement Lévis**, une application mobile qui aide les citoyens de Lévis à
> signaler une anomalie — [abribus endommagé / nid-de-poule, lampadaire, mobilier urbain] — en
> moins d'une minute, avec photos, position GPS précise et description structurée.
>
> L'objectif est de vous transmettre des signalements **complets dès la première fois**, sans
> rappel du citoyen, et dirigés vers la bonne organisation. Les données sont hébergées au Québec
> (Montréal) et traitées selon la Loi 25.
>
> Je cherche **une organisation pilote** pour valider le format avant le lancement. Concrètement,
> cela demanderait seulement de recevoir les signalements sur une adresse courriel que vous
> choisissez, dans un format normalisé (exemple ci-dessous). Aucune intégration informatique.
>
> Seriez-vous disponible pour un échange de 15 minutes ? Cinq questions me suffiraient :
> 1. Quel canal vous conviendrait pour recevoir ces signalements (adresse courriel dédiée, autre) ?
> 2. Qui serait la personne-ressource ?
> 3. Combien de signalements de ce type recevez-vous par mois, environ ?
> 4. Quelles informations vous manquent le plus souvent dans les signalements actuels ?
> 5. Seriez-vous d'accord, en principe, pour un pilote de 3 mois à volume limité ?
>
> Merci de votre attention,
> [Votre nom] — Product Owner, Signalement Lévis — [téléphone]

## Exemple de signalement reçu (à joindre au courriel)

> **Objet** : [Signalement Lévis][LEV-000123][Abribus endommagé][Priorité normale]
>
> - **Référence** : LEV-000123 — reçu le 2026-11-20 à 14 h 32
> - **Type** : Transport > Abribus endommagé
> - **Adresse approximative** : arrêt 1234, boul. Alphonse-Desjardins (devant le n° 5000)
> - **Position** : 46.8034, -71.1789 (précision ± 4 m) — [voir sur la carte]
> - **Description** : vitre latérale brisée, éclats au sol près du banc.
> - **Photos** : 2 photos — [lien 1] [lien 2] (liens valides 30 jours)
> - **Citoyen** : joignable via l'application (coordonnées non transmises sans consentement)

Exemple fictif : adresse, arrêt et coordonnées sont illustratifs.

## Grille de suivi des démarches

| Autorité | Date contact | Interlocuteur (rôle) | Canal accepté | Volume / mois | Infos manquantes aujourd'hui | Accord de principe | Prochaine étape |
|---|---|---|---|---|---|---|---|
| STLévis | | | | | | | |
| Ville de Lévis | | | | | | | |
| SPVL | | | | | | | |

Une fois remplie, transmettre la grille à Claude Code pour mise à jour de l'ADR-002 et des commentaires Jira.
