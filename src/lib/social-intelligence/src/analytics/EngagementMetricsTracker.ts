/**
 * Engagement Metrics Tracking Service
 * Tracks performance for all published content across platforms and identifies top-performing content
 */

import { 
  ContentPerformance, 
  EngagementMetrics, 
  TopPerformingContent,
  AnalyticsFilters,
  PerformanceAnalysis,
  ContentPerformanceSchema,
  TopPerformingContentSchema,
  PerformanceAnalysisSchema
} from './types';
import { Platform, ContentType, SocialEvent } from '../types/core';
import { BrandContextService } from '../brand/BrandContextService';

export interface PlatformMetricsAPI {
  getContentMetrics(contentId: string, platform: Platform): Promise<EngagementMetrics>;
  getContentDetails(contentId: string, platform: Platform): Promise<{
    title: string;
    publishedAt: string;
    contentType: ContentType;
  }>;
  getBulkMetrics(contentIds: string[], platform: Platform): Promise<Map<string, EngagementMetrics>>;
}

export interface ContentRepository {
  getPublishedContent(brandId: string, filters?: AnalyticsFilters): Promise<Array<{
    id: string;
    title: string;
    platform: Platform;
    contentType: ContentType;
    publishedAt: string;
    tags: string[];
  }>>;
  updateContentMetrics(contentId: string, metrics: EngagementMetrics): Promise<void>;
  getContentMetricsHistory(contentId: string): Promise<ContentPerformance[]>;
}

export interface BenchmarkService {
  getIndustryBenchmark(
    industry: string, 
    platform: Platform, 
    contentType: ContentType
  ): Promise<{
    averageEngagementRate: number;
    averageReach: number;
    sampleSize: number;
  } | null>;
  getBrandBenchmark(
    brandId: string, 
    platform: Platform, 
    contentType: ContentType
  ): Promise<{
    averageEngagementRate: number;
    averageReach: number;
    sampleSize: number;
  }>;
}

export class EngagementMetricsTracker {
  constructor(
    private brandContextService: BrandContextService,
    private platformMetricsAPI: PlatformMetricsAPI,
    private contentRepository: ContentRepository,
    private benchmarkService: BenchmarkService
  ) {}

  /**
   * Track performance for all published content across platforms
   * Requirement 8.1: Track engagement metrics for all published content across platforms
   */
  async trackAllContentMetrics(brandId: string, forceRefresh = false): Promise<ContentPerformance[]> {
    try {
      // Get brand context to ensure valid brand
      const brandContext = await this.brandContextService.getBrandContext(brandId);
      if (!brandContext) {
        throw new Error(`Brand context not found for brandId: ${brandId}`);
      }

      // Get all published content for the brand
      const publishedContent = await this.contentRepository.getPublishedContent(brandId);
      
      if (publishedContent.length === 0) {
        return [];
      }

      const contentPerformances: ContentPerformance[] = [];

      // Group content by platform for efficient batch processing
      const contentByPlatform = new Map<Platform, typeof publishedContent>();
      for (const content of publishedContent) {
        if (!contentByPlatform.has(content.platform)) {
          contentByPlatform.set(content.platform, []);
        }
        contentByPlatform.get(content.platform)!.push(content);
      }

      // Process each platform's content
      for (const [platform, platformContent] of contentByPlatform) {
        try {
          // Get bulk metrics for efficiency
          const contentIds = platformContent.map(c => c.id);
          const metricsMap = await this.platformMetricsAPI.getBulkMetrics(contentIds, platform);

          // Process each content item
          for (const content of platformContent) {
            const metrics = metricsMap.get(content.id);
            if (!metrics) {
              console.warn(`No metrics found for content ${content.id} on ${platform}`);
              continue;
            }

            // Create content performance record
            const performance: ContentPerformance = {
              contentId: content.id,
              brandId,
              platform: content.platform,
              contentType: content.contentType,
              publishedAt: content.publishedAt,
              metrics,
              lastUpdated: new Date().toISOString()
            };

            // Validate the performance data
            const validatedPerformance = ContentPerformanceSchema.parse(performance);
            contentPerformances.push(validatedPerformance);

            // Update repository with latest metrics
            await this.contentRepository.updateContentMetrics(content.id, metrics);
          }
        } catch (error) {
          console.error(`Error tracking metrics for platform ${platform}:`, error);
          // Continue with other platforms even if one fails
        }
      }

      return contentPerformances;
    } catch (error) {
      console.error('Error tracking content metrics:', error);
      throw new Error(`Failed to track content metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Identify top-performing content by engagement rate, reach, and conversion metrics
   * Requirement 8.2: Identify top-performing content by engagement rate, reach, and conversion metrics
   */
  async getTopPerformingContent(
    brandId: string, 
    filters?: AnalyticsFilters,
    limit = 10
  ): Promise<TopPerformingContent[]> {
    try {
      // Get brand context
      const brandContext = await this.brandContextService.getBrandContext(brandId);
      if (!brandContext) {
        throw new Error(`Brand context not found for brandId: ${brandId}`);
      }

      // Get published content with filters
      const publishedContent = await this.contentRepository.getPublishedContent(brandId, filters);
      
      if (publishedContent.length === 0) {
        return [];
      }

      // Get current metrics for all content
      const contentWithMetrics: Array<{
        content: typeof publishedContent[0];
        metrics: EngagementMetrics;
        performanceScore: number;
      }> = [];

      for (const content of publishedContent) {
        try {
          const metrics = await this.platformMetricsAPI.getContentMetrics(content.id, content.platform);
          
          // Calculate performance score (weighted combination of metrics)
          const performanceScore = this.calculatePerformanceScore(metrics, content.contentType, content.platform);
          
          contentWithMetrics.push({
            content,
            metrics,
            performanceScore
          });
        } catch (error) {
          console.warn(`Failed to get metrics for content ${content.id}:`, error);
          // Skip content with missing metrics
        }
      }

      // Sort by performance score (descending)
      contentWithMetrics.sort((a, b) => b.performanceScore - a.performanceScore);

      // Take top N and convert to TopPerformingContent format
      const topContent = contentWithMetrics.slice(0, limit).map(item => {
        const successFactors = this.identifySuccessFactors(item.metrics, item.content.contentType, item.content.platform);
        
        const topPerformingContent: TopPerformingContent = {
          contentId: item.content.id,
          title: item.content.title,
          platform: item.content.platform,
          contentType: item.content.contentType,
          publishedAt: item.content.publishedAt,
          metrics: item.metrics,
          performanceScore: item.performanceScore,
          successFactors
        };

        return TopPerformingContentSchema.parse(topPerformingContent);
      });

      return topContent;
    } catch (error) {
      console.error('Error getting top performing content:', error);
      throw new Error(`Failed to get top performing content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze content performance by platform, content type, and posting time
   * Requirement 8.3: Analyze content performance by platform, content type, and posting time
   */
  async analyzeContentPerformance(
    brandId: string,
    contentId: string
  ): Promise<PerformanceAnalysis> {
    try {
      // Get brand context
      const brandContext = await this.brandContextService.getBrandContext(brandId);
      if (!brandContext) {
        throw new Error(`Brand context not found for brandId: ${brandId}`);
      }

      // Get content details and metrics
      const publishedContent = await this.contentRepository.getPublishedContent(brandId, {
        brandId
      });
      
      const content = publishedContent.find(c => c.id === contentId);
      if (!content) {
        throw new Error(`Content not found: ${contentId}`);
      }

      const currentMetrics = await this.platformMetricsAPI.getContentMetrics(contentId, content.platform);
      
      // Get industry and brand benchmarks
      const industryBenchmark = await this.benchmarkService.getIndustryBenchmark(
        brandContext.playbook?.brandIdentity?.name || 'general',
        content.platform,
        content.contentType
      );
      
      const brandBenchmark = await this.benchmarkService.getBrandBenchmark(
        brandId,
        content.platform,
        content.contentType
      );

      // Calculate performance scores
      const overallScore = this.calculatePerformanceScore(currentMetrics, content.contentType, content.platform);
      const platformScore = this.calculatePlatformScore(currentMetrics, content.platform);
      const contentTypeScore = this.calculateContentTypeScore(currentMetrics, content.contentType);
      const timingScore = this.calculateTimingScore(content.publishedAt, currentMetrics);

      // Calculate benchmark comparison
      const benchmarkComparison = {
        industryAverage: industryBenchmark?.averageEngagementRate,
        brandAverage: brandBenchmark.averageEngagementRate,
        percentileRank: this.calculatePercentileRank(
          currentMetrics.engagementRate,
          brandBenchmark.averageEngagementRate
        )
      };

      // Identify success factors and improvement areas
      const successFactors = this.identifySuccessFactors(currentMetrics, content.contentType, content.platform);
      const improvementAreas = this.identifyImprovementAreas(currentMetrics, benchmarkComparison);
      const recommendations = this.generateRecommendations(currentMetrics, content, benchmarkComparison);

      const analysis: PerformanceAnalysis = {
        contentId,
        overallScore,
        platformScore,
        contentTypeScore,
        timingScore,
        benchmarkComparison,
        successFactors,
        improvementAreas,
        recommendations
      };

      return PerformanceAnalysisSchema.parse(analysis);
    } catch (error) {
      console.error('Error analyzing content performance:', error);
      throw new Error(`Failed to analyze content performance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get content metrics for a specific time range
   */
  async getContentMetricsInRange(
    brandId: string,
    startDate: Date,
    endDate: Date,
    platforms?: Platform[]
  ): Promise<ContentPerformance[]> {
    try {
      const filters: AnalyticsFilters = {
        brandId,
        timeRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        platforms
      };

      const publishedContent = await this.contentRepository.getPublishedContent(brandId, filters);
      const performances: ContentPerformance[] = [];

      for (const content of publishedContent) {
        try {
          const metrics = await this.platformMetricsAPI.getContentMetrics(content.id, content.platform);
          
          const performance: ContentPerformance = {
            contentId: content.id,
            brandId,
            platform: content.platform,
            contentType: content.contentType,
            publishedAt: content.publishedAt,
            metrics,
            lastUpdated: new Date().toISOString()
          };

          performances.push(ContentPerformanceSchema.parse(performance));
        } catch (error) {
          console.warn(`Failed to get metrics for content ${content.id}:`, error);
        }
      }

      return performances;
    } catch (error) {
      console.error('Error getting content metrics in range:', error);
      throw new Error(`Failed to get content metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate overall performance score for content
   */
  private calculatePerformanceScore(
    metrics: EngagementMetrics, 
    contentType: ContentType, 
    platform: Platform
  ): number {
    // Weighted scoring based on platform and content type
    const weights = this.getMetricWeights(platform, contentType);
    
    // Normalize metrics to 0-1 scale (using platform-specific normalization)
    const normalizedEngagement = Math.min(metrics.engagementRate * 100, 100); // Cap at 100%
    const normalizedReach = Math.min(metrics.reach / 10000, 100); // Normalize reach
    const normalizedViews = Math.min(metrics.views / 50000, 100); // Normalize views
    const normalizedInteractions = Math.min(
      (metrics.likes + metrics.comments + metrics.shares) / 1000, 
      100
    );

    const score = (
      normalizedEngagement * weights.engagement +
      normalizedReach * weights.reach +
      normalizedViews * weights.views +
      normalizedInteractions * weights.interactions
    );

    return Math.round(Math.min(score, 100));
  }

  /**
   * Get metric weights based on platform and content type
   */
  private getMetricWeights(platform: Platform, contentType: ContentType) {
    const baseWeights = {
      engagement: 0.4,
      reach: 0.3,
      views: 0.2,
      interactions: 0.1
    };

    // Adjust weights based on platform characteristics
    switch (platform) {
      case Platform.TIKTOK:
        return { ...baseWeights, views: 0.5, engagement: 0.3 }; // Views more important on TikTok
      case Platform.INSTAGRAM:
        return { ...baseWeights, engagement: 0.5, reach: 0.2 }; // Engagement key on Instagram
      case Platform.YOUTUBE:
        return { ...baseWeights, views: 0.4, engagement: 0.3 }; // Views and engagement balanced
      default:
        return baseWeights;
    }
  }

  /**
   * Calculate platform-specific performance score
   */
  private calculatePlatformScore(metrics: EngagementMetrics, platform: Platform): number {
    // Platform-specific scoring logic
    switch (platform) {
      case Platform.TIKTOK:
        return Math.min((metrics.views / 10000) * 50 + (metrics.engagementRate * 100) * 50, 100);
      case Platform.INSTAGRAM:
        return Math.min((metrics.engagementRate * 100) * 60 + (metrics.reach / 5000) * 40, 100);
      case Platform.YOUTUBE:
        return Math.min((metrics.views / 1000) * 40 + (metrics.engagementRate * 100) * 60, 100);
      default:
        return Math.min((metrics.engagementRate * 100) * 70 + (metrics.reach / 1000) * 30, 100);
    }
  }

  /**
   * Calculate content type-specific performance score
   */
  private calculateContentTypeScore(metrics: EngagementMetrics, contentType: ContentType): number {
    // Content type-specific scoring
    switch (contentType) {
      case ContentType.VIDEO:
        return Math.min((metrics.views / 5000) * 60 + (metrics.engagementRate * 100) * 40, 100);
      case ContentType.IMAGE:
        return Math.min((metrics.likes / 100) * 40 + (metrics.engagementRate * 100) * 60, 100);
      case ContentType.TEXT:
        return Math.min((metrics.shares / 10) * 50 + (metrics.comments / 20) * 50, 100);
      default:
        return Math.min((metrics.engagementRate * 100), 100);
    }
  }

  /**
   * Calculate timing-based performance score
   */
  private calculateTimingScore(publishedAt: string, metrics: EngagementMetrics): number {
    const publishDate = new Date(publishedAt);
    const now = new Date();
    const hoursOld = (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60);
    
    // Score based on engagement velocity (engagement per hour)
    const engagementVelocity = (metrics.likes + metrics.comments + metrics.shares) / Math.max(hoursOld, 1);
    
    // Normalize velocity score
    return Math.min(engagementVelocity * 10, 100);
  }

  /**
   * Calculate percentile rank compared to brand average
   */
  private calculatePercentileRank(currentValue: number, brandAverage: number): number {
    if (brandAverage === 0) return 50; // Default to 50th percentile if no benchmark
    
    const ratio = currentValue / brandAverage;
    
    // Convert ratio to percentile (simplified calculation)
    if (ratio >= 2.0) return 95;
    if (ratio >= 1.5) return 80;
    if (ratio >= 1.2) return 70;
    if (ratio >= 1.0) return 60;
    if (ratio >= 0.8) return 40;
    if (ratio >= 0.6) return 30;
    if (ratio >= 0.4) return 20;
    return 10;
  }

  /**
   * Identify success factors for high-performing content
   */
  private identifySuccessFactors(
    metrics: EngagementMetrics, 
    contentType: ContentType, 
    platform: Platform
  ): string[] {
    const factors: string[] = [];

    if (metrics.engagementRate > 0.05) factors.push('high-engagement-rate');
    if (metrics.reach > 10000) factors.push('wide-reach');
    if (metrics.shares > metrics.likes * 0.1) factors.push('highly-shareable');
    if (metrics.comments > metrics.likes * 0.05) factors.push('conversation-starter');
    if (metrics.saves > metrics.likes * 0.02) factors.push('valuable-content');

    // Platform-specific factors
    if (platform === Platform.TIKTOK && metrics.views > 50000) {
      factors.push('viral-potential');
    }
    if (platform === Platform.INSTAGRAM && metrics.saves > 100) {
      factors.push('save-worthy');
    }

    // Content type-specific factors
    if (contentType === ContentType.VIDEO && metrics.views > metrics.reach * 1.5) {
      factors.push('rewatchable');
    }

    return factors;
  }

  /**
   * Identify areas for improvement
   */
  private identifyImprovementAreas(
    metrics: EngagementMetrics,
    benchmarkComparison: { brandAverage: number; percentileRank: number }
  ): string[] {
    const areas: string[] = [];

    if (metrics.engagementRate < benchmarkComparison.brandAverage * 0.8) {
      areas.push('engagement-rate');
    }
    if (metrics.shares < metrics.likes * 0.02) {
      areas.push('shareability');
    }
    if (metrics.comments < metrics.likes * 0.01) {
      areas.push('conversation-generation');
    }
    if (benchmarkComparison.percentileRank < 30) {
      areas.push('overall-performance');
    }

    return areas;
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    metrics: EngagementMetrics,
    content: { platform: Platform; contentType: ContentType; publishedAt: string },
    benchmarkComparison: { brandAverage: number; percentileRank: number }
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.engagementRate < benchmarkComparison.brandAverage) {
      recommendations.push('Consider using more engaging captions with questions or calls-to-action');
    }
    
    if (metrics.shares < metrics.likes * 0.02) {
      recommendations.push('Add shareable elements like tips, quotes, or relatable content');
    }

    if (content.contentType === ContentType.VIDEO && metrics.views < metrics.reach) {
      recommendations.push('Optimize video thumbnails and opening seconds to improve view rates');
    }

    if (benchmarkComparison.percentileRank < 50) {
      recommendations.push('Analyze top-performing content patterns and apply similar strategies');
    }

    // Platform-specific recommendations
    if (content.platform === Platform.INSTAGRAM && metrics.saves < 10) {
      recommendations.push('Create more educational or inspirational content that users want to save');
    }

    return recommendations;
  }
}