const crypto = require('crypto');
const database = require('../config/database');
const { normalizeEmail, normalizeText } = require('../utils/security');

const sanitizeId = (value) => {
  const normalizedValue = normalizeText(value, { maxLength: 64 });
  return normalizedValue || crypto.randomUUID();
};

const toApiMessage = (row = {}) => ({
  id: row.id,
  senderId: row.sender_role === 'admin' ? 'admin' : row.sender_email,
  senderEmail: row.sender_email || '',
  senderName: row.sender_name || '',
  senderRole: row.sender_role || 'client',
  recipientId: row.recipient_role === 'admin' ? 'admin' : row.recipient_email,
  recipientEmail: row.recipient_email || '',
  recipientName: row.recipient_name || '',
  recipientRole: row.recipient_role || 'client',
  content: row.content || '',
  timestamp: row.created_at,
  status: row.status || 'sent',
  type: row.message_type || 'text',
  metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {}
});

class Message {
  static serialize(row) {
    return toApiMessage(row);
  }

  static async findById(id) {
    const rows = await database.query(
      'SELECT * FROM messages WHERE id = $1 LIMIT 1',
      [id]
    );

    return rows[0] ? this.serialize(rows[0]) : null;
  }

  static async create(payload = {}) {
    const id = sanitizeId(payload.id);
    const rows = await database.query(
      `INSERT INTO messages (
        id,
        sender_user_id,
        sender_name,
        sender_email,
        sender_role,
        recipient_user_id,
        recipient_name,
        recipient_email,
        recipient_role,
        content,
        message_type,
        status,
        metadata
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb
      )
      ON CONFLICT (id) DO NOTHING
      RETURNING *`,
      [
        id,
        payload.senderUserId ?? null,
        normalizeText(payload.senderName, { maxLength: 120 }),
        normalizeEmail(payload.senderEmail),
        normalizeText(payload.senderRole, { maxLength: 30 }) || 'client',
        payload.recipientUserId ?? null,
        normalizeText(payload.recipientName, { maxLength: 120 }),
        normalizeEmail(payload.recipientEmail),
        normalizeText(payload.recipientRole, { maxLength: 30 }) || 'client',
        normalizeText(payload.content, { maxLength: 5000, multiline: true }),
        normalizeText(payload.type || payload.messageType, { maxLength: 30 }) || 'text',
        normalizeText(payload.status, { maxLength: 30 }) || 'sent',
        JSON.stringify(payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {})
      ]
    );

    if (rows[0]) {
      return this.serialize(rows[0]);
    }

    return this.findById(id);
  }

  static async listForUser(user, options = {}) {
    const limit = Math.min(Math.max(Number.parseInt(options.limit || 200, 10) || 200, 1), 500);

    if (user.role === 'admin') {
      const rows = await database.query(
        `SELECT * FROM messages
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      );

      return rows.reverse().map((row) => this.serialize(row));
    }

    const rows = await database.query(
      `SELECT * FROM messages
       WHERE sender_email = $1 OR recipient_email = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [user.email, limit]
    );

    return rows.reverse().map((row) => this.serialize(row));
  }
}

module.exports = Message;
