/**
 * Property-Based Tests for Security System
 * 
 * Property 17: End-to-End Security and Access Control
 * Validates: Requirements 12.1, 12.2, 12.3
 */

import fc from 'fast-check';
import { SecurityManager } from '../SecurityManager';
import { 
  SecurityConfig, 
  UserRole, 
  Permission, 
  AccessControlContext,
  User 
} from '../types';

describe('Property 17: End-to-End Security and Access Control', () => {
  let securityManager: SecurityManager;
  const testConfig: SecurityConfig = {
    encryption: {
      algorithm: 'AES-256-GCM',
      keyDerivation: 'PBKDF2',
      iterations: 10000,
      saltLength: 32,
      ivLength: 16
    },
    tls: {
      minVersion: 'TLSv1.3',
      cipherSuites: [
        'TLS_AES_256_GCM_SHA384',
        'TLS_CHACHA20_POLY1305_SHA256'
      ]
    },
    accessControl: {
      sessionTimeout: 3600000,
      maxFailedAttempts: 5,
      lockoutDuration: 900000
    },
    audit: {
      enabled: true,
      retentionDays: 90,
      sensitiveDataMasking: true
    }
  };

  beforeEach(async () => {
    securityManager = new SecurityManager(testConfig);
    await securityManager.initialize();
  });

  /**
   * Property: Data encryption preserves data integrity
   * For any string data, encryption followed by decryption should return the original data
   */
  it('should preserve data integrity through encryption/decryption cycles', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 0, maxLength: 1000 }),
        async (originalData) => {
          const encrypted = await securityManager.encryptData(originalData);
          const decrypted = await securityManager.decryptData(encrypted);
          
          expect(decrypted).toBe(originalData);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Encryption produces different outputs for same input
   * For any string data, multiple encryptions should produce different ciphertext
   */
  it('should produce different encrypted outputs for same input', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (data) => {
          const encrypted1 = await securityManager.encryptData(data);
          const encrypted2 = await securityManager.encryptData(data);
          
          // Different IV and salt should make outputs different
          expect(encrypted1.data).not.toBe(encrypted2.data);
          expect(encrypted1.iv).not.toBe(encrypted2.iv);
          expect(encrypted1.salt).not.toBe(encrypted2.salt);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Role-based permissions are consistent
   * For any user role, the permissions should be consistent and include expected permissions
   */
  it('should maintain consistent role-based permissions', async () => {
    const roleArbitrary = fc.constantFrom(
      UserRole.ADMIN,
      UserRole.BRAND_MANAGER,
      UserRole.SOCIAL_MEDIA_MANAGER,
      UserRole.CONTENT_CREATOR,
      UserRole.ANALYST,
      UserRole.VIEWER
    );

    await fc.assert(
      fc.asyncProperty(
        roleArbitrary,
        async (role) => {
          const user = await securityManager.createUser({
            email: `test-${Date.now()}@example.com`,
            role,
            isActive: true
          });

          const permissions = await securityManager.getUserPermissions(user.id);
          
          // All users should have read access to social events
          expect(permissions).toContain(Permission.READ_SOCIAL_EVENTS);
          
          // Admin should have all permissions
          if (role === UserRole.ADMIN) {
            expect(permissions).toContain(Permission.MANAGE_USERS);
            expect(permissions).toContain(Permission.MANAGE_SECURITY);
            expect(permissions).toContain(Permission.VIEW_AUDIT_LOGS);
          }
          
          // Viewers should have minimal permissions
          if (role === UserRole.VIEWER) {
            expect(permissions).not.toContain(Permission.CREATE_CONTENT);
            expect(permissions).not.toContain(Permission.MANAGE_USERS);
          }
          
          // Content creators should be able to create content
          if (role === UserRole.CONTENT_CREATOR) {
            expect(permissions).toContain(Permission.CREATE_CONTENT);
            expect(permissions).toContain(Permission.EDIT_CONTENT);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Access control denies unauthorized actions
   * For any user without specific permissions, access should be denied
   */
  it('should deny unauthorized access consistently', async () => {
    const restrictedPermissions = [
      Permission.MANAGE_USERS,
      Permission.MANAGE_SECURITY,
      Permission.DELETE_SOCIAL_EVENTS,
      Permission.CONFIGURE_AI
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(UserRole.VIEWER, UserRole.CONTENT_CREATOR, UserRole.ANALYST),
        fc.constantFrom(...restrictedPermissions),
        async (role, permission) => {
          const user = await securityManager.createUser({
            email: `test-${Date.now()}@example.com`,
            role,
            isActive: true
          });

          const context: AccessControlContext = {
            user,
            resource: 'test-resource',
            action: permission
          };

          const hasPermission = await securityManager.checkPermission(context);
          
          // These roles should not have restricted permissions by default
          expect(hasPermission).toBe(false);
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Inactive users are denied all access
   * For any inactive user, all permission checks should fail
   */
  it('should deny all access to inactive users', async () => {
    const permissionArbitrary = fc.constantFrom(
      Permission.READ_SOCIAL_EVENTS,
      Permission.CREATE_CONTENT,
      Permission.VIEW_ANALYTICS,
      Permission.MANAGE_USERS
    );

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...Object.values(UserRole)),
        permissionArbitrary,
        async (role, permission) => {
          const user = await securityManager.createUser({
            email: `test-${Date.now()}@example.com`,
            role,
            isActive: true
          });

          // Deactivate the user
          await securityManager.deactivateUser(user.id);
          const inactiveUser = await securityManager.getUser(user.id);

          if (inactiveUser) {
            const context: AccessControlContext = {
              user: inactiveUser,
              resource: 'test-resource',
              action: permission
            };

            const hasPermission = await securityManager.checkPermission(context);
            expect(hasPermission).toBe(false);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Sensitive object fields are properly encrypted
   * For any object with sensitive fields, encryption should protect those fields
   */
  it('should encrypt sensitive object fields while preserving non-sensitive data', async () => {
    const objectArbitrary = fc.record({
      id: fc.string({ minLength: 1, maxLength: 50 }),
      name: fc.string({ minLength: 1, maxLength: 100 }),
      email: fc.emailAddress(),
      password: fc.string({ minLength: 8, maxLength: 50 }),
      apiKey: fc.string({ minLength: 10, maxLength: 100 }),
      publicData: fc.string({ minLength: 1, maxLength: 200 })
    });

    await fc.assert(
      fc.asyncProperty(
        objectArbitrary,
        async (originalObj) => {
          const sensitiveFields: (keyof typeof originalObj)[] = ['password', 'apiKey'];
          
          const encrypted = await securityManager.encryptSensitiveFields(
            originalObj, 
            sensitiveFields
          );
          
          // Non-sensitive fields should remain unchanged
          expect(encrypted.id).toBe(originalObj.id);
          expect(encrypted.name).toBe(originalObj.name);
          expect(encrypted.email).toBe(originalObj.email);
          expect(encrypted.publicData).toBe(originalObj.publicData);
          
          // Sensitive fields should be encrypted (different from original)
          expect(encrypted.password).not.toBe(originalObj.password);
          expect(encrypted.apiKey).not.toBe(originalObj.apiKey);
          expect(typeof encrypted.password).toBe('object');
          expect(typeof encrypted.apiKey).toBe('object');
          
          // Decryption should restore original values
          const decrypted = await securityManager.decryptSensitiveFields(
            encrypted, 
            sensitiveFields
          );
          
          expect(decrypted).toEqual(originalObj);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Permission grants and revocations are properly tracked
   * For any permission grant/revoke operation, the user's permissions should reflect the change
   */
  it('should properly track permission grants and revocations', async () => {
    const grantablePermissions = [
      Permission.PUBLISH_CONTENT,
      Permission.EXPORT_ANALYTICS,
      Permission.APPROVE_AUTOMATED_ACTIONS
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...grantablePermissions),
        async (permission) => {
          const user = await securityManager.createUser({
            email: `test-${Date.now()}@example.com`,
            role: UserRole.CONTENT_CREATOR,
            isActive: true
          });

          // Initially should not have the permission (unless it's a role permission)
          const initialPermissions = await securityManager.getUserPermissions(user.id);
          const initiallyHasPermission = initialPermissions.includes(permission);
          
          // Grant the permission
          await securityManager.grantUserPermission(user.id, permission);
          const permissionsAfterGrant = await securityManager.getUserPermissions(user.id);
          expect(permissionsAfterGrant).toContain(permission);
          
          // Revoke the permission (only if it wasn't a role permission initially)
          if (!initiallyHasPermission) {
            await securityManager.revokeUserPermission(user.id, permission);
            const permissionsAfterRevoke = await securityManager.getUserPermissions(user.id);
            expect(permissionsAfterRevoke).not.toContain(permission);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Audit events are generated for all security operations
   * For any security operation, appropriate audit events should be created
   */
  it('should generate audit events for all security operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...Object.values(UserRole)),
        async (role) => {
          const initialAuditCount = (await securityManager.getAuditEvents()).length;
          
          const user = await securityManager.createUser({
            email: `test-${Date.now()}@example.com`,
            role,
            isActive: true
          });

          // Check that user creation generated audit event
          const auditEventsAfterCreation = await securityManager.getAuditEvents(user.id);
          expect(auditEventsAfterCreation.length).toBeGreaterThan(0);
          
          // Role assignment should generate audit event
          await securityManager.assignUserRole(user.id, UserRole.BRAND_MANAGER);
          const auditEventsAfterRoleChange = await securityManager.getAuditEvents(user.id);
          expect(auditEventsAfterRoleChange.length).toBeGreaterThan(auditEventsAfterCreation.length);
          
          // Permission operations should generate audit events
          await securityManager.grantUserPermission(user.id, Permission.PUBLISH_CONTENT);
          const auditEventsAfterGrant = await securityManager.getAuditEvents(user.id);
          expect(auditEventsAfterGrant.length).toBeGreaterThan(auditEventsAfterRoleChange.length);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: TLS configuration enforces minimum security standards
   * For any TLS configuration, it should enforce TLS 1.3+ and secure cipher suites
   */
  it('should enforce TLS 1.3+ and secure cipher suites', () => {
    const tlsService = securityManager.getTLSService();
    const config = tlsService.getConfig();
    
    expect(config.minVersion).toBe('TLSv1.3');
    expect(config.cipherSuites).toContain('TLS_AES_256_GCM_SHA384');
    expect(config.cipherSuites.length).toBeGreaterThan(0);
    
    // Should be able to create secure server
    const server = securityManager.createSecureServer();
    expect(server).toBeTruthy();
  });

  /**
   * Property: Security health checks provide accurate status
   * For any security manager state, health checks should accurately reflect the system status
   */
  it('should provide accurate security health status', async () => {
    const healthCheck = await securityManager.performSecurityHealthCheck();
    const status = await securityManager.getSecurityStatus();
    
    expect(healthCheck.status).toMatch(/^(healthy|warning|critical)$/);
    expect(Array.isArray(healthCheck.checks)).toBe(true);
    expect(healthCheck.checks.length).toBeGreaterThan(0);
    
    expect(status.initialized).toBe(true);
    expect(status.encryptionEnabled).toBe(true);
    expect(status.tlsEnabled).toBe(true);
    expect(status.accessControlEnabled).toBe(true);
    expect(typeof status.userCount).toBe('number');
    expect(status.userCount).toBeGreaterThan(0); // Should have at least admin user
  });

  /**
   * Property: Encryption keys are unique and properly formatted
   * For any generated encryption key, it should be unique and properly formatted
   */
  it('should generate unique and properly formatted encryption keys', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        async (keyCount) => {
          const keys = [];
          
          for (let i = 0; i < keyCount; i++) {
            const key = await securityManager.generateEncryptionKey();
            keys.push(key);
            
            // Key should be base64 formatted
            expect(key).toMatch(/^[A-Za-z0-9+/]+=*$/);
            
            // Key should be unique
            const duplicates = keys.filter(k => k === key);
            expect(duplicates.length).toBe(1);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});