# Visites guidées CallVerse

Les espaces client, conseiller, superviseur et administrateur disposent d'une
visite guidée, ainsi que leurs trois écrans IA. Elle démarre automatiquement
650 ms après l'affichage d'un espace authentifié et vérifié par `SessionGuard`.
Les pages publiques et la connexion ne sont pas interrompues par une visite.

## Utilisation

Le fond est assombri et le repère est éclairé par un masque SVG. La bulle explique
les commandes et propose **Suivant**, **Précédent**, **Passer la visite**, une
croix de fermeture et **Terminer**. **Guide** dans l'en-tête relance la visite
de la page ; sur mobile, il est représenté par un point d'interrogation.

Chaque compte, chaque rôle et chaque page ont un enregistrement distinct dans
le stockage local du navigateur :

`callverse:tour:v1:<identité>:<rôle>:<espace>`

La version 1 ne possède aucun enregistrement antérieur : les comptes déjà
existants découvrent donc le tutoriel à leur prochaine visite, comme les nouveaux
comptes. Terminer, passer ou fermer mémorise `seen`. Une reconnexion ou un
rechargement ne le relance pas automatiquement, mais le bouton Guide reste actif.
Un autre navigateur ou appareil présente de nouveau la visite. Aucun mot de passe,
JWT ou contenu bancaire n'est enregistré par ce mécanisme. Si le stockage est
indisponible, un repli mémoire évite les répétitions pendant la session de page.

## Comportement et accessibilité

- Le tutoriel ne clique sur aucune commande métier, ne soumet aucun formulaire,
  ne change pas d'onglet et ne lance aucun appel IA. Les saisies en cours sont conservées.
- L'application est `inert` pendant la visite ; la bulle est rendue dans un
  portail séparé, avec `role=dialog`, `aria-modal` et des noms accessibles.
- Tab et Maj+Tab restent dans la bulle. Échap ferme la visite. Les flèches
  gauche/droite changent d'étape. Le focus et le défilement précédents sont restaurés.
- Le repère et la bulle suivent les redimensionnements, le défilement et les
  changements de contenu. Un repère absent donne une bulle centrale explicite,
  sans bloquer les étapes suivantes.
- Sur mobile, le menu replié est expliqué via son bouton visible. Dans les onglets
  admin non ouverts, le guide éclaire leur bouton plutôt que de changer l'onglet.
- Les animations respectent `prefers-reduced-motion`. La bulle reste dans la
  fenêtre et peut défiler sur un écran peu haut.

## Maintenance

- Contenu, périmètres, version et placement : `src/lib/guided-tour.ts`.
- Déclenchement, masque, focus, suivi des repères : `src/components/GuidedTour.tsx`.
- Apparence : `src/app/styles/guided-tour.css`.
- Les repères stables utilisent `data-tour` dans les composants concernés.

Ajouter le contenu d'une nouvelle page dans `tourForPath`. Les alternatives de
sélecteur sont des sélecteurs simples séparés par une virgule, classés par priorité.
Augmenter `TOUR_VERSION` pour présenter de nouveau une version révisée à tous les
comptes sans modifier leurs données de connexion.

## Vérifications

- 54 tests frontend réussis : dont cinq tests du périmètre des guides, de l'isolation
  par compte/rôle/page, du stockage bloqué et du placement dans la fenêtre.
- TypeScript, ESLint et compilation de production réussis.
- Chrome réel, comptes de démonstration : les sept pages en 1440 et 390 px,
  soit quatorze visites et 130 étapes. Aucun repère manquant en fonctionnement
  normal, aucun débordement horizontal et aucune erreur JavaScript.
- Navigation précédent/suivant, confinement du focus, Échap, restauration du
  focus, mémorisation après rechargement et relance manuelle vérifiés.
- Repère masqué pendant une visite client : repli explicite puis récupération.
- Les requêtes ont été observées : aucune écriture métier pendant les visites.
