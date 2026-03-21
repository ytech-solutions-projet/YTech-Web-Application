const CSRF_COOKIE_NAME = process.env.REACT_APP_CSRF_COOKIE_NAME || 'ytech_csrf';
const CSRF_HEADER_NAME = 'X-CSRF-Token';
const SAFE_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

let pendingCsrfRequest = null;

const readCookie = (name) => {
  if (typeof document === 'undefined') {
    return '';
  }

  const cookieEntry = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  if (!cookieEntry) {
    return '';
  }

  try {
    return decodeURIComponent(cookieEntry.slice(name.length + 1));
  } catch (error) {
    return cookieEntry.slice(name.length + 1);
  }
};

export const readCsrfTokenFromCookie = () => {
  const signedCookieValue = readCookie(CSRF_COOKIE_NAME);
  const separatorIndex = signedCookieValue.lastIndexOf('.');

  if (separatorIndex <= 0) {
    return '';
  }

  return signedCookieValue.slice(0, separatorIndex);
};

export const ensureCsrfToken = async () => {
  const existingToken = readCsrfTokenFromCookie();
  if (existingToken) {
    return existingToken;
  }

  if (!pendingCsrfRequest) {
    pendingCsrfRequest = fetch('/api/auth/csrf-token', {
      credentials: 'include',
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);

        if (!response.ok || payload?.success === false) {
          throw new Error(payload?.error || 'Impossible de charger le token de securite');
        }

        return payload?.csrfToken || readCsrfTokenFromCookie();
      })
      .finally(() => {
        pendingCsrfRequest = null;
      });
  }

  return pendingCsrfRequest;
};

export const buildSecureFetchOptions = async (options = {}) => {
  const method = `${options.method || 'GET'}`.toUpperCase();
  const headers = {
    'X-Requested-With': 'XMLHttpRequest',
    ...(options.headers || {})
  };

  if (!SAFE_HTTP_METHODS.has(method)) {
    const csrfToken = await ensureCsrfToken();

    if (csrfToken) {
      headers[CSRF_HEADER_NAME] = csrfToken;
    }
  }

  return {
    credentials: 'include',
    ...options,
    method,
    headers
  };
};

export const secureFetch = async (input, options = {}) => {
  return fetch(input, await buildSecureFetchOptions(options));
};

export const fetchJson = async (input, options = {}) => {
  const response = await secureFetch(input, options);
  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.message || 'Erreur de communication avec le serveur');
  }

  return {
    response,
    payload: payload || {}
  };
};
