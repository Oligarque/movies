# Movies

Application web de classement personnel de films.

Le projet permet de:
- rechercher un film via TMDb,
- l'ajouter a une liste classee,
- modifier des metadonnees (rang, date de visionnage, critique),
- reorganiser la liste par glisser-deposer,
- naviguer efficacement sur de grosses listes (virtualisation).

## Stack technique

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- Base de donnees: Prisma (SQLite en local, PostgreSQL recommande en production)
- DnD: dnd-kit
- Virtualisation: @tanstack/react-virtual

## Lancer le projet en local

### 1) Backend

Depuis la racine:

```bash
npm --prefix app/server install
npm --prefix app/server run dev
```

API backend par defaut: `http://localhost:4000`

### 2) Frontend

Dans un autre terminal:

```bash
npm --prefix app/client install
npm --prefix app/client run dev
```

Frontend par defaut: `http://localhost:5173`

## Variables d'environnement importantes

Backend (`app/server/.env`):
- `DATABASE_URL`
- `TMDB_API_KEY`
- `PORT` (optionnel)

Frontend (`app/client/.env.local`):
- variables Vite eventuelles (`VITE_*`)

## Structure des dossiers

### `app/`
Code applicatif.

- `app/client/`: application frontend (UI)
- `app/server/`: API backend, Prisma, scripts de maintenance/perf

### `docs/`
Documentation fonctionnelle et technique du projet (ex: fiche de deploiement VPS).

### `design-artifacts/`
Artefacts de conception (brief, scenarios UX, PRD, etc.).

### `_bmad/`
Framework/ressources BMAD utilises pour la gestion de workflows, agents, skills et methodologie.

- `_bmad/_config/`: configuration BMAD
- `_bmad/bmm/`, `_bmad/core/`, `_bmad/tea/`, `_bmad/wds/`, etc.: modules et workflows

### `_bmad-output/`
Sorties generees par les workflows BMAD (planning, implementation, tests). Ce dossier est considere comme artefact genere.

### `.github/`
Configuration GitHub et skills agents utilises dans ce repository.

## Notes Git

- Le repo ignore deja les secrets et fichiers sensibles via `.gitignore`.
- Les artefacts generes BMAD (`_bmad-output/`) peuvent etre ignores sans impacter le code applicatif.
- Pour un repo public "leger", on peut aussi envisager d'externaliser une partie de `_bmad/` si vous n'utilisez pas BMAD en continu.

## Build

Frontend:

```bash
npm --prefix app/client run build
```

Backend:

```bash
npm --prefix app/server run build
```
