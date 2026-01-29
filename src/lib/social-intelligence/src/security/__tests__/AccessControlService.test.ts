/**
 * Unit Tests for RBAC Access Control Service
 */

import { RBACService } from '../AccessControlService';
import { UserRole, Permission, AccessControlContext, User } from '../types';

describe('RBACService', () => {
  let rbacService: RBACService;

  beforeEach(() => {
    rbacService = new RBACService();
  });

  describe('user management', () => {
    it('should create user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        role: UserRole.CONTENT_CREATOR,
        isActive: true
      };

      const user = await rbacService.createUser(userData);

      expect(user.id).toBeTruthy();
      expect(user.email).toBe(userData.email);
      expect(user.role).toBe(userData.role);
      expect(user.isActive).toBe(true);
      expect(user.permissions).toEqual([]);
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should get user by ID', async () => {
      const userData = {
        email: 'test@example.com',
        role: UserRole.ANALYST,
        isActive: true
      };

      const createdUser = await rbacService.createUser(userData);
      const retrievedUser = await rbacService.getUser(createdUser.id);

      expect(retrievedUser).toEqual(createdUser);
    });

    it('should return null for non-existent user', async () => {
      const user = await rbacService.getUser('non-existent-id');
      expect(user).toBeNull();
    });

    it('should deactivate user', async () => {
      const user = await rbacService.createUser({
        email: 'test@example.com',
        role: UserRole.VIEWER,
        isActive: true
      });

      await rbacService.deactivateUser(user.id);
      const deactivatedUser = await rbacService.getUser(user.id);

      expect(deactivatedUser?.isActive).toBe(false);
    });

    it('should get all users', async () => {
      await rbacService.createUser({
        email: 'user1@example.com',
        role: UserRole.ADMIN,
        isActive: true
      });

      await rbacService.createUser({
        email: 'user2@example.com',
        role: UserRole.BRAND_MANAGER,
        isActive: true
      });

      const users = await rbacService.getAllUsers();
      expect(users.length).toBe(2);
    });
  });

  describe('role management', () => {
    it('should assign role to user', async () => {
      const user = await rbacService.createUser({
        email: 'test@example.com',
        role: UserRole.VIEWER,
        isActive: true
      });

      await rbacService.assignRole(user.id, UserRole.BRAND_MANAGER);
      const updatedUser = await rbacService.getUser(user.id);

      expect(updatedUser?.role).toBe(UserRole.BRAND_MANAGER);
    });

    it('should throw error when assigning role to non-existent user', async () => {
      await expect(
        rbacService.assignRole('non-existent-id', UserRole.ADMIN)
      ).rejects.toThrow('User non-existent-id not found');
    });

    it('should get role permissions', () => {
      const adminPermissions = rbacService.getRolePermissions(UserRole.ADMIN);
      const viewerPermissions = rbacService.getRolePermissions(UserRole.VIEWER);

      expect(adminPermissions).toContain(Permission.MANAGE_USERS);
      expect(adminPermissions).toContain(Permission.MANAGE_SECURITY);
      expect(viewerPermissions).not.toContain(Permission.MANAGE_USERS);
      expect(viewerPermissions).toContain(Permission.READ_SOCIAL_EVENTS);
    });
  });

  describe('permission management', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await rbacService.createUser({
        email: 'test@example.com',
        role: UserRole.CONTENT_CREATOR,
        isActive: true
      });
    });

    it('should grant permission to user', async () => {
      await rbacService.grantPermission(testUser.id, Permission.PUBLISH_CONTENT);
      const permissions = await rbacService.getUserPermissions(testUser.id);

      expect(permissions).toContain(Permission.PUBLISH_CONTENT);
    });

    it('should revoke permission from user', async () => {
      await rbacService.grantPermission(testUser.id, Permission.PUBLISH_CONTENT);
      await rbacService.revokePermission(testUser.id, Permission.PUBLISH_CONTENT);
      
      const user = await rbacService.getUser(testUser.id);
      expect(user?.permissions).not.toContain(Permission.PUBLISH_CONTENT);
    });

    it('should get user permissions including role permissions', async () => {
      const permissions = await rbacService.getUserPermissions(testUser.id);
      const rolePermissions = rbacService.getRolePermissions(UserRole.CONTENT_CREATOR);

      expect(permissions).toEqual(expect.arrayContaining(rolePermissions));
    });

    it('should combine role and user-specific permissions', async () => {
      await rbacService.grantPermission(testUser.id, Permission.MANAGE_USERS);
      const permissions = await rbacService.getUserPermissions(testUser.id);

      expect(permissions).toContain(Permission.CREATE_CONTENT); // From role
      expect(permissions).toContain(Permission.MANAGE_USERS); // User-specific
    });

    it('should return empty permissions for inactive user', async () => {
      await rbacService.deactivateUser(testUser.id);
      const permissions = await rbacService.getUserPermissions(testUser.id);

      expect(permissions).toEqual([]);
    });
  });

  describe('permission checking', () => {
    let adminUser: User;
    let contentCreator: User;
    let inactiveUser: User;

    beforeEach(async () => {
      adminUser = await rbacService.createUser({
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        isActive: true
      });

      contentCreator = await rbacService.createUser({
        email: 'creator@example.com',
        role: UserRole.CONTENT_CREATOR,
        isActive: true
      });

      inactiveUser = await rbacService.createUser({
        email: 'inactive@example.com',
        role: UserRole.ADMIN,
        isActive: false
      });
    });

    it('should allow admin to manage users', async () => {
      const context: AccessControlContext = {
        user: adminUser,
        resource: 'users',
        action: Permission.MANAGE_USERS
      };

      const hasPermission = await rbacService.hasPermission(context);
      expect(hasPermission).toBe(true);
    });

    it('should deny content creator from managing users', async () => {
      const context: AccessControlContext = {
        user: contentCreator,
        resource: 'users',
        action: Permission.MANAGE_USERS
      };

      const hasPermission = await rbacService.hasPermission(context);
      expect(hasPermission).toBe(false);
    });

    it('should allow content creator to create content', async () => {
      const context: AccessControlContext = {
        user: contentCreator,
        resource: 'content',
        action: Permission.CREATE_CONTENT
      };

      const hasPermission = await rbacService.hasPermission(context);
      expect(hasPermission).toBe(true);
    });

    it('should deny inactive user access', async () => {
      const context: AccessControlContext = {
        user: inactiveUser,
        resource: 'users',
        action: Permission.MANAGE_USERS
      };

      const hasPermission = await rbacService.hasPermission(context);
      expect(hasPermission).toBe(false);
    });

    it('should allow user-specific permissions', async () => {
      await rbacService.grantPermission(contentCreator.id, Permission.MANAGE_USERS);
      
      const context: AccessControlContext = {
        user: contentCreator,
        resource: 'users',
        action: Permission.MANAGE_USERS
      };

      const hasPermission = await rbacService.hasPermission(context);
      expect(hasPermission).toBe(true);
    });

    it('should check resource access', async () => {
      const canAccess = await rbacService.canAccessResource(
        adminUser.id,
        'social_events',
        Permission.READ_SOCIAL_EVENTS,
        'event-123'
      );

      expect(canAccess).toBe(true);
    });

    it('should deny access for non-existent user', async () => {
      const canAccess = await rbacService.canAccessResource(
        'non-existent-id',
        'social_events',
        Permission.READ_SOCIAL_EVENTS
      );

      expect(canAccess).toBe(false);
    });
  });

  describe('audit logging', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await rbacService.createUser({
        email: 'test@example.com',
        role: UserRole.CONTENT_CREATOR,
        isActive: true
      });
    });

    it('should audit successful access', async () => {
      const context: AccessControlContext = {
        user: testUser,
        resource: 'content',
        action: Permission.CREATE_CONTENT
      };

      await rbacService.hasPermission(context);
      const auditEvents = await rbacService.getAuditEvents(testUser.id);

      expect(auditEvents.length).toBeGreaterThan(0);
      const accessEvent = auditEvents.find(e => e.action === `access_${Permission.CREATE_CONTENT}`);
      expect(accessEvent?.success).toBe(true);
    });

    it('should audit failed access', async () => {
      const context: AccessControlContext = {
        user: testUser,
        resource: 'users',
        action: Permission.MANAGE_USERS
      };

      await rbacService.hasPermission(context);
      const auditEvents = await rbacService.getAuditEvents(testUser.id);

      const accessEvent = auditEvents.find(e => e.action === `access_${Permission.MANAGE_USERS}`);
      expect(accessEvent?.success).toBe(false);
    });

    it('should filter audit events by date range', async () => {
      const startDate = new Date();
      
      const context: AccessControlContext = {
        user: testUser,
        resource: 'content',
        action: Permission.CREATE_CONTENT
      };

      await rbacService.hasPermission(context);
      
      const endDate = new Date();
      const auditEvents = await rbacService.getAuditEvents(testUser.id, startDate, endDate);

      expect(auditEvents.length).toBeGreaterThan(0);
      auditEvents.forEach(event => {
        expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(event.timestamp.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should audit role assignments', async () => {
      await rbacService.assignRole(testUser.id, UserRole.BRAND_MANAGER);
      const auditEvents = await rbacService.getAuditEvents(testUser.id);

      const roleEvent = auditEvents.find(e => e.action === 'role_assignment');
      expect(roleEvent).toBeTruthy();
      expect(roleEvent?.details?.newRole).toBe(UserRole.BRAND_MANAGER);
    });

    it('should audit permission grants and revocations', async () => {
      await rbacService.grantPermission(testUser.id, Permission.PUBLISH_CONTENT);
      await rbacService.revokePermission(testUser.id, Permission.PUBLISH_CONTENT);
      
      const auditEvents = await rbacService.getAuditEvents(testUser.id);

      const grantEvent = auditEvents.find(e => e.action === 'permission_grant');
      const revokeEvent = auditEvents.find(e => e.action === 'permission_revocation');

      expect(grantEvent).toBeTruthy();
      expect(revokeEvent).toBeTruthy();
      expect(grantEvent?.details?.grantedPermission).toBe(Permission.PUBLISH_CONTENT);
      expect(revokeEvent?.details?.revokedPermission).toBe(Permission.PUBLISH_CONTENT);
    });
  });

  describe('role-based permissions', () => {
    it('should have correct admin permissions', () => {
      const permissions = rbacService.getRolePermissions(UserRole.ADMIN);
      
      expect(permissions).toContain(Permission.MANAGE_USERS);
      expect(permissions).toContain(Permission.MANAGE_SECURITY);
      expect(permissions).toContain(Permission.VIEW_AUDIT_LOGS);
      expect(permissions).toContain(Permission.CONFIGURE_AI);
      expect(permissions).toContain(Permission.OVERRIDE_DECISIONS);
    });

    it('should have correct brand manager permissions', () => {
      const permissions = rbacService.getRolePermissions(UserRole.BRAND_MANAGER);
      
      expect(permissions).toContain(Permission.APPROVE_AUTOMATED_ACTIONS);
      expect(permissions).toContain(Permission.CONFIGURE_AI);
      expect(permissions).toContain(Permission.PUBLISH_CONTENT);
      expect(permissions).not.toContain(Permission.MANAGE_USERS);
      expect(permissions).not.toContain(Permission.MANAGE_SECURITY);
    });

    it('should have correct viewer permissions', () => {
      const permissions = rbacService.getRolePermissions(UserRole.VIEWER);
      
      expect(permissions).toContain(Permission.READ_SOCIAL_EVENTS);
      expect(permissions).toContain(Permission.VIEW_ANALYTICS);
      expect(permissions).not.toContain(Permission.CREATE_CONTENT);
      expect(permissions).not.toContain(Permission.MANAGE_USERS);
    });
  });
});