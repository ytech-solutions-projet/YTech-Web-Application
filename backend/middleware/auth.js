const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getAuthToken } = require('../utils/request');

const getJwtSecret = () => process.env.JWT_SECRET || 'fallback-secret';

const resolveAuthenticatedRequest = async (req) => {
  const token = getAuthToken(req);

  if (!token) {
    return null;
  }

  const decoded = jwt.verify(token, getJwtSecret());
  if (!decoded?.id || !decoded?.sid) {
    return null;
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.is_active) {
    return null;
  }

  const session = await User.findSessionByToken(decoded.id, decoded.sid);
  if (!session) {
    return null;
  }

  await User.touchSession(decoded.id, decoded.sid);

  return {
    token,
    session,
    user: {
      ...decoded,
      details: user
    }
  };
};

const authenticateRequest = async (req, res, next) => {
  try {
    const authContext = await resolveAuthenticatedRequest(req);
    if (!authContext) {
      return res.status(401).json({
        success: false,
        error: 'Authentification requise'
      });
    }

    req.authToken = authContext.token;
    req.session = authContext.session;
    req.user = authContext.user;

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Authentification invalide'
    });
  }
};

const maybeAuthenticateRequest = async (req, res, next) => {
  try {
    const authContext = await resolveAuthenticatedRequest(req);

    if (authContext) {
      req.authToken = authContext.token;
      req.session = authContext.session;
      req.user = authContext.user;
    }

    return next();
  } catch (error) {
    return next();
  }
};

const requireAdmin = (req, res, next) => {
  const role = req.user?.details?.role || req.user?.role;

  if (role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Acces admin requis'
    });
  }

  return next();
};

module.exports = {
  authenticateRequest,
  maybeAuthenticateRequest,
  requireAdmin
};
