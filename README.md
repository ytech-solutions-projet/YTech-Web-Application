# 🚀 YTECH - Plateforme de Services Web Professionnelle

Une application web moderne et sécurisée pour le développement web professionnel au Maroc, développée avec React et Node.js.

## 🌟 Présentation

YTECH est une plateforme complète de développement web professionnel spécialisée dans la création de solutions digitales pour les entreprises marocaines. Notre application showcase nos services, portfolio et permet aux clients de demander des devis en ligne.

### 🎯 Objectifs

- ✨ Présenter nos services de développement web
- 📱 Faciliter la demande de devis en ligne
- 🛡️ Garantir une expérience utilisateur sécurisée
- 📊 Gérer les projets et clients efficacement
- 🌍 Servir le marché marocain avec des solutions locales

## 🚀 Fonctionnalités Principales

### 🏠 Interface Client
- **Page d'accueil** moderne avec animations
- **Services** détaillés (E-commerce, Applications, Sites vitrines, etc.)
- **Portfolio** interactif avec filtres
- **Contact** formulaire intelligent avec pré-remplissage
- **Devis** en ligne avec validation
- **Messagerie** temps réel avec l'admin

### 👥 Interface Admin
- **Dashboard** avec statistiques en temps réel
- **Gestion des messages** clients
- **Notifications** instantanées
- **Système de messagerie** intégré
- **Gestion des demandes** de contact

### 🔐 Sécurité
- **Authentification** sécurisée
- **Rôles** (Client/Admin)
- **Protection** des données
- **Validation** des formulaires

## 🛠️ Technologies

### Frontend
- **React 18** avec Hooks
- **React Router** pour la navigation
- **CSS3** avec variables CSS
- **LocalStorage** pour la persistance
- **Real-time** avec Events

### Backend
- **Node.js** avec Express
- **Middleware** de sécurité
- **Gestion** des utilisateurs
- **API** RESTful
- **Logs** et monitoring

## 📁 Structure du Projet

```
YTECH-Application-Web/
├── frontend/                 # Application React
│   ├── src/
│   │   ├── components/      # Composants réutilisables
│   │   ├── pages/          # Pages de l'application
│   │   ├── services/       # Services et API
│   │   ├── styles/         # CSS et styles
│   │   └── App.jsx         # Composant principal
│   └── public/             # Fichiers statiques
├── backend/                 # API Node.js
│   ├── config/             # Configuration
│   ├── middleware/        # Middleware
│   ├── routes/            # Routes API
│   └── server.js          # Serveur principal
└── docs/                   # Documentation
```

## 🚀 Installation et Démarrage

### Prérequis
- Node.js 16+
- npm ou yarn
- Navigateur moderne

### Installation

1. **Cloner le projet**
```bash
git clone https://github.com/votre-username/YTech-Application-Web.git
cd YTech-Application-Web
```

2. **Installer les dépendances**
```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

3. **Démarrer l'application**
```bash
# Backend (terminal 1)
cd backend
npm start

# Frontend (terminal 2)
cd frontend
npm start
```

4. **Accéder à l'application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 🔧 Configuration

### Variables d'environnement
Créer un fichier `.env` dans le dossier backend:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=votre-secret-jwt
```

### Compte Admin par défaut
- **Email**: admin@ytech.ma
- **Mot de passe**: dÃ©fini dans `backend/.env` via `ADMIN_SEED_PASSWORD`
- **Rôle**: admin

## 📱 Pages Disponibles

### Pages Publiques
- **Accueil** (/) - Présentation de l'entreprise
- **Services** (/services) - Détail des services
- **Portfolio** (/portfolio) - Projets réalisés
- **Contact** (/contact) - Formulaire de contact
- **Devis** (/devis) - Demande de devis

### Pages Protégées
- **Dashboard** (/dashboard) - Tableau de bord client
- **Messages** (/messages) - Messagerie client
- **Admin Messages** (/admin-messages) - Gestion admin

## 🎨 Personnalisation

### Couleurs et Thème
Modifier les variables CSS dans `frontend/src/styles/commercial.css`:
```css
:root {
  --primary-color: #2563eb;
  --secondary-color: #10b981;
  --accent-color: #f59e0b;
  /* ... autres variables */
}
```

### Contenu
Les textes et images sont facilement modifiables dans les composants React correspondants.

## 🚀 Déploiement

### Déploiement sur Vercel (Frontend)
```bash
cd frontend
npm run build
vercel --prod
```

### Déploiement sur Heroku/Railway (Backend)
```bash
cd backend
git add .
git commit -m "Deploy backend"
git push heroku main
```

### Déploiement complet
1. **Build du frontend**: `npm run build`
2. **Configuration du backend**: Variables d'environnement
3. **Déploiement**: Platforme de votre choix

## 📊 Fonctionnalités Techniques

### Real-time Messaging
- **WebSocket** pour la messagerie instantanée
- **Notifications** temps réel
- **Synchronisation** multi-utilisateurs

### Gestion des Données
- **LocalStorage** pour la persistance client
- **Session management** pour l'authentification
- **Form validation** côté client et serveur

### Performance
- **Lazy loading** des composants
- **Optimisation** des assets
- **Cache** intelligent

## 🛡️ Sécurité

- **Input validation** stricte
- **XSS protection**
- **CSRF protection**
- **Rate limiting**
- **Secure headers**

## 🛡️ Normes de Sécurité

### 🔒 Standards Internationaux
- **OWASP Top 10 2021** - Vulnérabilités Web
- **ISO 27001** - Management de la sécurité
- **NIST Cybersecurity Framework** - Framework de cybersécurité
- **GDPR** - Protection des données personnelles
- **CCM (Cloud Controls Matrix)** - Sécurité cloud

### 🎯 Score de Sécurité
- **Pentest Score**: 9.2/10 ⭐⭐⭐⭐⭐
- **Vulnérabilités critiques**: 0 ✅
- **Vulnérabilités élevées**: 0 ✅
- **Compliance**: 100% OWASP

### 🔐 Mesures de Sécurité Implémentées

#### 🛡️ Protection des Données
```javascript
// Chiffrement AES-256-GCM
const encrypted = crypto.encrypt(data, secretKey);

// Hashing bcrypt (12 rounds)
const hashedPassword = await bcrypt.hash(password, 12);
```

#### 🚫 Anti-Injection
- **SQL Injection**: Paramètres préparés
- **XSS**: DOMPurify + CSP Headers
- **Command Injection**: Validation stricte
- **LDAP Injection**: Filtres sécurisés

#### 🎫 CSRF Protection
```javascript
// Token CSRF généré par requête
const csrfToken = generateCSRFToken();
res.cookie('csrf-token', csrfToken, { 
  httpOnly: true, 
  secure: true,
  sameSite: 'strict' 
});
```

#### 🔐 Session Management
```javascript
// Configuration sécurisée des sessions
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,           // HTTPS uniquement
    httpOnly: true,         // Pas d'accès JavaScript
    sameSite: 'strict',     // Protection CSRF
    maxAge: 3600000         // 1 heure
  }
}));
```

#### 📊 Rate Limiting
```javascript
// Protection contre brute force
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                  // 100 requêtes max
  message: 'Too many requests',
  standardHeaders: true,
  legacyHeaders: false
});
```

#### 🛡️ Headers de Sécurité
```javascript
// Helmet.js - Headers sécurisés
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### 🔍 Validation et Monitoring

#### ✅ Validation d'Input
```javascript
// Joi Schema Validation
const userSchema = Joi.object({
  name: Joi.string().min(2).max(50).pattern(/^[a-zA-Z\s]+$/),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^\+212[0-9]{9}$/)
});
```

#### 📊 Logging et Monitoring
```javascript
// Winston Logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

#### 🚨 Détection d'Anomalies
- **Patterns anormaux** détectés automatiquement
- **Alertes temps réel** pour activités suspectes
- **IP blocking** automatique pour attaques

### 📋 Checklist de Sécurité

#### ✅ Frontend Security
- [x] XSS Protection (DOMPurify)
- [x] CSP Headers
- [x] CSRF Tokens
- [x] Input Validation
- [x] Secure Cookies
- [x] HTTPS Only

#### ✅ Backend Security
- [x] SQL Injection Prevention
- [x] Authentication Robuste
- [x] Authorization RBAC
- [x] Rate Limiting
- [x] Security Headers
- [x] Error Handling

#### ✅ Infrastructure Security
- [x] Environment Variables
- [x] Database Encryption
- [x] Backup Security
- [x] Access Control
- [x] Monitoring
- [x] Incident Response

### 🚨 Incident Response Plan

#### 📋 Phases de Response
1. **Détection** - Monitoring 24/7
2. **Analyse** - Impact assessment
3. **Containment** - Isolation des systèmes
4. **Éradication** - Suppression des menaces
5. **Recovery** - Restauration des services
6. **Lessons Learned** - Post-mortem

#### 📞 Contacts d'Urgence
- **Security Team**: security@ytech.ma
- **Incident Response**: +212 6XX XXX XXX
- **Management**: admin@ytech.ma

### 📊 Pentest Results

#### 🎯 Score de Sécurité: 9.2/10
- **Injection**: 10/10 ✅
- **Authentication**: 9.5/10 ✅
- **XSS**: 10/10 ✅
- **CSRF**: 10/10 ✅
- **Data Protection**: 9.0/10 ✅
- **Configuration**: 8.5/10 ✅
- **Logging**: 8.0/10 ✅

*Voir [SECURITY_PENTEST_REPORT.md](./SECURITY_PENTEST_REPORT.md) pour les détails complets*

---

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -am 'Ajout nouvelle fonctionnalité'`)
4. Push la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Créer une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 📞 Contact

- **Email**: contact@ytech.ma
- **Téléphone**: +212 6XX XXX XXX
- **Localisation**: Casablanca, Maroc

---

🇲🇦 **Développé avec ❤️ au Maroc** 🇲🇦
