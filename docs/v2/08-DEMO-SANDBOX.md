# V2 - Demo Sandbox Mode

## 📌 Overview

La page `/demo` est une version **éditable et publique** de votre ranking, où les visiteurs peuvent:

- 👀 Vérifier votre vrai ranking
- ✏️ Modifier/réordonner les films **sans authentification**
- ➕ Ajouter de nouveaux films via TMDB search
- 🚫 Voir une version read-only (`/public`) ou une version jouable (`/demo`)
- 🔄 Tous les changements **restent en local** (disappear au refresh)

**Use Case:**
- Laisser des amis essayer le ranking avant de l'envoyer
- Montrer comment l'UI fonctionne
- Sandbox public pour explorer TMDB

---

## 🎯 Spécifications

### URL & Access

```
GET /demo
- Public (no authentication required)
- Same as /public, different UI
```

### Data Flow

```
1. Page Load
   ↓
2. Fetch /api/public/ranking (get real data)
   ↓
3. Store in React state (local only)
   ↓
4. User interactions:
   - Edit movie → update state
   - Add movie → update state (+ TMDB fetch allowed)
   - Reorder → update state
   ↓
5. Refresh page → all changes lost, reload from API
```

### Features in /demo

| Feature | Status | Notes |
| --- | --- | --- |
| View ranking | ✅ Load from `/api/public/ranking` | Read-only initially |
| Edit movie | ✅ Local state only | No API call |
| Delete movie | ✅ Local state only | No API call |
| Reorder ranking | ✅ Local state only | No API call |
| Add new movie | ✅ Local state + TMDB search | Search allowed, save not |
| TMDB search | ✅ `/api/tmdb/search?query=X` | Same as main editor |
| Persist changes | ❌ No API write calls | localStorage optional* |

*localStorage: Nice-to-have for revisits within same session, not required

### UI Differences vs Sections

| Section | `/` Editor | `/public` | `/demo` |
| --- | --- | --- | --- |
| Auth required | ✅ Yes | ❌ No | ❌ No |
| Editable | ✅ Yes | ❌ No | ✅ Yes (local) |
| Saved to DB | ✅ Yes | N/A | ❌ No |
| TMDB search | ✅ Yes | N/A | ✅ Yes |
| Badge | None | "Public View" | "Demo Mode" |
| Load from | `/api/movies` | `/api/public/ranking` | `/api/public/ranking` |

---

## 🏗️ Architecture

### Component Structure

```
App.tsx
├── Routes
│   ├── / (EditorPage - protected)
│   ├── /login (LoginPage)
│   ├── /public (PublicPage - read-only)
│   └── /demo (DemoPage - editable local) ← NEW
```

### DemoPage.tsx Structure

```typescript
function DemoPage() {
  // State: Local copy of ranking
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load real ranking once on mount
  useEffect(() => {
    loadPublicRanking();
  }, []);

  // Handlers for all mutations (LOCAL ONLY)
  const handleAddMovie = (movie: Movie) => { ... };
  const handleEditMovie = (id: number, updates: Partial<Movie>) => { ... };
  const handleReorderMovies = (reordered: Movie[]) => { ... };
  const handleDeleteMovie = (id: number) => { ... };

  return (
    <div className="demo-page">
      <DemoHeader /> {/* "Demo Mode" badge + info */}
      <VirtualizedMovieCardList 
        movies={movies}
        onAddMovie={handleAddMovie}
        onEditMovie={handleEditMovie}
        onReorderMovies={handleReorderMovies}
        onDeleteMovie={handleDeleteMovie}
        isDemoMode={true}
      />
    </div>
  );
}
```

### State Management

```typescript
// Query public ranking once
const loadPublicRanking = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/public/ranking`);
    const data = await response.json();
    setMovies(data.movies);
  } catch (err) {
    setError('Failed to load ranking');
  } finally {
    setIsLoading(false);
  }
};

// All mutations stay local
const handleAddMovie = (newMovie: Movie) => {
  setMovies([...movies, {
    ...newMovie,
    id: Math.max(...movies.map(m => m.id), 0) + 1, // Temp ID
  }]);
};

const handleEditMovie = (id: number, updates: Partial<Movie>) => {
  setMovies(movies.map(m =>
    m.id === id ? { ...m, ...updates } : m
  ));
};

const handleReorderMovies = (reordered: Movie[]) => {
  setMovies(reordered);
};

const handleDeleteMovie = (id: number) => {
  setMovies(movies.filter(m => m.id !== id));
};
```

### TMDB Search in Demo

```typescript
// Search still calls API (read-only operation)
const handleSearchTmdb = async (query: string) => {
  try {
    const response = await fetch(
      `${API_BASE}/api/tmdb/search?query=${query}`
    );
    const data = await response.json();
    return data; // Return search results for display
  } catch (err) {
    throw new Error('TMDB search failed');
  }
};

// User selects a result from TMDB → add to local movies
const handleSelectTmdbResult = (tmdbResult: any) => {
  const newMovie = {
    id: Date.now(), // Temp ID (ephemeral)
    title: tmdbResult.title,
    posterUrl: tmdbResult.posterUrl,
    tmdbId: tmdbResult.id,
    directorName: tmdbResult.director || null,
    releaseDate: tmdbResult.releaseDate || null,
    synopsis: tmdbResult.synopsis || null,
    rank: Math.max(...movies.map(m => m.rank), 0) + 1,
    lastWatchedAt: null,
    reviewText: null,
  };
  handleAddMovie(newMovie);
};
```

---

## 🎨 UI Components

### DemoHeader.tsx

```typescript
function DemoHeader() {
  return (
    <header className="demo-header">
      <h1>🎬 Découvrez Mon Ranking</h1>
      <div className="header-info">
        <span className="badge demo-badge">✎ Mode Demo</span>
        <p className="warning">
          🔄 Les modifications ne sont pas sauvegardées. 
          Rafraîchissez la page pour revenir au ranking original.
        </p>
      </div>
      <div className="header-links">
        <a href="/public" className="link">Voir le ranking original (read-only)</a>
        <a href="/" className="link">Se connecter pour modifier</a>
      </div>
    </header>
  );
}
```

### Styles

```css
.demo-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  text-align: center;
}

.demo-header h1 {
  margin: 0 0 1rem;
}

.demo-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.3);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  margin-right: 1rem;
}

.warning {
  font-size: 0.95rem;
  color: #ffe5e5;
  margin: 1rem 0 0;
}

.header-links {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
  gap: 2rem;
}

.header-links .link {
  color: white;
  text-decoration: none;
  font-size: 0.9rem;
  border-bottom: 2px solid rgba(255, 255, 255, 0.5);
  padding-bottom: 0.25rem;
  transition: border-color 0.2s;
}

.header-links .link:hover {
  border-bottom-color: white;
}
```

---

## 📋 Component Props Updates

### VirtualizedMovieCardList.tsx (Props Extension)

```typescript
interface VirtualizedMovieCardListProps {
  movies: Movie[];
  onAddMovie?: (movie: Movie) => void;
  onEditMovie?: (id: number, updates: Partial<Movie>) => void;
  onReorderMovies?: (reordered: Movie[]) => void;
  onDeleteMovie?: (id: number) => void;
  isDemoMode?: boolean; // NEW: Indicates demo mode
}

// Inside component:
{isDemoMode && (
  <div className="demo-notice">
    ℹ️ Mode démo: modifications non sauvegardées
  </div>
)}

// Show/hide buttons based on mode
{isDemoMode ? (
  // Show edit/delete buttons
  <button onClick={() => onEditMovie?.(id, updates)}>✏️ Éditer</button>
  <button onClick={() => onDeleteMovie?.(id)}>🗑️ Supprimer</button>
) : (
  // Original buttons (if integrated with API calls)
  <button onClick={() => handleApiEdit(id, updates)}>Éditer</button>
)}
```

---

## 🔄 Data Persistence (Optional Enhancement)

### localStorage Bonus (Not Required)

If you want `/demo` to persist across page refreshes (within same browser session):

```typescript
// Save to localStorage after each change
const saveDemoState = (movies: Movie[]) => {
  localStorage.setItem('demo_movies', JSON.stringify(movies));
};

// Load from localStorage if available
const loadDemoState = async () => {
  const saved = localStorage.getItem('demo_movies');
  if (saved) {
    setMovies(JSON.parse(saved));
  } else {
    // Fall back to API
    await loadPublicRanking();
  }
};

// Call saveDemoState after each mutation
useEffect(() => {
  saveDemoState(movies);
}, [movies]);
```

**Trade-off:** localStorage persists across refreshes but is deleted on browser cache clear. Simple and good enough for a demo.

---

## 🌐 Routing

### App.tsx Router Update

```typescript
<Routes>
  {/* Existing routes */}
  <Route path="/login" element={<LoginPage />} />
  <Route path="/" element={<ProtectedRoute><EditorPage /></ProtectedRoute>} />
  <Route path="/public" element={<PublicPage />} />
  
  {/* NEW: Demo route */}
  <Route path="/demo" element={<DemoPage />} />
  
  {/* Fallback */}
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

---

## 🧪 Testing Checklist

### Functional Tests

- [ ] `/demo` loads without auth
- [ ] Movies load from `/api/public/ranking`
- [ ] TMDB search works (query results display)
- [ ] Can select TMDB result → adds to local list
- [ ] Can edit movie details (local update)
- [ ] Can delete movie (removed from local list)
- [ ] Can reorder movies (drag-and-drop or manual)
- [ ] Page refresh clears all changes
- [ ] Browser back/forward works smoothly

### UI Tests

- [ ] Demo header displays with badge
- [ ] Warning message visible
- [ ] Links to `/public` and `/` work
- [ ] Mobile responsive (same as editor)
- [ ] Movie cards show correct data

### Edge Cases

- [ ] Empty ranking → `/demo` shows empty list
- [ ] TMDB search with no results → shows "No results"
- [ ] Add movie then delete → updates correctly
- [ ] Rapid edits → no state conflicts
- [ ] Very long ranking (100+ movies) → performance acceptable

---

## 📍 Navigation Flow

```
User visits movies.rivierenathan.fr/demo
      ↓
No auth check (public page)
      ↓
Load /api/public/ranking
      ↓
Display in editable editor
      ↓
User interacts (add/edit/reorder)
      ↓
All changes local React state
      ↓
Refresh page → lost
      OR
Navigate away → lost
      OR
(Optional) localStorage persists within session
```

---

## 🔗 Related Pages

- **`/public`** - Read-only ranking view (static)
- **`/demo`** - Editable sandbox (local mutations only)
- **`/`** - Authenticated editor (API mutations, persistent)

---

## 🚀 Implementation Order

1. Create `DemoPage.tsx` component
2. Create `DemoHeader.tsx` component
3. Update `VirtualizedMovieCardList.tsx` props (isDemoMode, local handlers)
4. Update `App.tsx` routes
5. Test all flows
6. (Optional) Add localStorage persistence

---

## ✅ Files to Create/Modify

**New Files:**
- `app/client/src/pages/DemoPage.tsx`
- `app/client/src/components/DemoHeader.tsx`

**Modified Files:**
- `app/client/src/App.tsx` (add route)
- `app/client/src/components/VirtualizedMovieCardList.tsx` (extend props)

**No backend changes required** (uses existing public API)

---

**Ready to code?** Or more clarifications needed? 🚀
