const express = require('express');
const rateLimit = require('express-rate-limit');
const Quote = require('../models/Quote');
const { authenticateRequest, maybeAuthenticateRequest } = require('../middleware/auth');
const { normalizeEmail, normalizeText, parseInteger } = require('../utils/security');

const router = express.Router();

const quoteLimiter = rateLimit({
  windowMs: parseInteger(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: parseInteger(process.env.QUOTE_RATE_LIMIT_MAX, 10),
  message: {
    success: false,
    error: 'Trop de demandes de devis. Reessayez plus tard.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const sanitizeFeatures = (features) =>
  Array.isArray(features)
    ? features
        .map((feature) => normalizeText(feature, { maxLength: 120 }))
        .filter(Boolean)
        .slice(0, 30)
    : [];

const normalizeQuotePayload = (payload = {}) => {
  const metadata = payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {};

  return {
    id: normalizeText(payload.id, { maxLength: 64 }) || null,
    name: normalizeText(payload.name || payload.senderName, { maxLength: 120 }),
    email: normalizeEmail(payload.email || payload.senderEmail || payload.senderId),
    phone: normalizeText(payload.phone || payload.senderPhone, { maxLength: 30 }),
    company: normalizeText(payload.company, { maxLength: 255 }) || null,
    serviceId: normalizeText(payload.service || metadata.serviceId, { maxLength: 80 }),
    serviceName: normalizeText(metadata.service || payload.serviceName, { maxLength: 120 }),
    budget: normalizeText(payload.budget || metadata.budgetValue, { maxLength: 80 }),
    budgetLabel: normalizeText(metadata.budget || payload.budgetLabel, { maxLength: 120 }),
    timeline: normalizeText(payload.timeline || metadata.timelineValue, { maxLength: 80 }),
    timelineLabel: normalizeText(metadata.timeline || payload.timelineLabel, { maxLength: 120 }),
    projectDescription: normalizeText(payload.projectDescription, { maxLength: 6000, multiline: true }),
    features: sanitizeFeatures(payload.features || metadata.features),
    estimatedRange: normalizeText(metadata.estimatedRange || payload.estimatedRange, { maxLength: 120 }),
    estimatedMin: Number.isFinite(Number(metadata.estimatedMin ?? payload.estimatedMin))
      ? Number(metadata.estimatedMin ?? payload.estimatedMin)
      : null,
    estimatedMax: Number.isFinite(Number(metadata.estimatedMax ?? payload.estimatedMax))
      ? Number(metadata.estimatedMax ?? payload.estimatedMax)
      : null,
    featureCost: Number.isFinite(Number(metadata.featureCost ?? payload.featureCost))
      ? Number(metadata.featureCost ?? payload.featureCost)
      : 0,
    timelineMultiplier: Number.isFinite(Number(metadata.timelineMultiplier ?? payload.timelineMultiplier))
      ? Number(metadata.timelineMultiplier ?? payload.timelineMultiplier)
      : 1,
    timelineImpact: normalizeText(
      metadata.timelineImpact || payload.timelineImpact,
      { maxLength: 255 }
    ),
    content: normalizeText(payload.content, { maxLength: 10000, multiline: true })
  };
};

const validateQuotePayload = (payload) => {
  if (!payload.name || payload.name.length < 2) {
    return 'Le nom doit contenir au moins 2 caracteres';
  }

  if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return 'Email invalide';
  }

  if (!payload.phone || !/^\+212\d{9}$/.test(payload.phone.replace(/\s+/g, ''))) {
    return 'Le telephone doit commencer par +212 suivi de 9 chiffres';
  }

  if (!payload.serviceId) {
    return 'Le service est requis';
  }

  if (!payload.projectDescription || payload.projectDescription.length < 10) {
    return 'La description du projet doit contenir au moins 10 caracteres';
  }

  if (!payload.content) {
    return 'Le contenu du devis est requis';
  }

  return null;
};

router.post('/', quoteLimiter, maybeAuthenticateRequest, async (req, res) => {
  try {
    const quotePayload = normalizeQuotePayload(req.body);
    const validationError = validateQuotePayload(quotePayload);

    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError
      });
    }

    const quote = await Quote.create(quotePayload, {
      userId: req.user?.details?.id ?? null
    });

    return res.status(201).json({
      success: true,
      message: 'Demande de devis enregistree avec succes',
      quote
    });
  } catch (error) {
    console.error('Erreur devis:', error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors de l'enregistrement du devis"
    });
  }
});

router.get('/', authenticateRequest, async (req, res) => {
  try {
    const quotes = await Quote.listForUser(req.user.details, {
      limit: req.query.limit
    });

    return res.json({
      success: true,
      total: quotes.length,
      quotes
    });
  } catch (error) {
    console.error('Erreur lecture devis:', error);
    return res.status(500).json({
      success: false,
      error: 'Impossible de lire les devis'
    });
  }
});

router.patch('/:id/status', authenticateRequest, async (req, res) => {
  try {
    const quoteId = normalizeText(req.params.id, { maxLength: 64 });
    const accessibleQuote = await Quote.canAccess(quoteId, req.user.details);

    if (!accessibleQuote) {
      return res.status(404).json({
        success: false,
        error: 'Devis introuvable'
      });
    }

    const quote = await Quote.updateStatus(quoteId, req.body?.status);

    return res.json({
      success: true,
      quote
    });
  } catch (error) {
    const isValidationError = error.message === 'Statut de devis invalide';

    return res.status(isValidationError ? 400 : 500).json({
      success: false,
      error: isValidationError ? error.message : 'Impossible de mettre a jour le devis'
    });
  }
});

router.delete('/:id', authenticateRequest, async (req, res) => {
  try {
    const quoteId = normalizeText(req.params.id, { maxLength: 64 });
    const accessibleQuote = await Quote.canAccess(quoteId, req.user.details);

    if (!accessibleQuote) {
      return res.status(404).json({
        success: false,
        error: 'Devis introuvable'
      });
    }

    await Quote.deleteById(quoteId);

    return res.json({
      success: true,
      message: 'Devis supprime'
    });
  } catch (error) {
    console.error('Erreur suppression devis:', error);
    return res.status(500).json({
      success: false,
      error: 'Impossible de supprimer le devis'
    });
  }
});

module.exports = router;
