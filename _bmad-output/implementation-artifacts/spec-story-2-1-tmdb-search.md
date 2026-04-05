# Story 2.1: TMDb Search Input and Results Display

**Status**: in-progress  
**Baseline Commit**: NO_VCS  
**Created**: 2026-04-05

---

## 1. Intent

User wants to search for movies on TMDb directly from the app. This is the first step in the "add movie" flow. Frontend provides a dedicated search interface (separate from the ranked list) where users can query TMDb by title, and see search results with poster, title, director, release year, and rank in the current library (if already added).

---

## 2. Feature Requirements (from Story AC)

### AC1: Search input
- **Given**: User is on the add flow screen  
- **When**: User enters a movie title in the search box  
- **Then**: Search becomes live (debounced ~300ms) and fetches results from TMDb

### AC2: Display results
- **Given**: TMDb returns search results  
- **When**: Results are fetched  
- **Then**: Show grid/list of movies with poster, title, director, release year, and existing rank badge (if already in library)

### AC3: Handle no results
- **Given**: TMDb search returns empty  
- **When**: User has entered a query  
- **Then**: Show "Aucun film trouvé. Essaie un autre titre." message

### AC4: Handle network error
- **Given**: TMDb API request fails  
- **When**: Network error occurs  
- **Then**: Show "Erreur reseau. Reessaie plus tard." message

---

## 3. Scope Boundaries

### In Scope
- Add search input (controlled, debounced)
- Call backend proxy endpoint GET `/api/tmdb/search?query=...`
- Display search results with poster, title, director, year
- Highlight already-in-library items (show rank badge)
- Handle empty results state
- Handle network error state
- Loading state during search
- Clear search / reset results

### Out of Scope
- Add selected movie to library (Story 2.2)
- Duplicate detection redirect (Story 2.4)
- Individual movie result click handling beyond visual selection (Story 2.2)

---

## 4. Backend API Contract

### GET /api/tmdb/search?query={searchTerm}

**Query Params**:
- `query` (required, string): Movie title to search for

**Response (Success 200)**:
```json
{
  "results": [
    {
      "tmdbId": 550,
      "title": "Fight Club",
      "posterUrl": "https://image.tmdb.org/t/p/w342/...",
      "directorName": "David Fincher",
      "releaseDate": "1999-10-15",
      "alreadyInLibrary": false,
      "libraryRank": null
    },
    {
      "tmdbId": 27205,
      "title": "Inception",
      "posterUrl": "https://image.tmdb.org/t/p/w342/...",
      "directorName": "Christopher Nolan",
      "releaseDate": "2010-07-16",
      "alreadyInLibrary": true,
      "libraryRank": 1
    }
  ]
}
```

**Response (Error 400 - Empty Query)**:
```json
{ "error": "Query parameter is required" }
```

**Response (Error 500 - TMDb API Failure)**:
```json
{ "error": "Failed to search TMDb" }
```

---

## 5. Frontend Architecture

### New Screen / Modal: "Add Movie" View

**Location**: Accessible from main page header button (Story 2.2 adds button; Story 2.1 provides content)

**Components**:
- SearchInput (controlled, debounced)
- SearchResultsGrid (displays results with poster, title, director, year, rank badge)
- EmptyStates (no results, network error)

### SearchInput Component

**Features**:
- text input, placeholder "Ex: Inception"
- Debounce 300ms before fetch
- Loading spinner while fetching
- Clear button (X icon)
- Auto-clear error state on new input

### SearchResultsGrid Component

**Features**:
- Grid layout (responsive: 1 col mobile, 3+ cols desktop)
- Each result card shows:
  - Poster (lazy-loaded)
  - Title
  - Director name (or "Unknown")
  - Release year (YYYY from releaseDate)
  - Rank badge (if alreadyInLibrary)
- Click/tap to select result (passed to Story 2.2)

### States

- **Idle**: No search yet, empty grid
- **Loading**: Spinner, "Recherche..."
- **Results**: Display grid of movies
- **No Results**: Show "Aucun film trouve. Essaie un autre titre."
- **Error**: Show "Erreur reseau. Reessaie plus tard."

---

## 6. Data Flow

```
User types in SearchInput
  ↓
Debounce 300ms
  ↓
Fetch GET /api/tmdb/search?query={term}
  ↓
Backend calls TMDb API
  ↓
Backend checks local library for matches
  ↓
Return results with alreadyInLibrary + libraryRank flags
  ↓
Frontend displays SearchResultsGrid
```

---

## 7. I/O Matrix

| Input | Output | Notes |
|-------|--------|-------|
| User types "Inception" | GET /api/tmdb/search?query=inception | Debounced, lowercase normalized |
| TMDb returns 5 results | SearchResultsGrid renders 5 cards | Posters lazy-loaded, rank badges shown |
| TMDb returns no results | "Aucun film trouve..." state | Empty results array |
| Network error on PATCH | "Erreur reseau..." state | User can retry by typing new query |
| User clears search input | Results grid cleared, idle state | Ready for new search |
| Result already in library | Rank badge #N shown on card | Visual indicator, selectable in Story 2.2 |

---

## 8. Execution Tasks

- [ ] **Task 1**: Implement backend GET /api/tmdb/search endpoint with TMDb API integration
- [ ] **Task 2**: Implement library existence check on backend (SELECT * FROM movie WHERE tmdbId IN (...))
- [ ] **Task 3**: Create SearchInput component (controlled input, debounce 300ms)
- [ ] **Task 4**: Create SearchResultsGrid component (grid layout, poster + info + rank badge)
- [ ] **Task 5**: Add state management in App.tsx or new AddMovieFlow component (search query, results, error, loading)
- [ ] **Task 6**: Implement error handling and empty states
- [ ] **Task 7**: Test end-to-end search (e.g., search "Inception", verify results)
- [ ] **Task 8**: Verify build succeeds and no console errors
- [ ] **Task 9**: Update spec marks all tasks [x] and status to `in-review`

---

## 9. Acceptance Criteria Verification

| AC | Test Case | Expected Result | Status |
|----|-----------|-----------------|--------|
| AC1 | Type "Inception" in search | Debounced fetch, results display after 300ms | Pending |
| AC1 | Search is live/responsive | Results update as user types (debounced) | Pending |
| AC2 | Results display poster, title, director, year | All fields visible in grid | Pending |
| AC2 | Already-in-library item shows rank badge | Rank badge visible on card | Pending |
| AC3 | Search returns no results | "Aucun film trouve..." message shown | Pending |
| AC4 | Network error occurs | "Erreur reseau..." message shown | Pending |

---

## 10. Frozen After Approval

_No changes accepted after implementation review unless explicitly requested._
