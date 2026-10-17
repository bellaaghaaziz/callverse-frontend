# Intégration des changements de Fedi — 12 octobre 2026

Les changements de `origin/fedi/updates` jusqu'au commit `362290b` sont intégrés dans la branche locale `main` par avance rapide. Ils ne sont pas encore publiés sur `origin/main`.

Le backend local a également été avancé jusqu'à `0df8831` : le nouveau superviseur dépend de `GET /api/v1/supervision/conversations`. Cette opération supplémentaire porte à 28 le nombre d'opérations REST du périmètre décrit précédemment dans le rapport de passation, qui correspondait à l'état du 8 octobre.

## Changements et correction

- Design vert de Fedi pour l'accueil, la connexion et l'espace superviseur ; les espaces conseiller, client et administrateur restent disponibles avec leurs fonctions existantes.
- Recherche et filtres des conversations superviseur, avec ouverture du détail et des messages.
- Correction d'une course lors de la déconnexion : une réponse HTTP 401 tardive ne redirige plus une session fermée volontairement ou remplacée vers « session expirée ». Un test de régression couvre ces deux cas.
- Les fonctionnalités IA restent désactivées en attendant leurs routes backend. Les composants préparatoires ne constituent pas une intégration IA opérationnelle.

## Vérifications

- 40 tests frontend réussis ; lint et vérification TypeScript.
- Compilation de production avec un répertoire distinct de celui du serveur de développement.
- Tests unitaires backend `SearchConversationsQueryHandlerTest` réussis.
- Contrôles Chrome en largeur 1440 et 390 : accueil, connexion et quatre rôles, navigation mobile et déconnexion, absence de débordement horizontal.
- Avec le backend et la base réels : connexions, lectures des données, connexion du flux temps réel, recherche superviseur par référence client, filtre de file et ouverture d'une conversation ; rejet côté interface d'une période invalide.
- Avec réponses d'écriture interceptées : prise en charge d'une file, file vide, envoi de messages, dédoublonnage REST/temps réel, défilement du chat, ticket, blocage de carte, résolution, escalade, abandon et enregistrement d'un contact. Ces contrôles vérifient le frontend sans modifier les données métier réelles.

Les contrôles d'écriture ci-dessus ne prouvent donc pas la persistance de ces opérations dans la base réelle. Les scénarios métier de bout en bout restent à effectuer sur des données de test dédiées.

## Suite

Utiliser `docs/GREEN_DIRECTION.md` comme référence pour étendre ensuite le design superviseur aux autres espaces, tout en conservant leurs workflows et leurs contrôles d'accès.
