# CallVerse — fonctions manquantes et problèmes connus

État vérifié le **18 octobre 2026**, sur les sources intégrées frontend et backend/IA. Ce fichier distingue les échecs reproduits, les capacités absentes et les validations restant à faire. Les parcours de démonstration réussis ne remplacent pas ce bilan des limites.

Versions du code contrôlé et poussé : frontend `eff50dd`, backend/IA `81a4d7c`. Le dernier `clean install` avant push a réussi avec 581 tests Java, sans échec ni erreur. Ce bilan consolide les essais enregistrés ; il ne prétend pas qu'une nouvelle campagne complète d'appels IA a été relancée.

## Problèmes reproduits à corriger

| Priorité | Problème | Observation réelle | Correction attendue / critère de fin |
| --- | --- | --- | --- |
| P0 | Une fraude peut ne pas être escaladée | Sur un vrai appel Groq, un paiement non reconnu conduit à un ticket créé mais à `action=NONE`, malgré la consigne d'escalade. | Imposer une règle métier d'escalade indépendante du choix du modèle ; vérifier la réponse, le statut et l'alerte persistée sur plusieurs essais réels. |
| P1 | Réponses documentaires contenant des informations inventées | Une réponse cite l'article d'opposition, puis ajoute un parcours dans l'application mobile, un remplacement de carte, des notifications et une gratuité absents du document. Confiance déclarée : 0,98. | Vérifier le contenu factuel contre les sources et refuser les détails non établis. La présence d'un identifiant de source ne suffit pas. |
| P1 | L'application principale utilise un ancien backend | Pendant le contrôle, le frontend sur 3000 appelle le backend 8083, qui ne possède pas les nouvelles routes. Six des huit contrôles rôle/largeur échouent avec des 404/405. | Déployer les sources et migrations compatibles, redémarrer la pile choisie puis refaire les quatre rôles et vérifier l'OpenAPI effectivement servi. |
| P1 | Quotas Groq incompatibles avec des échanges fiables sous la charge testée | Des délais fournisseur de 238 puis 127 secondes empêchent des réponses autonomes ; les tests expirent sans réponse ou sans escalade. | Dimensionner le quota et les budgets, maîtriser la concurrence et la reprise ; réussir plusieurs parcours réels consécutifs avec le modèle déclaré. |
| P2 | Le juge qualité ne produit pas toujours une sortie valide | Une évaluation simple est enregistrée à 6,4/10 avec les six critères. Une réponse plus complexe et son vrai document donnent un HTTP 502 : preuves manquantes dans la sortie structurée. | Fiabiliser la génération et la réparation bornée du format ; valider le cas complexe sans inventer de preuves ni de note. |
| P2 | Des identifiants techniques peuvent apparaître dans les réponses IA | Le vrai essai de fraude inclut une référence technique dans le texte client. | Contrôler la sortie avant exposition ; conserver les identifiants dans les traces techniques autorisées. |
| P2 | L'index documentaire n'est pas automatiquement prêt | La base isolée contenait trois articles publiés et aucun chunk. L'index a dû être construit explicitement. | Intégrer et superviser l'indexation après installation et modification ; vérifier aussi retrait, fraîcheur et reprise après erreur. Le script d'indexation existe déjà. |

P0 désigne le défaut métier le plus urgent. Les priorités sont celles de ce bilan technique, pas un calendrier approuvé par l'équipe.

## Capacités absentes ou limitées dans la version actuelle

| Capacité | Limite actuelle |
| --- | --- |
| Blocage d'une carte par le conseiller IA | Aucun outil de blocage n'est exposé au modèle. Le blocage humain côté personnel existe. Ne pas annoncer qu'une carte est bloquée sur la seule base d'une réponse IA. |
| Blocage d'une carte depuis le portail client | Le rôle client est refusé sur l'API de blocage testée ; le portail présente les cartes en lecture. |
| Création d'un dossier bancaire complet à l'inscription | L'inscription crée une identité et un profil, sans compte, carte ou solde. Il manque un parcours applicatif de provisionnement bancaire complet. |
| Paramétrage du plafond commercial d'un nouveau conseiller | Le formulaire/API de profil règle disponibilité, capacité et compétences, sans champ de modification du plafond. Le nouveau conseiller de la vidéo a un plafond de 0 € ; le superviseur valide le crédit montré. |
| Règles d'orientation avancées | Les règles simples par motif sont exécutées ; les conditions avancées sont signalées comme non exécutées dans l'administration. |
| Réaffectation automatique des conseillers | Les mouvements restent soumis à une validation humaine et à des candidats éligibles ; aucune automatisation générale n'est établie. |

## Fonctionnalités implémentées, mais validation incomplète

- **Application d'une proposition workforce** : la route, les contrôles et l'interface sont présents. Le grand essai a retourné une proposition sans candidat disponible : un déplacement réellement appliqué n'est pas prouvé par cet essai.
- **Dialogue IA long et résolution de l'objectif** : un dialogue réel a terminé `COMPLETED`, avec deux messages et une conversation `ESCALATED`. Cela ne démontre pas une résolution ni la stabilité de longs dialogues.
- **Qualité des notes IA** : l'enregistrement fonctionne sur un exemple ; l'accord avec des évaluateurs humains n'a pas été mesuré.
- **PPO** : le vrai modèle exécute les simulations, mais les gains de SLA s'accompagnent parfois de davantage d'abandons ou d'attente. Aucun gain universel n'est établi.
- **Production** : charge, disponibilité, migrations sur l'environnement cible et comportement en déploiement restent à valider. Les opérations métier de la campagne ont utilisé une base locale isolée.

## Ce qui fonctionne dans les cas testés

Connexion et droits des quatre rôles ; sessions renouvelables et révocation ; inscription ; portail et relevé CSV ; prise en charge en file ; chat réel et persistance ; tickets et clôture client ; crédits humains contrôlés ; supervision et alertes persistées ; administration des comptes, profils, produits, procédures et règles simples ; calculs workforce et jumeau numérique.

La campagne complète a enregistré **581 tests Java, 237 tests Python et 71 tests frontend réussis**, soit **889**. Un test LLM est exclu de la suite Python standard ; les appels réels ont été contrôlés séparément. Lint, TypeScript et build frontend ont réussi. Les dix chapitres retenus de la démonstration ont aussi réussi leurs contrôles d'enregistrement.

## Déjà corrigé — ne plus reprendre les anciens constats comme défauts actuels

- Provisionnement du profil conseiller, inscription client, catalogue, procédures, suivi des tickets, relevés et refresh tokens sont désormais implémentés.
- Les erreurs de lint initiales sont corrigées.
- La reproduction « cinq réponses météo résolvent une opposition carte » est corrigée dans le simulateur ; l'attente affecte aussi la patience.
- La réparation des arguments de fonction Groq rappelle les intentions admises et ne rejoue pas les outils déjà exécutés. Cela ne corrige pas les autres défauts de contenu et de fraude listés ci-dessus.

## Preuves et ordre de reprise

Les [preuves de validation sélectionnées](docs/validation-2026-10-18/README.md) contiennent les résultats des appels réels, les statuts de tests et la comparaison des réponses avec leurs documents, sans clés ni jetons.

Ordre conseillé : règle de fraude, contrôle factuel des réponses, pile déployée cohérente, quota/reprise, robustesse du juge, automatisation de l'index, puis fonctionnalités et validations manquantes.
