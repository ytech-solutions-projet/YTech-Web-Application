const buildJsonOptions = (method, body, options = {}) => {
  const headers = {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {})
  };

  return {
    method,
    credentials: 'include',
    ...options,
    headers,
    body: body ? JSON.stringify(body) : undefined
  };
};

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => null);
  const backendError =
    payload?.error === 'Route non trouvee'
      ? "Le service n'est pas encore disponible sur ce serveur. Verifiez le deploiement du backend."
      : payload?.error || payload?.message;

  if (!response.ok || payload?.success === false) {
    throw new Error(backendError || 'Erreur de communication avec le serveur');
  }

  return payload || {};
};

export const listContactRequests = async () => {
  const payload = await requestJson('/api/contact', buildJsonOptions('GET'));
  return Array.isArray(payload.requests) ? payload.requests : [];
};

export const submitContactRequest = async (request) => {
  const payload = await requestJson('/api/contact', buildJsonOptions('POST', request));
  return payload.request || null;
};

export const listQuotes = async () => {
  const payload = await requestJson('/api/quotes', buildJsonOptions('GET'));
  return Array.isArray(payload.quotes) ? payload.quotes : [];
};

export const submitQuoteRequest = async (quote) => {
  const payload = await requestJson('/api/quotes', buildJsonOptions('POST', quote));
  return payload.quote || null;
};

export const updateQuoteStatus = async (quoteId, status, options = {}) => {
  const payload = await requestJson(
    `/api/quotes/${encodeURIComponent(quoteId)}/status`,
    buildJsonOptions('PATCH', { status, ...options })
  );
  return payload.quote || null;
};

export const payQuote = async (quoteId) => {
  const payload = await requestJson(
    `/api/quotes/${encodeURIComponent(quoteId)}/pay`,
    buildJsonOptions('POST')
  );

  return {
    quote: payload.quote || null,
    transaction: payload.transaction || null
  };
};

export const deleteQuote = async (quoteId) => {
  await requestJson(
    `/api/quotes/${encodeURIComponent(quoteId)}`,
    buildJsonOptions('DELETE')
  );

  return true;
};

export const listMessages = async () => {
  const payload = await requestJson('/api/messages', buildJsonOptions('GET'));
  return Array.isArray(payload.messages) ? payload.messages : [];
};

export const sendMessage = async (message) => {
  const payload = await requestJson('/api/messages', buildJsonOptions('POST', message));
  return payload.record || null;
};
