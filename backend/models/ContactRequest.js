const crypto = require('crypto');
const database = require('../config/database');
const { normalizeEmail, normalizeText } = require('../utils/security');

const sanitizeId = (value) => {
  const normalizedValue = normalizeText(value, { maxLength: 64 });
  return normalizedValue || crypto.randomUUID();
};

const toApiContactRequest = (row = {}) => ({
  id: row.id,
  name: row.name || '',
  email: row.email || '',
  phone: row.phone || '',
  company: row.company || '',
  service: row.service || '',
  budget: row.budget || '',
  timeline: row.timeline || '',
  projectDescription: row.project_description || '',
  requestCategory: row.request_category || 'support',
  requestLabel: row.request_label || "Besoin d'aide",
  source: row.source || 'website',
  status: row.status || 'pending',
  timestamp: row.created_at,
  type: 'contact_request'
});

class ContactRequest {
  static serialize(row) {
    return toApiContactRequest(row);
  }

  static async findById(id) {
    const rows = await database.query(
      'SELECT * FROM contact_requests WHERE id = $1 LIMIT 1',
      [id]
    );

    return rows[0] ? this.serialize(rows[0]) : null;
  }

  static async create(payload = {}, options = {}) {
    const userId = options.userId ?? null;
    const id = sanitizeId(payload.id);
    const rows = await database.query(
      `INSERT INTO contact_requests (
        id,
        user_id,
        name,
        email,
        phone,
        company,
        service,
        budget,
        timeline,
        request_category,
        request_label,
        project_description,
        source,
        status
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )
      ON CONFLICT (id) DO NOTHING
      RETURNING *`,
      [
        id,
        userId,
        normalizeText(payload.name, { maxLength: 120 }),
        normalizeEmail(payload.email),
        normalizeText(payload.phone, { maxLength: 30 }),
        normalizeText(payload.company, { maxLength: 255 }) || null,
        normalizeText(payload.service, { maxLength: 120 }),
        normalizeText(payload.budget, { maxLength: 120 }),
        normalizeText(payload.timeline, { maxLength: 120 }),
        payload.requestCategory === 'quote_help' ? 'quote_help' : 'support',
        payload.requestCategory === 'quote_help'
          ? 'Aide devis'
          : normalizeText(payload.requestLabel, { maxLength: 120 }) || "Besoin d'aide",
        normalizeText(payload.projectDescription, { maxLength: 4000, multiline: true }),
        normalizeText(payload.source, { maxLength: 50 }) || 'website',
        'pending'
      ]
    );

    if (rows[0]) {
      return this.serialize(rows[0]);
    }

    return this.findById(id);
  }

  static async listForUser(user, options = {}) {
    const limit = Math.min(Math.max(Number.parseInt(options.limit || 50, 10) || 50, 1), 100);

    if (user.role === 'admin') {
      const rows = await database.query(
        `SELECT * FROM contact_requests
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      );

      return rows.map((row) => this.serialize(row));
    }

    const rows = await database.query(
      `SELECT * FROM contact_requests
       WHERE user_id = $1 OR email = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [user.id, user.email, limit]
    );

    return rows.map((row) => this.serialize(row));
  }
}

module.exports = ContactRequest;
