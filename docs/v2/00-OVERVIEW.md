# V2 - Overview

## 🎯 Objectifs V2

Ajouter une **authentification simple** avec **session persistante** et une **vue publique read-only** du ranking.

## 📋 Spécifications fonctionnelles

### 1. Authentification
- **Modèle:** Single admin account (un seul utilisateur)
- **Méthode:** Password-based (formulaire login simple)
- **Sécurité:** Password hashé en bcrypt, jamais en clair
- **État:** Stocké en cookie HttpOnly + session en DB

### 2. Session Management
- **Durée:** 14 jours
- **Expiration:** **Glissante** (reset à chaque requête authentifiée)
  - Exemple: Login à J0 10h → expire à J14 10h
  - Nouvelle action à J5 15h → expire à J19 15h
- **Stockage:** Table `Session` en Prisma (SQLite)

### 3. Vue privée (éditeur)
- **URL:** `/` (root)
- **Accès:** Authentifiés uniquement
- **Fonctionnalités:** Inchangée (add, edit, reorder movies)
- **Comportement:** Redirect `/login` si pas connecté

### 4. Vue publique
- **URL:** `/public`
- **Accès:** Tous (pas d'auth requise)
- **Affichage:** Ranking en read-only
  - `title`, `posterUrl`, `rank` seulement
  - Ordre par `rank` ASC
  - Pas de boutons edit/delete/add
- **Badge:** Petit label "Public View" pour clarifié l'état

### 5. Logout
- **Action:** Détruit la session (DB + cookie)
- **Comportement:** Redirection `/login` après logout

---

## 🧩 Stack inchangé

| Composant | Tech |
| --- | --- |
| Runtime | Node.js 22.x |
| Backend | Express.js 5.2.1 |
| Frontend | React 19.2.4 + Vite 8.0.1 |
| ORM | Prisma 6.18.0 |
| DB | SQLite |
| Process Manager | PM2 |
| Web Server | Nginx |

---

## 📊 Scope v2 vs v1

| Feature | V1 | V2 |
| --- | --- | --- |
| Search TMDB | ✅ | ✅ (inchangé) |
| Add movies | ✅ | ✅ (protected) |
| Edit movies | ✅ | ✅ (protected) |
| Reorder ranking | ✅ | ✅ (protected) |
| Login | ❌ | ✅ |
| Sessions | ❌ | ✅ |
| Logout | ❌ | ✅ |
| Public view | ❌ | ✅ |

---

## 🔄 User Flows

### Flow 1: First visit (no session)
```
GET / → Redirect /login
```
User voit form login, entre le password.

### Flow 2: Login
```
POST /api/auth/login (password)
→ Validate password
→ Create session (DB + cookie)
→ Redirect /
```
Session valide 14j, activate à chaque requête.

### Flow 3: Edit movies (authed)
```
GET / → Display editor
PATCH /api/movies/:id (require auth)
→ Session glissante (expiresAt += 14j)
```

### Flow 4: Public view (no auth)
```
GET /public → Display read-only ranking
```
Aucune restriction, pas de login.

### Flow 5: Logout
```
POST /api/auth/logout
→ Destroy session (DB + cookie)
→ Redirect /login
```

### Flow 6: Session expiry
```
GET /api/auth/me (expired session)
→ 401 Unauthorized
→ Frontend: redirect /login
```

---

## 📅 Timeline implémentation

1. **DB Schema** - Prisma migration
2. **Backend Auth** - Auth endpoints + middleware
3. **Backend Public** - Public ranking endpoint
4. **Frontend Auth** - Login form + state
5. **Frontend Routes** - Protected routes + public page
6. **Testing** - Local validation
7. **Deployment** - Staging + prod

**Estimation:** 3-4 heures (setup + tests)

---

## ⚠️ Dépendances nouvelles

```json
{
  "bcryptjs": "^2.4.3",
  "express-session": "^1.18.0",
  "connect-sqlite3": "^0.9.13"
}
```

Ou lightweight alternative (voir 05-SECURITY.md).

---

## 📝 Conventions

- **Dates:** ISO 8601 (ex: `2026-04-06T10:30:00Z`)
- **Hashing:** bcrypt avec salt rounds = 10
- **Cookies:** HttpOnly, Secure (HTTPS), SameSite=Strict
- **API errors:** Format standard `{ error: "message" }`
- **Auth header:** Cookie-based (pas Bearer token)

---

**Prêt pour l'architecture?** → Voir [01-ARCHITECTURE.md](01-ARCHITECTURE.md)
