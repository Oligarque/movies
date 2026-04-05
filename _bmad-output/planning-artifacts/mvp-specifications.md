---
title: Movies App MVP Specifications
project: movies
author: GitHub Copilot
date: 2026-04-05
status: Draft-Approved for Implementation Planning
source: Brainstorming decisions validated with user
---

# 1. Product Scope

## 1.1 Product Vision
A personal React web application to maintain a ranked list of watched movies, with fast add flow and easy reordering.

## 1.2 Core Value
The primary value is ranking movies by personal preference and quickly adjusting their order.

## 1.3 MVP In Scope
- Add movies from TMDb search results.
- Persist and display ranked movie list.
- Support a personal library target size up to 1000 movies.
- Reorder with drag and drop only:
  - Desktop: mouse drag and drop.
  - Mobile: touch drag and drop.
- Store and edit personal metadata:
  - Last watched date.
  - Written review.
- Responsive UI for daily usage on desktop and mobile.

## 1.4 Out of Scope
- Tags.
- Complex filters and advanced search.
- Statistics and analytics.
- Social features and sharing.
- Dedicated detail page route (MVP uses overlay detail view only).

# 2. Data Requirements

## 2.1 TMDb-Sourced Fields
- tmdbId (required, unique)
- title
- posterUrl
- releaseDate
- directorName
- synopsis

## 2.2 User-Sourced Fields
- rank (required)
- lastWatchedAt
- reviewText

## 2.3 Suggested Movie Entity
- id (local UUID or DB integer)
- tmdbId (unique)
- title
- posterUrl
- releaseDate
- directorName
- synopsis
- rank
- lastWatchedAt (nullable)
- reviewText (nullable)
- createdAt
- updatedAt

## 2.4 Storage and Persistence Strategy (Target: 1000 Movies)
- Recommended stack: SQLite + Prisma for MVP persistence.
- Store movie metadata in database rows (do not store poster binary blobs).
- Persist only poster URL/path from TMDb and let browser handle image caching.
- Required constraints and indexes:
  - UNIQUE index on tmdbId.
  - Index on rank for fast ordered reads.
  - Optional index on title and directorName for local search performance.
- Reorder writes should run in a transaction to keep ranks consistent.
- Rank model:
  - rank is integer and required.
  - rank values remain contiguous after insert/reorder operations.

## 2.5 List Data Loading Strategy
- Load ranked list from local database/API, not from TMDb.
- TMDb is used for movie discovery/add only.
- In list view, render poster thumbnails with lazy loading.
- Detail overlay can request larger image variant if needed.

# 3. UX and Interaction Specifications

## 3.1 Main List View
- Show ranked movie list sorted by rank ascending.
- Each row/card must display:
  - Rank.
  - Poster thumbnail.
  - Title.
  - Director name (if available).
- Row/card click opens detail overlay.
- Search input in list view supports:
  - Movie title.
  - Director name.
- Poster thumbnails must use lazy loading in list view.

## 3.2 Add Movie Flow
1. User searches TMDb by title.
2. User selects one TMDb result.
3. Add form opens with:
   - Required rank picker (wheel style).
   - lastWatchedAt field.
   - reviewText field.
4. Default rank rule when current list size is N:
   - defaultRank = floor((N + 2) / 2)
   - Allowed picker range: 1..N+1
  - Note: the vertical wheel-style picker is an MVP approximation and can be refined later into a more native/compact selector if needed.
5. On submit:
   - If movie is new: insert at selected rank and shift impacted ranks.
   - Auto-scroll to inserted movie.
   - Highlight inserted movie for 2 seconds.

## 3.3 Duplicate Handling (Critical)
Assumption: all movies are added from TMDb.

- Duplicate check uses tmdbId exact match only.
- If duplicate detected:
  - Do not create a new movie.
  - Return already_exists result with local movie id.
  - Auto-scroll to existing movie.
  - Highlight existing movie for 2 seconds.
  - Allow quick metadata update via detail overlay (especially last watched date).

## 3.4 Detail Overlay (No Dedicated Page in MVP)
- Open from list item.
- Shows:
  - Poster, title, director, release date, synopsis.
  - lastWatchedAt.
  - reviewText.
  - current rank.
- Close behavior:
  - Close button.
  - Outside click/tap.
  - Escape key on desktop.

Backlog note (post-MVP hardening):
- Allow editing rank directly from the detail overlay, with the same rank consistency guarantees as drag-and-drop reorder.

## 3.5 Drag and Drop Reordering
- Reordering mechanism is drag and drop only.
- No Up/Down buttons.
- On drop:
  - Recompute ranks for impacted items.
  - Persist order.
  - Update UI immediately.

# 4. Microcopy (Final UX Messages)

- No TMDb results:
  - "Aucun film trouve. Essaie un autre titre."
- TMDb network error:
  - "Impossible de contacter TMDb pour le moment. Reessaie dans quelques instants."
- Duplicate detected:
  - "Ce film est deja dans ta liste. On t'y amene."
- Successful add:
  - "Film ajoute a ta liste."

# 5. Functional Requirements

## FR-01 Search TMDb
User can search TMDb by title and view selectable results.

## FR-02 Add Movie
User can add a selected TMDb movie to ranked list with required rank.

## FR-03 Required Rank
Rank is mandatory at add time via wheel picker with valid range 1..N+1.

## FR-04 Middle Default Rank
System preselects middle default rank using floor((N + 2) / 2).

## FR-05 Duplicate Prevention
System prevents duplicate entries by tmdbId unique check.

## FR-06 Duplicate Redirect Behavior
On duplicate, system scrolls to existing item and highlights for 2 seconds.

## FR-07 Detail Editing
User can edit last watched date and written review from detail overlay.

## FR-08 Reordering
User can reorder movies through drag and drop on desktop and mobile.

## FR-09 List Search
User can search within personal list by title or director name.

## FR-10 Responsive Layout
Core add/search/rank/reorder/detail operations are usable on mobile viewport.

# 6. Non-Functional Requirements

## NFR-01 Performance
- List render should remain fluid up to 1000 movies on typical modern devices.
- Auto-scroll and highlight should trigger quickly after add/duplicate redirect.
- Poster loading in list must be lazy to reduce initial render cost.

## NFR-02 Scalability Target
- MVP target capacity: 1000 movies without significant perceived lag.
- Search by title/director should remain responsive on 1000-item dataset.
- Reordering operations should complete with immediate visible feedback.

## NFR-03 Reliability
- Duplicate prevention must be guaranteed server-side with unique tmdbId constraint.
- Rank consistency must be preserved during concurrent reorder/update operations.

## NFR-04 Usability
- Add flow should be low-friction and quick for daily use.
- Touch interactions must be practical on mobile.

## NFR-05 Accessibility (MVP baseline)
- Keyboard access for core controls on desktop.
- Visible focus states.
- Sufficient color contrast.

# 7. API Contract Draft (Backend)

## GET /api/tmdb/search?query=
- Purpose: Search TMDb by title.
- Response: list of candidates with tmdbId, title, poster, releaseDate.

## GET /api/movies
- Purpose: Return ranked personal list.

## POST /api/movies
- Purpose: Add TMDb movie to personal list.
- Input:
  - tmdbId
  - rank
  - lastWatchedAt (optional)
  - reviewText (optional)
- Output:
  - created result with movie id
  - OR already_exists with existing movie id

## PATCH /api/movies/:id
- Purpose: Update editable fields in detail overlay (lastWatchedAt, reviewText).

## PATCH /api/movies/reorder
- Purpose: Persist reorder operation after drag and drop.

# 8. Acceptance Criteria (MVP Exit)

1. User can add a movie from TMDb with mandatory rank picker.
2. New movie insertion respects selected rank and updates list order correctly.
3. Duplicate tmdbId never creates a second entry.
4. Duplicate flow scrolls to existing item and highlights for 2 seconds.
5. User can update last watched date and review in overlay detail view.
6. User can reorder list with drag and drop on desktop and mobile.
7. List displays rank for each movie.
8. Search works by title and director in list view.
9. The four defined UX messages are shown in the right situations.
10. Main workflows are responsive and usable on mobile.
11. List view remains usable and responsive with a dataset of 1000 movies.
12. Poster thumbnails in list are lazy-loaded.
13. Data persistence uses tmdbId uniqueness and preserves rank consistency after insert/reorder.

# 9. Implementation Work Packages

## WP-1 Foundation
- Project bootstrap (React + chosen tooling).
- Base layout, responsive design tokens, app shell.

## WP-2 Movie List Core
- Persisted movie list model.
- Rank rendering and list search.
- Detail overlay shell.

## WP-3 TMDb Integration and Add Flow
- TMDb search integration.
- Add form with required rank picker and middle default rank.
- Duplicate detection behavior and redirect UX.

## WP-4 Reordering and Polishing
- Drag and drop desktop + touch.
- Reorder persistence.
- Highlight, autoscroll, microcopy, validation and edge states.

## WP-5 Scalability Hardening (1000 Movies)
- Add lazy loading strategy for list posters.
- Validate local search and reorder performance at 1000 items.
- Add DB indexes and rank consistency transaction checks.
- Run manual perf checks on desktop and mobile.

Perf commands (server):
- `npm run perf:seed-1000` to extend dataset to 1000 movies.
- `npm run perf:smoke` to measure baseline API latency.

# 10. Final Technical Stack Decisions

Technical choices are now frozen for implementation and documented in:
- _bmad-output/planning-artifacts/architecture-stack-decisions.md

Frozen stack:
- Frontend: Vite + React + TypeScript
- Backend/API: Node.js + Express (TypeScript)
- Persistence: Prisma + SQLite
- Drag and drop: dnd-kit

---

This specification is ready for technical architecture and implementation task breakdown.

Virtualisation chantier planning reference:
- _bmad-output/planning-artifacts/virtualisation-list-plan.md
