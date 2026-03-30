# Deployment Update

Ce depot doit maintenant etre considere avec cette cible de production:

- serveur Ubuntu pour le frontend, Nginx et le backend Node.js
- serveur PostgreSQL separe
- communication backend -> PostgreSQL via reseau prive ou firewall strict

## Rappel de configuration

Backend:

```env
NODE_ENV=production
HOST=127.0.0.1
PORT=5001

FRONTEND_URL=https://app.example.com
PUBLIC_API_URL=https://app.example.com/api
ALLOWED_ORIGINS=https://app.example.com

DB_HOST=10.10.10.3
DB_PORT=5432
DB_NAME=ytech_db
DB_USER=ytech_user
DB_PASSWORD=change-me
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
```

Frontend:

```env
REACT_APP_ENV=production
REACT_APP_API_URL=
```

## Verification rapide

```bash
curl http://127.0.0.1:5001/api/health
curl -I https://app.example.com
curl -I https://app.example.com/api/health
```

## Fichiers de reference

- `DEPLOYMENT.md`
- `backend/.env.production.example`
- `frontend/.env.production.example`
