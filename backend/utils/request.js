const { getAuthCookieName } = require('./security');

const SENSITIVE_KEYS = new Set([
  'password',
  'newPassword',
  'token',
  'sessionToken',
  'csrfToken',
  'x-csrf-token',
  'authorization',
  'cookie'
]);

const maskValue = (value) => {
  if (typeof value !== 'string') {
    return '[REDACTED]';
  }

  if (value.length <= 8) {
    return '[REDACTED]';
  }

  return `${value.slice(0, 4)}...[REDACTED]`;
};

const sanitizeObject = (value) => {
  if (typeof value === 'string') {
    return value.replace(/[\u0000-\u001F\u007F]/g, ' ').slice(0, 500);
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeObject(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, currentValue]) => {
      if (SENSITIVE_KEYS.has(key)) {
        return [key, maskValue(currentValue)];
      }

      if (currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue)) {
        return [key, sanitizeObject(currentValue)];
      }

      return [key, currentValue];
    })
  );
};

const parseCookies = (cookieHeader = '') => {
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf('=');

      if (separatorIndex === -1) {
        return cookies;
      }

      const name = part.slice(0, separatorIndex).trim();
      const rawValue = part.slice(separatorIndex + 1).trim();
      let value = rawValue;

      try {
        value = decodeURIComponent(rawValue);
      } catch (error) {
        value = rawValue;
      }

      if (name) {
        cookies[name] = value;
      }

      return cookies;
    }, {});
};

const getAuthToken = (req) => {
  const authCookieName = getAuthCookieName();
  const headerToken = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();

  if (headerToken) {
    return headerToken;
  }

  if (req.cookies?.[authCookieName]) {
    return req.cookies[authCookieName];
  }

  const cookies = parseCookies(req.headers.cookie || '');
  return cookies[authCookieName] || null;
};

const createRequestLog = (req) => {
  return {
    method: req.method,
    path: req.path,
    ip: req.ip,
    query: sanitizeObject(req.query),
    body: sanitizeObject(req.body)
  };
};

module.exports = {
  createRequestLog,
  getAuthToken,
  parseCookies
};
