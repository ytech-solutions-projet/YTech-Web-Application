process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:3000';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'YTECH_TEST_JWT_SECRET_2026_1234567890';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'YTECH_TEST_SESSION_SECRET_2026_1234567890';
process.env.AUTH_COOKIE_SAME_SITE = process.env.AUTH_COOKIE_SAME_SITE || 'strict';
process.env.AUTH_COOKIE_SECURE = process.env.AUTH_COOKIE_SECURE || 'false';
process.env.TRUST_PROXY = process.env.TRUST_PROXY || 'false';

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../server');
const advancedSecurity = require('../middleware/advancedSecurity');
const militaryJWT = require('../utils/militaryJWT');
const securityMonitor = require('../utils/securityMonitor');
const User = require('../models/User');
const { getCookieOptions } = require('../utils/security');
const { createRequestLog, sanitizeUrlForLogging } = require('../utils/request');

describe('Backend security and stability', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('GET /api/auth/csrf-token returns a CSRF token and cookie', async () => {
    const response = await request(app).get('/api/auth/csrf-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(typeof response.body.csrfToken).toBe('string');
    expect(response.body.csrfToken.length).toBeGreaterThan(10);
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('ytech_csrf=')])
    );
  });

  test('Security headers are present on API responses', async () => {
    const response = await request(app).get('/api/auth/csrf-token');

    expect(response.headers['x-frame-options']).toBeDefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
  });

  test('Rate limit middleware can be created without Redis', () => {
    const limiter = advancedSecurity.createDDoSProtection();

    expect(typeof limiter).toBe('function');
  });

  test('Security monitor keeps its bound request middleware context', () => {
    const initialMetrics = securityMonitor.getSecurityMetrics();
    const listeners = {};
    const req = {
      method: 'GET',
      path: '/api/test',
      url: '/api/test',
      body: {},
      query: {},
      ip: '127.0.0.1',
      get: () => ''
    };
    const res = {
      statusCode: 200,
      on: (event, callback) => {
        listeners[event] = callback;
      }
    };

    securityMonitor.trackRequest(req, res, () => undefined);
    listeners.finish();

    const updatedMetrics = securityMonitor.getSecurityMetrics();
    expect(updatedMetrics.requests).toBeGreaterThan(initialMetrics.requests);
  });

  test('Military JWT tokens can be generated, verified and revoked', () => {
    const token = militaryJWT.generateSecureToken({
      id: 7,
      email: 'client@ytech.ma',
      role: 'client',
      sid: 'session-token'
    });

    const decoded = militaryJWT.verifySecureToken(token);
    expect(decoded.id).toBe(7);
    expect(decoded.email).toBe('client@ytech.ma');

    expect(militaryJWT.revokeToken(token)).toBe(true);
    expect(() => militaryJWT.verifySecureToken(token)).toThrow('Token verification failed');
  });

  test('Cookie options follow environment-based security settings', () => {
    const cookieOptions = getCookieOptions();

    expect(cookieOptions.httpOnly).toBe(true);
    expect(cookieOptions.sameSite).toBe('strict');
    expect(cookieOptions.secure).toBe(false);
    expect(cookieOptions.path).toBe('/');
  });

  test('Development CORS defaults allow common frontend fallback ports', () => {
    const previousValues = {
      FRONTEND_URL: process.env.FRONTEND_URL,
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
      NODE_ENV: process.env.NODE_ENV
    };

    delete process.env.FRONTEND_URL;
    delete process.env.ALLOWED_ORIGINS;
    process.env.NODE_ENV = 'development';

    jest.resetModules();
    const { getAllowedOrigins: getAllowedOriginsWithDefaults } = require('../utils/security');
    const allowedOrigins = getAllowedOriginsWithDefaults();

    expect(allowedOrigins).toEqual(
      expect.arrayContaining([
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
        'http://127.0.0.1:3001'
      ])
    );

    process.env.FRONTEND_URL = previousValues.FRONTEND_URL;
    process.env.ALLOWED_ORIGINS = previousValues.ALLOWED_ORIGINS;
    process.env.NODE_ENV = previousValues.NODE_ENV;
  });

  test('Development allowed origins keep localhost fallback ports even when FRONTEND_URL is configured', () => {
    const previousValues = {
      FRONTEND_URL: process.env.FRONTEND_URL,
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
      NODE_ENV: process.env.NODE_ENV
    };

    process.env.NODE_ENV = 'development';
    process.env.FRONTEND_URL = 'http://192.168.10.41:3000';
    process.env.ALLOWED_ORIGINS = 'http://192.168.10.41:3000';

    jest.resetModules();
    const { getAllowedOrigins: getAllowedOriginsWithConfiguredDevOrigin } = require('../utils/security');
    const allowedOrigins = getAllowedOriginsWithConfiguredDevOrigin();

    expect(allowedOrigins).toEqual(
      expect.arrayContaining([
        'http://192.168.10.41:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001'
      ])
    );

    process.env.FRONTEND_URL = previousValues.FRONTEND_URL;
    process.env.ALLOWED_ORIGINS = previousValues.ALLOWED_ORIGINS;
    process.env.NODE_ENV = previousValues.NODE_ENV;
  });

  test('Database SSL config can be disabled explicitly', async () => {
    const previousValues = {
      DB_SSL: process.env.DB_SSL,
      DB_SSL_REJECT_UNAUTHORIZED: process.env.DB_SSL_REJECT_UNAUTHORIZED,
      NODE_ENV: process.env.NODE_ENV
    };

    process.env.NODE_ENV = 'production';
    process.env.DB_SSL = 'false';
    process.env.DB_SSL_REJECT_UNAUTHORIZED = 'true';

    jest.resetModules();
    const database = require('../config/database');

    expect(database.ssl).toBe(false);
    await database.close();

    process.env.NODE_ENV = previousValues.NODE_ENV;
    process.env.DB_SSL = previousValues.DB_SSL;
    process.env.DB_SSL_REJECT_UNAUTHORIZED = previousValues.DB_SSL_REJECT_UNAUTHORIZED;
  });

  test('Database SSL config accepts self-signed PostgreSQL when configured', async () => {
    const previousValues = {
      DB_SSL: process.env.DB_SSL,
      DB_SSL_REJECT_UNAUTHORIZED: process.env.DB_SSL_REJECT_UNAUTHORIZED,
      NODE_ENV: process.env.NODE_ENV
    };

    process.env.NODE_ENV = 'production';
    process.env.DB_SSL = 'true';
    process.env.DB_SSL_REJECT_UNAUTHORIZED = 'false';

    jest.resetModules();
    const database = require('../config/database');

    expect(database.ssl).toEqual({
      require: true,
      rejectUnauthorized: false
    });
    await database.close();

    process.env.NODE_ENV = previousValues.NODE_ENV;
    process.env.DB_SSL = previousValues.DB_SSL;
    process.env.DB_SSL_REJECT_UNAUTHORIZED = previousValues.DB_SSL_REJECT_UNAUTHORIZED;
  });

  test('Database config supports a remote PostgreSQL DATABASE_URL', async () => {
    const previousValues = {
      DATABASE_URL: process.env.DATABASE_URL,
      DB_SSL: process.env.DB_SSL,
      DB_SSL_REJECT_UNAUTHORIZED: process.env.DB_SSL_REJECT_UNAUTHORIZED,
      NODE_ENV: process.env.NODE_ENV
    };

    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgresql://remote_user:secret@10.10.10.3:5432/ytech_remote';
    process.env.DB_SSL = 'true';
    process.env.DB_SSL_REJECT_UNAUTHORIZED = 'false';

    jest.resetModules();
    const database = require('../config/database');

    expect(database.poolConfig.connectionString).toBe(
      'postgresql://remote_user:secret@10.10.10.3:5432/ytech_remote'
    );
    expect(database.poolConfig.ssl).toEqual({
      require: true,
      rejectUnauthorized: false
    });
    await database.close();

    process.env.DATABASE_URL = previousValues.DATABASE_URL;
    process.env.DB_SSL = previousValues.DB_SSL;
    process.env.DB_SSL_REJECT_UNAUTHORIZED = previousValues.DB_SSL_REJECT_UNAUTHORIZED;
    process.env.NODE_ENV = previousValues.NODE_ENV;
  });

  test('Authentication middleware accepts tokens signed by militaryJWT', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    jest.resetModules();

    const token = militaryJWT.generateSecureToken({
      id: 42,
      email: 'client@ytech.ma',
      role: 'client',
      sid: 'session-42'
    });

    jest.doMock('../models/User', () => ({
      findById: jest.fn().mockResolvedValue({
        id: 42,
        email: 'client@ytech.ma',
        role: 'client',
        is_active: true,
        password_changed_at: null
      }),
      findSessionByToken: jest.fn().mockResolvedValue({
        user_id: 42,
        session_token: 'session-42'
      }),
      touchSession: jest.fn().mockResolvedValue(true)
    }));

    jest.doMock('../utils/request', () => ({
      getAuthToken: jest.fn(() => token)
    }));

    const { authenticateRequest } = require('../middleware/auth');
    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    const next = jest.fn();

    await authenticateRequest(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.details.email).toBe('client@ytech.ma');

    jest.dontMock('../models/User');
    jest.dontMock('../utils/request');
    process.env.NODE_ENV = previousNodeEnv;
  });

  test('Password reset email helper skips sending when SMTP is missing', async () => {
    const previousValues = {
      EMAIL_HOST: process.env.EMAIL_HOST,
      EMAIL_PORT: process.env.EMAIL_PORT,
      EMAIL_USER: process.env.EMAIL_USER,
      EMAIL_PASS: process.env.EMAIL_PASS,
      EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS
    };

    delete process.env.EMAIL_HOST;
    delete process.env.EMAIL_PORT;
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
    delete process.env.EMAIL_FROM_ADDRESS;

    jest.resetModules();
    const { sendPasswordResetEmail } = require('../utils/email');

    const result = await sendPasswordResetEmail({
      to: 'client@ytech.ma',
      name: 'Client',
      resetUrl: 'http://localhost:3000/reset-password?token=test',
      expiresInMinutes: 15
    });

    expect(result).toEqual({
      delivered: false,
      skipped: true,
      reason: 'missing_email_configuration'
    });

    process.env.EMAIL_HOST = previousValues.EMAIL_HOST;
    process.env.EMAIL_PORT = previousValues.EMAIL_PORT;
    process.env.EMAIL_USER = previousValues.EMAIL_USER;
    process.env.EMAIL_PASS = previousValues.EMAIL_PASS;
    process.env.EMAIL_FROM_ADDRESS = previousValues.EMAIL_FROM_ADDRESS;
  });

  test('Email verification helper skips sending when SMTP is missing', async () => {
    const previousValues = {
      EMAIL_HOST: process.env.EMAIL_HOST,
      EMAIL_PORT: process.env.EMAIL_PORT,
      EMAIL_USER: process.env.EMAIL_USER,
      EMAIL_PASS: process.env.EMAIL_PASS,
      EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS
    };

    delete process.env.EMAIL_HOST;
    delete process.env.EMAIL_PORT;
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
    delete process.env.EMAIL_FROM_ADDRESS;

    jest.resetModules();
    const { sendEmailVerificationEmail } = require('../utils/email');

    const result = await sendEmailVerificationEmail({
      to: 'client@ytech.ma',
      name: 'Client',
      verificationUrl: 'http://localhost:3000/verify-email?token=test',
      expiresInHours: 24
    });

    expect(result).toEqual({
      delivered: false,
      skipped: true,
      reason: 'missing_email_configuration'
    });

    process.env.EMAIL_HOST = previousValues.EMAIL_HOST;
    process.env.EMAIL_PORT = previousValues.EMAIL_PORT;
    process.env.EMAIL_USER = previousValues.EMAIL_USER;
    process.env.EMAIL_PASS = previousValues.EMAIL_PASS;
    process.env.EMAIL_FROM_ADDRESS = previousValues.EMAIL_FROM_ADDRESS;
  });

  test('Authenticated users can request a password change link for their own email', async () => {
    const agent = request.agent(app);
    const csrfResponse = await agent
      .get('/api/auth/csrf-token')
      .set('Origin', 'http://localhost:3000');

    jest.spyOn(militaryJWT, 'verifySecureToken').mockReturnValue({
      id: 77,
      sid: 'session-77',
      iat: Math.floor(Date.now() / 1000),
      role: 'admin',
      email: 'admin@ytech.ma'
    });
    jest.spyOn(User, 'findSessionByToken').mockResolvedValue({
      user_id: 77,
      session_token: 'session-77'
    });
    jest.spyOn(User, 'touchSession').mockResolvedValue(true);
    jest.spyOn(User, 'findById').mockResolvedValue({
      id: 77,
      name: 'YTECH Admin',
      email: 'admin@ytech.ma',
      role: 'admin',
      is_active: true,
      password_changed_at: null
    });
    jest.spyOn(User, 'invalidatePasswordResetTokens').mockResolvedValue(true);
    const storePasswordResetTokenSpy = jest
      .spyOn(User, 'storePasswordResetToken')
      .mockResolvedValue({ id: 10 });

    const response = await agent
      .post('/api/auth/request-password-change')
      .set('Origin', 'http://localhost:3000')
      .set('User-Agent', 'jest-security-suite')
      .set('Authorization', 'Bearer auth-request-password-change')
      .set('X-CSRF-Token', csrfResponse.body.csrfToken)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.email).toBe('admin@ytech.ma');
    expect(response.body.resetToken).toBeNull();
    expect(response.body).toHaveProperty('resetUrl');
    expect(storePasswordResetTokenSpy).toHaveBeenCalledWith(
      77,
      expect.any(String),
      expect.objectContaining({
        ipAddress: expect.any(String),
        expiresAt: expect.any(Date)
      })
    );
  });

  test('Authenticated password change invalidates previous sessions and returns a fresh session', async () => {
    const agent = request.agent(app);
    const csrfResponse = await agent
      .get('/api/auth/csrf-token')
      .set('Origin', 'http://localhost:3000');

    const currentPasswordHash = await bcrypt.hash('AncienMot#2026', 4);
    const verifySecureTokenSpy = jest.spyOn(militaryJWT, 'verifySecureToken').mockReturnValue({
      id: 88,
      sid: 'session-88',
      iat: Math.floor(Date.now() / 1000),
      role: 'client',
      email: 'client@ytech.ma'
    });
    const revokeTokenSpy = jest.spyOn(militaryJWT, 'revokeToken').mockReturnValue(true);

    jest.spyOn(User, 'findSessionByToken').mockResolvedValue({
      user_id: 88,
      session_token: 'session-88'
    });
    jest.spyOn(User, 'touchSession').mockResolvedValue(true);
    jest.spyOn(User, 'findById').mockImplementation(async (id, options = {}) => {
      if (options.includePassword) {
        return {
          id: 88,
          name: 'Client Secure',
          email: 'client@ytech.ma',
          role: 'client',
          is_active: true,
          password: currentPasswordHash,
          password_changed_at: null
        };
      }

      return {
        id: 88,
        name: 'Client Secure',
        email: 'client@ytech.ma',
        role: 'client',
        is_active: true,
        password_changed_at: null
      };
    });

    const updatePasswordSpy = jest.spyOn(User, 'updatePassword').mockResolvedValue(true);
    const invalidatePasswordResetTokensSpy = jest
      .spyOn(User, 'invalidatePasswordResetTokens')
      .mockResolvedValue(true);
    const invalidateEmailVerificationTokensSpy = jest
      .spyOn(User, 'invalidateEmailVerificationTokens')
      .mockResolvedValue(true);
    const invalidateAllSessionsSpy = jest
      .spyOn(User, 'invalidateAllSessions')
      .mockResolvedValue(true);
    const createSessionSpy = jest.spyOn(User, 'createSession').mockResolvedValue({ id: 900 });

    const response = await agent
      .post('/api/auth/change-password')
      .set('Origin', 'http://localhost:3000')
      .set('User-Agent', 'jest-security-suite')
      .set('Authorization', 'Bearer auth-change-password')
      .set('X-CSRF-Token', csrfResponse.body.csrfToken)
      .send({
        currentPassword: 'AncienMot#2026',
        newPassword: 'NouveauMot#2026'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.user.email).toBe('client@ytech.ma');
    expect(updatePasswordSpy).toHaveBeenCalledWith(88, 'NouveauMot#2026');
    expect(invalidatePasswordResetTokensSpy).toHaveBeenCalledWith(88);
    expect(invalidateEmailVerificationTokensSpy).toHaveBeenCalledWith(88);
    expect(invalidateAllSessionsSpy).toHaveBeenCalledWith(88);
    expect(createSessionSpy).toHaveBeenCalledWith(
      88,
      expect.any(String),
      expect.any(String),
      'jest-security-suite'
    );
    expect(revokeTokenSpy).toHaveBeenCalledWith('auth-change-password');
    expect(invalidateAllSessionsSpy.mock.invocationCallOrder[0]).toBeLessThan(
      createSessionSpy.mock.invocationCallOrder[0]
    );
    expect(verifySecureTokenSpy).toHaveBeenCalledWith('auth-change-password');
  });

  test('Request logging redacts password and token fields before persistence', () => {
    const requestLog = createRequestLog({
      method: 'POST',
      path: '/api/auth/change-password',
      ip: '127.0.0.1',
      query: {
        token: 'plain-reset-token'
      },
      body: {
        currentPassword: 'AncienMot#2026',
        newPassword: 'NouveauMot#2026',
        nested: {
          verificationToken: 'email-token'
        }
      }
    });

    expect(requestLog.query.token).toContain('[REDACTED]');
    expect(requestLog.body.currentPassword).toContain('[REDACTED]');
    expect(requestLog.body.newPassword).toContain('[REDACTED]');
    expect(requestLog.body.nested.verificationToken).toContain('[REDACTED]');
  });

  test('URL logging redacts sensitive query parameters', () => {
    const sanitizedUrl = sanitizeUrlForLogging(
      '/api/auth/verify-email?token=verification-token&next=%2Fdashboard&mode=fast'
    );

    expect(sanitizedUrl).toContain('token=[REDACTED]');
    expect(sanitizedUrl).toContain('next=/dashboard');
    expect(sanitizedUrl).toContain('mode=fast');
    expect(sanitizedUrl).not.toContain('verification-token');
  });

  test('Registration keeps the raw password flow and requires email verification before login', async () => {
    const agent = request.agent(app);
    const csrfResponse = await agent
      .get('/api/auth/csrf-token')
      .set('Origin', 'http://localhost:3000');

    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(User, 'findByEmail').mockResolvedValue(null);
    const createSpy = jest.spyOn(User, 'create').mockResolvedValue({
      id: 101,
      name: "Meryem O'Connor",
      email: 'client@test.ma',
      role: 'client',
      is_active: true,
      email_verified: false
    });
    const storeEmailVerificationTokenSpy = jest
      .spyOn(User, 'storeEmailVerificationToken')
      .mockResolvedValue({ id: 1 });
    const createSessionSpy = jest.spyOn(User, 'createSession').mockResolvedValue({ id: 1 });
    const markLoginSuccessSpy = jest.spyOn(User, 'markLoginSuccess').mockResolvedValue(true);

    const response = await agent
      .post('/api/auth/register')
      .set('Origin', 'http://localhost:3000')
      .set('X-CSRF-Token', csrfResponse.body.csrfToken)
      .send({
        name: "Meryem O'Connor",
        email: 'client@test.ma',
        phone: '+212600000000',
        company: 'YTECH & Co',
        password: 'MotDePasse#2026'
      });

    expect(response.status).toBe(201);
    expect(response.body.verificationRequired).toBe(true);
    expect(response.body.email).toBe('client@test.ma');
    expect(response.body.verificationExpiresInHours).toBeGreaterThan(0);
    expect(response.body.emailDelivery).toEqual({
      delivered: false,
      skipped: true,
      reason: 'missing_email_configuration'
    });
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Meryem O'Connor",
        phone: '+212600000000',
        password: 'MotDePasse#2026'
      })
    );
    expect(createSpy.mock.calls[0][0].password).not.toMatch(/^\$2[aby]\$/);
    expect(storeEmailVerificationTokenSpy).toHaveBeenCalledWith(
      101,
      expect.any(String),
      expect.objectContaining({
        ipAddress: expect.any(String),
        expiresAt: expect.any(Date)
      })
    );
    expect(createSessionSpy).not.toHaveBeenCalled();
    expect(markLoginSuccessSpy).not.toHaveBeenCalled();
  });

  test('Login refuses access when the email is not verified', async () => {
    const agent = request.agent(app);
    const csrfResponse = await agent
      .get('/api/auth/csrf-token')
      .set('Origin', 'http://localhost:3000');

    const passwordHash = await bcrypt.hash('MotDePasse#2026', 4);

    jest.spyOn(User, 'findByEmail').mockResolvedValue({
      id: 201,
      email: 'client@test.ma',
      password: passwordHash,
      role: 'client',
      is_active: true,
      email_verified: false,
      failed_login_attempts: 0,
      locked_until: null
    });

    const createSessionSpy = jest.spyOn(User, 'createSession').mockResolvedValue({ id: 1 });
    const markLoginSuccessSpy = jest.spyOn(User, 'markLoginSuccess').mockResolvedValue(true);

    const response = await agent
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:3000')
      .set('X-CSRF-Token', csrfResponse.body.csrfToken)
      .send({
        email: 'client@test.ma',
        password: 'MotDePasse#2026'
      });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('EMAIL_NOT_VERIFIED');
    expect(createSessionSpy).not.toHaveBeenCalled();
    expect(markLoginSuccessSpy).not.toHaveBeenCalled();
  });

  test('Email verification endpoint marks the user as verified', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(User, 'findValidEmailVerificationToken').mockResolvedValue({
      user_id: 301
    });
    jest.spyOn(User, 'findById').mockResolvedValue({
      id: 301,
      email: 'client@test.ma'
    });
    const markEmailVerifiedSpy = jest.spyOn(User, 'markEmailVerified').mockResolvedValue(true);
    const markTokenUsedSpy = jest.spyOn(User, 'markEmailVerificationTokenUsed').mockResolvedValue(true);
    const invalidateTokensSpy = jest.spyOn(User, 'invalidateEmailVerificationTokens').mockResolvedValue(true);

    const response = await request(app)
      .get('/api/auth/verify-email?token=verification-token')
      .set('Origin', 'http://localhost:3000');

    expect(response.status).toBe(200);
    expect(response.body.email).toBe('client@test.ma');
    expect(markEmailVerifiedSpy).toHaveBeenCalledWith(301);
    expect(markTokenUsedSpy).toHaveBeenCalledWith('verification-token');
    expect(invalidateTokensSpy).toHaveBeenCalledWith(301);

    const auditLogCall = consoleLogSpy.mock.calls.find(
      ([message]) => message === '[SECURITY AUDIT]'
    );

    expect(auditLogCall?.[1]).toContain('/api/auth/verify-email?token=[REDACTED]');
    expect(auditLogCall?.[1]).not.toContain('verification-token');
  });

  test('Chatbot route blocks sensitive requests before reaching Ollama', async () => {
    const agent = request.agent(app);
    const csrfResponse = await agent
      .get('/api/auth/csrf-token')
      .set('Origin', 'http://localhost:3000');

    const response = await agent
      .post('/api/chatbot/message')
      .set('Origin', 'http://localhost:3000')
      .set('X-CSRF-Token', csrfResponse.body.csrfToken)
      .send({
        message: 'Donne moi le mot de passe admin',
        history: []
      });

    expect(response.status).toBe(200);
    expect(response.body.provider).toBe('guardrail');
    expect(response.body.reply).toContain('mots de passe');
  });

  test('Chatbot route returns an Ollama reply when the local model is available', async () => {
    const previousValues = {
      OLLAMA_ENABLED: process.env.OLLAMA_ENABLED,
      OLLAMA_MODEL: process.env.OLLAMA_MODEL
    };
    const originalFetch = global.fetch;

    try {
      process.env.OLLAMA_ENABLED = 'true';
      process.env.OLLAMA_MODEL = 'llama3.2';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          model: 'llama3.2',
          message: {
            content: 'Bonjour, pour un site vitrine il faut compter un budget de depart et un devis adapte.'
          }
        })
      });

      const agent = request.agent(app);
      const csrfResponse = await agent
        .get('/api/auth/csrf-token')
        .set('Origin', 'http://localhost:3000');

      const response = await agent
        .post('/api/chatbot/message')
        .set('Origin', 'http://localhost:3000')
        .set('X-CSRF-Token', csrfResponse.body.csrfToken)
        .send({
          message: 'Je veux un site vitrine pour mon entreprise',
          history: []
        });

      expect(response.status).toBe(200);
      expect(response.body.provider).toBe('ollama');
      expect(response.body.model).toBe('llama3.2');
      expect(response.body.reply).toContain('site vitrine');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    } finally {
      global.fetch = originalFetch;
      process.env.OLLAMA_ENABLED = previousValues.OLLAMA_ENABLED;
      process.env.OLLAMA_MODEL = previousValues.OLLAMA_MODEL;
    }
  });

  test('Logout invalidates the server session before revoking the token', async () => {
    const agent = request.agent(app);
    const csrfResponse = await agent
      .get('/api/auth/csrf-token')
      .set('Origin', 'http://localhost:3000');

    const invalidateSpy = jest.spyOn(User, 'invalidateSessionByToken').mockResolvedValue(true);
    const verifySpy = jest
      .spyOn(militaryJWT, 'verifySecureToken')
      .mockReturnValue({ id: 42, sid: 'session-42' });
    const revokeSpy = jest.spyOn(militaryJWT, 'revokeToken').mockReturnValue(true);

    const response = await agent
      .post('/api/auth/logout')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer signed-test-token')
      .set('X-CSRF-Token', csrfResponse.body.csrfToken);

    expect(response.status).toBe(200);
    expect(verifySpy).toHaveBeenCalledWith('signed-test-token');
    expect(invalidateSpy).toHaveBeenCalledWith(42, 'session-42');
    expect(revokeSpy).toHaveBeenCalledWith('signed-test-token');
    expect(invalidateSpy.mock.invocationCallOrder[0]).toBeLessThan(revokeSpy.mock.invocationCallOrder[0]);
  });

  test('CORS preflight allows PATCH requests used by quote status updates', async () => {
    const response = await request(app)
      .options('/api/quotes/qt_1/status')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'PATCH')
      .set('Access-Control-Request-Headers', 'Content-Type,X-CSRF-Token');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-methods']).toContain('PATCH');
  });
});
