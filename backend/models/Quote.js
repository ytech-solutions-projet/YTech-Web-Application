const crypto = require('crypto');
const database = require('../config/database');
const { normalizeEmail, normalizeText } = require('../utils/security');

const sanitizeId = (value) => {
  const normalizedValue = normalizeText(value, { maxLength: 64 });
  return normalizedValue || crypto.randomUUID();
};

const sanitizeFeatureList = (features) => {
  if (!Array.isArray(features)) {
    return [];
  }

  return features
    .map((feature) => normalizeText(feature, { maxLength: 120 }))
    .filter(Boolean)
    .slice(0, 30);
};

const normalizeFiniteNumber = (value) => {
  if (!Number.isFinite(Number(value))) {
    return null;
  }

  return Number(value);
};

const normalizeTimestampValue = (value) =>
  normalizeText(value, { maxLength: 80 }) || null;

const sanitizeQuoteMetadata = (payload = {}) => {
  const metadata = payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {};
  const features = sanitizeFeatureList(payload.features || metadata.features);

  return {
    service: normalizeText(metadata.service || payload.serviceName || payload.service, { maxLength: 120 }),
    serviceId: normalizeText(metadata.serviceId || payload.serviceId, { maxLength: 80 }),
    budget: normalizeText(metadata.budget || payload.budgetLabel || payload.budget, { maxLength: 120 }),
    budgetValue: normalizeText(metadata.budgetValue || payload.budgetValue || payload.budget, { maxLength: 80 }),
    timeline: normalizeText(metadata.timeline || payload.timelineLabel || payload.timeline, { maxLength: 120 }),
    timelineValue: normalizeText(metadata.timelineValue || payload.timelineValue || payload.timeline, { maxLength: 80 }),
    features,
    estimatedRange: normalizeText(
      metadata.estimatedRange || payload.estimatedRange,
      { maxLength: 120 }
    ),
    estimatedMin: normalizeFiniteNumber(metadata.estimatedMin ?? payload.estimatedMin),
    estimatedMax: normalizeFiniteNumber(metadata.estimatedMax ?? payload.estimatedMax),
    featureCost: normalizeFiniteNumber(metadata.featureCost ?? payload.featureCost) ?? 0,
    timelineMultiplier: normalizeFiniteNumber(metadata.timelineMultiplier ?? payload.timelineMultiplier) ?? 1,
    timelineImpact: normalizeText(
      metadata.timelineImpact || payload.timelineImpact,
      { maxLength: 255 }
    ),
    decisionNote: normalizeText(
      metadata.decisionNote || payload.decisionNote,
      { maxLength: 1200, multiline: true }
    ),
    decidedAt: normalizeTimestampValue(metadata.decidedAt || payload.decidedAt),
    decidedBy: normalizeText(metadata.decidedBy || payload.decidedBy, { maxLength: 255 }),
    paymentStatus: normalizeText(metadata.paymentStatus || payload.paymentStatus, { maxLength: 40 }),
    paymentAmount: normalizeFiniteNumber(metadata.paymentAmount ?? payload.paymentAmount),
    paymentCurrency:
      normalizeText(metadata.paymentCurrency || payload.paymentCurrency, { maxLength: 12 }) || 'MAD',
    paymentPaidAt: normalizeTimestampValue(metadata.paymentPaidAt || payload.paymentPaidAt),
    paymentTransactionId: normalizeText(
      metadata.paymentTransactionId || payload.paymentTransactionId,
      { maxLength: 120 }
    ),
    paymentMethod: normalizeText(metadata.paymentMethod || payload.paymentMethod, { maxLength: 30 }),
    paymentProvider: normalizeText(metadata.paymentProvider || payload.paymentProvider, { maxLength: 30 }),
    paymentCardBrand: normalizeText(metadata.paymentCardBrand || payload.paymentCardBrand, { maxLength: 60 }),
    paymentLast4: normalizeText(metadata.paymentLast4 || payload.paymentLast4, { maxLength: 4 }),
    paymentPayerEmail: normalizeEmail(metadata.paymentPayerEmail || payload.paymentPayerEmail),
    paymentLabel: normalizeText(metadata.paymentLabel || payload.paymentLabel, { maxLength: 160 })
  };
};

const toApiQuote = (row = {}) => {
  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  const safeMetadata = {
    service: metadata.service || row.service_name || '',
    serviceId: metadata.serviceId || row.service_id || '',
    budget: metadata.budget || row.budget_label || '',
    budgetValue: metadata.budgetValue || row.budget_value || '',
    timeline: metadata.timeline || row.timeline_label || '',
    timelineValue: metadata.timelineValue || row.timeline_value || '',
    features: Array.isArray(metadata.features) ? metadata.features : [],
    estimatedRange: metadata.estimatedRange || '',
    estimatedMin: metadata.estimatedMin ?? null,
    estimatedMax: metadata.estimatedMax ?? null,
    featureCost: metadata.featureCost ?? 0,
    timelineMultiplier: metadata.timelineMultiplier ?? 1,
    timelineImpact: metadata.timelineImpact || '',
    decisionNote: metadata.decisionNote || '',
    decidedAt: metadata.decidedAt || '',
    decidedBy: metadata.decidedBy || '',
    paymentStatus: metadata.paymentStatus || '',
    paymentAmount: metadata.paymentAmount ?? null,
    paymentCurrency: metadata.paymentCurrency || 'MAD',
    paymentPaidAt: metadata.paymentPaidAt || '',
    paymentTransactionId: metadata.paymentTransactionId || '',
    paymentMethod: metadata.paymentMethod || '',
    paymentProvider: metadata.paymentProvider || '',
    paymentCardBrand: metadata.paymentCardBrand || '',
    paymentLast4: metadata.paymentLast4 || '',
    paymentPayerEmail: metadata.paymentPayerEmail || '',
    paymentLabel: metadata.paymentLabel || ''
  };

  return {
    id: row.id,
    senderId: row.sender_email,
    senderName: row.sender_name || '',
    senderRole: 'client',
    recipientId: 'admin',
    recipientName: 'Admin YTECH',
    recipientRole: 'admin',
    email: row.sender_email,
    name: row.sender_name || '',
    phone: row.sender_phone || '',
    company: row.company || '',
    projectDescription: row.project_description || '',
    content: row.content || '',
    timestamp: row.created_at,
    status: row.status || 'pending',
    type: 'quote_request',
    metadata: safeMetadata
  };
};

class Quote {
  static allowedStatuses = new Set(['pending', 'approved', 'rejected', 'in_progress']);

  static serialize(row) {
    return toApiQuote(row);
  }

  static resolveDefaultPaymentAmount(metadata = {}) {
    if (Number.isFinite(Number(metadata.paymentAmount)) && Number(metadata.paymentAmount) > 0) {
      return Number(metadata.paymentAmount);
    }

    if (Number.isFinite(Number(metadata.estimatedMin)) && Number(metadata.estimatedMin) > 0) {
      return Number(metadata.estimatedMin);
    }

    if (Number.isFinite(Number(metadata.estimatedMax)) && Number(metadata.estimatedMax) > 0) {
      return Number(metadata.estimatedMax);
    }

    return null;
  }

  static buildMetadata(row, nextStatus, options = {}) {
    const currentMetadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    const mergedMetadata = sanitizeQuoteMetadata({
      metadata: {
        ...currentMetadata,
        ...options
      },
      features: options.features || currentMetadata.features
    });

    let paymentStatus = mergedMetadata.paymentStatus || currentMetadata.paymentStatus || '';

    if (nextStatus === 'approved' && paymentStatus !== 'paid') {
      paymentStatus = 'awaiting_payment';
    } else if (nextStatus === 'rejected') {
      paymentStatus = 'not_required';
    } else if (nextStatus === 'in_progress') {
      paymentStatus = options.paymentStatus || paymentStatus || 'paid';
    }

    const paymentAmount =
      mergedMetadata.paymentAmount ?? this.resolveDefaultPaymentAmount({ ...currentMetadata, ...mergedMetadata });

    return {
      ...mergedMetadata,
      decisionNote: mergedMetadata.decisionNote || currentMetadata.decisionNote || '',
      decidedAt: mergedMetadata.decidedAt || currentMetadata.decidedAt || '',
      decidedBy: mergedMetadata.decidedBy || currentMetadata.decidedBy || '',
      paymentStatus,
      paymentAmount,
      paymentCurrency: mergedMetadata.paymentCurrency || currentMetadata.paymentCurrency || 'MAD',
      paymentPaidAt: mergedMetadata.paymentPaidAt || currentMetadata.paymentPaidAt || '',
      paymentTransactionId:
        mergedMetadata.paymentTransactionId || currentMetadata.paymentTransactionId || ''
    };
  }

  static async findRowById(id) {
    const rows = await database.query(
      'SELECT * FROM quotes WHERE id = $1 LIMIT 1',
      [id]
    );

    return rows[0] || null;
  }

  static async findById(id) {
    const row = await this.findRowById(id);
    return row ? this.serialize(row) : null;
  }

  static async create(payload = {}, options = {}) {
    const userId = options.userId ?? null;
    const metadata = sanitizeQuoteMetadata({
      ...payload,
      features: payload.features || payload.metadata?.features || []
    });
    const id = sanitizeId(payload.id);

    const rows = await database.query(
      `INSERT INTO quotes (
        id,
        user_id,
        sender_name,
        sender_email,
        sender_phone,
        company,
        service_name,
        service_id,
        budget_label,
        budget_value,
        timeline_label,
        timeline_value,
        project_description,
        features,
        content,
        metadata,
        status
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, $16::jsonb, $17
      )
      ON CONFLICT (id) DO NOTHING
      RETURNING *`,
      [
        id,
        userId,
        normalizeText(payload.name || payload.senderName, { maxLength: 120 }),
        normalizeEmail(payload.email || payload.senderEmail || payload.senderId),
        normalizeText(payload.phone || payload.senderPhone, { maxLength: 30 }),
        normalizeText(payload.company, { maxLength: 255 }) || null,
        metadata.service,
        metadata.serviceId,
        metadata.budget,
        metadata.budgetValue,
        metadata.timeline,
        metadata.timelineValue,
        normalizeText(payload.projectDescription, { maxLength: 6000, multiline: true }),
        JSON.stringify(metadata.features),
        normalizeText(payload.content, { maxLength: 10000, multiline: true }),
        JSON.stringify(metadata),
        'pending'
      ]
    );

    if (rows[0]) {
      return this.serialize(rows[0]);
    }

    return this.findById(id);
  }

  static async listForUser(user, options = {}) {
    const limit = Math.min(Math.max(Number.parseInt(options.limit || 100, 10) || 100, 1), 200);

    if (user.role === 'admin') {
      const rows = await database.query(
        `SELECT * FROM quotes
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      );

      return rows.map((row) => this.serialize(row));
    }

    const rows = await database.query(
      `SELECT * FROM quotes
       WHERE user_id = $1 OR sender_email = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [user.id, user.email, limit]
    );

    return rows.map((row) => this.serialize(row));
  }

  static async canAccess(id, user) {
    if (user.role === 'admin') {
      return this.findRowById(id);
    }

    const rows = await database.query(
      `SELECT * FROM quotes
       WHERE id = $1 AND (user_id = $2 OR sender_email = $3)
       LIMIT 1`,
      [id, user.id, user.email]
    );

    return rows[0] || null;
  }

  static async updateStatus(id, status, options = {}) {
    const normalizedStatus = normalizeText(status, { maxLength: 30 }).toLowerCase();
    if (!this.allowedStatuses.has(normalizedStatus)) {
      throw new Error('Statut de devis invalide');
    }

    const existingRow = await this.findRowById(id);
    if (!existingRow) {
      return null;
    }

    const metadata = this.buildMetadata(existingRow, normalizedStatus, options);
    const rows = await database.query(
      `UPDATE quotes
       SET status = $1, metadata = $2::jsonb, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [normalizedStatus, JSON.stringify(metadata), id]
    );

    return rows[0] ? this.serialize(rows[0]) : null;
  }

  static async registerPayment(id, options = {}) {
    const existingRow = await this.findRowById(id);
    if (!existingRow) {
      return null;
    }

    const paymentTimestamp = new Date().toISOString();
    const metadata = this.buildMetadata(existingRow, 'in_progress', {
      ...options,
      paymentStatus: 'paid',
      paymentPaidAt: paymentTimestamp,
      decidedAt: existingRow.metadata?.decidedAt || paymentTimestamp
    });

    const rows = await database.query(
      `UPDATE quotes
       SET status = $1, metadata = $2::jsonb, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      ['in_progress', JSON.stringify(metadata), id]
    );

    return rows[0] ? this.serialize(rows[0]) : null;
  }

  static async deleteById(id) {
    const result = await database.execute(
      'DELETE FROM quotes WHERE id = $1',
      [id]
    );

    return result.rowCount > 0;
  }
}

module.exports = Quote;
