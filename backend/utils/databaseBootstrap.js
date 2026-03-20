const bcrypt = require('bcryptjs');
const fs = require('fs/promises');
const path = require('path');
const database = require('../config/database');

const ADMIN_DEFAULTS = {
  name: 'YTECH Admin',
  email: 'admin@ytech.ma',
  password: null,
  phone: '+212600000000',
  company: 'YTECH'
};

const normalizePhone = (phone) => {
  if (!phone) {
    return null;
  }

  const compactPhone = `${phone}`.replace(/\s+/g, '');

  if (/^\+212\d{9}$/.test(compactPhone)) {
    return compactPhone;
  }

  if (/^0\d{9}$/.test(compactPhone)) {
    return `+212${compactPhone.slice(1)}`;
  }

  return compactPhone;
};

const getTableColumns = async (tableName) => {
  const rows = await database.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [tableName]
  );

  return new Set(rows.map((row) => row.column_name));
};

const getTableColumnDetails = async (tableName) => {
  return database.query(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [tableName]
  );
};

const createUsersTable = async () => {
  await database.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(30),
      company VARCHAR(255),
      role VARCHAR(30) NOT NULL DEFAULT 'client',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

const createSessionsTable = async (userIdType = 'INTEGER') => {
  await database.execute(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id SERIAL PRIMARY KEY,
      user_id ${userIdType} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_token VARCHAR(255) NOT NULL UNIQUE,
      ip_address VARCHAR(64),
      user_agent TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

const createContactRequestsTable = async (userIdType = 'INTEGER') => {
  await database.execute(`
    CREATE TABLE IF NOT EXISTS contact_requests (
      id VARCHAR(64) PRIMARY KEY,
      user_id ${userIdType} REFERENCES users(id) ON DELETE SET NULL,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(30),
      company VARCHAR(255),
      service VARCHAR(120),
      budget VARCHAR(120),
      timeline VARCHAR(120),
      request_category VARCHAR(50) NOT NULL DEFAULT 'support',
      request_label VARCHAR(120) NOT NULL DEFAULT 'Besoin d''aide',
      project_description TEXT NOT NULL,
      source VARCHAR(50) NOT NULL DEFAULT 'website',
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await database.execute(`
    CREATE INDEX IF NOT EXISTS idx_contact_requests_email_created_at
    ON contact_requests(email, created_at DESC)
  `);
};

const createQuotesTable = async (userIdType = 'INTEGER') => {
  await database.execute(`
    CREATE TABLE IF NOT EXISTS quotes (
      id VARCHAR(64) PRIMARY KEY,
      user_id ${userIdType} REFERENCES users(id) ON DELETE SET NULL,
      sender_name VARCHAR(120) NOT NULL,
      sender_email VARCHAR(255) NOT NULL,
      sender_phone VARCHAR(30),
      company VARCHAR(255),
      service_name VARCHAR(120),
      service_id VARCHAR(80),
      budget_label VARCHAR(120),
      budget_value VARCHAR(80),
      timeline_label VARCHAR(120),
      timeline_value VARCHAR(80),
      project_description TEXT NOT NULL,
      features JSONB NOT NULL DEFAULT '[]'::jsonb,
      content TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await database.execute(`
    CREATE INDEX IF NOT EXISTS idx_quotes_sender_email_created_at
    ON quotes(sender_email, created_at DESC)
  `);
};

const createMessagesTable = async (userIdType = 'INTEGER') => {
  await database.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR(64) PRIMARY KEY,
      sender_user_id ${userIdType} REFERENCES users(id) ON DELETE SET NULL,
      sender_name VARCHAR(120) NOT NULL,
      sender_email VARCHAR(255) NOT NULL,
      sender_role VARCHAR(30) NOT NULL DEFAULT 'client',
      recipient_user_id ${userIdType} REFERENCES users(id) ON DELETE SET NULL,
      recipient_name VARCHAR(120) NOT NULL,
      recipient_email VARCHAR(255) NOT NULL,
      recipient_role VARCHAR(30) NOT NULL DEFAULT 'client',
      content TEXT NOT NULL,
      message_type VARCHAR(30) NOT NULL DEFAULT 'text',
      status VARCHAR(30) NOT NULL DEFAULT 'sent',
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await database.execute(`
    CREATE INDEX IF NOT EXISTS idx_messages_sender_created_at
    ON messages(sender_email, created_at DESC)
  `);

  await database.execute(`
    CREATE INDEX IF NOT EXISTS idx_messages_recipient_created_at
    ON messages(recipient_email, created_at DESC)
  `);
};

const readLegacyContactRequests = async () => {
  const legacyFile = path.join(__dirname, '../data/contact-requests.json');

  try {
    const rawContent = await fs.readFile(legacyFile, 'utf8');
    const parsedContent = JSON.parse(rawContent || '[]');
    return Array.isArray(parsedContent) ? parsedContent : [];
  } catch (error) {
    return [];
  }
};

const migrateLegacyContactRequests = async () => {
  const rows = await database.query(
    'SELECT COUNT(*)::int AS total FROM contact_requests'
  );

  if (Number(rows[0]?.total || 0) > 0) {
    return;
  }

  const legacyRequests = await readLegacyContactRequests();
  if (legacyRequests.length === 0) {
    return;
  }

  for (const request of legacyRequests) {
    await database.execute(
      `INSERT INTO contact_requests (
        id,
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
        status,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14
      )
      ON CONFLICT (id) DO NOTHING`,
      [
        `${request.id || Date.now()}`,
        request.name || 'Contact',
        request.email || 'contact@ytech.ma',
        request.phone || '',
        request.company || null,
        request.service || '',
        request.budget || '',
        request.timeline || '',
        request.requestCategory === 'quote_help' ? 'quote_help' : 'support',
        request.requestLabel || (request.requestCategory === 'quote_help' ? 'Aide devis' : "Besoin d'aide"),
        request.projectDescription || '',
        request.source || 'website',
        request.status || 'pending',
        request.createdAt || request.timestamp || new Date().toISOString()
      ]
    );
  }
};

const getAdminSeedConfig = () => {
  return {
    name: process.env.ADMIN_SEED_NAME || ADMIN_DEFAULTS.name,
    email: (process.env.ADMIN_SEED_EMAIL || ADMIN_DEFAULTS.email).trim().toLowerCase(),
    password: process.env.ADMIN_SEED_PASSWORD ? process.env.ADMIN_SEED_PASSWORD.trim() : ADMIN_DEFAULTS.password,
    phone: normalizePhone(process.env.ADMIN_SEED_PHONE || ADMIN_DEFAULTS.phone),
    company: (process.env.ADMIN_SEED_COMPANY || ADMIN_DEFAULTS.company).trim()
  };
};

const ensureSchema = async () => {
  const userColumns = await getTableColumns('users');
  if (userColumns.size === 0) {
    await createUsersTable();
  }

  const userDetails = await getTableColumnDetails('users');
  const idColumn = userDetails.find((column) => column.column_name === 'id');
  const userIdType = idColumn?.data_type === 'uuid' ? 'UUID' : 'INTEGER';

  const sessionColumns = await getTableColumns('user_sessions');
  if (sessionColumns.size === 0) {
    await createSessionsTable(userIdType);
  }

  const contactColumns = await getTableColumns('contact_requests');
  if (contactColumns.size === 0) {
    await createContactRequestsTable(userIdType);
  }

  const quoteColumns = await getTableColumns('quotes');
  if (quoteColumns.size === 0) {
    await createQuotesTable(userIdType);
  }

  const messageColumns = await getTableColumns('messages');
  if (messageColumns.size === 0) {
    await createMessagesTable(userIdType);
  }

  const refreshedUserColumns = await getTableColumns('users');
  const refreshedSessionColumns = await getTableColumns('user_sessions');

  if (!refreshedUserColumns.has('company')) {
    console.warn('[Bootstrap] La colonne users.company est absente. Le champ entreprise restera localement vide.');
  }

  if (!refreshedSessionColumns.has('session_token')) {
    throw new Error('La table user_sessions ne contient pas la colonne session_token requise');
  }

  await migrateLegacyContactRequests();

  return {
    userColumns: refreshedUserColumns,
    sessionColumns: refreshedSessionColumns
  };
};

const ensureAdminAccount = async (userColumns) => {
  const adminSeed = getAdminSeedConfig();

  if (!adminSeed.password) {
    console.warn('[databaseBootstrap] ADMIN_SEED_PASSWORD is not set. Admin seeding skipped.');
    return {
      ...adminSeed,
      created: false,
      skipped: true
    };
  }

  const bcryptRounds = Number.parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  const passwordHash = await bcrypt.hash(adminSeed.password, bcryptRounds);
  const existingAdmin = await database.query(
    'SELECT id FROM users WHERE email = $1',
    [adminSeed.email]
  );

  const hasCompanyColumn = userColumns.has('company');

  if (existingAdmin.length === 0) {
    const columns = ['name', 'email', 'password', 'phone', 'role', 'is_active', 'email_verified'];
    const values = [
      adminSeed.name,
      adminSeed.email,
      passwordHash,
      adminSeed.phone,
      'admin',
      true,
      true
    ];

    if (hasCompanyColumn) {
      columns.splice(4, 0, 'company');
      values.splice(4, 0, adminSeed.company || null);
    }

    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    await database.execute(
      `INSERT INTO users (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );

    return {
      ...adminSeed,
      created: true
    };
  }

  const updates = [
    'name = $1',
    'password = $2',
    'phone = $3',
    hasCompanyColumn ? 'company = $4' : null,
    hasCompanyColumn ? 'role = $5' : 'role = $4',
    hasCompanyColumn ? 'is_active = $6' : 'is_active = $5',
    hasCompanyColumn ? 'email_verified = $7' : 'email_verified = $6',
    'updated_at = NOW()'
  ].filter(Boolean);

  const values = hasCompanyColumn
    ? [
        adminSeed.name,
        passwordHash,
        adminSeed.phone,
        adminSeed.company || null,
        'admin',
        true,
        true,
        adminSeed.email
      ]
    : [
        adminSeed.name,
        passwordHash,
        adminSeed.phone,
        'admin',
        true,
        true,
        adminSeed.email
      ];

  await database.execute(
    `UPDATE users SET ${updates.join(', ')} WHERE email = $${values.length}`,
    values
  );

  return {
    ...adminSeed,
    created: false
  };
};

const initializeDatabase = async () => {
  const schema = await ensureSchema();
  return ensureAdminAccount(schema.userColumns);
};

module.exports = {
  getTableColumns,
  initializeDatabase,
  normalizePhone
};
