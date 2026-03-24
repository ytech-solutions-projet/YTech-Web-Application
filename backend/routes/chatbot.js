const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  normalizeText,
  parseBoolean,
  parseInteger
} = require('../utils/security');

const router = express.Router();

const fetch = (...args) => {
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch(...args);
  }

  return import('node-fetch').then(({ default: nodeFetch }) => nodeFetch(...args));
};

const sensitiveRequestKeywords = [
  'mot de passe admin',
  'password admin',
  'identifiant admin',
  'compte admin',
  'jwt secret',
  'session secret',
  'api key',
  'cle api',
  'mot de passe base de donnees',
  'db password',
  'acces ssh',
  'ssh',
  '.env',
  'secret'
];

const chatbotLimiter = rateLimit({
  windowMs: parseInteger(process.env.CHATBOT_RATE_LIMIT_WINDOW_MS, 5 * 60 * 1000),
  max: parseInteger(process.env.CHATBOT_RATE_LIMIT_MAX, 20),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    error: 'Trop de messages envoyes au chatbot. Reessayez dans quelques minutes.'
  }
});

const getOllamaSettings = () => {
  const rawBaseUrl = normalizeText(process.env.OLLAMA_BASE_URL, { maxLength: 2048 }).replace(/\/+$/, '');
  const apiBaseUrl = rawBaseUrl
    ? rawBaseUrl.endsWith('/api')
      ? rawBaseUrl
      : `${rawBaseUrl}/api`
    : 'http://127.0.0.1:11434/api';

  return {
    enabled: parseBoolean(process.env.OLLAMA_ENABLED, true),
    apiBaseUrl,
    model: normalizeText(process.env.OLLAMA_MODEL, { maxLength: 120 }) || 'llama3.2',
    timeoutMs: parseInteger(process.env.OLLAMA_TIMEOUT_MS, 12000)
  };
};

const normalizeChatContent = (value) =>
  normalizeText(value, {
    maxLength: 1200,
    multiline: true
  });

const containsSensitiveRequest = (message) =>
  sensitiveRequestKeywords.some((keyword) => message.includes(normalizeText(keyword)));

const sanitizeHistory = (history = []) =>
  (Array.isArray(history) ? history : [])
    .slice(-8)
    .map((entry) => {
      const roleSeed = normalizeText(entry?.role || entry?.sender, { maxLength: 20 });
      const role = ['assistant', 'bot'].includes(roleSeed) ? 'assistant' : 'user';
      const content = normalizeChatContent(entry?.content || entry?.text);

      if (!content) {
        return null;
      }

      return {
        role,
        content
      };
    })
    .filter(Boolean);

const buildSystemPrompt = () =>
  [
    'Tu es l assistant YTECH pour le site web YTECH.',
    'Tu reponds en francais, de facon claire, utile et concise.',
    'Tu aides surtout sur les services, le devis, les budgets, les delais, le paiement, la verification email, le compte, la messagerie, le suivi projet et la navigation sur le site.',
    'Le compte client exige une verification email avant la premiere connexion.',
    'Le devis est envoye avant paiement, puis l admin valide ou refuse avant de demander le reglement.',
    'Tu ne dois jamais divulguer de mots de passe, secrets, cles API, acces admin, details .env ou infrastructure sensible.',
    'Si une question sort du perimetre YTECH, tu recentres poliment vers ce que le site permet vraiment.',
    'Tu ne pretends jamais avoir execute une action technique ou verifie un etat serveur si ce n est pas fourni dans la conversation.'
  ].join('\n');

const buildOllamaMessages = (message, history = []) => {
  const sanitizedHistory = sanitizeHistory(history);
  const normalizedMessage = normalizeChatContent(message);

  if (!normalizedMessage) {
    return [];
  }

  const recentMessages = sanitizedHistory.slice(-6);
  const lastMessage = recentMessages[recentMessages.length - 1];
  const shouldAppendCurrentMessage =
    !lastMessage || lastMessage.role !== 'user' || lastMessage.content !== normalizedMessage;

  return [
    {
      role: 'system',
      content: buildSystemPrompt()
    },
    ...recentMessages,
    ...(shouldAppendCurrentMessage
      ? [
          {
            role: 'user',
            content: normalizedMessage
          }
        ]
      : [])
  ];
};

const callOllama = async (messages) => {
  const settings = getOllamaSettings();
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeout = controller
    ? setTimeout(() => controller.abort(), settings.timeoutMs)
    : null;

  try {
    const response = await fetch(`${settings.apiBaseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: controller?.signal,
      body: JSON.stringify({
        model: settings.model,
        messages,
        stream: false,
        keep_alive: '10m',
        options: {
          temperature: 0.35,
          num_predict: 260
        }
      })
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const details =
        normalizeText(payload?.error || payload?.message || response.statusText, { maxLength: 240 }) ||
        'reponse invalide';
      const error = new Error(`Ollama indisponible: ${details}`);
      error.status = response.status;
      throw error;
    }

    const reply = normalizeChatContent(payload?.message?.content);
    if (!reply) {
      throw new Error('Ollama a repondu sans contenu exploitable');
    }

    return {
      reply,
      model: normalizeText(payload?.model, { maxLength: 120 }) || settings.model
    };
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
};

router.post('/message', chatbotLimiter, async (req, res) => {
  try {
    const settings = getOllamaSettings();
    const message = normalizeChatContent(req.body?.message);

    if (!message || message.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Le message du chatbot doit contenir au moins 2 caracteres.'
      });
    }

    if (containsSensitiveRequest(message)) {
      return res.json({
        success: true,
        reply:
          'Je ne peux pas aider sur des mots de passe, secrets, acces admin ou informations techniques sensibles. Je peux par contre vous aider sur les services, le devis, le paiement, le compte et la verification email.',
        provider: 'guardrail',
        providerLabel: 'Protection YTECH',
        fallback: true
      });
    }

    if (!settings.enabled) {
      return res.status(503).json({
        success: false,
        error: 'Le modele Ollama local est desactive sur ce serveur.',
        code: 'OLLAMA_DISABLED'
      });
    }

    const messages = buildOllamaMessages(message, req.body?.history);
    const completion = await callOllama(messages);

    return res.json({
      success: true,
      reply: completion.reply,
      provider: 'ollama',
      providerLabel: 'Ollama local',
      model: completion.model,
      fallback: false
    });
  } catch (error) {
    console.error('Erreur chatbot Ollama:', error.message || error);
    return res.status(503).json({
      success: false,
      error: 'Le modele Ollama local est indisponible pour le moment.',
      code: 'OLLAMA_UNAVAILABLE'
    });
  }
});

module.exports = router;
