/**
 * YTECH - Routes d'Authentification
 * API securisee pour l'inscription et la connexion
 */

const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { authenticateRequest } = require('../middleware/auth');
const militaryJWT = require('../utils/militaryJWT');
const securityMonitor = require('../utils/securityMonitor');
const { sendEmailVerificationEmail, sendPasswordResetEmail } = require('../utils/email');
const { isValidPhone, normalizePhone } = require('../utils/phone');
const { getAuthToken } = require('../utils/request');
const {
  createSignedCsrfToken,
  getAuthCookieName,
  getCookieOptions,
  getCsrfCookieName,
  getCsrfCookieOptions,
  isValidEmail,
  normalizeEmail,
  normalizeText,
  parseBoolean,
  parseInteger
} = require('../utils/security');

const router = express.Router();
const authCookieName = getAuthCookieName();
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('YTECH_dummy_password_2026!', 12);

const createLimiter = (maxRequests, message) =>
  rateLimit({
    windowMs: parseInteger(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    message: {
      success: false,
      error: message
    }
  });

const authLimiter = createLimiter(
  parseInteger(process.env.AUTH_RATE_LIMIT_MAX, 5),
  'Trop de tentatives de connexion. Reessayez plus tard.'
);

const registerLimiter = createLimiter(
  parseInteger(process.env.REGISTER_RATE_LIMIT_MAX, 5),
  "Trop d'inscriptions en peu de temps. Reessayez plus tard."
);

const passwordResetLimiter = createLimiter(
  parseInteger(process.env.PASSWORD_RESET_RATE_LIMIT_MAX, 5),
  'Trop de demandes de reinitialisation. Reessayez plus tard.'
);

const emailVerificationLimiter = createLimiter(
  parseInteger(process.env.EMAIL_VERIFICATION_RATE_LIMIT_MAX, 5),
  'Trop de demandes de verification email. Reessayez plus tard.'
);

class AuthController {
  static generateToken(user, sessionToken) {
    return militaryJWT.generateSecureToken({
      id: user.id,
      email: user.email,
      role: user.role,
      sid: sessionToken,
      scope: user.role === 'admin' ? 'admin' : 'user'
    }, {
      expiresIn: `${parseInteger(process.env.SESSION_TIMEOUT_HOURS, 24)}h`
    });
  }

  static generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  static sanitizeRegistrationPayload(payload = {}) {
    return {
      name: normalizeText(payload.name, { maxLength: 120 }),
      email: normalizeEmail(payload.email),
      phone: normalizePhone(payload.phone),
      company: normalizeText(payload.company, { maxLength: 255 }) || null,
      password: `${payload.password || ''}`
    };
  }

  static sanitizeLoginPayload(payload = {}) {
    return {
      email: normalizeEmail(payload.email),
      password: `${payload.password || ''}`
    };
  }

  static async sendAuthSuccess(res, user, sessionToken, message, statusCode = 200) {
    const token = this.generateToken(user, sessionToken);

    res.cookie(authCookieName, token, getCookieOptions());
    res.cookie(getCsrfCookieName(), createSignedCsrfToken(), getCsrfCookieOptions());
    return res.status(statusCode).json({
      success: true,
      message,
      user
    });
  }

  static getPasswordResetBaseUrl() {
    return normalizeText(process.env.PASSWORD_RESET_BASE_URL || process.env.FRONTEND_URL, {
      maxLength: 2048
    }) || 'http://192.168.10.41:3000';
  }

  static getPasswordResetExpiresInMinutes() {
    return parseInteger(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES, 15);
  }

  static buildPasswordResetUrl(resetToken) {
    return `${this.getPasswordResetBaseUrl()}/reset-password?token=${encodeURIComponent(resetToken)}`;
  }

  static getEmailVerificationBaseUrl() {
    return normalizeText(process.env.EMAIL_VERIFICATION_BASE_URL || process.env.FRONTEND_URL, {
      maxLength: 2048
    }) || 'http://192.168.10.41:3000';
  }

  static getEmailVerificationExpiresInHours() {
    return parseInteger(process.env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS, 24);
  }

  static buildEmailVerificationUrl(verificationToken) {
    return `${this.getEmailVerificationBaseUrl()}/verify-email?token=${encodeURIComponent(verificationToken)}`;
  }

  static shouldLogEmailVerificationUrl() {
    return parseBoolean(
      process.env.LOG_EMAIL_VERIFICATION_URLS,
      process.env.NODE_ENV !== 'production'
    );
  }

  static buildEmailVerificationResponseMessage({ emailDelivery, verificationUrl }) {
    if (emailDelivery?.delivered) {
      return 'Compte cree. Un email de verification a ete envoye. Verifiez votre email avant de vous connecter.';
    }

    if (verificationUrl) {
      return 'Compte cree. Ouvrez le lien de verification affiche sur la page de verification avant de vous connecter.';
    }

    return "Compte cree, mais le lien de verification n a pas pu etre envoye pour le moment. Utilisez l option de renvoi du lien plus tard ou contactez YTECH.";
  }

  static serializeEmailDelivery(emailDelivery = {}) {
    return {
      delivered: Boolean(emailDelivery?.delivered),
      skipped: Boolean(emailDelivery?.skipped),
      reason: normalizeText(emailDelivery?.reason, { maxLength: 120 }) || ''
    };
  }

  static async sendEmailVerification(user, req) {
    const verificationToken = crypto.randomBytes(48).toString('hex');
    const expiresInHours = this.getEmailVerificationExpiresInHours();
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    const verificationUrl = this.buildEmailVerificationUrl(verificationToken);

    await User.storeEmailVerificationToken(user.id, verificationToken, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      expiresAt
    });

    let emailDelivery = {
      delivered: false,
      skipped: false
    };

    try {
      emailDelivery = await sendEmailVerificationEmail({
        to: user.email,
        name: user.name,
        verificationUrl,
        expiresInHours
      });
    } catch (emailError) {
      console.error('Erreur envoi email verification:', emailError);
    }

    const shouldLogVerificationUrl = this.shouldLogEmailVerificationUrl();

    if (shouldLogVerificationUrl) {
      console.log(
        `Lien de verification email pour ${user.email}${emailDelivery.delivered ? ' (email envoye)' : ''}:`
      );
      console.log(verificationUrl);
    }

    return {
      emailDelivery,
      expiresInHours,
      verificationToken: process.env.NODE_ENV === 'development' ? verificationToken : null,
      verificationUrl: shouldLogVerificationUrl ? verificationUrl : null
    };
  }
}

const validateRegistrationData = (req, res, next) => {
  const { name, email, password, phone } = AuthController.sanitizeRegistrationPayload(req.body);

  if (!name || name.length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Le nom doit contenir au moins 2 caracteres'
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      error: 'Email invalide'
    });
  }

  const passwordError = militaryJWT.validatePasswordStrength(password);
  if (!passwordError.isValid) {
    return res.status(400).json({
      success: false,
      error: `Mot de passe faible: ${passwordError.issues.join(', ')}`
    });
  }

  if (phone && !isValidPhone(phone)) {
    return res.status(400).json({
      success: false,
      error: 'Le numero de telephone est invalide. Choisissez un pays puis saisissez un numero valide.'
    });
  }

  req.body = {
    ...req.body,
    name,
    email,
    phone,
    company: normalizeText(req.body.company, { maxLength: 255 }) || null,
    password
  };

  return next();
};

router.post('/register', registerLimiter, validateRegistrationData, async (req, res) => {
  try {
    const { name, email, password, phone, company } = req.body;
    const existingUser = await User.findByEmail(email);

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: existingUser.email_verified
          ? 'Cet email est deja utilise'
          : 'Cet email est deja utilise. Verifiez votre boite mail ou demandez un nouveau lien de verification.'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      company,
      role: 'client'
    });

    const verificationDetails = await AuthController.sendEmailVerification(user, req);

    return res.status(201).json({
      success: true,
      message: AuthController.buildEmailVerificationResponseMessage(verificationDetails),
      email: user.email,
      verificationRequired: true,
      verificationExpiresInHours: verificationDetails.expiresInHours,
      emailDelivery: AuthController.serializeEmailDelivery(verificationDetails.emailDelivery),
      verificationUrl: verificationDetails.verificationUrl,
      verificationToken: verificationDetails.verificationToken
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors de l'inscription"
    });
  }
});

router.get('/csrf-token', (req, res) => {
  return res.json({
    success: true,
    csrfToken: req.csrfToken || null
  });
});

router.get('/verify-email', emailVerificationLimiter, async (req, res) => {
  try {
    const token = normalizeText(req.query?.token, { maxLength: 2048 });

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token de verification manquant'
      });
    }

    const verificationRequest = await User.findValidEmailVerificationToken(token);
    if (!verificationRequest?.user_id) {
      return res.status(400).json({
        success: false,
        error: 'Le lien de verification est invalide ou expire',
        code: 'EMAIL_VERIFICATION_TOKEN_INVALID'
      });
    }

    const user = await User.findById(verificationRequest.user_id);
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Compte introuvable pour cette verification'
      });
    }

    await User.markEmailVerified(user.id);
    await User.markEmailVerificationTokenUsed(token);
    await User.invalidateEmailVerificationTokens(user.id);

    return res.json({
      success: true,
      message: 'Email verifie. Vous pouvez maintenant vous connecter.',
      email: user.email
    });
  } catch (error) {
    console.error('Erreur verification email:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue. Veuillez reessayer plus tard.'
    });
  }
});

router.post('/resend-verification', emailVerificationLimiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Email invalide'
      });
    }

    const genericMessage =
      'Si un compte non verifie existe pour cet email, un nouveau lien de verification a ete envoye.';
    const user = await User.findByEmail(email);

    if (!user || user.email_verified || !user.is_active) {
      return res.json({
        success: true,
        message: genericMessage
      });
    }

    const verificationDetails = await AuthController.sendEmailVerification(user, req);

    return res.json({
      success: true,
      message: genericMessage,
      verificationUrl: verificationDetails.verificationUrl,
      verificationToken: verificationDetails.verificationToken
    });
  } catch (error) {
    console.error('Erreur renvoi verification email:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue. Veuillez reessayer plus tard.'
    });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = AuthController.sanitizeLoginPayload(req.body);

    if (!isValidEmail(email) || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email et mot de passe requis'
      });
    }

    const user = await User.findByEmail(email, true, {
      includeSecurityState: true
    });
    const passwordMatch = await bcrypt.compare(password, user?.password || DUMMY_PASSWORD_HASH);

    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect'
      });
    }

    if (User.isLoginLocked(user)) {
      return res.status(429).json({
        success: false,
        error: 'Connexion temporairement bloquee. Reessayez plus tard.'
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Ce compte a ete desactive'
      });
    }

    if (!passwordMatch) {
      const failedLoginState = await User.recordFailedLogin(user.id);

      return res.status(User.isLoginLocked(failedLoginState) ? 429 : 401).json({
        success: false,
        error: User.isLoginLocked(failedLoginState)
          ? 'Connexion temporairement bloquee. Reessayez plus tard.'
          : 'Email ou mot de passe incorrect'
      });
    }

    if (!user.email_verified) {
      return res.status(403).json({
        success: false,
        error: 'Veuillez verifier votre email avant de vous connecter',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email
      });
    }

    const sessionToken = AuthController.generateSessionToken();
    await User.createSession(user.id, sessionToken, req.ip, req.get('User-Agent'));
    await User.markLoginSuccess(user.id);

    const authenticatedUser = await User.findById(user.id);
    return AuthController.sendAuthSuccess(res, authenticatedUser, sessionToken, 'Connexion reussie');
  } catch (error) {
    console.error('Erreur connexion:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la connexion'
    });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const token = getAuthToken(req);

    if (token) {
      let decodedToken = null;

      try {
        decodedToken = militaryJWT.verifySecureToken(token);
      } catch (error) {
        decodedToken = militaryJWT.decodeToken(token);
      }

      try {
        if (decodedToken?.id && decodedToken?.sid) {
          await User.invalidateSessionByToken(decodedToken.id, decodedToken.sid);
        } else if (decodedToken?.id) {
          await User.invalidateAllSessions(decodedToken.id);
        }
      } finally {
        militaryJWT.revokeToken(token);
      }
    }

    const cookieOptions = {
      ...getCookieOptions()
    };
    delete cookieOptions.maxAge;
    delete cookieOptions.expires;
    res.clearCookie(authCookieName, cookieOptions);
    res.cookie(getCsrfCookieName(), createSignedCsrfToken(), getCsrfCookieOptions());

    return res.json({
      success: true,
      message: 'Deconnexion reussie'
    });
  } catch (error) {
    console.error('Erreur deconnexion:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la deconnexion'
    });
  }
});

router.get('/verify', authenticateRequest, async (req, res) => {
  return res.json({
    success: true,
    user: req.user.details
  });
});

router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Email invalide'
      });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.json({
        success: true,
        message: 'Si cet email existe, un lien de reinitialisation sera envoye'
      });
    }

    const resetToken = crypto.randomBytes(48).toString('hex');
    const expiresInMinutes = AuthController.getPasswordResetExpiresInMinutes();
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    const resetUrl = AuthController.buildPasswordResetUrl(resetToken);

    await User.storePasswordResetToken(user.id, resetToken, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      expiresAt
    });

    securityMonitor.trackPasswordReset(email, req.ip, req.get('User-Agent'));

    let emailDelivery = {
      delivered: false,
      skipped: false
    };

    try {
      emailDelivery = await sendPasswordResetEmail({
        to: email,
        name: user.name,
        resetUrl,
        expiresInMinutes
      });
    } catch (emailError) {
      console.error('Erreur envoi email reset password:', emailError);
      await User.invalidatePasswordResetTokens(user.id);
    }

    const shouldLogResetUrl = parseBoolean(
      process.env.LOG_PASSWORD_RESET_URLS,
      process.env.NODE_ENV !== 'production'
    );

    if (!emailDelivery.delivered && !shouldLogResetUrl) {
      await User.invalidatePasswordResetTokens(user.id);
    }

    if (shouldLogResetUrl) {
      console.log(
        `Lien de reinitialisation pour ${email}${emailDelivery.delivered ? ' (email envoye)' : ''}:`
      );
      console.log(resetUrl);
    }

    return res.json({
      success: true,
      message: 'Si cet email existe, un lien de reinitialisation sera envoye',
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : null,
      resetUrl: shouldLogResetUrl ? resetUrl : null
    });
  } catch (error) {
    console.error('Erreur forgot password:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue. Veuillez reessayer plus tard.'
    });
  }
});

router.get('/reset-password/verify', passwordResetLimiter, async (req, res) => {
  try {
    const token = normalizeText(req.query?.token, { maxLength: 2048 });

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token manquant'
      });
    }

    const resetRequest = await User.findValidPasswordResetToken(token);
    if (!resetRequest?.user_id) {
      return res.status(400).json({
        success: false,
        error: 'Token expire ou invalide'
      });
    }

    return res.json({
      success: true,
      message: 'Token valide'
    });
  } catch (error) {
    console.error('Erreur verification reset password:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue. Veuillez reessayer plus tard.'
    });
  }
});

router.post('/reset-password', passwordResetLimiter, async (req, res) => {
  try {
    const token = normalizeText(req.body?.token, { maxLength: 2048 });
    const newPassword = `${req.body?.newPassword || ''}`;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token et nouveau mot de passe requis'
      });
    }

    const passwordError = militaryJWT.validatePasswordStrength(newPassword);
    if (!passwordError.isValid) {
      return res.status(400).json({
        success: false,
        error: `Mot de passe faible: ${passwordError.issues.join(', ')}`
      });
    }

    const resetRequest = await User.findValidPasswordResetToken(token);

    if (!resetRequest?.user_id) {
      return res.status(400).json({
        success: false,
        error: 'Token expire ou invalide'
      });
    }

    await User.updatePassword(resetRequest.user_id, newPassword);
    await User.markPasswordResetTokenUsed(token);
    await User.invalidatePasswordResetTokens(resetRequest.user_id);
    await User.invalidateAllSessions(resetRequest.user_id);

    return res.json({
      success: true,
      message: 'Mot de passe reinitialise avec succes'
    });
  } catch (error) {
    console.error('Erreur reset password:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue. Veuillez reessayer plus tard.'
    });
  }
});

router.get('/profile', authenticateRequest, async (req, res) => {
  return res.json({
    success: true,
    user: req.user.details
  });
});

module.exports = router;
