/**
 * YTECH - Serveur principal
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const database = require('./config/database');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const contactRoutes = require('./routes/contact');
const quoteRoutes = require('./routes/quotes');
const messageRoutes = require('./routes/messages');
const { csrfProtection } = require('./middleware/security');
const { initializeDatabase } = require('./utils/databaseBootstrap');
const { createRequestLog } = require('./utils/request');
const {
  getAllowedOrigins,
  parseBoolean,
  parseInteger,
  validateSecurityConfiguration
} = require('./utils/security');

const PORT = parseInteger(process.env.PORT, 5001);
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const ALLOWED_ORIGINS = getAllowedOrigins();
const CSP_CONNECT_SOURCES = ["'self'"];
const CSP_DIRECTIVES = {
  defaultSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  styleSrcAttr: ["'unsafe-inline'"],
  fontSrc: ["'self'", 'https://fonts.gstatic.com'],
  imgSrc: ["'self'", 'data:', 'https:'],
  scriptSrc: ["'self'"],
  scriptSrcAttr: ["'none'"],
  connectSrc: [],
  objectSrc: ["'none'"],
  frameAncestors: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"]
};

if (!IS_PRODUCTION) {
  CSP_CONNECT_SOURCES.push(...ALLOWED_ORIGINS, 'ws://localhost:3000', 'ws://127.0.0.1:3000');
}

CSP_DIRECTIVES.connectSrc = [...new Set(CSP_CONNECT_SOURCES)];

if (IS_PRODUCTION) {
  CSP_DIRECTIVES.upgradeInsecureRequests = [];
}

const app = express();

app.disable('x-powered-by');
app.set('etag', 'strong');

if (parseBoolean(process.env.TRUST_PROXY, IS_PRODUCTION)) {
  app.set('trust proxy', 1);
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: CSP_DIRECTIVES
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: {
      policy: 'same-origin'
    },
    crossOriginResourcePolicy: {
      policy: 'same-site'
    },
    permissionsPolicy: {
      features: {
        camera: [],
        geolocation: [],
        microphone: [],
        payment: [],
        usb: []
      }
    },
    referrerPolicy: {
      policy: 'no-referrer'
    },
    hsts: IS_PRODUCTION
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true
        }
      : false
  })
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origine non autorisee par la politique CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
    optionsSuccessStatus: 204
  })
);

app.use(morgan(IS_PRODUCTION ? 'combined' : 'dev'));
app.use(express.json({ strict: true, limit: process.env.JSON_BODY_LIMIT || '100kb' }));
app.use(express.urlencoded({ extended: false, limit: process.env.URLENCODED_BODY_LIMIT || '50kb' }));

const apiLimiter = rateLimit({
  windowMs: parseInteger(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: parseInteger(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
  message: {
    success: false,
    error: 'Trop de requetes. Reessayez plus tard.'
  }
});

app.use('/api', apiLimiter);
app.use('/api', csrfProtection);

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store');
  }

  if (!IS_PRODUCTION && req.path !== '/api/health') {
    console.log('[Request]', createRequestLog(req));
  }

  next();
});

app.get('/api/health', async (req, res) => {
  try {
    const isDbConnected = await database.testConnection();
    const payload = {
      success: true,
      status: 'Server is running',
      database: isDbConnected ? 'Connected (PostgreSQL)' : 'Disconnected',
      timestamp: new Date().toISOString()
    };

    if (!IS_PRODUCTION) {
      payload.environment = NODE_ENV;
      payload.uptime = process.uptime();
      payload.memory = {
        used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
        total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`
      };
    }

    return res.json(payload);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: IS_PRODUCTION ? 'Service indisponible' : error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/messages', messageRoutes);

if (IS_PRODUCTION) {
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
}

app.use('*', (req, res) => {
  return res.status(404).json({
    success: false,
    error: 'Route non trouvee'
  });
});

app.use((error, req, res, next) => {
  console.error('Erreur serveur:', error);

  return res.status(error.status || 500).json({
    success: false,
    error: IS_PRODUCTION ? 'Erreur interne du serveur' : error.message,
    timestamp: new Date().toISOString()
  });
});

async function startServer() {
  try {
    validateSecurityConfiguration();

    const isDbConnected = await database.testConnection();

    if (!isDbConnected) {
      throw new Error('Impossible de se connecter a la base de donnees');
    }

    const adminAccount = await initializeDatabase();

    app.listen(PORT, () => {
      console.log('YTECH Server Started Successfully');
      console.log('=====================================');
      console.log(`Port: ${PORT}`);
      console.log(`Environment: ${NODE_ENV}`);
      console.log('Database: Connected');
      console.log(`Admin Seed: ${adminAccount.email} (${adminAccount.created ? 'created' : 'updated'})`);
      console.log(`API: http://localhost:${PORT}`);
      console.log('=====================================');

      if (!IS_PRODUCTION) {
        console.log('Development Mode Active');
        console.log(`Health Check: http://localhost:${PORT}/api/health`);
        console.log('=====================================');
      }
    });
  } catch (error) {
    console.error('Erreur au demarrage du serveur:', error.message);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await database.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await database.close();
  process.exit(0);
});

startServer();

module.exports = app;
