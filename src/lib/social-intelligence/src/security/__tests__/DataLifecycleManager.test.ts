/**
 * Unit Tests for Data Lifecycle Manager
 */

import { DataLifecycleManager, DataRetentionPolicy, DataExportRequest } from '../DataLifecycleManager';
import { DefaultComplianceService, defaultComplianceConfig } from '../ComplianceService';
import { DefaultDataArchiveService, FileSystemArchiveStorage, defaultArchiveConfig } from '../DataArchiveService';

// Mock implementations
const createMockRepository = () => ({
  createRetentionPolicy: jest.fn(),
  updateRetentionPolicy: jest.fn(),
  getRetentionPolicy: jest.fn(),
  getRetentionPolicies: jest.fn(),
  deleteRetentionPolicy: jest.fn(),
  createExportRequest: jest.fn(),
  updateExportRequest: jest.fn(),
  getExportRequest: jest.fn(),
  getExportRequests: jest.fn(),
  createDeletionRecord: jest.fn(),
  getDeletionRecords: jest.fn(),
  getExpiredData: jest.fn(),
  deleteData: jest.fn(),
  archiveData: jest.fn(),
  exportUserData: jest.fn()
});

const createMockArchiveService = () => ({
  archiveData: jest.fn(),
  retrieveArchivedData: jest.fn(),
  deleteArchivedData: jest.fn(),
  listArchives: jest.fn()
});

const createMockComplianceService = () => ({
  validateRetentionPolicy: jest.fn(),
  generateComplianceReport: jest.fn(),
  handleDataSubjectRequest: jest.fn(),
  anonymizeUserData: jest.fn()
});

describe('DataLifecycleManager', () => {
  let manager: DataLifecycleManager;
  let mockRepository: any;
  let mockArchiveService: any;
  let mockComplianceService: any;

  beforeEach(() => {
    mockRepository = createMockRepository();
    mockArchiveService = createMockArchiveService();
    mockComplianceService = createMockComplianceService();
    
    manager = new DataLifecycleManager(
      mockRepository,
      mockArchiveService,
      mockComplianceService
    );
  });

  describe('createRetentionPolicy', () => {
    it('should create a valid retention policy', async () => {
      const policyData = {
        name: 'Test Policy',
        description: 'Test retention policy',
        dataType: 'social_events' as const,
        retentionPeriodDays: 365,
        autoDelete: true,
        archiveBeforeDelete: true,
        archiveLocation: '/archives/social_events',
        complianceRequirements: ['GDPR' as const],
        isActive: true
      };

      const expectedPolicy = {
        ...policyData,
        id: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      };

      mockComplianceService.validateRetentionPolicy.mockResolvedValue({
        valid: true,
        issues: []
      });

      mockRepository.createRetentionPolicy.mockResolvedValue(expectedPolicy);

      const result = await manager.createRetentionPolicy(policyData);

      expect(mockComplianceService.validateRetentionPolicy).toHaveBeenCalledWith(
        expect.objectContaining(policyData)
      );
      expect(mockRepository.createRetentionPolicy).toHaveBeenCalledWith(
        expect.objectContaining(policyData)
      );
      expect(result).toEqual(expectedPolicy);
    });

    it('should reject invalid retention policy', async () => {
      const policyData = {
        name: 'Invalid Policy',
        description: 'Invalid retention policy',
        dataType: 'social_events' as const,
        retentionPeriodDays: 10, // Too short for GDPR
        autoDelete: true,
        archiveBeforeDelete: false,
        complianceRequirements: ['GDPR' as const],
        isActive: true
      };

      mockComplianceService.validateRetentionPolicy.mockResolvedValue({
        valid: false,
        issues: ['GDPR requires minimum 365 days retention for social_events']
      });

      await expect(manager.createRetentionPolicy(policyData)).rejects.toThrow(
        'Invalid retention policy: GDPR requires minimum 365 days retention for social_events'
      );

      expect(mockRepository.createRetentionPolicy).not.toHaveBeenCalled();
    });
  });

  describe('executeRetentionPolicies', () => {
    it('should execute active retention policies', async () => {
      const policies = [
        {
          id: 'policy1',
          name: 'Social Events Policy',
          dataType: 'social_events',
          retentionPeriodDays: 365,
          autoDelete: true,
          archiveBeforeDelete: true,
          archiveLocation: '/archives/social_events',
          isActive: true
        },
        {
          id: 'policy2',
          name: 'Inactive Policy',
          dataType: 'user_data',
          retentionPeriodDays: 730,
          autoDelete: false,
          archiveBeforeDelete: false,
          isActive: false
        }
      ];

      const expiredData = [
        { id: 'event1' },
        { id: 'event2' }
      ];

      mockRepository.getRetentionPolicies.mockResolvedValue(policies);
      mockRepository.getExpiredData.mockResolvedValue(expiredData);
      mockRepository.archiveData.mockResolvedValue(undefined);
      mockRepository.deleteData.mockResolvedValue(undefined);
      mockRepository.createDeletionRecord.mockResolvedValue({});

      const result = await manager.executeRetentionPolicies();

      expect(result.processed).toBe(1); // Only active policy
      expect(result.deleted).toBe(2); // Two expired records
      expect(result.archived).toBe(2); // Two archived records
      expect(result.errors).toHaveLength(0);

      expect(mockRepository.getExpiredData).toHaveBeenCalledWith('social_events', 365);
      expect(mockRepository.archiveData).toHaveBeenCalledWith(
        'social_events',
        ['event1', 'event2'],
        '/archives/social_events'
      );
      expect(mockRepository.deleteData).toHaveBeenCalledWith(
        'social_events',
        ['event1', 'event2']
      );
      expect(mockRepository.createDeletionRecord).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const policies = [
        {
          id: 'policy1',
          name: 'Failing Policy',
          dataType: 'social_events',
          retentionPeriodDays: 365,
          autoDelete: true,
          archiveBeforeDelete: false,
          isActive: true
        }
      ];

      mockRepository.getRetentionPolicies.mockResolvedValue(policies);
      mockRepository.getExpiredData.mockRejectedValue(new Error('Database error'));

      const result = await manager.executeRetentionPolicies();

      expect(result.processed).toBe(1);
      expect(result.deleted).toBe(0);
      expect(result.archived).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to process policy Failing Policy');
    });
  });

  describe('createDataExportRequest', () => {
    it('should create a data export request', async () => {
      const requestData = {
        userId: 'user123',
        requestType: 'full_export' as const,
        format: 'json' as const,
        includeMetadata: true,
        reason: 'GDPR request'
      };

      const expectedRequest = {
        ...requestData,
        id: expect.any(String),
        status: 'pending' as const,
        requestedAt: expect.any(String),
        expiresAt: expect.any(String)
      };

      mockRepository.createExportRequest.mockResolvedValue(expectedRequest);

      const result = await manager.createDataExportRequest(requestData);

      expect(mockRepository.createExportRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          ...requestData,
          status: 'pending'
        })
      );
      expect(result).toEqual(expectedRequest);
    });
  });

  describe('handleDataSubjectRequest', () => {
    it('should handle access request', async () => {
      const exportRequest = {
        id: 'export123',
        userId: 'user123',
        requestType: 'full_export' as const,
        status: 'pending' as const,
        requestedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        format: 'json' as const,
        includeMetadata: true,
        reason: 'GDPR data subject access request',
        complianceType: 'GDPR' as const
      };

      mockRepository.createExportRequest.mockResolvedValue(exportRequest);

      const result = await manager.handleDataSubjectRequest('user123', 'access', 'GDPR');

      expect(result).toBe('export123');
      expect(mockRepository.createExportRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          requestType: 'full_export',
          reason: 'GDPR data subject access request',
          complianceType: 'GDPR'
        })
      );
    });

    it('should handle deletion request', async () => {
      mockRepository.deleteData.mockResolvedValue(undefined);
      mockRepository.createDeletionRecord.mockResolvedValue({});
      mockComplianceService.anonymizeUserData.mockResolvedValue(undefined);

      const result = await manager.handleDataSubjectRequest('user123', 'deletion', 'GDPR');

      expect(result).toContain('User data deletion completed for user123');
      expect(mockComplianceService.anonymizeUserData).toHaveBeenCalledWith('user123');
    });

    it('should reject unsupported request type', async () => {
      await expect(
        manager.handleDataSubjectRequest('user123', 'unsupported' as any, 'GDPR')
      ).rejects.toThrow('Unsupported request type: unsupported');
    });
  });

  describe('cleanupExpiredExports', () => {
    it('should cleanup expired export requests', async () => {
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const requests = [
        {
          id: 'export1',
          status: 'completed' as const,
          expiresAt: expiredDate.toISOString(),
          downloadUrl: 'https://example.com/export1.json'
        },
        {
          id: 'export2',
          status: 'completed' as const,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          downloadUrl: 'https://example.com/export2.json'
        }
      ];

      mockRepository.getExportRequests.mockResolvedValue(requests);
      mockRepository.updateExportRequest.mockResolvedValue({});

      const result = await manager.cleanupExpiredExports();

      expect(result).toBe(1); // Only one expired request
      expect(mockRepository.updateExportRequest).toHaveBeenCalledWith('export1', {
        status: 'expired',
        downloadUrl: undefined
      });
    });
  });
});

describe('DefaultComplianceService', () => {
  let complianceService: DefaultComplianceService;

  beforeEach(() => {
    complianceService = new DefaultComplianceService(defaultComplianceConfig);
  });

  describe('validateRetentionPolicy', () => {
    it('should validate compliant retention policy', async () => {
      const policy: DataRetentionPolicy = {
        id: 'policy1',
        name: 'Test Policy',
        description: 'Test policy',
        dataType: 'social_events',
        retentionPeriodDays: 365,
        autoDelete: true,
        archiveBeforeDelete: true,
        archiveLocation: '/archives',
        complianceRequirements: ['GDPR'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true
      };

      const result = await complianceService.validateRetentionPolicy(policy);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should reject policy with insufficient retention period', async () => {
      const policy: DataRetentionPolicy = {
        id: 'policy1',
        name: 'Test Policy',
        description: 'Test policy',
        dataType: 'audit_logs',
        retentionPeriodDays: 30, // Too short for audit logs
        autoDelete: true,
        archiveBeforeDelete: false,
        complianceRequirements: ['GDPR'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true
      };

      const result = await complianceService.validateRetentionPolicy(policy);

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('generateComplianceReport', () => {
    it('should generate compliance report', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const report = await complianceService.generateComplianceReport(startDate, endDate);

      expect(report.reportId).toBeDefined();
      expect(report.generatedAt).toBeDefined();
      expect(report.periodStart).toBe(startDate.toISOString());
      expect(report.periodEnd).toBe(endDate.toISOString());
      expect(report.dataRetention).toBeDefined();
      expect(report.dataSubjectRequests).toBeDefined();
      expect(report.dataDeletions).toBeDefined();
      expect(report.complianceStatus).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });
});

describe('DefaultDataArchiveService', () => {
  let archiveService: DefaultDataArchiveService;
  let mockStorage: any;

  beforeEach(() => {
    mockStorage = {
      store: jest.fn(),
      retrieve: jest.fn(),
      delete: jest.fn(),
      list: jest.fn(),
      exists: jest.fn()
    };

    archiveService = new DefaultDataArchiveService(mockStorage, defaultArchiveConfig);
  });

  describe('archiveData', () => {
    it('should archive data successfully', async () => {
      const data = [{ id: 'record1' }, { id: 'record2' }];
      const location = '/archives/test';
      const metadata = { dataType: 'social_events' };

      mockStorage.store.mockResolvedValue('archive123');

      const result = await archiveService.archiveData(data, location, metadata);

      expect(result).toBe('archive123');
      expect(mockStorage.store).toHaveBeenCalledWith(
        expect.any(Buffer),
        location,
        expect.objectContaining({
          location,
          dataType: 'social_events',
          recordCount: 2
        })
      );
    });
  });

  describe('retrieveArchivedData', () => {
    it('should retrieve archived data successfully', async () => {
      const archiveId = 'archive123';
      const mockData = Buffer.from(JSON.stringify([{ id: 'record1' }]));
      const mockArchive = {
        id: archiveId,
        location: '/archives/test',
        metadata: {
          id: archiveId,
          location: '/archives/test',
          dataType: 'social_events',
          recordCount: 1,
          originalSize: 100,
          compressedSize: 100,
          compressionRatio: 1,
          checksum: '0', // Mock checksum
          createdAt: new Date().toISOString()
        }
      };

      mockStorage.exists.mockResolvedValue(true);
      mockStorage.retrieve.mockResolvedValue(mockData);
      mockStorage.list.mockResolvedValue([mockArchive]);

      const result = await archiveService.retrieveArchivedData(archiveId);

      expect(result).toEqual([{ id: 'record1' }]);
      expect(mockStorage.exists).toHaveBeenCalledWith(archiveId);
      expect(mockStorage.retrieve).toHaveBeenCalledWith(archiveId);
    });

    it('should throw error for non-existent archive', async () => {
      const archiveId = 'nonexistent';

      mockStorage.exists.mockResolvedValue(false);

      await expect(archiveService.retrieveArchivedData(archiveId)).rejects.toThrow(
        'Archive not found: nonexistent'
      );
    });
  });

  describe('listArchives', () => {
    it('should list archives', async () => {
      const mockArchives = [
        {
          id: 'archive1',
          location: '/archives/test1',
          metadata: {
            id: 'archive1',
            location: '/archives/test1',
            createdAt: '2024-01-01T00:00:00Z',
            compressedSize: 1000
          }
        },
        {
          id: 'archive2',
          location: '/archives/test2',
          metadata: {
            id: 'archive2',
            location: '/archives/test2',
            createdAt: '2024-01-02T00:00:00Z',
            compressedSize: 2000
          }
        }
      ];

      mockStorage.list.mockResolvedValue(mockArchives);

      const result = await archiveService.listArchives();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'archive1',
        location: '/archives/test1',
        createdAt: '2024-01-01T00:00:00Z',
        size: 1000
      });
    });
  });
});