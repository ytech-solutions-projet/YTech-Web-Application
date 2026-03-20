const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const Message = require('../models/Message');
const Quote = require('../models/Quote');
const User = require('../models/User');
const { authenticateRequest, maybeAuthenticateRequest, requireAdmin } = require('../middleware/auth');
const { normalizeEmail, normalizeText, parseInteger } = require('../utils/security');
const { isValidPhone, normalizePhone } = require('../utils/phone');

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
    phone: normalizePhone(payload.phone || payload.senderPhone),
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

  if (!payload.phone || !isValidPhone(payload.phone)) {
    return 'Choisissez un pays puis saisissez un numero de telephone valide';
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

const getAdminIdentity = async (fallbackUser = null) => {
  if (fallbackUser?.role === 'admin') {
    return {
      userId: fallbackUser.id,
      email: fallbackUser.email,
      name: fallbackUser.name || 'Admin YTECH',
      role: 'admin'
    };
  }

  const configuredEmail = normalizeEmail(process.env.ADMIN_SEED_EMAIL || 'admin@ytech.ma');
  const configuredName = normalizeText(process.env.ADMIN_SEED_NAME, { maxLength: 120 }) || 'Admin YTECH';
  const configuredAdmin = await User.findByEmail(configuredEmail);

  if (configuredAdmin) {
    return {
      userId: configuredAdmin.id,
      email: configuredAdmin.email,
      name: configuredAdmin.name || configuredName,
      role: 'admin'
    };
  }

  return {
    userId: null,
    email: configuredEmail,
    name: configuredName,
    role: 'admin'
  };
};

const findQuoteClient = async (quote) => {
  const clientEmail = normalizeEmail(quote?.email || quote?.senderId);
  const clientUser = clientEmail ? await User.findByEmail(clientEmail) : null;

  return {
    userId: clientUser?.id ?? null,
    email: clientEmail,
    name: normalizeText(quote?.senderName || quote?.name, { maxLength: 120 }) || clientUser?.name || 'Client',
    role: clientUser?.role || 'client'
  };
};

const formatMoney = (amount, currency = 'MAD') => {
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    return '';
  }

  return `${Number(amount).toLocaleString('fr-MA')} ${currency}`;
};

const buildDecisionMessage = (quote, status) => {
  const service = quote.metadata?.service || 'votre projet';
  const decisionNote = quote.metadata?.decisionNote ? `\n\nNote YTECH :\n${quote.metadata.decisionNote}` : '';
  const paymentAmount = formatMoney(quote.metadata?.paymentAmount, quote.metadata?.paymentCurrency || 'MAD');
  const estimate = quote.metadata?.estimatedRange ? `\nEstimation retenue : ${quote.metadata.estimatedRange}` : '';

  if (status === 'approved') {
    return [
      `Bonjour ${quote.senderName || 'client'},`,
      '',
      `Votre demande de devis pour ${service} a ete acceptee par notre equipe.`,
      paymentAmount
        ? `Le paiement attendu pour lancer le projet est de ${paymentAmount}.`
        : 'Votre paiement de lancement est maintenant attendu pour demarrer le projet.',
      'Vous pouvez maintenant ouvrir votre dashboard puis cliquer sur "Payer maintenant".',
      estimate,
      decisionNote,
      '',
      'Des reception du paiement, le projet passera automatiquement en production.'
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (status === 'rejected') {
    return [
      `Bonjour ${quote.senderName || 'client'},`,
      '',
      `Votre demande de devis pour ${service} n'a pas ete retenue en l'etat.`,
      'Vous pouvez nous recontacter pour ajuster le besoin, le budget ou le delai souhaite.',
      decisionNote
    ]
      .filter(Boolean)
      .join('\n');
  }

  return [
    `Bonjour ${quote.senderName || 'client'},`,
    '',
    `Le projet ${service} est maintenant passe en production chez YTECH.`,
    'Vous pourrez suivre la suite du projet depuis votre dashboard et votre messagerie.'
  ].join('\n');
};

const notifyClientAboutDecision = async (quote, status, adminUser) => {
  const recipient = await findQuoteClient(quote);
  if (!recipient.email) {
    return null;
  }

  const adminIdentity = await getAdminIdentity(adminUser);
  return Message.create({
    id: `qd_${crypto.randomUUID()}`,
    senderUserId: adminIdentity.userId,
    senderName: adminIdentity.name,
    senderEmail: adminIdentity.email,
    senderRole: 'admin',
    recipientUserId: recipient.userId,
    recipientName: recipient.name,
    recipientEmail: recipient.email,
    recipientRole: recipient.role,
    content: buildDecisionMessage(quote, status),
    type: 'text',
    status: 'sent',
    metadata: {
      source: 'quote_decision',
      quoteId: quote.id,
      quoteStatus: status
    }
  });
};

const notifyPaymentToAdmin = async (quote, payer) => {
  const adminIdentity = await getAdminIdentity();
  return Message.create({
    id: `qp_${crypto.randomUUID()}`,
    senderUserId: payer?.id ?? null,
    senderName: payer?.name || quote.senderName || 'Client',
    senderEmail: payer?.email || quote.email,
    senderRole: payer?.role || 'client',
    recipientUserId: adminIdentity.userId,
    recipientName: adminIdentity.name,
    recipientEmail: adminIdentity.email,
    recipientRole: 'admin',
    content: [
      `Paiement confirme pour le devis ${quote.metadata?.service || quote.id}.`,
      quote.metadata?.paymentAmount
        ? `Montant valide : ${formatMoney(quote.metadata.paymentAmount, quote.metadata.paymentCurrency || 'MAD')}.`
        : '',
      'Le projet peut maintenant etre traite comme actif.'
    ]
      .filter(Boolean)
      .join('\n'),
    type: 'text',
    status: 'sent',
    metadata: {
      source: 'quote_payment',
      quoteId: quote.id
    }
  });
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

router.patch('/:id/status', authenticateRequest, requireAdmin, async (req, res) => {
  try {
    const quoteId = normalizeText(req.params.id, { maxLength: 64 });
    const accessibleQuote = await Quote.canAccess(quoteId, req.user.details);

    if (!accessibleQuote) {
      return res.status(404).json({
        success: false,
        error: 'Devis introuvable'
      });
    }

    const quote = await Quote.updateStatus(quoteId, req.body?.status, {
      decisionNote: req.body?.decisionNote,
      decidedAt: new Date().toISOString(),
      decidedBy: req.user.details.email,
      paymentAmount: req.body?.paymentAmount,
      paymentCurrency: req.body?.paymentCurrency
    });

    if (quote && ['approved', 'rejected', 'in_progress'].includes(quote.status)) {
      await notifyClientAboutDecision(quote, quote.status, req.user.details);
    }

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

router.post('/:id/pay', authenticateRequest, async (req, res) => {
  try {
    if (req.user.details.role === 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Le paiement client doit etre effectue depuis un compte client'
      });
    }

    const quoteId = normalizeText(req.params.id, { maxLength: 64 });
    const accessibleQuote = await Quote.canAccess(quoteId, req.user.details);

    if (!accessibleQuote) {
      return res.status(404).json({
        success: false,
        error: 'Devis introuvable'
      });
    }

    if (accessibleQuote.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Ce devis n est pas encore pret pour le paiement'
      });
    }

    const paymentAmount =
      accessibleQuote.metadata?.paymentAmount ??
      accessibleQuote.metadata?.estimatedMin ??
      accessibleQuote.metadata?.estimatedMax ??
      null;

    const quote = await Quote.registerPayment(quoteId, {
      paymentAmount,
      paymentCurrency: accessibleQuote.metadata?.paymentCurrency || 'MAD',
      paymentTransactionId: `pay_${Date.now()}`,
      decidedBy: accessibleQuote.metadata?.decidedBy || 'admin@ytech.ma'
    });

    if (quote) {
      await notifyPaymentToAdmin(quote, req.user.details);
      await notifyClientAboutDecision(quote, 'in_progress');
    }

    return res.json({
      success: true,
      message: 'Paiement enregistre avec succes',
      quote,
      transaction: {
        id: quote?.metadata?.paymentTransactionId || `pay_${Date.now()}`,
        quoteId: quote?.id || quoteId,
        amount: quote?.metadata?.paymentAmount ?? paymentAmount,
        currency: quote?.metadata?.paymentCurrency || 'MAD',
        service: quote?.metadata?.service || accessibleQuote.metadata?.service || 'Projet YTECH',
        status: 'completed',
        timestamp: quote?.metadata?.paymentPaidAt || new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Erreur paiement devis:', error);
    return res.status(500).json({
      success: false,
      error: 'Impossible d enregistrer le paiement pour ce devis'
    });
  }
});

router.delete('/:id', authenticateRequest, requireAdmin, async (req, res) => {
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
