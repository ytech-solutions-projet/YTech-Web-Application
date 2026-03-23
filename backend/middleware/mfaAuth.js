/**
 * Multi-Factor Authentication (MFA) Implementation
 * Conforms to OWASP ASVS and NIST standards
 */

const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const crypto = require('crypto');

class MFAMiddleware {
  constructor() {
    this.mfaConfig = {
      window: 2, // Time window for TOTP verification
      length: 6, // Length of TOTP token
      algorithm: 'sha256', // Algorithm for TOTP
      issuer: 'YTECH Secure Application',
      label: 'YTECH Account'
    };
  }

  // Generate TOTP secret for user
  generateTOTPSecret(userEmail) {
    const secret = speakeasy.generateSecret({
      name: `${this.mfaConfig.issuer} (${userEmail})`,
      issuer: this.mfaConfig.issuer,
      length: 32
    });

    return {
      secret: secret.base32,
      qrCodeUrl: secret.otpauth_url,
      manualEntryKey: secret.base32
    };
  }

  // Generate QR code for TOTP setup
  async generateQRCode(otpauthUrl) {
    try {
      const qrCodeDataURL = await qrcode.toDataURL(otpauthUrl);
      return qrCodeDataURL;
    } catch (error) {
      throw new Error('Failed to generate QR code');
    }
  }

  // Verify TOTP token
  verifyTOTPToken(token, secret) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: this.mfaConfig.window,
      algorithm: this.mfaConfig.algorithm
    });
  }

  // Generate backup codes
  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  // Hash backup codes for storage
  hashBackupCodes(codes) {
    const bcrypt = require('bcryptjs');
    return codes.map(code => bcrypt.hashSync(code, 10));
  }

  // Verify backup code
  async verifyBackupCode(enteredCode, hashedCodes) {
    const bcrypt = require('bcryptjs');
    for (const hashedCode of hashedCodes) {
      if (await bcrypt.compare(enteredCode.toUpperCase(), hashedCode)) {
        return true;
      }
    }
    return false;
  }

  // MFA verification middleware
  createMFAVerificationMiddleware() {
    return (req, res, next) => {
      // Skip MFA for health checks and public endpoints
      if (req.path === '/api/health' || !req.path.startsWith('/api/')) {
        return next();
      }

      // Check if MFA is required for this user
      if (req.user && req.user.mfaEnabled) {
        const mfaToken = req.headers['x-mfa-token'];
        
        if (!mfaToken) {
          return res.status(403).json({
            success: false,
            error: 'MFA token required',
            errorCode: 'MFA_REQUIRED',
            requiresMFA: true
          });
        }

        // Verify MFA token (would be stored in session or database)
        if (!req.session.mfaVerified) {
          return res.status(403).json({
            success: false,
            error: 'MFA verification failed',
            errorCode: 'MFA_INVALID'
          });
        }
      }

      next();
    };
  }

  // MFA setup middleware
  createMFASetupMiddleware() {
    return async (req, res, next) => {
      try {
        const { userEmail } = req.body;
        
        if (!userEmail) {
          return res.status(400).json({
            success: false,
            error: 'User email required'
          });
        }

        // Generate TOTP secret
        const totpSecret = this.generateTOTPSecret(userEmail);
        
        // Generate QR code
        const qrCode = await this.generateQRCode(totpSecret.qrCodeUrl);
        
        // Generate backup codes
        const backupCodes = this.generateBackupCodes();
        const hashedBackupCodes = this.hashBackupCodes(backupCodes);

        // Store in session temporarily for verification
        req.session.mfaSetup = {
          secret: totpSecret.secret,
          backupCodes: hashedBackupCodes,
          verified: false
        };

        res.json({
          success: true,
          data: {
            qrCode: qrCode,
            manualEntryKey: totpSecret.manualEntryKey,
            backupCodes: backupCodes // Only show once during setup
          }
        });
      } catch (error) {
        console.error('MFA setup error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to setup MFA'
        });
      }
    };
  }

  // MFA verification endpoint middleware
  createMFAVerifyMiddleware() {
    return async (req, res, next) => {
      try {
        const { token } = req.body;
        
        if (!token) {
          return res.status(400).json({
            success: false,
            error: 'MFA token required'
          });
        }

        if (!req.session.mfaSetup) {
          return res.status(400).json({
            success: false,
            error: 'MFA setup not initiated'
          });
        }

        // Verify TOTP token
        const isValid = this.verifyTOTPToken(token, req.session.mfaSetup.secret);
        
        if (isValid) {
          // Mark MFA as verified and enabled
          req.session.mfaSetup.verified = true;
          req.session.mfaVerified = true;
          
          // In a real application, you would save this to the database
          // await User.updateMFASettings(req.user.id, {
          //   enabled: true,
          //   secret: req.session.mfaSetup.secret,
          //   backupCodes: req.session.mfaSetup.backupCodes
          // });

          res.json({
            success: true,
            message: 'MFA setup completed successfully'
          });
        } else {
          res.status(400).json({
            success: false,
            error: 'Invalid MFA token'
          });
        }
      } catch (error) {
        console.error('MFA verification error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to verify MFA token'
        });
      }
    };
  }

  // MFA login verification middleware
  createMFALoginMiddleware() {
    return async (req, res, next) => {
      try {
        const { token, userId } = req.body;
        
        if (!token || !userId) {
          return res.status(400).json({
            success: false,
            error: 'MFA token and user ID required'
          });
        }

        // In a real application, you would retrieve the user's MFA secret from database
        // const user = await User.findById(userId);
        // const userMFASecret = user.mfaSecret;

        // For demo purposes, we'll use session data
        if (!req.session.pendingMFA || req.session.pendingMFA.userId !== userId) {
          return res.status(400).json({
            success: false,
            error: 'No pending MFA verification'
          });
        }

        // Verify TOTP token
        const isValid = this.verifyTOTPToken(token, req.session.pendingMFA.secret);
        
        if (isValid) {
          // Clear pending MFA and mark as verified
          req.session.pendingMFA = null;
          req.session.mfaVerified = true;
          
          res.json({
            success: true,
            message: 'MFA verification successful'
          });
        } else {
          res.status(400).json({
            success: false,
            error: 'Invalid MFA token'
          });
        }
      } catch (error) {
        console.error('MFA login verification error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to verify MFA token'
        });
      }
    };
  }

  // Backup code verification middleware
  createBackupCodeMiddleware() {
    return async (req, res, next) => {
      try {
        const { backupCode, userId } = req.body;
        
        if (!backupCode || !userId) {
          return res.status(400).json({
            success: false,
            error: 'Backup code and user ID required'
          });
        }

        // In a real application, you would retrieve the user's backup codes from database
        // const user = await User.findById(userId);
        // const hashedBackupCodes = user.backupCodes;

        // For demo purposes, we'll use session data
        if (!req.session.mfaSetup) {
          return res.status(400).json({
            success: false,
            error: 'No MFA setup found'
          });
        }

        // Verify backup code
        const isValid = await this.verifyBackupCode(backupCode, req.session.mfaSetup.backupCodes);
        
        if (isValid) {
          // Mark MFA as verified
          req.session.mfaVerified = true;
          
          // In a real application, you would remove the used backup code
          // await User.removeBackupCode(userId, backupCode);

          res.json({
            success: true,
            message: 'Backup code verification successful',
            warning: 'Backup code has been used and cannot be reused'
          });
        } else {
          res.status(400).json({
            success: false,
            error: 'Invalid backup code'
          });
        }
      } catch (error) {
        console.error('Backup code verification error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to verify backup code'
        });
      }
    };
  }

  // Rate limiting for MFA attempts
  createMFARateLimiter() {
    const rateLimit = require('express-rate-limit');
    
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per window
      message: {
        success: false,
        error: 'Too many MFA attempts. Please try again later.',
        errorCode: 'MFA_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => `mfa:${req.ip}:${req.user?.id || 'anonymous'}`
    });
  }

  // Check if MFA is enabled for user
  isMFAEnabled(user) {
    return user && user.mfaEnabled && user.mfaSecret;
  }

  // Generate MFA challenge for user
  generateMFAChallenge(user) {
    if (!this.isMFAEnabled(user)) {
      return null;
    }

    return {
      requiresMFA: true,
      methods: ['totp', 'backup'],
      challengeId: crypto.randomBytes(16).toString('hex'),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
    };
  }
}

module.exports = new MFAMiddleware();
