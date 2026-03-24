/**
 * YTECH - Serveur principal
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const path = require('path');

const database = require('./config/database');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const contactRoutes = require('./routes/contact');
const quoteRoutes = require('./routes/quotes');
const messageRoutes = require('./routes/messages');
const chatbotRoutes = require('./routes/chatbot');
const { csrfProtection } = require('./middleware/security');
const advancedSecurity = require('./middleware/advancedSecurity');
const owaspSecurity = require('./middleware/owaspSecurity');
const mfaAuth = require('./middleware/mfaAuth');
const httpsSecurity = require('./middleware/httpsSecurity');
const cloudflareIntegration = require('./middleware/cloudflareIntegration');
const rbac = require('./middleware/rbac');
const inputValidation = require('./middleware/inputValidation');
const securityTesting = require('./utils/securityTesting');
const securityMonitor = require('./utils/securityMonitor');
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
  formAction: ["'self'"],
  frameSrc: ["'none'"],
  workerSrc: ["'none'"],
  manifestSrc: ["'self'"],
  mediaSrc: ["'self'"],
  prefetchSrc: ["'self'"],
  childSrc: ["'none'"]
};

if (!IS_PRODUCTION) {
  CSP_CONNECT_SOURCES.push(
    ...ALLOWED_ORIGINS,
    'ws://localhost:3000',
    'ws://127.0.0.1:3000',
    'ws://192.168.10.41:3000'
  );
}

CSP_DIRECTIVES.connectSrc = [...new Set(CSP_CONNECT_SOURCES)];

if (IS_PRODUCTION) {
  CSP_DIRECTIVES.upgradeInsecureRequests = [];
}

const app = express();
const runtimeServices = [];

const sanitizeRequestStrings = (value) => {
  if (typeof value === 'string') {
    return xss(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeRequestStrings(entry));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, currentValue]) => [key, sanitizeRequestStrings(currentValue)])
  );
};

const initializeRuntimeServices = async () => {
  if (!parseBoolean(process.env.ENABLE_RUNTIME_SERVICES, false)) {
    console.log('[Runtime] Services optionnels desactives');
    return [];
  }

  const serviceDefinitions = [
    ['PersistenceManager', () => require('./utils/persistenceManager')],
    ['SessionPersistence', () => require('./utils/sessionPersistence')],
    ['UploadPersistence', () => require('./utils/uploadPersistence')],
    ['DiskSpaceMonitor', () => require('./utils/diskSpaceMonitor')]
  ];
  const initializedServices = [];

  for (const [name, loader] of serviceDefinitions) {
    try {
      const Service = loader();
      initializedServices.push(new Service());
      console.log(`[Runtime] ${name} initialise`);
    } catch (error) {
      console.warn(`[Runtime] ${name} indisponible: ${error.message}`);
    }
  }

  runtimeServices.splice(0, runtimeServices.length, ...initializedServices);
  return initializedServices;
};

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
        usb: [],
        accelerometer: [],
        ambientLightSensor: [],
        autoplay: [],
        battery: [],
        bluetooth: [],
        deviceOrientation: [],
        displayCapture: [],
        encryptedMedia: [],
        executionWhileOutOfViewport: [],
        fullscreen: [],
        gamepad: [],
        gyroscope: [],
        hid: [],
        identityCredential: [],
        idleDetection: [],
        localFonts: [],
        magnetometer: [],
        microphone: [],
        midi: [],
        otpCredentials: [],
        pictureInPicture: [],
        publickeyCredentialsGet: [],
        screenWakeLock: [],
        serial: [],
        storageAccess: [],
        wakeLock: [],
        webShare: [],
        xr: []
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
      : false,
    originAgentCluster: true,
    dnsPrefetchControl: {
      allow: false
    },
    ieNoOpen: true,
    noSniff: true,
    xssFilter: true,
    permittedCrossDomainPolicies: false
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
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
    optionsSuccessStatus: 204
  })
);

app.use(morgan(IS_PRODUCTION ? 'combined' : 'dev'));
app.use(express.json({ strict: true, limit: process.env.JSON_BODY_LIMIT || '100kb' }));
app.use(express.urlencoded({ extended: false, limit: process.env.URLENCODED_BODY_LIMIT || '50kb' }));

// Comprehensive security middleware stack
app.use(cloudflareIntegration.createComprehensiveCloudflareMiddleware());
app.use(httpsSecurity.createComprehensiveHTTPSMiddleware());
app.use(inputValidation.createInputValidationMiddleware());
app.use(...owaspSecurity.createComprehensiveSecurityMiddleware());
app.use(mfaAuth.createMFAVerificationMiddleware());
app.use(rbac.createRBACMiddleware());
app.use(rbac.createAuditMiddleware());

// Existing security middleware
app.use(securityMonitor.trackRequest);
app.use(mongoSanitize());
app.use(advancedSecurity.createRequestValidator());

// XSS Protection middleware
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeRequestStrings(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeRequestStrings(req.query);
  }

  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeRequestStrings(req.params);
  }

  next();
});

// Advanced rate limiting
app.use(advancedSecurity.createDDoSProtection());
app.use('/api', advancedSecurity.createAPILimiter());
app.use('/api/auth', advancedSecurity.createBruteForceProtection());
app.use('/api/auth/reset-password', advancedSecurity.createCriticalOperationLimiter());
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
app.use('/api/chatbot', chatbotRoutes);

// Security testing endpoint
app.use(securityTesting.createAutomatedSecurityTestingMiddleware());

if (IS_PRODUCTION) {
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }

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

let serverInstance = null;

async function startServer() {
  if (serverInstance) {
    return serverInstance;
  }

  try {
    validateSecurityConfiguration();

    const isDbConnected = await database.testConnection();

    if (!isDbConnected) {
      throw new Error('Impossible de se connecter a la base de donnees');
    }

    // Initialisation de la persistance
    const adminSeed = await initializeDatabase();
    await initializeRuntimeServices();

    // Démarrage du serveur
    serverInstance = app.listen(PORT, () => {
      const publicApiUrl = `http://192.168.10.41:${PORT}`;
      console.log('YTECH Server Started Successfully');
      console.log('=====================================');
      console.log(`Port: ${PORT}`);
      console.log(`Environment: ${NODE_ENV}`);
      console.log('Database: Connected');
      console.log(
        `Admin Seed: ${adminSeed?.email || 'admin@ytech.ma'} (${adminSeed?.created ? 'created' : 'updated'})`
      );
      console.log(`API: ${publicApiUrl}`);
      console.log('=====================================');
      console.log('Development Mode Active');
      console.log(`Health Check: ${publicApiUrl}/api/health`);
      console.log('=====================================');
      console.log(' Military Grade Security: ENABLED');
      console.log(` Runtime Services: ${runtimeServices.length > 0 ? 'ACTIVE' : 'DISABLED'}`);
      console.log('=====================================');
    });

    return serverInstance;
  } catch (error) {
    console.error('Erreur au demarrage du serveur:', error.message);
    throw error;
  }
}

async function stopServer() {
  if (!serverInstance) {
    return;
  }

  await new Promise((resolve, reject) => {
    serverInstance.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  serverInstance = null;
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await stopServer();
  await database.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await stopServer();
  await database.close();
  process.exit(0);
});

if (require.main === module) {
  startServer().catch(() => {
    process.exit(1);
  });
}

module.exports = app;
module.exports.startServer = startServer;
module.exports.stopServer = stopServer;
