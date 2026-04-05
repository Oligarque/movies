---
title: Movies App - Architecture Stack Decisions
project: movies
date: 2026-04-05
status: Final (Pre-Implementation)
---

# Purpose

Freeze the technical stack and baseline architecture before implementation.

# Final Stack (Frozen)

## Frontend
- Vite
- React
- TypeScript
- Styling: CSS Modules (or plain CSS with tokens) for MVP simplicity

## Backend/API
- Node.js + Express (TypeScript)
- REST API under /api

## Persistence
- Prisma ORM
- SQLite database (MVP target: up to 1000 movies)

## Drag and Drop
- dnd-kit
- Pointer + touch support (desktop mouse and mobile finger)

# Why This Stack

- Vite + React + TS: fast local dev, minimal overhead, strong typing.
- Prisma + SQLite: simple setup, reliable constraints/indexes, enough for 1000-item personal dataset.
- dnd-kit: robust and flexible drag and drop with touch support.

# Architecture Boundaries

## Client Responsibilities
- Render ranked list and detail overlay.
- Local UI state (selection, highlight, modal state, current query).
- Call backend API for read/write operations.

## Server Responsibilities
- Integrate TMDb search endpoint.
- Enforce duplicate prevention by tmdbId.
- Persist movie data and rank updates.
- Execute transactional rank updates on insert/reorder.

## Database Responsibilities
- Source of truth for personal list.
- Constraints and indexes for integrity and performance.

# Data Storage Rules

- Store TMDb identifiers and metadata in DB rows.
- Store poster URL/path only (no binary image storage).
- Load list data from local DB/API, not directly from TMDb.
- Use lazy loading for poster thumbnails in list view.

# Required DB Constraints and Indexes

- Unique: tmdbId
- Index: rank
- Optional indexes: title, directorName

# API Contract Baseline

- GET /api/tmdb/search?query=
- GET /api/movies
- POST /api/movies
- PATCH /api/movies/:id
- PATCH /api/movies/reorder

# Performance and Scalability Targets

- Target capacity: 1000 movies.
- Main workflows remain responsive: list load, list search, add/duplicate redirect, reorder.
- Poster thumbnails lazy-loaded.
- Rank updates stay contiguous and transactional.

# Implementation Start Order

1. Bootstrap frontend + backend workspace with TypeScript.
2. Add Prisma schema + migrations + seed capability.
3. Build movie list read path (GET /api/movies).
4. Build TMDb search + add path with duplicate handling.
5. Build drag and drop reorder with persistence.
6. Add detail overlay edit flow.
7. Run 1000-movie baseline checks.

# Out of Scope for MVP Architecture

- Auth/multi-user support.
- Cloud storage and CDN pipeline.
- SSR requirements.
- Analytics stack.
