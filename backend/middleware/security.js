const { parseCookies } = require('../utils/request');
const {
  createCsrfToken,
  createSignedCsrfToken,
  getCsrfCookieName,
  getCsrfCookieOptions,
  getCsrfHeaderName,
  isAllowedOrigin,
  isSafeHttpMethod,
  normalizeText,
  timingSafeEqualString,
  verifyCsrfCookieValue
} = require('../utils/security');

const SECURITY_ERROR = {
  success: false,
  error: 'Requete bloquee par la politique de securite'
};

const readHeaderValue = (headerValue) => {
  if (Array.isArray(headerValue)) {
    return `${headerValue[0] || ''}`;
  }

  return `${headerValue || ''}`;
};

const attachCsrfToken = (req, res) => {
  const cookieName = getCsrfCookieName();
  const cookies = parseCookies(req.headers.cookie || '');
  const cookieValue = cookies[cookieName] || '';
  const existingToken = verifyCsrfCookieValue(cookieValue);

  if (existingToken) {
    req.csrfToken = existingToken;
    return existingToken;
  }

  const csrfToken = createCsrfToken();
  res.cookie(cookieName, createSignedCsrfToken(csrfToken), getCsrfCookieOptions());
  req.csrfToken = csrfToken;
  return csrfToken;
};

const validateRequestOrigin = (req) => {
  const origin = readHeaderValue(req.headers.origin).trim();
  if (!origin) {
    return false;
  }

  return isAllowedOrigin(origin);
};

const validateCsrfHeader = (req) => {
  const headerName = getCsrfHeaderName();
  const csrfHeaderValue = normalizeText(readHeaderValue(req.headers[headerName]), {
    maxLength: 256
  });

  return Boolean(req.csrfToken) && Boolean(csrfHeaderValue) && timingSafeEqualString(req.csrfToken, csrfHeaderValue);
};

const csrfProtection = (req, res, next) => {
  attachCsrfToken(req, res);
  res.setHeader('Vary', 'Origin');

  if (isSafeHttpMethod(req.method)) {
    return next();
  }

  if (!validateRequestOrigin(req) || !validateCsrfHeader(req)) {
    return res.status(403).json(SECURITY_ERROR);
  }

  return next();
};

module.exports = {
  csrfProtection
};
