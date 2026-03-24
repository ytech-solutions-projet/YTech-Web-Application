import { fetchJson } from './http';

const normalizeHistory = (history = []) =>
  (Array.isArray(history) ? history : [])
    .slice(-8)
    .map((entry) => ({
      sender: entry?.sender === 'bot' ? 'assistant' : 'user',
      text: `${entry?.text || ''}`.trim()
    }))
    .filter((entry) => entry.text);

export const requestChatbotReply = async (message, history = []) => {
  const { payload } = await fetchJson('/api/chatbot/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message,
      history: normalizeHistory(history)
    })
  });

  return {
    reply: `${payload.reply || ''}`.trim(),
    provider: payload.provider || 'ollama',
    providerLabel: payload.providerLabel || 'Ollama local',
    model: payload.model || '',
    fallback: Boolean(payload.fallback)
  };
};
