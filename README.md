# YTECH Web Application

Plateforme web full-stack pour YTECH avec:

- site public marketing
- espace client securise
- espace admin securise
- devis, messagerie et suivi projet
- paiement
- reset/changement de mot de passe par session ou par email
- couche securite renforcee cote backend et supply chain

## Stack

- frontend: React 18 + Vite
- backend: Node.js + Express
- base de donnees: PostgreSQL
- securite: cookies HTTP-only, CSRF, CORS, rate limiting, audit logs, validation d entrees

## Points forts recents

- page `Parametres` dediee pour le changement de mot de passe client/admin
- lien de changement de mot de passe par email
- invalidation des autres sessions apres changement de mot de passe
- logs d audit qui masquent les tokens sensibles
- image Docker multi-stage durcie
- pipeline securite plus propre

## Mode de deploiement cible

Le depot doit etre considere en priorite pour cette architecture:

- serveur web/app Ubuntu
- Nginx en frontal
- frontend build statique servi par Nginx
- backend Node.js sur le meme serveur web
- base PostgreSQL sur un autre serveur
- serveur web avec 2 adresses IP
- une interface/IP bridge ou publique pour les utilisateurs et Nginx
- une interface/IP privee reservee au trafic entre le serveur web et la base
- serveur PostgreSQL avec IP fixe

Exemple de topologie:

```text
Public / bridge IP web server: 192.168.1.16
Private IP web server:         10.10.10.2
Fixed IP PostgreSQL server:    10.10.10.3
```

En production:

- `FRONTEND_URL` et `PUBLIC_API_URL` utilisent l adresse publique ou le domaine public
- `DB_HOST` ou `DATABASE_URL` pointent vers l IP fixe du serveur PostgreSQL
- le trafic base de donnees doit sortir via l interface reseau privee du serveur web
- le backend peut rester sur `127.0.0.1:5001` derriere Nginx

## Demarrage local

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Si `3000` est deja pris:

```bash
cd frontend
npm run dev -- --port 3001
```

## Variables importantes

Backend:

- `NODE_ENV`
- `HOST`
- `PORT`
- `FRONTEND_URL`
- `PUBLIC_API_URL`
- `ALLOWED_ORIGINS`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DATABASE_URL`
- `DB_SSL`
- `JWT_SECRET`
- `SESSION_SECRET`

Frontend:

- `REACT_APP_ENV`
- `REACT_APP_API_URL`
- `REACT_APP_WS_URL`

Modeles fournis:

- `backend/.env.production.example`
- `frontend/.env.production.example`

## Verification actuelle

Derniere verification locale faite sur cette branche:

- backend security tests: 25/25 OK
- frontend tests: 10/10 OK
- frontend build: OK

## Documentation

- `DEPLOYMENT.md`: deploiement Ubuntu + Nginx + PostgreSQL distant
- `DEPLOYMENT-UPDATE.md`: rappel court de la cible de prod
- `PERSISTENCE-DEPLOYMENT.md`: persistance, sauvegardes et restauration

## Deploiement

Le script `deploy.sh` est prevu pour:

- installer/backend build sur Ubuntu
- service systemd backend
- Nginx en frontal
- backend local derriere Nginx

Pour un deploiement complet, voir `DEPLOYMENT.md`.
