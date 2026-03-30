# Guide de Déploiement de la Persistance - YTECH

## Vue d’ensemble

Ce guide explique comment configurer et déployer le système de persistance complet pour YTECH avec sauvegarde automatique, monitoring et récupération.

---

## Architecture de Persistance

### **Base de Données (PostgreSQL)**
- **Persistance** : données structurées
- **Backup** : automatisé tous les jours à 2 h
- **Rétention** : 30 jours
- **Compression** : activée

### **Sessions (Redis)**
- **Persistance** : sessions utilisateur actives
- **Sauvegarde** : toutes les 15 minutes
- **Mode** : append-only file
- **Nettoyage** : toutes les 6 heures

### **Uploads**
- **Persistance** : fichiers uploadés
- **Backup** : quotidien à 3 h
- **Rétention** : 7 jours
- **Validation** : intégrité vérifiée

### **Logs**
- **Persistance** : logs structurés JSON
- **Rotation** : 100 MB max par fichier
- **Compression** : automatique
- **Rétention** : 30 jours

---

## Déploiement sur Ubuntu Server

### **Étape 1 : Installation des dépendances**

```bash
# PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib -y

# Redis
sudo apt install redis-server -y

# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y

# Outils de compression
sudo apt install gzip tar -y
```

### **Étape 2 : Configuration PostgreSQL**

```bash
# Configuration de la base de données
sudo -u postgres psql << EOF
CREATE USER ytech_user WITH PASSWORD 'YtechDb2026';
CREATE DATABASE ytech_db OWNER ytech_user;
GRANT ALL PRIVILEGES ON DATABASE ytech_db TO ytech_user;
\q
EOF

# Configuration de la persistance PostgreSQL
sudo -u postgres psql -c "ALTER SYSTEM SET wal_level = replica;"
sudo -u postgres psql -c "ALTER SYSTEM SET archive_mode = on;"
sudo -u postgres psql -c "ALTER SYSTEM SET archive_command = 'cp %p /var/backups/ytech/postgresql/archive/%f';"
sudo systemctl restart postgresql
```

### **Étape 3 : Configuration Redis**

```bash
# Configuration Redis pour la persistance
sudo nano /etc/redis/redis.conf

# Ajouter/modifier ces lignes :
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec
dir /var/lib/redis

# Redémarrage Redis
sudo systemctl restart redis
```

### **Étape 4 : Création des répertoires de persistance**

```bash
# Répertoires principaux
sudo mkdir -p /var/www/ytech/{uploads,logs,monitoring}
sudo mkdir -p /var/backups/ytech/{postgresql,redis,uploads,config}
sudo mkdir -p /var/www/ytech/logs/{security,audit,performance,application,system}
sudo mkdir -p /var/www/ytech/uploads/{images,documents,temp,thumbnails}

# Permissions
sudo chown -R www-data:www-data /var/www/ytech
sudo chmod -R 755 /var/www/ytech
sudo chown -R redis:redis /var/lib/redis
sudo chmod -R 755 /var/backups/ytech
```

### **Étape 5 : Configuration des variables d’environnement**

```bash
# Copie des fichiers de configuration
cd /var/www/ytech/backend
sudo cp .env.production .env
sudo cp .env.persistence .env.persistence

# Vérification des variables
cat .env | grep -E "(DB_|REDIS_|UPLOAD_|LOG_)"
```

### **Étape 6 : Installation des dépendances Node.js**

```bash
cd /var/www/ytech/backend
npm install --production

cd /var/www/ytech/frontend
npm install --production
npm run build
```

### **Étape 7 : Configuration des services systemd**

```bash
# Service Backend
sudo nano /etc/systemd/system/ytech-backend.service
```

```ini
[Unit]
Description=YTECH Backend API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/ytech/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Service Frontend
sudo nano /etc/systemd/system/ytech-frontend.service
```

```ini
[Unit]
Description=YTECH Frontend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/ytech/frontend
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Activation des services
sudo systemctl daemon-reload
sudo systemctl enable ytech-backend
sudo systemctl enable ytech-frontend
sudo systemctl start ytech-backend
sudo systemctl start ytech-frontend
```

---

## Configuration des Tâches Planifiées

### **Backup automatisé**

```bash
# Rendre le script exécutable
chmod +x /var/www/ytech/scripts/backup.sh

# Ajouter au crontab
sudo crontab -e

# Ajouter ces lignes :
0 1 * * * /var/www/ytech/scripts/backup.sh
0 */6 * * * /var/www/ytech/backend/scripts/cleanup_sessions.sh
0 2 * * * find /var/www/ytech/logs -name "*.log" -mtime +30 -delete
```

---

## Monitoring et Vérification

### **Vérification des services**

```bash
# Statut des services
sudo systemctl status ytech-backend
sudo systemctl status ytech-frontend
sudo systemctl status postgresql
sudo systemctl status redis

# Logs des services
sudo journalctl -u ytech-backend -f
sudo journalctl -u ytech-frontend -f
```

### **Test de persistance**

```bash
# Test base de données
curl https://app.example.com/api/health

# Test upload
curl -X POST -F "file=@test.txt" https://app.example.com/api/upload

# Test logs
ls -la /var/www/ytech/logs/
```

### **Monitoring espace disque**

```bash
# Rapport d'espace disque
curl https://app.example.com/api/monitoring/disk

# Rapport HTML
firefox https://app.example.com/monitoring/disk_space_report.html
```

---

## Restauration

### **Restauration complète**

```bash
# Utilisation du script de restauration
chmod +x /var/www/ytech/scripts/restore.sh
sudo /var/www/ytech/scripts/restore.sh

# Options disponibles :
# 1) Restore PostgreSQL
# 2) Restore Redis
# 3) Restore Uploads
# 4) Restore Configuration
# 5) Restore Complet
```

### **Restauration manuelle**

```bash
# PostgreSQL
gunzip -c /var/backups/ytech/postgresql/ytech_db_2026-03-22.sql.gz | psql -h 10.10.10.3 -U ytech_user -d ytech_db

# Redis
redis-cli -h localhost BGSAVE
cp /var/backups/ytech/redis/redis_dump_2026-03-22.rdb.gz /tmp/
gunzip /tmp/redis_dump_2026-03-22.rdb.gz
sudo systemctl stop redis
sudo cp /tmp/redis_dump_2026-03-22.rdb /var/lib/redis/dump.rdb
sudo chown redis:redis /var/lib/redis/dump.rdb
sudo systemctl start redis

# Uploads
tar -xzf /var/backups/ytech/uploads/uploads_2026-03-22.tar.gz -C /var/www/
```

---

## Rapports et Statistiques

### **Rapports disponibles**

- **Espace disque** : `/var/www/ytech/monitoring/disk_space_report.html`
- **Logs** : `/var/www/ytech/logs/`
- **Backups** : `/var/backups/ytech/`
- **Sessions** : Redis CLI `KEYS ytech:session:*`

### **API de monitoring**

```bash
# Statistiques de persistance
curl https://app.example.com/api/persistence/stats

# Rapport d'espace disque
curl https://app.example.com/api/persistence/disk-report

# Statistiques des uploads
curl https://app.example.com/api/persistence/uploads-stats
```

---

## Alertes et Notifications

### **Configuration des alertes**

```bash
# Variables d'environnement pour les alertes
echo "DISK_ALERT_WEBHOOK=https://your-webhook-url" >> /var/www/ytech/backend/.env
echo "SECURITY_WEBHOOK_URL=https://your-security-webhook" >> /var/www/ytech/backend/.env
```

### **Types d’alertes**

- **Espace disque critique** (>85 %)
- **Échec de backup**
- **Corruption de données**
- **Sessions anormales**
- **Tentatives d’intrusion**

---

## Maintenance

### **Tâches de maintenance régulières**

```bash
# Quotidien (automatique) :
- Backup des données
- Nettoyage des logs
- Monitoring de l'espace disque

# Hebdomadaire :
- Vérification de l'intégrité des backups
- Nettoyage des fichiers temporaires
- Analyse des performances

# Mensuel :
- Test de restauration
- Mise à jour des dépendances
- Audit de sécurité
```

### **Commandes de maintenance**

```bash
# Vérification d'intégrité
/var/www/ytech/scripts/check_integrity.sh

# Nettoyage manuel
/var/www/ytech/scripts/cleanup.sh

# Rapport de santé
/var/www/ytech/scripts/health_check.sh
```

---

## Résultat final

Après déploiement, vous aurez :

- **Persistance complète** des données
- **Backup automatique** quotidien
- **Monitoring** en temps réel
- **Restauration** simplifiée
- **Alertes** proactives
- **Logs structurés** et persistants
- **Sessions Redis** persistantes
- **Uploads sécurisés** avec intégrité

**Le système YTECH est maintenant entièrement persistant avec une récupération garantie.**
