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

## Jira — règles d'exécution
- Avant de coder : lire le ticket, son Epic parent et les tickets référencés (ex. « voir S1.7 »).
  Si une dépendance n'est pas terminée → commentaire Jira + arrêt, et le signaler.
- Toujours proposer un plan court (fichiers touchés, mapping critère → test) et attendre l'accord avant de coder.
- Transitions autorisées : vers « en cours » au démarrage, vers « en revue » quand la PR est ouverte.
  Jamais vers « terminé » : la validation PO et le déploiement staging sont hors périmètre.
- Chaque critère d'acceptation est couvert par au moins un test, référencé « CA<n> » dans le nom du test.
- Fin de ticket : commentaire Jira avec lien PR, tableau critère → test/fichier, écarts vs raffinement technique.
- Spike (label `spike`) : livrable = `docs/adr/KAN-<n>-<slug>.md` + recommandation en commentaire Jira. Pas de code de production.
- Tous les libellés visibles par l'utilisateur sont en français (Québec).

## Ordre de réalisation
Les spikes d'architecture débloquent le reste. Commencer par KAN-45 (T1 – choix de la stack backend) :
aucune story ne démarre avant que l'ADR soit accepté.

## Commandes
À définir après KAN-45 (tests, lint, typecheck). Elles doivent passer avant toute PR.
