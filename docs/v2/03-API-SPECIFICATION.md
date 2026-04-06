# V2 - API Specification

## 🔐 Authentication Endpoints

### POST /api/auth/login

**Purpose:** Authentifier l'utilisateur et créer une session.

**Request:**
```http
POST /api/auth/login HTTP/1.1
Content-Type: application/json

{
  "password": "your_secret_password"
}
```

**Response (Success - 200):**
```http
HTTP/1.1 200 OK
Set-Cookie: sessionId=uuid-here; HttpOnly; Secure; SameSite=Strict; Max-Age=1209600
Content-Type: application/json

{
  "ok": true,
  "userId": 1,
  "sessionId": "uuid-here"
}
```

**Response (Failure - 401):**
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": "Invalid password"
}
```

**Implementation Notes:**
- Valider format password (non-empty)
- Compare password avec bcrypt hash en DB
- Si OK: créer Session row + envoyer cookie
- Cookie maxAge = 14 jours (Prisma gérera expiresAt)
- Pas de rate-limiting requis pour single-admin use case

---

### POST /api/auth/logout

**Purpose:** Détruire la session et logout.

**Request:**
```http
POST /api/auth/logout HTTP/1.1
Cookie: sessionId=uuid-here
```

**Response (Success - 200):**
```http
HTTP/1.1 200 OK
Set-Cookie: sessionId=; HttpOnly; Secure; SameSite=Strict; Max-Age=0
Content-Type: application/json

{
  "ok": true
}
```

**Response (Failure - 401):**
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": "Not authenticated"
}
```

**Implementation Notes:**
- Charger session depuis cookie
- Supprimer row Session en DB
- Clear cookie (send avec Max-Age=0)

---

### GET /api/auth/me

**Purpose:** Vérifier l'authentification actuelle + étendre session.

**Request:**
```http
GET /api/auth/me HTTP/1.1
Cookie: sessionId=uuid-here
```

**Response (Authenticated - 200):**
```http
HTTP/1.1 200 OK
Set-Cookie: sessionId=uuid-here; HttpOnly; Secure; SameSite=Strict; Max-Age=1209600
Content-Type: application/json

{
  "ok": true,
  "userId": 1,
  "sessionId": "uuid-here"
}
```

**Response (Not Authenticated - 401):**
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": "No valid session"
}
```

**Implementation Notes:**
- Charger session depuis cookie
- Vérifier expiresAt > now()
- Si valid: **ÉTENDRE session** (gliding window)
  - Update expiresAt = NOW + 14 jours
  - Update lastActivityAt = NOW
  - Renvoyer Set-Cookie mis à jour
- Si expired: delete session + send 401

---

## 📺 Protected Endpoints (Existing)

Tous les endpoints existants qui modifient données doivent être protégés:
- `PATCH /api/movies/:id`
- `PATCH /api/movies/reorder`
- `POST /api/movies`

### Authentification Flow

```
1. Frontend envoit request + cookie
2. Middleware sessionLoader()
   - Parse cookie
   - Load Session from DB
   - Validate not expired
3. Middleware requireAuth()
   - Check req.session exists
   - If not: send 401
   - Else: continue
4. Controller executes
```

### PATCH /api/movies/:id

**Before (V1):**
```http
PATCH /api/movies/123 HTTP/1.1
Content-Type: application/json

{
  "lastWatchedAt": "2026-04-06",
  "reviewText": "Great film!",
  "rank": 5
}
```

**After (V2 - Protégé):**
```http
PATCH /api/movies/123 HTTP/1.1
Cookie: sessionId=uuid-here
Content-Type: application/json

{
  "lastWatchedAt": "2026-04-06",
  "reviewText": "Great film!",
  "rank": 5
}
```

Response: Inchangé (200 + updated movie)

Si pas authentifié:
```http
HTTP/1.1 401 Unauthorized

{
  "error": "Not authenticated"
}
```

---

### PATCH /api/movies/reorder

**Before (V1):**
```http
PATCH /api/movies/reorder HTTP/1.1
Content-Type: application/json

{
  "updates": [
    { "id": 1, "rank": 2 },
    { "id": 2, "rank": 1 }
  ]
}
```

**After (V2 - Protégé):**
Même, + cookie requis.

---

### Endpoints NON PROTÉGÉS (V1 inchangés)

- `GET /api/movies` - Lecture seule, peut rester publique
  - Ou protéger pour clarté (user ne voit sa liste que connecté)
  - **Recommandation:** Laisser public (utile pour dev)
- `GET /api/tmdb/search?query=X` - Lecture seule, garder public

---

## 🌐 Public Endpoints

### GET /api/public/ranking

**Purpose:** Ranking public en read-only (pas d'authentification requise).

**Request:**
```http
GET /api/public/ranking HTTP/1.1
```

**Response (Success - 200):**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "movies": [
    {
      "id": 1,
      "title": "Inception",
      "posterUrl": "https://...",
      "rank": 1
    },
    {
      "id": 2,
      "title": "Interstellar",
      "posterUrl": "https://...",
      "rank": 2
    }
  ],
  "total": 42
}
```

**Query Parameters (optional):**
- `limit=10` - Nombre de films à retourner
- `offset=0` - Pagination offset

**Implementation Notes:**
- Zero authentication required
- Order by `rank ASC`
- Return ONLY: `id`, `title`, `posterUrl`, `rank`
- Pas de: `reviewText`, `directorName`, `synopsis`, `lastWatchedAt`
- Cache possible (30 secondes) pour perf

---

## 🚨 Error Responses

Tous les endpoints doivent respecter ce format d'erreur:

```json
{
  "error": "Descriptive message"
}
```

### Codes HTTP Standard

| Code | Meaning | Example |
| --- | --- | --- |
| 200 | OK | Login success, data returned |
| 400 | Bad Request | Missing password field |
| 401 | Unauthorized | Invalid password, expired session |
| 404 | Not Found | Movie ID doesn't exist |
| 500 | Server Error | DB connection failed |

---

## 🔄 Middleware Pipeline

### Order d'exécution (par requête)

```
1. Express.json()
2. CORS
3. sessionLoader()  ← Parse cookie + load Session
4. requireAuth()    ← Check authenticated (si appliqué à la route)
5. Route handler
```

### Exemple middleware

```typescript
// src/middleware/session.ts
export async function sessionLoader(req, res, next) {
  const sessionId = req.cookies?.sessionId;
  
  if (sessionId) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });
    
    if (session && session.expiresAt > new Date()) {
      // Valid session
      req.session = session;
      
      // Extend (gliding window)
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          lastActivityAt: new Date(),
        },
      });
    }
  }
  
  next();
}

export function requireAuth(req, res, next) {
  if (!req.session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}
```

### Application des routes

```typescript
// Public
app.get('/api/public/ranking', publicController.getRanking);
app.get('/api/movies', movieController.getMovies);
app.get('/api/tmdb/search', movieController.searchTmdb);

// Auth endpoints (no requireAuth, sessionLoader handles)
app.post('/api/auth/login', authController.login);
app.post('/api/auth/logout', requireAuth, authController.logout);
app.get('/api/auth/me', authController.getMe);

// Protected (require auth)
app.post('/api/movies', requireAuth, movieController.addMovie);
app.patch('/api/movies/:id', requireAuth, movieController.updateMovie);
app.patch('/api/movies/reorder', requireAuth, movieController.reorderMovies);
```

---

## 📊 HTTP Status Matrix

| Endpoint | 200 | 400 | 401 | 404 | 500 |
| --- | --- | --- | --- | --- | --- |
| POST /auth/login | ✓ password OK | ✓ missing field | ✓ invalid pwd | | |
| POST /auth/logout | ✓ success | | ✓ no session | | |
| GET /auth/me | ✓ valid session | | ✓ no/expired | | |
| GET /api/public/ranking | ✓ returned |  | | | ✓ DB error |
| PATCH /api/movies/:id | ✓ updated | | ✓ no auth | ✓ ID not found | |
| PATCH /api/movies/reorder | ✓ bulk update | ✓ bad data | ✓ no auth | | |

---

**Prêt pour le frontend?** → Voir [04-FRONTEND-DESIGN.md](04-FRONTEND-DESIGN.md)
