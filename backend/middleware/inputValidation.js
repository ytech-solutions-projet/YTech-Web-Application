/**
 * Enhanced Input Validation and Sanitization
 * Conforms to OWASP ASVS and ISO 27001 standards
 */

const validator = require('validator');
const crypto = require('crypto');
const xss = require('xss');

class InputValidationMiddleware {
  constructor() {
    this.validationRules = {
      // String validation
      string: {
        minLength: 1,
        maxLength: 1000,
        allowedChars: /^[a-zA-Z0-9\s\-_.,@#$%^&*()[\]{}|\\:"'<>?/~`]+$/,
        sanitize: true
      },
      
      // Email validation
      email: {
        minLength: 5,
        maxLength: 254,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        sanitize: true
      },
      
      // Password validation
      password: {
        minLength: 12,
        maxLength: 128,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        forbiddenPatterns: [
          /^(.)\1+$/, // No repeated characters
          /^(123|abc|qwe)/i, // No sequential patterns
          /^(password|admin|letmein)/i // No common passwords
        ]
      },
      
      // Numeric validation
      number: {
        min: -Number.MAX_SAFE_INTEGER,
        max: Number.MAX_SAFE_INTEGER,
        integer: false
      },
      
      // URL validation
      url: {
        minLength: 1,
        maxLength: 2048,
        allowedProtocols: ['http:', 'https:'],
        allowedDomains: [],
        blockPrivateIPs: true
      },
      
      // Phone number validation
      phone: {
        minLength: 7,
        maxLength: 20,
        pattern: /^\+?[\d\s\-\(\)]+$/,
        sanitize: true
      },
      
      // Date validation
      date: {
        format: 'ISO8601',
        minDate: new Date('1900-01-01'),
        maxDate: new Date('2100-12-31')
      },
      
      // File validation
      file: {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: [
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/pdf',
          'text/plain',
          'application/json'
        ],
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt', '.json']
      }
    };
  }

  // Create comprehensive input validation middleware
  createInputValidationMiddleware() {
    return (req, res, next) => {
      try {
        // Validate request body
        if (req.body && typeof req.body === 'object') {
          const validationResult = this.validateObject(req.body, 'body');
          if (!validationResult.isValid) {
            return this.handleValidationError(res, validationResult, 'body');
          }
          req.body = validationResult.sanitized;
        }

        // Validate query parameters
        if (req.query && typeof req.query === 'object') {
          const validationResult = this.validateObject(req.query, 'query');
          if (!validationResult.isValid) {
            return this.handleValidationError(res, validationResult, 'query');
          }
          req.query = validationResult.sanitized;
        }

        // Validate route parameters
        if (req.params && typeof req.params === 'object') {
          const validationResult = this.validateObject(req.params, 'params');
          if (!validationResult.isValid) {
            return this.handleValidationError(res, validationResult, 'params');
          }
          req.params = validationResult.sanitized;
        }

        // Validate headers
        if (req.headers && typeof req.headers === 'object') {
          const validationResult = this.validateHeaders(req.headers);
          if (!validationResult.isValid) {
            return this.handleValidationError(res, validationResult, 'headers');
          }
        }

        next();
      } catch (error) {
        console.error('Input validation error:', error);
        res.status(500).json({
          success: false,
          error: 'Input validation failed',
          errorCode: 'VALIDATION_ERROR'
        });
      }
    };
  }

  // Validate object recursively
  validateObject(obj, context) {
    const result = {
      isValid: true,
      errors: [],
      sanitized: {}
    };

    for (const [key, value] of Object.entries(obj)) {
      const validation = this.validateValue(value, `${context}.${key}`);
      
      if (!validation.isValid) {
        result.isValid = false;
        result.errors.push(...validation.errors.map(error => ({ ...error, field: key })));
      }
      
      result.sanitized[key] = validation.sanitized;
    }

    return result;
  }

  // Validate individual value
  validateValue(value, fieldPath) {
    const result = {
      isValid: true,
      errors: [],
      sanitized: value
    };

    // Handle different data types
    if (typeof value === 'string') {
      return this.validateString(value, fieldPath);
    } else if (typeof value === 'number') {
      return this.validateNumber(value, fieldPath);
    } else if (typeof value === 'boolean') {
      return { isValid: true, errors: [], sanitized: value };
    } else if (Array.isArray(value)) {
      return this.validateArray(value, fieldPath);
    } else if (value && typeof value === 'object') {
      return this.validateObject(value, fieldPath);
    } else if (value === null || value === undefined) {
      return { isValid: true, errors: [], sanitized: value };
    } else {
      result.isValid = false;
      result.errors.push({
        field: fieldPath,
        value: value,
        error: 'Invalid data type',
        code: 'INVALID_TYPE'
      });
    }

    return result;
  }

  // Validate string values
  validateString(value, fieldPath) {
    const result = {
      isValid: true,
      errors: [],
      sanitized: value
    };

    // Length validation
    if (value.length < this.validationRules.string.minLength) {
      result.isValid = false;
      result.errors.push({
        field: fieldPath,
        value: value,
        error: `String too short (minimum ${this.validationRules.string.minLength} characters)`,
        code: 'STRING_TOO_SHORT'
      });
    }

    if (value.length > this.validationRules.string.maxLength) {
      result.isValid = false;
      result.errors.push({
        field: fieldPath,
        value: value,
        error: `String too long (maximum ${this.validationRules.string.maxLength} characters)`,
        code: 'STRING_TOO_LONG'
      });
    }

    // Character validation
    if (!this.validationRules.string.allowedChars.test(value)) {
      result.isValid = false;
      result.errors.push({
        field: fieldPath,
        value: value,
        error: 'String contains invalid characters',
        code: 'INVALID_CHARACTERS'
      });
    }

    // XSS detection and prevention
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^>]*>/gi,
      /<object\b[^>]*>/gi,
      /<embed\b[^>]*>/gi
    ];

    for (const pattern of xssPatterns) {
      if (pattern.test(value)) {
        result.isValid = false;
        result.errors.push({
          field: fieldPath,
          value: value.substring(0, 100),
          error: 'XSS attempt detected',
          code: 'XSS_ATTEMPT'
        });
        break;
      }
    }

    // SQL injection detection
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(--|\*\/|\/\*|;|'|")/,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(\b(OR|AND)\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?)/i
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(value)) {
        result.isValid = false;
        result.errors.push({
          field: fieldPath,
          value: value.substring(0, 100),
          error: 'SQL injection attempt detected',
          code: 'SQL_INJECTION_ATTEMPT'
        });
        break;
      }
    }

    // Sanitize string
    if (this.validationRules.string.sanitize) {
      result.sanitized = this.sanitizeString(value);
    }

    return result;
  }

  // Validate number values
  validateNumber(value, fieldPath) {
    const result = {
      isValid: true,
      errors: [],
      sanitized: value
    };

    // Check if valid number
    if (isNaN(value) || !isFinite(value)) {
      result.isValid = false;
      result.errors.push({
        field: fieldPath,
        value: value,
        error: 'Invalid number',
        code: 'INVALID_NUMBER'
      });
      return result;
    }

    // Range validation
    if (value < this.validationRules.number.min) {
      result.isValid = false;
      result.errors.push({
        field: fieldPath,
        value: value,
        error: `Number too small (minimum ${this.validationRules.number.min})`,
        code: 'NUMBER_TOO_SMALL'
      });
    }

    if (value > this.validationRules.number.max) {
      result.isValid = false;
      result.errors.push({
        field: fieldPath,
        value: value,
        error: `Number too large (maximum ${this.validationRules.number.max})`,
        code: 'NUMBER_TOO_LARGE'
      });
    }

    // Integer validation
    if (this.validationRules.number.integer && !Number.isInteger(value)) {
      result.isValid = false;
      result.errors.push({
        field: fieldPath,
        value: value,
        error: 'Integer required',
        code: 'INTEGER_REQUIRED'
      });
    }

    return result;
  }

  // Validate array values
  validateArray(array, fieldPath) {
    const result = {
      isValid: true,
      errors: [],
      sanitized: []
    };

    // Array length validation
    if (array.length > 100) {
      result.isValid = false;
      result.errors.push({
        field: fieldPath,
        value: array.length,
        error: 'Array too large (maximum 100 items)',
        code: 'ARRAY_TOO_LARGE'
      });
    }

    // Validate each item
    for (let i = 0; i < array.length; i++) {
      const itemValidation = this.validateValue(array[i], `${fieldPath}[${i}]`);
      
      if (!itemValidation.isValid) {
        result.isValid = false;
        result.errors.push(...itemValidation.errors);
      }
      
      result.sanitized.push(itemValidation.sanitized);
    }

    return result;
  }

  // Validate headers
  validateHeaders(headers) {
    const result = {
      isValid: true,
      errors: []
    };

    // Check for suspicious headers
    const suspiciousHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'x-originating-ip',
      'x-cluster-client-ip'
    ];

    for (const header of suspiciousHeaders) {
      if (headers[header]) {
        result.isValid = false;
        result.errors.push({
          field: `headers.${header}`,
          value: headers[header],
          error: 'Suspicious header detected',
          code: 'SUSPICIOUS_HEADER'
        });
      }
    }

    // Validate Content-Type
    if (headers['content-type']) {
      const allowedContentTypes = [
        'application/json',
        'application/x-www-form-urlencoded',
        'multipart/form-data',
        'text/plain'
      ];

      if (!allowedContentTypes.some(type => headers['content-type'].includes(type))) {
        result.isValid = false;
        result.errors.push({
          field: 'headers.content-type',
          value: headers['content-type'],
          error: 'Invalid content type',
          code: 'INVALID_CONTENT_TYPE'
        });
      }
    }

    return result;
  }

  // Sanitize string
  sanitizeString(str) {
    // HTML entity encoding
    let sanitized = validator.escape(str);
    
    // XSS filtering
    sanitized = xss(sanitized);
    
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    return sanitized;
  }

  // Validate email
  validateEmail(email) {
    const rules = this.validationRules.email;
    
    if (!validator.isEmail(email)) {
      return {
        isValid: false,
        error: 'Invalid email format',
        code: 'INVALID_EMAIL'
      };
    }
    
    if (email.length < rules.minLength || email.length > rules.maxLength) {
      return {
        isValid: false,
        error: `Email length must be between ${rules.minLength} and ${rules.maxLength} characters`,
        code: 'INVALID_EMAIL_LENGTH'
      };
    }
    
    return { isValid: true, sanitized: validator.normalizeEmail(email) };
  }

  // Validate password
  validatePassword(password) {
    const rules = this.validationRules.password;
    const errors = [];

    // Length validation
    if (password.length < rules.minLength) {
      errors.push(`Password must be at least ${rules.minLength} characters long`);
    }

    if (password.length > rules.maxLength) {
      errors.push(`Password must be no more than ${rules.maxLength} characters long`);
    }

    // Character requirements
    if (rules.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (rules.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (rules.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (rules.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Forbidden patterns
    for (const pattern of rules.forbiddenPatterns) {
      if (pattern.test(password)) {
        errors.push('Password contains forbidden pattern');
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength: this.calculatePasswordStrength(password)
    };
  }

  // Calculate password strength
  calculatePasswordStrength(password) {
    let strength = 0;
    
    // Length bonus
    strength += Math.min(password.length / 8, 2) * 20;
    
    // Character variety bonus
    if (/[a-z]/.test(password)) strength += 10;
    if (/[A-Z]/.test(password)) strength += 10;
    if (/\d/.test(password)) strength += 10;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 20;
    
    // Entropy bonus
    const entropy = this.calculateEntropy(password);
    strength += Math.min(entropy / 4, 30);
    
    return Math.min(strength, 100);
  }

  // Calculate password entropy
  calculateEntropy(password) {
    const charSets = [
      /[a-z]/, // lowercase
      /[A-Z]/, // uppercase
      /\d/,    // numbers
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/ // special chars
    ];
    
    let charsetSize = 0;
    for (const set of charSets) {
      if (set.test(password)) charsetSize += set.source.length - 3;
    }
    
    return password.length * Math.log2(charsetSize);
  }

  // Handle validation errors
  handleValidationError(res, validationResult, context) {
    this.logSecurityEvent('INPUT_VALIDATION_FAILED', {
      context,
      errors: validationResult.errors,
      timestamp: new Date().toISOString()
    });

    res.status(400).json({
      success: false,
      error: 'Input validation failed',
      errorCode: 'VALIDATION_FAILED',
      details: validationResult.errors
    });
  }

  // Security event logging
  logSecurityEvent(eventType, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: eventType,
      severity: this.getSeverityLevel(eventType),
      data
    };

    console.warn('[INPUT VALIDATION SECURITY]', JSON.stringify(logEntry));
    
    if (process.env.SECURITY_WEBHOOK_URL) {
      this.sendSecurityAlert(logEntry);
    }
  }

  getSeverityLevel(eventType) {
    const severityMap = {
      'INPUT_VALIDATION_FAILED': 'MEDIUM',
      'XSS_ATTEMPT': 'HIGH',
      'SQL_INJECTION_ATTEMPT': 'CRITICAL',
      'SUSPICIOUS_HEADER': 'MEDIUM'
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

  // Create validation schema for specific endpoints
  createValidationSchema(schema) {
    return (req, res, next) => {
      const validation = this.validateAgainstSchema(req.body, schema);
      
      if (!validation.isValid) {
        return this.handleValidationError(res, validation, 'body');
      }
      
      req.body = validation.sanitized;
      next();
    };
  }

  // Validate against schema
  validateAgainstSchema(data, schema) {
    const result = {
      isValid: true,
      errors: [],
      sanitized: {}
    };

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      const validation = this.validateField(value, field, rules);
      
      if (!validation.isValid) {
        result.isValid = false;
        result.errors.push(...validation.errors);
      }
      
      if (validation.sanitized !== undefined) {
        result.sanitized[field] = validation.sanitized;
      }
    }

    return result;
  }

  // Validate individual field against rules
  validateField(value, field, rules) {
    const result = {
      isValid: true,
      errors: [],
      sanitized: value
    };

    // Required validation
    if (rules.required && (value === undefined || value === null || value === '')) {
      result.isValid = false;
      result.errors.push({
        field,
        value,
        error: 'Field is required',
        code: 'FIELD_REQUIRED'
      });
      return result;
    }

    // Skip validation if field is optional and empty
    if (!rules.required && (value === undefined || value === null || value === '')) {
      return result;
    }

    // Type validation
    if (rules.type && typeof value !== rules.type) {
      result.isValid = false;
      result.errors.push({
        field,
        value,
        error: `Expected ${rules.type}, got ${typeof value}`,
        code: 'INVALID_TYPE'
      });
      return result;
    }

    // Apply specific validations based on type
    if (rules.type === 'string') {
      const stringValidation = this.validateString(value, field);
      if (!stringValidation.isValid) {
        result.isValid = false;
        result.errors.push(...stringValidation.errors);
      }
      result.sanitized = stringValidation.sanitized;
    } else if (rules.type === 'email') {
      const emailValidation = this.validateEmail(value);
      if (!emailValidation.isValid) {
        result.isValid = false;
        result.errors.push({
          field,
          value,
          error: emailValidation.error,
          code: emailValidation.code
        });
      }
      result.sanitized = emailValidation.sanitized;
    } else if (rules.type === 'password') {
      const passwordValidation = this.validatePassword(value);
      if (!passwordValidation.isValid) {
        result.isValid = false;
        result.errors.push(...passwordValidation.errors.map(error => ({
          field,
          value: '[REDACTED]',
          error,
          code: 'PASSWORD_VALIDATION_FAILED'
        })));
      }
    }

    // Custom validation
    if (rules.validate && typeof rules.validate === 'function') {
      const customValidation = rules.validate(value);
      if (!customValidation.isValid) {
        result.isValid = false;
        result.errors.push({
          field,
          value,
          error: customValidation.error,
          code: 'CUSTOM_VALIDATION_FAILED'
        });
      }
    }

    return result;
  }
}

module.exports = new InputValidationMiddleware();
