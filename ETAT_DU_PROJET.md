# CallVerse — état du 19 octobre 2026

Le design de Fedi (frontend `cad31e7`, API `497c071`) est intégré avec les corrections du chat et de l'IA.

## Interface

- Accueil et connexion animés, avec respect du mouvement réduit.
- Client : Accueil, Mes comptes, Messagerie et Aide et suivi. Les conversations affichent leur sujet ; leur liste défile séparément du chat.
- Conseiller : chat central, files compactes, contexte et suggestions IA dans un panneau distinct. L'activité est repliée par défaut.
- Superviseur : indicateurs sur la vue d'ensemble, conversations sur une page dédiée et recommandations dans Pilotage IA.
- Administrateur : gestion par onglets et création complète d'un client.
- Laboratoire et pilotage IA dans un onglet authentifié distinct pour conserver la messagerie ouverte.

## Règles du chat et de l'IA

L'IA répond avant la première réponse humaine, y compris pendant une escalade. Lire, affecter ou escalader une conversation ne l'arrête pas. Une demande explicite de conseiller humain déclenche une escalade sans dépendre du fournisseur de modèles. La première réponse humaine arrête ensuite les réponses automatiques dans cette conversation.

Les salutations et l'aide à la navigation fonctionnent localement. Les procédures reconnues utilisent les documents publiés ; elles ne constituent pas une décision d'octroi de crédit. Les générations libres restent soumises à la disponibilité et aux quotas des fournisseurs.

Le personnel autorisé peut ouvrir « Pourquoi cette réponse ? » pour voir la décision enregistrée, les sources et les résultats des outils. Le client n'accède pas à ces traces. Les suggestions au conseiller sont en lecture seule ; les simulations restent séparées des dossiers réels.

Une réponse IA ne clôture pas le contact. Les recommandations d'effectifs nécessitent une revue humaine ; elles ne déplacent pas automatiquement les conseillers.

## Compatibilité backend

Cette interface nécessite le backend intégré et son contrat OpenAPI. La migration **V9** conserve l'index des explications IA ; **V10** ajoute la suppression logique côté client. Les discussions retirées par le client restent consultables par le personnel autorisé. Ne pas réécrire l'historique Flyway d'une base existante.

## Validation de cette intégration

- Frontend : **95 tests**, lint, TypeScript et compilation de production réussis.
- Backend ciblé : **53 tests** réussis sur PostgreSQL isolé, couvrant notamment l'onboarding, les règles client, la reprise humaine, les explications et le contrat API.
- Service IA : **285 tests** réussis sur les agents, la simulation, la qualité, les contrats et les délais.
- Navigateur réel : quatre rôles, ordinateur et mobile, sans erreur JavaScript sur les parcours testés. Chat avec suivi sans WebSocket, escalade, réponse IA pendant l'attente, arrêt après réponse humaine, explication réservée au personnel et laboratoire dans un onglet authentifié vérifiés.

Les journaux, captures, sauvegardes de base et identifiants de test restent locaux. Ces vérifications ne remplacent pas les tests de charge, la calibration humaine des évaluations qualité ou la validation d'un déploiement en production.
