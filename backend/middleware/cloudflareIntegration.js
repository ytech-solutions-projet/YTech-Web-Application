/**
 * Cloudflare Integration and WAF Configuration
 * Conforms to OWASP ASVS and ISO 27001 standards
 */

const crypto = require('crypto');
const { sanitizeUrlForLogging } = require('../utils/request');
const fetch = (...args) => {
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch(...args);
  }

  return import('node-fetch').then(({ default: nodeFetch }) => nodeFetch(...args));
};

class CloudflareMiddleware {
  constructor() {
    this.cloudflareConfig = {
      apiToken: process.env.CLOUDFLARE_API_TOKEN,
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      zoneId: process.env.CLOUDFLARE_ZONE_ID,
      domain: process.env.CLOUDFLARE_DOMAIN || 'ytech.ma',
      
      // WAF configuration
      waf: {
        enabled: true,
        sensitivity: 'high',
        rulesets: [
          'cloudflare_specials',
          'owasp_modsecurity_core_rule_set',
          'known_cves'
        ],
        customRules: []
      },
      
      // DDoS protection
      ddos: {
        enabled: true,
        level: 'high',
        rateLimit: {
          requests: 1000,
          window: 60
        }
      },
      
      // Bot management
      botManagement: {
        enabled: true,
        fightMode: true,
        scoreThreshold: 30
      },
      
      // Cache settings
      cache: {
        enabled: true,
        ttl: 3600, // 1 hour
        browserTtl: 14400 // 4 hours
      },
      
      // Security headers
      securityHeaders: {
        enabled: true,
        strictTransportSecurity: true,
        xFrameOptions: 'DENY',
        xContentTypeOptions: true,
        referrerPolicy: 'strict-origin-when-cross-origin'
      }
    };
  }

  // Verify Cloudflare webhook signature
  verifyCloudflareSignature(payload, signature, secret) {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  // Cloudflare webhook middleware
  createCloudflareWebhookMiddleware() {
    return (req, res, next) => {
      // Verify Cloudflare webhook
      const signature = req.headers['cf-webhook-signature'];
      const secret = process.env.CLOUDFLARE_WEBHOOK_SECRET;
      
      if (signature && secret) {
        const payload = JSON.stringify(req.body);
        if (!this.verifyCloudflareSignature(payload, signature, secret)) {
          return res.status(401).json({
            success: false,
            error: 'Invalid webhook signature'
          });
        }
      }

      // Process Cloudflare webhook events
      if (req.headers['user-agent']?.includes('Cloudflare')) {
        this.processCloudflareEvent(req.body);
      }

      next();
    };
  }

  // Process Cloudflare security events
  processCloudflareEvent(event) {
    console.log('[CLOUDFLARE EVENT]', JSON.stringify(event));
    
    // Handle different event types
    switch (event.type) {
      case 'firewall.rule_triggered':
        this.handleFirewallEvent(event);
        break;
      case 'ddos.attack_detected':
        this.handleDDoSEvent(event);
        break;
      case 'bot.management':
        this.handleBotEvent(event);
        break;
      default:
        console.log('Unknown Cloudflare event type:', event.type);
    }
  }

  // Handle firewall events
  handleFirewallEvent(event) {
    const eventData = {
      timestamp: new Date().toISOString(),
      type: 'CLOUDFLARE_FIREWALL',
      severity: 'HIGH',
      data: {
        ruleId: event.data.rule_id,
        action: event.data.action,
        clientIP: event.data.client_ip,
        userAgent: event.data.client_user_agent,
        country: event.data.client_country,
        matchedRule: event.data.matched_rule
      }
    };

    this.sendSecurityAlert(eventData);
  }

  // Handle DDoS events
  handleDDoSEvent(event) {
    const eventData = {
      timestamp: new Date().toISOString(),
      type: 'CLOUDFLARE_DDoS',
      severity: 'CRITICAL',
      data: {
        attackType: event.data.attack_type,
        sourceIPs: event.data.source_ips,
        target: event.data.target,
        mitigation: event.data.mitigation
      }
    };

    this.sendSecurityAlert(eventData);
  }

  // Handle bot events
  handleBotEvent(event) {
    const eventData = {
      timestamp: new Date().toISOString(),
      type: 'CLOUDFLARE_BOT',
      severity: 'MEDIUM',
      data: {
        botScore: event.data.bot_score,
        botType: event.data.bot_type,
        clientIP: event.data.client_ip,
        userAgent: event.data.client_user_agent
      }
    };

    this.sendSecurityAlert(eventData);
  }

  // Cloudflare IP validation middleware
  createCloudflareIPMiddleware() {
    return async (req, res, next) => {
      // Get Cloudflare IP ranges
      const cloudflareIPs = await this.getCloudflareIPRanges();
      
      // Check if request is from Cloudflare
      const clientIP = req.ip || req.connection.remoteAddress;
      const isCloudflareIP = cloudflareIPs.some(range => 
        this.isIPInRange(clientIP, range)
      );

      if (isCloudflareIP) {
        // Add Cloudflare headers
        req.cloudflare = {
          verified: true,
          ip: clientIP
        };
      }

      next();
    };
  }

  // Get Cloudflare IP ranges
  async getCloudflareIPRanges() {
    if (process.env.NODE_ENV === 'test') {
      return [];
    }

    try {
      const response = await fetch('https://www.cloudflare.com/ips-v4');
      const text = await response.text();
      return text.trim().split('\n');
    } catch (error) {
      console.error('Failed to fetch Cloudflare IP ranges:', error);
      return [];
    }
  }

  // Check if IP is in range
  isIPInRange(ip, range) {
    // Simple IP range check (can be enhanced with proper CIDR logic)
    return ip.startsWith(range.split('/')[0].split('.').slice(0, 2).join('.'));
  }

  // Cloudflare headers middleware
  createCloudflareHeadersMiddleware() {
    return (req, res, next) => {
      // Add Cloudflare-specific headers
      if (req.headers['cf-connecting-ip']) {
        req.clientIP = req.headers['cf-connecting-ip'];
      }

      if (req.headers['cf-country']) {
        req.country = req.headers['cf-country'];
      }

      if (req.headers['cf-ray']) {
        req.cloudflareRay = req.headers['cf-ray'];
      }

      if (req.headers['cf-ipcountry']) {
        req.ipCountry = req.headers['cf-ipcountry'];
      }

      // Add security headers for Cloudflare
      res.setHeader('X-Cloudflare-ID', req.cloudflareRay || 'unknown');
      res.setHeader('X-Client-IP', req.clientIP || req.ip);

      next();
    };
  }

  // Rate limiting with Cloudflare
  createCloudflareRateLimitMiddleware() {
    return (req, res, next) => {
      // Use Cloudflare rate limiting headers
      const rateLimit = req.headers['cf-ratelimit-limit'];
      const rateRemaining = req.headers['cf-ratelimit-remaining'];
      
      if (rateLimit && rateRemaining) {
        res.setHeader('X-RateLimit-Limit', rateLimit);
        res.setHeader('X-RateLimit-Remaining', rateRemaining);
      }

      // Check if rate limited by Cloudflare
      if (req.headers['cf-response-status'] === '429') {
        return res.status(429).json({
          success: false,
          error: 'Rate limited by Cloudflare',
          errorCode: 'CLOUDFLARE_RATE_LIMIT'
        });
      }

      next();
    };
  }

  // WAF bypass detection
  createWAFBypassDetectionMiddleware() {
    return (req, res, next) => {
      // Check for WAF bypass attempts
      const suspiciousHeaders = [
        'x-forwarded-for',
        'x-real-ip',
        'x-originating-ip',
        'x-cluster-client-ip'
      ];

      const suspiciousPatterns = [
        /\/\*.*\*\//, // SQL comments
        /union.*select/i, // SQL injection
        /<script.*>/i, // XSS
        /javascript:/i // JavaScript protocol
      ];

      let bypassAttempt = false;

      // Check headers
      suspiciousHeaders.forEach(header => {
        if (req.headers[header]) {
          bypassAttempt = true;
        }
      });

      // Check URL patterns
      suspiciousPatterns.forEach(pattern => {
        if (pattern.test(req.url)) {
          bypassAttempt = true;
        }
      });

      if (bypassAttempt) {
        this.logSecurityEvent('WAF_BYPASS_ATTEMPT', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          url: sanitizeUrlForLogging(req.originalUrl || req.url),
          headers: req.headers,
          timestamp: new Date().toISOString()
        });

        return res.status(403).json({
          success: false,
          error: 'WAF bypass attempt detected',
          errorCode: 'WAF_BYPASS'
        });
      }

      next();
    };
  }

  // Create custom WAF rules
  createCustomWAFRules() {
    return [
      {
        id: '1001',
        name: 'Block SQL Injection',
        expression: '(http.request.uri.path contains "union" or http.request.uri.path contains "select" or http.request.uri.path contains "drop")',
        action: 'block',
        description: 'Block common SQL injection patterns'
      },
      {
        id: '1002',
        name: 'Block XSS Attempts',
        expression: '(http.request.uri.path contains "<script" or http.request.uri.path contains "javascript:")',
        action: 'block',
        description: 'Block XSS attempts'
      },
      {
        id: '1003',
        name: 'Rate Limit API',
        expression: '(http.request.uri.path starts_with "/api")',
        action: 'rate_limit',
        rateLimit: {
          requests: 100,
          window: 60
        },
        description: 'Rate limit API endpoints'
      },
      {
        id: '1004',
        name: 'Block Suspicious User Agents',
        expression: '(http.request.user_agent contains "bot" or http.request.user_agent contains "crawler" or http.request.user_agent contains "scanner")',
        action: 'block',
        description: 'Block known bot user agents'
      }
    ];
  }

  // Deploy WAF rules to Cloudflare
  async deployWAFRules() {
    if (!this.cloudflareConfig.apiToken || !this.cloudflareConfig.zoneId) {
      console.warn('Cloudflare API token or zone ID not configured');
      return;
    }

    try {
      const customRules = this.createCustomWAFRules();
      
      for (const rule of customRules) {
        await this.deployWAFRule(rule);
      }
      
      console.log('WAF rules deployed successfully');
    } catch (error) {
      console.error('Failed to deploy WAF rules:', error);
    }
  }

  // Deploy individual WAF rule
  async deployWAFRule(rule) {
    const url = `https://api.cloudflare.com/client/v4/zones/${this.cloudflareConfig.zoneId}/firewall/waf/rules`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.cloudflareConfig.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filter: {
          expression: rule.expression,
          description: rule.description
        },
        action: rule.action,
        priority: rule.id,
        description: rule.name,
        ...(rule.rateLimit && { ratelimit: rule.rateLimit })
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to deploy rule ${rule.id}: ${response.statusText}`);
    }

    return await response.json();
  }

  // Security alert logging
  logSecurityEvent(eventType, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: eventType,
      severity: this.getSeverityLevel(eventType),
      data
    };

    console.warn('[CLOUDFLARE SECURITY]', JSON.stringify(logEntry));
    
    if (process.env.SECURITY_WEBHOOK_URL) {
      this.sendSecurityAlert(logEntry);
    }
  }

  getSeverityLevel(eventType) {
    const severityMap = {
      'WAF_BYPASS_ATTEMPT': 'CRITICAL',
      'DDoS_ATTACK': 'CRITICAL',
      'BOT_ATTACK': 'HIGH',
      'FIREWALL_TRIGGER': 'MEDIUM'
    };
    return severityMap[eventType] || 'LOW';
  }

  async sendSecurityAlert(logEntry) {
    try {
      await fetch(process.env.SECURITY_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry)
      });
    } catch (error) {
      console.error('Failed to send security alert:', error);
    }
  }

  // Comprehensive Cloudflare security middleware
  createComprehensiveCloudflareMiddleware() {
    return [
      this.createCloudflareWebhookMiddleware(),
      this.createCloudflareIPMiddleware(),
      this.createCloudflareHeadersMiddleware(),
      this.createCloudflareRateLimitMiddleware(),
      this.createWAFBypassDetectionMiddleware()
    ];
  }
}

module.exports = new CloudflareMiddleware();
