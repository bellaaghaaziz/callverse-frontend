# Accès aux conversations sans code — 17 octobre 2026

## Parcours utilisateur

- Client : « Mes conversations », recherche et filtre de statut, clic sur une carte pour ouvrir les messages.
- Conseiller : boîte de réception existante pour le travail courant ; « Mes conversations » dans le menu pour retrouver les échanges attribués, y compris l'historique. Un échange en cours s'ouvre dans le poste de travail ; un échange terminé s'ouvre en lecture.
- Superviseur : tableau Conversations existant ; dans Pilotage IA, choix d'un échange dans « Conversations résolues » pour lire ou lancer son évaluation qualité.
- Administrateur : onglet Accueil, liste des conversations et ouverture en un clic. La page Pilotage IA utilise également le sélecteur commun.
- Laboratoire conseiller : sélection d'une conversation autorisée au lieu de saisie d'un identifiant.

Les cartes affichent le nom du client, le motif, la date, le statut, le conseiller et le dernier message. Les UUID restent des clés techniques dans les appels API ; ils ne sont plus demandés pour ouvrir une conversation. Les textes invitant à transmettre un code au client et les guides correspondants ont été actualisés.

## Backend

Nouvelle lecture GET /api/v1/conversations/accessible sur le backend d'intégration callverse-backend-ai. Paramètres : q (120 caractères maximum), status optionnel et page (à partir de zéro). Pages de 30 éléments avec hasNext. Recherche littérale par nom, conseiller, compétence/motif technique et dernier message ; les traces système ne servent pas d'aperçu. Les simulations sont exclues.

Le périmètre vient exclusivement du principal authentifié : customer.user_id pour le client, advisor.user_id pour le conseiller, tous les échanges live pour superviseur/admin. Aucun identifiant de propriétaire fourni par le navigateur ne modifie ce périmètre. Le détail et les messages gardent leurs contrôles d'accès existants.

Les composants internes ConversationDirectory et ConversationDirectoryAdapter préexistants sont conservés ; le nouveau port et son adaptateur sont nommés AccessibleConversationDirectory et AccessibleConversationDirectoryAdapter.

## Vérification

- 54 tests frontend réussis, lint, TypeScript et compilation de production réussis.
- Tests Java ciblés : portée SQL des quatre rôles, pagination et refus des filtres non bornés ; tests qualité existants conservés.
- Chrome : quatre connexions, listes, ouverture, recherche, statut résolu et largeur mobile 390.
- Lectures réelles : les éléments listés sont accessibles, les conversations étrangères restent refusées et un paramètre userId ajouté par le client n'élargit pas sa liste.
- Aucun message, statut, compte, ticket ou carte n'a été modifié pour ces vérifications.

Configuration locale active : frontend 3000, API et WebSocket 8083. Cette fonctionnalité exige le backend d'intégration, pas l'ancien backend main. Aucun changement n'a été poussé sur GitHub.
