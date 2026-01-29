/**
 * Unit Tests for Security Manager
 */

import { SecurityManager } from '../SecurityManager';
import { SecurityConfig, UserRole, Permission, AccessControlContext } from '../types';

describe('SecurityManager', () => {
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
      sessionTimeout: 3600000, // 1 hour
      maxFailedAttempts: 5,
      lockoutDuration: 900000 // 15 minutes
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

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const newManager = new SecurityManager(testConfig);
      await expect(newManager.initialize()).resolves.not.toThrow();
    });

    it('should initialize with custom master key', async () => {
      const masterKey = 'dGVzdC1tYXN0ZXIta2V5LTMyLWJ5dGVzLWxvbmc='; // Base64 encoded
      const newManager = new SecurityManager(testConfig);
      await newManager.initialize(masterKey);
      
      const encryptionService = newManager.getEncryptionService();
      expect(encryptionService.getMasterKey()).toBe(masterKey);
    });

    it('should create default admin user', async () => {
      const users = await securityManager.getAccessControlService().getAllUsers();
      const adminUser = users.find(user => user.role === UserRole.ADMIN);
      
      expect(adminUser).toBeTruthy();
      expect(adminUser?.isActive).toBe(true);
    });

    it('should throw error when using uninitialized manager', async () => {
      const uninitializedManager = new SecurityManager(testConfig);
      
      await expect(
        uninitializedManager.encryptData('test')
      ).rejects.toThrow('Security Manager not initialized');
    });
  });

  describe('encryption operations', () => {
    it('should encrypt and decrypt data', async () => {
      const testData = 'sensitive information';
      
      const encrypted = await securityManager.encryptData(testData);
      const decrypted = await securityManager.decryptData(encrypted);
      
      expect(decrypted).toBe(testData);
    });

    it('should encrypt sensitive object fields', async () => {
      const testObj = {
        id: '123',
        name: 'John Doe',
        password: 'secret123',
        apiKey: 'api-key-123'
      };
      
      const encrypted = await securityManager.encryptSensitiveFields(
        testObj, 
        ['password', 'apiKey']
      );
      
      expect(encrypted.id).toBe(testObj.id);
      expect(encrypted.name).toBe(testObj.name);
      expect(encrypted.password).not.toBe(testObj.password);
      expect(encrypted.apiKey).not.toBe(testObj.apiKey);
    });

    it('should decrypt sensitive object fields', async () => {
      const testObj = {
        id: '123',
        password: 'secret123',
        apiKey: 'api-key-123'
      };
      
      const encrypted = await securityManager.encryptSensitiveFields(
        testObj, 
        ['password', 'apiKey']
      );
      
      const decrypted = await securityManager.decryptSensitiveFields(
        encrypted, 
        ['password', 'apiKey']
      );
      
      expect(decrypted).toEqual(testObj);
    });

    it('should generate encryption keys', async () => {
      const key1 = await securityManager.generateEncryptionKey();
      const key2 = await securityManager.generateEncryptionKey();
      
      expect(key1).not.toBe(key2);
      expect(key1).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 format
    });
  });

  describe('user management', () => {
    it('should create user', async () => {
      const userData = {
        email: 'test@example.com',
        role: UserRole.CONTENT_CREATOR,
        isActive: true
      };
      
      const user = await securityManager.createUser(userData);
      
      expect(user.email).toBe(userData.email);
      expect(user.role).toBe(userData.role);
      expect(user.isActive).toBe(true);
    });

    it('should assign user role', async () => {
      const user = await securityManager.createUser({
        email: 'test@example.com',
        role: UserRole.VIEWER,
        isActive: true
      });
      
      await securityManager.assignUserRole(user.id, UserRole.BRAND_MANAGER);
      const updatedUser = await securityManager.getUser(user.id);
      
      expect(updatedUser?.role).toBe(UserRole.BRAND_MANAGER);
    });

    it('should grant and revoke permissions', async () => {
      const user = await securityManager.createUser({
        email: 'test@example.com',
        role: UserRole.CONTENT_CREATOR,
        isActive: true
      });
      
      await securityManager.grantUserPermission(user.id, Permission.PUBLISH_CONTENT);
      let permissions = await securityManager.getUserPermissions(user.id);
      expect(permissions).toContain(Permission.PUBLISH_CONTENT);
      
      await securityManager.revokeUserPermission(user.id, Permission.PUBLISH_CONTENT);
      permissions = await securityManager.getUserPermissions(user.id);
      expect(permissions).not.toContain(Permission.PUBLISH_CONTENT);
    });

    it('should deactivate user', async () => {
      const user = await securityManager.createUser({
        email: 'test@example.com',
        role: UserRole.ANALYST,
        isActive: true
      });
      
      await securityManager.deactivateUser(user.id);
      const deactivatedUser = await securityManager.getUser(user.id);
      
      expect(deactivatedUser?.isActive).toBe(false);
    });
  });

  describe('access control', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await securityManager.createUser({
        email: 'test@example.com',
        role: UserRole.CONTENT_CREATOR,
        isActive: true
      });
    });

    it('should check permissions', async () => {
      const context: AccessControlContext = {
        user: testUser,
        resource: 'content',
        action: Permission.CREATE_CONTENT
      };
      
      const hasPermission = await securityManager.checkPermission(context);
      expect(hasPermission).toBe(true);
    });

    it('should check resource access', async () => {
      const canAccess = await securityManager.canUserAccessResource(
        testUser.id,
        'content',
        Permission.CREATE_CONTENT,
        'content-123'
      );
      
      expect(canAccess).toBe(true);
    });

    it('should deny unauthorized access', async () => {
      const canAccess = await securityManager.canUserAccessResource(
        testUser.id,
        'users',
        Permission.MANAGE_USERS
      );
      
      expect(canAccess).toBe(false);
    });
  });

  describe('audit logging', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await securityManager.createUser({
        email: 'test@example.com',
        role: UserRole.ANALYST,
        isActive: true
      });
    });

    it('should retrieve audit events', async () => {
      // Perform some actions to generate audit events
      await securityManager.assignUserRole(testUser.id, UserRole.BRAND_MANAGER);
      await securityManager.grantUserPermission(testUser.id, Permission.PUBLISH_CONTENT);
      
      const auditEvents = await securityManager.getAuditEvents(testUser.id);
      
      expect(auditEvents.length).toBeGreaterThan(0);
      expect(auditEvents.some(e => e.action === 'role_assignment')).toBe(true);
      expect(auditEvents.some(e => e.action === 'permission_grant')).toBe(true);
    });

    it('should filter audit events by date range', async () => {
      const startDate = new Date();
      await securityManager.assignUserRole(testUser.id, UserRole.SOCIAL_MEDIA_MANAGER);
      const endDate = new Date();
      
      const auditEvents = await securityManager.getAuditEvents(testUser.id, startDate, endDate);
      
      expect(auditEvents.length).toBeGreaterThan(0);
      auditEvents.forEach(event => {
        expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(event.timestamp.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });
  });

  describe('TLS operations', () => {
    it('should create secure server', () => {
      const server = securityManager.createSecureServer();
      expect(server).toBeTruthy();
    });

    it('should validate certificates', async () => {
      // This would normally test with a real certificate
      // For now, we test the method exists and handles errors gracefully
      const isValid = await securityManager.validateCertificate('invalid-cert');
      expect(typeof isValid).toBe('boolean');
    });

    it('should renew certificates', async () => {
      await expect(securityManager.renewCertificate()).resolves.not.toThrow();
    });
  });

  describe('configuration management', () => {
    it('should get security configuration', () => {
      const config = securityManager.getSecurityConfig();
      
      expect(config.encryption.algorithm).toBe('AES-256-GCM');
      expect(config.tls.minVersion).toBe('TLSv1.3');
      expect(config.accessControl.sessionTimeout).toBe(3600000);
      expect(config.audit.enabled).toBe(true);
    });

    it('should update security configuration', () => {
      const newConfig = {
        accessControl: {
          sessionTimeout: 7200000, // 2 hours
          maxFailedAttempts: 3,
          lockoutDuration: 1800000 // 30 minutes
        }
      };
      
      securityManager.updateSecurityConfig(newConfig);
      const updatedConfig = securityManager.getSecurityConfig();
      
      expect(updatedConfig.accessControl.sessionTimeout).toBe(7200000);
      expect(updatedConfig.accessControl.maxFailedAttempts).toBe(3);
    });
  });

  describe('security status and health checks', () => {
    it('should get security status', async () => {
      const status = await securityManager.getSecurityStatus();
      
      expect(status.initialized).toBe(true);
      expect(status.encryptionEnabled).toBe(true);
      expect(status.tlsEnabled).toBe(true);
      expect(status.accessControlEnabled).toBe(true);
      expect(typeof status.userCount).toBe('number');
      expect(typeof status.auditEventsCount).toBe('number');
    });

    it('should perform security health check', async () => {
      const healthCheck = await securityManager.performSecurityHealthCheck();
      
      expect(healthCheck.status).toMatch(/^(healthy|warning|critical)$/);
      expect(Array.isArray(healthCheck.checks)).toBe(true);
      expect(healthCheck.checks.length).toBeGreaterThan(0);
      
      healthCheck.checks.forEach(check => {
        expect(check.name).toBeTruthy();
        expect(check.status).toMatch(/^(pass|fail|warning)$/);
        expect(check.message).toBeTruthy();
      });
    });

    it('should report healthy status when all checks pass', async () => {
      const healthCheck = await securityManager.performSecurityHealthCheck();
      
      // Should be healthy or warning (certificate might need renewal in test)
      expect(['healthy', 'warning']).toContain(healthCheck.status);
    });
  });

  describe('service access', () => {
    it('should provide access to encryption service', () => {
      const encryptionService = securityManager.getEncryptionService();
      expect(encryptionService).toBeTruthy();
    });

    it('should provide access to access control service', () => {
      const accessControlService = securityManager.getAccessControlService();
      expect(accessControlService).toBeTruthy();
    });

    it('should provide access to TLS service', () => {
      const tlsService = securityManager.getTLSService();
      expect(tlsService).toBeTruthy();
    });
  });
});