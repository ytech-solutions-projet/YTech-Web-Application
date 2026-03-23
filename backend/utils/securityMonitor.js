const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const getFetch = async () => {
  if (typeof fetch === 'function') {
    return fetch;
  }

  const importedModule = await import('node-fetch');
  return importedModule.default;
};

class SecurityMonitoringSystem {
  constructor() {
    this.logDirectory = path.join(__dirname, '../logs');
    this.securityLogFile = path.join(this.logDirectory, 'security.log');
    this.auditLogFile = path.join(this.logDirectory, 'audit.log');
    this.threatLogFile = path.join(this.logDirectory, 'threats.log');
    this.performanceLogFile = path.join(this.logDirectory, 'performance.log');
    
    this.ensureLogDirectories();
    this.threatLevels = {
      CRITICAL: 5,
      HIGH: 4,
      MEDIUM: 3,
      LOW: 2,
      INFO: 1
    };
    
    this.alertThresholds = {
      failedLogins: 10,
      suspiciousRequests: 50,
      errorRate: 0.1,
      responseTime: 5000
    };
    
    this.metrics = {
      requests: 0,
      failedLogins: 0,
      suspiciousRequests: 0,
      errors: 0,
      totalResponseTime: 0,
      startTime: Date.now()
    };

    this.trackRequest = this.trackRequest.bind(this);
  }

  ensureLogDirectories() {
    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }
  }

  writeLog(logFile, logEntry) {
    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  logSecurityEvent(event, data, severity = 'INFO') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'SECURITY_EVENT',
      event,
      severity,
      threatLevel: this.threatLevels[severity] || 1,
      data: {
        ...data,
        ip: data.ip || 'unknown',
        userAgent: data.userAgent || 'unknown',
        requestId: data.requestId || crypto.randomUUID()
      }
    };

    this.writeLog(this.securityLogFile, logEntry);
    
    if (this.threatLevels[severity] >= this.threatLevels.HIGH) {
      this.writeLog(this.threatLogFile, logEntry);
      this.triggerSecurityAlert(logEntry);
    }

    console.warn(`[SECURITY ${severity}] ${event}:`, logEntry.data);
  }

  logAuditEvent(action, userId, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'AUDIT_EVENT',
      action,
      userId,
      data: {
        ...data,
        ip: data.ip || 'unknown',
        userAgent: data.userAgent || 'unknown'
      }
    };

    this.writeLog(this.auditLogFile, logEntry);
    console.info(`[AUDIT] ${action} by user ${userId}:`, logEntry.data);
  }

  logPerformanceMetric(metric, value, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'PERFORMANCE_METRIC',
      metric,
      value,
      metadata
    };

    this.writeLog(this.performanceLogFile, logEntry);
    
    // Check performance thresholds
    if (metric === 'responseTime' && value > this.alertThresholds.responseTime) {
      this.logSecurityEvent('SLOW_RESPONSE', {
        responseTime: value,
        threshold: this.alertThresholds.responseTime,
        ...metadata
      }, 'MEDIUM');
    }
  }

  trackRequest(req, res, next) {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    
    req.requestId = requestId;
    
    // Track basic metrics
    this.metrics.requests++;
    
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      this.metrics.totalResponseTime += responseTime;
      
      this.logPerformanceMetric('responseTime', responseTime, {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        ip: req.ip
      });
      
      // Track errors
      if (res.statusCode >= 400) {
        this.metrics.errors++;
        this.logSecurityEvent('HTTP_ERROR', {
          statusCode: res.statusCode,
          method: req.method,
          path: req.path,
          requestId,
          ip: req.ip
        }, res.statusCode >= 500 ? 'HIGH' : 'MEDIUM');
      }
      
      // Check for suspicious patterns
      this.analyzeRequestPatterns(req, res, responseTime);
    });
    
    next();
  }

  analyzeRequestPatterns(req, res, responseTime) {
    const suspiciousPatterns = [
      /\.\./,  // Path traversal
      /<script/i,  // XSS attempts
      /union.*select/i,  // SQL injection
      /javascript:/i,  // JavaScript protocol
      /data:.*base64/i  // Base64 data URLs
    ];
    
    const isSuspicious = suspiciousPatterns.some(pattern => 
      pattern.test(req.url) || 
      pattern.test(JSON.stringify(req.body)) ||
      pattern.test(JSON.stringify(req.query))
    );
    
    if (isSuspicious) {
      this.metrics.suspiciousRequests++;
      this.logSecurityEvent('SUSPICIOUS_REQUEST', {
        url: req.url,
        method: req.method,
        body: req.body,
        query: req.query,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.requestId
      }, 'HIGH');
    }
    
    // Check for automated tools
    const userAgent = req.get('User-Agent') || '';
    const automatedTools = [
      /bot/i,
      /crawler/i,
      /scanner/i,
      /wget/i,
      /curl/i
    ];
    
    if (automatedTools.some(tool => tool.test(userAgent))) {
      this.logSecurityEvent('AUTOMATED_TOOL_DETECTED', {
        userAgent,
        ip: req.ip,
        requestId: req.requestId
      }, 'MEDIUM');
    }
  }

  trackFailedLogin(ip, email, userAgent) {
    this.metrics.failedLogins++;
    
    this.logSecurityEvent('FAILED_LOGIN', {
      ip,
      email,
      userAgent,
      timestamp: new Date().toISOString()
    }, 'MEDIUM');
    
    // Check for brute force patterns
    if (this.metrics.failedLogins >= this.alertThresholds.failedLogins) {
      this.logSecurityEvent('BRUTE_FORCE_ATTACK', {
        ip,
        failedAttempts: this.metrics.failedLogins,
        timeWindow: '1 hour',
        userAgent
      }, 'CRITICAL');
    }
  }

  trackSuccessfulLogin(userId, ip, userAgent) {
    this.logAuditEvent('LOGIN_SUCCESS', userId, {
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
    
    // Reset failed login counter for this IP
    this.metrics.failedLogins = Math.max(0, this.metrics.failedLogins - 1);
  }

  trackPasswordReset(email, ip, userAgent) {
    this.logAuditEvent('PASSWORD_RESET_REQUEST', null, {
      email,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
    
    this.logSecurityEvent('PASSWORD_RESET', {
      email,
      ip,
      userAgent
    }, 'MEDIUM');
  }

  trackDataAccess(userId, resource, action, ip) {
    this.logAuditEvent('DATA_ACCESS', userId, {
      resource,
      action,
      ip,
      timestamp: new Date().toISOString()
    });
  }

  trackPermissionChange(userId, targetUserId, newRole, ip) {
    this.logAuditEvent('PERMISSION_CHANGE', userId, {
      targetUserId,
      newRole,
      ip,
      timestamp: new Date().toISOString()
    });
    
    this.logSecurityEvent('PRIVILEGE_ESCALATION', {
      userId,
      targetUserId,
      newRole,
      ip
    }, 'HIGH');
  }

  generateSecurityReport() {
    const uptime = Date.now() - this.metrics.startTime;
    const avgResponseTime = this.metrics.requests > 0 ? 
      this.metrics.totalResponseTime / this.metrics.requests : 0;
    const errorRate = this.metrics.requests > 0 ? 
      this.metrics.errors / this.metrics.requests : 0;
    
    const report = {
      timestamp: new Date().toISOString(),
      uptime,
      metrics: {
        ...this.metrics,
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(errorRate * 100) / 100,
        requestsPerMinute: Math.round((this.metrics.requests / uptime) * 60000)
      },
      thresholds: this.alertThresholds,
      alerts: this.checkThresholds(avgResponseTime, errorRate)
    };
    
    this.writeLog(path.join(this.logDirectory, 'security-report.json'), report);
    return report;
  }

  checkThresholds(avgResponseTime, errorRate) {
    const alerts = [];
    
    if (avgResponseTime > this.alertThresholds.responseTime) {
      alerts.push({
        type: 'PERFORMANCE',
        message: `Average response time (${avgResponseTime}ms) exceeds threshold (${this.alertThresholds.responseTime}ms)`,
        severity: 'MEDIUM'
      });
    }
    
    if (errorRate > this.alertThresholds.errorRate) {
      alerts.push({
        type: 'ERROR_RATE',
        message: `Error rate (${(errorRate * 100).toFixed(2)}%) exceeds threshold (${(this.alertThresholds.errorRate * 100).toFixed(2)}%)`,
        severity: 'HIGH'
      });
    }
    
    if (this.metrics.failedLogins >= this.alertThresholds.failedLogins) {
      alerts.push({
        type: 'SECURITY',
        message: `Failed login attempts (${this.metrics.failedLogins}) exceed threshold (${this.alertThresholds.failedLogins})`,
        severity: 'CRITICAL'
      });
    }
    
    return alerts;
  }

  triggerSecurityAlert(logEntry) {
    // In production, this would send alerts to:
    // - Security team email
    // - Slack/Discord webhook
    // - SMS for critical alerts
    // - SIEM system
    
    console.error('🚨 SECURITY ALERT:', JSON.stringify(logEntry, null, 2));
    
    // Example webhook integration (would be configured in production)
    if (process.env.SECURITY_WEBHOOK_URL) {
      this.sendWebhookAlert(logEntry);
    }
  }

  async sendWebhookAlert(logEntry) {
    try {
      const fetchImplementation = await getFetch();
      await fetchImplementation(process.env.SECURITY_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 Security Alert: ${logEntry.event}`,
          attachments: [{
            color: this.getAlertColor(logEntry.severity),
            fields: [
              { title: 'Event', value: logEntry.event, short: true },
              { title: 'Severity', value: logEntry.severity, short: true },
              { title: 'IP', value: logEntry.data.ip, short: true },
              { title: 'Timestamp', value: logEntry.timestamp, short: false }
            ]
          }]
        })
      });
    } catch (error) {
      console.error('Failed to send webhook alert:', error);
    }
  }

  getAlertColor(severity) {
    const colors = {
      CRITICAL: 'danger',
      HIGH: 'warning',
      MEDIUM: 'good',
      LOW: 'good',
      INFO: 'good'
    };
    return colors[severity] || 'good';
  }

  rotateLogs() {
    const logFiles = [
      this.securityLogFile,
      this.auditLogFile,
      this.threatLogFile,
      this.performanceLogFile
    ];
    
    logFiles.forEach(logFile => {
      if (fs.existsSync(logFile)) {
        const stats = fs.statSync(logFile);
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        
        if (Date.now() - stats.mtime.getTime() > maxAge) {
          const backupFile = logFile + '.old';
          fs.renameSync(logFile, backupFile);
          
          // Keep only last backup
          if (fs.existsSync(backupFile)) {
            const backupStats = fs.statSync(backupFile);
            if (Date.now() - backupStats.mtime.getTime() > maxAge * 2) {
              fs.unlinkSync(backupFile);
            }
          }
        }
      }
    });
  }

  getSecurityMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.startTime,
      logFiles: {
        security: this.securityLogFile,
        audit: this.auditLogFile,
        threats: this.threatLogFile,
        performance: this.performanceLogFile
      }
    };
  }
}

module.exports = new SecurityMonitoringSystem();
