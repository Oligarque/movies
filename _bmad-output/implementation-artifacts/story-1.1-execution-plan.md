---
title: Story 1.1 Execution Plan
story: Epic 1 - Story 1.1
project: movies
date: 2026-04-05
status: Ready to Implement
---

# Story Goal

Render ranked movie list with core card data:
- rank
- poster thumbnail
- title
- director name (if available)
- empty state when no movie exists

# Scope Boundary (Story 1.1 only)

Included:
- Project bootstrap (frontend + backend minimal shell)
- Database model for Movie (minimal fields needed by Story 1.1)
- GET /api/movies endpoint
- Frontend list page rendering sorted by rank
- Empty state

Excluded (later stories):
- TMDb search/add flow
- duplicate redirect flow
- detail overlay
- drag and drop reorder
- list search input behavior

# Frozen Stack

- Frontend: Vite + React + TypeScript
- Backend: Node.js + Express + TypeScript
- Persistence: Prisma + SQLite

# Proposed Workspace Layout

app/
  client/
  server/

# Implementation Steps

## Step 1 - Bootstrap frontend

Commands:
- npm create vite@latest app/client -- --template react-ts
- cd app/client
- npm install

Output:
- React TypeScript app runs locally.

## Step 2 - Bootstrap backend

Commands:
- mkdir app/server
- cd app/server
- npm init -y
- npm install express cors
- npm install -D typescript tsx @types/node @types/express @types/cors
- npx tsc --init

Output:
- TypeScript Express backend shell is ready.

## Step 3 - Add Prisma + SQLite

Commands (from app/server):
- npm install prisma @prisma/client
- npx prisma init --datasource-provider sqlite

Prisma model (minimal for Story 1.1):
- id
- tmdbId (unique)
- title
- posterUrl
- directorName
- rank (indexed)
- createdAt
- updatedAt

Then run:
- npx prisma migrate dev --name init_movie_model

Output:
- SQLite DB with Movie table and rank index.

## Step 4 - Build GET /api/movies

Requirements:
- Endpoint: GET /api/movies
- Response sorted by rank asc
- DTO fields for Story 1.1 card view:
  - id, rank, title, posterUrl, directorName

Output:
- Backend provides ranked list data for UI.

## Step 5 - Seed test data

Create a small seed script with:
- 5 to 10 sample movies
- contiguous ranks (1..N)

Output:
- Quick verification dataset for frontend.

## Step 6 - Build list UI in frontend

Requirements:
- Fetch GET /api/movies on page load
- Render list sorted by rank (as received)
- Card row shows rank, poster thumbnail, title, director name
- Empty state when list is empty
- Poster image has loading="lazy" (already aligned with scalability direction)

Output:
- Story 1.1 visible and testable in browser.

## Step 7 - Manual verification checklist

- List loads without runtime error
- Rows are ordered by rank ascending
- All required card fields are visible
- Empty state appears when DB has no movies
- Poster thumbnails lazy-load attribute is present

# Definition of Done (Story 1.1)

1. Backend endpoint GET /api/movies exists and returns rank-ordered data.
2. Frontend renders ranked list cards with required fields.
3. Empty state works when no data exists.
4. Data is read from local DB (SQLite via Prisma), not TMDb.
5. Story scope excludes future features and remains independently shippable.

# Suggested Next Story After Completion

- Story 1.2: Search personal list by title or director.
