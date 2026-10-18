# Intégration IA — 18 octobre 2026

Le backend `callverse-backend-ai` combine `origin/main` à `00520e9` (intégration de Fedi)
et nos annuaires et commandes qualité. Le navigateur utilise les routes Spring authentifiées.

La qualité utilise désormais Groq par défaut (`LLM_API_KEY`, modèle `QUALITY_GROQ_MODEL`).
Pour conserver les essais locaux Ollama, définir explicitement `QUALITY_PROVIDER=ollama`
et `QUALITY_MODEL` avec un modèle installé. Sans clé Groq, le fournisseur par défaut ne
peut pas noter les conversations. Le correctif du budget d’outils conseiller est intégré.

Le [guide utilisateur PDF](user-guide/CallVerse-Guide-Decouverte-et-Tests.pdf) décrit les
parcours de découverte et de test. Son exemple qualité provient du fournisseur local Ollama.

## Parcours disponibles

- Conseiller, superviseur et administrateur : choisir un client par son nom dans
  **Enregistrer un contact**, puis la compétence et le motif. Aucun identifiant à saisir.
  Le conseiller prend ensuite le contact dans sa file pour ouvrir la discussion.
- Client : liste de ses propres conversations. Conseiller : liste des conversations
  qui lui sont attribuées. Superviseur/admin : sélection et recherche des échanges autorisés.
- Chat : badge **Assistant IA** sur chaque message `aiGenerated=true`, y compris en direct.
  Les messages IA ne sont jamais présentés au conseiller comme « Vous ».
  Une notice explique la reprise humaine lorsqu'une IA a répondu et qu'aucun humain n'a écrit.
- Superviseur : **Proposition IA**, demande explicite d'une recommandation avec observation
  et limites. Un transfert proposé peut être appliqué après sélection des conseillers éligibles
  et confirmation humaine de leur habilitation. Le backend revérifie la disponibilité et
  refuse les propositions expirées ; aucune affectation n'est modifiée automatiquement.
- Client : inscription depuis la connexion, consultation de ses comptes et mouvements,
  téléchargement d'un relevé CSV et ouverture de sa propre conversation depuis son espace.
  L'inscription crée un accès client ; les comptes et soldes viennent du backend bancaire.
- Suivi : tickets, commentaires visibles par le client et gestes commerciaux dans les espaces
  autorisés. Le client confirme la clôture d'un ticket résolu. Les crédits respectent le plafond
  conseiller ou une validation de supervision, et les nouvelles tentatives identiques restent idempotentes.
- Session : les jetons de renouvellement sont conservés pour la session du navigateur et tournent
  lors du renouvellement. La déconnexion révoque la session côté serveur.
- Superviseur : **Jumeau numérique**, `/supervisor/twin`. Administrateur : onglet du même nom.
  Choisir une journée et une graine, lancer les trois stratégies, comparer SLA, abandons,
  attente moyenne et P95. Les résultats sont réels et persistés, non des fixtures.
  Les graines 7 et 8 sont déjà calculées sur la journée chargée dans la base de développement.
- Dialogue simulé : formulaire distinct dans le jumeau et le pilotage IA existant.
  Les scénarios nommés de dialogue sont conservés ; leur création n'est pas un éditeur de charge.
- Qualité : choisir une conversation résolue par son nom/date dans le pilotage IA,
  consulter la note, l'actualiser ou demander l'analyse si aucune note n'est enregistrée.
  Une absence de résultat reste une absence, jamais une note de zéro par défaut.

## Configuration et lancement

Depuis `callverse-frontend` :

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-ai-connected.ps1 -FrontendPort 3000
```

Frontend : localhost:3000 ; Spring : 8083 ; Python : 8002.
Les clés et logs sont locaux dans `.test-tools`, hors Git. Les ports sont paramétrables.
JDK 21, PostgreSQL configuré et environnement Python équipé sont nécessaires.
Activer `CALLVERSE_DEMODATA_ENABLED=true` avec le profil dev pour les trois journées de démonstration.

- Effectifs et jumeau : modèle PPO local, aucune clé Groq nécessaire.
- Chat autonome et client simulé : modèles Groq, clé LLM et configuration documentaire nécessaires.
- `AI_ADVISOR_MODE=OFF` par défaut. `AUTONOMOUS` autorise les réponses jusqu'au premier message humain.
  Aucun interrupteur de mode n'est exposé dans l'interface.
- Qualité locale avec `QUALITY_PROVIDER=ollama` : Ollama disponible et `QUALITY_MODEL` renseigné. Pour un CPU lent, ajuster ensemble
  `QUALITY_TIMEOUT_SECONDS` (par exemple 240) et `AI_SERVICE_QUALITY_READ_TIMEOUT_SECONDS` (270).
  Les valeurs backend/Python par défaut sont 130/120 secondes.

## Comportements importants

- Les trois stratégies sont lancées séquentiellement avec la même graine.
  Un 409 signifie « Déjà calculé » ; un 503 conserve les autres résultats et permet de réessayer.
- Les tableaux moyennent les résultats terminés par stratégie, une fois par graine.
  Un avertissement apparaît si les ensembles de graines diffèrent.
- Le SLA est calculé sur toutes les arrivées. Afficher aussi les abandons : PPO peut améliorer
  le SLA tout en dégradant cet indicateur.
- La qualité reçoit maintenant les articles cités par l'IA et les procédures bancaires.
  Les évaluations sans scores/preuves complets sont rejetées. Les corrections locales de
  typographie et d'index de citations uniques restent compatibles avec ce contrôle strict.
- Les dialogues et les calculs du centre restent distincts ; les calculs du jumeau ne
  prennent pas les places de la liste des vingt derniers dialogues.

## Validation

544 tests backend, 143 tests Python (un test LLM réel désélectionné), 61 tests frontend.
TypeScript et build de production réussis. OpenAPI et client TypeScript régénérés.
Chrome : six calculs réels (3 stratégies × graines 7/8), doublons 409, erreur 503 contrôlée
et reprise, administrateur, refus des rôles non autorisés, écran mobile sans débordement.
Listes clients vérifiées dans les trois espaces ; note qualité existante 7,75/10 consultable.
Ces vérifications ne constituent pas une validation humaine de la justesse des notes ni
une démonstration Groq réelle. Aucun secret n'est ajouté au dépôt.
