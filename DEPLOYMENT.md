# YTECH Deployment Guide

Ce projet est désormais pensé en priorité pour cette architecture :

- serveur web/app Ubuntu
- build statique du frontend servi par Nginx
- backend Node.js sur le même serveur web
- PostgreSQL sur un autre serveur, accessible via un réseau privé ou des règles de pare-feu strictes
- serveur web avec 2 interfaces/IP :
- une IP bridge ou publique pour les utilisateurs
- une IP privée pour communiquer avec le serveur PostgreSQL
- serveur PostgreSQL avec IP fixe

## Architecture recommandée

```text
Internet
  |
  v
Nginx (serveur Ubuntu web - IP publique/bridge)
  |- /           -> build frontend
  |- /api        -> backend Node.js (127.0.0.1:5001)
  |
  v
Serveur PostgreSQL distant (IP privée fixe, ex. : 10.10.10.3:5432)
```

## Hypothèses de production

- le backend écoute en local sur `127.0.0.1:5001`
- Nginx expose publiquement le site et reverse-proxy `/api`
- la base n’est pas sur le même serveur que l’application
- le serveur web dispose d’une interface/IP publique et d’une interface/IP privée
- la connexion PostgreSQL sort par l’interface/IP privée du serveur web
- les URL publiques sont définies par des variables d’environnement
- les cookies sécurisés sont utilisés en HTTPS

## 1. Préparation du serveur Ubuntu web/app

Installer les composants principaux :

```bash
sudo apt update
sudo apt install -y git nginx curl ca-certificates
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Vérifications :

```bash
node -v
npm -v
nginx -v
```

## 2. Préparation du dépôt

```bash
cd /var/www
sudo git clone https://github.com/ytech-solutions-projet/YTech-Web-Application.git ytech
sudo chown -R www-data:www-data /var/www/ytech
cd /var/www/ytech
```

## 3. Configuration backend

Le fichier modèle est `backend/.env.production.example`.

Créer le vrai fichier :

```bash
cd /var/www/ytech/backend
cp .env.production.example .env
nano .env
```

Variables importantes pour une base distante :

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

JWT_SECRET=replace-with-a-long-random-secret
SESSION_SECRET=replace-with-another-long-random-secret
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAME_SITE=strict
TRUST_PROXY=true
```

Notes :

- `HOST=127.0.0.1` limite l’accès direct au backend et laisse Nginx gérer l’exposition publique.
- `DB_HOST` doit pointer vers le serveur PostgreSQL distant.
- `DB_HOST` doit être joignable depuis l’interface/IP privée du serveur web, pas via l’IP publique.
- `DB_SSL=true` est recommandé si la base est sur un autre serveur.
- si ton hébergeur fournit une URL complète, tu peux utiliser `DATABASE_URL` à la place de `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME`.

## 4. Configuration frontend

Le fichier modèle est `frontend/.env.production.example`.

Créer le vrai fichier :

```bash
cd /var/www/ytech/frontend
cp .env.production.example .env
nano .env
```

Configuration recommandée derrière Nginx :

```env
REACT_APP_ENV=production
REACT_APP_API_URL=
```

Laisser `REACT_APP_API_URL` vide est recommandé si le frontend et l’API sont servis sous le même domaine avec `/api` reverse-proxy par Nginx.

## 5. Installation et build

Backend :

```bash
cd /var/www/ytech/backend
npm ci --omit=dev
```

Frontend :

```bash
cd /var/www/ytech/frontend
npm ci
npm run build
```

## 6. Service systemd backend

Exemple :

```ini
[Unit]
Description=YTECH Backend API
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/ytech/backend
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
EnvironmentFile=-/var/www/ytech/backend/.env
ExecStart=/usr/bin/node /var/www/ytech/backend/server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Activation :

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ytech-backend
sudo systemctl status ytech-backend
```

## 7. Configuration Nginx

Exemple minimal :

```nginx
server {
    listen 80;
    server_name app.example.com;

    root /var/www/ytech/frontend/build;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /assets/ {
        try_files $uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Validation :

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 8. Accès réseau vers PostgreSQL

Sur le serveur de base de données :

- autoriser uniquement l’IP privée du serveur web/app
- restreindre le port `5432`
- activer SSL si possible
- créer un utilisateur dédié à l’application

Exemple conceptuel :

```text
Web/App public IP:  192.168.1.16
Web/App private IP: 10.10.10.2
DB server fixed IP: 10.10.10.3
Rule:               allow 10.10.10.2 -> 10.10.10.3:5432
```

## 9. Vérification après déploiement

Backend :

```bash
curl http://127.0.0.1:5001/api/health
```

Nginx public :

```bash
curl -I https://app.example.com
curl -I https://app.example.com/api/health
```

Logs :

```bash
sudo journalctl -u ytech-backend -n 100 --no-pager
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 10. Déploiement via le script fourni

Le script `deploy.sh` est aligné avec cette approche :

- backend systemd
- build statique du frontend
- Nginx en frontal
- backend local sur `127.0.0.1`

Séquence typique :

```bash
cd /var/www/ytech
sudo ./deploy.sh
```

## Points de vigilance

- ne mets pas `DB_HOST=localhost` si PostgreSQL est sur un autre serveur
- ne laisse pas d’IP privée codée en dur comme URL publique
- renseigne `FRONTEND_URL`, `PUBLIC_API_URL` et `ALLOWED_ORIGINS` avec tes vraies URL
- active HTTPS avant de passer `AUTH_COOKIE_SECURE=true`
- utilise des secrets longs et différents pour `JWT_SECRET` et `SESSION_SECRET`
