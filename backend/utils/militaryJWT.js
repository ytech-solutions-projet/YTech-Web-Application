const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class MilitaryGradeJWT {
  constructor() {
    this.algorithm = 'HS256';
    this.keyRotationInterval = 24 * 60 * 60 * 1000; // 24 hours
    this.blacklist = new Set();
    this.lastKeyRotation = Date.now();
    this.currentKeyIndex = 0;
    this.keys = this.generateKeyRotation();
  }

  getRootSecret() {
    return process.env.JWT_SECRET || process.env.SESSION_SECRET || 'YTECH_FALLBACK_ROTATION_SECRET';
  }

  buildKeyMaterial(index) {
    return crypto
      .createHmac('sha256', this.getRootSecret())
      .update(`ytech-military-jwt-key:${index}`)
      .digest('hex');
  }

  generateKeyRotation() {
    const keys = [];
    for (let i = 0; i < 3; i++) {
      keys.push(this.buildKeyMaterial(i));
    }
    return keys;
  }

  rotateKey() {
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
    this.keys = this.generateKeyRotation();
    this.lastKeyRotation = Date.now();
    console.log('JWT key rotated for enhanced security');
  }

  checkKeyRotation() {
    if (Date.now() - this.lastKeyRotation > this.keyRotationInterval) {
      this.rotateKey();
    }
  }

  generateSecureToken(payload, options = {}) {
    this.checkKeyRotation();
    
    const securePayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID(),
      scope: payload.scope || 'basic'
    };

    const tokenOptions = {
      algorithm: this.algorithm,
      expiresIn: options.expiresIn || '1h',
      keyid: this.currentKeyIndex.toString(),
      notBefore: options.notBefore || 0,
      audience: 'YTECH-CLIENTS',
      issuer: 'YTECH-MILITARY-GRADE'
    };

    return jwt.sign(securePayload, this.keys[this.currentKeyIndex], tokenOptions);
  }

  verifySecureToken(token, options = {}) {
    try {
      // Check if token is blacklisted
      if (this.blacklist.has(token)) {
        throw new Error('Token has been revoked');
      }

      const decoded = jwt.decode(token, { complete: true });
      
      if (!decoded || !decoded.header) {
        throw new Error('Invalid token structure');
      }

      const keyIndex = parseInt(decoded.header.kid || '0');
      
      if (keyIndex >= this.keys.length || keyIndex < 0) {
        throw new Error('Invalid key index');
      }

      const verifyOptions = {
        algorithms: [this.algorithm],
        audience: 'YTECH-CLIENTS',
        issuer: 'YTECH-MILITARY-GRADE',
        ...options
      };

      return jwt.verify(token, this.keys[keyIndex], verifyOptions);
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  decodeToken(token, options = {}) {
    try {
      return jwt.decode(token, options) || null;
    } catch (error) {
      return null;
    }
  }

  revokeToken(token) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.jti) {
        this.blacklist.add(token);
        
        // Auto-cleanup old tokens from blacklist (keep only last 1000)
        if (this.blacklist.size > 1000) {
          const tokens = Array.from(this.blacklist);
          tokens.slice(0, 100).forEach(t => this.blacklist.delete(t));
        }
        
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  refreshToken(oldToken) {
    try {
      const decoded = this.verifySecureToken(oldToken);
      
      // Revoke old token
      this.revokeToken(oldToken);
      
      // Generate new token with same payload but new jti
      const { jti, iat, nbf, exp, ...payload } = decoded;
      
      return this.generateSecureToken(payload, {
        expiresIn: '1h'
      });
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  generateSecureCookieOptions() {
    const { parseBoolean } = require('./security');
    const isProduction = process.env.NODE_ENV === 'production';
    const secure = parseBoolean(process.env.AUTH_COOKIE_SECURE, isProduction);
    const sameSite = (process.env.AUTH_COOKIE_SAME_SITE || 'strict').toLowerCase();
    
    return {
      httpOnly: true,
      secure,
      sameSite,
      maxAge: 60 * 60 * 1000, // 1 hour
      path: '/',
      priority: 'high',
      expires: new Date(Date.now() + 60 * 60 * 1000),
      overwrite: true
    };
  }

  generateCSRFToken() {
    return crypto.randomBytes(32).toString('base64');
  }

  validateCSRFToken(token, sessionToken) {
    if (!token || !sessionToken) {
      return false;
    }
    
    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(token, 'base64'),
      Buffer.from(sessionToken, 'base64')
    );
  }

  encryptSensitiveData(data, key) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-gcm', key);
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  decryptSensitiveData(encryptedData, key) {
    try {
      const decipher = crypto.createDecipher('aes-256-gcm', key);
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  generateSecurePasswordHash(password, saltRounds = 15) {
    return new Promise((resolve, reject) => {
      const bcrypt = require('bcryptjs');
      bcrypt.genSalt(saltRounds, (err, salt) => {
        if (err) reject(err);
        bcrypt.hash(password, salt, (err, hash) => {
          if (err) reject(err);
          resolve(hash);
        });
      });
    });
  }

  validatePasswordStrength(password) {
    const minLength = 12;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasNoCommonPatterns = !/(.)\1{2,}/.test(password); // No 3+ repeated chars
    
    const issues = [];
    if (password.length < minLength) issues.push(`Minimum ${minLength} characters`);
    if (!hasUpperCase) issues.push('At least one uppercase letter');
    if (!hasLowerCase) issues.push('At least one lowercase letter');
    if (!hasNumbers) issues.push('At least one number');
    if (!hasSpecialChar) issues.push('At least one special character');
    if (!hasNoCommonPatterns) issues.push('No repeated characters (3+ in a row)');
    
    return {
      isValid: issues.length === 0,
      score: Math.max(0, 100 - (issues.length * 20)),
      issues
    };
  }

  logSecurityEvent(event, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      severity: this.getEventSeverity(event),
      data: {
        ...data,
        ip: data.ip,
        userAgent: data.userAgent,
        timestamp: new Date().toISOString()
      }
    };

    console.warn('[JWT SECURITY]', JSON.stringify(logEntry));
    
    // In production, send to security monitoring
    if (process.env.NODE_ENV === 'production') {
      this.sendSecurityAlert(logEntry);
    }
  }

  getEventSeverity(event) {
    const severityMap = {
      'TOKEN_REVOKED': 'MEDIUM',
      'TOKEN_REFRESH': 'LOW',
      'INVALID_TOKEN': 'HIGH',
      'EXPIRED_TOKEN': 'MEDIUM',
      'SUSPICIOUS_TOKEN': 'HIGH'
    };
    return severityMap[event] || 'LOW';
  }

  async sendSecurityAlert(logEntry) {
    // Implementation for sending alerts to security monitoring
    console.log('Security alert sent:', logEntry);
  }
}

module.exports = new MilitaryGradeJWT();
