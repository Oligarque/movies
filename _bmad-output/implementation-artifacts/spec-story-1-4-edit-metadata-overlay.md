# Story 1.4: Edit Last Watched Date and Review From Overlay

**Status**: in-review  
**Baseline Commit**: NO_VCS  
**Created**: 2026-04-05

---

## 1. Intent

User wants to edit `lastWatchedAt` and `reviewText` fields from within the detail overlay. When changes are made and saved, the overlay sends updates to the backend via PATCH /api/movies/:id, persists them to the database, and reflects changes in the UI.

---

## 2. Feature Requirements (from Story AC)

### AC1: Edit fields in overlay
- **Given**: A movie detail overlay is open  
- **When**: User edits `lastWatchedAt` (date input) or `reviewText` (textarea)  
- **Then**: Form fields remain editable and can be modified

### AC2: Save changes
- **Given**: Movie detail overlay with edited fields  
- **When**: User clicks Save button  
- **Then**: Changes persist to backend via PATCH /api/movies/:id
**And** UI reflects updated values
**And** overlay shows brief success feedback

### AC3: Handle errors gracefully
- **Given**: Save operation fails (network error, validation error)  
- **When**: PATCH request fails  
- **Then**: Error state displayed, user input preserved for retry

---

## 3. Scope Boundaries

### In Scope
- Add form fields to DetailOverlay: `lastWatchedAt` (date input), `reviewText` (textarea)
- Create Save button in overlay
- Implement PATCH /api/movies/:id endpoint on backend
- Handle success feedback (brief toast or inline message)
- Handle error feedback (display error message, preserve input)
- Disabled state during save (prevent double-submit)

### Out of Scope
- Edit `title`, `directorName`, `releaseDate`, `synopsis` (immutable fields)
- Drag-and-drop reorder while overlay open
- Delete movie from overlay (future feature)

---

## 4. API Contract

### PATCH /api/movies/:id

**Request Body**:
```json
{
  "lastWatchedAt": "2026-04-05T10:30:00Z" | null,
  "reviewText": "Updated review text" | ""
}
```

**Response (Success 200)**:
```json
{
  "id": 1,
  "tmdbId": 27205,
  "rank": 1,
  "title": "Inception",
  "posterUrl": "...",
  "directorName": "Christopher Nolan",
  "releaseDate": "2010-07-16",
  "synopsis": "...",
  "lastWatchedAt": "2026-04-05T10:30:00Z",
  "reviewText": "Updated review text",
  "createdAt": "...",
  "updatedAt": "2026-04-05T10:35:00Z"
}
```

**Response (Error 400 or 500)**:
```json
{
  "error": "Movie not found" | "Invalid request body"
}
```

---

## 5. Component Updates

### DetailOverlay.tsx Changes

**New Props**:
- `onSave: (movieId: number, updates: { lastWatchedAt?: string; reviewText?: string }) => Promise<void>` — async save handler from App.tsx

**New State**:
- `editLastWatchedAt: string` — temp state for date input
- `editReviewText: string` — temp state for textarea
- `isSaving: boolean` — disable button during save
- `saveError: string | null` — error message display
- `saveSuccess: boolean` — brief success indicator

**New Features**:
- Date input field for `lastWatchedAt` (empty or ISO format)
- Textarea for `reviewText`
- Save button (disabled while isSaving=true)
- Success feedback (e.g., "Saved ✓" for 2 seconds)
- Error feedback (red text or toast-like message)
- Cancel-like behavior: user can close overlay without saving

**Styling**:
- Form section at bottom of overlay
- Input/textarea responsive sizing
- Save button large touch target (40px+)
- Error message red text
- Success feedback inline or greenish

### App.tsx Changes

**New Handler**:
- `handleSaveMovieMetadata(movieId: number, updates)` — calls PATCH endpoint, then updates local state or refetches

**Integration**:
- Pass handler to DetailOverlay: `onSave={handleSaveMovieMetadata}`
- After successful save, update `movies` state to reflect changes (optional: refetch all)

---

## 6. I/O Matrix

| Input | Output | Notes |
|-------|--------|-------|
| User enters date in lastWatchedAt field | Form state updates | ISO format stored internally |
| User types in reviewText textarea | Form state updates | Plain text, no markdown |
| User clicks Save button | PATCH /api/movies/:id sent | Button disabled, "Saving..." text shown |
| PATCH succeeds | Success feedback displayed for 2–3 sec | Overlay remains open; movie data updated |
| PATCH fails (network/validation) | Error message displayed in red | User can retry without closing overlay |
| User closes overlay without saving | No changes persisted | Local edits lost (expected behavior) |

---

## 7. Execution Tasks

- [x] **Task 1**: Implement PATCH /api/movies/:id endpoint on backend (Express)
- [x] **Task 2**: Test PATCH endpoint manually (curl or REST client)
- [x] **Task 3**: Update DetailOverlay.tsx with form fields (date input, textarea)
- [x] **Task 4**: Add Save/Cancel handlers and state management in DetailOverlay
- [x] **Task 5**: Add success/error feedback UI (messages, styling)
- [x] **Task 6**: Implement handleSaveMovieMetadata in App.tsx
- [x] **Task 7**: Pass onSave prop to DetailOverlay component
- [x] **Task 8**: Test complete flow (open overlay, edit fields, click Save, verify persistence)
- [x] **Task 9**: Test error handling (simulate failed request, verify error message + input preserved)
- [x] **Task 10**: Verify build succeeds and no console errors
- [x] **Task 11**: Update spec marks all tasks [x] and status to `in-review`

---

## 8. Acceptance Criteria Verification

| AC | Test Case | Expected Result | Status |
|----|-----------|-----------------|--------|
| AC1 | Open overlay, edit date field | Form state updates; date displayed | ✓ Complete |
| AC1 | Edit review text field | Form state updates; text displayed | ✓ Complete |
| AC2 | Click Save with valid data | PATCH sent; "Saved ✓" displayed; list auto-updates | ✓ Complete |
| AC2 | Close overlay after save | List reflects updated data on return | ✓ Complete |
| AC3 | Save fails (network error) | Error message displayed; input preserved | ✓ Complete |
| AC3 | Retry after error | Save succeeds on second attempt | ✓ Complete |

---

## 9. Frozen After Approval

_No changes accepted after implementation review unless explicitly requested._
