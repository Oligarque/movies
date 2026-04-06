# V2 - Implementation Plan

## 🎯 5-Phase Implementation Strategy

```
Phase 1: Backend Preparation (Database + Types)
   ↓
Phase 2: Backend Authentication (Auth endpoints + Middleware)
   ↓
Phase 3: Backend Public API (Public ranking endpoint)
   ↓
Phase 4: Frontend Integration (Auth UI + Routes + Pages)
   ↓
Phase 5: Testing & Deployment (Local testing + Production)
```

---

## Phase 1: Backend Preparation (2-3 heures)

### Task 1.1: Install Dependencies
**Time:** 30 min

```bash
cd app/server
npm install bcryptjs cookie-parser express-rate-limit
npm install --save-dev @types/express-rate-limit
```

**Files Modified:** `package.json`

### Task 1.2: Update Prisma Schema
**Time:** 30 min

Create new `User` and `Session` models in `prisma/schema.prisma` (see 02-DATABASE-SCHEMA.md).

**Files Modified:** `app/server/prisma/schema.prisma`

### Task 1.3: Create & Run Migration
**Time:** 30 min

```bash
cd app/server
npx prisma migrate dev --name add_auth_system
```

**Files Created:**
- `app/server/prisma/migrations/{timestamp}_add_auth_system/migration.sql`

### Task 1.4: Create Seed Script
**Time:** 30 min

Create `app/server/prisma/seed.ts` with initial admin user (see 02-DATABASE-SCHEMA.md).

Update `package.json`:
```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

Run seed:
```bash
npx prisma db seed
```

**Files Created:** `app/server/prisma/seed.ts`

### Task 1.5: Create Utility Functions
**Time:** 45 min

**File:** `app/server/src/utils/hash.ts`
```typescript
import bcryptjs from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 10);
}

export async function verifyPassword(
  plain: string,
  hashed: string
): Promise<boolean> {
  return bcryptjs.compare(plain, hashed);
}
```

**File:** `app/server/src/utils/session.ts`
```typescript
export function getSessionExpiry(): Date {
  return new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
}

export function isSessionExpired(expiresAt: Date): boolean {
  return expiresAt < new Date();
}
```

**Files Created:**
- `app/server/src/utils/hash.ts`
- `app/server/src/utils/session.ts`

---

## Phase 2: Backend Authentication (3-4 heures)

### Task 2.1: Create Auth Middleware
**Time:** 1 hour

**File:** `app/server/src/middleware/session.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { getSessionExpiry, isSessionExpired } from '../utils/session';

const prisma = new PrismaClient();

declare global {
  namespace Express {
    interface Request {
      session?: any;
    }
  }
}

export async function sessionLoader(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.sessionId;
  
  if (sessionId) {
    try {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
      });
      
      if (session && !isSessionExpired(session.expiresAt)) {
        req.session = session;
        
        // Extend session (sliding window)
        await prisma.session.update({
          where: { id: sessionId },
          data: {
            expiresAt: getSessionExpiry(),
            lastActivityAt: new Date(),
          },
        });
        
        // Update cookie with new expiry
        res.cookie('sessionId', sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 14 * 24 * 60 * 60 * 1000,
          path: '/api',
        });
      } else if (session) {
        // Session expired - delete it
        await prisma.session.delete({ where: { id: sessionId } });
      }
    } catch (error) {
      console.error('Session loader error:', error);
    }
  }
  
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}
```

**File:** `app/server/src/middleware/auth.ts` (alternate naming)

**Files Created:** `app/server/src/middleware/session.ts`

### Task 2.2: Create Auth Controller
**Time:** 1 hour

**File:** `app/server/src/controllers/authController.ts`

```typescript
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyPassword, hashPassword } from '../utils/hash';
import { getSessionExpiry } from '../utils/session';

const prisma = new PrismaClient();

export const authController = {
  async login(req: Request, res: Response) {
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ error: 'Password required' });
      }
      
      // Get the single admin user (id = 1)
      const user = await prisma.user.findUnique({
        where: { id: 1 },
      });
      
      if (!user) {
        return res.status(500).json({ error: 'System error' });
      }
      
      // Verify password
      const validPassword = await verifyPassword(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid password' });
      }
      
      // Create session
      const session = await prisma.session.create({
        data: {
          userId: user.id,
          expiresAt: getSessionExpiry(),
        },
      });
      
      // Set secure cookie
      res.cookie('sessionId', session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 14 * 24 * 60 * 60 * 1000,
        path: '/api',
      });
      
      return res.status(200).json({
        ok: true,
        userId: user.id,
        sessionId: session.id,
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Login failed' });
    }
  },

  async logout(req: Request, res: Response) {
    try {
      if (req.session) {
        await prisma.session.delete({
          where: { id: req.session.id },
        });
      }
      
      res.clearCookie('sessionId', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api',
      });
      
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({ error: 'Logout failed' });
    }
  },

  async getMe(req: Request, res: Response) {
    if (!req.session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    return res.status(200).json({
      ok: true,
      userId: req.session.userId,
      sessionId: req.session.id,
    });
  },
};
```

**Files Created:** `app/server/src/controllers/authController.ts`

### Task 2.3: Create Auth Routes
**Time:** 45 min

**File:** `app/server/src/routes/auth.ts`

```typescript
import { Router } from 'express';
import { authController } from '../controllers/authController';
import { requireAuth } from '../middleware/session';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limit login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, try again later',
});

router.post('/login', loginLimiter, authController.login);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', authController.getMe);

export default router;
```

**Files Created:** `app/server/src/routes/auth.ts`

### Task 2.4: Update Main Index.ts
**Time:** 45 min

Update `app/server/src/index.ts` to:
1. Import middleware
2. Import auth routes
3. Apply sessionLoader middleware
4. Mount auth routes

```typescript
import cookieParser from 'cookie-parser';
import { sessionLoader } from './middleware/session';
import authRoutes from './routes/auth';

// ... existing code ...

app.use(cookieParser());
app.use(sessionLoader); // Apply to all routes

// Auth routes
app.use('/api/auth', authRoutes);

// Existing routes with requireAuth added to protected endpoints
// (see Task 2.5)
```

**Files Modified:** `app/server/src/index.ts`

### Task 2.5: Protect Existing Endpoints
**Time:** 30 min

Add `requireAuth` middleware to mutation endpoints:

```typescript
import { requireAuth } from './middleware/session';

// Existing POST/PATCH endpoints
app.post('/api/movies', requireAuth, movieController.addMovie);
app.patch('/api/movies/:id', requireAuth, movieController.updateMovie);
app.patch('/api/movies/reorder', requireAuth, movieController.reorderMovies);
```

**Files Modified:** `app/server/src/index.ts`

---

## Phase 3: Backend Public API (1-2 heures)

### Task 3.1: Create Public Controller
**Time:** 30 min

**File:** `app/server/src/controllers/publicController.ts`

```typescript
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const publicController = {
  async getRanking(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const movies = await prisma.movie.findMany({
        select: {
          id: true,
          title: true,
          posterUrl: true,
          rank: true,
        },
        orderBy: { rank: 'asc' },
        take: limit,
        skip: offset,
      });
      
      const total = await prisma.movie.count();
      
      return res.status(200).json({
        movies,
        total,
      });
    } catch (error) {
      console.error('Get ranking error:', error);
      return res.status(500).json({ error: 'Failed to fetch ranking' });
    }
  },
};
```

**Files Created:** `app/server/src/controllers/publicController.ts`

### Task 3.2: Create Public Routes
**Time:** 15 min

**File:** `app/server/src/routes/public.ts`

```typescript
import { Router } from 'express';
import { publicController } from '../controllers/publicController';

const router = Router();

router.get('/ranking', publicController.getRanking);

export default router;
```

**Files Created:** `app/server/src/routes/public.ts`

### Task 3.3: Mount Public Routes
**Time:** 10 min

Update `app/server/src/index.ts`:

```typescript
import publicRoutes from './routes/public';

app.use('/api/public', publicRoutes);
```

**Files Modified:** `app/server/src/index.ts`

---

## Phase 4: Frontend Integration (3-4 heures)

### Task 4.1: Install Dependencies
**Time:** 15 min

```bash
cd app/client
npm install react-router-dom
```

### Task 4.2: Create Auth Types
**Time:** 15 min

**File:** `app/client/src/types/auth.ts`

```typescript
export interface AuthUser {
  userId: number;
}

export interface AuthResponse {
  ok: boolean;
  userId: number;
  sessionId: string;
}

export interface PublicMovie {
  id: number;
  title: string;
  posterUrl?: string;
  rank: number;
}
```

**Files Created:** `app/client/src/types/auth.ts`

### Task 4.3: Create Auth Service
**Time:** 30 min

**File:** `app/client/src/services/authService.ts`

(See 04-FRONTEND-DESIGN.md)

**Files Created:** `app/client/src/services/authService.ts`

### Task 4.4: Create useAuth Hook
**Time:** 30 min

**File:** `app/client/src/hooks/useAuth.ts`

(See 04-FRONTEND-DESIGN.md with Context setup)

**Files Created:** `app/client/src/hooks/useAuth.ts`

### Task 4.5: Create Route Guards
**Time:** 30 min

**Files Created:**
- `app/client/src/components/ProtectedRoute.tsx`
- `app/client/src/components/PublicRoute.tsx`

(See 04-FRONTEND-DESIGN.md)

### Task 4.6: Create Pages
**Time:** 1.5 hours

**Files Created:**
- `app/client/src/pages/LoginPage.tsx`
- `app/client/src/pages/EditorPage.tsx`
- `app/client/src/pages/PublicPage.tsx`

(See 04-FRONTEND-DESIGN.md)

### Task 4.7: Create Auth Components
**Time:** 45 min

**Files Created:**
- `app/client/src/components/LoginForm.tsx`
- `app/client/src/components/LogoutButton.tsx`

(See 04-FRONTEND-DESIGN.md)

### Task 4.8: Update App.tsx Router
**Time:** 30 min

**File:** `app/client/src/App.tsx`

(Replace with new router from 04-FRONTEND-DESIGN.md)

**Files Modified:** `app/client/src/App.tsx`

---

## Phase 5: Testing & Deployment (2-3 heures)

### Task 5.1: Local Backend Testing
**Time:** 45 min

```bash
cd app/server

# Build
npm run build

# Start dev server
npm run dev

# Test endpoints with curl
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"YOUR_PASSWORD"}' \
  -c cookies.txt

curl http://localhost:4000/api/auth/me \
  -b cookies.txt

curl http://localhost:4000/api/public/ranking
```

**Checklist:**
- [ ] POST /auth/login returns 200 + cookie
- [ ] GET /auth/me returns 200 + valid session
- [ ] GET /public/ranking returns movies without auth
- [ ] PATCH /api/movies requires auth (401 without session)

### Task 5.2: Local Frontend Testing
**Time:** 45 min

```bash
cd app/client

# Build
npm run build

# Test with dev server (or preview)
npm run preview

# In browser, test:
1. Load app → redirect /login
2. Enter password → login works
3. Redirect / → show editor
4. Click logout → redirect /login
5. Browse /public → see ranking
```

**Checklist:**
- [ ] Login redirects non-authed users
- [ ] Logout clears session
- [ ] Public page accessible without login
- [ ] Edit/add buttons disappear in public view

### Task 5.3: Integration Testing
**Time:** 30 min

Test frontend ↔ backend integration locally:

1. Start backend on :4000
2. Frontend .env points to localhost:4000
3. Test full flow: login → edit → logout

### Task 5.4: Production Build & Deploy
**Time:** 1 hour

```bash
# Backend
cd app/server
npm run build
# Commit and push to v2 branch

# Frontend
cd app/client
VITE_API_BASE_URL=https://<API_DOMAIN> npm run build
# Output goes to dist/

# On VPS:
cd /var/www/movies
git pull origin v2
cd app/server && npm install && npm run build
cd ../client && npm install && npm run build
pm2 restart movies-api --update-env
sudo systemctl reload nginx

# Verify in browser:
# https://<FRONTEND_DOMAIN>/ → login form
# https://<API_DOMAIN>/api/health → 200
# https://<FRONTEND_DOMAIN>/public → public ranking
```

**Checklist:**
- [ ] Backend build succeeds
- [ ] Frontend build succeeds
- [ ] PM2 process restarted
- [ ] Nginx reloaded
- [ ] Health checks pass
- [ ] Login works in production
- [ ] Public view works in production

---

## Timeline Summary

| Phase | Tasks | Hours | Start | End |
| --- | --- | --- | --- | --- |
| 1 | DB + Types | 2.5 | Day 1, 09:00 | Day 1, 11:30 |
| 2 | Auth Backend | 3.5 | Day 1, 12:00 | Day 1, 15:30 |
| 3 | Public API | 1.5 | Day 1, 16:00 | Day 1, 17:30 |
| 4 | Frontend | 4 | Day 2, 09:00 | Day 2, 13:00 |
| 5 | Testing + Deploy | 2.5 | Day 2, 13:30 | Day 2, 16:00 |
| **Total** | | **13.5 hours** | | |

**Realistic Timeline (with breaks & debugging):** 2 full days (16 hours)

---

## Risk Mitigation

| Risk | Mitigation |
| --- | --- |
| Password reset needed | Keep test password handy, use seed script |
| Frontend CORS errors | Check CORS_ORIGIN env var, credentials: 'include' |
| Session not persisting | Verify cookie flags, check browser DevTools Cookies |
| Build failures | Run `npm run build` locally before deploy |
| Nginx config issues | Test with `nginx -t` before reload |

---

**Prêt pour le checklist de déploiement?** → Voir [07-DEPLOYMENT-CHECKLIST.md](07-DEPLOYMENT-CHECKLIST.md)
