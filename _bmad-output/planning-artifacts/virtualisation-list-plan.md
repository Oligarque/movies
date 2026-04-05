---
title: Plan de chantier - Virtualisation de la liste films
project: movies
author: GitHub Copilot
date: 2026-04-05
status: Draft
---

# 1. Objectif

Passer la liste films vers une virtualisation réelle pour maintenir une fluidite stable avec 1000+ elements, tout en conservant:
- drag-and-drop,
- ouverture overlay,
- focus/scroll sur doublon,
- experience mobile tactile.

# 2. Contexte actuel

Etat actuel:
- rendu progressif par batch (amelioration deja en place),
- drag-and-drop avec dnd-kit,
- liste potentiellement tres longue,
- lag encore perceptible sur gros dataset.

Limite actuelle:
- meme avec batching, le DOM peut devenir lourd apres usage prolonge (scroll profond + interactions).

# 3. Portee du chantier

Dans le scope:
- virtualiser la liste principale (vue classee),
- conserver la logique de tri/reorder,
- conserver les feedbacks UX (highlight insertion/doublon),
- garder un comportement usable mobile.

Hors scope (phase 1):
- virtualiser la grille des resultats TMDb,
- refonte visuelle globale,
- optimisation backend supplementaire.

# 4. Strategie technique

Decision proposee:
- Utiliser @tanstack/react-virtual pour la fenetre de rendu.

Pourquoi:
- API souple,
- bonne compatibilite avec React moderne,
- maitrise fine du scroll container et overscan,
- mieux adapte qu un patch DOM maison pour les gros volumes.

Choix de simplification cle:
- fixer une hauteur de ligne cible en phase 1 (ou quasi fixe) pour reduire la complexite du calcul de positions.

# 5. Risques principaux

1. Couplage virtualisation + dnd-kit:
- Les items hors viewport ne sont pas montes.
- Risque de drop incoherent si integration naive.

2. Focus programmatique:
- Les actions scroll-to-item (doublon, ajout) doivent d abord forcer le virtualizer a monter la ligne cible.

3. UX mobile:
- Le drag tactile est plus sensible aux conflits scroll/gesture.

4. Accessibilite:
- Navigation clavier + annonces de reorder a revalider.

# 6. Plan par phases

## Phase 0 - Baseline et garde-fous

Objectif:
- Capturer une baseline perf avant refonte.

Actions:
- figer dataset 1000,
- mesurer temps de rendu initial + interaction recherche + drag,
- definir seuils cibles (voir section 8).

Sortie attendue:
- mini rapport baseline dans artefact planning.

## Phase 1 - Extraction composant liste

Objectif:
- isoler la liste dans un composant dedie pour limiter la surface de changement.

Actions:
- extraire la zone listSection vers composant ListViewport,
- conserver comportement fonctionnel identique sans virtualisation d abord,
- brancher API callbacks existants (open overlay, reorder persist, highlight/focus).

Sortie attendue:
- refactor neutre, sans regression fonctionnelle.

## Phase 2 - Virtualisation read-only

Objectif:
- activer la virtualisation en mode lecture seule.

Actions:
- integrer @tanstack/react-virtual,
- rendre uniquement la fenetre visible + overscan,
- verifier scroll, recherche, ouverture overlay.

Sortie attendue:
- gain perf visible en scroll et rendu initial.

## Phase 3 - Reorder avec virtualisation

Objectif:
- reintroduire drag-and-drop sans casser la virtualisation.

Actions:
- adapter dnd-kit au viewport virtualise,
- stabiliser drop target visuals,
- valider persistance reorder backend,
- valider mobile touch (appui long + drag).

Sortie attendue:
- reorder fonctionnel desktop + mobile, sans jitter majeur.

## Phase 4 - Focus/Highlight robustes

Objectif:
- garantir les flows UX critiques dependants du scroll.

Actions:
- fonction utilitaire scrollToMovieId qui:
  - calcule index,
  - demande au virtualizer de scroller,
  - attend montage,
  - applique focus + highlight.
- verifier scenario doublon + ajout.

Sortie attendue:
- comportement identique a aujourd hui du point de vue utilisateur.

## Phase 5 - Stabilisation

Objectif:
- fermer les regressions et finaliser.

Actions:
- tests manuels desktop/mobile,
- controle accessibilite de base,
- ajuster overscan/hauteur item,
- documenter fallback.

Sortie attendue:
- decision Go/No-Go.

# 7. Plan de rollback

Rollback simple:
- garder un feature flag local (constante) pour basculer entre:
  - mode virtualise,
  - mode liste actuelle.

Implementation actuelle:
- Frontend flag: `VITE_ENABLE_VIRTUALIZED_LIST`
  - valeur par defaut: active (true)
  - pour rollback rapide: definir `VITE_ENABLE_VIRTUALIZED_LIST=false`
- Frontend seuil: `VITE_VIRTUALIZATION_THRESHOLD`
  - valeur par defaut: `300`
  - la virtualisation s active automatiquement seulement si la taille de liste depasse ce seuil.

En cas de regression critique:
- repasser en mode non virtualise,
- conserver les autres optimisations deja faites.

# 8. Criteres d acceptation chantier

Fonctionnel:
1. Recherche locale fonctionne a 1000 films.
2. Ouverture overlay inchangee.
3. Reorder persiste correctement.
4. Doublon scroll/focus/highlight fonctionne.

Performance:
1. Scroll percu fluide sur desktop moderne.
2. Lag notable reduit sur mobile moyen de gamme.
3. Rendu initial significativement meilleur qu avant chantier.

Qualite:
1. Aucune regression build front/back.
2. Aucune regression API reorder.

# 9. Sequencement propose (implementation)

Ordre recommande:
1. Phase 1
2. Phase 2
3. Phase 4 (partiel)
4. Phase 3
5. Phase 4 (final)
6. Phase 5

Raison:
- separer d abord les risques structurels (virtualizer),
- puis traiter le point le plus sensible (DnD),
- finir par stabilisation complete.

# 10. Estimation qualitative

Complexite:
- moyenne a elevee (principalement a cause de virtualisation + dnd-kit).

Charge attendue:
- 1 a 2 sessions d implementation + 1 session de stabilisation.

