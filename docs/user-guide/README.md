# Guide de d?couverte et de test

[Ouvrir le guide PDF](CallVerse-Guide-Decouverte-et-Tests.pdf)

Guide en fran?ais : objectif de CallVerse, connexion par r?le, d?marches de test, r?sultats attendus et d?pannage. Captures et ?tat de l?environnement examin?s le 18 octobre 2026.

La version backend int?gr?e utilise d?sormais Groq par d?faut pour la qualit? (`LLM_API_KEY` n?cessaire). Pour reproduire le test local avec Ollama pr?sent? dans le guide, d?finir explicitement `QUALITY_PROVIDER=ollama` et `QUALITY_MODEL` sur un mod?le install?. Les d?lais d?pendent du fournisseur et de la machine.
