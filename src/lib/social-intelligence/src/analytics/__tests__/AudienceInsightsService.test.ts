/**
 * Unit tests for AudienceInsightsService
 */

import { AudienceInsightsService, AudienceDataProvider, SentimentDataProvider } from '../AudienceInsightsService';
import { BrandContextService } from '../../brand/BrandContextService';
import { Platform, ContentType } from '../../types/core';
import { AudienceInsights, SentimentTrend } from '../types';

// Mock implementations
const createMockBrandContextService = () => ({
  getBrandContext: jest.fn().mockResolvedValue({
    brandId: 'test_brand',
    playbook: {
      brandIdentity: { name: 'Test Brand' }
    },
    personas: [],
    assets: []
  })
});

const createMockAudienceDataProvider = (): AudienceDataProvider => ({
  getAudienceDemographics: jest.fn().mockResolvedValue({
    ageGroups: {
      '18-24': { count: 300, engagementRate: 0.08 },
      '25-34': { count: 500, engagementRate: 0.06 },
      '35-44': { count: 200, engagementRate: 0.04 }
    },
    genderBreakdown: {
      'female': { count: 600, engagementRate: 0.07 },
      'male': { count: 400, engagementRate: 0.05 }
    },
    topLocations: [
      { location: 'United States', count: 400, engagementRate: 0.06 },
      { location: 'Canada', count: 300, engagementRate: 0.07 },
      { location: 'United Kingdom', count: 300, engagementRate: 0.05 }
    ]
  }),
  getBehaviorPatterns: jest.fn().mockResolvedValue({
    peakEngagementHours: [14, 18, 20],
    contentTypePreferences: [
      { type: ContentType.VIDEO, score: 0.8 },
      { type: ContentType.IMAGE, score: 0.6 },
      { type: ContentType.TEXT, score: 0.3 }
    ],
    averageSessionDuration: 180,
    contentConsumptionRate: 2.5
  }),
  getAudienceInterests: jest.fn().mockResolvedValue([
    { topic: 'beauty', relevance: 0.9, engagementLevel: 0.8 },
    { topic: 'skincare', relevance: 0.8, engagementLevel: 0.7 },
    { topic: 'wellness', relevance: 0.6, engagementLevel: 0.6 }
  ])
});

const createMockSentimentDataProvider = (): SentimentDataProvider => ({
  getBrandMentions: jest.fn().mockResolvedValue([
    {
      timestamp: '2024-01-01T10:00:00Z',
      platform: Platform.INSTAGRAM,
      sentimentScore: 0.5,
      topics: ['product', 'quality'],
      mentionCount: 10
    },
    {
      timestamp: '2024-01-02T10:00:00Z',
      platform: Platform.TIKTOK,
      sentimentScore: 0.3,
      topics: ['service', 'support'],
      mentionCount: 8
    },
    {
      timestamp: '2024-01-03T10:00:00Z',
      platform: Platform.INSTAGRAM,
      sentimentScore: 0.7,
      topics: ['product', 'innovation'],
      mentionCount: 15
    }
  ]),
  getSignificantEvents: jest.fn().mockResolvedValue([
    {
      timestamp: '2024-01-02T12:00:00Z',
      event: 'Product Launch',
      impact: 0.4,
      description: 'New product launch generated positive buzz'
    }
  ])
});

describe('AudienceInsightsService', () => {
  let service: AudienceInsightsService;
  let mockBrandContextService: ReturnType<typeof createMockBrandContextService>;
  let mockAudienceDataProvider: AudienceDataProvider;
  let mockSentimentDataProvider: SentimentDataProvider;

  beforeEach(() => {
    mockBrandContextService = createMockBrandContextService();
    mockAudienceDataProvider = createMockAudienceDataProvider();
    mockSentimentDataProvider = createMockSentimentDataProvider();

    service = new AudienceInsightsService(
      mockBrandContextService as any,
      mockAudienceDataProvider,
      mockSentimentDataProvider
    );
  });

  describe('getAudienceInsights', () => {
    it('should return comprehensive audience insights', async () => {
      const result = await service.getAudienceInsights('test_brand');

      expect(result).toMatchObject({
        brandId: 'test_brand',
        timeRange: {
          start: expect.any(String),
          end: expect.any(String)
        },
        demographics: {
          ageGroups: expect.any(Object),
          genderBreakdown: expect.any(Object),
          topLocations: expect.any(Array)
        },
        behaviorPatterns: {
          peakEngagementHours: [14, 18, 20],
          preferredContentTypes: expect.any(Array),
          averageSessionDuration: 180,
          contentConsumptionRate: 2.5
        },
        interests: expect.any(Array)
      });

      // Verify demographics are converted to percentages
      expect(result.demographics.ageGroups['18-24'].percentage).toBe(30); // 300/1000 * 100
      expect(result.demographics.ageGroups['25-34'].percentage).toBe(50); // 500/1000 * 100
      expect(result.demographics.genderBreakdown['female'].percentage).toBe(60); // 600/1000 * 100
    });

    it('should handle platform-specific insights', async () => {
      await service.getAudienceInsights('test_brand', Platform.INSTAGRAM);

      expect(mockAudienceDataProvider.getAudienceDemographics).toHaveBeenCalledWith('test_brand', Platform.INSTAGRAM);
      expect(mockAudienceDataProvider.getBehaviorPatterns).toHaveBeenCalledWith('test_brand', Platform.INSTAGRAM);
      expect(mockAudienceDataProvider.getAudienceInterests).toHaveBeenCalledWith('test_brand', Platform.INSTAGRAM);
    });

    it('should use custom time range when provided', async () => {
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };

      const result = await service.getAudienceInsights('test_brand', undefined, timeRange);

      expect(result.timeRange.start).toBe(timeRange.start.toISOString());
      expect(result.timeRange.end).toBe(timeRange.end.toISOString());
    });

    it('should handle brand context not found', async () => {
      (mockBrandContextService.getBrandContext as jest.Mock).mockResolvedValue(null);

      await expect(service.getAudienceInsights('invalid_brand'))
        .rejects.toThrow('Brand context not found for brandId: invalid_brand');
    });

    it('should handle data provider errors', async () => {
      (mockAudienceDataProvider.getAudienceDemographics as jest.Mock)
        .mockRejectedValue(new Error('Data provider error'));

      await expect(service.getAudienceInsights('test_brand'))
        .rejects.toThrow('Failed to get audience insights');
    });
  });

  describe('getBrandMentionSentimentTrends', () => {
    it('should return sentiment trends with analysis', async () => {
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };

      const result = await service.getBrandMentionSentimentTrends('test_brand', timeRange);

      expect(result).toMatchObject({
        brandId: 'test_brand',
        timeRange: {
          start: timeRange.start.toISOString(),
          end: timeRange.end.toISOString()
        },
        dataPoints: expect.any(Array),
        overallTrend: expect.stringMatching(/^(improving|declining|stable)$/),
        trendStrength: expect.any(Number),
        significantEvents: expect.any(Array)
      });

      expect(result.dataPoints).toHaveLength(3);
      expect(result.dataPoints[0]).toMatchObject({
        timestamp: '2024-01-01T10:00:00Z',
        sentimentScore: 0.5,
        mentionCount: 10,
        platform: Platform.INSTAGRAM,
        topics: ['product', 'quality']
      });
    });

    it('should filter by platforms when specified', async () => {
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };
      const platforms = [Platform.INSTAGRAM, Platform.TIKTOK];

      await service.getBrandMentionSentimentTrends('test_brand', timeRange, platforms);

      expect(mockSentimentDataProvider.getBrandMentions).toHaveBeenCalledWith(
        'test_brand',
        timeRange,
        platforms
      );
    });

    it('should calculate improving trend correctly', async () => {
      // Mock data with improving sentiment over time
      (mockSentimentDataProvider.getBrandMentions as jest.Mock).mockResolvedValue([
        { timestamp: '2024-01-01T10:00:00Z', sentimentScore: 0.2, mentionCount: 10, platform: Platform.INSTAGRAM, topics: [] },
        { timestamp: '2024-01-02T10:00:00Z', sentimentScore: 0.4, mentionCount: 12, platform: Platform.INSTAGRAM, topics: [] },
        { timestamp: '2024-01-03T10:00:00Z', sentimentScore: 0.6, mentionCount: 15, platform: Platform.INSTAGRAM, topics: [] }
      ]);

      const result = await service.getBrandMentionSentimentTrends('test_brand', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-03')
      });

      expect(result.overallTrend).toBe('improving');
      expect(result.trendStrength).toBeGreaterThan(0);
    });

    it('should calculate declining trend correctly', async () => {
      // Mock data with declining sentiment over time
      (mockSentimentDataProvider.getBrandMentions as jest.Mock).mockResolvedValue([
        { timestamp: '2024-01-01T10:00:00Z', sentimentScore: 0.8, mentionCount: 10, platform: Platform.INSTAGRAM, topics: [] },
        { timestamp: '2024-01-02T10:00:00Z', sentimentScore: 0.5, mentionCount: 12, platform: Platform.INSTAGRAM, topics: [] },
        { timestamp: '2024-01-03T10:00:00Z', sentimentScore: 0.2, mentionCount: 15, platform: Platform.INSTAGRAM, topics: [] }
      ]);

      const result = await service.getBrandMentionSentimentTrends('test_brand', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-03')
      });

      expect(result.overallTrend).toBe('declining');
      expect(result.trendStrength).toBeGreaterThan(0);
    });

    it('should handle stable trend', async () => {
      // Mock data with stable sentiment
      (mockSentimentDataProvider.getBrandMentions as jest.Mock).mockResolvedValue([
        { timestamp: '2024-01-01T10:00:00Z', sentimentScore: 0.5, mentionCount: 10, platform: Platform.INSTAGRAM, topics: [] },
        { timestamp: '2024-01-02T10:00:00Z', sentimentScore: 0.51, mentionCount: 12, platform: Platform.INSTAGRAM, topics: [] },
        { timestamp: '2024-01-03T10:00:00Z', sentimentScore: 0.49, mentionCount: 15, platform: Platform.INSTAGRAM, topics: [] }
      ]);

      const result = await service.getBrandMentionSentimentTrends('test_brand', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-03')
      });

      expect(result.overallTrend).toBe('stable');
    });

    it('should handle insufficient data for trend analysis', async () => {
      (mockSentimentDataProvider.getBrandMentions as jest.Mock).mockResolvedValue([
        { timestamp: '2024-01-01T10:00:00Z', sentimentScore: 0.5, mentionCount: 10, platform: Platform.INSTAGRAM, topics: [] }
      ]);

      const result = await service.getBrandMentionSentimentTrends('test_brand', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-01')
      });

      expect(result.overallTrend).toBe('stable');
      expect(result.trendStrength).toBe(0);
    });
  });

  describe('getMultiPlatformAudienceInsights', () => {
    it('should return insights for multiple platforms', async () => {
      const platforms = [Platform.INSTAGRAM, Platform.TIKTOK];

      const result = await service.getMultiPlatformAudienceInsights('test_brand', platforms);

      expect(result.size).toBe(2);
      expect(result.has(Platform.INSTAGRAM)).toBe(true);
      expect(result.has(Platform.TIKTOK)).toBe(true);

      // Verify each platform was called separately
      expect(mockAudienceDataProvider.getAudienceDemographics).toHaveBeenCalledWith('test_brand', Platform.INSTAGRAM);
      expect(mockAudienceDataProvider.getAudienceDemographics).toHaveBeenCalledWith('test_brand', Platform.TIKTOK);
    });

    it('should continue with other platforms if one fails', async () => {
      (mockAudienceDataProvider.getAudienceDemographics as jest.Mock)
        .mockResolvedValueOnce({
          ageGroups: { '18-24': { count: 100, engagementRate: 0.05 } },
          genderBreakdown: { 'female': { count: 60, engagementRate: 0.06 } },
          topLocations: []
        })
        .mockRejectedValueOnce(new Error('Platform error'));

      const platforms = [Platform.INSTAGRAM, Platform.TIKTOK];
      const result = await service.getMultiPlatformAudienceInsights('test_brand', platforms);

      expect(result.size).toBe(1);
      expect(result.has(Platform.INSTAGRAM)).toBe(true);
      expect(result.has(Platform.TIKTOK)).toBe(false);
    });
  });

  describe('compareAudienceInsights', () => {
    it('should compare insights across time periods', async () => {
      const currentPeriod = {
        start: new Date('2024-02-01'),
        end: new Date('2024-02-28')
      };
      const previousPeriod = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };

      // Mock different data for each period
      (mockAudienceDataProvider.getAudienceDemographics as jest.Mock)
        .mockResolvedValueOnce({
          ageGroups: { '18-24': { count: 400, engagementRate: 0.08 } },
          genderBreakdown: { 'female': { count: 600, engagementRate: 0.07 } },
          topLocations: []
        })
        .mockResolvedValueOnce({
          ageGroups: { '18-24': { count: 300, engagementRate: 0.06 } },
          genderBreakdown: { 'female': { count: 500, engagementRate: 0.05 } },
          topLocations: []
        });

      const result = await service.compareAudienceInsights('test_brand', currentPeriod, previousPeriod);

      expect(result).toHaveProperty('current');
      expect(result).toHaveProperty('previous');
      expect(result).toHaveProperty('changes');

      expect(result.changes.demographicShifts).toBeInstanceOf(Array);
      expect(result.changes.behaviorChanges).toBeInstanceOf(Array);
      expect(result.changes.interestShifts).toBeInstanceOf(Array);

      // Verify demographic shifts are calculated
      const ageGroupShift = result.changes.demographicShifts.find(shift => 
        shift.metric === 'age_group_18-24'
      );
      expect(ageGroupShift).toBeDefined();
      expect(ageGroupShift?.change).toBeGreaterThan(0); // Increased from 30% to 40%
    });

    it('should calculate behavior changes correctly', async () => {
      // Mock different behavior patterns for each period
      (mockAudienceDataProvider.getBehaviorPatterns as jest.Mock)
        .mockResolvedValueOnce({
          peakEngagementHours: [14, 18, 20],
          contentTypePreferences: [],
          averageSessionDuration: 200, // Increased
          contentConsumptionRate: 3.0 // Increased
        })
        .mockResolvedValueOnce({
          peakEngagementHours: [14, 18, 20],
          contentTypePreferences: [],
          averageSessionDuration: 150, // Previous value
          contentConsumptionRate: 2.5 // Previous value
        });

      const result = await service.compareAudienceInsights('test_brand', 
        { start: new Date('2024-02-01'), end: new Date('2024-02-28') },
        { start: new Date('2024-01-01'), end: new Date('2024-01-31') }
      );

      const sessionDurationChange = result.changes.behaviorChanges.find(change => 
        change.metric === 'average_session_duration'
      );
      expect(sessionDurationChange?.change).toBe(50); // 200 - 150

      const consumptionRateChange = result.changes.behaviorChanges.find(change => 
        change.metric === 'content_consumption_rate'
      );
      expect(consumptionRateChange?.change).toBe(0.5); // 3.0 - 2.5
    });
  });

  describe('getAudienceSegmentAnalysis', () => {
    it('should generate audience segments based on demographics', async () => {
      const result = await service.getAudienceSegmentAnalysis('test_brand');

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);

      const youngSegment = result.find(segment => segment.segmentName === 'Young Engaged');
      expect(youngSegment).toBeDefined();
      expect(youngSegment?.size).toBe(30); // 30% of audience is 18-24
      expect(youngSegment?.recommendedStrategy).toContain('trendy');

      const professionalSegment = result.find(segment => segment.segmentName === 'Professional');
      expect(professionalSegment).toBeDefined();
      expect(professionalSegment?.size).toBe(70); // 50% + 20% = 70% for 25-44 age groups
      expect(professionalSegment?.recommendedStrategy).toContain('educational');
    });

    it('should handle empty demographics gracefully', async () => {
      (mockAudienceDataProvider.getAudienceDemographics as jest.Mock).mockResolvedValue({
        ageGroups: {},
        genderBreakdown: {},
        topLocations: []
      });

      const result = await service.getAudienceSegmentAnalysis('test_brand');

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle audience data provider errors', async () => {
      (mockAudienceDataProvider.getAudienceDemographics as jest.Mock)
        .mockRejectedValue(new Error('Data provider error'));

      await expect(service.getAudienceInsights('test_brand'))
        .rejects.toThrow('Failed to get audience insights');
    });

    it('should handle sentiment data provider errors', async () => {
      (mockSentimentDataProvider.getBrandMentions as jest.Mock)
        .mockRejectedValue(new Error('Sentiment provider error'));

      await expect(service.getBrandMentionSentimentTrends('test_brand', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      })).rejects.toThrow('Failed to get sentiment trends');
    });

    it('should handle brand context service errors', async () => {
      (mockBrandContextService.getBrandContext as jest.Mock)
        .mockRejectedValue(new Error('Brand context error'));

      await expect(service.getAudienceInsights('test_brand'))
        .rejects.toThrow('Failed to get audience insights');
    });
  });

  describe('data validation', () => {
    it('should validate audience insights schema', async () => {
      const result = await service.getAudienceInsights('test_brand');

      // Should not throw validation errors
      expect(result.brandId).toBe('test_brand');
      expect(typeof result.timeRange.start).toBe('string');
      expect(typeof result.timeRange.end).toBe('string');
      expect(typeof result.demographics).toBe('object');
      expect(typeof result.behaviorPatterns).toBe('object');
      expect(Array.isArray(result.interests)).toBe(true);
    });

    it('should validate sentiment trend schema', async () => {
      const result = await service.getBrandMentionSentimentTrends('test_brand', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      });

      expect(result.brandId).toBe('test_brand');
      expect(Array.isArray(result.dataPoints)).toBe(true);
      expect(['improving', 'declining', 'stable']).toContain(result.overallTrend);
      expect(typeof result.trendStrength).toBe('number');
      expect(result.trendStrength).toBeGreaterThanOrEqual(0);
      expect(result.trendStrength).toBeLessThanOrEqual(1);
    });
  });
});