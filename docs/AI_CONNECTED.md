# Intégration IA au frontend — 17 octobre 2026

Le frontend de `integration/ai-connected` utilise Spring, pas FastAPI directement.
Le backend correspondant est dans `callverse-backend-ai`, branche
`integration/ai-frontend`, construite sur `origin/integration/backend-fedi` au
commit `b54dde3`. Les routes ajoutées pour le frontend ne sont pas dans ce commit
amont : démarrer ce checkout, plutôt que le backend `main`.

## Parcours disponibles

- Superviseur : carte de recommandation d'effectifs dans la vue d'ensemble et
  bouton **Pilotage IA**. Administrateur : **Pilotage IA** vers `/admin/ai`.
- Effectifs : appel explicite de `POST /supervision/workforce/recommendations`,
  observation live affichée, erreurs 503 visibles et aucune réaffectation.
- Simulation : choix des références existantes, création d'un scénario nommé,
  paramétrage du client, lancement asynchrone, suivi et transcription isolés.
  Les vingt runs les plus récents sont retrouvés après rechargement. Le suivi
  s'arrête à l'état terminal, lors du changement de sélection ou au démontage ;
  une erreur suspend le suivi jusqu'à une reprise manuelle.
- Qualité : lecture des évaluations persistées d'une conversation live résolue,
  depuis son panneau superviseur ou par référence. Une liste vide indique
  l'absence d'évaluation, pas un score nul. Actualisation manuelle pendant le
  traitement asynchrone. Aucun nouvel appel de notation n'est déclenché par la lecture.
- Conseiller : la réponse IA envoyée par Spring arrive dans le transcript par
  STOMP existant. L'ancien emplacement de suggestion non connecté est remplacé
  par une information sur ce comportement. Le laboratoire local séparé reste
  accessible au conseiller et nécessite son propre lancement/configuration.

## Lancement local

Depuis `callverse-frontend` :

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-ai-connected.ps1
```

Ouvrir **http://localhost:3100/login**. Backend : 8083 ; Python : 8002.
Le script démarre les trois services, charge les `.env` locaux existants, génère
une clé locale hors Git et autorise les deux origines locales du frontend.
Les ports sont paramétrables. Il refuse un port occupé et ne stoppe à la fermeture
que les processus créés par ce lancement. Les logs et clés restent dans
`.test-tools/`, hors des dépôts. La compilation dev utilise `.next-ai-connected`
pour conserver le serveur existant sur 3000.

Prérequis : JDK 21 et configuration PostgreSQL/JWT du backend ; environnement
Python `ai-service/.venv` avec `requirements.txt`, ou environnement voisin déjà
équipé. Le script privilégie le premier. Configurer les modèles et clés Groq,
la connexion pgvector et l'ingestion documentaire, ainsi que le modèle Ollama
qualité. L'interface peut afficher une indisponibilité si ces services ne répondent pas.
Le modèle d'effectifs peut nécessiter un premier chargement ; une tentative
initiale peut expirer avant que le modèle soit prêt.

## Compléments API

Toutes les routes ci-dessous sont réservées SUPERVISOR/ADMIN dans les chaînes
de sécurité et dans le contrôleur ; elles sont documentées dans OpenAPI.

| Méthode | Route relative à `/api/v1` | Usage |
|---|---|---|
| GET | `/simulation-runs/options` | Références scénario/stratégie existantes |
| POST | `/simulation-runs/scenarios` | Créer un scénario de dialogue nommé |
| GET | `/simulation-runs` | Vingt derniers runs |
| GET | `/simulation-runs/{runId}/messages` | Messages sans sources ni tool_calls |
| GET | `/supervision/conversations/{id}/quality` | Scores persistés sans traces privées |

La création de scénario définit une référence minimale pour un dialogue, pas
une campagne de charge. La stratégie et la graine identifient le run ; ce flux
ne mesure pas les gains de Workforce et ne garantit pas la reproductibilité
des sorties LLM. Les conversations simulées ne sont ni ouvertes via les routes
live ni abonnées à leurs topics. L'évaluation qualité automatique existante
concerne le live ; aucun dashboard de qualité des simulations n'est annoncé.

## Vérifications

- 49 tests frontend, TypeScript, ESLint et compilation de production.
- 67 tests Python ciblés (Advisor, contrats, qualité, API Workforce et authentification).
- Tests PostgreSQL/Testcontainers des nouveaux reads, création de scénario,
  droits, données absentes, isolation live/simulation et non-exposition des traces.
- Contrat OpenAPI régénéré, client TypeScript régénéré et règles ArchUnit.
  Dernier passage backend : 13 tests, tous réussis (trois tests PostgreSQL du
  workspace, trois tests de contrat et sept règles d'architecture).
- Chrome 1440 et 390 : erreurs Workforce/combinaison déjà utilisée, création de
  scénario, lancement, suivi jusqu'au terminal, arrêt du polling, transcription,
  qualité absente puis disponible. Les écritures sont interceptées dans ces tests.
- Lecture réelle des options/runs et appel Spring → Python PPO réussis.

Ces tests ne remplacent pas une campagne de dialogues avec de vrais LLM ni une
validation des scores qualité. Vérifier la configuration documentaire et modèles
avant la démonstration.
