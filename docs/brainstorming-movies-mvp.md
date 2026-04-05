# Brainstorming - Application films (MVP)

Date: 2026-04-05

## Vision produit
Application web React personnelle pour lister les films vus, les classer par ordre de preference, et ajuster ce classement facilement via drag and drop.

## Objectif principal
Le coeur du produit est le classement des films.

## Perimetre MVP valide
- Ajout d'un film depuis TMDb (affiche, titre, informations principales).
- Classement des films par ordre de preference.
- Drag and drop pour reordonner la liste.
- Date de dernier visionnage par film.
- Avis personnel par film.
- Interface responsive et utilisable sur mobile.

## Donnees stockees
Depuis TMDb:
- URL de l'affiche.
- Titre.
- Date de sortie.
- Realisateur.
- Synopsis.

Donnees utilisateur:
- Rang.
- Date de dernier visionnage.
- Avis ecrit.

## Recherche validee
- Recherche par titre de film.
- Recherche par nom de realisateur.

## Hors perimetre (explicitement exclu)
- Tags.
- Filtres complexes.
- Recherche avancee multi-criteres.
- Statistiques.
- Fonctions sociales/partage.

## Decisions UX clés
- Usage quotidien et rapide prioritaire.
- Ajout de film en parcours court (few taps/clicks).
- Une fois ajoute, le film est visible immediatement dans la liste.
- Scroll automatique vers le film recemment ajoute.
- Possibilite d'ajuster ensuite via drag and drop.
- Vue liste: afficher le rang de chaque film.
- Ne pas afficher directement synopsis, avis et date de dernier visionnage dans la liste.
- Afficher ces informations dans une vue detail dediee superposee (drawer/modal), fermable rapidement.

## Regle anti-doublon (validee)
- Lors d'une recherche TMDb, si le film existe deja dans la liste, l'application n'ajoute pas de doublon.
- Dans ce cas, le flux remplace l'ajout:
	- scroll automatique vers le film deja present,
	- surbrillance du film pendant 2 secondes,
	- proposition de mise a jour rapide (date de dernier visionnage) via la vue detail superposee.
- Le changement de rang se fait ensuite depuis la liste (drag and drop).

### Strategie technique anti-doublon
- Hypothese projet: tous les films ajoutes proviennent de TMDb.
- Cle anti-doublon unique: tmdbId (comparaison exacte).
- En base de donnees: contrainte unique sur tmdbId.
- Comportement API/UI en cas de doublon detecte:
  - retour d'un statut "already_exists" avec l'identifiant local du film,
  - le front declenche scroll + surbrillance 2 secondes,
  - ouverture optionnelle de la vue detail pour mise a jour de la date de dernier visionnage.

## Strategie de classement a l'ajout
- Le rang est obligatoire lors de l'ajout.
- Le rang est choisi via une liste de rang "a rouler" (picker).
- Valeurs possibles: de 1 a N+1 (N = nombre de films avant ajout).
- Rang par defaut: position milieu.

Formule retenue (avec N avant ajout):
- defaultRank = floor((N + 2) / 2)

Exemples:
- N = 0 -> rang 1
- N = 1 -> rang 1
- N = 2 -> rang 2
- N = 4 -> rang 3

## Ecrans minimum
1. Liste principale:
- Classement complet.
- Rang visible pour chaque film.
- Reorganisation drag and drop.
- Recherche locale (titre/realisateur).

2. Ajout de film:
- Recherche TMDb.
- Selection d'un resultat.
- Saisie date dernier visionnage + avis.
- Choix du rang obligatoire (picker).

3. Vue detail film:
- Affiche, titre, realisateur, date de sortie, synopsis.
- Date dernier visionnage.
- Avis personnel.
- Position actuelle dans le classement.
- Ouverture depuis la liste.
- Format retenu: vue superposee (drawer/modal), pas de page dediee pour le MVP.
- Fermeture simple et rapide (bouton fermer, clic exterieur, touche Echap sur desktop).

## Contraintes mobile
- Composants tactiles confortables (surtout picker et drag handles).
- Navigation simple, sans surcharge.
- Reordonnancement uniquement en drag and drop (pas de boutons Monter/Descendre).
- Interaction attendue:
	- desktop: drag and drop a la souris,
	- mobile: drag and drop au doigt.

## Point de conception a garder
Le produit ne doit pas chercher la richesse fonctionnelle maximale; il doit optimiser la rapidite d'ajout, la clarte du classement, et la facilite de reajustement.

## Finalisation brainstorming (statut)
Decision prise: MVP simple valide et scope verrouille.

Micro-messages UX finaux:
- Aucun resultat TMDb: "Aucun film trouve. Essaie un autre titre."
- Erreur reseau TMDb: "Impossible de contacter TMDb pour le moment. Reessaie dans quelques instants."
- Film deja present: "Ce film est deja dans ta liste. On t'y amene."
- Ajout reussi: "Film ajoute a ta liste."

Definition de termine (brainstorming):
- Toutes les regles ci-dessus sont validees.
- Un choix de stack et d'architecture est formalise.
- Le plan d'implementation est decoupe en taches techniques.
