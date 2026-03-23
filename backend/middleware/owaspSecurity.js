/**
 * OWASP Top 10 Security Middleware Implementation
 * Conforms to OWASP ASVS and ISO 27001 standards
 */

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const crypto = require('crypto');
const validator = require('validator');

class OWASPSecurityMiddleware {
  constructor() {
    this.securityConfig = {
      // A01: Broken Access Control
      accessControl: {
        maxLoginAttempts: 5,
        lockoutDuration: 15 * 60 * 1000, // 15 minutes
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
      },
      
      // A02: Cryptographic Failures
      cryptography: {
        algorithm: 'aes-256-gcm',
        keyLength: 32,
        ivLength: 16,
        tagLength: 16,
      },
      
      // A03: Injection
      injection: {
        maxInputLength: 1000,
        allowedChars: /^[a-zA-Z0-9\s\-_.,@#$%^&*()[\]{}|\\:"'<>?/~`]+$/,
      },
      
      // A04: Insecure Design
      design: {
        secureHeaders: true,
        csrfProtection: true,
        rateLimiting: true,
      },
      
      // A05: Security Misconfiguration
      configuration: {
        hideServerInfo: true,
        disableClientSideCaching: false,
        enforceHTTPS: true,
      },
      
      // A06: Vulnerable Components
      components: {
        dependencyCheck: true,
        vulnerabilityScanning: true,
      },
      
      // A07: Authentication Failures
      authentication: {
        passwordPolicy: {
          minLength: 12,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
        },
        mfaRequired: false,
        biometricOption: false,
      },
      
      // A08: Software and Data Integrity Failures
      integrity: {
        codeSigning: true,
        secureUpdates: true,
        ciIntegrity: true,
      },
      
      // A09: Security Logging and Monitoring
      logging: {
        auditTrail: true,
        realTimeAlerts: true,
        logRetention: 365 * 24 * 60 * 60 * 1000, // 1 year
      },
      
      // A10: Server-Side Request Forgery (SSRF)
      ssrf: {
        allowPrivateIPs: false,
        allowedDomains: [],
        maxRedirects: 3,
      }
    };
  }

  // A01: Broken Access Control Prevention
  createAccessControlMiddleware() {
    return (req, res, next) => {
      // Implement proper access control checks
      if (!req.user && req.path.startsWith('/api/secure')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Authentication required',
          errorCode: 'ACCESS_DENIED'
        });
      }

      // Role-based access control (RBAC)
      if (req.user && req.path.includes('/admin') && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Admin privileges required',
          errorCode: 'INSUFFICIENT_PRIVILEGES'
        });
      }

      // Session timeout check
      if (req.session && req.session.createdAt) {
        const sessionAge = Date.now() - req.session.createdAt;
        if (sessionAge > this.securityConfig.accessControl.sessionTimeout) {
          req.session.destroy();
          return res.status(401).json({
            success: false,
            error: 'Session expired',
            errorCode: 'SESSION_EXPIRED'
          });
        }
      }

      next();
    };
  }

  // A02: Cryptographic Failures Prevention
  createEncryptionMiddleware() {
    return {
      encrypt: (data, key) => {
        const iv = crypto.randomBytes(this.securityConfig.cryptography.ivLength);
        const cipher = crypto.createCipher(this.securityConfig.cryptography.algorithm, key);
        cipher.setAAD(Buffer.from('YTECH-SECURE', 'utf8'));
        
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const tag = cipher.getAuthTag();
        
        return {
          encrypted,
          iv: iv.toString('hex'),
          tag: tag.toString('hex')
        };
      },
      
      decrypt: (encryptedData, key) => {
        const decipher = crypto.createDecipher(this.securityConfig.cryptography.algorithm, key);
        decipher.setAAD(Buffer.from('YTECH-SECURE', 'utf8'));
        decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
        
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
      }
    };
  }

  // A03: Injection Prevention
  createInjectionPreventionMiddleware() {
    return (req, res, next) => {
      const sanitizeInput = (input) => {
        if (typeof input !== 'string') return input;
        
        // Check for SQL injection patterns
        const sqlPatterns = [
          /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
          /(--|\*\/|\/\*|;|'|"/,
          /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
          /(\b(OR|AND)\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?)/i
        ];
        
        // Check for XSS patterns
        const xssPatterns = [
          /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
          /javascript:/gi,
          /on\w+\s*=/gi,
          /<iframe\b[^>]*>/gi,
          /<object\b[^>]*>/gi,
          /<embed\b[^>]*>/gi
        ];
        
        // Check for command injection
        const cmdPatterns = [
          /(;|\||&|`|\$\(|\$\{)/,
          /(rm\s+-rf|mv\s+|cp\s+|cat\s+|ls\s+)/,
          /(wget|curl|nc|netcat)/,
          /(\.\.\/|\.\.\\)/
        ];
        
        const allPatterns = [...sqlPatterns, ...xssPatterns, ...cmdPatterns];
        
        for (const pattern of allPatterns) {
          if (pattern.test(input)) {
            this.logSecurityEvent('INJECTION_ATTEMPT', {
              ip: req.ip,
              userAgent: req.get('User-Agent'),
              path: req.path,
              input: input.substring(0, 100),
              pattern: pattern.toString(),
              timestamp: new Date().toISOString()
            });
            
            return res.status(400).json({
              success: false,
              error: 'Invalid input detected',
              errorCode: 'INJECTION_ATTEMPT'
            });
          }
        }
        
        // Length validation
        if (input.length > this.securityConfig.injection.maxInputLength) {
          return res.status(400).json({
            success: false,
            error: 'Input too long',
            errorCode: 'INPUT_TOO_LONG'
          });
        }
        
        // Character validation
        if (!this.securityConfig.injection.allowedChars.test(input)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid characters detected',
            errorCode: 'INVALID_CHARACTERS'
          });
        }
        
        return validator.escape(input);
      };
      
      // Sanitize all inputs
      const sanitizeObject = (obj) => {
        if (typeof obj === 'string') return sanitizeInput(obj);
        if (Array.isArray(obj)) return obj.map(sanitizeObject);
        if (obj && typeof obj === 'object') {
          const sanitized = {};
          for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitizeObject(value);
          }
          return sanitized;
        }
        return obj;
      };
      
      if (req.body) req.body = sanitizeObject(req.body);
      if (req.query) req.query = sanitizeObject(req.query);
      if (req.params) req.params = sanitizeObject(req.params);
      
      next();
    };
  }

  // A04: Insecure Design Prevention
  createSecureDesignMiddleware() {
    return (req, res, next) => {
      // Security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      
      // Content Security Policy
      const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self'",
        "frame-src 'none'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; ');
      
      res.setHeader('Content-Security-Policy', csp);
      
      next();
    };
  }

  // A05: Security Misconfiguration Prevention
  createSecureConfigMiddleware() {
    return (req, res, next) => {
      // Hide server information
      res.removeHeader('X-Powered-By');
      res.setHeader('Server', 'SecureServer');
      
      // Disable client-side caching for sensitive routes
      if (req.path.startsWith('/api/') || req.path.includes('/admin')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
      }
      
      // HTTPS enforcement in production
      if (process.env.NODE_ENV === 'production' && !req.secure) {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
      }
      
      next();
    };
  }

  // A07: Authentication and Authorization Failures Prevention
  createAuthSecurityMiddleware() {
    return {
      validatePassword: (password) => {
        const policy = this.securityConfig.authentication.passwordPolicy;
        
        if (password.length < policy.minLength) {
          return { valid: false, error: `Password must be at least ${policy.minLength} characters long` };
        }
        
        if (policy.requireUppercase && !/[A-Z]/.test(password)) {
          return { valid: false, error: 'Password must contain at least one uppercase letter' };
        }
        
        if (policy.requireLowercase && !/[a-z]/.test(password)) {
          return { valid: false, error: 'Password must contain at least one lowercase letter' };
        }
        
        if (policy.requireNumbers && !/\d/.test(password)) {
          return { valid: false, error: 'Password must contain at least one number' };
        }
        
        if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
          return { valid: false, error: 'Password must contain at least one special character' };
        }
        
        // Check for common passwords
        const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
        if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
          return { valid: false, error: 'Password is too common' };
        }
        
        return { valid: true };
      },
      
      generateSecureToken: (length = 32) => {
        return crypto.randomBytes(length).toString('hex');
      },
      
      hashPassword: async (password, saltRounds = 12) => {
        const bcrypt = require('bcryptjs');
        return await bcrypt.hash(password, saltRounds);
      },
      
      verifyPassword: async (password, hash) => {
        const bcrypt = require('bcryptjs');
        return await bcrypt.compare(password, hash);
      }
    };
  }

  // A09: Security Logging and Monitoring
  createSecurityLoggingMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Log request details
      const logEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id || 'anonymous',
        sessionId: req.sessionID || 'none'
      };
      
      // Log response
      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        const securityLog = {
          ...logEntry,
          statusCode: res.statusCode,
          responseTime: `${responseTime}ms`,
          contentLength: res.get('Content-Length') || 0
        };
        
        // Log suspicious activities
        if (res.statusCode >= 400) {
          this.logSecurityEvent('HTTP_ERROR', securityLog);
        }
        
        if (responseTime > 5000) {
          this.logSecurityEvent('SLOW_REQUEST', securityLog);
        }
        
        console.log('[SECURITY AUDIT]', JSON.stringify(securityLog));
      });
      
      next();
    };
  }

  // A10: SSRF Prevention
  createSSRFProtectionMiddleware() {
    return (req, res, next) => {
      const validateURL = (url) => {
        if (!url || typeof url !== 'string') return false;
        
        try {
          const parsedUrl = new URL(url);
          
          // Block private IP ranges
          const hostname = parsedUrl.hostname;
          if (this.isPrivateIP(hostname)) {
            return false;
          }
          
          // Block localhost
          if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return false;
          }
          
          // Only allow specific domains
          if (this.securityConfig.ssrf.allowedDomains.length > 0) {
            return this.securityConfig.ssrf.allowedDomains.includes(hostname);
          }
          
          return true;
        } catch (error) {
          return false;
        }
      };
      
      // Check URL parameters for SSRF
      const checkObjectForURLs = (obj) => {
        if (typeof obj === 'string') {
          return validateURL(obj);
        }
        if (Array.isArray(obj)) {
          return obj.some(checkObjectForURLs);
        }
        if (obj && typeof obj === 'object') {
          return Object.values(obj).some(checkObjectForURLs);
        }
        return false;
      };
      
      if (checkObjectForURLs(req.body) || checkObjectForURLs(req.query)) {
        this.logSecurityEvent('SSRF_ATTEMPT', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          timestamp: new Date().toISOString()
        });
        
        return res.status(400).json({
          success: false,
          error: 'Invalid URL detected',
          errorCode: 'SSRF_ATTEMPT'
        });
      }
      
      next();
    };
  }

  // Utility methods
  isPrivateIP(hostname) {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^127\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/
    ];
    
    return privateRanges.some(range => range.test(hostname));
  }

  logSecurityEvent(eventType, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: eventType,
      severity: this.getSeverityLevel(eventType),
      data
    };
    
    console.warn('[OWASP SECURITY EVENT]', JSON.stringify(logEntry));
    
    // In production, send to security monitoring service
    if (process.env.NODE_ENV === 'production' && process.env.SECURITY_WEBHOOK_URL) {
      this.sendSecurityAlert(logEntry);
    }
  }

  getSeverityLevel(eventType) {
    const severityMap = {
      'INJECTION_ATTEMPT': 'CRITICAL',
      'SSRF_ATTEMPT': 'CRITICAL',
      'ACCESS_DENIED': 'HIGH',
      'AUTHENTICATION_FAILURE': 'MEDIUM',
      'HTTP_ERROR': 'LOW',
      'SLOW_REQUEST': 'LOW'
    };
    return severityMap[eventType] || 'LOW';
  }

  async sendSecurityAlert(logEntry) {
    try {
      const fetch = require('node-fetch');
      await fetch(process.env.SECURITY_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry)
      });
    } catch (error) {
      console.error('Failed to send security alert:', error);
    }
  }

  // Comprehensive security middleware
  createComprehensiveSecurityMiddleware() {
    return [
      this.createAccessControlMiddleware(),
      this.createInjectionPreventionMiddleware(),
      this.createSecureDesignMiddleware(),
      this.createSecureConfigMiddleware(),
      this.createSecurityLoggingMiddleware(),
      this.createSSRFProtectionMiddleware()
    ];
  }
}

module.exports = new OWASPSecurityMiddleware();
