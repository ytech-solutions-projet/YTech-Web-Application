# 🚀 YTECH - Guide de Déploiement

## 📋 **Prérequis**

### 🛠️ **Logiciels Requis**
- **Node.js** 16+ et npm 8+
- **XAMPP** (Apache + MariaDB)
- **Python** 3.8+ (optionnel pour chatbot)
- **Git** pour le versioning

### 🔧 **Configuration Système**
- **RAM** : 4GB minimum
- **Stockage** : 10GB disponible
- **OS** : Windows 10/11, macOS, Linux

---

## 🗄️ **Configuration Base de Données**

### 1. **Démarrer MariaDB**
```bash
# Ouvrir XAMPP Control Panel
# Démarrer Apache et MariaDB
```

### 2. **Créer la Base de Données**
```sql
-- Via phpMyAdmin (http://localhost/phpmyadmin)
CREATE DATABASE ytech_pro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. **Importer le Schéma**
```bash
# Le schéma est créé automatiquement au premier démarrage
# Voir backend/config/database.js
```

---

## 🔧 **Configuration Backend**

### 1. **Installation Dépendances**
```bash
cd backend
npm install --production
```

### 2. **Configuration Variables**
```bash
# Copier le fichier d'environnement
cp .env.example .env

# Éditer .env avec vos valeurs
nano .env
```

### 3. **Variables Essentielles**
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=ytech_pro
JWT_SECRET=votre-secret-super-securise
```

### 4. **Démarrer le Backend**
```bash
# Développement
npm run dev

# Production
npm start
```

---

## 🎨 **Configuration Frontend**

### 1. **Installation Dépendances**
```bash
cd frontend
npm install
```

### 2. **Configuration Variables**
```bash
# Créer .env.local
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env.local
```

### 3. **Démarrer le Frontend**
```bash
# Développement
npm start

# Build pour production
npm run build
```

---

## 🤖 **Configuration Chatbot (Optionnel)**

### 1. **Installation Python**
```bash
# Vérifier Python 3.8+
python --version

# Installer dépendances
cd chatbot
pip install -r requirements.txt
```

### 2. **Démarrer le Chatbot**
```bash
python app.py
```

---

## 🌐 **Accès Application**

| Service | URL | Port | Description |
|---------|------|------|-------------|
| **Frontend** | http://localhost:3000 | 3000 | Interface utilisateur |
| **Backend API** | http://localhost:5000 | 5000 | Services REST |
| **Base de données** | http://localhost/phpmyadmin | 80 | Administration MariaDB |
| **Chatbot** | http://localhost:5001 | 5001 | Assistant IA |

---

## 🔐 **Configuration Sécurité**

### 🛡️ **Production**
```env
# .env pour production
NODE_ENV=production
JWT_SECRET=votre-secret-jwt-tres-long-et-complexe
SESSION_SECRET=votre-secret-session-tres-long-et-complexe
```

### 📊 **Rate Limiting**
```javascript
// Configuration dans server.js
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Maximum 5 tentatives
  message: 'Trop de tentatives. Réessayez plus tard.'
});
```

---

## 📊 **Monitoring**

### 🔍 **Health Check**
```bash
# Vérifier l'état du backend
curl http://localhost:5000/api/health
```

### 📋 **Logs**
```bash
# Logs backend dans console
# Logs erreurs dans fichiers (production)
tail -f logs/error.log
```

---

## 🚀 **Déploiement Production**

### 1. **Préparation Backend**
```bash
# Build production
npm run build

# Installation dépendances
npm ci --production
```

### 2. **Préparation Frontend**
```bash
# Build production
npm run build

# Le build est dans ./build
```

### 3. **Configuration Serveur**
```bash
# Utiliser PM2 pour la gestion de processus
npm install -g pm2

# Démarrer avec PM2
pm2 start backend/server.js --name "ytech-backend"
pm2 start frontend/build --name "ytech-frontend" --spa
```

### 4. **Configuration Nginx (Recommandé)**
```nginx
server {
    listen 80;
    server_name votre-domaine.com;
    
    # Frontend
    location / {
        root /path/to/frontend/build;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 🧪 **Tests de Déploiement**

### ✅ **Vérifications**
```bash
# 1. Base de données connectée
curl http://localhost:5000/api/health

# 2. Frontend accessible
curl http://localhost:3000

# 3. API fonctionnelle
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<admin-email>","password":"<admin-password>"}'
```

### 📊 **Tests Intégration**
```bash
# Test inscription
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@ytech.ma","password":"Test123!","phone":"0612345678"}'

# Vérifier utilisateur créé
psql -d ytech_db -c "SELECT id, email, role FROM users;"
```

---

## 🔧 **Maintenance**

### 📅 **Tâches Régulières**
```bash
# 1. Sauvegardes base de données
mysqldump -u root -p ytech_pro > backup_$(date +%Y%m%d).sql

# 2. Nettoyage logs
find logs/ -name "*.log" -mtime +30 -delete

# 3. Mise à jour dépendances
npm update
```

### 🔄 **Redémarrage Services**
```bash
# Redémarrer backend
pm2 restart ytech-backend

# Redémarrer frontend
pm2 restart ytech-frontend

# Redémarrer MariaDB (XAMPP)
# Via panneau de contrôle XAMPP
```

---

## 📞 **Support Technique**

### 🐛 **Problèmes Communs**

1. **Port déjà utilisé**
   ```bash
   # Trouver le processus
   netstat -ano | findstr :5000
   
   # Tuer le processus
   taskkill /PID <PID> /F
   ```

2. **Connexion base de données refusée**
   ```bash
   # Vérifier MariaDB démarré
   # Vérifier identifiants dans .env
   # Vérifier nom base de données
   ```

3. **Permissions refusées**
   ```bash
   # Exécuter en administrateur
   # Ou vérifier permissions fichiers
   ```

### 📧 **Contact Support**
- **Email** : support@ytech.ma
- **Téléphone** : +212 5XX XXX XXX
- **Documentation** : https://docs.ytech.ma

---

## 🎯 **Checklist Déploiement**

### ✅ **Pré-déploiement**
- [ ] Base de données créée
- [ ] Variables environnement configurées
- [ ] Dépendances installées
- [ ] Tests locaux passés

### ✅ **Déploiement**
- [ ] Backend démarré
- [ ] Frontend build et déployé
- [ ] Chatbot configuré (optionnel)
- [ ] Nginx configuré (production)

### ✅ **Post-déploiement**
- [ ] Health check OK
- [ ] Tests intégration passés
- [ ] Monitoring configuré
- [ ] Sauvegardes automatiques

---

<div align="center">
  <p>🇲🇦 **YTECH - Déploiement Professionnel** 🇲🇦</p>
  <p>🚀 Prêt pour Production • 🛡️ Sécurisé • 📊 Monitoré</p>
</div>
