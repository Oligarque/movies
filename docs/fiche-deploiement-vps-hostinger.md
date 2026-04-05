# Fiche de deploiement VPS Hostinger (Projet Movies)

## 1. Option VPS a choisir

### Recommandation principale
- Type: VPS KVM (pas hebergement mutualise)
- OS: Ubuntu 24.04 LTS
- Taille minimale confortable:
  - 2 vCPU
  - 4 Go RAM
  - 80 Go NVMe SSD
  - 1 IPv4 dediee
- Sauvegardes:
  - Snapshots actives
  - Backup automatique (hebdomadaire minimum)

### Pourquoi ce choix
- Suffisant pour Node.js + Nginx + PostgreSQL + PM2
- Bon compromis cout/performance pour un MVP
- Evolutif facilement sans migration lourde

### Option budget (moins confortable)
- 1 vCPU / 2 Go RAM peut fonctionner au debut
- Risque de latence plus forte (API + DB + reverse proxy sur la meme machine)

---

## 2. Architecture recommandee sur le VPS

- Nginx en frontal (reverse proxy + statique)
- Backend Node/Express via PM2 sur port interne (ex: `4000`)
- Frontend Vite build en statique servi par Nginx
- Base de donnees PostgreSQL (locale VPS ou managée)
- HTTPS via Let's Encrypt

### Domaines conseilles
- `example.com` ou `www.example.com` -> Frontend
- `api.example.com` -> Backend

---

## 3. Etapes de configuration (ordre conseille)

## Etape A - Initialisation serveur
1. Connexion SSH en root (premiere connexion)
2. Mise a jour systeme:
   - `apt update && apt upgrade -y`
3. Creer un utilisateur admin non-root (ex: `deploy`)
4. Ajouter ta cle SSH a cet utilisateur
5. Durcir SSH:
   - desactiver login root
   - desactiver auth par mot de passe
   - garder auth par cle uniquement

## Etape B - Securite de base
1. Configurer firewall UFW:
   - autoriser `22`, `80`, `443`
   - refuser le reste
2. Installer et activer `fail2ban`
3. Verifier timezone et synchronisation horaire (NTP)

## Etape C - Installer la stack applicative
1. Installer `nginx`
2. Installer Node.js LTS (recommande: 22.x)
3. Installer PM2 globalement (`npm i -g pm2`)
4. Installer `git`
5. Installer PostgreSQL 16 (si DB locale)
6. Installer Certbot + plugin Nginx

## Etape D - Deploiement du code
1. Cloner le repository dans `/var/www/movies`
2. Installer les dependances:
   - backend: `app/server`
   - frontend: `app/client`
3. Backend:
   - definir variables d'environnement
   - build
   - lancement via PM2
4. Frontend:
   - configurer URL API prod
   - build Vite
   - publier le dossier `dist` pour Nginx

## Etape E - Variables d'environnement

### Backend (`app/server/.env`)
- `NODE_ENV=production`
- `PORT=4000`
- `DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/movies`
- `TMDB_API_KEY=...`
- `CORS_ORIGIN=https://example.com`

### Frontend (build-time)
- `VITE_API_BASE_URL=https://api.example.com`

## Etape F - Base de donnees
1. Creer base + utilisateur dedie
2. Donner les droits minimum necessaires
3. Lancer migrations Prisma en production
4. Seed uniquement si besoin

## Etape G - Nginx
1. Virtual host Frontend:
   - root vers le `dist`
   - fallback SPA: `try_files $uri /index.html`
2. Virtual host API:
   - `proxy_pass http://127.0.0.1:4000`
   - transmettre les headers proxy standards

## Etape H - HTTPS
1. Configurer les enregistrements DNS A vers l'IP du VPS
2. Executer Certbot pour frontend + API
3. Activer redirection HTTP -> HTTPS

## Etape I - Auto-demarrage
1. `pm2 save`
2. `pm2 startup`
3. `systemctl enable nginx`
4. Tester un reboot serveur

## Etape J - Verification finale
1. Frontend accessible en HTTPS
2. `GET /api/health` repond `200`
3. Recherche TMDb et ajout film fonctionnels
4. Verification logs:
   - `pm2 logs`
   - `/var/log/nginx/error.log`

---

## 4. Options Hostinger a activer

- Backup automatique: ON
- Monitoring ressources: ON
- Snapshot avant toute mise a jour critique: OUI
- IPv6: optionnel mais recommande si disponible

---

## 5. Bonnes pratiques production (projet Movies)

1. Eviter SQLite en production (preferer PostgreSQL)
2. Ne jamais exposer `TMDB_API_KEY` dans le frontend
3. Restreindre CORS au domaine frontend
4. Mettre une rotation des logs
5. Prevoir une procedure de rollback simple

---

## 6. Check de choix rapide VPS

Choisir cette config si tu veux etre serein des le debut:
- VPS KVM
- Ubuntu 24.04 LTS
- 2 vCPU
- 4 Go RAM
- 80 Go NVMe
- Snapshot + backup auto

C'est le meilleur point de depart pour ton app actuelle, sans surdimensionner inutilement.
