/**
 * Security Types and Interfaces
 * 
 * Defines types for encryption, access control, and security operations
 * in the Brand-Aware Social Intelligence system.
 */

export interface EncryptionConfig {
  algorithm: 'AES-256-GCM' | 'AES-256-CBC';
  keyDerivation: 'PBKDF2' | 'scrypt';
  iterations?: number;
  saltLength: number;
  ivLength: number;
}

export interface EncryptedData {
  data: string; // Base64 encoded encrypted data
  iv: string; // Base64 encoded initialization vector
  salt: string; // Base64 encoded salt
  tag?: string; // Base64 encoded authentication tag (for GCM)
  algorithm: string;
}

export interface TLSConfig {
  minVersion: 'TLSv1.3';
  cipherSuites: string[];
  certificatePath?: string;
  privateKeyPath?: string;
  caCertPath?: string;
}

export enum UserRole {
  ADMIN = 'admin',
  BRAND_MANAGER = 'brand_manager',
  SOCIAL_MEDIA_MANAGER = 'social_manager',
  CONTENT_CREATOR = 'content_creator',
  ANALYST = 'analyst',
  VIEWER = 'viewer'
}

export enum Permission {
  // Data access permissions
  READ_SOCIAL_EVENTS = 'read:social_events',
  WRITE_SOCIAL_EVENTS = 'write:social_events',
  DELETE_SOCIAL_EVENTS = 'delete:social_events',
  
  // Content permissions
  CREATE_CONTENT = 'create:content',
  EDIT_CONTENT = 'edit:content',
  PUBLISH_CONTENT = 'publish:content',
  DELETE_CONTENT = 'delete:content',
  
  // Analytics permissions
  VIEW_ANALYTICS = 'view:analytics',
  EXPORT_ANALYTICS = 'export:analytics',
  
  // System permissions
  MANAGE_USERS = 'manage:users',
  MANAGE_INTEGRATIONS = 'manage:integrations',
  VIEW_AUDIT_LOGS = 'view:audit_logs',
  MANAGE_SECURITY = 'manage:security',
  
  // AI and automation permissions
  CONFIGURE_AI = 'configure:ai',
  APPROVE_AUTOMATED_ACTIONS = 'approve:automated_actions',
  OVERRIDE_DECISIONS = 'override:decisions'
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
  description: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  createdAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
}

export interface AccessControlContext {
  user: User;
  resource: string;
  action: Permission;
  resourceId?: string;
  metadata?: Record<string, any>;
}

export interface SecurityAuditEvent {
  id: string;
  timestamp: Date;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface EncryptionService {
  encrypt(data: string, key?: string): Promise<EncryptedData>;
  decrypt(encryptedData: EncryptedData, key?: string): Promise<string>;
  generateKey(): Promise<string>;
  deriveKey(password: string, salt: Buffer): Promise<Buffer>;
}

export interface AccessControlService {
  hasPermission(context: AccessControlContext): Promise<boolean>;
  getUserPermissions(userId: string): Promise<Permission[]>;
  assignRole(userId: string, role: UserRole): Promise<void>;
  revokePermission(userId: string, permission: Permission): Promise<void>;
  auditAccess(context: AccessControlContext, success: boolean): Promise<void>;
}

export interface TLSService {
  createSecureServer(config: TLSConfig): any;
  validateCertificate(cert: string): Promise<boolean>;
  renewCertificate(): Promise<void>;
}

export interface SecurityConfig {
  encryption: EncryptionConfig;
  tls: TLSConfig;
  accessControl: {
    sessionTimeout: number; // in milliseconds
    maxFailedAttempts: number;
    lockoutDuration: number; // in milliseconds
  };
  audit: {
    enabled: boolean;
    retentionDays: number;
    sensitiveDataMasking: boolean;
  };
}