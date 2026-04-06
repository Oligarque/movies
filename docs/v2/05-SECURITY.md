# V2 - Security Guidelines

## 🔐 Password Management

### Hashing: bcryptjs

**Installation:**
```bash
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

**Password Hashing (on login setup):**

```typescript
import bcryptjs from 'bcryptjs';

// When creating/resetting admin password
async function hashPassword(password: string): Promise<string> {
  // Salt rounds = 10 (balance: security vs perf)
  // Higher = more secure but slower
  return bcryptjs.hash(password, 10);
}

// Store in DB:
const hashedPassword = await hashPassword('your_secret_password');
await prisma.user.update({
  where: { id: 1 },
  data: { password: hashedPassword },
});
```

**Password Verification (on login):**

```typescript
async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return bcryptjs.compare(plainPassword, hashedPassword);
}

// In controller:
const user = await prisma.user.findUnique({ where: { id: 1 } });
const passwordValid = await verifyPassword(password, user.password);

if (!passwordValid) {
  return res.status(401).json({ error: 'Invalid password' });
}
```

**Password Policy (Optional but Recommended):**
```typescript
function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

---

## 🍪 Cookie Security

### Secure Cookie Flags

```typescript
// In middleware or session setup:
app.use(cookieParser()); // npm install cookie-parser

// Manually set secure cookie on login:
function setSecureSessionCookie(res: Response, sessionId: string): void {
  res.cookie('sessionId', sessionId, {
    // ✅ HttpOnly: Not accessible via JavaScript (prevent XSS theft)
    httpOnly: true,
    
    // ✅ Secure: Only sent over HTTPS (prevent man-in-the-middle)
    secure: process.env.NODE_ENV === 'production',
    
    // ✅ SameSite: Prevent CSRF attacks
    // 'Strict': Cookie sent only in same-site requests
    // 'Lax': Cookie sent on top-level navigations (recommended)
    sameSite: 'strict',
    
    // ✅ Max-Age: 14 days (matches session expiration)
    maxAge: 14 * 24 * 60 * 60 * 1000,
    
    // ✅ Path: Only sent for /api paths
    path: '/api',
  });
}

// Clear cookie on logout:
function clearSessionCookie(res: Response): void {
  res.clearCookie('sessionId', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api',
  });
}
```

### Environment Check

```typescript
// In .env (backend)
NODE_ENV=production  # Sets secure=true
```

---

## 🛡️ CSRF Protection

### Option 1: SameSite Cookies (Recommended for single-user)
Already handled by `sameSite: 'strict'` above.

### Option 2: CSRF Token (Optional, more robust)

```typescript
// npm install csurf
import csrf from 'csurf';

const csrfProtection = csrf({ cookie: false }); // Using session stored tokens

// GET /api/csrf-token - Provide token to frontend
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ token: req.csrfToken() });
});

// POST endpoints protected:
app.post('/api/auth/login', csrfProtection, authController.login);
app.patch('/api/movies/:id', csrfProtection, requireAuth, movieController.updateMovie);
```

**Frontend (if using CSRF tokens):**
```typescript
// Fetch token on app load
const token = await fetch('/api/csrf-token').then(r => r.json());

// Include in requests
fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': token,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ password }),
});
```

**For single-admin use case:** SameSite cookies alone are sufficient.

---

## 🔒 Session Security

### Secure Session ID Generation

```typescript
// Prisma default uuid() is already cryptographically secure
// @id @default(uuid()) generates random UUIDs

// If you want extra security with custom SessionId token:
import crypto from 'crypto';

function generateSecureSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Use in session creation:
const session = await prisma.session.create({
  data: {
    id: generateSecureSessionId(),
    userId: 1,
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  },
});
```

### Session Timeout Implementation

```typescript
// Middleware to handle expired sessions
export async function sessionValidator(req, res, next) {
  const sessionId = req.cookies?.sessionId;

  if (sessionId) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    // Check if expired
    if (session && session.expiresAt >= new Date()) {
      req.session = session;
      
      // OPTIONAL: Refresh if expiring soon (< 7 days left)
      if (session.expiresAt.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000) {
        await prisma.session.update({
          where: { id: sessionId },
          data: {
            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        });
      }
    } else if (session) {
      // Expired - delete
      await prisma.session.delete({ where: { id: sessionId } });
      clearSessionCookie(res);
    }
  }

  next();
}
```

### Session Cleanup (Cron)

```typescript
// Run every 1 hour to clean expired sessions
setInterval(async () => {
  const deleted = await prisma.session.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
  console.log(`Cleaned up ${deleted.count} expired sessions`);
}, 60 * 60 * 1000);
```

---

## 🚨 Rate Limiting (Optional)

For single-admin use case, simple implementation:

```bash
npm install express-rate-limit
```

```typescript
import rateLimit from 'express-rate-limit';

// Strict limit on login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per windowMs
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/auth/login', loginLimiter, authController.login);
```

---

## 🔍 XSS Prevention

### Frontend Input Sanitization

```typescript
// LoginForm.tsx - already safe (controlled inputs)
<input
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
/>
```

### Backend Output Encoding

```typescript
// All JSON responses are automatically safe
// No need for special encoding

// If rendering HTML (not applicable here):
import DOMPurify from 'dompurify';
const cleanHTML = DOMPurify.sanitize(userInput);
```

### Policy Headers

```typescript
// In index.ts (Express setup)
app.use((req, res, next) => {
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  );
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  next();
});
```

---

## 🛡️ SQL Injection Prevention

**Already handled by Prisma** (parameterized queries):

```typescript
// ✅ Safe - Prisma parameterizes
const user = await prisma.user.findUnique({
  where: { id: userIdFromRequest }, // Validated as number
});

// ❌ NOT using raw SQL
// const result = await prisma.$queryRaw`SELECT * FROM users WHERE id = ${id}`;
```

---

## 📋 Security Checklist (Backend)

- [ ] bcryptjs installed and password hashing working
- [ ] Cookies set with HttpOnly, Secure, SameSite flags
- [ ] Session validator middleware applied before routes
- [ ] requireAuth middleware protects sensitive endpoints
- [ ] Session expiration checked on every request
- [ ] Expired sessions deleted from DB
- [ ] Password validation policy implemented (or simple minLength)
- [ ] /api/auth/me endpoint extends sliding window
- [ ] CSRF protection: SameSite=strict (or CSRF token if paranoid)
- [ ] Rate limiting on /api/auth/login (optional)
- [ ] Error messages don't leak user info (generic "Invalid password")
- [ ] .env has NODE_ENV=production for HTTPS-only cookies
- [ ] All DB queries use Prisma (no raw SQL)

---

## 📋 Security Checklist (Frontend)

- [ ] credentials: 'include' on all fetch requests
- [ ] No passwords stored in localStorage/sessionStorage
- [ ] Login form uses type="password" (browser autocomplete works)
- [ ] Error messages shown to user (password wrong) but not logged
- [ ] HTTPS only in production (enforced by Nginx cert)
- [ ] CSP headers sent from backend

---

## 🚨 Incident Response

### If Password is Compromised

1. Manually reset password in DB:
   ```bash
   sqlite3 app/server/prisma/dev.db
   sqlite> DELETE FROM sessions; -- Force re-login everywhere
   ```

2. Update password:
   ```bash
   node -e "
   const bcrypt = require('bcryptjs');
   const hash = bcrypt.hashSync('NEW_PASSWORD', 10);
   console.log(hash);
   "
   # Copy hash and update in DB
   # sqlite> UPDATE users SET password = '<hash>' WHERE id = 1;
   ```

3. Restart backend and frontend

### If Session is Compromised

1. Delete the session row:
   ```bash
   sqlite3 app/server/prisma/dev.db
   sqlite> DELETE FROM sessions WHERE id = 'compromised_session_id';
   ```

2. User gets logged out automatically on next request

---

## 🔐 Production Deployment Checklist

Before going to production:

- [ ] `.env` has `NODE_ENV=production`
- [ ] Certbot SSL certificates valid (auto-renew enabled)
- [ ] Nginx redirects HTTP → HTTPS
- [ ] CORS_ORIGIN set correctly in backend `.env`
- [ ] VITE_API_BASE_URL set correctly in frontend `.env.production`
- [ ] Password is strong and securely stored (not in git)
- [ ] Session cleanup cron job running
- [ ] Database backups configured
- [ ] PM2 process manager active and configured for restarts
- [ ] Logs monitored for failed login attempts

---

**Prêt pour le plan implémentation?** → Voir [06-IMPLEMENTATION-PLAN.md](06-IMPLEMENTATION-PLAN.md)
