const express = require('express');
const rateLimit = require('express-rate-limit');
const ContactRequest = require('../models/ContactRequest');
const {
  authenticateRequest,
  maybeAuthenticateRequest
} = require('../middleware/auth');
const {
  isValidEmail,
  normalizeEmail,
  normalizeText,
  parseInteger
} = require('../utils/security');

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: parseInteger(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: parseInteger(process.env.CONTACT_RATE_LIMIT_MAX, 10),
  message: {
    success: false,
    error: 'Trop de demandes de contact. Reessayez plus tard.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const normalizeContactPayload = (payload = {}) => ({
  id: normalizeText(payload.id, { maxLength: 64 }) || null,
  name: normalizeText(payload.name, { maxLength: 120 }),
  email: normalizeEmail(payload.email),
  phone: normalizeText(payload.phone, { maxLength: 30 }),
  company: normalizeText(payload.company, { maxLength: 255 }) || null,
  service: normalizeText(payload.service, { maxLength: 120 }),
  budget: normalizeText(payload.budget, { maxLength: 120 }),
  timeline: normalizeText(payload.timeline, { maxLength: 120 }),
  requestCategory: payload.requestCategory === 'quote_help' ? 'quote_help' : 'support',
  requestLabel:
    payload.requestCategory === 'quote_help'
      ? 'Aide devis'
      : normalizeText(payload.requestLabel, { maxLength: 120 }) || "Besoin d'aide",
  projectDescription: normalizeText(payload.projectDescription, { maxLength: 4000, multiline: true }),
  source: 'website'
});

const validateContactPayload = (payload) => {
  if (!payload.name || payload.name.length < 2) {
    return 'Le nom doit contenir au moins 2 caracteres';
  }

  if (!isValidEmail(payload.email)) {
    return 'Email invalide';
  }

  if (!payload.phone || payload.phone.length < 8) {
    return 'Le telephone est requis';
  }

  if (!payload.service) {
    return 'Le service est requis';
  }

  if (!payload.projectDescription || payload.projectDescription.length < 10) {
    return 'La description du projet doit contenir au moins 10 caracteres';
  }

  return null;
};

router.post('/', contactLimiter, maybeAuthenticateRequest, async (req, res) => {
  try {
    const contactRequest = normalizeContactPayload(req.body);
    const validationError = validateContactPayload(contactRequest);

    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError
      });
    }

    const record = await ContactRequest.create(contactRequest, {
      userId: req.user?.details?.id ?? null
    });

    return res.status(201).json({
      success: true,
      message: 'Demande de contact enregistree avec succes',
      request: record
    });
  } catch (error) {
    console.error('Erreur contact:', error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors de l'enregistrement de la demande de contact"
    });
  }
});

router.get('/', authenticateRequest, async (req, res) => {
  try {
    const requests = await ContactRequest.listForUser(req.user.details, {
      limit: req.query.limit
    });

    return res.json({
      success: true,
      total: requests.length,
      requests
    });
  } catch (error) {
    console.error('Erreur lecture contacts:', error);
    return res.status(500).json({
      success: false,
      error: 'Impossible de lire les demandes de contact'
    });
  }
});

module.exports = router;
