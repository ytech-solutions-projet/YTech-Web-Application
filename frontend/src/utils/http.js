const CSRF_COOKIE_NAME = process.env.REACT_APP_CSRF_COOKIE_NAME || 'ytech_csrf';
const CSRF_HEADER_NAME = 'X-CSRF-Token';
const SAFE_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const RAW_API_BASE_URL = `${process.env.REACT_APP_API_URL || ''}`.trim();

let pendingCsrfRequest = null;

const isAbsoluteUrl = (value = '') => /^[a-z]+:\/\//i.test(value);
const isLoopbackHost = (value = '') => ['localhost', '127.0.0.1', '::1'].includes(`${value}`.toLowerCase());

const buildApiNetworkError = () =>
  new Error(
    "Impossible de joindre l API YTECH. Verifiez que le backend tourne bien et que l URL API pointe vers votre serveur."
  );

const normalizeNetworkError = (error) => {
  if (error instanceof TypeError || error?.message === 'Failed to fetch') {
    return buildApiNetworkError();
  }

  return error;
};

const resolveApiBaseUrl = () => {
  if (!RAW_API_BASE_URL) {
    return '';
  }

  try {
    const resolvedUrl = new URL(
      RAW_API_BASE_URL,
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    );

    if (typeof window !== 'undefined' && isLoopbackHost(resolvedUrl.hostname) && !isLoopbackHost(window.location.hostname)) {
      resolvedUrl.hostname = window.location.hostname;
    }

    return resolvedUrl.toString().replace(/\/+$/, '');
  } catch (error) {
    return RAW_API_BASE_URL.replace(/\/+$/, '');
  }
};

const resolveApiInput = (input) => {
  if (typeof input !== 'string') {
    return input;
  }

  const apiBaseUrl = resolveApiBaseUrl();

  if (!input.startsWith('/api') || !apiBaseUrl || isAbsoluteUrl(input)) {
    return input;
  }

  return `${apiBaseUrl}${input}`;
};

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
    pendingCsrfRequest = fetch(resolveApiInput('/api/auth/csrf-token'), {
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
      .catch((error) => {
        throw normalizeNetworkError(error);
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
  return fetch(resolveApiInput(input), await buildSecureFetchOptions(options));
};

export const fetchJson = async (input, options = {}) => {
  let response;

  try {
    response = await secureFetch(input, options);
  } catch (error) {
    throw normalizeNetworkError(error);
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    const error = new Error(payload?.error || payload?.message || 'Erreur de communication avec le serveur');
    error.payload = payload || {};
    error.status = response.status;
    throw error;
  }

  return {
    response,
    payload: payload || {}
  };
};
