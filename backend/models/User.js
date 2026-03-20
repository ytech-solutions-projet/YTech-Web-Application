/**
 * YTECH - Modele Utilisateur
 * Gestion des operations CRUD pour les utilisateurs
 */

const bcrypt = require('bcryptjs');
const database = require('../config/database');
const { getTableColumns } = require('../utils/databaseBootstrap');
const { getSessionDurationMs } = require('../utils/security');

const BCRYPT_ROUNDS = Number.parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

class User {
  static tableColumns = new Map();

  static async getColumns(tableName) {
    if (!this.tableColumns.has(tableName)) {
      this.tableColumns.set(tableName, await getTableColumns(tableName));
    }

    return this.tableColumns.get(tableName);
  }

  static async hasColumn(tableName, columnName) {
    const columns = await this.getColumns(tableName);
    return columns.has(columnName);
  }

  static async getSelectableUserFields(includePassword = false) {
    const fields = ['id', 'name', 'email'];

    if (includePassword) {
      fields.push('password');
    }

    if (await this.hasColumn('users', 'phone')) {
      fields.push('phone');
    }

    if (await this.hasColumn('users', 'company')) {
      fields.push('company');
    }

    fields.push('role', 'is_active', 'email_verified', 'created_at');

    if (await this.hasColumn('users', 'last_login')) {
      fields.push('last_login');
    }

    return fields;
  }

  static async create(userData) {
    const { name, email, password, phone = null, company = null, role = 'client' } = userData;
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const columns = ['name', 'email', 'password'];
    const values = [name, email.toLowerCase(), hashedPassword];

    if (await this.hasColumn('users', 'phone')) {
      columns.push('phone');
      values.push(phone);
    }

    if (await this.hasColumn('users', 'company')) {
      columns.push('company');
      values.push(company);
    }

    columns.push('role', 'is_active', 'email_verified');
    values.push(role, true, false);

    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    const result = await database.query(
      `INSERT INTO users (${columns.join(', ')})
       VALUES (${placeholders}) RETURNING id`,
      values
    );

    return this.findById(result[0].id);
  }

  static async findById(id) {
    const fields = await this.getSelectableUserFields();
    const users = await database.query(
      `SELECT ${fields.join(', ')} FROM users WHERE id = $1`,
      [id]
    );

    return users[0] || null;
  }

  static async findByEmail(email, includePassword = false) {
    const fields = await this.getSelectableUserFields(includePassword);
    const users = await database.query(
      `SELECT ${fields.join(', ')} FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    return users[0] || null;
  }

  static async emailExists(email) {
    try {
      const result = await database.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      return result.length > 0;
    } catch (error) {
      console.error('Erreur emailExists:', error);
      return false;
    }
  }

  static async update(id, updateData) {
    const allowedFields = ['name', 'email_verified'];

    if (await this.hasColumn('users', 'phone')) {
      allowedFields.push('phone');
    }

    if (await this.hasColumn('users', 'company')) {
      allowedFields.push('company');
    }

    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${values.length + 1}`);
        values.push(value);
      }
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    if (await this.hasColumn('users', 'updated_at')) {
      updates.push('updated_at = NOW()');
    }

    values.push(id);
    await database.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length}`,
      values
    );

    return this.findById(id);
  }

  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    const updates = ['password = $1', 'email_verified = $2'];

    if (await this.hasColumn('users', 'updated_at')) {
      updates.push('updated_at = NOW()');
    }

    const result = await database.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $3`,
      [hashedPassword, true, id]
    );

    return result.rowCount > 0;
  }

  static async markLoginSuccess(id) {
    const updates = [];

    if (await this.hasColumn('users', 'last_login')) {
      updates.push('last_login = NOW()');
    }

    if (await this.hasColumn('users', 'updated_at')) {
      updates.push('updated_at = NOW()');
    }

    if (updates.length === 0) {
      return false;
    }

    const result = await database.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $1`,
      [id]
    );

    return result.rowCount > 0;
  }

  static async findAll(options = {}) {
    const { page = 1, limit = 10, role } = options;
    const offset = (page - 1) * limit;
    const fields = await this.getSelectableUserFields();
    let query = `SELECT ${fields.join(', ')} FROM users`;
    const params = [];

    if (role) {
      params.push(role);
      query += ` WHERE role = $${params.length}`;
    }

    params.push(limit);
    const limitPlaceholder = `$${params.length}`;
    params.push(offset);
    const offsetPlaceholder = `$${params.length}`;
    query += ` ORDER BY created_at DESC LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`;

    return database.query(query, params);
  }

  static async count(role = null) {
    let query = 'SELECT COUNT(*) as total FROM users';
    const params = [];

    if (role) {
      query += ' WHERE role = $1';
      params.push(role);
    }

    const result = await database.query(query, params);
    return Number.parseInt(result[0]?.total || 0, 10);
  }

  static async createSession(userId, sessionToken, ipAddress = null, userAgent = null) {
    const expiresAt = new Date(Date.now() + getSessionDurationMs());
    const columns = ['user_id', 'session_token', 'expires_at'];
    const values = [userId, sessionToken, expiresAt];

    if (await this.hasColumn('user_sessions', 'ip_address')) {
      columns.push('ip_address');
      values.push(ipAddress);
    }

    if (await this.hasColumn('user_sessions', 'user_agent')) {
      columns.push('user_agent');
      values.push(userAgent);
    }

    if (await this.hasColumn('user_sessions', 'is_active')) {
      columns.push('is_active');
      values.push(true);
    }

    if (await this.hasColumn('user_sessions', 'last_accessed')) {
      columns.push('last_accessed');
      values.push(new Date());
    }

    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    const result = await database.query(
      `INSERT INTO user_sessions (${columns.join(', ')})
       VALUES (${placeholders}) RETURNING id`,
      values
    );

    return {
      id: result[0].id,
      user_id: userId,
      session_token: sessionToken,
      expires_at: expiresAt
    };
  }

  static async findSessionByToken(userId, sessionToken) {
    const filters = [
      'user_id = $1',
      'session_token = $2',
      'expires_at > NOW()'
    ];

    if (await this.hasColumn('user_sessions', 'is_active')) {
      filters.push('is_active = TRUE');
    }

    const sessions = await database.query(
      `SELECT * FROM user_sessions WHERE ${filters.join(' AND ')} LIMIT 1`,
      [userId, sessionToken]
    );

    return sessions[0] || null;
  }

  static async getActiveSession(userId) {
    const filters = ['user_id = $1', 'expires_at > NOW()'];

    if (await this.hasColumn('user_sessions', 'is_active')) {
      filters.push('is_active = TRUE');
    }

    const orderBy = (await this.hasColumn('user_sessions', 'last_accessed'))
      ? 'last_accessed DESC'
      : 'created_at DESC';

    const sessions = await database.query(
      `SELECT * FROM user_sessions
       WHERE ${filters.join(' AND ')}
       ORDER BY ${orderBy}
       LIMIT 1`,
      [userId]
    );

    return sessions[0] || null;
  }

  static async touchSession(userId, sessionToken) {
    if (!(await this.hasColumn('user_sessions', 'last_accessed'))) {
      return false;
    }

    const filters = ['user_id = $1', 'session_token = $2'];
    if (await this.hasColumn('user_sessions', 'is_active')) {
      filters.push('is_active = TRUE');
    }

    const result = await database.execute(
      `UPDATE user_sessions SET last_accessed = NOW()
       WHERE ${filters.join(' AND ')}`,
      [userId, sessionToken]
    );

    return result.rowCount > 0;
  }

  static async invalidateSessionByToken(userId, sessionToken) {
    const updates = ['expires_at = NOW()'];

    if (await this.hasColumn('user_sessions', 'is_active')) {
      updates.push('is_active = FALSE');
    }

    const result = await database.execute(
      `UPDATE user_sessions
       SET ${updates.join(', ')}
       WHERE user_id = $1 AND session_token = $2`,
      [userId, sessionToken]
    );

    return result.rowCount > 0;
  }

  static async invalidateAllSessions(userId) {
    const updates = ['expires_at = NOW()'];

    if (await this.hasColumn('user_sessions', 'is_active')) {
      updates.push('is_active = FALSE');
    }

    const result = await database.execute(
      `UPDATE user_sessions SET ${updates.join(', ')} WHERE user_id = $1`,
      [userId]
    );

    return result.rowCount > 0;
  }

  static async invalidateSession(userId) {
    return this.invalidateAllSessions(userId);
  }

  static async cleanupExpiredSessions() {
    const result = await database.execute(
      'DELETE FROM user_sessions WHERE expires_at <= NOW()'
    );

    return result.rowCount;
  }
}

module.exports = User;
