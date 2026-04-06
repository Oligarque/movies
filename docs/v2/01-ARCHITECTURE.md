# V2 - Architecture générale

## 🏗️ Diagramme global

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                     │
├────────────────┬────────────────────────────────────────────┤
│  /login        │  / (editor)         │  /public (read-only) │
│  (LoginForm)   │  (VirtualizedList)  │  (PublicRanking)     │
└─────────┬──────┴────────┬────────────┴──────────┬───────────┘
          │               │                       │
          │ POST /auth    │ GET /api/auth/me      │ (no auth)
          │ /login        │ PATCH /api/movies/**  │ GET /public
          │               │                       │
     ┌────▼───────────────▼───────────────────────▼────────────┐
     │                BACKEND (Express + Auth Middleware)      │
     ├──────────────────────────────────────────────────────────┤
     │  • POST /api/auth/login                                  │
     │  • POST /api/auth/logout                                 │
     │  • GET /api/auth/me (sliding window)                     │
     │  • PATCH /api/movies/** (auth required)                  │
     │  • GET /api/public/ranking (no auth)                     │
     └──────────────┬───────────────────────────────────────────┘
                    │
     ┌──────────────▼──────────────────────────────────────┐
     │              DATABASE (Prisma + SQLite)            │
     ├───────────────────────────────────────────────────┤
     │  • User (id, password hash)                        │
     │  • Session (id, userId, expiresAt, lastActivityAt)│
     │  • Movie (existing schema + indexes)               │
     └──────────────────────────────────────────────────┘
```

---

## 🔐 Backend Architecture

### Layers

```
app/server/src/
├── index.ts                 # Express app setup + route mounting
├── middleware/
│   ├── auth.ts              # requireAuth() middleware
│   └── session.ts           # Session management (loading/extending)
├── routes/
│   ├── auth.ts              # POST /login, /logout, GET /me
│   ├── public.ts            # GET /public/ranking
│   └── movies.ts            # Existing CRUD (+ auth protection)
├── controllers/
│   ├── authController.ts    # Login/logout/getMe logic
│   ├── publicController.ts  # Public ranking logic
│   └── movieController.ts   # Movie CRUD (existing)
├── utils/
│   ├── hash.ts              # bcrypt hash/compare
│   └── session.ts           # Session creation/validation
└── prisma/
    └── schema.prisma        # DB schema
```

### Flow requête authentifiée

```
1. GET /api/movies
   ↓
2. Middleware: sessionLoader() 
   - Parse session cookie
   - Load Session from DB
   - Check expiration
   - Update lastActivityAt (gliding)
   ↓
3. Middleware: requireAuth()
   - Check req.session exists
   - If not → 401 Unauthorized
   ↓
4. Controller: getMovies()
   - Return data
   ↓
5. Response: Movies[] + Set-Cookie (new expiration)
```

### Session glissante (sliding window)

```typescript
// Pseudo-code
function extendSession(session: Session) {
  // Réinitialise toujours expiresAt à NOW + 14 jours
  session.expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  session.lastActivityAt = new Date();
  await db.session.update(session);
  
  // Renvoie cookie mis à jour
  return session;
}
```

Si user actif: session jamais expire.
Si user inactif 14j: auto-logout.

---

## 🎨 Frontend Architecture

### Routes & Components

```
src/
├── App.tsx                   # Root router
├── pages/
│   ├── LoginPage.tsx         # Form + submit
│   ├── EditorPage.tsx        # Protected, existing UI
│   └── PublicPage.tsx        # Read-only ranking
├── components/
│   ├── ProtectedRoute.tsx    # Wrapper pour routes auth
│   ├── PublicRoute.tsx       # Wrapper pour /public
│   ├── LoginForm.tsx         # Form input + validation
│   ├── LogoutButton.tsx      # Header logout
│   └── VirtualizedMovieCardList.tsx (existing, no changes)
├── hooks/
│   ├── useAuth.ts            # Check session + sync state
│   └── useApi.ts             (existing - update pour auth)
├── types/
│   └── auth.ts               # Session, User types
└── services/
    └── authService.ts        # API calls pour login/logout
```

### State Management (simple)

```typescript
// App-level context (React Context API)
type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user?: { id?: number };
  error?: string;
};

// At startup:
useEffect(() => {
  GET /api/auth/me
  → If valid: setAuth({ isAuthenticated: true })
  → If 401: setAuth({ isAuthenticated: false }) → redirect /login
}, []);

// On logout:
POST /api/auth/logout
→ setAuth({ isAuthenticated: false })
→ redirect /login
```

### Page Flows

#### LoginPage
```
1. User enters password
2. Submit → POST /api/auth/login
3. If OK: Redirect / (editor)
4. If error: Show message
```

#### EditorPage (/)
```
1. ProtectedRoute checks auth
2. If not authed: Redirect /login
3. Else: Render editor (existing UI)
4. Header: Add LogoutButton
```

#### PublicPage (/public)
```
1. PublicRoute (no auth check)
2. Fetch GET /api/public/ranking
3. Render read-only ranking + badge "Public View"
4. No edit/delete buttons
```

---

## 🔄 Data Flow Examples

### Login Flow

```
Frontend                          Backend
────────                          ───────
POST /api/auth/login
(password)
                              ──→ Find User (always 1)
                              ──→ bcrypt.compare(password)
                              ──→ If fail: 401
                              ──→ If success:
                                  - Create Session row
                                  - expiresAt = NOW + 14d
                              ──→ Send Set-Cookie
                              ──→ Send 200 + { ok: true }

Receive Set-Cookie
Redirect /
```

### Get Movies (Protected)

```
Frontend                          Backend
────────                          ───────
GET /api/movies
(cookie sent auto)
                              ──→ sessionLoader()
                                  - Parse cookie
                                  - Load from DB
                                  - Check expiry
                              ──→ Check expiry:
                                  - Yes → 401
                                  - No → extend + continue
                              ──→ requireAuth() passes
                              ──→ getMovies()
                              ──→ Send Movies[] +
                                  new Set-Cookie

Receive Set-Cookie
Update state
Display editor
```

### Public Ranking

```
Frontend                          Backend
────────                          ───────
GET /api/public/ranking
(no cookie)
                              ──→ No auth check
                              ──→ Query Movies ordered by rank
                              ──→ Return title, poster, rank only
                              ──→ Send 200

Display read-only list
```

---

## 🔌 Dependencies Integration

### Exemple avec `express-session` + `sqlite3` store

```typescript
import session from 'express-session';
import SqliteStore from 'connect-sqlite3'(session);

app.use(session({
  store: new SqliteStore({ db: 'sessions.db' }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
  },
}));
```

### Ou lightweight custom (Prisma + bcryptjs)

+ Contrôle total
+ Pas de dépendance session lourde
- Plus de code à écrire

**Voir 05-SECURITY.md pour détails complets.**

---

## 📦 Folder Structure POST-implementation

```
app/server/
├── src/
│   ├── index.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── session.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── public.ts
│   │   └── movies.ts
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── publicController.ts
│   │   └── movieController.ts
│   └── utils/
│       ├── hash.ts
│       └── session.ts
│   └── (existing files unchanged)
├── prisma/
│   ├── schema.prisma (updated)
│   └── migrations/ (new migration)
└── (rest unchanged)

app/client/src/
├── pages/
│   ├── LoginPage.tsx
│   ├── EditorPage.tsx
│   └── PublicPage.tsx
├── components/
│   ├── ProtectedRoute.tsx
│   ├── PublicRoute.tsx
│   ├── LoginForm.tsx
│   ├── LogoutButton.tsx
│   └── (existing components unchanged)
├── hooks/
│   └── useAuth.ts
├── services/
│   └── authService.ts
├── types/
│   └── auth.ts
└── (rest unchanged)
```

---

**Bilan:**
- Backend: ~400 lines de code (middleware + routes + controllers)
- Frontend: ~500 lines de code (pages + routes + hooks)
- DB: 2 nouvelles tables (User, Session)

**Prêt pour le schéma DB?** → Voir [02-DATABASE-SCHEMA.md](02-DATABASE-SCHEMA.md)
