# Laboratoire IA local — 13 octobre 2026

## Périmètre

Essai sur la branche frontend integration/ai-preview et integration/ai-local dans le dossier voisin callverse-ai, issu de origin/integration/ai-service-ines au commit 134112d. Chaima_Branch est ignorée. Le backend métier reste sur main, commit 0df8831, sans changement d'API ni migration.

Le proxy expérimental Next.js /api/ai-preview est temporaire : ce n'est pas une façade Spring publiée. Il vérifie le JWT auprès de /auth/me, les rôles et l'accès à la conversation auprès du backend existant. Aucun JWT n'est envoyé à Ollama : il sert uniquement aux lectures Spring effectuées par l'adaptateur local.

Le service Python écoute uniquement sur 127.0.0.1:8001 et exige une clé partagée côté serveur. Les outils d'écriture du conseiller sont refusés ; les réponses ne sont pas envoyées automatiquement dans les conversations.

## Essayer

1. Garder le backend existant sur le port 8080 et Ollama démarrés.
2. Dans callverse-ai, créer .venv si nécessaire puis installer requirements-preview.txt avec son Python. L'environnement testé est Python 3.14 sous Windows.
3. Arrêter le serveur frontend qui occupe le port 3000.
4. Depuis callverse-frontend, lancer : powershell -ExecutionPolicy Bypass -File scripts/start-ai-preview.ps1
5. Se connecter comme conseiller ou superviseur sur http://localhost:3000, puis utiliser **Essais IA**.

Accès directs après connexion : /advisor/ai et /supervisor/ai. Le lancement utilise les modèles déjà installés qwen2.5:3b. Aucun service Groq n'est nécessaire dans ce mode.

Le script conserve la clé locale dans .test-tools/ai-preview-key.txt, hors des dépôts. Ne pas publier ce fichier. Sans AI_PREVIEW_KEY côté serveur Next, le proxy refuse les essais avec HTTP 503. Un lancement frontend normal conserve les parcours habituels ; il n'active pas automatiquement l'IA.

## Fonctions

| Fonction | Entrée et effet |
|---|---|
| Suggestion conseiller | UUID d'une conversation accessible ; historique et contexte lus sur Spring, réponse proposée à l'écran uniquement. |
| Qualité | UUID d'une conversation avec au moins deux messages dont un conseiller ; analyse Ollama sans stockage de l'évaluation. |
| Simulateur | Objectif saisi ; génère le premier message d'un client fictif sans créer de conversation en base. |
| Effectifs | Scénario JSON synthétique ; THRESHOLD, STATIC_FIFO ou PPO, proposition sans réaffectation. |

## Écarts et limites constatés

- Python appelle normalement /api/v1/internal/..., absent de Spring main. app.preview remplace uniquement dans le processus d'essai les outils de lecture par les routes publiques autorisées.
- Le risque de départ et le nombre de tickets ouverts ne sont pas exposés par Spring. Ils restent inconnus (null). Le segment client ne constitue pas un type de contrat : le contexte l'indique comme non renseigné, sans inventer de correspondance.
- Le laboratoire réutilise la recherche textuelle réelle des procédures Spring. Ce n'est pas le RAG vectoriel pgvector : les scores de sources sont à 0, explicitement indiqués dans l'interface.
- Le modèle d'effectifs utilise ACCOUNT/CARD/CREDIT/ADVISORY, contre ACCOUNTS/CARDS/CREDIT/FRAUD dans Spring. Aucune traduction ADVISORY vers FRAUD n'est faite ; les scénarios restent synthétiques. La présence du fichier PPO ne prouve pas qu'il peut être chargé.
- La qualité ne reçoit pas encore de corpus de règles ou de documents sourcés. Un score généré ne valide pas la conformité bancaire ; le module amont contient également une réparation de JSON qui peut compléter des éléments manquants.
- Le contrat qualité utilisait advisor_response.answer alors que le conseiller retourne reply : corrigé dans la branche d'essai.
- Les premiers essais ont rencontré des délais sur le conseiller et le chargement PPO. Après installation des dépendances et chargement des modèles, des appels réels ont obtenu HTTP 200 pour le conseiller, PPO, la simulation, la qualité, THRESHOLD et STATIC_FIFO. Le chargement initial peut rester lent ; une réponse réussie ne prouve ni la qualité des conseils ni leur fiabilité dans tous les scénarios.
- Le dernier parcours via le proxy a confirmé PPO mais le conseiller a encore renvoyé 503. La suggestion reste intermittente avec le petit modèle local : elle est disponible pour essais manuels, pas activée dans le chat principal. Les quatre indicateurs AI_FEATURES de l'intégration permanente restent à false.
- Le délai HTTP est borné ; une tâche Python synchrone déjà lancée peut néanmoins continuer après un timeout. Ce service est destiné aux essais locaux, pas à un hébergement public.

## Vérifications

- 46 tests frontend : intégration existante, proxy désactivé, authentification, rôles, refus d'accès conversation et routage fixe vers l'IA.
- 46 tests Python sélectionnés : protections du laboratoire, qualité, API effectifs et contrats conseiller/simulateur.
- Laboratoire vérifié dans Chrome en largeur 1440 et 390.
- Actions conseiller existantes vérifiées avec écritures interceptées : messages, chat, tickets, blocage, résolution, escalade, abandon et accueil.
- Connexion et navigation des quatre rôles vérifiées en largeur 1440 et 390 ; lint, TypeScript et compilation de production réussis.

Il reste à stabiliser le conseiller/PPO localement, puis à convenir des contrats Spring vers IA, du RAG, des données d'effectifs réelles et de l'approbation des actions avant une intégration permanente.
