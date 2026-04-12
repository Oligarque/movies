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

## Changement du mot de passe admin

Pour modifier le mot de passe de `movies`, genere un nouveau hash bcrypt puis relance le seed avec `FORCE_ADMIN_PASSWORD_RESET=true`.
Cela met a jour l'utilisateur admin sans reinitialiser la base de donnees.

Exemple:

```bash
cd api
ADMIN_PASSWORD_HASH="<hash bcrypt>" FORCE_ADMIN_PASSWORD_RESET=true npm run db:seed
```
