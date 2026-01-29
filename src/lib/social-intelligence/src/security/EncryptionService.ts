/**
 * AES-256 Encryption Service
 * 
 * Provides AES-256-GCM encryption for sensitive data at rest.
 * Implements secure key derivation and data protection.
 */

import crypto from 'crypto';
import { EncryptionService, EncryptedData, EncryptionConfig } from './types';

export class AESEncryptionService implements EncryptionService {
  private config: EncryptionConfig;
  private masterKey: Buffer | null = null;

  constructor(config: EncryptionConfig) {
    this.config = {
      ...config,
      algorithm: config.algorithm || 'AES-256-GCM',
      keyDerivation: config.keyDerivation || 'PBKDF2',
      iterations: config.iterations || 100000,
      saltLength: config.saltLength || 32,
      ivLength: config.ivLength || 16
    };
  }

  /**
   * Initialize the service with a master key
   */
  async initialize(masterKey?: string): Promise<void> {
    if (masterKey) {
      this.masterKey = Buffer.from(masterKey, 'base64');
    } else {
      // Generate a new master key if none provided
      this.masterKey = crypto.randomBytes(32);
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  async encrypt(data: string, key?: string): Promise<EncryptedData> {
    if (!this.masterKey && !key) {
      throw new Error('Encryption service not initialized and no key provided');
    }

    // Validate algorithm
    if (!this.isValidAlgorithm(this.config.algorithm)) {
      throw new Error(`Unsupported encryption algorithm: ${this.config.algorithm}`);
    }

    const salt = crypto.randomBytes(this.config.saltLength);
    const iv = crypto.randomBytes(this.config.ivLength);
    
    // Use provided key or derive from master key
    const encryptionKey = key 
      ? Buffer.from(key, 'base64')
      : await this.deriveKey('', salt);

    // Use the configured algorithm (default AES-256-GCM)
    const algorithmName = this.getNodeAlgorithmName(this.config.algorithm);
    const cipher = crypto.createCipheriv(algorithmName, encryptionKey, iv);

    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // For GCM mode, get the authentication tag
    let tag: string | undefined;
    if (this.config.algorithm === 'AES-256-GCM') {
      tag = (cipher as any).getAuthTag().toString('base64');
    }

    return {
      data: encrypted,
      iv: iv.toString('base64'),
      salt: salt.toString('base64'),
      algorithm: this.config.algorithm,
      tag
    };
  }

  /**
   * Decrypt data using the configured algorithm
   */
  async decrypt(encryptedData: EncryptedData, key?: string): Promise<string> {
    if (!this.masterKey && !key) {
      throw new Error('Encryption service not initialized and no key provided');
    }

    const salt = Buffer.from(encryptedData.salt, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');

    // Use provided key or derive from master key
    const decryptionKey = key 
      ? Buffer.from(key, 'base64')
      : await this.deriveKey('', salt);

    // Use the algorithm from the encrypted data
    const algorithmName = this.getNodeAlgorithmName(encryptedData.algorithm);
    const decipher = crypto.createDecipheriv(algorithmName, decryptionKey, iv);

    // For GCM mode, set the authentication tag
    if (encryptedData.algorithm === 'AES-256-GCM' && encryptedData.tag) {
      (decipher as any).setAuthTag(Buffer.from(encryptedData.tag, 'base64'));
    }

    let decrypted = decipher.update(encryptedData.data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Generate a new encryption key
   */
  async generateKey(): Promise<string> {
    const key = crypto.randomBytes(32);
    return key.toString('base64');
  }

  /**
   * Derive encryption key from password and salt
   */
  async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }

    // Use master key as password if none provided
    const keyMaterial = password || this.masterKey.toString('base64');

    if (this.config.keyDerivation === 'PBKDF2') {
      return new Promise((resolve, reject) => {
        crypto.pbkdf2(keyMaterial, salt, this.config.iterations!, 32, 'sha256', (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey);
        });
      });
    } else if (this.config.keyDerivation === 'scrypt') {
      return new Promise((resolve, reject) => {
        crypto.scrypt(keyMaterial, salt, 32, (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey);
        });
      });
    } else {
      throw new Error(`Unsupported key derivation method: ${this.config.keyDerivation}`);
    }
  }

  /**
   * Encrypt sensitive fields in an object
   */
  async encryptObject<T extends Record<string, any>>(
    obj: T, 
    sensitiveFields: (keyof T)[]
  ): Promise<T> {
    const result = { ...obj };
    
    for (const field of sensitiveFields) {
      if (result[field] && typeof result[field] === 'string') {
        const encrypted = await this.encrypt(result[field] as string);
        result[field] = encrypted as any;
      }
    }
    
    return result;
  }

  /**
   * Decrypt sensitive fields in an object
   */
  async decryptObject<T extends Record<string, any>>(
    obj: T, 
    sensitiveFields: (keyof T)[]
  ): Promise<T> {
    const result = { ...obj };
    
    for (const field of sensitiveFields) {
      if (result[field] && typeof result[field] === 'object') {
        const decrypted = await this.decrypt(result[field] as EncryptedData);
        result[field] = decrypted as any;
      }
    }
    
    return result;
  }

  /**
   * Get master key for backup/recovery
   */
  getMasterKey(): string | null {
    return this.masterKey ? this.masterKey.toString('base64') : null;
  }

  /**
   * Validate if the algorithm is supported
   */
  private isValidAlgorithm(algorithm: string): boolean {
    const supportedAlgorithms = ['AES-256-GCM', 'AES-256-CBC'];
    return supportedAlgorithms.includes(algorithm);
  }

  /**
   * Convert our algorithm names to Node.js cipher names
   */
  private getNodeAlgorithmName(algorithm: string): string {
    switch (algorithm) {
      case 'AES-256-GCM':
        return 'aes-256-gcm';
      case 'AES-256-CBC':
        return 'aes-256-cbc';
      default:
        throw new Error(`Unsupported algorithm: ${algorithm}`);
    }
  }
}