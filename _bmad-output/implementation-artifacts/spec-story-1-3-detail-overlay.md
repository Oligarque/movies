# Story 1.3: Open and Close Movie Detail Overlay

**Status**: in-review  
**Baseline Commit**: NO_VCS  
**Created**: 2026-04-05

---

## 1. Intent

User wants to open a detail overlay from list items to inspect movie details without leaving the ranking page. The overlay shows poster, title, director, release date, synopsis, current rank, last watched date, and written review. Close interactions include close button, outside click/tap, and Escape key on desktop.

---

## 2. Feature Requirements (from Story AC)

### AC1: Open overlay from list row
- **Given**: Movie row in ranked list  
- **When**: User selects/clicks row  
- **Then**: Detail overlay opens and displays poster, title, director, release date, synopsis, current rank, lastWatchedAt, reviewText

### AC2: Close overlay
- **Given**: Detail overlay is open  
- **When**: User clicks close button OR clicks/taps outside overlay OR presses Escape  
- **Then**: Overlay closes and list context (position/scroll, search filter) is preserved

---

## 3. Scope Boundaries

### In Scope
- Add missing fields to Movie schema (releaseDate, synopsis, lastWatchedAt, reviewText)
- Create Prisma migration and update seed data
- Create DetailOverlay modal/drawer component
- Implement open/close state management in App.tsx
- Close interactions: close button, outside click, Escape key
- Preserve list scroll position and filter query when overlay closes

### Out of Scope
- Edit fields in overlay (Story 1.4)
- Duplicate detection/redirect (Story 2.4)
- Drag-and-drop within overlay (N/A)

---

## 4. Data Model Changes

### Prisma Schema Updates

Current Movie model missing:
```prisma
releaseDate  String?   // e.g., "2010" or "2010-07-16"
synopsis     String?   // Movie plot summary
lastWatchedAt DateTime? // When user last watched this movie
reviewText   String?   // User's written review/notes
```

**Why**:
- releaseDate: Required for detail view display
- synopsis: Required for detail view display
- lastWatchedAt: For detail overlay (Story 1.3) and edit form (Story 1.4)
- reviewText: For detail overlay (Story 1.3) and edit form (Story 1.4)

---

## 5. Component Architecture

### DetailOverlay Component

**Location**: `app/client/src/components/DetailOverlay.tsx`

**Props**:
- `movie: Movie` (selected movie object)
- `onClose: () => void` (close handler)
- `isOpen: boolean` (visibility state)

**Features**:
- Render as modal overlay (fixed positioning, semi-transparent backdrop)
- Display movie fields: poster (larger), title, director, releaseDate, synopsis, rank, lastWatchedAt, reviewText
- Close button (X icon, top-right)
- Click-outside close (backdrop click, not on modal content)
- Keyboard close (Escape key, desktop only)
- Scrollable content area (synopsis may be long)
- Responsive design (mobile-friendly)

**Styling**:
- Modal: z-index 100+, fixed full-screen backdrop
- Content: centered card, max-width 500px, rounded corners
- Close button: top-right, large touch target
- Poster: larger than list view (maybe 200x300px)

### App.tsx State Management

**New State**:
- `selectedMovie: Movie | null` — currently opened movie (or null)
- `isOverlayOpen: boolean` — overlay visibility

**Event Handlers**:
- `handleOpenOverlay(movie: Movie)` — opens overlay for given movie
- `handleCloseOverlay()` — closes overlay, resets selectedMovie
- `handleBackdropClick(e)` — close on backdrop click (not modal click)
- `handleKeyDown(e)` — close on Escape key

**Integration**:
- Movie rows clickable → call `handleOpenOverlay`
- Overlay mounted conditionally (`isOverlayOpen && selectedMovie` → render DetailOverlay)

---

## 6. I/O Matrix

| Input | Output | Notes |
|-------|--------|-------|
| List row click | Overlay opens with selected movie data | Poster, title, director, releaseDate, synopsis, rank, lastWatchedAt, reviewText displayed |
| Close button click | Overlay closes | List scroll context preserved |
| Outside (backdrop) click | Overlay closes | Only if click target is backdrop, not modal |
| Escape key (desktop) | Overlay closes | Mobile: optional (depends on UX) |
| Already displayed, scroll/filter list | List updates independently | Overlay state unaffected |

---

## 7. Execution Tasks

- [x] **Task 1**: Update Prisma schema (add releaseDate, synopsis, lastWatchedAt, reviewText fields)
- [x] **Task 2**: Create and run Prisma migration (`npx prisma migrate dev --name add_movie_fields`)
- [x] **Task 3**: Update seed.ts with new fields for 5 test movies
- [x] **Task 4**: Create DetailOverlay.tsx component (modal shell, display fields, close handlers)
- [x] **Task 5**: Update App.tsx (add state, click handlers, render DetailOverlay conditionally) 
- [x] **Task 6**: Test open/close flow (click row, click close, click outside, press Escape)
- [x] **Task 7**: Verify build succeeds and no console errors
- [x] **Task 8**: Update spec marks all tasks [x] and status to `in-review`

---

## 8. Acceptance Criteria Verification

| AC | Test Case | Expected Result | Status |
|----|-----------|-----------------|--------|
| AC1 | Click list row | Overlay opens with correct movie data | ✓ Complete |
| AC1 | Overlay displays all required fields | Poster, title, director, releaseDate, synopsis, rank, lastWatchedAt, reviewText visible | ✓ Complete |
| AC2 | Click close button | Overlay closes, list preserved | ✓ Complete |
| AC2 | Click backdrop (outside modal) | Overlay closes, list preserved | ✓ Complete |
| AC2 | Press Escape key (desktop) | Overlay closes, list preserved | ✓ Complete |

---

## 9. Frozen After Approval

_No changes accepted after implementation review unless explicitly requested._
