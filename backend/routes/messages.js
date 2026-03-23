const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const { authenticateRequest } = require('../middleware/auth');
const { normalizeEmail, normalizeText, parseInteger } = require('../utils/security');

const router = express.Router();

const getAdminRecipient = async () => {
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

  const admins = await User.findAll({ page: 1, limit: 1, role: 'admin' });
  if (admins[0]) {
    return {
      userId: admins[0].id,
      email: admins[0].email,
      name: admins[0].name || configuredName,
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

const normalizeMessagePayload = (payload = {}) => ({
  id: normalizeText(payload.id, { maxLength: 64 }) || null,
  recipientId: normalizeText(payload.recipientId, { maxLength: 255 }) || null,
  recipientEmail: normalizeEmail(payload.recipientEmail || payload.recipientId),
  recipientName: normalizeText(payload.recipientName, { maxLength: 120 }),
  recipientRole: normalizeText(payload.recipientRole, { maxLength: 30 }),
  content: normalizeText(payload.content, { maxLength: 5000, multiline: true })
});

router.get('/', authenticateRequest, async (req, res) => {
  try {
    const messages = await Message.listForUser(req.user.details, {
      limit: parseInteger(req.query.limit, 200)
    });

    return res.json({
      success: true,
      total: messages.length,
      messages
    });
  } catch (error) {
    console.error('Erreur lecture messages:', error);
    return res.status(500).json({
      success: false,
      error: 'Impossible de lire les messages'
    });
  }
});

router.post('/', authenticateRequest, async (req, res) => {
  try {
    const sender = req.user.details;
    const payload = normalizeMessagePayload(req.body);

    if (!payload.content || payload.content.length < 1) {
      return res.status(400).json({
        success: false,
        error: 'Le message ne peut pas etre vide'
      });
    }

    let recipient;

    if (sender.role === 'admin') {
      if (!payload.recipientEmail) {
        return res.status(400).json({
          success: false,
          error: 'Destinataire requis'
        });
      }

      const recipientUser = await User.findByEmail(payload.recipientEmail);
      recipient = {
        userId: recipientUser?.id ?? null,
        email: payload.recipientEmail,
        name: payload.recipientName || recipientUser?.name || payload.recipientEmail,
        role: recipientUser?.role || payload.recipientRole || 'client'
      };
    } else {
      recipient = await getAdminRecipient();
    }

    const message = await Message.create({
      id: payload.id,
      senderUserId: sender.id,
      senderName: sender.name,
      senderEmail: sender.email,
      senderRole: sender.role,
      recipientUserId: recipient.userId,
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      recipientRole: recipient.role,
      content: payload.content,
      type: 'text',
      status: 'sent'
    });

    return res.status(201).json({
      success: true,
      message: 'Message envoye',
      record: message
    });
  } catch (error) {
    console.error('Erreur envoi message:', error);
    return res.status(500).json({
      success: false,
      error: "Impossible d'envoyer le message"
    });
  }
});

module.exports = router;
