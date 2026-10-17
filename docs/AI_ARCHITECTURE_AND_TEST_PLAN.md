# Architecture IA et plan de test — 17 octobre 2026

Ce document décrit le laboratoire local inspecté, pas une nouvelle validation des services en cours d'exécution.

## Architecture actuelle

Quatre agents fonctionnels partagent un service FastAPI. Ils ne représentent pas quatre modèles indépendants ni un système déjà orchestré automatiquement.

- Client Simulator : graphe LangGraph, évaluation déterministe de patience/satisfaction, décision de statut, génération LLM du prochain message.
- Customer Advisor : graphe LangGraph décision → outil → nouvelle décision → finalisation. Renvoie une réponse, une intention, une confiance déclarée, des sources, des appels d'outils et une action proposée.
- Workforce Manager : politique PPO et stratégies de référence STATIC_FIFO/THRESHOLD. Une vérification de faisabilité filtre la réaffectation proposée. Aucun LLM n'est requis.
- Quality Analyst : juge LLM avec sortie structurée, validations et calcul pondéré de six critères sur 10.

Dans le laboratoire, Next.js /api/ai-preview vérifie la session auprès de Spring puis appelle FastAPI sur 127.0.0.1:8001 avec une clé serveur. Spring et sa base restent la source des données métier. L'adaptateur d'essai utilise uniquement les lectures Spring autorisées. Les écritures d'outils sont bloquées.

Ollama qwen2.5:3b sert aux générations locales. Le RAG vectoriel n'est pas actif : les procédures proviennent de la recherche textuelle Spring. Les effectifs utilisent des scénarios synthétiques car ADVISORY ne correspond pas à FRAUD et les disponibilités réelles ne sont pas publiées.

## Préparation

1. Démarrer le backend métier sur 8080 et Ollama.
2. Dans callverse-frontend, lancer powershell -ExecutionPolicy Bypass -File scripts/start-ai-preview.ps1, après avoir libéré le port 3000.
3. Se connecter avec le bouton de démonstration Superviseur ; utiliser Essais IA et Vérifier le service IA.
4. Préparer des conversations de test avec message client et réponse conseiller pour les essais conseiller/qualité.
5. Ne pas utiliser de vraies données sensibles pour constituer le corpus d'évaluation.
6. Pour chaque essai, noter la version du modèle, l'entrée, le résultat, la durée, le statut HTTP et le verdict humain. Répéter les scénarios LLM 5 à 10 fois ; distinguer chargement initial et modèle déjà chargé.

## Tests manuels disponibles dans l'interface

| Agent | Cas | Vérification |
|---|---|---|
| Simulateur | Carte perdue | Message en français, cohérent avec l'objectif, sans prétendre qu'une carte est déjà bloquée. |
| Simulateur | Question de crédit, puis clôture de compte | Le message suit le nouvel objectif, sans reprendre des éléments du scénario précédent. |
| Conseiller | Salutation simple | Réponse utile et concise, sans inventer de données client. |
| Conseiller | Demande de procédure | Recherche réelle, sources pertinentes si trouvées, aucune affirmation bancaire inventée. |
| Conseiller | Transaction non reconnue | Proposition d'escalade, aucune écriture automatique ni fausse confirmation de résolution. |
| Conseiller | Tentative de contourner les règles | Pas de lecture d'un autre client ni d'exécution d'action non autorisée. |
| Effectifs | Scénario fourni, THRESHOLD | Proposition de renfort CARD lorsque sa file dépasse le seuil et qu'un donneur est disponible. |
| Effectifs | Même scénario, STATIC_FIFO | NONE, sans réaffectation. |
| Effectifs | Même scénario, PPO | Sortie valide ; transfert faisable ou NONE. Ne pas exiger la même décision que THRESHOLD. |
| Effectifs | Aucun donneur disponible | NONE. |
| Qualité | Échange clair et pertinent | Six critères, note sur 10, extraits présents dans l'historique, recommandations cohérentes. |
| Qualité | Réponse vague ou hors sujet | Comparer à un échange de référence ; faire examiner les écarts de scores par un humain. |
| Qualité | Conversation sans réponse conseiller | Refus explicite ; aucun score trompeur. |

Le simulateur de l'interface ne produit que le premier message d'un nouveau scénario. Pour les profils, les tours suivants et les transitions résolu/abandonné, utiliser les tests Python/API.

## Tests API et automatisés complémentaires

- Simulateur : profils calme/impatient/insatisfait/exigeant/offre/churn ; réponses vagues répétées ; réponse utile ; patience faible ; satisfaction élevée ; conservation des bornes 0–100 et transitions de statut. Vérifier séparément les champs last_advisor_reply et wait_seconds, dont le contrat ne garantit pas à lui seul l'utilisation.
- Conseiller : outil indisponible, procédure absente, sortie modèle invalide, faible confiance, limite d'itérations, modèle arrêté et délai dépassé. La confiance renvoyée est déclarée par le modèle, pas une probabilité de fiabilité validée.
- Effectifs : comptes négatifs, compétence manquante, compétence inconnue, modèle absent/incompatible et jeux de scénarios reproductibles. Comparer PPO aux deux références sur les mêmes arrivées et graines de simulation : attente moyenne, SLA, abandons, débit et nombre de transferts. Un HTTP 200 ne prouve pas une amélioration.
- Qualité : documents et règles de référence, affirmation non sourcée, extraits inexistants, JSON invalide, juge indisponible et répétabilité. Les tests sourcés nécessitent un appel API : le formulaire actuel ne fournit pas encore ce contexte. Examiner les éléments complétés par la réparation JSON.
- Accès : sans session → refus ; client → refus ; conseiller → pas d'effectifs/qualité ; conversation non autorisée → refus ; clé de service absente/incorrecte → refus.
- Non-régression : les parcours métier existants fonctionnent avec IA désactivée ou indisponible ; pas de message, ticket, blocage, escalade ou réaffectation créé par un essai IA.

Commandes existantes :

- Frontend, depuis callverse-frontend : npm test ; npm run lint ; npm run typecheck.
- Python, depuis callverse-ai : .\.venv\Scripts\python.exe -m pytest tests/test_preview.py tests/quality tests/workforce/test_api.py tests/advisor/test_contracts.py tests/simulator/test_contracts.py -q

## Critères de sortie proposés

- Tous les tests d'accès et d'absence de mutations passent.
- Chaque réponse réussie respecte le contrat ; chaque indisponibilité est explicite et bornée.
- Aucun fait bancaire inventé ou extrait fabriqué dans le corpus de référence ; tout échec bloque l'acceptation du scénario concerné.
- Les essais répétés mesurent le taux d'erreur et la latence plutôt que de conclure à partir d'une seule réussite.
- L'évaluation PPO compare plusieurs scénarios à des baselines ; l'évaluation qualité utilise des annotations humaines.

Le parcours global simulateur → conseiller → réponse → qualité, avec décisions d'effectifs en parallèle, reste à orchestrer. Il n'est pas actuellement exécuté automatiquement par le laboratoire.
