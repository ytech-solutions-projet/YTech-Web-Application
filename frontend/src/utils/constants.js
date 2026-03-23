export const APP_CONFIG = {
  name: 'YTECH',
  version: process.env.REACT_APP_VERSION || '1.0.0',
  environment: process.env.REACT_APP_ENV || 'development',
  apiBaseUrl: process.env.REACT_APP_API_URL || '',
  websocketUrl: process.env.REACT_APP_WS_URL || 'ws://localhost:5001'
};

export const ROUTES = {
  HOME: '/',
  SERVICES: '/services',
  CONTACT: '/contact',
  DEVIS: '/devis',
  ABOUT: '/about',
  PORTFOLIO: '/portfolio',
  LOGIN: '/login',
  REGISTER: '/register',
  LEGAL: '/legal',
  PAYMENT: '/payment',
  PAYMENT_SUCCESS: '/payment-success',
  DASHBOARD: '/dashboard',
  DEVIS_MANAGEMENT: '/devis-management',
  MESSAGES: '/messages',
  ADMIN_MESSAGES: '/admin-messages'
};

export const USER_ROLES = {
  ADMIN: 'admin',
  CLIENT: 'client'
};

export const MESSAGE_TYPES = {
  TEXT: 'text',
  CONTACT_REQUEST: 'contact_request',
  NOTIFICATION: 'notification'
};

export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

export const TOAST_DURATIONS = {
  SHORT: 3000,
  MEDIUM: 5000,
  LONG: 10000,
  INFINITE: 0
};

export const LOADING_SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large'
};

export const VALIDATION_RULES = {
  NAME: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s'-]+$/
  },
  EMAIL: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  PHONE: {
    pattern: /^[\+]?[0-9\s\-\(\)]+$/
  },
  PASSWORD: {
    required: true,
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/
  }
};

export const SERVICES = [
  {
    id: 'site-e-commerce',
    name: 'Site E-commerce',
    description: 'Vendez en ligne avec une boutique professionnelle',
    priceRange: '15 000 - 50 000 DH'
  },
  {
    id: 'application-mobile',
    name: 'Application Mobile',
    description: 'Application iOS et Android sur mesure',
    priceRange: '25 000 - 100 000 DH'
  },
  {
    id: 'site-vitrine',
    name: 'Site Vitrine',
    description: 'Présence professionnelle pour votre entreprise',
    priceRange: '5 000 - 15 000 DH'
  },
  {
    id: 'portfolio',
    name: 'Portfolio Créatif',
    description: 'Mettez en valeur vos réalisations',
    priceRange: '3 000 - 10 000 DH'
  },
  {
    id: 'web-application',
    name: 'Application Web Sur Mesure',
    description: 'Solution personnalisée pour vos besoins',
    priceRange: '20 000 - 80 000 DH'
  },
  {
    id: 'seo-marketing',
    name: 'SEO & Marketing Digital',
    description: 'Optimisez votre visibilité en ligne',
    priceRange: '2 000 - 10 000 DH/mois'
  },
  {
    id: 'maintenance',
    name: 'Maintenance & Support',
    description: 'Support technique et mises à jour continues',
    priceRange: '1 000 - 5 000 DH/mois'
  }
];

export const BUDGET_RANGES = [
  { id: 'moins-5k', label: 'Moins de 5 000 DH', value: 'moins-5k' },
  { id: '5k-10k', label: '5 000 - 10 000 DH', value: '5k-10k' },
  { id: '10k-25k', label: '10 000 - 25 000 DH', value: '10k-25k' },
  { id: '25k-50k', label: '25 000 - 50 000 DH', value: '25k-50k' },
  { id: '50k-100k', label: '50 000 - 100 000 DH', value: '50k-100k' },
  { id: 'plus-100k', label: 'Plus de 100 000 DH', value: 'plus-100k' }
];

export const TIMELINE_OPTIONS = [
  { id: 'urgent', label: 'Urgent (1-2 semaines)', value: 'urgent' },
  { id: 'rapide', label: 'Rapide (3-4 semaines)', value: 'rapide' },
  { id: 'normal', label: 'Normal (1-2 mois)', value: 'normal' },
  { id: 'flexible', label: 'Flexible (3+ mois)', value: 'flexible' }
];

export const ANIMATION_DURATIONS = {
  FAST: '0.15s',
  NORMAL: '0.3s',
  SLOW: '0.5s'
};

export const BREAKPOINTS = {
  MOBILE: '768px',
  TABLET: '1024px',
  DESKTOP: '1200px',
  LARGE: '1440px'
};
