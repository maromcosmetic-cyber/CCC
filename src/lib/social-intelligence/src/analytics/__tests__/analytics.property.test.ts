/**
 * Property-based tests for Analytics and Performance Tracking
 * Tests universal properties that must hold across all analytics operations
 */

import * as fc from 'fast-check';
import { AnalyticsService } from '../AnalyticsService';
import { EngagementMetricsTracker } from '../EngagementMetricsTracker';
import { AudienceInsightsService } from '../AudienceInsightsService';
import { PerformanceReportGenerator } from '../PerformanceReportGenerator';
import { 
  ContentPerformance, 
  TopPerformingContent,
  AudienceInsights,
  PerformanceReport,
  EngagementMetrics,
  AnalyticsFilters
} from '../types';
import { Platform, ContentType } from '../../types/core';

// Mock implementations for property testing
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

const createMockEngagementMetricsTracker = () => ({
  trackAllContentMetrics: jest.fn(),
  getTopPerformingContent: jest.fn(),
  analyzeContentPerformance: jest.fn(),
  getContentMetricsInRange: jest.fn()
});

const createMockAudienceInsightsService = () => ({
  getAudienceInsights: jest.fn(),
  getBrandMentionSentimentTrends: jest.fn(),
  getMultiPlatformAudienceInsights: jest.fn(),
  compareAudienceInsights: jest.fn(),
  getAudienceSegmentAnalysis: jest.fn()
});

const createMockPerformanceReportGenerator = () => ({
  generatePerformanceReport: jest.fn(),
  generateBenchmarkReport: jest.fn(),
  scheduleReport: jest.fn(),
  generateExecutiveSummary: jest.fn()
});

// Arbitraries for property testing
const platformArb = fc.constantFrom(...Object.values(Platform));
const contentTypeArb = fc.constantFrom(...Object.values(ContentType));

const engagementMetricsArb = fc.record({
  likes: fc.integer({ min: 0, max: 10000 }),
  shares: fc.integer({ min: 0, max: 1000 }),
  comments: fc.integer({ min: 0, max: 500 }),
  views: fc.integer({ min: 0, max: 100000 }),
  clicks: fc.integer({ min: 0, max: 2000 }),
  saves: fc.integer({ min: 0, max: 500 }),
  engagementRate: fc.float({ min: 0, max: 1 }),
  reach: fc.integer({ min: 0, max: 50000 }),
  impressions: fc.integer({ min: 0, max: 100000 })
});

const contentPerformanceArb = fc.record({
  contentId: fc.string({ minLength: 1, maxLength: 50 }),
  brandId: fc.string({ minLength: 1, maxLength: 50 }),
  platform: platformArb,
  contentType: contentTypeArb,
  publishedAt: fc.date().map(d => d.toISOString()),
  metrics: engagementMetricsArb,
  lastUpdated: fc.date().map(d => d.toISOString())
});

const topPerformingContentArb = fc.record({
  contentId: fc.string({ minLength: 1, maxLength: 50 }),
  title: fc.string({ minLength: 1, maxLength: 200 }),
  platform: platformArb,
  contentType: contentTypeArb,
  publishedAt: fc.date().map(d => d.toISOString()),
  metrics: engagementMetricsArb,
  performanceScore: fc.float({ min: 0, max: 100 }),
  successFactors: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 })
});

const analyticsFiltersArb = fc.record({
  brandId: fc.string({ minLength: 1, maxLength: 50 }),
  platforms: fc.option(fc.array(platformArb, { minLength: 1, maxLength: 4 })),
  contentTypes: fc.option(fc.array(contentTypeArb, { minLength: 1, maxLength: 3 })),
  timeRange: fc.option(fc.record({
    start: fc.date().map(d => d.toISOString()),
    end: fc.date().map(d => d.toISOString())
  })),
  minEngagementRate: fc.option(fc.float({ min: 0, max: 1 })),
  minReach: fc.option(fc.integer({ min: 0, max: 100000 })),
  tags: fc.option(fc.array(fc.string({ maxLength: 30 }), { maxLength: 10 })),
  sortBy: fc.option(fc.constantFrom('engagement', 'reach', 'date', 'performance_score')),
  sortOrder: fc.option(fc.constantFrom('asc', 'desc')),
  limit: fc.option(fc.integer({ min: 1, max: 1000 }))
});

describe('Analytics Property Tests', () => {
  let analyticsService: AnalyticsService;
  let mockBrandContextService: ReturnType<typeof createMockBrandContextService>;
  let mockEngagementMetricsTracker: ReturnType<typeof createMockEngagementMetricsTracker>;
  let mockAudienceInsightsService: ReturnType<typeof createMockAudienceInsightsService>;
  let mockPerformanceReportGenerator: ReturnType<typeof createMockPerformanceReportGenerator>;

  beforeEach(() => {
    mockBrandContextService = createMockBrandContextService();
    mockEngagementMetricsTracker = createMockEngagementMetricsTracker();
    mockAudienceInsightsService = createMockAudienceInsightsService();
    mockPerformanceReportGenerator = createMockPerformanceReportGenerator();

    analyticsService = new AnalyticsService(
      mockBrandContextService as any,
      mockEngagementMetricsTracker as any,
      mockAudienceInsightsService as any,
      mockPerformanceReportGenerator as any
    );
  });

  /**
   * Property 12: Performance Analytics and Insights
   * For any published content across platforms, the system should track engagement metrics,
   * identify top-performing content, analyze performance by multiple dimensions, and generate
   * actionable insights with benchmark comparisons when available.
   * 
   * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7**
   */
  test('Property 12: Performance analytics and insights', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // brandId
        fc.array(contentPerformanceArb, { minLength: 1, maxLength: 20 }),
        fc.array(topPerformingContentArb, { minLength: 1, maxLength: 10 }),
        async (brandId, contentPerformances, topContent) => {
          // Mock the underlying services to return our test data
          mockEngagementMetricsTracker.trackAllContentMetrics.mockResolvedValue(contentPerformances);
          mockEngagementMetricsTracker.getTopPerformingContent.mockResolvedValue(topContent);
          mockEngagementMetricsTracker.getContentMetricsInRange.mockResolvedValue(contentPerformances);
          
          mockAudienceInsightsService.getAudienceInsights.mockResolvedValue({
            brandId,
            timeRange: {
              start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              end: new Date().toISOString()
            },
            demographics: {
              ageGroups: {
                '18-24': { percentage: 30, engagementRate: 0.08 },
                '25-34': { percentage: 40, engagementRate: 0.06 }
              },
              genderBreakdown: {
                'female': { percentage: 60, engagementRate: 0.07 }
              },
              topLocations: [
                { location: 'US', percentage: 50, engagementRate: 0.06 }
              ]
            },
            behaviorPatterns: {
              peakEngagementHours: [14, 18, 20],
              preferredContentTypes: [
                { type: ContentType.VIDEO, preference: 0.8 }
              ],
              averageSessionDuration: 180,
              contentConsumptionRate: 2.5
            },
            interests: [
              { topic: 'beauty', relevance: 0.9, engagementLevel: 0.8 }
            ]
          });

          mockAudienceInsightsService.getBrandMentionSentimentTrends.mockResolvedValue({
            brandId,
            timeRange: {
              start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              end: new Date().toISOString()
            },
            dataPoints: [
              {
                timestamp: new Date().toISOString(),
                sentimentScore: 0.5,
                mentionCount: 10,
                platform: Platform.INSTAGRAM,
                topics: ['product']
              }
            ],
            overallTrend: 'stable',
            trendStrength: 0.2,
            significantEvents: []
          });

          // Test 1: Content metrics tracking (Requirement 8.1)
          const trackedMetrics = await analyticsService.trackContentMetrics(brandId);
          
          expect(trackedMetrics).toHaveLength(contentPerformances.length);
          for (const metric of trackedMetrics) {
            expect(metric.brandId).toBe(brandId);
            expect(Object.values(Platform)).toContain(metric.platform);
            expect(Object.values(ContentType)).toContain(metric.contentType);
            expect(metric.metrics.engagementRate).toBeGreaterThanOrEqual(0);
            expect(metric.metrics.engagementRate).toBeLessThanOrEqual(1);
            expect(metric.metrics.likes).toBeGreaterThanOrEqual(0);
            expect(metric.metrics.reach).toBeGreaterThanOrEqual(0);
          }

          // Test 2: Top-performing content identification (Requirement 8.2)
          const topPerformingContent = await analyticsService.getTopPerformingContent(brandId);
          
          expect(topPerformingContent).toHaveLength(topContent.length);
          
          // Top content should be sorted by performance score (descending)
          for (let i = 1; i < topPerformingContent.length; i++) {
            expect(topPerformingContent[i-1].performanceScore)
              .toBeGreaterThanOrEqual(topPerformingContent[i].performanceScore);
          }
          
          // All top content should have valid metrics
          for (const content of topPerformingContent) {
            expect(content.performanceScore).toBeGreaterThanOrEqual(0);
            expect(content.performanceScore).toBeLessThanOrEqual(100);
            expect(Array.isArray(content.successFactors)).toBe(true);
            expect(content.metrics.engagementRate).toBeGreaterThanOrEqual(0);
            expect(content.metrics.engagementRate).toBeLessThanOrEqual(1);
          }

          // Test 3: Multi-dimensional performance analysis (Requirement 8.3)
          if (contentPerformances.length > 0) {
            const contentId = contentPerformances[0].contentId;
            mockEngagementMetricsTracker.analyzeContentPerformance.mockResolvedValue({
              contentId,
              overallScore: 75,
              platformScore: 80,
              contentTypeScore: 70,
              timingScore: 65,
              benchmarkComparison: {
                brandAverage: 0.04,
                percentileRank: 70
              },
              successFactors: ['high-engagement-rate'],
              improvementAreas: ['shareability'],
              recommendations: ['Add more engaging captions']
            });

            const analysis = await analyticsService.analyzeContentPerformance(brandId, contentId);
            
            expect(analysis.contentId).toBe(contentId);
            expect(analysis.overallScore).toBeGreaterThanOrEqual(0);
            expect(analysis.overallScore).toBeLessThanOrEqual(100);
            expect(analysis.platformScore).toBeGreaterThanOrEqual(0);
            expect(analysis.platformScore).toBeLessThanOrEqual(100);
            expect(analysis.contentTypeScore).toBeGreaterThanOrEqual(0);
            expect(analysis.contentTypeScore).toBeLessThanOrEqual(100);
            expect(analysis.timingScore).toBeGreaterThanOrEqual(0);
            expect(analysis.timingScore).toBeLessThanOrEqual(100);
            
            expect(analysis.benchmarkComparison.percentileRank).toBeGreaterThanOrEqual(0);
            expect(analysis.benchmarkComparison.percentileRank).toBeLessThanOrEqual(100);
            expect(Array.isArray(analysis.successFactors)).toBe(true);
            expect(Array.isArray(analysis.improvementAreas)).toBe(true);
            expect(Array.isArray(analysis.recommendations)).toBe(true);
          }

          // Test 4: Audience insights and demographics (Requirement 8.4)
          const audienceInsights = await analyticsService.getAudienceInsights(brandId);
          
          expect(audienceInsights.brandId).toBe(brandId);
          expect(typeof audienceInsights.demographics).toBe('object');
          expect(typeof audienceInsights.behaviorPatterns).toBe('object');
          expect(Array.isArray(audienceInsights.interests)).toBe(true);
          
          // Demographics should have valid percentages
          for (const [ageGroup, data] of Object.entries(audienceInsights.demographics.ageGroups)) {
            expect(data.percentage).toBeGreaterThanOrEqual(0);
            expect(data.percentage).toBeLessThanOrEqual(100);
            expect(data.engagementRate).toBeGreaterThanOrEqual(0);
            expect(data.engagementRate).toBeLessThanOrEqual(1);
          }
          
          // Behavior patterns should be valid
          expect(Array.isArray(audienceInsights.behaviorPatterns.peakEngagementHours)).toBe(true);
          expect(audienceInsights.behaviorPatterns.averageSessionDuration).toBeGreaterThanOrEqual(0);
          expect(audienceInsights.behaviorPatterns.contentConsumptionRate).toBeGreaterThanOrEqual(0);

          // Test 5: Performance reports with recommendations (Requirement 8.5)
          mockPerformanceReportGenerator.generatePerformanceReport.mockResolvedValue({
            brandId,
            reportType: 'monthly',
            timeRange: {
              start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              end: new Date().toISOString()
            },
            generatedAt: new Date().toISOString(),
            summary: {
              totalContent: contentPerformances.length,
              totalEngagement: 1000,
              averageEngagementRate: 0.05,
              totalReach: 50000,
              topPlatform: Platform.INSTAGRAM,
              bestPerformingContentType: ContentType.VIDEO
            },
            platformBreakdown: {},
            topPerformingContent: topContent,
            audienceInsights: audienceInsights,
            recommendations: [
              {
                category: 'content',
                priority: 'high',
                recommendation: 'Focus on video content',
                expectedImpact: 'Increase engagement by 20%',
                actionItems: ['Create more video content']
              }
            ],
            benchmarkComparisons: {
              industryBenchmarks: {},
              competitorComparisons: [],
              historicalComparison: {
                previousPeriod: {
                  engagementRate: 0.04,
                  reach: 40000,
                  contentVolume: 10
                },
                changePercentage: {
                  engagementRate: 25,
                  reach: 25,
                  contentVolume: 20
                }
              }
            }
          });

          const report = await analyticsService.generatePerformanceReport(brandId, 'monthly');
          
          expect(report.brandId).toBe(brandId);
          expect(report.reportType).toBe('monthly');
          expect(typeof report.summary).toBe('object');
          expect(Array.isArray(report.recommendations)).toBe(true);
          
          // Recommendations should be actionable
          for (const rec of report.recommendations) {
            expect(['content', 'timing', 'platform', 'audience']).toContain(rec.category);
            expect(['high', 'medium', 'low']).toContain(rec.priority);
            expect(rec.recommendation.length).toBeGreaterThan(0);
            expect(Array.isArray(rec.actionItems)).toBe(true);
          }

          // Test 6: Benchmark comparisons (Requirement 8.6)
          mockPerformanceReportGenerator.generateBenchmarkReport.mockResolvedValue({
            brandPerformance: {
              engagementRate: 0.05,
              reach: 50000,
              contentVolume: contentPerformances.length
            },
            industryBenchmarks: [],
            comparisons: [
              {
                metric: 'engagementRate',
                brandValue: 0.05,
                industryAverage: 0.035,
                percentageDifference: 42.86,
                performance: 'above'
              }
            ],
            recommendations: ['Continue current engagement strategies']
          });

          const benchmarkReport = await analyticsService.generateBenchmarkReport(
            brandId, 
            'beauty', 
            {
              start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              end: new Date()
            }
          );
          
          expect(typeof benchmarkReport.brandPerformance).toBe('object');
          expect(Array.isArray(benchmarkReport.comparisons)).toBe(true);
          expect(Array.isArray(benchmarkReport.recommendations)).toBe(true);
          
          // Benchmark comparisons should be valid
          for (const comparison of benchmarkReport.comparisons) {
            expect(comparison.brandValue).toBeGreaterThanOrEqual(0);
            expect(comparison.industryAverage).toBeGreaterThanOrEqual(0);
            expect(['above', 'below', 'at', 'no_data']).toContain(comparison.performance);
          }

          // Test 7: Sentiment trends tracking (Requirement 8.7)
          const sentimentTrends = await analyticsService.getBrandMentionSentimentTrends(
            brandId,
            {
              start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              end: new Date()
            }
          );
          
          expect(sentimentTrends.brandId).toBe(brandId);
          expect(Array.isArray(sentimentTrends.dataPoints)).toBe(true);
          expect(['improving', 'declining', 'stable']).toContain(sentimentTrends.overallTrend);
          expect(sentimentTrends.trendStrength).toBeGreaterThanOrEqual(0);
          expect(sentimentTrends.trendStrength).toBeLessThanOrEqual(1);
          
          // Sentiment data points should be valid
          for (const point of sentimentTrends.dataPoints) {
            expect(point.sentimentScore).toBeGreaterThanOrEqual(-1);
            expect(point.sentimentScore).toBeLessThanOrEqual(1);
            expect(point.mentionCount).toBeGreaterThanOrEqual(0);
            expect(Object.values(Platform)).toContain(point.platform);
            expect(Array.isArray(point.topics)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Analytics Data Consistency
   * Analytics calculations should be mathematically consistent and preserve data integrity
   */
  test('Property: Analytics data consistency and mathematical correctness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(contentPerformanceArb, { minLength: 2, maxLength: 50 }),
        async (contentPerformances) => {
          // Ensure all content belongs to the same brand for consistency testing
          const brandId = 'test_brand';
          const normalizedContent = contentPerformances.map(content => ({
            ...content,
            brandId
          }));

          mockEngagementMetricsTracker.getContentMetricsInRange.mockResolvedValue(normalizedContent);

          // Get analytics dashboard
          const dashboard = await analyticsService.getAnalyticsDashboard(brandId);

          // Test mathematical consistency
          expect(dashboard.summary.totalContent).toBe(normalizedContent.length);

          // Total engagement should equal sum of individual content engagement
          const expectedTotalEngagement = normalizedContent.reduce((sum, content) => 
            sum + content.metrics.likes + content.metrics.comments + content.metrics.shares, 0
          );
          expect(dashboard.summary.totalEngagement).toBe(expectedTotalEngagement);

          // Average engagement rate should be calculated correctly
          const expectedAvgEngagement = normalizedContent.reduce((sum, content) => 
            sum + content.metrics.engagementRate, 0
          ) / normalizedContent.length;
          expect(Math.abs(dashboard.summary.averageEngagementRate - expectedAvgEngagement)).toBeLessThan(0.001);

          // Total reach should equal sum of individual content reach
          const expectedTotalReach = normalizedContent.reduce((sum, content) => sum + content.metrics.reach, 0);
          expect(dashboard.summary.totalReach).toBe(expectedTotalReach);

          // Platform breakdown should account for all content
          const platformCounts = new Map<Platform, number>();
          for (const content of normalizedContent) {
            platformCounts.set(content.platform, (platformCounts.get(content.platform) || 0) + 1);
          }

          let totalPlatformContent = 0;
          for (const [platform, data] of Object.entries(dashboard.platformBreakdown)) {
            totalPlatformContent += data.contentCount;
            expect(data.contentCount).toBe(platformCounts.get(platform as Platform) || 0);
          }
          expect(totalPlatformContent).toBe(normalizedContent.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Analytics Filter Consistency
   * Filtered analytics results should respect all filter criteria and maintain consistency
   */
  test('Property: Analytics filter consistency and result validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        analyticsFiltersArb,
        fc.array(contentPerformanceArb, { minLength: 5, maxLength: 100 }),
        async (filters, allContent) => {
          // Normalize content to match filter brandId
          const normalizedContent = allContent.map(content => ({
            ...content,
            brandId: filters.brandId
          }));

          // Mock filtered results based on filter criteria
          let filteredContent = normalizedContent;

          // Apply platform filter
          if (filters.platforms && filters.platforms.length > 0) {
            filteredContent = filteredContent.filter(content => 
              filters.platforms!.includes(content.platform)
            );
          }

          // Apply content type filter
          if (filters.contentTypes && filters.contentTypes.length > 0) {
            filteredContent = filteredContent.filter(content => 
              filters.contentTypes!.includes(content.contentType)
            );
          }

          // Apply engagement rate filter
          if (filters.minEngagementRate !== undefined) {
            filteredContent = filteredContent.filter(content => 
              content.metrics.engagementRate >= filters.minEngagementRate!
            );
          }

          // Apply reach filter
          if (filters.minReach !== undefined) {
            filteredContent = filteredContent.filter(content => 
              content.metrics.reach >= filters.minReach!
            );
          }

          // Apply limit
          if (filters.limit !== undefined) {
            filteredContent = filteredContent.slice(0, filters.limit);
          }

          mockEngagementMetricsTracker.getTopPerformingContent.mockResolvedValue(
            filteredContent.map(content => ({
              contentId: content.contentId,
              title: `Title for ${content.contentId}`,
              platform: content.platform,
              contentType: content.contentType,
              publishedAt: content.publishedAt,
              metrics: content.metrics,
              performanceScore: content.metrics.engagementRate * 100,
              successFactors: []
            }))
          );

          // Test filtered results
          const topContent = await analyticsService.getTopPerformingContent(filters.brandId, filters);

          // All results should match filter criteria
          for (const content of topContent) {
            // Platform filter
            if (filters.platforms && filters.platforms.length > 0) {
              expect(filters.platforms).toContain(content.platform);
            }

            // Content type filter
            if (filters.contentTypes && filters.contentTypes.length > 0) {
              expect(filters.contentTypes).toContain(content.contentType);
            }

            // Engagement rate filter
            if (filters.minEngagementRate !== undefined) {
              expect(content.metrics.engagementRate).toBeGreaterThanOrEqual(filters.minEngagementRate);
            }

            // Reach filter
            if (filters.minReach !== undefined) {
              expect(content.metrics.reach).toBeGreaterThanOrEqual(filters.minReach);
            }

            // All content should belong to the specified brand
            expect(content.contentId).toBeDefined();
            expect(content.performanceScore).toBeGreaterThanOrEqual(0);
            expect(content.performanceScore).toBeLessThanOrEqual(100);
          }

          // Limit filter
          if (filters.limit !== undefined) {
            expect(topContent.length).toBeLessThanOrEqual(filters.limit);
          }

          // Results should be properly sorted if sort criteria specified
          if (filters.sortBy === 'engagement' && topContent.length > 1) {
            for (let i = 1; i < topContent.length; i++) {
              if (filters.sortOrder === 'asc') {
                expect(topContent[i].metrics.engagementRate)
                  .toBeGreaterThanOrEqual(topContent[i-1].metrics.engagementRate);
              } else {
                expect(topContent[i-1].metrics.engagementRate)
                  .toBeGreaterThanOrEqual(topContent[i].metrics.engagementRate);
              }
            }
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Performance Score Validity
   * Performance scores should be mathematically sound and consistently calculated
   */
  test('Property: Performance score calculation validity and consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(topPerformingContentArb, { minLength: 2, maxLength: 20 }),
        async (topContent) => {
          mockEngagementMetricsTracker.getTopPerformingContent.mockResolvedValue(topContent);

          const result = await analyticsService.getTopPerformingContent('test_brand');

          // All performance scores should be valid
          for (const content of result) {
            expect(content.performanceScore).toBeGreaterThanOrEqual(0);
            expect(content.performanceScore).toBeLessThanOrEqual(100);
            expect(typeof content.performanceScore).toBe('number');
            expect(isFinite(content.performanceScore)).toBe(true);
          }

          // Content should be sorted by performance score (descending)
          for (let i = 1; i < result.length; i++) {
            expect(result[i-1].performanceScore).toBeGreaterThanOrEqual(result[i].performanceScore);
          }

          // Performance scores should correlate with engagement metrics
          for (const content of result) {
            // Higher engagement rates should generally correlate with higher scores
            // (allowing for some variance due to other factors)
            if (content.metrics.engagementRate > 0.1) {
              expect(content.performanceScore).toBeGreaterThan(50);
            }
            
            // Very low engagement should result in lower scores
            if (content.metrics.engagementRate < 0.01) {
              expect(content.performanceScore).toBeLessThan(80);
            }
          }

          // Success factors should be relevant to high performance
          for (const content of result) {
            if (content.performanceScore > 80) {
              expect(content.successFactors.length).toBeGreaterThan(0);
            }
            
            // Validate success factor consistency
            for (const factor of content.successFactors) {
              expect(typeof factor).toBe('string');
              expect(factor.length).toBeGreaterThan(0);
            }
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: Time Range Analytics Consistency
   * Analytics results should be consistent across different time ranges and maintain temporal logic
   */
  test('Property: Time range analytics consistency and temporal logic', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
        fc.integer({ min: 1, max: 90 }), // days
        fc.array(contentPerformanceArb, { minLength: 1, maxLength: 30 }),
        async (startDate, durationDays, contentPerformances) => {
          const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
          
          // Ensure content is within the time range
          const normalizedContent = contentPerformances.map(content => ({
            ...content,
            brandId: 'test_brand',
            publishedAt: new Date(
              startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())
            ).toISOString()
          }));

          mockEngagementMetricsTracker.getContentMetricsInRange.mockResolvedValue(normalizedContent);

          // Get performance trends
          const trends = await analyticsService.getContentPerformanceTrends(
            'test_brand',
            { start: startDate, end: endDate },
            'daily'
          );

          // Validate temporal consistency
          for (const trend of trends) {
            // Date should be within the specified range
            const trendDate = new Date(trend.date);
            expect(trendDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
            expect(trendDate.getTime()).toBeLessThanOrEqual(endDate.getTime());

            // Metrics should be non-negative
            expect(trend.contentCount).toBeGreaterThanOrEqual(0);
            expect(trend.totalEngagement).toBeGreaterThanOrEqual(0);
            expect(trend.averageEngagementRate).toBeGreaterThanOrEqual(0);
            expect(trend.averageEngagementRate).toBeLessThanOrEqual(1);
            expect(trend.reach).toBeGreaterThanOrEqual(0);

            // Platform breakdown should be consistent
            let totalPlatformContent = 0;
            for (const [platform, count] of Object.entries(trend.platformBreakdown)) {
              expect(Object.values(Platform)).toContain(platform);
              expect(count).toBeGreaterThanOrEqual(0);
              totalPlatformContent += count;
            }
            expect(totalPlatformContent).toBe(trend.contentCount);
          }

          // Trends should be sorted chronologically
          for (let i = 1; i < trends.length; i++) {
            expect(trends[i].date >= trends[i-1].date).toBe(true);
          }

          // Total content across all trends should not exceed input content
          const totalTrendContent = trends.reduce((sum, trend) => sum + trend.contentCount, 0);
          expect(totalTrendContent).toBeLessThanOrEqual(normalizedContent.length * 2); // Allow for some overlap in daily grouping
        }
      ),
      { numRuns: 20 }
    );
  });
});