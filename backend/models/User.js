/**
 * YTECH - Modele Utilisateur
 * Gestion des operations CRUD pour les utilisateurs
 */

const bcrypt = require('bcryptjs');
const database = require('../config/database');
const { getTableColumns } = require('../utils/databaseBootstrap');
const {
  createScopedHash,
  createSessionTokenHash,
  getLoginLockDurationMinutes,
  getMaxActiveSessions,
  getMaxFailedLoginAttempts,
  getSessionDurationMs,
  normalizeText,
  normalizeUserAgent
} = require('../utils/security');

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

  static async hasInlineSecurityColumns() {
    return (
      (await this.hasColumn('users', 'failed_login_attempts')) &&
      (await this.hasColumn('users', 'locked_until')) &&
      (await this.hasColumn('users', 'password_changed_at'))
    );
  }

  static buildSecurityState(securityState = {}, fallbackRow = {}) {
    return {
      failed_login_attempts: Number(securityState.failed_login_attempts ?? fallbackRow.failed_login_attempts ?? 0),
      locked_until: securityState.locked_until ?? fallbackRow.locked_until ?? null,
      last_failed_login: securityState.last_failed_login ?? fallbackRow.last_failed_login ?? null,
      password_changed_at:
        securityState.password_changed_at ?? fallbackRow.password_changed_at ?? fallbackRow.created_at ?? null
    };
  }

  static async ensureSecurityState(userId) {
    const rows = await database.query(
      `INSERT INTO user_security_state (
        user_id,
        password_changed_at
      )
      VALUES (
        $1,
        COALESCE((SELECT created_at FROM users WHERE id = $1), NOW())
      )
      ON CONFLICT (user_id) DO UPDATE
      SET user_id = EXCLUDED.user_id
      RETURNING failed_login_attempts, locked_until, last_failed_login, password_changed_at`,
      [userId]
    );

    return this.buildSecurityState(rows[0]);
  }

  static async attachSecurityState(user) {
    if (!user) {
      return null;
    }

    if (await this.hasInlineSecurityColumns()) {
      return {
        ...user,
        ...this.buildSecurityState({}, user)
      };
    }

    const securityState = await this.ensureSecurityState(user.id);
    return {
      ...user,
      ...securityState
    };
  }

  static async getSelectableUserFields(includePassword = false, options = {}) {
    const { includeSecurityState = false } = options;
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

    if (includeSecurityState) {
      if (await this.hasColumn('users', 'failed_login_attempts')) {
        fields.push('failed_login_attempts');
      }

      if (await this.hasColumn('users', 'locked_until')) {
        fields.push('locked_until');
      }

      if (await this.hasColumn('users', 'last_failed_login')) {
        fields.push('last_failed_login');
      }

      if (await this.hasColumn('users', 'password_changed_at')) {
        fields.push('password_changed_at');
      }
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

    if (!(await this.hasInlineSecurityColumns())) {
      await this.ensureSecurityState(result[0].id);
    }

    return this.findById(result[0].id);
  }

  static async findById(id, options = {}) {
    const fields = await this.getSelectableUserFields(false, options);
    const users = await database.query(
      `SELECT ${fields.join(', ')} FROM users WHERE id = $1`,
      [id]
    );

    if (!users[0]) {
      return null;
    }

    return options.includeSecurityState ? this.attachSecurityState(users[0]) : users[0];
  }

  static async findByEmail(email, includePassword = false, options = {}) {
    const fields = await this.getSelectableUserFields(includePassword, options);
    const users = await database.query(
      `SELECT ${fields.join(', ')} FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (!users[0]) {
      return null;
    }

    return options.includeSecurityState ? this.attachSecurityState(users[0]) : users[0];
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
    const hasInlineSecurityColumns = await this.hasInlineSecurityColumns();

    if (await this.hasColumn('users', 'updated_at')) {
      updates.push('updated_at = NOW()');
    }

    if (hasInlineSecurityColumns && (await this.hasColumn('users', 'password_changed_at'))) {
      updates.push('password_changed_at = NOW()');
    }

    if (hasInlineSecurityColumns && (await this.hasColumn('users', 'failed_login_attempts'))) {
      updates.push('failed_login_attempts = 0');
    }

    if (hasInlineSecurityColumns && (await this.hasColumn('users', 'locked_until'))) {
      updates.push('locked_until = NULL');
    }

    if (hasInlineSecurityColumns && (await this.hasColumn('users', 'last_failed_login'))) {
      updates.push('last_failed_login = NULL');
    }

    const result = await database.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $3`,
      [hashedPassword, true, id]
    );

    if (!hasInlineSecurityColumns) {
      await this.ensureSecurityState(id);
      await database.execute(
        `UPDATE user_security_state
         SET failed_login_attempts = 0,
             locked_until = NULL,
             last_failed_login = NULL,
             password_changed_at = NOW(),
             updated_at = NOW()
         WHERE user_id = $1`,
        [id]
      );
    }

    return result.rowCount > 0;
  }

  static async markLoginSuccess(id) {
    const updates = [];
    const hasInlineSecurityColumns = await this.hasInlineSecurityColumns();

    if (await this.hasColumn('users', 'last_login')) {
      updates.push('last_login = NOW()');
    }

    if (hasInlineSecurityColumns && (await this.hasColumn('users', 'failed_login_attempts'))) {
      updates.push('failed_login_attempts = 0');
    }

    if (hasInlineSecurityColumns && (await this.hasColumn('users', 'locked_until'))) {
      updates.push('locked_until = NULL');
    }

    if (hasInlineSecurityColumns && (await this.hasColumn('users', 'last_failed_login'))) {
      updates.push('last_failed_login = NULL');
    }

    if (await this.hasColumn('users', 'updated_at')) {
      updates.push('updated_at = NOW()');
    }

    let updatedUser = false;

    if (updates.length > 0) {
      const result = await database.execute(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $1`,
        [id]
      );

      updatedUser = result.rowCount > 0;
    }

    if (!hasInlineSecurityColumns) {
      await this.ensureSecurityState(id);
      const securityResult = await database.execute(
        `UPDATE user_security_state
         SET failed_login_attempts = 0,
             locked_until = NULL,
             last_failed_login = NULL,
             updated_at = NOW()
         WHERE user_id = $1`,
        [id]
      );

      return updatedUser || securityResult.rowCount > 0;
    }

    return updatedUser;
  }

  static async recordFailedLogin(id) {
    const nextAttemptLimit = getMaxFailedLoginAttempts();
    const lockDurationMinutes = getLoginLockDurationMinutes();
    const hasInlineSecurityColumns = await this.hasInlineSecurityColumns();
    const updates = [];

    if (hasInlineSecurityColumns && (await this.hasColumn('users', 'failed_login_attempts'))) {
      updates.push('failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1');
    }

    if (hasInlineSecurityColumns && (await this.hasColumn('users', 'last_failed_login'))) {
      updates.push('last_failed_login = NOW()');
    }

    if (hasInlineSecurityColumns && (await this.hasColumn('users', 'locked_until'))) {
      updates.push(`
        locked_until = CASE
          WHEN COALESCE(failed_login_attempts, 0) + 1 >= $2
            THEN NOW() + ($3::text || ' minutes')::interval
          ELSE locked_until
        END
      `);
    }

    if (hasInlineSecurityColumns && (await this.hasColumn('users', 'updated_at'))) {
      updates.push('updated_at = NOW()');
    }

    if (!hasInlineSecurityColumns) {
      await this.ensureSecurityState(id);

      const rows = await database.query(
        `UPDATE user_security_state
         SET failed_login_attempts = failed_login_attempts + 1,
             last_failed_login = NOW(),
             locked_until = CASE
               WHEN failed_login_attempts + 1 >= $2
                 THEN NOW() + ($3::text || ' minutes')::interval
               ELSE locked_until
             END,
             updated_at = NOW()
         WHERE user_id = $1
         RETURNING failed_login_attempts, locked_until, last_failed_login, password_changed_at`,
        [id, nextAttemptLimit, lockDurationMinutes]
      );

      return rows[0] || null;
    }

    if (updates.length === 0) {
      return null;
    }

    const rows = await database.query(
      `UPDATE users
       SET ${updates.join(', ')}
       WHERE id = $1
       RETURNING failed_login_attempts, locked_until`,
      [id, nextAttemptLimit, lockDurationMinutes]
    );

    return rows[0] || null;
  }

  static isLoginLocked(user) {
    const lockedUntil = user?.locked_until ? new Date(user.locked_until) : null;
    return Boolean(lockedUntil) && Number.isFinite(lockedUntil.getTime()) && lockedUntil.getTime() > Date.now();
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
    const hashedSessionToken = createSessionTokenHash(sessionToken);
    const columns = ['user_id', 'session_token', 'expires_at'];
    const values = [userId, hashedSessionToken, expiresAt];

    if (await this.hasColumn('user_sessions', 'ip_address')) {
      columns.push('ip_address');
      values.push(normalizeText(ipAddress, { maxLength: 64 }) || null);
    }

    if (await this.hasColumn('user_sessions', 'user_agent')) {
      columns.push('user_agent');
      values.push(normalizeUserAgent(userAgent) || null);
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

    await this.pruneExcessSessions(userId);

    return {
      id: result[0].id,
      user_id: userId,
      session_token: hashedSessionToken,
      expires_at: expiresAt
    };
  }

  static async pruneExcessSessions(userId) {
    const maxActiveSessions = getMaxActiveSessions();
    const orderBy = (await this.hasColumn('user_sessions', 'last_accessed'))
      ? 'COALESCE(last_accessed, created_at) DESC'
      : 'created_at DESC';

    if (!Number.isFinite(maxActiveSessions) || maxActiveSessions < 1) {
      return 0;
    }

    const result = await database.execute(
      `DELETE FROM user_sessions
       WHERE id IN (
         SELECT id
         FROM user_sessions
         WHERE user_id = $1
         ORDER BY ${orderBy}
         OFFSET $2
       )`,
      [userId, maxActiveSessions]
    );

    return result.rowCount || 0;
  }

  static async findSessionByToken(userId, sessionToken) {
    const hashedToken = createSessionTokenHash(sessionToken);
    const filters = [
      'user_id = $1',
      '(session_token = $2 OR session_token = $3)',
      'expires_at > NOW()'
    ];

    if (await this.hasColumn('user_sessions', 'is_active')) {
      filters.push('is_active = TRUE');
    }

    const sessions = await database.query(
      `SELECT * FROM user_sessions WHERE ${filters.join(' AND ')} LIMIT 1`,
      [userId, hashedToken, sessionToken]
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

    const hashedToken = createSessionTokenHash(sessionToken);
    const filters = ['user_id = $1', '(session_token = $2 OR session_token = $3)'];
    if (await this.hasColumn('user_sessions', 'is_active')) {
      filters.push('is_active = TRUE');
    }

    const result = await database.execute(
      `UPDATE user_sessions SET last_accessed = NOW()
       WHERE ${filters.join(' AND ')}`,
      [userId, hashedToken, sessionToken]
    );

    return result.rowCount > 0;
  }

  static async invalidateSessionByToken(userId, sessionToken) {
    const hashedToken = createSessionTokenHash(sessionToken);
    const updates = ['expires_at = NOW()'];

    if (await this.hasColumn('user_sessions', 'is_active')) {
      updates.push('is_active = FALSE');
    }

    const result = await database.execute(
      `UPDATE user_sessions
       SET ${updates.join(', ')}
       WHERE user_id = $1 AND (session_token = $2 OR session_token = $3)`,
      [userId, hashedToken, sessionToken]
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

  static createPasswordResetTokenHash(token) {
    return createScopedHash('password-reset-token', token);
  }

  static async storePasswordResetToken(userId, rawToken, options = {}) {
    const expiresAt = options.expiresAt instanceof Date ? options.expiresAt : new Date(Date.now() + 15 * 60 * 1000);
    const tokenHash = this.createPasswordResetTokenHash(rawToken);

    await this.invalidatePasswordResetTokens(userId);

    const rows = await database.query(
      `INSERT INTO password_reset_tokens (
        user_id,
        token_hash,
        request_ip,
        user_agent,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, expires_at`,
      [
        userId,
        tokenHash,
        normalizeText(options.ipAddress, { maxLength: 64 }) || null,
        normalizeUserAgent(options.userAgent) || null,
        expiresAt
      ]
    );

    return rows[0] || null;
  }

  static async findValidPasswordResetToken(rawToken) {
    const rows = await database.query(
      `SELECT *
       FROM password_reset_tokens
       WHERE token_hash = $1
         AND used_at IS NULL
         AND expires_at > NOW()
       LIMIT 1`,
      [this.createPasswordResetTokenHash(rawToken)]
    );

    return rows[0] || null;
  }

  static async markPasswordResetTokenUsed(rawToken) {
    const result = await database.execute(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE token_hash = $1
         AND used_at IS NULL`,
      [this.createPasswordResetTokenHash(rawToken)]
    );

    return result.rowCount > 0;
  }

  static async invalidatePasswordResetTokens(userId) {
    const result = await database.execute(
      'DELETE FROM password_reset_tokens WHERE user_id = $1 OR expires_at <= NOW()',
      [userId]
    );

    return result.rowCount > 0;
  }
}

module.exports = User;
