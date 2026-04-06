# V2 - Deployment Checklist

## ✅ Pre-Deployment Validation

### Backend Code Quality

- [ ] TypeScript compiles without errors
  ```bash
  cd app/server && npm run build
  ```
  Expected: No errors, output in `dist/src/index.js`

- [ ] No unused imports
  ```bash
  npm run lint  # If eslint configured
  ```

- [ ] Password hashing working
  ```bash
  node -e "
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('test123', 10);
  console.log('Hash:', hash);
  const valid = bcrypt.compareSync('test123', hash);
  console.log('Valid:', valid);
  "
  ```
  Expected: `Valid: true`

- [ ] Database migration successful
  ```bash
  sqlite3 app/server/prisma/dev.db '.schema users'
  ```
  Expected: Shows users table schema

- [ ] Seed script ran successfully
  ```bash
  sqlite3 app/server/prisma/dev.db "SELECT COUNT(*) FROM users;"
  ```
  Expected: `1`

### Frontend Code Quality

- [ ] TypeScript compiles without errors
  ```bash
  cd app/client && npm run build
  ```
  Expected: No errors, output in `dist/`

- [ ] React Router working locally
  ```bash
  npm run preview
  # Test navigation in browser
  ```
  Expected: Routes load correctly

- [ ] API calls use correct base URL
  ```bash
  grep -r "VITE_API_BASE_URL" src/
  ```
  Expected: Found in authService.ts and configured in .env

- [ ] Credentials included in fetch
  ```bash
  grep -r "credentials" src/
  ```
  Expected: `credentials: 'include'` on auth endpoints

### Environment Variables

**Backend (.env)**
```
DATABASE_URL="file:./prisma/dev.db"
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://<FRONTEND_DOMAIN>
TMDB_API_KEY=<valid_key>
```

Validation:
```bash
# Ensure all required vars are set
grep -E "^[A-Z_]+=" app/server/.env
```

**Frontend (.env.production)**
```
VITE_API_BASE_URL=https://<API_DOMAIN>
```

Validation:
```bash
cat app/client/.env.production
```

---

## 🔐 Security Pre-Flight

### Password Security

- [ ] Admin password is strong (12+ chars, mixed case, numbers, special)
- [ ] Password never committed to git
  ```bash
  git log --all --full-history -- app/server/.env | grep password
  ```
  Expected: (no results, or only references to env vars)

- [ ] Password regenerated after exposure in development
  ```bash
  # Update via seed or direct DB manipulation
  sqlite3 app/server/prisma/dev.db "
  UPDATE users SET password = '<new_hash>' WHERE id = 1;
  "
  ```

### Cookie Security

- [ ] HttpOnly flag enabled
  ```bash
  grep -A5 "res.cookie.*sessionId" app/server/src/controllers/authController.ts
  ```
  Expected: Contains `httpOnly: true`

- [ ] Secure flag for production
  ```bash
  grep "NODE_ENV === 'production'" app/server/src/middleware/session.ts
  ```
  Expected: Cookie secure set based on NODE_ENV

- [ ] SameSite=strict enabled
  ```bash
  grep "sameSite" app/server/src/controllers/authController.ts
  ```
  Expected: `sameSite: 'strict'`

### Session Security

- [ ] Session expiration implemented
  ```bash
  grep -A2 "getSessionExpiry" app/server/src/utils/session.ts
  ```
  Expected: Returns NOW + 14 days

- [ ] Session cleanup cron running (optional)
  ```bash
  grep -A10 "setInterval" app/server/src/index.ts
  ```
  Expected: Deletes expired sessions hourly (or on startup)

### HTTPS/TLS

- [ ] SSL certificates valid
  ```bash
  sudo openssl s_client -connect <API_DOMAIN>:443 < /dev/null
  ```
  Expected: Shows certificate info, no errors

- [ ] Auto-renewal configured
  ```bash
  sudo certbot renew --dry-run
  ```
  Expected: `Cert not yet due for renewal`

- [ ] Nginx redirects HTTP → HTTPS
  ```bash
  curl -I http://<DOMAIN>/
  ```
  Expected: 301 or 302 redirect to https://

---

## 🧪 Local Testing Checklist

### Backend API Tests

**POST /api/auth/login (success)**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"YOUR_PASSWORD"}' \
  -c cookies.txt \
  -v
```
Expected: 200, `ok: true`, Set-Cookie header

**POST /api/auth/login (failure - wrong password)**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"wrong"}' \
  -v
```
Expected: 401, `error: "Invalid password"`

**GET /api/auth/me (with session)**
```bash
curl http://localhost:4000/api/auth/me \
  -b cookies.txt \
  -v
```
Expected: 200, `ok: true`, userId returned

**GET /api/auth/me (without session)**
```bash
curl http://localhost:4000/api/auth/me
```
Expected: 401, `error: "Not authenticated"`

**POST /api/auth/logout**
```bash
curl -X POST http://localhost:4000/api/auth/logout \
  -b cookies.txt \
  -v
```
Expected: 200, `ok: true`, Set-Cookie with Max-Age=0

**GET /api/public/ranking (no auth required)**
```bash
curl http://localhost:4000/api/public/ranking
```
Expected: 200, array of movies with id/title/posterUrl/rank only

**PATCH /api/movies/:id (protected)**
```bash
# Without session
curl -X PATCH http://localhost:4000/api/movies/1 \
  -H "Content-Type: application/json" \
  -d '{"rank":5}'
```
Expected: 401, `error: "Not authenticated"`

```bash
# With session
curl -X PATCH http://localhost:4000/api/movies/1 \
  -H "Content-Type: application/json" \
  -d '{"rank":5}' \
  -b cookies.txt
```
Expected: 200, movie updated

### Frontend UI Tests

**Login Page**
- [ ] Loads without errors
- [ ] Password field focused by default
- [ ] Submit button disabled while loading
- [ ] Error message shown for invalid password
- [ ] Link to public view available

**Editor Page (Protected)**
- [ ] Redirects to /login if not authenticated
- [ ] Shows header with logout button
- [ ] Existing movie list displays
- [ ] Can add movies (with valid TMDB API key)
- [ ] Can edit movies
- [ ] Can reorder movies

**Public Page**
- [ ] Accessible without login
- [ ] Shows all movies in ranking order
- [ ] No edit/delete buttons visible
- [ ] Poster images load correctly
- [ ] Works on desktop and mobile

**Logout**
- [ ] Clicking logout clears session
- [ ] Redirects to /login
- [ ] Cannot access editor after logout

---

## 🚀 Production Deployment Steps

### 1. Backup Existing Data (V1)

```bash
ssh deploy@<VPS_IP>

# Backup current database
cp /var/www/movies/app/server/prisma/dev.db \
   /var/www/movies/app/server/prisma/dev.db.backup.v1

# Backup current frontend build
cp -r /var/www/movies/app/client/dist \
   /var/www/movies/app/client/dist.backup.v1
```

### 2. Update Code from Git

```bash
cd /var/www/movies

# Verify we're on v2 branch
git branch
# Expected: * v2

# Pull latest
git pull origin v2
```

### 3. Install Backend Dependencies

```bash
cd /var/www/movies/app/server

npm install
npm run build

# Verify build output
ls -la dist/src/index.js
```

### 4. Run Database Migrations

```bash
cd /var/www/movies/app/server

# Run Prisma migrations
npx prisma migrate deploy

# Verify migrations
sqlite3 prisma/dev.db ".tables"
# Expected: movies, sessions, users

# Seed initial user
npx prisma db seed
```

### 5. Update Password (if needed)

```bash
# If using seed with placeholder, update password now:
node -e "
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('YOUR_REAL_PASSWORD', 10);
console.log('Hash: ' + hash);
"

# Copy hash and update in DB:
sqlite3 /var/www/movies/app/server/prisma/dev.db \
  "UPDATE users SET password = '<hash>' WHERE id = 1;"
```

### 6. Update Backend Environment

```bash
# Edit backend .env
nano /var/www/movies/app/server/.env

# Ensure these are set CORRECTLY:
# DATABASE_URL="file:./prisma/dev.db"
# PORT=4000
# NODE_ENV=production
# CORS_ORIGIN=https://<FRONTEND_DOMAIN>
# TMDB_API_KEY=<valid_key>
```

### 7. Install Frontend Dependencies

```bash
cd /var/www/movies/app/client

npm install

# Set production env var
export VITE_API_BASE_URL=https://<API_DOMAIN>

npm run build

# Verify build
ls -la dist/index.html
```

### 8. Verify File Permissions

```bash
# Ensure deploy user owns everything
sudo chown -R deploy:deploy /var/www/movies

# Check permissions
ls -la /var/www/movies/app/server/prisma/dev.db
# Expected: -rw-r--r-- deploy deploy
```

### 9. Restart Backend Process

```bash
# Restart PM2 process with updated env
pm2 reload movies-api --update-env
# or
pm2 restart movies-api --update-env

# Verify process running
pm2 list

# Check logs
pm2 logs movies-api --lines 20
```

### 10. Test Backend Health

```bash
# Local test
curl http://127.0.0.1:4000/api/health

# Public test (through Nginx)
curl -I https://<API_DOMAIN>/api/health
# Expected: 200 OK
```

### 11. Update Frontend Being Served

```bash
# Copy frontend build to Nginx root
sudo cp -r /var/www/movies/app/client/dist/* \
  /var/www/movies/app/client/dist/

# Verify index.html exists
ls -la /var/www/movies/app/client/dist/index.html

# Check Nginx config points to correct path
grep "root" /etc/nginx/sites-available/movies-front
```

### 12. Reload Nginx

```bash
# Test config
sudo nginx -t
# Expected: "test is successful"

# Reload
sudo systemctl reload nginx

# Verify
sudo systemctl status nginx
```

### 13. Test in Browser

```
https://<FRONTEND_DOMAIN>/          → Should show login form
https://<API_DOMAIN>/api/health     → Should return {"ok":true}
https://<FRONTEND_DOMAIN>/public    → Should show ranking
```

Try login with password → should work.

### 14. Monitor Logs

```bash
# Backend
pm2 logs movies-api --lines 50

# Nginx access log
tail -f /var/log/nginx/access.log |grep "<API_DOMAIN>\|<FRONTEND_DOMAIN>"

# Nginx error log
tail -f /var/log/nginx/error.log
```

---

## 🔍 Post-Deployment Validation

### Smoke Tests

- [ ] Login works
  ```bash
  # From your computer
  curl -X POST https://<API_DOMAIN>/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"password":"YOUR_PASSWORD"}' \
    -c cookies.txt
  # Expected: 200 with cookie
  ```

- [ ] Auth session valid
  ```bash
  curl https://<API_DOMAIN>/api/auth/me -b cookies.txt
  # Expected: 200 with userId
  ```

- [ ] Public ranking accessible
  ```bash
  curl https://<API_DOMAIN>/api/public/ranking
  # Expected: 200 with movies array
  ```

- [ ] Frontend loads
  ```bash
  curl -I https://<FRONTEND_DOMAIN>/
  # Expected: 200 OK
  ```

- [ ] HTTPS certificates valid
  ```bash
  curl -I https://<FRONTEND_DOMAIN>/ | grep "Server:"
  curl -I https://<API_DOMAIN>/api/health | grep "Server:"
  ```

### Rollback Plan

If deployment fails:

1. **Stop bad process**
   ```bash
   pm2 stop movies-api
   ```

2. **Revert code**
   ```bash
   cd /var/www/movies
   git checkout main
   ```

3. **Restore database (if needed)**
   ```bash
   cp /var/www/movies/app/server/prisma/dev.db.backup.v1 \
      /var/www/movies/app/server/prisma/dev.db
   ```

4. **Restore frontend**
   ```bash
   sudo rm -rf /var/www/movies/app/client/dist
   sudo cp -r /var/www/movies/app/client/dist.backup.v1 \
      /var/www/movies/app/client/dist
   ```

5. **Restart services**
   ```bash
   npm install
   pm2 start movies-api
   sudo systemctl reload nginx
   ```

---

## 📋 Final Checklist

**Before Deployment:**
- [ ] All tests pass locally
- [ ] No secrets in git history
- [ ] Password is strong and documented
- [ ] Backend .env production-ready
- [ ] Frontend .env.production correct
- [ ] SSL certificates auto-renewing
- [ ] Backups created

**After Deployment:**
- [ ] Login endpoint works
- [ ] Session management working
- [ ] Public view accessible
- [ ] Protected endpoints returning 401 without auth
- [ ] Logs show no errors
- [ ] Performance acceptable
- [ ] Mobile experience smooth

**Post-Go-Live (First Week):**
- [ ] Monitor error logs daily
- [ ] Verify session cleanup running
- [ ] Test login/logout multiple times
- [ ] Check disk space on VPS
- [ ] Confirm SSL auto-renewal setup
- [ ] Document any issues
- [ ] Consider tagging v2.0.0 release when stable

---

## 🐛 Common Issues & Fixes

| Issue | Cause | Solution |
| --- | --- | --- |
| 401 on login | Wrong password or DB seed failed | Verify user in DB, reseed |
| Session not persisting | Cookie flags wrong or CORS issue | Check httpOnly/Secure/SameSite |
| Public view blank | API returning no movies | Verify movies in DB, check query |
| Frontend won't build | Missing env var | Set VITE_API_BASE_URL before build |
| PM2 won't start | Wrong path or port in use | Check config, verify dist/src/index.js exists |
| Nginx 502 | Backend not responding | Check PM2, verify health endpoint |

---

**💚 V2 is ready to deploy!** Follow the steps above and monitor logs carefully.
