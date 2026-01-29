/**
 * Unit tests for Content Management Service
 */

import { ContentManagementService } from '../ContentManagementService';
import { 
  ContentUploadRequest, 
  ContentSearchFilters, 
  ContentStatus,
  ContentMetadata
} from '../types';
import { Platform, ContentType } from '../../types/core';
import { BrandContextService } from '../../brand/BrandContextService';
import { ComplianceValidationService } from '../../brand/ComplianceValidationService';

// Mock dependencies
const mockBrandContextService = {
  getBrandContext: jest.fn()
} as jest.Mocked<BrandContextService>;

const mockComplianceValidationService = {
  validateContent: jest.fn()
} as jest.Mocked<ComplianceValidationService>;

const mockFileStorageService = {
  uploadFile: jest.fn(),
  generateThumbnail: jest.fn(),
  getFileMetadata: jest.fn()
};

const mockMetadataExtractionService = {
  extractMetadata: jest.fn(),
  analyzeContent: jest.fn()
};

const mockPerformanceTrackingService = {
  trackContentPerformance: jest.fn(),
  getContentUsageHistory: jest.fn()
};

describe('ContentManagementService', () => {
  let service: ContentManagementService;
  let mockFile: File;

  beforeEach(() => {
    service = new ContentManagementService(
      mockBrandContextService,
      mockComplianceValidationService,
      mockFileStorageService,
      mockMetadataExtractionService,
      mockPerformanceTrackingService
    );

    // Create mock file
    mockFile = new File(['test content'], 'test-image.jpg', {
      type: 'image/jpeg'
    });

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('uploadContent', () => {
    it('should upload and process content files successfully', async () => {
      // Setup mocks
      mockFileStorageService.uploadFile.mockResolvedValue('https://storage.example.com/test-image.jpg');
      mockFileStorageService.getFileMetadata.mockResolvedValue({
        size: 1024000,
        mimeType: 'image/jpeg',
        dimensions: { width: 1080, height: 1080 }
      });
      mockFileStorageService.generateThumbnail.mockResolvedValue('https://storage.example.com/thumb-test-image.jpg');
      
      mockMetadataExtractionService.extractMetadata.mockResolvedValue({
        title: 'Extracted Title',
        description: 'Extracted description',
        tags: ['auto-tag1', 'auto-tag2'],
        category: 'lifestyle'
      });

      mockBrandContextService.getBrandContext.mockResolvedValue({
        brandId: 'test_brand',
        playbook: {
          complianceRules: {
            forbiddenClaims: ['guaranteed'],
            requiredDisclosures: [],
            regulatoryCompliance: [],
            contentRestrictions: {}
          }
        } as any,
        personas: [],
        assets: []
      });

      mockComplianceValidationService.validateContent.mockResolvedValue({
        hasViolations: false,
        needsReview: false,
        violations: [],
        suggestions: []
      });

      const request: ContentUploadRequest = {
        brandId: 'test_brand',
        files: [mockFile],
        metadata: {
          title: 'Test Content',
          description: 'Test description',
          tags: ['manual-tag'],
          category: 'marketing',
          brand: 'test_brand',
          creator: {
            id: 'user_001',
            name: 'Test User',
            type: 'internal'
          }
        },
        targetPlatforms: [Platform.INSTAGRAM, Platform.FACEBOOK],
        autoTag: true
      };

      // Execute
      const result = await service.uploadContent(request);

      // Verify
      expect(result).toHaveLength(1);
      const uploadedContent = result[0];
      
      expect(uploadedContent.brandId).toBe('test_brand');
      expect(uploadedContent.type).toBe(ContentType.IMAGE);
      expect(uploadedContent.status).toBe(ContentStatus.DRAFT);
      expect(uploadedContent.metadata.title).toBe('Test Content');
      expect(uploadedContent.metadata.tags).toContain('manual-tag');
      expect(uploadedContent.metadata.tags).toContain('auto-tag1');
      expect(uploadedContent.targetPlatforms).toEqual([Platform.INSTAGRAM, Platform.FACEBOOK]);
      expect(uploadedContent.files).toHaveLength(1);
      expect(uploadedContent.files[0].url).toBe('https://storage.example.com/test-image.jpg');
      expect(uploadedContent.files[0].thumbnailUrl).toBe('https://storage.example.com/thumb-test-image.jpg');
      expect(uploadedContent.files[0].dimensions?.aspectRatio).toBe('1:1');

      // Verify service calls
      expect(mockFileStorageService.uploadFile).toHaveBeenCalledWith(
        mockFile,
        expect.stringContaining('brands/test_brand/content/')
      );
      expect(mockMetadataExtractionService.extractMetadata).toHaveBeenCalledWith(mockFile);
      expect(mockComplianceValidationService.validateContent).toHaveBeenCalled();
    });

    it('should handle multiple file uploads', async () => {
      const mockFile2 = new File(['test content 2'], 'test-video.mp4', {
        type: 'video/mp4'
      });

      mockFileStorageService.uploadFile
        .mockResolvedValueOnce('https://storage.example.com/test-image.jpg')
        .mockResolvedValueOnce('https://storage.example.com/test-video.mp4');
      
      mockFileStorageService.getFileMetadata
        .mockResolvedValueOnce({
          size: 1024000,
          mimeType: 'image/jpeg',
          dimensions: { width: 1080, height: 1080 }
        })
        .mockResolvedValueOnce({
          size: 5120000,
          mimeType: 'video/mp4',
          dimensions: { width: 1920, height: 1080 },
          duration: 30
        });

      mockFileStorageService.generateThumbnail
        .mockResolvedValueOnce('https://storage.example.com/thumb-image.jpg')
        .mockResolvedValueOnce('https://storage.example.com/thumb-video.jpg');

      mockMetadataExtractionService.extractMetadata.mockResolvedValue({
        tags: []
      });

      mockBrandContextService.getBrandContext.mockResolvedValue({
        brandId: 'test_brand',
        playbook: { complianceRules: { forbiddenClaims: [] } } as any,
        personas: [],
        assets: []
      });

      mockComplianceValidationService.validateContent.mockResolvedValue({
        hasViolations: false,
        needsReview: false,
        violations: [],
        suggestions: []
      });

      const request: ContentUploadRequest = {
        brandId: 'test_brand',
        files: [mockFile, mockFile2],
        metadata: {},
        targetPlatforms: [Platform.INSTAGRAM],
        autoTag: false
      };

      const result = await service.uploadContent(request);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe(ContentType.IMAGE);
      expect(result[1].type).toBe(ContentType.VIDEO);
      expect(result[1].files[0].duration).toBe(30);
    });

    it('should handle compliance violations', async () => {
      mockFileStorageService.uploadFile.mockResolvedValue('https://storage.example.com/test.jpg');
      mockFileStorageService.getFileMetadata.mockResolvedValue({
        size: 1024000,
        mimeType: 'image/jpeg'
      });
      mockMetadataExtractionService.extractMetadata.mockResolvedValue({ tags: [] });

      mockBrandContextService.getBrandContext.mockResolvedValue({
        brandId: 'test_brand',
        playbook: {
          complianceRules: {
            forbiddenClaims: ['guaranteed'],
            requiredDisclosures: [],
            regulatoryCompliance: [],
            contentRestrictions: {}
          }
        } as any,
        personas: [],
        assets: []
      });

      mockComplianceValidationService.validateContent.mockResolvedValue({
        hasViolations: true,
        needsReview: true,
        violations: ['Contains forbidden claim'],
        suggestions: ['Remove guarantee language']
      });

      const request: ContentUploadRequest = {
        brandId: 'test_brand',
        files: [mockFile],
        metadata: {
          title: 'Guaranteed results!',
          description: 'This will definitely work!'
        },
        targetPlatforms: [Platform.INSTAGRAM],
        autoTag: false
      };

      const result = await service.uploadContent(request);

      expect(result[0].status).toBe(ContentStatus.PENDING_REVIEW);
      expect(result[0].metadata.tags).toContain('compliance-violation');
    });

    it('should handle file upload failures', async () => {
      mockFileStorageService.uploadFile.mockRejectedValue(new Error('Storage service unavailable'));

      const request: ContentUploadRequest = {
        brandId: 'test_brand',
        files: [mockFile],
        metadata: {},
        targetPlatforms: [Platform.INSTAGRAM],
        autoTag: false
      };

      await expect(service.uploadContent(request)).rejects.toThrow('Failed to upload content');
    });
  });

  describe('updateContentMetadata', () => {
    it('should update content metadata successfully', async () => {
      // First upload content
      mockFileStorageService.uploadFile.mockResolvedValue('https://storage.example.com/test.jpg');
      mockFileStorageService.getFileMetadata.mockResolvedValue({
        size: 1024000,
        mimeType: 'image/jpeg'
      });
      mockMetadataExtractionService.extractMetadata.mockResolvedValue({ tags: [] });
      mockBrandContextService.getBrandContext.mockResolvedValue({
        brandId: 'test_brand',
        playbook: { complianceRules: { forbiddenClaims: [] } } as any,
        personas: [],
        assets: []
      });
      mockComplianceValidationService.validateContent.mockResolvedValue({
        hasViolations: false,
        needsReview: false,
        violations: [],
        suggestions: []
      });

      const uploadRequest: ContentUploadRequest = {
        brandId: 'test_brand',
        files: [mockFile],
        metadata: { title: 'Original Title' },
        targetPlatforms: [Platform.INSTAGRAM],
        autoTag: false
      };

      const uploadResult = await service.uploadContent(uploadRequest);
      const contentId = uploadResult[0].id;

      // Update metadata
      const updates: Partial<ContentMetadata> = {
        title: 'Updated Title',
        description: 'Updated description',
        tags: ['new-tag', 'updated-tag']
      };

      const result = await service.updateContentMetadata(contentId, updates);

      expect(result.metadata.title).toBe('Updated Title');
      expect(result.metadata.description).toBe('Updated description');
      expect(result.metadata.tags).toEqual(['new-tag', 'updated-tag']);
      expect(new Date(result.updatedAt).getTime()).toBeGreaterThan(new Date(result.createdAt).getTime());
    });

    it('should handle non-existent content', async () => {
      await expect(service.updateContentMetadata('nonexistent', {})).rejects.toThrow(
        'Content not found: nonexistent'
      );
    });
  });

  describe('updateContentStatus', () => {
    it('should update content status successfully', async () => {
      // Setup and upload content first
      mockFileStorageService.uploadFile.mockResolvedValue('https://storage.example.com/test.jpg');
      mockFileStorageService.getFileMetadata.mockResolvedValue({
        size: 1024000,
        mimeType: 'image/jpeg'
      });
      mockMetadataExtractionService.extractMetadata.mockResolvedValue({ tags: [] });
      mockBrandContextService.getBrandContext.mockResolvedValue({
        brandId: 'test_brand',
        playbook: { complianceRules: { forbiddenClaims: [] } } as any,
        personas: [],
        assets: []
      });
      mockComplianceValidationService.validateContent.mockResolvedValue({
        hasViolations: false,
        needsReview: false,
        violations: [],
        suggestions: []
      });

      const uploadResult = await service.uploadContent({
        brandId: 'test_brand',
        files: [mockFile],
        metadata: {},
        targetPlatforms: [Platform.INSTAGRAM],
        autoTag: false
      });

      const contentId = uploadResult[0].id;

      // Update to published
      const result = await service.updateContentStatus(contentId, ContentStatus.PUBLISHED);

      expect(result.status).toBe(ContentStatus.PUBLISHED);
      expect(result.publishedAt).toBeDefined();
      expect(new Date(result.updatedAt).getTime()).toBeGreaterThan(new Date(result.createdAt).getTime());
    });

    it('should set archived timestamp when archiving', async () => {
      // Setup content first
      mockFileStorageService.uploadFile.mockResolvedValue('https://storage.example.com/test.jpg');
      mockFileStorageService.getFileMetadata.mockResolvedValue({
        size: 1024000,
        mimeType: 'image/jpeg'
      });
      mockMetadataExtractionService.extractMetadata.mockResolvedValue({ tags: [] });
      mockBrandContextService.getBrandContext.mockResolvedValue({
        brandId: 'test_brand',
        playbook: { complianceRules: { forbiddenClaims: [] } } as any,
        personas: [],
        assets: []
      });
      mockComplianceValidationService.validateContent.mockResolvedValue({
        hasViolations: false,
        needsReview: false,
        violations: [],
        suggestions: []
      });

      const uploadResult = await service.uploadContent({
        brandId: 'test_brand',
        files: [mockFile],
        metadata: {},
        targetPlatforms: [Platform.INSTAGRAM],
        autoTag: false
      });

      const contentId = uploadResult[0].id;

      const result = await service.updateContentStatus(contentId, ContentStatus.ARCHIVED);

      expect(result.status).toBe(ContentStatus.ARCHIVED);
      expect(result.archivedAt).toBeDefined();
    });
  });

  describe('searchContent', () => {
    beforeEach(async () => {
      // Setup test data
      mockFileStorageService.uploadFile.mockResolvedValue('https://storage.example.com/test.jpg');
      mockFileStorageService.getFileMetadata.mockResolvedValue({
        size: 1024000,
        mimeType: 'image/jpeg'
      });
      mockMetadataExtractionService.extractMetadata.mockResolvedValue({ tags: [] });
      mockBrandContextService.getBrandContext.mockResolvedValue({
        brandId: 'test_brand',
        playbook: { complianceRules: { forbiddenClaims: [] } } as any,
        personas: [],
        assets: []
      });
      mockComplianceValidationService.validateContent.mockResolvedValue({
        hasViolations: false,
        needsReview: false,
        violations: [],
        suggestions: []
      });

      // Upload test content
      await service.uploadContent({
        brandId: 'test_brand',
        files: [mockFile],
        metadata: {
          title: 'Test Content 1',
          tags: ['tag1', 'tag2']
        },
        targetPlatforms: [Platform.INSTAGRAM],
        autoTag: false
      });

      await service.uploadContent({
        brandId: 'other_brand',
        files: [mockFile],
        metadata: {
          title: 'Test Content 2',
          tags: ['tag2', 'tag3']
        },
        targetPlatforms: [Platform.FACEBOOK],
        autoTag: false
      });
    });

    it('should filter by brand ID', async () => {
      const filters: ContentSearchFilters = {
        brandId: 'test_brand'
      };

      const result = await service.searchContent(filters);

      expect(result).toHaveLength(1);
      expect(result[0].brandId).toBe('test_brand');
    });

    it('should filter by tags', async () => {
      const filters: ContentSearchFilters = {
        tags: ['tag2']
      };

      const result = await service.searchContent(filters);

      expect(result).toHaveLength(2); // Both contents have tag2
    });

    it('should filter by platforms', async () => {
      const filters: ContentSearchFilters = {
        platforms: [Platform.INSTAGRAM]
      };

      const result = await service.searchContent(filters);

      expect(result).toHaveLength(1);
      expect(result[0].targetPlatforms).toContain(Platform.INSTAGRAM);
    });

    it('should filter by status', async () => {
      const filters: ContentSearchFilters = {
        status: ContentStatus.DRAFT
      };

      const result = await service.searchContent(filters);

      expect(result).toHaveLength(2); // Both are in draft status
      expect(result.every(c => c.status === ContentStatus.DRAFT)).toBe(true);
    });
  });

  describe('getContentAnalytics', () => {
    it('should calculate content analytics correctly', async () => {
      // Setup test data with performance metrics
      mockFileStorageService.uploadFile.mockResolvedValue('https://storage.example.com/test.jpg');
      mockFileStorageService.getFileMetadata.mockResolvedValue({
        size: 1024000,
        mimeType: 'image/jpeg'
      });
      mockMetadataExtractionService.extractMetadata.mockResolvedValue({ tags: [] });
      mockBrandContextService.getBrandContext.mockResolvedValue({
        brandId: 'test_brand',
        playbook: { complianceRules: { forbiddenClaims: [] } } as any,
        personas: [],
        assets: []
      });
      mockComplianceValidationService.validateContent.mockResolvedValue({
        hasViolations: false,
        needsReview: false,
        violations: [],
        suggestions: []
      });

      // Upload content with different performance
      const content1 = await service.uploadContent({
        brandId: 'test_brand',
        files: [mockFile],
        metadata: { tags: ['popular', 'trending'] },
        targetPlatforms: [Platform.INSTAGRAM],
        autoTag: false
      });

      const content2 = await service.uploadContent({
        brandId: 'test_brand',
        files: [mockFile],
        metadata: { tags: ['trending', 'viral'] },
        targetPlatforms: [Platform.TIKTOK],
        autoTag: false
      });

      // Simulate performance data
      content1[0].performance.totalViews = 5000;
      content1[0].performance.averageEngagementRate = 0.05;
      content2[0].performance.totalViews = 10000;
      content2[0].performance.averageEngagementRate = 0.08;

      const analytics = await service.getContentAnalytics('test_brand');

      expect(analytics.totalContent).toBe(2);
      expect(analytics.contentByType[ContentType.IMAGE]).toBe(2);
      expect(analytics.contentByStatus[ContentStatus.DRAFT]).toBe(2);
      expect(analytics.averagePerformance.views).toBe(7500); // (5000 + 10000) / 2
      expect(analytics.averagePerformance.engagementRate).toBe(0.065); // (0.05 + 0.08) / 2
      expect(analytics.topPerformingContent).toHaveLength(2);
      expect(analytics.trendingTags.some(tag => tag.tag === 'trending')).toBe(true);
    });
  });

  describe('trackContentUsage', () => {
    it('should track content usage and update performance', async () => {
      // Setup content
      mockFileStorageService.uploadFile.mockResolvedValue('https://storage.example.com/test.jpg');
      mockFileStorageService.getFileMetadata.mockResolvedValue({
        size: 1024000,
        mimeType: 'image/jpeg'
      });
      mockMetadataExtractionService.extractMetadata.mockResolvedValue({ tags: [] });
      mockBrandContextService.getBrandContext.mockResolvedValue({
        brandId: 'test_brand',
        playbook: { complianceRules: { forbiddenClaims: [] } } as any,
        personas: [],
        assets: []
      });
      mockComplianceValidationService.validateContent.mockResolvedValue({
        hasViolations: false,
        needsReview: false,
        violations: [],
        suggestions: []
      });

      const uploadResult = await service.uploadContent({
        brandId: 'test_brand',
        files: [mockFile],
        metadata: {},
        targetPlatforms: [Platform.INSTAGRAM],
        autoTag: false
      });

      const contentId = uploadResult[0].id;

      // Mock performance tracking
      mockPerformanceTrackingService.trackContentPerformance.mockResolvedValue({
        totalViews: 1000,
        totalLikes: 50,
        totalShares: 10,
        totalComments: 5,
        averageEngagementRate: 0.065,
        platformBreakdown: {
          [Platform.INSTAGRAM]: {
            views: 1000,
            likes: 50,
            shares: 10,
            comments: 5,
            engagementRate: 0.065
          }
        },
        lastUpdated: new Date().toISOString()
      });

      await service.trackContentUsage(contentId, Platform.INSTAGRAM, 'campaign_001');

      const content = await service.getContent(contentId);
      
      expect(content?.performance.totalViews).toBe(1000);
      expect(content?.performance.averageEngagementRate).toBe(0.065);
      expect(content?.usageHistory).toHaveLength(1);
      expect(content?.usageHistory[0].platform).toBe(Platform.INSTAGRAM);
      expect(content?.usageHistory[0].campaignId).toBe('campaign_001');
    });
  });
});