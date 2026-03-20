/**
 * YTECH - Routes d'Authentification
 * API securisee pour l'inscription et la connexion
 */

const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { authenticateRequest } = require('../middleware/auth');
const { normalizePhone } = require('../utils/databaseBootstrap');
const { getAuthToken } = require('../utils/request');
const {
  getAuthCookieName,
  getCookieOptions,
  isValidEmail,
  normalizeEmail,
  normalizeText,
  parseInteger,
  validateStrongPassword
} = require('../utils/security');

const router = express.Router();
const authCookieName = getAuthCookieName();

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

class AuthController {
  static getJwtSecret() {
    return process.env.JWT_SECRET || 'fallback-secret';
  }

  static generateToken(user, sessionToken) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        sid: sessionToken
      },
      this.getJwtSecret(),
      { expiresIn: `${parseInteger(process.env.SESSION_TIMEOUT_HOURS, 24)}h` }
    );
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
    return res.status(statusCode).json({
      success: true,
      message,
      user
    });
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

  const passwordError = validateStrongPassword(password);
  if (passwordError) {
    return res.status(400).json({
      success: false,
      error: passwordError
    });
  }

  if (phone && !/^\+212\d{9}$/.test(phone)) {
    return res.status(400).json({
      success: false,
      error: 'Le numero de telephone doit etre au format +212 suivi de 9 chiffres'
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
        error: 'Cet email est deja utilise'
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

    const sessionToken = AuthController.generateSessionToken();
    await User.createSession(user.id, sessionToken, req.ip, req.get('User-Agent'));
    await User.markLoginSuccess(user.id);

    return AuthController.sendAuthSuccess(res, user, sessionToken, 'Inscription reussie', 201);
  } catch (error) {
    console.error('Erreur inscription:', error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors de l'inscription"
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

    const user = await User.findByEmail(email, true);
    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect'
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Ce compte a ete desactive'
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect'
      });
    }

    const sessionToken = AuthController.generateSessionToken();
    await User.createSession(user.id, sessionToken, req.ip, req.get('User-Agent'));
    await User.markLoginSuccess(user.id);

    delete user.password;
    return AuthController.sendAuthSuccess(res, user, sessionToken, 'Connexion reussie');
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
      try {
        const decoded = jwt.verify(token, AuthController.getJwtSecret());
        if (decoded?.id && decoded?.sid) {
          await User.invalidateSessionByToken(decoded.id, decoded.sid);
        } else if (decoded?.id) {
          await User.invalidateAllSessions(decoded.id);
        }
      } catch (error) {
        // Cookie deja invalide: on nettoie juste cote client.
      }
    }

    const cookieOptions = getCookieOptions();
    delete cookieOptions.maxAge;
    res.clearCookie(authCookieName, cookieOptions);

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

    const resetToken = jwt.sign(
      {
        userId: user.id,
        type: 'password-reset',
        timestamp: Date.now()
      },
      AuthController.getJwtSecret(),
      { expiresIn: '15m' }
    );

    console.log(`Lien de reinitialisation pour ${email}:`);
    console.log(`http://localhost:3000/reset-password?token=${resetToken}`);

    return res.json({
      success: true,
      message: 'Si cet email existe, un lien de reinitialisation sera envoye',
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : null
    });
  } catch (error) {
    console.error('Erreur forgot password:', error);
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

    const passwordError = validateStrongPassword(newPassword);
    if (passwordError) {
      return res.status(400).json({
        success: false,
        error: passwordError
      });
    }

    try {
      const decoded = jwt.verify(token, AuthController.getJwtSecret());

      if (decoded.type !== 'password-reset' || !decoded.userId) {
        return res.status(400).json({
          success: false,
          error: 'Token invalide'
        });
      }

      await User.updatePassword(decoded.userId, newPassword);
      await User.invalidateAllSessions(decoded.userId);

      return res.json({
        success: true,
        message: 'Mot de passe reinitialise avec succes'
      });
    } catch (tokenError) {
      return res.status(400).json({
        success: false,
        error: 'Token expire ou invalide'
      });
    }
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
