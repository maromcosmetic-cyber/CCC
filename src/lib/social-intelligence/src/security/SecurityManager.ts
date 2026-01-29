/**
 * Security Manager
 * 
 * Central security management service that coordinates encryption,
 * access control, and TLS services for the social intelligence system.
 */

import { AESEncryptionService } from './EncryptionService';
import { RBACService } from './AccessControlService';
import { TLS13Service } from './TLSService';
import { 
  SecurityConfig, 
  EncryptionConfig, 
  TLSConfig, 
  User, 
  UserRole, 
  Permission,
  AccessControlContext,
  SecurityAuditEvent
} from './types';

export class SecurityManager {
  private encryptionService: AESEncryptionService;
  private accessControlService: RBACService;
  private tlsService: TLS13Service;
  private config: SecurityConfig;
  private initialized: boolean = false;

  constructor(config: SecurityConfig) {
    this.config = config;
    this.encryptionService = new AESEncryptionService(config.encryption);
    this.accessControlService = new RBACService();
    this.tlsService = new TLS13Service(config.tls);
  }

  /**
   * Initialize security manager
   */
  async initialize(masterKey?: string): Promise<void> {
    try {
      // Initialize encryption service
      await this.encryptionService.initialize(masterKey);
      
      // Create default admin user if none exists
      await this.createDefaultAdminUser();
      
      this.initialized = true;
      console.log('[SECURITY] Security Manager initialized successfully');
    } catch (error) {
      console.error('[SECURITY] Failed to initialize Security Manager:', error);
      throw error;
    }
  }

  /**
   * Create default admin user
   */
  private async createDefaultAdminUser(): Promise<void> {
    const users = await this.accessControlService.getAllUsers();
    const adminExists = users.some(user => user.role === UserRole.ADMIN);
    
    if (!adminExists) {
      await this.accessControlService.createUser({
        email: 'admin@system.local',
        role: UserRole.ADMIN,
        isActive: true
      });
      console.log('[SECURITY] Default admin user created');
    }
  }

  /**
   * Encrypt sensitive data
   */
  async encryptData(data: string, key?: string): Promise<any> {
    this.ensureInitialized();
    return this.encryptionService.encrypt(data, key);
  }

  /**
   * Decrypt sensitive data
   */
  async decryptData(encryptedData: any, key?: string): Promise<string> {
    this.ensureInitialized();
    return this.encryptionService.decrypt(encryptedData, key);
  }

  /**
   * Check user permission
   */
  async checkPermission(context: AccessControlContext): Promise<boolean> {
    this.ensureInitialized();
    return this.accessControlService.hasPermission(context);
  }

  /**
   * Create secure server
   */
  createSecureServer(): any {
    this.ensureInitialized();
    return this.tlsService.createSecureServer();
  }

  /**
   * Create user
   */
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'permissions'>): Promise<User> {
    this.ensureInitialized();
    return this.accessControlService.createUser(userData);
  }

  /**
   * Assign role to user
   */
  async assignUserRole(userId: string, role: UserRole): Promise<void> {
    this.ensureInitialized();
    return this.accessControlService.assignRole(userId, role);
  }

  /**
   * Grant permission to user
   */
  async grantUserPermission(userId: string, permission: Permission): Promise<void> {
    this.ensureInitialized();
    return this.accessControlService.grantPermission(userId, permission);
  }

  /**
   * Revoke permission from user
   */
  async revokeUserPermission(userId: string, permission: Permission): Promise<void> {
    this.ensureInitialized();
    return this.accessControlService.revokePermission(userId, permission);
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    this.ensureInitialized();
    return this.accessControlService.getUserPermissions(userId);
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<User | null> {
    this.ensureInitialized();
    return this.accessControlService.getUser(userId);
  }

  /**
   * Deactivate user
   */
  async deactivateUser(userId: string): Promise<void> {
    this.ensureInitialized();
    return this.accessControlService.deactivateUser(userId);
  }

  /**
   * Get audit events
   */
  async getAuditEvents(
    userId?: string, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<SecurityAuditEvent[]> {
    this.ensureInitialized();
    return this.accessControlService.getAuditEvents(userId, startDate, endDate);
  }

  /**
   * Validate certificate
   */
  async validateCertificate(cert: string): Promise<boolean> {
    this.ensureInitialized();
    return this.tlsService.validateCertificate(cert);
  }

  /**
   * Renew certificate
   */
  async renewCertificate(): Promise<void> {
    this.ensureInitialized();
    return this.tlsService.renewCertificate();
  }

  /**
   * Encrypt object with sensitive fields
   */
  async encryptSensitiveFields<T extends Record<string, any>>(
    obj: T, 
    sensitiveFields: (keyof T)[]
  ): Promise<T> {
    this.ensureInitialized();
    return this.encryptionService.encryptObject(obj, sensitiveFields);
  }

  /**
   * Decrypt object with sensitive fields
   */
  async decryptSensitiveFields<T extends Record<string, any>>(
    obj: T, 
    sensitiveFields: (keyof T)[]
  ): Promise<T> {
    this.ensureInitialized();
    return this.encryptionService.decryptObject(obj, sensitiveFields);
  }

  /**
   * Generate encryption key
   */
  async generateEncryptionKey(): Promise<string> {
    this.ensureInitialized();
    return this.encryptionService.generateKey();
  }

  /**
   * Check if user can access resource
   */
  async canUserAccessResource(
    userId: string, 
    resource: string, 
    action: Permission,
    resourceId?: string
  ): Promise<boolean> {
    this.ensureInitialized();
    return this.accessControlService.canAccessResource(userId, resource, action, resourceId);
  }

  /**
   * Get security configuration
   */
  getSecurityConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Update security configuration
   */
  updateSecurityConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.tls) {
      this.tlsService.updateConfig(newConfig.tls);
    }
  }

  /**
   * Get system security status
   */
  async getSecurityStatus(): Promise<{
    initialized: boolean;
    encryptionEnabled: boolean;
    tlsEnabled: boolean;
    accessControlEnabled: boolean;
    certificateValid: boolean;
    userCount: number;
    auditEventsCount: number;
  }> {
    const users = await this.accessControlService.getAllUsers();
    const auditEvents = await this.accessControlService.getAuditEvents();
    
    return {
      initialized: this.initialized,
      encryptionEnabled: !!this.encryptionService.getMasterKey(),
      tlsEnabled: true,
      accessControlEnabled: true,
      certificateValid: await this.tlsService.validateCertificate(''),
      userCount: users.length,
      auditEventsCount: auditEvents.length
    };
  }

  /**
   * Perform security health check
   */
  async performSecurityHealthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warning';
      message: string;
    }>;
  }> {
    const checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warning';
      message: string;
    }> = [];
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check initialization
    checks.push({
      name: 'Security Manager Initialization',
      status: this.initialized ? 'pass' : 'fail',
      message: this.initialized ? 'Security manager is initialized' : 'Security manager not initialized'
    });

    // Check encryption
    const hasEncryption = !!this.encryptionService.getMasterKey();
    checks.push({
      name: 'Encryption Service',
      status: hasEncryption ? 'pass' : 'fail',
      message: hasEncryption ? 'Encryption service is active' : 'Encryption service not configured'
    });

    // Check certificate expiry
    const needsRenewal = await this.tlsService.checkCertificateExpiry();
    checks.push({
      name: 'TLS Certificate',
      status: needsRenewal ? 'warning' : 'pass',
      message: needsRenewal ? 'Certificate needs renewal' : 'Certificate is valid'
    });

    // Check admin user exists
    const users = await this.accessControlService.getAllUsers();
    const hasAdmin = users.some(user => user.role === UserRole.ADMIN && user.isActive);
    checks.push({
      name: 'Admin User',
      status: hasAdmin ? 'pass' : 'fail',
      message: hasAdmin ? 'Admin user exists' : 'No active admin user found'
    });

    // Determine overall status
    if (checks.some(check => check.status === 'fail')) {
      overallStatus = 'critical';
    } else if (checks.some(check => check.status === 'warning')) {
      overallStatus = 'warning';
    }

    return { status: overallStatus, checks };
  }

  /**
   * Ensure security manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Security Manager not initialized. Call initialize() first.');
    }
  }

  /**
   * Get encryption service (for testing)
   */
  getEncryptionService(): AESEncryptionService {
    return this.encryptionService;
  }

  /**
   * Get access control service (for testing)
   */
  getAccessControlService(): RBACService {
    return this.accessControlService;
  }

  /**
   * Get TLS service (for testing)
   */
  getTLSService(): TLS13Service {
    return this.tlsService;
  }
}