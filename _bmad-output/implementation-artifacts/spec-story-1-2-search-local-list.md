---
title: 'story-1-2-search-local-list-by-title-director'
type: 'feature'
created: '2026-04-05'
status: 'in-review'
baseline_commit: 'NO_VCS'
context:
  - '_bmad-output/planning-artifacts/mvp-specifications.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/planning-artifacts/architecture-stack-decisions.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The list screen currently renders ranked movies but does not provide local filtering. With growing collections (target 1000 movies), users cannot quickly find a movie by title or director.

**Approach:** Add a local search input in the list view that filters already-loaded movies by title or director name in a case-insensitive and whitespace-tolerant way, while preserving existing loading/error/empty-state behavior.

## Boundaries & Constraints

**Always:** Keep Story 1.2 scope limited to local list search only. Search must run on the client-side dataset returned by GET /api/movies. Filtering must support both title and directorName fields. Existing Story 1.1 behavior (loading state, API error state, empty library state, ranked rendering) must remain intact.

**Ask First:** Any change to API contracts, backend query behavior, or introducing server-side search. Any change to microcopy outside the local no-result filter message behavior.

**Never:** Do not add TMDb search here. Do not add advanced filters, tags, sorting controls, or pagination. Do not alter ranking logic. Do not introduce drag-and-drop behavior in this story.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| FILTER_BY_TITLE | Movies loaded; query matches title substring | List shows only matching title entries, preserving rank order among filtered items | N/A |
| FILTER_BY_DIRECTOR | Movies loaded; query matches directorName substring | List shows movies whose directorName matches query | N/A |
| CASE_AND_SPACE_TOLERANCE | Query has mixed case and surrounding spaces | Query is normalized (trim + lowercase) before matching | N/A |
| NO_MATCH | Movies loaded; query matches no title/director | Show filtered no-result state; full list hidden until query changes | N/A |
| EMPTY_QUERY | Movies loaded; query empty string | Show full ranked list exactly as received from API | N/A |

</frozen-after-approval>

## Code Map

- `app/client/src/App.tsx` -- list page logic, search state, filtering logic, and filtered rendering
- `app/client/src/App.css` -- search input and no-result filtered-state styling
- `app/client/src/index.css` -- optional global input/focus consistency if required by local search control

## Tasks & Acceptance

**Execution:**
- [x] `app/client/src/App.tsx` -- add controlled search input state and normalized client-side filter over `movies` by `title` or `directorName` -- implements Story 1.2 core behavior
- [x] `app/client/src/App.tsx` -- preserve Story 1.1 states and add filtered no-result state only when query is non-empty and no matches exist -- prevents regression of empty-library behavior
- [x] `app/client/src/App.css` -- style search bar for desktop/mobile with visible focus state -- keeps UI usable and accessible
- [x] `app/client/src/App.tsx` -- add lightweight normalization utility (`trim().toLowerCase()`) and null-safe director matching -- handles edge cases from I/O matrix

**Acceptance Criteria:**
- Given movies are loaded, when user types a title fragment, then only title-matching movies are shown.
- Given movies are loaded, when user types a director fragment, then director-matching movies are shown.
- Given query has uppercase/lowercase variance or extra spaces, when filter runs, then matching behavior is case-insensitive and whitespace-tolerant.
- Given query is non-empty and no match exists, when list is rendered, then a no-result filtered state is shown.
- Given query is cleared, when list is rendered, then full ranked list reappears unchanged.
- Given initial Story 1.1 states (loading/API error/empty library), when app starts or fetch fails, then those states behave exactly as before.

## Spec Change Log

## Verification

**Commands:**
- `cd app/client && npm run build` -- expected: TypeScript and Vite build succeed

**Manual checks (if no CLI):**
- Type partial movie title and confirm filtered ranked cards only
- Type director name and confirm director-based matches
- Type unknown query and confirm no-result filtered state
- Clear query and confirm full ranked list restored
