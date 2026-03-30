const { getAuthCookieName } = require('./security');

const SENSITIVE_KEYS = new Set([
  'password',
  'newpassword',
  'currentpassword',
  'confirmpassword',
  'token',
  'resettoken',
  'verificationtoken',
  'sessiontoken',
  'csrftoken',
  'x-csrf-token',
  'authorization',
  'cookie'
]);

const isSensitiveKey = (key = '') => {
  const normalizedKey = `${key}`.trim().toLowerCase();
  return (
    SENSITIVE_KEYS.has(normalizedKey) ||
    normalizedKey.includes('password') ||
    normalizedKey.includes('token') ||
    normalizedKey.includes('authorization') ||
    normalizedKey.includes('cookie') ||
    normalizedKey.includes('csrf')
  );
};

const maskValue = (value) => {
  if (typeof value !== 'string') {
    return '[REDACTED]';
  }

  if (value.length <= 8) {
    return '[REDACTED]';
  }

  return `${value.slice(0, 4)}...[REDACTED]`;
};

const sanitizeTextForLogging = (value, maxLength = 500) =>
  `${value || ''}`.replace(/[\u0000-\u001F\u007F]/g, ' ').slice(0, maxLength);

const decodeURIComponentSafe = (value = '') => {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
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
      if (isSensitiveKey(key)) {
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

const sanitizeUrlForLogging = (url = '') => {
  const normalizedUrl = sanitizeTextForLogging(url, 2048);
  const hashIndex = normalizedUrl.indexOf('#');
  const baseUrl = hashIndex === -1 ? normalizedUrl : normalizedUrl.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? '' : normalizedUrl.slice(hashIndex + 1);
  const queryIndex = baseUrl.indexOf('?');

  if (queryIndex === -1) {
    return normalizedUrl;
  }

  const path = baseUrl.slice(0, queryIndex);
  const queryString = baseUrl.slice(queryIndex + 1);
  const sanitizedQuery = queryString
    .split('&')
    .filter(Boolean)
    .slice(0, 50)
    .map((pair) => {
      const separatorIndex = pair.indexOf('=');
      const rawKey = separatorIndex === -1 ? pair : pair.slice(0, separatorIndex);
      const rawValue = separatorIndex === -1 ? '' : pair.slice(separatorIndex + 1);
      const key = sanitizeTextForLogging(decodeURIComponentSafe(rawKey), 120);

      if (!key) {
        return '';
      }

      if (isSensitiveKey(key)) {
        return `${key}=[REDACTED]`;
      }

      const value = sanitizeTextForLogging(decodeURIComponentSafe(rawValue), 200);
      return separatorIndex === -1 ? key : `${key}=${value}`;
    })
    .filter(Boolean)
    .join('&');

  const sanitizedFragment = fragment
    ? `#${sanitizeTextForLogging(fragment, 120)}`
    : '';

  return `${path}${sanitizedQuery ? `?${sanitizedQuery}` : ''}${sanitizedFragment}`;
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
  parseCookies,
  sanitizeUrlForLogging
};
