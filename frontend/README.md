# YTECH Enterprise - Frontend

Application web moderne et sécurisée pour YTECH, entreprise spécialisée dans le développement web professionnel au Maroc.

## 🚀 Fonctionnalités

### 🎯 Core Features
- **Authentification sécurisée** avec rôles (Admin/Client)
- **Système de messagerie** en temps réel
- **Formulaire de contact** intelligent avec notifications admin
- **Gestion des devis** et demandes de projets
- **Interface responsive** et accessible
- **Performance optimisée** avec lazy loading

### 🛡️ Sécurité
- Validation des entrées côté client
- Protection contre les attaques XSS
- Gestion sécurisée des sessions
- Logging des erreurs et activités

### 🎨 Design System
- Composants réutilisables et stylisés
- Support du mode sombre
- Animations fluides et micro-interactions
- Interface accessible (WCAG)

## 📁 Structure du Projet

```
src/
├── components/          # Composants réutilisables
│   ├── Button.jsx       # Bouton stylisé
│   ├── Card.jsx         # Carte moderne
│   ├── Input.jsx        # Champ de saisie
│   ├── Loading.jsx      # Indicateur de chargement
│   ├── Toast.jsx        # Notifications toast
│   ├── ErrorBoundary.jsx # Gestion des erreurs
│   └── ProtectedRoute.jsx # Routes protégées
├── hooks/               # Hooks personnalisés
│   ├── useAuth.js       # Gestion authentification
│   ├── useLocalStorage.js # Stockage local
│   └── useToast.js      # Notifications
├── pages/               # Pages de l'application
├── services/            # Services externes
│   ├── logger.js        # Logging système
│   └── realtime.js      # Communication temps réel
├── utils/               # Utilitaires
│   ├── constants.js     # Constantes de l'application
│   └── helpers.js       # Fonctions utilitaires
└── styles/              # Styles CSS
    └── commercial.css   # Styles principaux
```

## 🛠️ Technologies Utilisées

### Frontend
- **React 18.2.0** - Framework JavaScript
- **React Router 6.8.0** - Routage client
- **CSS3** - Stylisation avec variables CSS
- **JavaScript ES6+** - Langage moderne

### Outils de Développement
- **ESLint** - Linting du code
- **Prettier** - Formatage du code
- **Testing Library** - Tests unitaires

## 📦 Installation

### Prérequis
- Node.js 16+ 
- npm 8+

### Étapes d'installation

1. **Cloner le repository**
```bash
git clone <repository-url>
cd ytech-enterprise/frontend
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer l'environnement**
```bash
cp .env.example .env
# Éditer .env avec vos configurations
```

4. **Démarrer l'application**
```bash
npm start
```

5. **Accéder à l'application**
Ouvrir [http://localhost:3000](http://localhost:3000)

## ⚙️ Configuration

### Variables d'environnement

Copiez `.env.example` vers `.env` et configurez:

```env
# URL de l'API backend
REACT_APP_API_URL=http://localhost:5000

# Configuration de l'application
REACT_APP_NAME=YTECH
REACT_APP_VERSION=3.0.0

# Configuration de sécurité
REACT_APP_ENCRYPTION_ENABLED=true
REACT_APP_SESSION_TIMEOUT=3600000

# Configuration du logging
REACT_APP_LOG_LEVEL=info
REACT_APP_LOG_TO_SERVER=true
```

## 🧪 Tests

### Exécuter les tests
```bash
# Tests unitaires
npm test

# Tests avec couverture
npm run test:coverage

# Tests en mode watch
npm test -- --watch
```

### Linting
```bash
# Vérifier le code
npm run lint

# Corriger automatiquement
npm run lint:fix
```

## 📊 Performance

### Optimisations implémentées
- **Lazy loading** des composants
- **Code splitting** automatique
- **Memoization** des hooks
- **Optimisation CSS** avec variables
- **Compression** des assets

### Monitoring
- **Web Vitals** pour les métriques
- **Error tracking** avec logging
- **Performance monitoring** intégré

## 🔄 Déploiement

### Build de production
```bash
npm run build
```

### Déploiement statique
Le build génère des fichiers statiques dans `build/` qui peuvent être déployés sur:
- Netlify
- Vercel
- GitHub Pages
- AWS S3 + CloudFront

### Variables de production
```bash
REACT_APP_ENV=production
REACT_APP_API_URL=https://api.ytech.ma
REACT_APP_LOG_LEVEL=error
```

## 🎯 Guide de Développement

### Architecture des Composants

#### 1. Structure d'un composant
```jsx
import React from 'react';
import './ComponentName.css';

const ComponentName = ({ prop1, prop2, ...props }) => {
  // Logique du composant
  
  return (
    <div className="component-name" {...props}>
      {/* JSX du composant */}
    </div>
  );
};

export default ComponentName;
```

#### 2. Hooks personnalisés
```jsx
import { useState, useEffect } from 'react';

const useCustomHook = (initialValue) => {
  const [state, setState] = useState(initialValue);
  
  // Logique du hook
  
  return [state, setState];
};

export default useCustomHook;
```

#### 3. Services
```jsx
class ServiceClass {
  constructor() {
    this.logger = logger.createModuleLogger('ServiceName');
  }
  
  method() {
    this.logger.info('Method called');
    // Logique du service
  }
}

export default new ServiceClass();
```

### Bonnes Pratiques

#### ✅ À faire
- Utiliser les hooks personnalisés pour la logique partagée
- Suivre les conventions de nommage
- Ajouter des tests pour les composants critiques
- Utiliser le système de design (Button, Card, Input)
- Logger les erreurs et activités importantes

#### ❌ À éviter
- Code dupliqué
- Composants trop volumineux (>300 lignes)
- Ignorer les warnings ESLint
- Oublier la gestion des erreurs
- Hardcoder les valeurs

## 🐛 Débogage

### Outils de débogage
- **React DevTools** pour inspecter les composants
- **Console logging** avec le logger intégré
- **Error Boundary** pour capturer les erreurs
- **Network tab** pour vérifier les appels API

### Logging
```jsx
import logger from '../services/logger';

// Dans un composant
logger.info('Component mounted');
logger.error('Error occurred', error);
logger.debug('Debug information', data);
```

## 🤝 Contribuer

### Workflow de contribution
1. Forker le repository
2. Créer une branche feature
3. Implémenter les changements
4. Ajouter des tests
5. Vérifier le linting
6. Soumettre une Pull Request

### Standards de code
- **ESLint** configuré avec React rules
- **Prettier** pour le formatage
- **Conventional Commits** pour les messages
- **Tests** pour les nouvelles fonctionnalités

## 📝 License

Ce projet est sous license MIT. Voir [LICENSE](../LICENSE) pour plus de détails.

## 📞 Support

Pour toute question ou support technique:
- **Email**: contact@ytech.ma
- **Site**: [ytech.ma](https://ytech.ma)
- **Documentation**: [docs.ytech.ma](https://docs.ytech.ma)

---

**YTECH** - Votre expert en développement web professionnel au Maroc 🇲🇦
