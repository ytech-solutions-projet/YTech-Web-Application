#!/bin/bash

set -euo pipefail

APP_DIR="/var/www/ytech"
BACKUP_DIR="/var/backups/ytech/deploy"
REPO_URL="https://github.com/ytech-solutions-projet/YTech-Web-Application.git"
BRANCH="main"
BACKEND_SERVICE="ytech-backend"
FRONTEND_SERVICE="ytech-frontend"
NGINX_SITE="ytech"
BACKEND_ENV_PATH="$APP_DIR/backend/.env"
BACKEND_ENV_BACKUP="$BACKUP_DIR/backend.env.$(date +%Y%m%d_%H%M%S)"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

require_root() {
  if [ "${EUID:-$(id -u)}" -ne 0 ]; then
    echo "Ce script doit etre execute en root (sudo)." >&2
    exit 1
  fi
}

ensure_command() {
  local command_name="$1"

  if command -v "$command_name" >/dev/null 2>&1; then
    return
  fi

  log "Installation de la commande manquante: $command_name"
  apt-get update

  case "$command_name" in
    git)
      apt-get install -y git
      ;;
    npm)
      curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
      apt-get install -y nodejs
      ;;
    curl)
      apt-get install -y curl
      ;;
    nginx)
      apt-get install -y nginx
      ;;
    *)
      echo "Commande non prise en charge: $command_name" >&2
      exit 1
      ;;
  esac
}

backup_backend_env() {
  mkdir -p "$BACKUP_DIR"

  if [ -f "$BACKEND_ENV_PATH" ]; then
    cp "$BACKEND_ENV_PATH" "$BACKEND_ENV_BACKUP"
    log "Sauvegarde du .env backend: $BACKEND_ENV_BACKUP"
  fi
}

ensure_supported_node() {
  if command -v node >/dev/null 2>&1; then
    local node_version
    node_version="$(node -p "process.versions.node")"

    if dpkg --compare-versions "$node_version" ge "20.19.0"; then
      return
    fi

    log "Version Node detectee trop ancienne: $node_version"
  fi

  log "Installation ou mise a niveau de Node.js 20"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
}

sync_repository() {
  mkdir -p "$APP_DIR"

  if [ ! -d "$APP_DIR/.git" ]; then
    log "Clonage initial du depot"
    rm -rf "$APP_DIR"
    git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
    return
  fi

  log "Reinitialisation du depot sur origin/$BRANCH"
  cd "$APP_DIR"
  git fetch origin
  git reset --hard "origin/$BRANCH"
  git clean -fdx
}

restore_backend_env() {
  if [ -f "$BACKEND_ENV_BACKUP" ]; then
    cp "$BACKEND_ENV_BACKUP" "$BACKEND_ENV_PATH"
    log "Restauration du .env backend sauvegarde"
    return
  fi

  if [ ! -f "$BACKEND_ENV_PATH" ] && [ -f "$APP_DIR/backend/.env.production" ]; then
    cp "$APP_DIR/backend/.env.production" "$BACKEND_ENV_PATH"
    log "Copie de backend/.env.production vers backend/.env"
  fi
}

install_backend() {
  log "Installation des dependances backend"
  cd "$APP_DIR/backend"
  npm ci --omit=dev
}

build_frontend() {
  log "Installation des dependances frontend et build de production"
  cd "$APP_DIR/frontend"

  if [ ! -f "$APP_DIR/frontend/.env" ] && [ -f "$APP_DIR/frontend/.env.production" ]; then
    cp "$APP_DIR/frontend/.env.production" "$APP_DIR/frontend/.env"
  fi

  npm ci
  npm run build
}

write_backend_service() {
  log "Ecriture du service systemd backend"
  cat > "/etc/systemd/system/${BACKEND_SERVICE}.service" <<EOF
[Unit]
Description=YTECH Backend API
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$APP_DIR/backend
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
EnvironmentFile=-$BACKEND_ENV_PATH
ExecStart=/usr/bin/node $APP_DIR/backend/server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
}

disable_legacy_frontend_service() {
  if systemctl list-unit-files | grep -q "^${FRONTEND_SERVICE}.service"; then
    log "Desactivation de l'ancien service frontend"
    systemctl disable --now "$FRONTEND_SERVICE" || true
  fi
}

write_nginx_config() {
  log "Ecriture de la configuration Nginx"
  cat > "/etc/nginx/sites-available/${NGINX_SITE}" <<EOF
server {
    listen 80;
    server_name _;

    root $APP_DIR/frontend/build;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /assets/ {
        try_files \$uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

  rm -f "/etc/nginx/sites-enabled/${NGINX_SITE}"
  ln -s "/etc/nginx/sites-available/${NGINX_SITE}" "/etc/nginx/sites-enabled/${NGINX_SITE}"
  nginx -t
}

restart_services() {
  log "Redemarrage des services"
  systemctl daemon-reload
  systemctl enable --now "$BACKEND_SERVICE"
  systemctl enable --now nginx
  systemctl restart "$BACKEND_SERVICE"
  systemctl restart nginx
}

health_check() {
  log "Verification de sante du backend"
  sleep 5
  curl --fail --silent --show-error "http://127.0.0.1:5001/api/health" >/dev/null
}

main() {
  require_root
  ensure_command git
  ensure_command curl
  ensure_command npm
  ensure_command nginx
  ensure_supported_node

  backup_backend_env

  systemctl stop "$BACKEND_SERVICE" 2>/dev/null || true
  systemctl stop "$FRONTEND_SERVICE" 2>/dev/null || true
  systemctl stop nginx 2>/dev/null || true

  sync_repository
  restore_backend_env
  install_backend
  build_frontend
  write_backend_service
  disable_legacy_frontend_service
  write_nginx_config

  chown -R www-data:www-data "$APP_DIR"
  chmod -R 755 "$APP_DIR"

  restart_services
  health_check

  log "Deploiement termine avec succes"
  log "Frontend: http://$(hostname -I | awk '{print $1}')/"
  log "Backend health: http://127.0.0.1:5001/api/health"
}

main "$@"
