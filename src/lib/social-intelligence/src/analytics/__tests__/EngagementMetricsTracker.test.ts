/**
 * Unit tests for EngagementMetricsTracker
 */

import { EngagementMetricsTracker, PlatformMetricsAPI, ContentRepository, BenchmarkService } from '../EngagementMetricsTracker';
import { BrandContextService } from '../../brand/BrandContextService';
import { Platform, ContentType, BrandPlaybook, Persona } from '../../types/core';
import { EngagementMetrics, ContentPerformance, TopPerformingContent } from '../types';

// Mock implementations
const createMockBrandContextService = () => ({
  getBrandContext: jest.fn().mockResolvedValue({
    brandId: 'test_brand',
    playbook: createMockBrandPlaybook(),
    personas: [createMockPersona()],
    assets: []
  })
});

const createMockPlatformMetricsAPI = (): PlatformMetricsAPI => ({
  getContentMetrics: jest.fn().mockResolvedValue(createMockEngagementMetrics()),
  getContentDetails: jest.fn().mockResolvedValue({
    title: 'Test Content',
    publishedAt: new Date().toISOString(),
    contentType: ContentType.IMAGE
  }),
  getBulkMetrics: jest.fn().mockResolvedValue(new Map([
    ['content_1', createMockEngagementMetrics()],
    ['content_2', createMockEngagementMetrics()]
  ]))
});

const createMockContentRepository = (): ContentRepository => ({
  getPublishedContent: jest.fn().mockResolvedValue([
    {
      id: 'content_1',
      title: 'Test Content 1',
      platform: Platform.INSTAGRAM,
      contentType: ContentType.IMAGE,
      publishedAt: new Date().toISOString(),
      tags: ['test']
    },
    {
      id: 'content_2',
      title: 'Test Content 2',
      platform: Platform.TIKTOK,
      contentType: ContentType.VIDEO,
      publishedAt: new Date().toISOString(),
      tags: ['test']
    }
  ]),
  updateContentMetrics: jest.fn().mockResolvedValue(undefined),
  getContentMetricsHistory: jest.fn().mockResolvedValue([])
});

const createMockBenchmarkService = (): BenchmarkService => ({
  getIndustryBenchmark: jest.fn().mockResolvedValue({
    averageEngagementRate: 0.035,
    averageReach: 5000,
    sampleSize: 1000
  }),
  getBrandBenchmark: jest.fn().mockResolvedValue({
    averageEngagementRate: 0.04,
    averageReach: 6000,
    sampleSize: 50
  })
});

const createMockEngagementMetrics = (): EngagementMetrics => ({
  likes: 100,
  shares: 20,
  comments: 15,
  views: 2000,
  clicks: 50,
  saves: 25,
  engagementRate: 0.075,
  reach: 2500,
  impressions: 3000
});

const createMockBrandPlaybook = (): BrandPlaybook => ({
  id: 'brand_001',
  brandId: 'test_brand',
  version: '1.0',
  lastUpdated: new Date().toISOString(),
  brandIdentity: {
    name: 'Test Brand',
    tagline: 'Test Tagline',
    mission: 'Test Mission',
    values: ['innovation', 'quality'],
    personality: ['friendly', 'professional']
  },
  voiceAndTone: {
    primaryTone: 'friendly_professional',
    attributes: {
      formality: 'casual_professional',
      enthusiasm: 'moderate',
      empathy: 'high',
      authority: 'confident_humble'
    },
    doUse: ['We\'re excited to help'],
    dontUse: ['That\'s not our problem']
  },
  complianceRules: {
    forbiddenClaims: ['guaranteed'],
    requiredDisclosures: [],
    regulatoryCompliance: ['FDA'],
    contentRestrictions: {}
  },
  visualGuidelines: {
    logoUsage: {
      primaryLogo: 'https://example.com/logo.svg',
      variations: ['dark', 'light'],
      minSize: '24px',
      clearSpace: '2x'
    },
    colorPalette: {
      primary: '#FF6B35',
      secondary: '#004E89',
      accent: '#FFD23F',
      neutral: ['#FFFFFF']
    },
    typography: {
      primary: 'Inter',
      secondary: 'Roboto',
      headingStyle: 'bold',
      bodyStyle: 'regular'
    }
  },
  platformSpecificRules: {}
});

const createMockPersona = (): Persona => ({
  id: 'persona_001',
  name: 'Test Persona',
  brandId: 'test_brand',
  demographics: {
    ageRange: '25-35',
    gender: 'all',
    income: 'middle',
    education: 'college',
    location: ['US'],
    occupation: ['tech']
  },
  psychographics: {
    interests: ['technology'],
    values: ['innovation'],
    lifestyle: ['digital-first'],
    painPoints: ['complexity']
  },
  behaviorPatterns: {
    purchaseDrivers: ['features'],
    decisionMakingStyle: 'research-driven',
    brandLoyalty: 'moderate',
    pricesensitivity: 'moderate',
    communicationPreference: 'direct'
  },
  platformPreferences: {
    primary: [Platform.INSTAGRAM],
    secondary: [Platform.TIKTOK],
    contentTypes: ['video'],
    engagementStyle: 'active',
    activeHours: ['9-11']
  },
  triggers: {
    positive: ['innovation'],
    negative: ['complexity']
  },
  responseStrategies: {
    contentTone: 'informative',
    messageLength: 'medium',
    includeData: true,
    visualStyle: 'clean',
    callToAction: 'learn_more'
  }
});

describe('EngagementMetricsTracker', () => {
  let tracker: EngagementMetricsTracker;
  let mockBrandContextService: ReturnType<typeof createMockBrandContextService>;
  let mockPlatformMetricsAPI: PlatformMetricsAPI;
  let mockContentRepository: ContentRepository;
  let mockBenchmarkService: BenchmarkService;

  beforeEach(() => {
    mockBrandContextService = createMockBrandContextService();
    mockPlatformMetricsAPI = createMockPlatformMetricsAPI();
    mockContentRepository = createMockContentRepository();
    mockBenchmarkService = createMockBenchmarkService();

    tracker = new EngagementMetricsTracker(
      mockBrandContextService as any,
      mockPlatformMetricsAPI,
      mockContentRepository,
      mockBenchmarkService
    );
  });

  describe('trackAllContentMetrics', () => {
    it('should track metrics for all published content', async () => {
      const result = await tracker.trackAllContentMetrics('test_brand');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        brandId: 'test_brand',
        platform: Platform.INSTAGRAM,
        contentType: ContentType.IMAGE
      });
      expect(result[1]).toMatchObject({
        brandId: 'test_brand',
        platform: Platform.TIKTOK,
        contentType: ContentType.VIDEO
      });

      // Verify API calls
      expect(mockBrandContextService.getBrandContext).toHaveBeenCalledWith('test_brand');
      expect(mockContentRepository.getPublishedContent).toHaveBeenCalledWith('test_brand');
      expect(mockPlatformMetricsAPI.getBulkMetrics).toHaveBeenCalledTimes(2); // Once per platform
    });

    it('should handle empty content list', async () => {
      (mockContentRepository.getPublishedContent as jest.Mock).mockResolvedValue([]);

      const result = await tracker.trackAllContentMetrics('test_brand');

      expect(result).toHaveLength(0);
    });

    it('should handle brand context not found', async () => {
      (mockBrandContextService.getBrandContext as jest.Mock).mockResolvedValue(null);

      await expect(tracker.trackAllContentMetrics('invalid_brand'))
        .rejects.toThrow('Brand context not found for brandId: invalid_brand');
    });

    it('should continue processing other platforms if one fails', async () => {
      (mockPlatformMetricsAPI.getBulkMetrics as jest.Mock)
        .mockResolvedValueOnce(new Map([['content_1', createMockEngagementMetrics()]]))
        .mockRejectedValueOnce(new Error('Platform API error'));

      const result = await tracker.trackAllContentMetrics('test_brand');

      expect(result).toHaveLength(1);
      expect(result[0].platform).toBe(Platform.INSTAGRAM);
    });
  });

  describe('getTopPerformingContent', () => {
    it('should return top performing content sorted by performance score', async () => {
      const highPerformanceMetrics = {
        ...createMockEngagementMetrics(),
        engagementRate: 0.15,
        reach: 10000
      };

      (mockPlatformMetricsAPI.getContentMetrics as jest.Mock)
        .mockResolvedValueOnce(createMockEngagementMetrics())
        .mockResolvedValueOnce(highPerformanceMetrics);

      const result = await tracker.getTopPerformingContent('test_brand', undefined, 5);

      expect(result).toHaveLength(2);
      expect(result[0].performanceScore).toBeGreaterThan(result[1].performanceScore);
      expect(result[0].successFactors).toContain('high-engagement-rate');
      expect(result[0].successFactors).toContain('wide-reach');
    });

    it('should apply filters correctly', async () => {
      const filters = {
        brandId: 'test_brand',
        platforms: [Platform.INSTAGRAM],
        timeRange: {
          start: new Date('2024-01-01').toISOString(),
          end: new Date('2024-01-31').toISOString()
        }
      };

      await tracker.getTopPerformingContent('test_brand', filters, 5);

      expect(mockContentRepository.getPublishedContent).toHaveBeenCalledWith('test_brand', filters);
    });

    it('should handle content with missing metrics gracefully', async () => {
      (mockPlatformMetricsAPI.getContentMetrics as jest.Mock)
        .mockResolvedValueOnce(createMockEngagementMetrics())
        .mockRejectedValueOnce(new Error('Metrics not available'));

      const result = await tracker.getTopPerformingContent('test_brand');

      expect(result).toHaveLength(1);
    });

    it('should limit results to specified number', async () => {
      const result = await tracker.getTopPerformingContent('test_brand', undefined, 1);

      expect(result).toHaveLength(1);
    });
  });

  describe('analyzeContentPerformance', () => {
    it('should analyze content performance with benchmarks', async () => {
      const result = await tracker.analyzeContentPerformance('test_brand', 'content_1');

      expect(result).toMatchObject({
        contentId: 'content_1',
        overallScore: expect.any(Number),
        platformScore: expect.any(Number),
        contentTypeScore: expect.any(Number),
        timingScore: expect.any(Number)
      });

      expect(result.benchmarkComparison).toMatchObject({
        brandAverage: 0.04,
        percentileRank: expect.any(Number)
      });

      expect(Array.isArray(result.successFactors)).toBe(true);
      expect(Array.isArray(result.improvementAreas)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should handle content not found', async () => {
      (mockContentRepository.getPublishedContent as jest.Mock).mockResolvedValue([]);

      await expect(tracker.analyzeContentPerformance('test_brand', 'nonexistent_content'))
        .rejects.toThrow('Content not found: nonexistent_content');
    });

    it('should include industry benchmark when available', async () => {
      const result = await tracker.analyzeContentPerformance('test_brand', 'content_1');

      expect(result.benchmarkComparison.industryAverage).toBe(0.035);
    });

    it('should handle missing industry benchmark', async () => {
      (mockBenchmarkService.getIndustryBenchmark as jest.Mock).mockResolvedValue(null);

      const result = await tracker.analyzeContentPerformance('test_brand', 'content_1');

      expect(result.benchmarkComparison.industryAverage).toBeUndefined();
    });
  });

  describe('getContentMetricsInRange', () => {
    it('should get content metrics for specified time range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await tracker.getContentMetricsInRange('test_brand', startDate, endDate);

      expect(result).toHaveLength(2);
      expect(mockContentRepository.getPublishedContent).toHaveBeenCalledWith('test_brand', {
        brandId: 'test_brand',
        timeRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      });
    });

    it('should filter by platforms when specified', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const platforms = [Platform.INSTAGRAM, Platform.TIKTOK];

      await tracker.getContentMetricsInRange('test_brand', startDate, endDate, platforms);

      expect(mockContentRepository.getPublishedContent).toHaveBeenCalledWith('test_brand', {
        brandId: 'test_brand',
        timeRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        platforms
      });
    });

    it('should handle metrics API failures gracefully', async () => {
      (mockPlatformMetricsAPI.getContentMetrics as jest.Mock)
        .mockResolvedValueOnce(createMockEngagementMetrics())
        .mockRejectedValueOnce(new Error('API error'));

      const result = await tracker.getContentMetricsInRange(
        'test_brand',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(result).toHaveLength(1);
    });
  });

  describe('performance score calculation', () => {
    it('should calculate higher scores for better metrics', async () => {
      const lowPerformanceMetrics = {
        ...createMockEngagementMetrics(),
        engagementRate: 0.01,
        reach: 100
      };

      const highPerformanceMetrics = {
        ...createMockEngagementMetrics(),
        engagementRate: 0.1,
        reach: 50000
      };

      (mockPlatformMetricsAPI.getContentMetrics as jest.Mock)
        .mockResolvedValueOnce(lowPerformanceMetrics)
        .mockResolvedValueOnce(highPerformanceMetrics);

      const result = await tracker.getTopPerformingContent('test_brand');

      expect(result[0].performanceScore).toBeGreaterThan(result[1].performanceScore);
    });

    it('should identify success factors correctly', async () => {
      const excellentMetrics = {
        likes: 1000,
        shares: 200, // High share rate (20% of likes)
        comments: 100, // High comment rate (10% of likes)
        views: 50000,
        clicks: 500,
        saves: 50, // High save rate (5% of likes)
        engagementRate: 0.08, // High engagement rate
        reach: 15000, // Wide reach
        impressions: 20000
      };

      (mockPlatformMetricsAPI.getContentMetrics as jest.Mock).mockResolvedValue(excellentMetrics);

      const result = await tracker.getTopPerformingContent('test_brand');

      expect(result[0].successFactors).toContain('high-engagement-rate');
      expect(result[0].successFactors).toContain('wide-reach');
      expect(result[0].successFactors).toContain('highly-shareable');
      expect(result[0].successFactors).toContain('conversation-starter');
      expect(result[0].successFactors).toContain('valuable-content');
    });
  });

  describe('error handling', () => {
    it('should handle platform API errors gracefully', async () => {
      (mockPlatformMetricsAPI.getBulkMetrics as jest.Mock).mockRejectedValue(new Error('API error'));

      const result = await tracker.trackAllContentMetrics('test_brand');

      expect(result).toHaveLength(0);
    });

    it('should handle content repository errors', async () => {
      (mockContentRepository.getPublishedContent as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(tracker.trackAllContentMetrics('test_brand'))
        .rejects.toThrow('Failed to track content metrics');
    });

    it('should handle benchmark service errors', async () => {
      (mockBenchmarkService.getBrandBenchmark as jest.Mock).mockRejectedValue(new Error('Benchmark error'));

      await expect(tracker.analyzeContentPerformance('test_brand', 'content_1'))
        .rejects.toThrow('Failed to analyze content performance');
    });
  });
});