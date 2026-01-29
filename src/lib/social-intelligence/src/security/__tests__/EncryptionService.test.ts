/**
 * Unit Tests for AES Encryption Service
 */

import { AESEncryptionService } from '../EncryptionService';
import { EncryptionConfig } from '../types';

describe('AESEncryptionService', () => {
  let encryptionService: AESEncryptionService;
  const testConfig: EncryptionConfig = {
    algorithm: 'AES-256-GCM',
    keyDerivation: 'PBKDF2',
    iterations: 10000, // Reduced for testing
    saltLength: 32,
    ivLength: 16
  };

  beforeEach(async () => {
    encryptionService = new AESEncryptionService(testConfig);
    await encryptionService.initialize();
  });

  describe('initialization', () => {
    it('should initialize with master key', async () => {
      const masterKey = await encryptionService.generateKey();
      const newService = new AESEncryptionService(testConfig);
      await newService.initialize(masterKey);
      
      expect(newService.getMasterKey()).toBe(masterKey);
    });

    it('should generate master key if none provided', async () => {
      const newService = new AESEncryptionService(testConfig);
      await newService.initialize();
      
      expect(newService.getMasterKey()).toBeTruthy();
    });
  });

  describe('encryption and decryption', () => {
    it('should encrypt and decrypt data successfully', async () => {
      const testData = 'sensitive information';
      
      const encrypted = await encryptionService.encrypt(testData);
      const decrypted = await encryptionService.decrypt(encrypted);
      
      expect(decrypted).toBe(testData);
      expect(encrypted.data).not.toBe(testData);
      expect(encrypted.algorithm).toBe('AES-256-GCM');
    });

    it('should produce different encrypted output for same input', async () => {
      const testData = 'test data';
      
      const encrypted1 = await encryptionService.encrypt(testData);
      const encrypted2 = await encryptionService.encrypt(testData);
      
      expect(encrypted1.data).not.toBe(encrypted2.data);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.salt).not.toBe(encrypted2.salt);
    });

    it('should encrypt with custom key', async () => {
      const testData = 'test data';
      const customKey = await encryptionService.generateKey();
      
      const encrypted = await encryptionService.encrypt(testData, customKey);
      const decrypted = await encryptionService.decrypt(encrypted, customKey);
      
      expect(decrypted).toBe(testData);
    });

    it('should fail to decrypt with wrong key', async () => {
      const testData = 'test data';
      const wrongKey = await encryptionService.generateKey();
      
      const encrypted = await encryptionService.encrypt(testData);
      
      await expect(
        encryptionService.decrypt(encrypted, wrongKey)
      ).rejects.toThrow();
    });

    it('should handle empty string encryption', async () => {
      const testData = '';
      
      const encrypted = await encryptionService.encrypt(testData);
      const decrypted = await encryptionService.decrypt(encrypted);
      
      expect(decrypted).toBe(testData);
    });

    it('should handle large data encryption', async () => {
      const testData = 'x'.repeat(10000);
      
      const encrypted = await encryptionService.encrypt(testData);
      const decrypted = await encryptionService.decrypt(encrypted);
      
      expect(decrypted).toBe(testData);
    });
  });

  describe('key generation and derivation', () => {
    it('should generate unique keys', async () => {
      const key1 = await encryptionService.generateKey();
      const key2 = await encryptionService.generateKey();
      
      expect(key1).not.toBe(key2);
      expect(key1).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 format
    });

    it('should derive consistent keys from same input', async () => {
      const password = 'test-password';
      const salt = Buffer.from('test-salt-32-bytes-long-for-test', 'utf8');
      
      const key1 = await encryptionService.deriveKey(password, salt);
      const key2 = await encryptionService.deriveKey(password, salt);
      
      expect(key1.equals(key2)).toBe(true);
    });

    it('should derive different keys from different inputs', async () => {
      const salt = Buffer.from('test-salt-32-bytes-long-for-test', 'utf8');
      
      const key1 = await encryptionService.deriveKey('password1', salt);
      const key2 = await encryptionService.deriveKey('password2', salt);
      
      expect(key1.equals(key2)).toBe(false);
    });
  });

  describe('object encryption', () => {
    it('should encrypt sensitive fields in object', async () => {
      const testObj = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        password: 'secret123',
        apiKey: 'api-key-123'
      };
      
      const encrypted = await encryptionService.encryptObject(
        testObj, 
        ['password', 'apiKey']
      );
      
      expect(encrypted.id).toBe(testObj.id);
      expect(encrypted.name).toBe(testObj.name);
      expect(encrypted.email).toBe(testObj.email);
      expect(encrypted.password).not.toBe(testObj.password);
      expect(encrypted.apiKey).not.toBe(testObj.apiKey);
      expect(typeof encrypted.password).toBe('object');
      expect(typeof encrypted.apiKey).toBe('object');
    });

    it('should decrypt sensitive fields in object', async () => {
      const testObj = {
        id: '123',
        password: 'secret123',
        apiKey: 'api-key-123'
      };
      
      const encrypted = await encryptionService.encryptObject(
        testObj, 
        ['password', 'apiKey']
      );
      
      const decrypted = await encryptionService.decryptObject(
        encrypted, 
        ['password', 'apiKey']
      );
      
      expect(decrypted.id).toBe(testObj.id);
      expect(decrypted.password).toBe(testObj.password);
      expect(decrypted.apiKey).toBe(testObj.apiKey);
    });

    it('should handle non-existent fields gracefully', async () => {
      const testObj = { id: '123', name: 'John' };
      
      const encrypted = await encryptionService.encryptObject(
        testObj, 
        ['password', 'apiKey'] as any
      );
      
      expect(encrypted.id).toBe(testObj.id);
      expect(encrypted.name).toBe(testObj.name);
      expect((encrypted as any).password).toBeUndefined();
      expect((encrypted as any).apiKey).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should throw error when not initialized', async () => {
      const uninitializedService = new AESEncryptionService(testConfig);
      
      await expect(
        uninitializedService.encrypt('test')
      ).rejects.toThrow('Encryption service not initialized');
    });

    it('should throw error for invalid algorithm', async () => {
      const invalidConfig = { ...testConfig, algorithm: 'INVALID' as any };
      const service = new AESEncryptionService(invalidConfig);
      await service.initialize();
      
      await expect(
        service.encrypt('test')
      ).rejects.toThrow();
    });

    it('should throw error for unsupported key derivation', async () => {
      const invalidConfig = { ...testConfig, keyDerivation: 'INVALID' as any };
      const service = new AESEncryptionService(invalidConfig);
      await service.initialize();
      
      const salt = Buffer.from('test-salt', 'utf8');
      
      await expect(
        service.deriveKey('password', salt)
      ).rejects.toThrow('Unsupported key derivation method');
    });
  });

  describe('configuration', () => {
    it('should use PBKDF2 key derivation', async () => {
      const pbkdf2Config = { ...testConfig, keyDerivation: 'PBKDF2' as const };
      const service = new AESEncryptionService(pbkdf2Config);
      await service.initialize();
      
      const salt = Buffer.from('test-salt-32-bytes-long-for-test', 'utf8');
      const key = await service.deriveKey('password', salt);
      
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32); // 256 bits
    });

    it('should use scrypt key derivation', async () => {
      const scryptConfig = { ...testConfig, keyDerivation: 'scrypt' as const };
      const service = new AESEncryptionService(scryptConfig);
      await service.initialize();
      
      const salt = Buffer.from('test-salt-32-bytes-long-for-test', 'utf8');
      const key = await service.deriveKey('password', salt);
      
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32); // 256 bits
    });
  });
});