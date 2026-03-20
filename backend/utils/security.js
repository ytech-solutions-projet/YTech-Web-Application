const DEFAULT_ALLOWED_DEV_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const MIN_SECRET_LENGTH = 32;
const MIN_PASSWORD_LENGTH = 12;

const parseBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
};

const parseInteger = (value, fallback) => {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
};

const stripControlCharacters = (value, multiline = false) => {
  if (typeof value !== 'string') {
    return '';
  }

  const pattern = multiline
    ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g
    : /[\u0000-\u001F\u007F]/g;

  return value.replace(pattern, ' ');
};

const normalizeText = (value, options = {}) => {
  const { maxLength = 255, multiline = false } = options;
  const normalizedValue = stripControlCharacters(`${value ?? ''}`, multiline).normalize('NFKC');
  const collapsedValue = multiline
    ? normalizedValue.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n')
    : normalizedValue.replace(/\s+/g, ' ');

  return collapsedValue.trim().slice(0, maxLength);
};

const normalizeEmail = (value) => normalizeText(value, { maxLength: 254 }).toLowerCase();

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));

const validateStrongPassword = (password) => {
  if (typeof password !== 'string') {
    return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caracteres`;
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caracteres`;
  }

  if (!/[a-z]/.test(password)) {
    return 'Le mot de passe doit contenir au moins une lettre minuscule';
  }

  if (!/[A-Z]/.test(password)) {
    return 'Le mot de passe doit contenir au moins une lettre majuscule';
  }

  if (!/\d/.test(password)) {
    return 'Le mot de passe doit contenir au moins un chiffre';
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Le mot de passe doit contenir au moins un caractere special';
  }

  return null;
};

const getAllowedOrigins = () => {
  const configuredOrigins = [process.env.FRONTEND_URL, process.env.ALLOWED_ORIGINS]
    .flatMap((value) => `${value || ''}`.split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  if (configuredOrigins.length > 0) {
    return [...new Set(configuredOrigins)];
  }

  return process.env.NODE_ENV === 'production' ? [] : DEFAULT_ALLOWED_DEV_ORIGINS;
};

const isPlaceholderSecret = (value = '') => {
  const normalized = value.toLowerCase();
  return (
    !value ||
    normalized.includes('change-this') ||
    normalized.includes('fallback-secret') ||
    normalized.includes('your-super-secret')
  );
};

const validateSecurityConfiguration = () => {
  const errors = [];
  const warnings = [];
  const jwtSecret = process.env.JWT_SECRET || '';
  const sessionSecret = process.env.SESSION_SECRET || '';
  const isProduction = process.env.NODE_ENV === 'production';

  if (jwtSecret.length < MIN_SECRET_LENGTH || isPlaceholderSecret(jwtSecret)) {
    const message = `JWT_SECRET doit etre configure avec au moins ${MIN_SECRET_LENGTH} caracteres robustes`;
    if (isProduction) {
      errors.push(message);
    } else {
      warnings.push(message);
    }
  }

  if (sessionSecret.length < MIN_SECRET_LENGTH || isPlaceholderSecret(sessionSecret)) {
    const message = `SESSION_SECRET doit etre configure avec au moins ${MIN_SECRET_LENGTH} caracteres robustes`;
    if (isProduction) {
      errors.push(message);
    } else {
      warnings.push(message);
    }
  }

  const allowedOrigins = getAllowedOrigins();
  if (isProduction && allowedOrigins.length === 0) {
    errors.push('FRONTEND_URL ou ALLOWED_ORIGINS doit etre renseigne en production');
  }

  warnings.forEach((warning) => console.warn(`[Security] ${warning}`));

  if (errors.length > 0) {
    throw new Error(errors.join(' | '));
  }
};

const getSessionDurationMs = () => {
  const sessionHours = parseInteger(process.env.SESSION_TIMEOUT_HOURS, 24);
  return sessionHours * 60 * 60 * 1000;
};

const getAuthCookieName = () => process.env.AUTH_COOKIE_NAME || 'ytech_auth';

const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const secure = parseBoolean(process.env.AUTH_COOKIE_SECURE, isProduction);
  const sameSite = (process.env.AUTH_COOKIE_SAME_SITE || 'strict').toLowerCase();

  if (!['strict', 'lax', 'none'].includes(sameSite)) {
    throw new Error('AUTH_COOKIE_SAME_SITE doit valoir strict, lax ou none');
  }

  if (sameSite === 'none' && !secure) {
    throw new Error('AUTH_COOKIE_SAME_SITE=none exige AUTH_COOKIE_SECURE=true');
  }

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: getSessionDurationMs()
  };
};

module.exports = {
  getAllowedOrigins,
  getAuthCookieName,
  getCookieOptions,
  getSessionDurationMs,
  isValidEmail,
  normalizeEmail,
  normalizeText,
  parseBoolean,
  parseInteger,
  validateSecurityConfiguration,
  validateStrongPassword
};
