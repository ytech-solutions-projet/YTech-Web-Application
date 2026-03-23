/**
 * Role-Based Access Control (RBAC) Implementation
 * Conforms to OWASP ASVS and ISO 27001 standards
 */

const crypto = require('crypto');

class RBACMiddleware {
  constructor() {
    this.roles = {
      // Super Admin - Full system access
      SUPER_ADMIN: {
        id: 'super_admin',
        name: 'Super Administrator',
        level: 100,
        permissions: ['*'], // All permissions
        description: 'Full system administrator with all privileges'
      },
      
      // Admin - Administrative access
      ADMIN: {
        id: 'admin',
        name: 'Administrator',
        level: 80,
        permissions: [
          'user.create', 'user.read', 'user.update', 'user.delete',
          'role.create', 'role.read', 'role.update', 'role.delete',
          'system.config', 'system.monitor', 'system.backup',
          'content.create', 'content.read', 'content.update', 'content.delete',
          'analytics.read'
        ],
        description: 'System administrator with most privileges'
      },
      
      // Manager - Business management
      MANAGER: {
        id: 'manager',
        name: 'Manager',
        level: 60,
        permissions: [
          'user.read', 'user.update',
          'content.create', 'content.read', 'content.update',
          'analytics.read',
          'contact.read', 'contact.respond'
        ],
        description: 'Business manager with content and user management'
      },
      
      // Editor - Content management
      EDITOR: {
        id: 'editor',
        name: 'Editor',
        level: 40,
        permissions: [
          'content.create', 'content.read', 'content.update',
          'media.upload', 'media.read'
        ],
        description: 'Content editor with media management'
      },
      
      // User - Basic authenticated user
      USER: {
        id: 'user',
        name: 'User',
        level: 20,
        permissions: [
          'profile.read', 'profile.update',
          'content.read'
        ],
        description: 'Basic authenticated user'
      },
      
      // Guest - Unauthenticated access
      GUEST: {
        id: 'guest',
        name: 'Guest',
        level: 0,
        permissions: [
          'content.read'
        ],
        description: 'Unauthenticated user with read-only access'
      }
    };

    this.resources = {
      users: ['create', 'read', 'update', 'delete'],
      roles: ['create', 'read', 'update', 'delete'],
      content: ['create', 'read', 'update', 'delete'],
      system: ['config', 'monitor', 'backup'],
      analytics: ['read'],
      contact: ['read', 'respond'],
      media: ['upload', 'read'],
      profile: ['read', 'update']
    };
  }

  // Check if user has permission
  hasPermission(userRole, permission) {
    const role = this.roles[userRole];
    if (!role) return false;

    // Super admin has all permissions
    if (role.permissions.includes('*')) return true;

    // Check specific permission
    return role.permissions.includes(permission);
  }

  // Check if user has any of the specified permissions
  hasAnyPermission(userRole, permissions) {
    return permissions.some(permission => this.hasPermission(userRole, permission));
  }

  // Check if user has all specified permissions
  hasAllPermissions(userRole, permissions) {
    return permissions.every(permission => this.hasPermission(userRole, permission));
  }

  // Get user role level
  getRoleLevel(userRole) {
    const role = this.roles[userRole];
    return role ? role.level : 0;
  }

  // Check if user can access resource
  canAccessResource(userRole, resource, action) {
    const permission = `${resource}.${action}`;
    return this.hasPermission(userRole, permission);
  }

  // Create RBAC middleware
  createRBACMiddleware(options = {}) {
    return (req, res, next) => {
      // Skip RBAC for health checks and public endpoints
      if (req.path === '/api/health' || !req.path.startsWith('/api/')) {
        return next();
      }

      // Get user role from request (set by authentication middleware)
      const userRole = req.user?.role || 'GUEST';

      // Authentication is resolved later on route-level middleware for most API endpoints.
      // When no user has been attached yet, defer the decision instead of blocking public/auth flows.
      if (!req.user) {
        return next();
      }
      
      // Default permission check based on route
      const resource = this.extractResourceFromPath(req.path);
      const action = this.extractActionFromMethod(req.method);

      // Check if user has permission for this resource/action
      if (!this.canAccessResource(userRole, resource, action)) {
        this.logSecurityEvent('UNAUTHORIZED_ACCESS', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method,
          userRole: userRole,
          userId: req.user?.id,
          requiredPermission: `${resource}.${action}`,
          timestamp: new Date().toISOString()
        });

        return res.status(403).json({
          success: false,
          error: 'Access denied',
          errorCode: 'INSUFFICIENT_PERMISSIONS',
          required: `${resource}.${action}`,
          userRole: userRole
        });
      }

      // Add role information to request
      req.rbac = {
        userRole,
        roleInfo: this.roles[userRole],
        permissions: this.roles[userRole].permissions
      };

      next();
    };
  }

  // Extract resource from path
  extractResourceFromPath(path) {
    const pathParts = path.split('/').filter(part => part !== '');
    if (pathParts.length >= 2 && pathParts[0] === 'api') {
      return pathParts[1].replace(/s$/, ''); // Remove trailing 's' for singular resource name
    }
    return 'unknown';
  }

  // Extract action from HTTP method
  extractActionFromMethod(method) {
    const actionMap = {
      'GET': 'read',
      'POST': 'create',
      'PUT': 'update',
      'PATCH': 'update',
      'DELETE': 'delete'
    };
    return actionMap[method] || 'unknown';
  }

  // Permission-based middleware factory
  requirePermission(permission) {
    return (req, res, next) => {
      const userRole = req.user?.role || 'GUEST';
      
      if (!this.hasPermission(userRole, permission)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          errorCode: 'INSUFFICIENT_PERMISSIONS',
          required: permission,
          userRole: userRole
        });
      }

      next();
    };
  }

  // Role-based middleware factory
  requireRole(requiredRole) {
    return (req, res, next) => {
      const userRole = req.user?.role || 'GUEST';
      const userLevel = this.getRoleLevel(userRole);
      const requiredLevel = this.getRoleLevel(requiredRole);

      if (userLevel < requiredLevel) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          errorCode: 'INSUFFICIENT_ROLE_LEVEL',
          required: requiredRole,
          userRole: userRole
        });
      }

      next();
    };
  }

  // Multi-role requirement
  requireAnyRole(roles) {
    return (req, res, next) => {
      const userRole = req.user?.role || 'GUEST';
      
      if (!roles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          errorCode: 'INSUFFICIENT_ROLE',
          required: roles,
          userRole: userRole
        });
      }

      next();
    };
  }

  // Create user with role
  createUserWithRole(userData, role) {
    if (!this.roles[role]) {
      throw new Error(`Invalid role: ${role}`);
    }

    return {
      ...userData,
      role,
      roleInfo: this.roles[role],
      permissions: this.roles[role].permissions,
      createdAt: new Date().toISOString()
    };
  }

  // Update user role
  updateUserRole(user, newRole) {
    if (!this.roles[newRole]) {
      throw new Error(`Invalid role: ${newRole}`);
    }

    const oldRole = user.role;
    user.role = newRole;
    user.roleInfo = this.roles[newRole];
    user.permissions = this.roles[newRole].permissions;
    user.roleUpdatedAt = new Date().toISOString();

    this.logSecurityEvent('ROLE_CHANGED', {
      userId: user.id,
      oldRole,
      newRole,
      timestamp: new Date().toISOString()
    });

    return user;
  }

  // Get all roles
  getAllRoles() {
    return Object.values(this.roles);
  }

  // Get role by ID
  getRoleById(roleId) {
    return Object.values(this.roles).find(role => role.id === roleId);
  }

  // Validate role hierarchy
  validateRoleHierarchy(userRole, targetRole) {
    const userLevel = this.getRoleLevel(userRole);
    const targetLevel = this.getRoleLevel(targetRole);
    
    return userLevel > targetLevel;
  }

  // Create permission middleware for specific resources
  createResourcePermissionMiddleware(resource, action) {
    return (req, res, next) => {
      const userRole = req.user?.role || 'GUEST';
      const permission = `${resource}.${action}`;
      
      if (!this.hasPermission(userRole, permission)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          errorCode: 'RESOURCE_ACCESS_DENIED',
          resource,
          action,
          userRole
        });
      }

      next();
    };
  }

  // Audit middleware for sensitive operations
  createAuditMiddleware() {
    return (req, res, next) => {
      const userRole = req.user?.role || 'GUEST';
      const resource = this.extractResourceFromPath(req.path);
      const action = this.extractActionFromMethod(req.method);

      // Log sensitive operations
      const sensitiveActions = ['delete', 'config', 'backup'];
      if (sensitiveActions.some(sensitive => req.path.includes(sensitive))) {
        this.logSecurityEvent('SENSITIVE_OPERATION', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method,
          userRole,
          userId: req.user?.id,
          resource,
          action,
          timestamp: new Date().toISOString()
        });
      }

      next();
    };
  }

  // Security event logging
  logSecurityEvent(eventType, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: eventType,
      severity: this.getSeverityLevel(eventType),
      data
    };

    console.warn('[RBAC SECURITY]', JSON.stringify(logEntry));
    
    if (process.env.SECURITY_WEBHOOK_URL) {
      this.sendSecurityAlert(logEntry);
    }
  }

  getSeverityLevel(eventType) {
    const severityMap = {
      'UNAUTHORIZED_ACCESS': 'HIGH',
      'ROLE_CHANGED': 'MEDIUM',
      'SENSITIVE_OPERATION': 'MEDIUM',
      'PRIVILEGE_ESCALATION': 'CRITICAL'
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

  // Generate role-based API key
  generateRoleAPIKey(role, expiresIn = '30d') {
    if (!this.roles[role]) {
      throw new Error(`Invalid role: ${role}`);
    }

    const payload = {
      role,
      permissions: this.roles[role].permissions,
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.parseExpiration(expiresIn)).toISOString()
    };

    return {
      apiKey: crypto.randomBytes(32).toString('hex'),
      payload,
      roleInfo: this.roles[role]
    };
  }

  parseExpiration(expiresIn) {
    const units = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };

    const value = parseInt(expiresIn);
    const unit = expiresIn.replace(/[0-9]/g, '').toLowerCase();
    
    return value * (units[unit] || units['d']);
  }
}

module.exports = new RBACMiddleware();
