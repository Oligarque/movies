# Fiche de deploiement VPS Hostinger (Projet Movies)

Ce document est un runbook complet base sur le deploiement reel du projet.

## 0) Variables a adapter

- IP VPS: `<VPS_IP>`
- Frontend: `<FRONTEND_DOMAIN>`
- API: `<API_DOMAIN>`
- Repo: `<GIT_REPO_URL>`

## 1) Prerequis et choix VPS

Configuration recommandee:
- VPS KVM
- Ubuntu 24.04 LTS
- 2 vCPU
- 4 Go RAM
- 80 Go NVMe

## 2) Initialisation serveur (root)

Connexion:

```bash
ssh root@<VPS_IP>
```

Mise a jour systeme:

```bash
apt update && apt upgrade -y
```

Outils de base:

```bash
apt install -y curl git unzip ufw fail2ban nginx ca-certificates gnupg
```

## 3) Utilisateur deploy + SSH

Creer utilisateur deploy:

```bash
adduser deploy
usermod -aG sudo deploy
id deploy
```

Configurer la cle publique SSH pour deploy:

```bash
mkdir -p /home/deploy/.ssh
nano /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

Test de connexion:

```bash
ssh deploy@<VPS_IP>
```

## 4) Firewall

Depuis la session deploy:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
sudo ufw status
```

## 5) Node.js, PM2, PostgreSQL

Installer Node.js 22:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

Installer PM2:

```bash
sudo npm install -g pm2
pm2 -v
```

Installer PostgreSQL:

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
sudo systemctl status postgresql --no-pager
```

## 6) Base PostgreSQL (optionnel dans l'etat actuel)

Note: le projet actuel est configure en SQLite dans `prisma/schema.prisma`.
La base PostgreSQL peut etre preparee pour une migration future.

Commandes de creation (si besoin):

```bash
sudo -u postgres psql
```

Dans psql:

```sql
CREATE ROLE movies_user LOGIN PASSWORD 'mot_de_passe_fort';
CREATE DATABASE movies OWNER movies_user;
\q
```

## 7) Recuperation du projet

Correction permissions `/var/www` (important, deja rencontre):

```bash
cd ~
sudo mkdir -p /var/www
sudo chown -R deploy:deploy /var/www
```

Clone + install:

```bash
cd /var/www
git clone <GIT_REPO_URL>
cd /var/www/movies
npm --prefix app/server install
npm --prefix app/client install
```

## 8) Configuration backend (.env)

Dans l'etat actuel (SQLite):

```bash
cd /var/www/movies/app/server
cat > .env <<'EOF'
DATABASE_URL="file:./dev.db"
TMDB_API_KEY="TA_CLE_TMDB"
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://<FRONTEND_DOMAIN>
EOF
```

Generer prisma + migrations + build:

```bash
npx prisma generate
npx prisma migrate deploy
npm run build
```

## 9) Demarrage backend PM2

Important: le build sort sur `dist/src/index.js` (pas `dist/index.js`).

```bash
pm2 delete movies-api 2>/dev/null || true
pm2 start "node /var/www/movies/app/server/dist/src/index.js" --name movies-api
pm2 save
pm2 startup
pm2 status
curl -i http://127.0.0.1:4000/api/health
```

## 10) Configuration frontend build

```bash
cd /var/www/movies/app/client
cat > .env.production <<'EOF'
VITE_API_BASE_URL=https://<API_DOMAIN>
VITE_ENABLE_VIRTUALIZED_LIST=false
VITE_VIRTUALIZATION_THRESHOLD=300
EOF
npm run build
```

## 11) Nginx (front + api)

Frontend vhost:

```bash
sudo tee /etc/nginx/sites-available/movies-front >/dev/null <<'EOF'
server {
    listen 80;
    server_name <FRONTEND_DOMAIN>;

    root /var/www/movies/app/client/dist;
    index index.html;

    location / {
        try_files $uri /index.html;
    }
}
EOF
```

API vhost:

```bash
sudo tee /etc/nginx/sites-available/movies-api >/dev/null <<'EOF'
server {
    listen 80;
    server_name <API_DOMAIN>;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
```

Activation + reload:

```bash
sudo ln -sf /etc/nginx/sites-available/movies-front /etc/nginx/sites-enabled/movies-front
sudo ln -sf /etc/nginx/sites-available/movies-api /etc/nginx/sites-enabled/movies-api
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 12) DNS + HTTPS

DNS Hostinger a creer:
- `A <front-subdomain>` -> `<VPS_IP>`
- `A <api-subdomain>` -> `<VPS_IP>`

Verifier propagation:

```bash
dig +short <FRONTEND_DOMAIN> A
dig +short <API_DOMAIN> A
```

Installer certbot et certificats:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d <FRONTEND_DOMAIN> -d <API_DOMAIN>
```

Verifier renouvellement:

```bash
systemctl status certbot.timer --no-pager
sudo certbot renew --dry-run
```

## 13) Verifications finales

```bash
curl -I https://<FRONTEND_DOMAIN>
curl -I https://<API_DOMAIN>/api/health
pm2 status
pm2 logs movies-api --lines 50
```

## 14) Procedure de redeploiement

```bash
cd /var/www/movies
git pull

npm --prefix app/server install
npm --prefix app/client install

cd /var/www/movies/app/server
npx prisma generate
npx prisma migrate deploy
npm run build

cd /var/www/movies/app/client
npm run build

pm2 restart movies-api --update-env
sudo systemctl reload nginx
```

## 15) Depannage rapide

### Erreur PM2: `Cannot find module ... dist/index.js`

Cause: mauvais chemin de build.

Fix:

```bash
pm2 delete movies-api
pm2 start "node /var/www/movies/app/server/dist/src/index.js" --name movies-api
pm2 save
```

### Erreur Prisma: `@prisma/client did not initialize yet`

Fix:

```bash
cd /var/www/movies/app/server
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart movies-api --update-env
```

### Certbot: `NXDOMAIN`

Cause: DNS pas encore propagé ou enregistrement absent.

Fix:

```bash
dig +short <FRONTEND_DOMAIN> A
dig +short <API_DOMAIN> A
```

Puis relancer certbot quand les IP sont resolues.

## 16) Securite

- Regenerer toute cle API exposee en clair (TMDB).
- Mettre a jour `.env` puis:

```bash
pm2 restart movies-api --update-env
```

- Ne jamais commiter de fichiers `.env` en git.
