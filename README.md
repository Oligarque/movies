# movies

Version du projet synchronisee sur la branche `v2` de `Oligarque/movies`, tout en gardant la structure attendue dans ce depot:

- `api/`: backend Node.js / Express / TypeScript
- `web/`: frontend React / Vite / TypeScript

## Lancement en local

### API

```bash
cd api
npm install
npm run dev
```

### Web

```bash
cd web
npm install
npm run dev
```

## Deploiement Apache

Pour le site de production, servir `web/dist` comme racine du frontend.

- `/` et les autres routes privees restent proteges par Basic Auth.
- `/public` et `/demo` restent accessibles sans mot de passe.
- `/assets`, `/favicon.svg` et `/api` restent accessibles pour faire fonctionner l'app.

Le fichier d'authentification pointe vers `C:/xampp/htdocs/public_html/movies/.htpasswd`. Il doit etre cree sur le serveur avec le mot de passe admin unique.
