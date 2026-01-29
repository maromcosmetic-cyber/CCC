/**
 * Role-Based Access Control Service
 * 
 * Implements RBAC for all system functions with permission checking,
 * role management, and security auditing.
 */

import { 
  AccessControlService, 
  AccessControlContext, 
  User, 
  UserRole, 
  Permission, 
  RolePermissions,
  SecurityAuditEvent 
} from './types';

export class RBACService implements AccessControlService {
  private rolePermissions: Map<UserRole, Permission[]>;
  private users: Map<string, User>;
  private auditEvents: SecurityAuditEvent[];

  constructor() {
    this.rolePermissions = new Map();
    this.users = new Map();
    this.auditEvents = [];
    this.initializeDefaultRoles();
  }

  /**
   * Initialize default role permissions
   */
  private initializeDefaultRoles(): void {
    // Admin - Full system access
    this.rolePermissions.set(UserRole.ADMIN, [
      Permission.READ_SOCIAL_EVENTS,
      Permission.WRITE_SOCIAL_EVENTS,
      Permission.DELETE_SOCIAL_EVENTS,
      Permission.CREATE_CONTENT,
      Permission.EDIT_CONTENT,
      Permission.PUBLISH_CONTENT,
      Permission.DELETE_CONTENT,
      Permission.VIEW_ANALYTICS,
      Permission.EXPORT_ANALYTICS,
      Permission.MANAGE_USERS,
      Permission.MANAGE_INTEGRATIONS,
      Permission.VIEW_AUDIT_LOGS,
      Permission.MANAGE_SECURITY,
      Permission.CONFIGURE_AI,
      Permission.APPROVE_AUTOMATED_ACTIONS,
      Permission.OVERRIDE_DECISIONS
    ]);

    // Brand Manager - Brand and content oversight
    this.rolePermissions.set(UserRole.BRAND_MANAGER, [
      Permission.READ_SOCIAL_EVENTS,
      Permission.WRITE_SOCIAL_EVENTS,
      Permission.CREATE_CONTENT,
      Permission.EDIT_CONTENT,
      Permission.PUBLISH_CONTENT,
      Permission.DELETE_CONTENT,
      Permission.VIEW_ANALYTICS,
      Permission.EXPORT_ANALYTICS,
      Permission.CONFIGURE_AI,
      Permission.APPROVE_AUTOMATED_ACTIONS,
      Permission.OVERRIDE_DECISIONS
    ]);

    // Social Media Manager - Content and engagement management
    this.rolePermissions.set(UserRole.SOCIAL_MEDIA_MANAGER, [
      Permission.READ_SOCIAL_EVENTS,
      Permission.WRITE_SOCIAL_EVENTS,
      Permission.CREATE_CONTENT,
      Permission.EDIT_CONTENT,
      Permission.PUBLISH_CONTENT,
      Permission.VIEW_ANALYTICS,
      Permission.EXPORT_ANALYTICS,
      Permission.APPROVE_AUTOMATED_ACTIONS
    ]);

    // Content Creator - Content creation and editing
    this.rolePermissions.set(UserRole.CONTENT_CREATOR, [
      Permission.READ_SOCIAL_EVENTS,
      Permission.CREATE_CONTENT,
      Permission.EDIT_CONTENT,
      Permission.VIEW_ANALYTICS
    ]);

    // Analyst - Analytics and reporting
    this.rolePermissions.set(UserRole.ANALYST, [
      Permission.READ_SOCIAL_EVENTS,
      Permission.VIEW_ANALYTICS,
      Permission.EXPORT_ANALYTICS
    ]);

    // Viewer - Read-only access
    this.rolePermissions.set(UserRole.VIEWER, [
      Permission.READ_SOCIAL_EVENTS,
      Permission.VIEW_ANALYTICS
    ]);
  }

  /**
   * Check if user has permission for specific action
   */
  async hasPermission(context: AccessControlContext): Promise<boolean> {
    try {
      const user = context.user;
      
      // Check if user is active
      if (!user.isActive) {
        await this.auditAccess(context, false);
        return false;
      }

      // Check role-based permissions
      const rolePermissions = this.rolePermissions.get(user.role) || [];
      const hasRolePermission = rolePermissions.includes(context.action);

      // Check user-specific permissions (overrides)
      const hasUserPermission = user.permissions.includes(context.action);

      const hasAccess = hasRolePermission || hasUserPermission;

      // Audit the access attempt
      await this.auditAccess(context, hasAccess);

      return hasAccess;
    } catch (error) {
      await this.auditAccess(context, false);
      return false;
    }
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    const user = this.users.get(userId);
    if (!user || !user.isActive) {
      return [];
    }

    const rolePermissions = this.rolePermissions.get(user.role) || [];
    const userPermissions = user.permissions || [];

    // Combine role and user permissions, removing duplicates
    return [...new Set([...rolePermissions, ...userPermissions])];
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, role: UserRole): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const oldRole = user.role;
    user.role = role;
    this.users.set(userId, user);

    // Audit role change
    await this.auditSecurityEvent({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      userId,
      action: 'role_assignment',
      resource: 'user_role',
      resourceId: userId,
      success: true,
      details: { oldRole, newRole: role },
      riskLevel: 'medium'
    });
  }

  /**
   * Revoke specific permission from user
   */
  async revokePermission(userId: string, permission: Permission): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    user.permissions = user.permissions.filter(p => p !== permission);
    this.users.set(userId, user);

    // Audit permission revocation
    await this.auditSecurityEvent({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      userId,
      action: 'permission_revocation',
      resource: 'user_permission',
      resourceId: userId,
      success: true,
      details: { revokedPermission: permission },
      riskLevel: 'medium'
    });
  }

  /**
   * Grant specific permission to user
   */
  async grantPermission(userId: string, permission: Permission): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    if (!user.permissions.includes(permission)) {
      user.permissions.push(permission);
      this.users.set(userId, user);

      // Audit permission grant
      await this.auditSecurityEvent({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        userId,
        action: 'permission_grant',
        resource: 'user_permission',
        resourceId: userId,
        success: true,
        details: { grantedPermission: permission },
        riskLevel: 'medium'
      });
    }
  }

  /**
   * Create new user
   */
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'permissions'>): Promise<User> {
    const user: User = {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      permissions: [],
      ...userData
    };

    this.users.set(user.id, user);

    // Audit user creation
    await this.auditSecurityEvent({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      userId: user.id,
      action: 'user_creation',
      resource: 'user',
      resourceId: user.id,
      success: true,
      details: { email: user.email, role: user.role },
      riskLevel: 'low'
    });

    return user;
  }

  /**
   * Deactivate user
   */
  async deactivateUser(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    user.isActive = false;
    this.users.set(userId, user);

    // Audit user deactivation
    await this.auditSecurityEvent({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      userId,
      action: 'user_deactivation',
      resource: 'user',
      resourceId: userId,
      success: true,
      details: { email: user.email },
      riskLevel: 'medium'
    });
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<User | null> {
    return this.users.get(userId) || null;
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  /**
   * Get role permissions
   */
  getRolePermissions(role: UserRole): Permission[] {
    return this.rolePermissions.get(role) || [];
  }

  /**
   * Audit access attempt
   */
  async auditAccess(context: AccessControlContext, success: boolean): Promise<void> {
    const auditEvent: SecurityAuditEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      userId: context.user.id,
      action: `access_${context.action}`,
      resource: context.resource,
      resourceId: context.resourceId,
      success,
      details: {
        userRole: context.user.role,
        requestedPermission: context.action,
        metadata: context.metadata
      },
      riskLevel: success ? 'low' : 'medium'
    };

    await this.auditSecurityEvent(auditEvent);
  }

  /**
   * Audit security event
   */
  private async auditSecurityEvent(event: SecurityAuditEvent): Promise<void> {
    this.auditEvents.push(event);
    
    // In production, this would write to a secure audit log
    console.log(`[SECURITY AUDIT] ${event.timestamp.toISOString()} - ${event.action} by ${event.userId} on ${event.resource} - ${event.success ? 'SUCCESS' : 'FAILURE'}`);
  }

  /**
   * Get audit events
   */
  async getAuditEvents(
    userId?: string, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<SecurityAuditEvent[]> {
    let events = this.auditEvents;

    if (userId) {
      events = events.filter(e => e.userId === userId);
    }

    if (startDate) {
      events = events.filter(e => e.timestamp >= startDate);
    }

    if (endDate) {
      events = events.filter(e => e.timestamp <= endDate);
    }

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Check if user can access resource
   */
  async canAccessResource(
    userId: string, 
    resource: string, 
    action: Permission,
    resourceId?: string
  ): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) {
      return false;
    }

    const context: AccessControlContext = {
      user,
      resource,
      action,
      resourceId
    };

    return this.hasPermission(context);
  }
}