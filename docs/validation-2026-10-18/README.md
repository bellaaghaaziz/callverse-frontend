# Preuves du bilan final — 18 octobre 2026

Le [bilan du projet](../../ETAT_DU_PROJET.md) distingue les défauts reproduits, les capacités absentes et les points non validés. Ces fichiers sont une sélection des résultats de la campagne locale avec données synthétiques. Aucun enregistrement vidéo n'est inclus.

| Fichier | Ce qu'il établit |
| --- | --- |
| [summary.json](summary.json) | 889 tests automatisés réussis, résultats navigateur et limites des appels IA. Le contrôle automatique de présence de source est à lire avec la revue factuelle ci-dessous. |
| [ai-semantic-results.json](ai-semantic-results.json) | Vrais appels Groq : nombre de comptes correct, réponse documentaire avec source et fraude retournant `NONE` malgré le ticket créé. |
| [ai-grounding-review.json](ai-grounding-review.json) | Comparaison de la réponse avec les articles publiés : plusieurs détails ne sont pas établis par la source. La réussite du contrôle automatique de présence de source ne valide donc pas le contenu. |
| [quality-recheck-results.json](quality-recheck-results.json) | Évaluation simple réellement enregistrée : 6,4/10 et six critères. |
| [quality-grounding-results.json](quality-grounding-results.json) | Une évaluation réelle plus complexe échoue avec HTTP 502 et sortie invalide. |
| [ai-simulator-regressions.json](ai-simulator-regressions.json) | Les quatre reproductions ciblées des anciens défauts du simulateur passent ; ces vérifications substituent explicitement les réponses du fournisseur. |

Le backend a ensuite passé le contrôle préalable au push `mvnw clean install` : **581 tests, 0 échec, 0 erreur**, `BUILD SUCCESS`, terminé le 18 octobre à 20:20 Europe/Paris. Cette étape valide aussi l'empaquetage, sans relancer tous les appels externes ni effacer leurs échecs enregistrés.

Les versions de code correspondantes sont le frontend `eff50dd` et le backend/IA `81a4d7c`. La base locale isolée utilise les ports 3101/8183/8102 ; la pile principale 3000/8083 a été contrôlée séparément et présentait un contrat backend ancien au moment du test.
