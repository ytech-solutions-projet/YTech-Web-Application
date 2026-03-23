const rateLimit = require('express-rate-limit');
let redisStoreModule = null;
let createClient = null;

try {
  redisStoreModule = require('rate-limit-redis');
} catch (error) {
  console.warn('rate-limit-redis not available, using memory store');
}

try {
  ({ createClient } = require('redis'));
} catch (error) {
  console.warn('redis client not available, using memory store');
}

const RedisStore = redisStoreModule
  ? redisStoreModule.RedisStore || redisStoreModule.default || redisStoreModule
  : null;
const getFetch = async () => {
  if (typeof fetch === 'function') {
    return fetch;
  }

  const importedModule = await import('node-fetch');
  return importedModule.default;
};

class AdvancedSecurityMiddleware {
  constructor() {
    this.redisClient = null;
    this.redisReady = false;
    this.initializeRedis();
  }

  async initializeRedis() {
    if (typeof createClient !== 'function') {
      return;
    }

    if (!process.env.REDIS_URL) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('REDIS_URL not configured, using memory store');
      }
      return;
    }

    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              this.redisReady = false;
              console.error('Redis retry limit reached');
              return false;
            }

            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.redisClient.on('error', (err) => {
        this.redisReady = false;
        console.error('Redis error:', err.message || err);
      });

      this.redisClient.on('ready', () => {
        this.redisReady = true;
        console.log('Connected to Redis for rate limiting');
      });

      this.redisClient.on('end', () => {
        this.redisReady = false;
        console.warn('Redis connection closed, using memory store');
      });

      await this.redisClient.connect();
    } catch (error) {
      this.redisReady = false;
      this.redisClient = null;
      console.warn('Redis not available, falling back to memory store');
    }
  }

  createRedisStore() {
    if (!this.redisReady || !this.redisClient || typeof RedisStore !== 'function') {
      if (this.redisClient && typeof RedisStore !== 'function') {
        console.warn('Redis store adapter unavailable, falling back to memory store');
      }

      return undefined;
    }

    try {
      return new RedisStore({
        sendCommand: (...args) => this.redisClient.sendCommand(args),
      });
    } catch (error) {
      this.redisReady = false;
      console.warn('Redis rate-limit store unavailable, falling back to memory store');
      return undefined;
    }
  }

  createAdvancedRateLimiter(options) {
    const windowMs = options.windowMs || 15 * 60 * 1000;
    const message = options.message || {
      success: false,
      error: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    };
    const onLimitReached = options.onLimitReached || ((req) => {
      console.warn(`Rate limit exceeded for IP: ${req.ip} on path: ${req.path}`);
    });

    return rateLimit({
      windowMs,
      max: options.max || 100,
      message,
      standardHeaders: true,
      legacyHeaders: false,
      store: this.createRedisStore(),
      keyGenerator: options.keyGenerator || ((req) => {
        return req.ip + ':' + req.path;
      }),
      skip: options.skip || (() => false),
      handler: options.handler || ((req, res) => {
        onLimitReached(req, res);
        const retryAfter = Math.ceil(windowMs / 1000);
        res.setHeader('Retry-After', retryAfter);
        res.status(429).json(message);
      })
    });
  }

  createDDoSProtection() {
    return this.createAdvancedRateLimiter({
      windowMs: 60 * 1000,
      max: 60,
      keyGenerator: (req) => req.ip,
      message: {
        success: false,
        error: 'DDoS protection activated. Access temporarily blocked.',
        blockDuration: '1 minute'
      },
      onLimitReached: (req, res) => {
        console.warn(`DDoS protection triggered for IP: ${req.ip}`);
        // Log to security monitoring system
        this.logSecurityEvent('DDOS_ATTEMPT', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  createBruteForceProtection() {
    return this.createAdvancedRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 5,
      keyGenerator: (req) => req.ip + ':' + req.path,
      message: {
        success: false,
        error: 'Too many failed attempts. Account temporarily locked.',
        lockDuration: '15 minutes'
      },
      onLimitReached: (req, res) => {
        console.warn(`Brute force attempt detected for IP: ${req.ip}`);
        this.logSecurityEvent('BRUTE_FORCE_ATTEMPT', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  createAPILimiter() {
    return this.createAdvancedRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 100,
      keyGenerator: (req) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        return token ? `auth:${token}` : `ip:${req.ip}`;
      },
      message: {
        success: false,
        error: 'API rate limit exceeded',
        limit: '100 requests per 15 minutes'
      }
    });
  }

  createCriticalOperationLimiter() {
    return this.createAdvancedRateLimiter({
      windowMs: 60 * 60 * 1000,
      max: 10,
      keyGenerator: (req) => req.ip + ':' + (req.user?.details?.id || req.user?.id || 'anonymous'),
      message: {
        success: false,
        error: 'Critical operation rate limit exceeded',
        limit: '10 operations per hour'
      },
      onLimitReached: (req, res) => {
        this.logSecurityEvent('CRITICAL_OPERATION_LIMIT', {
          ip: req.ip,
          userId: req.user?.id,
          operation: req.path,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  logSecurityEvent(eventType, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: eventType,
      severity: this.getSeverityLevel(eventType),
      data
    };

    console.warn('[SECURITY EVENT]', JSON.stringify(logEntry));
    
    // In production, send to security monitoring service
    if (process.env.NODE_ENV === 'production' && process.env.SECURITY_WEBHOOK_URL) {
      this.sendSecurityAlert(logEntry);
    }
  }

  getSeverityLevel(eventType) {
    const severityMap = {
      'DDOS_ATTEMPT': 'HIGH',
      'BRUTE_FORCE_ATTEMPT': 'HIGH',
      'CRITICAL_OPERATION_LIMIT': 'MEDIUM',
      'SUSPICIOUS_ACTIVITY': 'MEDIUM',
      'AUTHENTICATION_FAILURE': 'LOW'
    };
    return severityMap[eventType] || 'LOW';
  }

  async sendSecurityAlert(logEntry) {
    try {
      const fetchImplementation = await getFetch();
      await fetchImplementation(process.env.SECURITY_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry)
      });
    } catch (error) {
      console.error('Failed to send security alert:', error);
    }
  }

  createIPWhitelist(allowedIPs) {
    return (req, res, next) => {
      const clientIP = req.ip || req.connection.remoteAddress;
      
      if (allowedIPs.includes(clientIP)) {
        return next();
      }

      this.logSecurityEvent('UNAUTHORIZED_IP_ACCESS', {
        ip: clientIP,
        userAgent: req.get('User-Agent'),
        path: req.path,
        timestamp: new Date().toISOString()
      });

      res.status(403).json({
        success: false,
        error: 'Access denied from this IP address'
      });
    };
  }

  createRequestValidator() {
    return (req, res, next) => {
      // Check for suspicious patterns
      const suspiciousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /union\s+select/i,
        /drop\s+table/i,
        /insert\s+into/i,
        /delete\s+from/i
      ];

      const checkValue = (value) => {
        if (typeof value === 'string') {
          return suspiciousPatterns.some(pattern => pattern.test(value));
        }
        if (typeof value === 'object' && value !== null) {
          return Object.values(value).some(v => checkValue(v));
        }
        return false;
      };

      if (checkValue(req.body) || checkValue(req.query) || checkValue(req.params)) {
        this.logSecurityEvent('SUSPICIOUS_INPUT', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          body: req.body,
          query: req.query,
          params: req.params,
          timestamp: new Date().toISOString()
        });

        return res.status(400).json({
          success: false,
          error: 'Invalid input detected'
        });
      }

      next();
    };
  }
}

module.exports = new AdvancedSecurityMiddleware();
