# ===============================================
# 🚀 YTECH - Procédure de Déploiement Militaire MISE À JOUR
# ===============================================

## 📋 Prérequis

1. **Accès SSH au serveur web** (10.10.10.2)
2. **Droits administrateur** (sudo)
3. **Git installé** sur le serveur
4. **Node.js 18+** installé
5. **PostgreSQL accessible** (10.10.10.3)

---

## 🔧 Étapes de Déploiement

### **Étape 1: Connexion au serveur web**
```bash
ssh votre-utilisateur@10.10.10.2
```

### **Étape 2: Mise à jour depuis GitHub**
```bash
cd /var/www/ytech
git pull origin main
```

### **Étape 3: Exécution du déploiement**
```bash
chmod +x deploy.sh
sudo ./deploy.sh
```

---

## 🔐 Configuration des IP Fixes - Architecture Double Carte Réseau

### **🌐 Architecture Réseau**
- **Web Server Public (ens33)**: `192.168.1.16` (Trafic web public)
- **Web Server Privé (ens37)**: `10.10.10.2` (Communication DB)
- **DB Server**: `10.10.10.3` (Base de données)

### **Backend (.env.production)**
- `DB_HOST=10.10.10.3` (Serveur de base de données via réseau privé)
- `FRONTEND_URL=http://192.168.1.16:3000` (Frontend via IP publique)
- `ALLOWED_ORIGINS=http://192.168.1.16:3000,https://ytech.ma`

### **Frontend (.env.production)**
- `REACT_APP_API_URL=http://192.168.1.16:5001` (API via IP publique)
- `REACT_APP_CHATBOT_URL=http://192.168.1.16:5001`

---

## 🧪 Tests de Connexion

### **Test API Backend**
```bash
curl http://192.168.1.16:5001/api/health
```

### **Test Frontend**
```bash
curl http://192.168.1.16:3000
```

### **Test via Nginx**
```bash
curl http://192.168.1.16/api/health
```

---

## 🚨 Résolution des Problèmes

### **"Impossible de joindre l'API YTECH"**

1. **Vérifier si le backend tourne**
```bash
systemctl status ytech-backend
```

2. **Vérifier les ports**
```bash
netstat -tlnp | grep :5001
```

3. **Vérifier la configuration**
```bash
cat /var/www/ytech/backend/.env | grep -E "(API_URL|FRONTEND_URL)"
```

4. **Redémarrer les services**
```bash
sudo systemctl restart ytech-backend
sudo systemctl restart ytech-frontend
```

---

## 📊 Monitoring de Sécurité

### **Logs de sécurité**
```bash
tail -f /var/www/ytech/backend/logs/security.log
```

### **Vérification des en-têtes de sécurité**
```bash
curl -I http://10.10.10.2/api/health
```

---

## 🔄 Mises à Jour Futures

Pour appliquer les futures mises à jour :
```bash
cd /var/www/ytech
git pull origin main
sudo ./deploy.sh
```

---

## 🎯 Résultat Attendu

Après déploiement :
- ✅ Score de sécurité: 10/10 (Military Grade)
- ✅ Frontend: http://192.168.1.16:3000
- ✅ Backend API: http://192.168.1.16:5001
- ✅ Nginx: http://192.168.1.16
- ✅ Base de données: 10.10.10.3:5432 (via réseau privé)
- ✅ Communication DB: 10.10.10.2 ↔ 10.10.10.3 (réseau privé)

---

*Déploiement militaire - Sécurité niveau pentagon*
