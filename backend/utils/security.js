const crypto = require('crypto');

const DEFAULT_DEV_HOSTS = ['localhost', '127.0.0.1'];
const DEFAULT_DEV_PORTS = [3000, 3001, 4173, 5173, 5174];
const DEFAULT_ALLOWED_DEV_ORIGINS = DEFAULT_DEV_HOSTS.flatMap((host) =>
  DEFAULT_DEV_PORTS.map((port) => `http://${host}:${port}`)
);
const MIN_SECRET_LENGTH = 32;
const MIN_PASSWORD_LENGTH = 12;
const SAFE_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const DEFAULT_DB_PASSWORDS = new Set(['ytech_secure_password_2024', 'change-me-db-password']);

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

const timingSafeEqualString = (leftValue = '', rightValue = '') => {
  const leftBuffer = Buffer.from(`${leftValue}`);
  const rightBuffer = Buffer.from(`${rightValue}`);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
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

const normalizeOrigin = (value) => {
  const normalizedValue = normalizeText(value, { maxLength: 512 });

  if (!normalizedValue) {
    return '';
  }

  try {
    return new URL(normalizedValue).origin;
  } catch (error) {
    return '';
  }
};

const normalizeUserAgent = (value) =>
  normalizeText(value, {
    maxLength: 512
  });

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
    .map((value) => normalizeOrigin(value))
    .filter(Boolean);

  if (process.env.NODE_ENV === 'production') {
    return [...new Set(configuredOrigins)];
  }

  const extraDevOrigins = `${process.env.DEV_ALLOWED_ORIGINS || ''}`
    .split(',')
    .map((value) => normalizeOrigin(value))
    .filter(Boolean);

  return [
    ...new Set([
      ...DEFAULT_ALLOWED_DEV_ORIGINS,
      ...configuredOrigins,
      ...extraDevOrigins
    ])
  ];
};

const isPlaceholderSecret = (value = '') => {
  const normalized = value.toLowerCase();
  return (
    !value ||
    normalized.includes('change-this') ||
    normalized.includes('changeme') ||
    normalized.includes('fallback-secret') ||
    normalized.includes('your-super-secret') ||
    normalized.includes('replace-me')
  );
};

const isPlaceholderDbPassword = (value = '') => {
  const normalized = normalizeText(value, { maxLength: 255 }).toLowerCase();
  return !normalized || DEFAULT_DB_PASSWORDS.has(normalized) || normalized.includes('change-me');
};

const createHmac = (scope, value) => {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET || '';
  return crypto
    .createHmac('sha256', `${scope}:${secret}`)
    .update(`${value}`)
    .digest('hex');
};

const generateRandomToken = (size = 32) => crypto.randomBytes(size).toString('hex');

const createSignedToken = (scope, value) => {
  const token = normalizeText(value, { maxLength: 512 });
  if (!token) {
    return '';
  }

  return `${token}.${createHmac(scope, token)}`;
};

const verifySignedToken = (scope, signedValue) => {
  const normalizedValue = normalizeText(signedValue, { maxLength: 1024 });
  const separatorIndex = normalizedValue.lastIndexOf('.');

  if (separatorIndex <= 0) {
    return null;
  }

  const token = normalizedValue.slice(0, separatorIndex);
  const signature = normalizedValue.slice(separatorIndex + 1);
  const expectedSignature = createHmac(scope, token);

  if (!signature || !expectedSignature || !timingSafeEqualString(signature, expectedSignature)) {
    return null;
  }

  return token;
};

const validateSecurityConfiguration = () => {
  const errors = [];
  const warnings = [];
  const jwtSecret = process.env.JWT_SECRET || '';
  const sessionSecret = process.env.SESSION_SECRET || '';
  const dbPassword = process.env.DB_PASSWORD || '';
  const adminSeedPassword = process.env.ADMIN_SEED_PASSWORD || '';
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

  if (isPlaceholderDbPassword(dbPassword)) {
    const message = 'DB_PASSWORD doit etre configure avec une valeur robuste et non par defaut';
    if (isProduction) {
      errors.push(message);
    } else {
      warnings.push(message);
    }
  }

  if (adminSeedPassword) {
    const adminPasswordError = validateStrongPassword(adminSeedPassword);
    if (adminPasswordError) {
      const message = `ADMIN_SEED_PASSWORD invalide: ${adminPasswordError}`;
      if (isProduction) {
        errors.push(message);
      } else {
        warnings.push(message);
      }
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

const getMaxActiveSessions = () => parseInteger(process.env.MAX_ACTIVE_SESSIONS_PER_USER, 5);

const getMaxFailedLoginAttempts = () => parseInteger(process.env.MAX_FAILED_LOGIN_ATTEMPTS, 5);

const getLoginLockDurationMinutes = () => parseInteger(process.env.LOGIN_LOCK_DURATION_MINUTES, 30);

const getAuthCookieName = () => process.env.AUTH_COOKIE_NAME || 'ytech_auth';

const getCsrfCookieName = () => process.env.CSRF_COOKIE_NAME || 'ytech_csrf';

const getCsrfHeaderName = () => (process.env.CSRF_HEADER_NAME || 'x-csrf-token').toLowerCase();

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

const getCsrfCookieOptions = () => {
  const baseOptions = getCookieOptions();
  return {
    ...baseOptions,
    httpOnly: false
  };
};

const createCsrfToken = () => generateRandomToken(32);

const createSignedCsrfToken = (token = createCsrfToken()) => createSignedToken('csrf-token', token);

const verifyCsrfCookieValue = (cookieValue) => verifySignedToken('csrf-token', cookieValue);

const createScopedHash = (scope, value) => createHmac(scope, value);

const createSessionTokenHash = (token) => createScopedHash('session-token', token);

const isSafeHttpMethod = (method = 'GET') => SAFE_HTTP_METHODS.has(`${method}`.toUpperCase());

const isAllowedOrigin = (origin, allowedOrigins = getAllowedOrigins()) => {
  const normalizedOrigin = normalizeOrigin(origin);
  return Boolean(normalizedOrigin) && allowedOrigins.includes(normalizedOrigin);
};

module.exports = {
  createCsrfToken,
  createScopedHash,
  createSessionTokenHash,
  createSignedCsrfToken,
  createSignedToken,
  getAllowedOrigins,
  getAuthCookieName,
  getCookieOptions,
  getCsrfCookieName,
  getCsrfCookieOptions,
  getCsrfHeaderName,
  getLoginLockDurationMinutes,
  getMaxActiveSessions,
  getMaxFailedLoginAttempts,
  getSessionDurationMs,
  isAllowedOrigin,
  isValidEmail,
  isSafeHttpMethod,
  normalizeEmail,
  normalizeOrigin,
  normalizeText,
  normalizeUserAgent,
  parseBoolean,
  parseInteger,
  timingSafeEqualString,
  validateSecurityConfiguration,
  validateStrongPassword,
  verifyCsrfCookieValue,
  verifySignedToken
};
