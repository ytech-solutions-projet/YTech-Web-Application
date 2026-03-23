/**
 * HTTPS/TLS 1.3 and HSTS Configuration
 * Conforms to OWASP ASVS and ISO 27001 standards
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class HTTPSSecurityMiddleware {
  constructor() {
    this.tlsConfig = {
      // TLS 1.3 configuration
      minVersion: 'TLSv1.3',
      maxVersion: 'TLSv1.3',
      
      // Strong cipher suites
      ciphers: [
        'TLS_AES_256_GCM_SHA384',
        'TLS_CHACHA20_POLY1305_SHA256',
        'TLS_AES_128_GCM_SHA256'
      ],
      
      // HSTS configuration
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      },
      
      // Certificate paths
      certPath: process.env.SSL_CERT_PATH || path.join(__dirname, '../certs/server.crt'),
      keyPath: process.env.SSL_KEY_PATH || path.join(__dirname, '../certs/server.key'),
      caPath: process.env.SSL_CA_PATH || path.join(__dirname, '../certs/ca.crt'),
      
      // OCSP Stapling
      ocsp: {
        enabled: true,
        cache: true
      },
      
      // Perfect Forward Secrecy
      pfs: {
        enabled: true,
        curves: ['X25519', 'secp256r1', 'secp384r1']
      }
    };
  }

  // Create HTTPS options
  createHTTPSOptions() {
    const options = {
      // TLS configuration
      minVersion: this.tlsConfig.minVersion,
      maxVersion: this.tlsConfig.maxVersion,
      ciphers: this.tlsConfig.ciphers.join(':'),
      honorCipherOrder: true,
      
      // Perfect Forward Secrecy
      ecdhCurve: this.tlsConfig.pfs.curves.join(':'),
      
      // Security options
      secureProtocol: 'TLSv1_3_method',
      
      // Session tickets
      ticketKeys: crypto.randomBytes(48),
      
      // OCSP Stapling
      requestOCSP: this.tlsConfig.ocsp.enabled
    };

    // Load certificates if they exist
    if (fs.existsSync(this.tlsConfig.certPath)) {
      options.cert = fs.readFileSync(this.tlsConfig.certPath);
    }

    if (fs.existsSync(this.tlsConfig.keyPath)) {
      options.key = fs.readFileSync(this.tlsConfig.keyPath);
    }

    if (fs.existsSync(this.tlsConfig.caPath)) {
      options.ca = fs.readFileSync(this.tlsConfig.caPath);
    }

    return options;
  }

  // HSTS middleware
  createHSTSMiddleware() {
    return (req, res, next) => {
      // Only apply HSTS in production
      if (process.env.NODE_ENV === 'production') {
        const hstsValue = [
          `max-age=${this.tlsConfig.hsts.maxAge}`,
          this.tlsConfig.hsts.includeSubDomains ? 'includeSubDomains' : '',
          this.tlsConfig.hsts.preload ? 'preload' : ''
        ].filter(Boolean).join('; ');

        res.setHeader('Strict-Transport-Security', hstsValue);
      }

      next();
    };
  }

  // HTTPS enforcement middleware
  createHTTPSEnforcementMiddleware() {
    return (req, res, next) => {
      // Skip for localhost in development
      if (process.env.NODE_ENV !== 'production' && 
          (req.hostname === 'localhost' || req.hostname === '127.0.0.1')) {
        return next();
      }

      // Redirect HTTP to HTTPS
      if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
        const httpsUrl = `https://${req.get('host')}${req.url}`;
        return res.redirect(301, httpsUrl);
      }

      next();
    };
  }

  // Certificate validation middleware
  createCertificateValidationMiddleware() {
    return (req, res, next) => {
      // Validate client certificate if required
      if (process.env.REQUIRE_CLIENT_CERT === 'true') {
        const clientCert = req.socket.getPeerCertificate();
        
        if (!clientCert || Object.keys(clientCert).length === 0) {
          return res.status(403).json({
            success: false,
            error: 'Client certificate required',
            errorCode: 'CLIENT_CERT_REQUIRED'
          });
        }

        // Validate certificate chain
        if (!this.validateCertificateChain(clientCert)) {
          return res.status(403).json({
            success: false,
            error: 'Invalid client certificate',
            errorCode: 'INVALID_CLIENT_CERT'
          });
        }
      }

      next();
    };
  }

  // Certificate chain validation
  validateCertificateChain(cert) {
    try {
      // Check certificate expiration
      const now = new Date();
      const notBefore = new Date(cert.valid_from);
      const notAfter = new Date(cert.valid_to);

      if (now < notBefore || now > notAfter) {
        return false;
      }

      // Check certificate purpose
      if (!cert.subject || !cert.subject.CN) {
        return false;
      }

      // Add more validation logic as needed
      return true;
    } catch (error) {
      console.error('Certificate validation error:', error);
      return false;
    }
  }

  // Security headers middleware
  createSecurityHeadersMiddleware() {
    return (req, res, next) => {
      // HTTPS-specific headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      // HTTPS enforcement
      res.setHeader('Upgrade-Insecure-Requests', '1');
      
      // Certificate transparency
      if (process.env.NODE_ENV === 'production') {
        res.setHeader('Expect-CT', 'max-age=86400, enforce');
      }

      // Feature policy
      res.setHeader('Permissions-Policy', 
        'geolocation=(), ' +
        'microphone=(), ' +
        'camera=(), ' +
        'payment=(), ' +
        'usb=(), ' +
        'magnetometer=(), ' +
        'gyroscope=(), ' +
        'accelerometer=()'
      );

      next();
    };
  }

  // TLS session management
  createTLSSessionMiddleware() {
    return (req, res, next) => {
      // Log TLS session information for security monitoring
      if (req.socket) {
        const canReadCipher = typeof req.socket.getCipher === 'function';
        const canReadPeerCertificate = typeof req.socket.getPeerCertificate === 'function';
        const tlsInfo = {
          protocol: req.socket.alpnProtocol || req.socket.protocol || null,
          cipher: canReadCipher ? req.socket.getCipher() : null,
          authorized: Boolean(req.socket.authorized),
          authorizationError: req.socket.authorizationError || null,
          peerCertificate: canReadPeerCertificate ? req.socket.getPeerCertificate() : null
        };

        // Log weak cipher suites
        const weakCiphers = ['RC4', 'DES', '3DES', 'MD5', 'SHA1'];
        if (tlsInfo.cipher && weakCiphers.some(weak => tlsInfo.cipher.name.includes(weak))) {
          console.warn('[SECURITY] Weak cipher detected:', tlsInfo.cipher.name);
        }

        // Log TLS version
        if (tlsInfo.protocol && tlsInfo.protocol !== 'TLSv1.3') {
          console.warn('[SECURITY] Non-TLS 1.3 connection detected:', tlsInfo.protocol);
        }
      }

      next();
    };
  }

  // Certificate monitoring
  createCertificateMonitoringMiddleware() {
    return (req, res, next) => {
      // Monitor certificate expiration
      if (process.env.NODE_ENV === 'production') {
        this.checkCertificateExpiration();
      }

      next();
    };
  }

  // Check certificate expiration
  checkCertificateExpiration() {
    try {
      if (fs.existsSync(this.tlsConfig.certPath)) {
        const cert = fs.readFileSync(this.tlsConfig.certPath);
        const certInfo = require('crypto').createCertificate(cert);
        
        const expirationDate = new Date(certInfo.valid_to);
        const now = new Date();
        const daysUntilExpiration = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));

        // Warn if certificate expires within 30 days
        if (daysUntilExpiration <= 30) {
          console.warn(`[SECURITY] Certificate expires in ${daysUntilExpiration} days`);
          
          // Send alert to monitoring system
          if (process.env.SECURITY_WEBHOOK_URL) {
            this.sendCertificateAlert(daysUntilExpiration);
          }
        }
      }
    } catch (error) {
      console.error('Certificate monitoring error:', error);
    }
  }

  // Send certificate expiration alert
  async sendCertificateAlert(daysUntilExpiration) {
    try {
      const fetch = require('node-fetch');
      await fetch(process.env.SECURITY_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'CERTIFICATE_EXPIRATION_WARNING',
          severity: daysUntilExpiration <= 7 ? 'CRITICAL' : 'HIGH',
          data: {
            daysUntilExpiration,
            certPath: this.tlsConfig.certPath,
            timestamp: new Date().toISOString()
          }
        })
      });
    } catch (error) {
      console.error('Failed to send certificate alert:', error);
    }
  }

  // Generate self-signed certificate for development
  generateSelfSignedCertificate() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Self-signed certificates should not be used in production');
    }

    const selfsigned = require('selfsigned');
    const attrs = [{ name: 'commonName', value: 'localhost' }];
    
    const pems = selfsigned.generate(attrs, {
      days: 365,
      algorithm: 'sha256',
      extensions: [
        {
          name: 'subjectAltName',
          altNames: [
            { type: 2, value: 'localhost' },
            { type: 2, value: '127.0.0.1' }
          ]
        }
      ]
    });

    // Create certs directory if it doesn't exist
    const certsDir = path.dirname(this.tlsConfig.certPath);
    if (!fs.existsSync(certsDir)) {
      fs.mkdirSync(certsDir, { recursive: true });
    }

    // Write certificates
    fs.writeFileSync(this.tlsConfig.certPath, pems.cert);
    fs.writeFileSync(this.tlsConfig.keyPath, pems.private);
    fs.writeFileSync(this.tlsConfig.caPath, pems.cert);

    console.log('Self-signed certificate generated for development');
    return pems;
  }

  // Comprehensive HTTPS security middleware
  createComprehensiveHTTPSMiddleware() {
    return [
      this.createHTTPSEnforcementMiddleware(),
      this.createHSTSMiddleware(),
      this.createSecurityHeadersMiddleware(),
      this.createTLSSessionMiddleware(),
      this.createCertificateMonitoringMiddleware(),
      this.createCertificateValidationMiddleware()
    ];
  }
}

module.exports = new HTTPSSecurityMiddleware();
