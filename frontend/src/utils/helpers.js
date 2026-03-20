import { VALIDATION_RULES } from './constants';

export const validateField = (fieldName, value) => {
  const rules = VALIDATION_RULES[fieldName.toUpperCase()];
  if (!rules) return null;

  const errors = [];

  if (rules.required && (!value || value.trim() === '')) {
    errors.push('Ce champ est requis');
    return errors;
  }

  if (value && rules.minLength && value.length < rules.minLength) {
    errors.push(`Minimum ${rules.minLength} caractères`);
  }

  if (value && rules.maxLength && value.length > rules.maxLength) {
    errors.push(`Maximum ${rules.maxLength} caractères`);
  }

  if (value && rules.pattern && !rules.pattern.test(value)) {
    switch (fieldName.toUpperCase()) {
      case 'EMAIL':
        errors.push('Email invalide');
        break;
      case 'PHONE':
        errors.push('Format de téléphone invalide');
        break;
      case 'PASSWORD':
        errors.push('Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre');
        break;
      case 'NAME':
        errors.push('Nom invalide (lettres, espaces, tirets et apostrophes seulement)');
        break;
      default:
        errors.push('Format invalide');
    }
  }

  return errors.length > 0 ? errors : null;
};

export const validateForm = (formData, validationRules = {}) => {
  const errors = {};

  Object.keys(formData).forEach(fieldName => {
    const rules = validationRules[fieldName] || VALIDATION_RULES[fieldName.toUpperCase()];
    if (rules) {
      const fieldErrors = validateField(fieldName, formData[fieldName]);
      if (fieldErrors) {
        errors[fieldName] = fieldErrors;
      }
    }
  });

  return errors;
};

export const formatDate = (dateString, options = {}) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Date invalide';

  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };

  const mergedOptions = { ...defaultOptions, ...options };
  
  try {
    return new Intl.DateTimeFormat('fr-FR', mergedOptions).format(date);
  } catch (error) {
    return date.toLocaleDateString('fr-FR', mergedOptions);
  }
};

export const formatTime = (dateString) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '--:--';

  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'à l\'instant';
  if (diffMins < 60) return `il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
  if (diffHours < 24) return `il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
  if (diffDays < 7) return `il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  
  return formatDate(dateString, { 
    year: 'numeric',
    month: 'short',
    day: 'numeric' 
  });
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

export const truncateText = (text, maxLength, suffix = '...') => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
};

export const capitalizeFirst = (str) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const formatCurrency = (amount, currency = 'MAD', locale = 'fr-MA') => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  } catch (error) {
    return `${amount} ${currency}`;
  }
};

export const sanitizeInput = (input) => {
  return input
    .trim()
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
};

export const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

export const getInitials = (name, maxLength = 2) => {
  if (!name) return '';
  
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, maxLength).toUpperCase();
  }
  
  return parts
    .slice(0, maxLength)
    .map(part => part.charAt(0).toUpperCase())
    .join('');
};

export const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

export const downloadFile = (url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const getErrorMessage = (error) => {
  if (typeof error === 'string') return error;
  
  if (error?.message) return error.message;
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.response?.statusText) return error.response.statusText;
  
  return 'Une erreur est survenue';
};

export const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const isTabletDevice = () => {
  return /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
};

export const isDesktopDevice = () => {
  return !isMobileDevice() && !isTabletDevice();
};
