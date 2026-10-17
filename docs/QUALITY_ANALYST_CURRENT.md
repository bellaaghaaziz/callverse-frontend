# Tester le Quality Analyst — interface Pilotage IA, 17 octobre 2026

La page actuelle /supervisor/ai utilise Spring ; elle ne correspond plus au laboratoire « Essais IA » décrit dans les anciens documents.

Le backend callverse-backend/main ne possède pas ces endpoints. Le backend compatible se trouve dans callverse-backend-ai, branche integration/ai-frontend. Configuration locale actuelle : Spring sur 8083, Python app.spring_local sur 8002, Ollama sur 11434, frontend sur 3000. WordPress reste sur 8080.

## Parcours

1. Se connecter comme Superviseur et ouvrir Pilotage IA. Si la visite guidée masque les boutons, utiliser Échap ou « Passer la visite ».
2. Dans « Conversations résolues », rechercher un client ou parcourir les cartes, puis cliquer sur l'échange à analyser. Aucun UUID n'est à saisir.
3. Si aucun résultat n'existe, cliquer « Lancer l’analyse qualité ». La page attend le résultat automatiquement, pendant au maximum trois minutes.
4. Si une évaluation existe déjà, elle est affichée sans nouvelle génération ni duplication. « Actualiser l’évaluation » relit seulement le résultat enregistré.

Pour une conversation en cours : son conseiller doit d'abord la résoudre. Cela déclenche aussi l'analyse automatiquement. L'ancien conseil « ne pas résoudre » concernait le laboratoire temporaire et ne s'applique pas à cette version.

Les accès par liste pour tous les rôles sont décrits dans CONVERSATION_ACCESS.md. Les anciens guides demandant de copier un UUID ne correspondent plus au parcours utilisateur actuel.

## Corrections

- Démarrage du bon backend, afin d'exposer /simulation-runs et les routes qualité.
- Nouveau POST /api/v1/supervision/conversations/{conversationId}/quality pour demander ou relancer une analyse absente, limité aux rôles supervision/admin.
- Validation de l'existence, de l'état RESOLVED et du contenu minimal avant mise en file asynchrone. Les analyses en cours et déjà enregistrées restent protégées contre les doublons par les mécanismes existants.
- Délai Spring qualité configurable : ai.service.quality-read-timeout-seconds, défaut 30, local 150 ; délai Python local 120 secondes.
- Authentification du serveur Python local par X-AI-Key. Aucune clé n'est exposée au navigateur.

L'analyse enregistre une évaluation qualité ; elle ne change pas les messages, le statut, les cartes ou les tickets. La conformité bancaire reste à valider avec des règles et documents de référence. Ce correctif qualité ne constitue pas une validation de tous les agents ou des simulations complètes.

## Vérification réelle effectuée

Le 17 octobre : liste des simulations HTTP 200, demande qualité HTTP 202, réponse Ollama/Python HTTP 200, évaluation persistée et score affiché dans Chrome pour la conversation de démonstration d0a87b79-4eff-4acd-8b58-d0f561e26ca1. Seule une évaluation a été ajoutée ; les messages et l'état résolu ont été conservés.

Le premier chargement Ollama a échoué ; après chargement du modèle, la relance a réussi. Ce démarrage local peut nécessiter une relance. Dix tests Java ciblés ont réussi avec l'agent Mockito préchargé et une JVM bornée ; lint et TypeScript passent également. La visite guidée a été fermée avant les clics du test navigateur.
