---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/mvp-specifications.md
---

# movies - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for movies, decomposing the requirements from the specifications into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: User can search TMDb by title and view selectable results.
FR2: User can add a selected TMDb movie to ranked list with required rank.
FR3: Rank is mandatory at add time via wheel picker with valid range 1..N+1.
FR4: System preselects middle default rank using floor((N + 2) / 2).
FR5: System prevents duplicate entries by tmdbId unique check.
FR6: On duplicate, system scrolls to existing item and highlights for 2 seconds.
FR7: User can edit last watched date and written review from detail overlay.
FR8: User can reorder movies through drag and drop on desktop and mobile.
FR9: User can search within personal list by title or director name.
FR10: Core add/search/rank/reorder/detail operations are usable on mobile viewport.
FR11: List view uses lazy loading for poster thumbnails.

### NonFunctional Requirements

NFR1: List render should remain fluid up to 1000 movies on typical modern devices.
NFR2: Auto-scroll and highlight should trigger quickly after add/duplicate redirect.
NFR3: Duplicate prevention must be guaranteed server-side with unique tmdbId constraint.
NFR4: Search by title/director should remain responsive on a 1000-item dataset.
NFR5: Reordering operations should complete with immediate visible feedback.
NFR6: Add flow should be low-friction and quick for daily use.
NFR7: Touch interactions must be practical on mobile.
NFR8: Keyboard access for core controls on desktop.
NFR9: Visible focus states.
NFR10: Sufficient color contrast.
NFR11: Rank consistency must be preserved during concurrent reorder/update operations.

### Additional Requirements

- All added movies are assumed to come from TMDb and are identified by tmdbId.
- Target dataset capacity for MVP is 1000 movies.
- Store movie fields: tmdbId, title, posterUrl, releaseDate, directorName, synopsis.
- Store user fields: rank, lastWatchedAt, reviewText.
- Recommended persistence stack: SQLite + Prisma.
- Poster binaries are not stored locally; only poster URL/path is stored.
- Required storage constraints:
  - Unique tmdbId.
  - Indexed rank for ordered reads.
  - Optional indexes on title and directorName for list search.
- Reorder writes must run in a transaction to preserve contiguous rank consistency.
- Main list sorted by rank ascending and displays rank for each movie.
- Main list data loads from local database/API, not from TMDb.
- Detail information (synopsis, review, last watched date) is not shown directly in list.
- Use detail overlay (drawer/modal), not a dedicated detail page route in MVP.
- Overlay close interactions: close button, outside click/tap, Escape on desktop.
- Reordering is drag-and-drop only (desktop mouse + mobile touch), no up/down buttons.
- Duplicate behavior returns already_exists and redirects UX to existing item.
- Required UX microcopy:
  - "Aucun film trouve. Essaie un autre titre."
  - "Impossible de contacter TMDb pour le moment. Reessaie dans quelques instants."
  - "Ce film est deja dans ta liste. On t'y amene."
  - "Film ajoute a ta liste."

### UX Design Requirements

UX-DR1: Provide a responsive ranked list layout that works on desktop and mobile daily usage.
UX-DR2: Provide wheel-style rank picker with required value and valid range 1..N+1.
UX-DR3: Provide automatic scroll to newly inserted or duplicate-target movie item.
UX-DR4: Provide 2-second highlight animation/state for inserted or duplicate-target movie item.
UX-DR5: Provide detail overlay with fast close interactions (button, outside tap/click, Escape desktop).
UX-DR6: Keep list rows concise; move synopsis/review/last watched details to overlay only.
UX-DR7: Ensure drag-and-drop interactions are usable with mouse and touch.
UX-DR8: Show clear feedback messages for empty TMDb result, network error, duplicate redirect, and success.
UX-DR9: Apply lazy loading to list poster thumbnails to reduce initial render cost at 1000-item scale.

### FR Coverage Map

FR1: Epic 2 - Search TMDb by movie title.
FR2: Epic 2 - Add a selected TMDb movie with required rank.
FR3: Epic 2 - Enforce required rank picker with valid range.
FR4: Epic 2 - Preselect middle default rank.
FR5: Epic 2 - Prevent duplicates by tmdbId unique check.
FR6: Epic 2 - Redirect duplicate flow to existing item with highlight.
FR7: Epic 1 - Edit last watched date and review from detail overlay.
FR8: Epic 3 - Reorder ranked movies with drag and drop.
FR9: Epic 1 - Search personal list by title or director.
FR10: Epic 1, Epic 2, Epic 3 - Core operations are usable on mobile.
FR11: Epic 4 - Apply lazy loading for poster thumbnails in list view.

## Epic List

### Epic 1: Personal Ranked Library Experience
Users can browse their ranked list, search it by title/director, and update movie notes from a fast detail overlay.
**FRs covered:** FR7, FR9, FR10

### Epic 2: TMDb Discovery and Safe Add Flow
Users can find movies on TMDb and add them with required ranking while duplicate handling redirects to existing entries.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR10

### Epic 3: Touch-First and Desktop Drag-and-Drop Reordering
Users can continuously refine preference ranking through drag and drop on both mouse and touch devices.
**FRs covered:** FR8, FR10

### Epic 4: 1000-Movie Scalability and Data Reliability
Users keep a large personal library responsive and consistent through lazy image loading, indexed storage, and rank-safe persistence.
**FRs covered:** FR11

## Epic 1: Personal Ranked Library Experience

Deliver a responsive ranked list experience that lets users scan their collection quickly, find entries by title/director, and edit personal movie metadata from a superposed detail view.

### Story 1.1: Render Ranked Movie List With Core Card Data

As a movie collector,
I want to see my movies sorted by rank with key info,
So that I can understand my preference order at a glance.

**Acceptance Criteria:**

**Given** a saved movie collection with rank values
**When** I open the list screen
**Then** movies are displayed in ascending rank order
**And** each row shows rank, poster thumbnail, title, and director when available.

**Given** no movies are stored yet
**When** I open the list screen
**Then** an empty state is shown
**And** the add flow entry point remains visible.

### Story 1.2: Search Personal List by Title or Director

As a movie collector,
I want to search my saved list by title or director,
So that I can quickly find a movie in large collections.

**Acceptance Criteria:**

**Given** I have movies in my ranked list
**When** I type a query in list search
**Then** results are filtered by title and director name
**And** matching remains responsive for large datasets.

**Given** no movie matches my query
**When** the filter is applied
**Then** a no-result state is shown
**And** clearing the query restores the full ranked list.

### Story 1.3: Open and Close Movie Detail Overlay

As a movie collector,
I want to open a detail overlay from list items,
So that I can inspect movie details without leaving the ranking page.

**Acceptance Criteria:**

**Given** a movie row in the ranked list
**When** I select the row
**Then** a detail overlay opens
**And** it shows poster, title, director, release date, synopsis, current rank, last watched date, and written review.

**Given** the detail overlay is open
**When** I close it using close button, outside click/tap, or Escape on desktop
**Then** the overlay closes
**And** the list context (position/filter) is preserved.

### Story 1.4: Edit Last Watched Date and Review From Overlay

As a movie collector,
I want to edit last watched date and review in the overlay,
So that my personal notes remain up to date.

**Acceptance Criteria:**

**Given** a movie detail overlay is open
**When** I update last watched date and/or review and save
**Then** changes persist in storage
**And** updated values are visible when reopening the same movie.

**Given** the save operation fails
**When** I submit my edits
**Then** an error feedback is shown
**And** my unsaved input remains available for retry.

## Epic 2: TMDb Discovery and Safe Add Flow

Deliver a fast add journey where users search TMDb, choose mandatory rank, and add movies safely without duplicate entries.

### Story 2.1: Search TMDb by Title and Display Candidates

As a movie collector,
I want to search TMDb by title,
So that I can select the exact movie to add.

**Acceptance Criteria:**

**Given** I enter a non-empty title query
**When** I trigger TMDb search
**Then** candidate movies are displayed with core metadata
**And** each result can be selected for add flow.

**Given** TMDb returns no result
**When** the request completes
**Then** the message "Aucun film trouve. Essaie un autre titre." is shown
**And** the user can immediately retry.

**Given** TMDb request fails due to network/API issue
**When** search is executed
**Then** the message "Impossible de contacter TMDb pour le moment. Reessaie dans quelques instants." is shown
**And** no partial corrupted result is displayed.

### Story 2.2: Add Selected Movie With Required Rank Picker

As a movie collector,
I want rank to be mandatory when adding a movie,
So that each new movie is inserted directly in my preference order.

**Acceptance Criteria:**

**Given** I selected a TMDb movie and my current list size is N
**When** add form opens
**Then** rank picker is required with allowed range 1..N+1
**And** default rank is preselected as floor((N + 2) / 2).

**Given** I submit without a valid rank
**When** validation runs
**Then** submission is blocked
**And** clear validation feedback is shown.

### Story 2.3: Insert New Movie at Selected Rank

As a movie collector,
I want new movies inserted at my selected rank,
So that list order reflects my preference immediately.

**Acceptance Criteria:**

**Given** selected movie is not already in storage
**When** I confirm add
**Then** movie is inserted at chosen rank
**And** impacted items shift ranks to keep contiguous ordering.

**Given** insertion succeeds
**When** list updates
**Then** message "Film ajoute a ta liste." is shown
**And** the new movie is visible in correct rank order.

### Story 2.4: Redirect Duplicate Add to Existing Movie

As a movie collector,
I want duplicate add attempts to redirect me to the existing item,
So that I avoid duplicates and can update the current entry quickly.

**Acceptance Criteria:**

**Given** selected TMDb movie already exists by tmdbId
**When** I submit add
**Then** no new row is created
**And** backend returns already_exists with existing movie identifier.

**Given** already_exists is returned
**When** frontend handles response
**Then** it auto-scrolls to existing movie and highlights it for 2 seconds
**And** shows "Ce film est deja dans ta liste. On t'y amene.".

## Epic 3: Touch-First and Desktop Drag-and-Drop Reordering

Deliver robust drag-and-drop ranking edits for mouse and touch interactions while preserving immediate visual updates.

### Story 3.1: Desktop Drag-and-Drop Reordering

As a movie collector on desktop,
I want to drag and drop rows with a mouse,
So that I can quickly refine my ranking.

**Acceptance Criteria:**

**Given** the ranked list is displayed on desktop
**When** I drag one movie and drop it at a new position
**Then** visual order updates immediately
**And** all ranks are recalculated to remain contiguous.

**Given** drop action completes
**When** persistence call succeeds
**Then** refreshed list order matches dropped state
**And** no duplicate or missing ranks exist.

### Story 3.2: Mobile Touch Drag-and-Drop Reordering

As a movie collector on mobile,
I want to reorder movies by touch drag and drop,
So that I can manage ranking without desktop controls.

**Acceptance Criteria:**

**Given** the ranked list is opened on a touch device
**When** I drag and drop a movie with my finger
**Then** the new order is applied and persisted
**And** interaction remains usable without up/down fallback buttons.

**Given** a reorder operation is triggered on mobile
**When** operation completes
**Then** feedback remains immediate
**And** list remains responsive.

## Epic 4: 1000-Movie Scalability and Data Reliability

Deliver performance and storage safeguards so the app remains responsive and data-consistent at 1000 movies.

### Story 4.1: Implement Scalable Persistence Model and Indexes

As a movie collector,
I want my data stored efficiently and consistently,
So that ranking and search stay reliable as my library grows.

**Acceptance Criteria:**

**Given** persistence layer is configured
**When** schema is applied
**Then** tmdbId is enforced as unique
**And** index exists on rank with optional indexes on title/directorName.

**Given** insert or reorder updates multiple items
**When** persistence is executed
**Then** updates run transactionally
**And** rank values remain contiguous and consistent.

### Story 4.2: Add Lazy Loading for List Poster Thumbnails

As a movie collector,
I want poster thumbnails to load progressively,
So that the list opens quickly even with many movies.

**Acceptance Criteria:**

**Given** ranked list contains many movies with posters
**When** list initially renders
**Then** only visible/near-visible poster thumbnails are requested
**And** off-screen posters load lazily while scrolling.

**Given** poster image loading fails
**When** thumbnail should render
**Then** a stable fallback visual is shown
**And** list layout remains stable.

### Story 4.3: Validate 1000-Movie Performance Baseline

As a movie collector,
I want the app to stay smooth with 1000 movies,
So that scaling my library does not degrade daily usage.

**Acceptance Criteria:**

**Given** a test dataset of 1000 movies
**When** I run main workflows (list load, search, add redirect, reorder)
**Then** the app remains responsive on modern desktop and mobile devices
**And** no blocking lag is observed in normal usage.

**Given** performance checks uncover hotspots
**When** baseline is reviewed
**Then** optimization actions are documented
**And** regressions are prevented in future increments.
