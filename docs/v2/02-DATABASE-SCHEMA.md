# V2 - Database Schema

## 📊 Prisma Schema Complet

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// ============ USER MANAGEMENT ============

model User {
  id        Int       @id @default(autoincrement())
  /// Hashed password (bcrypt)
  password  String
  
  sessions  Session[]
  
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  @@map("users")
}

model Session {
  id              String    @id @default(uuid())
  userId          Int
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  /// When session expires (NOW + 14 days at creation, reset on activity)
  expiresAt       DateTime
  
  /// Last time this session was used (for sliding window)
  lastActivityAt  DateTime  @default(now())
  
  createdAt       DateTime  @default(now())
  
  @@index([userId])
  @@index([expiresAt])
  @@map("sessions")
}

// ============ EXISTING MODELS (unchanged) ============

model Movie {
  id              Int       @id @default(autoincrement())
  tmdbId          Int       @unique
  title           String
  posterUrl       String?
  directorName    String?
  releaseDate     String?
  synopsis        String?
  
  /// Ranking position (lower = better)
  rank            Int       @default(0)
  
  lastWatchedAt   DateTime?
  reviewText      String?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([rank])
  @@map("movies")
}
```

---

## 📝 Migration Prisma

### Step 1: Générer migration

```bash
npx prisma migrate dev --name add_auth_system
```

Output:
```
✔ Prisma Migrate created the following migration without detecting schema drift:
  
✔ Created migrations/202604061430_add_auth_system/migration.sql
✔ Run `npx prisma db push` to update your database
```

### Step 2: Migration SQL généré

File: `prisma/migrations/202604061430_add_auth_system/migration.sql`

```sql
-- CreateTable users
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable sessions
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "lastActivityAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
);

-- CreateIndex sessions_userId_idx
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex sessions_expiresAt_idx
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- Initial: Create default admin user
INSERT INTO "users" (id, password, createdAt, updatedAt)
VALUES (1, '$2b$10$PLACEHOLDER_HASH', datetime('now'), datetime('now'));
```

**⚠️ Important:** Le `password` sera défini après création via seed script ou directement au login.

---

## 🌱 Seed Script (Premier utilisateur)

File: `prisma/seed.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Vérifier qu'aucun user n'existe
  const existingUser = await prisma.user.findFirst();
  if (existingUser) {
    console.log('User already exists, skipping seed.');
    return;
  }

  // Créer le premier admin
  // TODO: À REMPLACER par le password réel avant première utilisation
  const hashedPassword = await bcryptjs.hash('CHANGE_ME_LATER', 10);

  const user = await prisma.user.create({
    data: {
      password: hashedPassword,
    },
  });

  console.log('✅ Created initial admin user:', user.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Utilisation

```bash
# Ajouter à package.json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}

# Exécuter après migration
npx prisma db seed
```

---

## 🥵 Queries Fréquentes (Prisma Client)

### Créer une session

```typescript
const session = await prisma.session.create({
  data: {
    userId: 1, // Only one user
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    // lastActivityAt defaults to now()
  },
});
```

### Charger + valider session

```typescript
const session = await prisma.session.findUnique({
  where: { id: sessionId },
});

if (!session || session.expiresAt < new Date()) {
  throw new Error('Session expired');
}
```

### Étendre session (gliding)

```typescript
const updated = await prisma.session.update({
  where: { id: sessionId },
  data: {
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    lastActivityAt: new Date(),
  },
});
```

### Trouver user

```typescript
const user = await prisma.user.findUnique({
  where: { id: 1 }, // Always 1 (single admin)
});
```

### Détruire session (logout)

```typescript
await prisma.session.delete({
  where: { id: sessionId },
});
```

### Cleanup: Supprimer sessions expirées

```typescript
// À exécuter régulièrement (cron job)
await prisma.session.deleteMany({
  where: {
    expiresAt: {
      lt: new Date(), // Less than now
    },
  },
});
```

---

## 📋 Schéma Comparatif

| Feature | V1 | V2 |
| --- | --- | --- |
| User table | ❌ | ✅ |
| Session table | ❌ | ✅ |
| Movie table | ✅ | ✅ (unchanged) |
| User indexes | N/A | `PK(id)` |
| Session indexes | N/A | `FK(userId), IX(expiresAt)` |
| Movie indexes | ✓ (rank) | ✓ (unchanged) |

---

## 🔧 Maintenance

### Vérifier intégrité DB

```bash
# SQLite CLI
sqlite3 app/server/prisma/dev.db

# Inside sqlite prompt:
.tables
> sessions  users  movies

SELECT COUNT(*) FROM sessions;
SELECT COUNT(*) FROM users;
```

### Reset complet

```bash
# Delete DB + recreate
rm app/server/prisma/dev.db
npx prisma migrate deploy
npx prisma db seed
```

---

## ✅ Checklist Migration

- [ ] Exécuter `npx prisma migrate dev --name add_auth_system`
- [ ] Créer `prisma/seed.ts`
- [ ] Ajouter `prisma.seed` à `package.json`
- [ ] Exécuter `npx prisma db seed`
- [ ] Vérifier tables créées: `sqlite3 prisma/dev.db ".tables"`
- [ ] Vérifier User row 1 existe: `SELECT * FROM users WHERE id=1;`
- [ ] Ajouter password réel (voir 05-SECURITY.md)

---

**Prêt pour les endpoints API?** → Voir [03-API-SPECIFICATION.md](03-API-SPECIFICATION.md)
