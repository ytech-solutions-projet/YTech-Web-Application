# Security Configuration Guide

This document provides comprehensive security configuration instructions for the YTech application, implementing OWASP Top 10, ISO 27001, and other security standards.

## Environment Variables

Create a `.env` file in the backend directory with the following security configurations:

```bash
# Basic Configuration
NODE_ENV=production
PORT=5001

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/ytech
REDIS_URL=redis://localhost:6379

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-min-256-bits
ENCRYPTION_KEY=your-32-character-encryption-key
SESSION_SECRET=your-super-secret-session-key

# SSL/TLS Configuration
SSL_CERT_PATH=/path/to/ssl/cert.pem
SSL_KEY_PATH=/path/to/ssl/private.key
SSL_CA_PATH=/path/to/ssl/ca.pem
REQUIRE_CLIENT_CERT=false

# Cloudflare Configuration
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
CLOUDFLARE_ZONE_ID=your-cloudflare-zone-id
CLOUDFLARE_DOMAIN=ytech.ma
CLOUDFLARE_WEBHOOK_SECRET=your-webhook-secret

# Security Monitoring
SECURITY_WEBHOOK_URL=https://your-monitoring-service.com/webhook
ENABLE_RUNTIME_SERVICES=true

# Rate Limiting
JSON_BODY_LIMIT=100kb
URLENCODED_BODY_LIMIT=50kb

# Trust Proxy
TRUST_PROXY=true

# MFA Configuration
MFA_ISSUER=YTECH Secure Application
MFA_WINDOW=2

# Password Policy
PASSWORD_MIN_LENGTH=12
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SPECIAL_CHARS=true

# Logging
LOG_LEVEL=info
AUDIT_LOG_RETENTION_DAYS=365
```

## SSL/TLS Configuration

### Generate Self-Signed Certificate (Development Only)

```bash
# Create certificates directory
mkdir -p backend/certs

# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout backend/certs/server.key -out backend/certs/server.crt -days 365 -nodes -subj "/C=MA/ST=Casablanca/L=Casablanca/O=YTech/OU=IT/CN=localhost"
```

### Production SSL Setup

1. Obtain SSL certificate from a trusted CA (Let's Encrypt, DigiCert, etc.)
2. Place certificates in the configured paths
3. Ensure certificate chain is complete
4. Set up automatic certificate renewal

### TLS Configuration

The application enforces TLS 1.3 with strong cipher suites:
- TLS_AES_256_GCM_SHA384
- TLS_CHACHA20_POLY1305_SHA256
- TLS_AES_128_GCM_SHA256

## Cloudflare Setup

### 1. Create Cloudflare Account

1. Sign up at https://cloudflare.com
2. Add your domain to Cloudflare
3. Update your domain nameservers to Cloudflare's nameservers

### 2. Configure WAF Rules

The application automatically deploys custom WAF rules:
- SQL injection protection
- XSS protection
- Rate limiting
- Bot management
- IP whitelisting/blacklisting

### 3. Enable Security Features

In Cloudflare dashboard:
- Enable SSL/TLS (Full/Strict mode)
- Enable HSTS
- Enable Automatic HTTPS Rewrites
- Enable Bot Fight Mode
- Enable Web Application Firewall

### 4. Configure API Token

1. Go to Cloudflare dashboard > My Profile > API Tokens
2. Create custom token with permissions:
   - Zone:Zone:Read
   - Zone:Firewall:Edit
   - Zone:Page Shield:Read
   - Account:Account Settings:Read

## Database Security

### PostgreSQL Configuration

```sql
-- Create secure database user
CREATE USER ytech_app WITH PASSWORD 'strong_password';

-- Grant limited permissions
GRANT CONNECT ON DATABASE ytech TO ytech_app;
GRANT USAGE ON SCHEMA public TO ytech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ytech_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO ytech_app;

-- Enable row-level security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensitive_data ENABLE ROW LEVEL SECURITY;

-- Create security policies
CREATE POLICY user_isolation ON users FOR ALL USING (id = current_setting('app.current_user_id')::uuid);
```

### Redis Configuration

```bash
# Enable Redis authentication
requirepass your-redis-password

# Enable TLS
tls-port 6380
port 0
tls-cert-file /path/to/redis.crt
tls-key-file /path/to/redis.key
tls-ca-cert-file /path/to/ca.crt
```

## Multi-Factor Authentication (MFA)

### TOTP Setup

1. Install authenticator app (Google Authenticator, Authy, etc.)
2. Enable MFA for admin accounts
3. Generate backup codes and store securely
4. Test MFA login process

### MFA Configuration

The application supports:
- TOTP (Time-based One-Time Password)
- Backup codes
- Rate limiting for MFA attempts
- Session management

## Role-Based Access Control (RBAC)

### Default Roles

1. **SUPER_ADMIN** - Full system access
2. **ADMIN** - Administrative access
3. **MANAGER** - Business management
4. **EDITOR** - Content management
5. **USER** - Basic authenticated user
6. **GUEST** - Unauthenticated access

### Custom Roles

Create custom roles by modifying `backend/middleware/rbac.js`:

```javascript
// Add custom role
CUSTOM_ROLE: {
  id: 'custom_role',
  name: 'Custom Role',
  level: 50,
  permissions: [
    'content.read',
    'content.update',
    'analytics.read'
  ],
  description: 'Custom role description'
}
```

## Input Validation

### Validation Rules

The application implements comprehensive input validation:
- SQL injection prevention
- XSS protection
- Command injection prevention
- Length validation
- Character validation
- Type validation

### Custom Validation

Add custom validation rules in `backend/middleware/inputValidation.js`:

```javascript
// Add custom validation rule
customField: {
  type: 'string',
  required: true,
  minLength: 5,
  maxLength: 100,
  validate: (value) => {
    // Custom validation logic
    return { isValid: true };
  }
}
```

## Security Monitoring

### Logging Configuration

Enable comprehensive security logging:

```javascript
// Security event types
- INJECTION_ATTEMPT
- XSS_ATTEMPT
- SQL_INJECTION_ATTEMPT
- UNAUTHORIZED_ACCESS
- PRIVILEGE_ESCALATION
- WAF_BYPASS_ATTEMPT
- RATE_LIMIT_EXCEEDED
```

### Monitoring Setup

1. Configure security webhook URL
2. Set up SIEM integration
3. Enable real-time alerts
4. Configure log retention policies

## Security Testing

### Automated Testing

Run automated security tests:

```bash
# Run comprehensive security tests
curl http://localhost:5001/api/security/test

# Run specific tests
curl http://localhost:5001/api/security/test?suite=owasp
```

### Manual Testing

1. Penetration testing
2. Code review
3. Configuration audit
4. Network security assessment

## Compliance

### ISO 27001

The application implements ISO 27001 controls:
- Annex A controls fully implemented
- Regular security audits
- Documentation and procedures
- Risk assessment and treatment

### GDPR Compliance

- Data protection by design and default
- User consent management
- Data breach notification
- Right to be forgotten
- Data portability

### OWASP ASVS

- Application Security Verification Standard compliance
- Level 2 verification requirements
- Regular security assessments
- Secure development lifecycle

## Backup and Recovery

### Backup Strategy

1. **Database Backups**: Daily automated backups
2. **File Backups**: Weekly full backups
3. **Configuration Backups**: On configuration changes
4. **Off-site Storage**: Secure off-site backup storage

### Recovery Procedures

1. **Disaster Recovery Plan**: Documented recovery procedures
2. **Recovery Testing**: Monthly recovery testing
3. **RTO/RPO**: Defined recovery objectives
4. **Communication**: Incident communication plan

## Incident Response

### Security Incident Categories

1. **Critical**: System compromise, data breach
2. **High**: Privilege escalation, DoS attack
3. **Medium**: Suspicious activity, policy violation
4. **Low**: Configuration issue, minor vulnerability

### Response Procedures

1. **Detection**: Automated monitoring and alerting
2. **Analysis**: Incident assessment and classification
3. **Containment**: Immediate threat containment
4. **Eradication**: Root cause elimination
5. **Recovery**: System restoration
6. **Lessons Learned**: Post-incident review

## Performance Optimization

### Security Performance

1. **Caching**: Secure caching implementation
2. **Rate Limiting**: Efficient rate limiting
3. **Compression**: Secure compression
4. **CDN**: Secure CDN configuration

### Monitoring Performance

1. **Response Times**: Security middleware performance
2. **Memory Usage**: Security component memory usage
3. **CPU Usage**: Security processing overhead
4. **Network Latency**: Security-related network latency

## Troubleshooting

### Common Issues

1. **SSL Certificate Errors**: Verify certificate paths and permissions
2. **MFA Issues**: Check time synchronization and secret keys
3. **Rate Limiting**: Adjust rate limits for legitimate traffic
4. **Database Security**: Verify database user permissions

### Debug Mode

Enable debug mode for troubleshooting:

```bash
NODE_ENV=development
DEBUG=security:*
```

## Security Checklist

### Pre-Deployment Checklist

- [ ] SSL/TLS configuration verified
- [ ] Security headers configured
- [ ] Input validation tested
- [ ] Authentication and authorization tested
- [ ] Rate limiting configured
- [ ] Logging and monitoring enabled
- [ ] Backup procedures tested
- [ ] Security tests passed
- [ ] Compliance verified
- [ ] Documentation updated

### Post-Deployment Checklist

- [ ] Monitoring alerts configured
- [ ] Performance baseline established
- [ ] Security incident response tested
- [ ] User training completed
- [ ] Regular security scans scheduled
- [ ] Compliance audit scheduled

## Support

For security issues or questions:
- Security Team: security@ytech.ma
- Documentation: https://docs.ytech.ma/security
- Emergency Contact: +212-XXX-XXX-XXX

---

**Last Updated**: 2024-01-15
**Version**: 1.0.0
**Classification**: Internal Use Only
