/**
 * Analytics Service
 * Main orchestrator for all analytics and performance tracking functionality
 */

import { 
  ContentPerformance,
  TopPerformingContent,
  AudienceInsights,
  PerformanceReport,
  SentimentTrend,
  AnalyticsFilters,
  PerformanceAnalysis,
  AnalyticsConfig
} from './types';
import { Platform, ContentType } from '../types/core';
import { BrandContextService } from '../brand/BrandContextService';
import { EngagementMetricsTracker } from './EngagementMetricsTracker';
import { AudienceInsightsService } from './AudienceInsightsService';
import { PerformanceReportGenerator } from './PerformanceReportGenerator';

export class AnalyticsService {
  constructor(
    private brandContextService: BrandContextService,
    private engagementMetricsTracker: EngagementMetricsTracker,
    private audienceInsightsService: AudienceInsightsService,
    private performanceReportGenerator: PerformanceReportGenerator
  ) {}

  /**
   * Track engagement metrics for all published content across platforms
   * Requirement 8.1: Track engagement metrics for all published content across platforms
   */
  async trackContentMetrics(brandId: string, forceRefresh = false): Promise<ContentPerformance[]> {
    try {
      return await this.engagementMetricsTracker.trackAllContentMetrics(brandId, forceRefresh);
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
      return await this.engagementMetricsTracker.getTopPerformingContent(brandId, filters, limit);
    } catch (error) {
      console.error('Error getting top performing content:', error);
      throw new Error(`Failed to get top performing content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze content performance by platform, content type, and posting time
   * Requirement 8.3: Analyze content performance by platform, content type, and posting time
   */
  async analyzeContentPerformance(brandId: string, contentId: string): Promise<PerformanceAnalysis> {
    try {
      return await this.engagementMetricsTracker.analyzeContentPerformance(brandId, contentId);
    } catch (error) {
      console.error('Error analyzing content performance:', error);
      throw new Error(`Failed to analyze content performance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Provide insights on audience demographics and behavior patterns
   * Requirement 8.4: Provide insights on audience demographics and behavior patterns
   */
  async getAudienceInsights(
    brandId: string,
    platform?: Platform,
    timeRange?: { start: Date; end: Date }
  ): Promise<AudienceInsights> {
    try {
      return await this.audienceInsightsService.getAudienceInsights(brandId, platform, timeRange);
    } catch (error) {
      console.error('Error getting audience insights:', error);
      throw new Error(`Failed to get audience insights: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate performance reports with actionable recommendations
   * Requirement 8.5: Generate performance reports with actionable recommendations
   */
  async generatePerformanceReport(
    brandId: string,
    reportType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'custom',
    timeRange?: { start: Date; end: Date }
  ): Promise<PerformanceReport> {
    try {
      return await this.performanceReportGenerator.generatePerformanceReport(brandId, reportType, timeRange);
    } catch (error) {
      console.error('Error generating performance report:', error);
      throw new Error(`Failed to generate performance report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compare performance against industry benchmarks when available
   * Requirement 8.6: Compare performance against industry benchmarks when available
   */
  async generateBenchmarkReport(
    brandId: string,
    industry: string,
    timeRange: { start: Date; end: Date }
  ): Promise<{
    brandPerformance: {
      engagementRate: number;
      reach: number;
      contentVolume: number;
    };
    industryBenchmarks: any[];
    comparisons: Array<{
      metric: string;
      brandValue: number;
      industryAverage: number;
      percentageDifference: number;
      performance: 'above' | 'below' | 'at' | 'no_data';
    }>;
    recommendations: string[];
  }> {
    try {
      return await this.performanceReportGenerator.generateBenchmarkReport(brandId, industry, timeRange);
    } catch (error) {
      console.error('Error generating benchmark report:', error);
      throw new Error(`Failed to generate benchmark report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Track brand mention sentiment trends over time
   * Requirement 8.7: Track brand mention sentiment trends over time
   */
  async getBrandMentionSentimentTrends(
    brandId: string,
    timeRange: { start: Date; end: Date },
    platforms?: Platform[]
  ): Promise<SentimentTrend> {
    try {
      return await this.audienceInsightsService.getBrandMentionSentimentTrends(brandId, timeRange, platforms);
    } catch (error) {
      console.error('Error getting sentiment trends:', error);
      throw new Error(`Failed to get sentiment trends: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get comprehensive analytics dashboard data
   */
  async getAnalyticsDashboard(
    brandId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    summary: {
      totalContent: number;
      totalEngagement: number;
      averageEngagementRate: number;
      totalReach: number;
      growthMetrics: {
        engagementGrowth: number;
        reachGrowth: number;
        contentVolumeGrowth: number;
      };
    };
    topPerformingContent: TopPerformingContent[];
    platformBreakdown: Record<Platform, {
      contentCount: number;
      totalEngagement: number;
      averageEngagementRate: number;
      reach: number;
    }>;
    audienceInsights: AudienceInsights;
    sentimentTrend: SentimentTrend;
    recentAlerts: Array<{
      type: 'performance' | 'sentiment' | 'engagement';
      message: string;
      severity: 'high' | 'medium' | 'low';
      timestamp: string;
    }>;
  }> {
    try {
      // Set default time range (last 30 days)
      const defaultTimeRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      };
      const analysisTimeRange = timeRange || defaultTimeRange;

      // Get all required data in parallel
      const [
        contentMetrics,
        topContent,
        audienceInsights,
        sentimentTrend
      ] = await Promise.all([
        this.engagementMetricsTracker.getContentMetricsInRange(
          brandId,
          analysisTimeRange.start,
          analysisTimeRange.end
        ),
        this.engagementMetricsTracker.getTopPerformingContent(brandId, {
          brandId,
          timeRange: {
            start: analysisTimeRange.start.toISOString(),
            end: analysisTimeRange.end.toISOString()
          }
        }, 5),
        this.audienceInsightsService.getAudienceInsights(brandId, undefined, analysisTimeRange),
        this.audienceInsightsService.getBrandMentionSentimentTrends(brandId, analysisTimeRange)
      ]);

      // Calculate summary metrics
      const totalEngagement = contentMetrics.reduce((sum, content) => 
        sum + content.metrics.likes + content.metrics.comments + content.metrics.shares, 0
      );
      
      const averageEngagementRate = contentMetrics.length > 0 
        ? contentMetrics.reduce((sum, content) => sum + content.metrics.engagementRate, 0) / contentMetrics.length
        : 0;
      
      const totalReach = contentMetrics.reduce((sum, content) => sum + content.metrics.reach, 0);

      // Calculate growth metrics (simplified - would need historical data)
      const growthMetrics = {
        engagementGrowth: 0, // Would calculate from historical data
        reachGrowth: 0,
        contentVolumeGrowth: 0
      };

      // Generate platform breakdown
      const platformBreakdown = this.generatePlatformBreakdown(contentMetrics);

      // Generate alerts based on performance thresholds
      const recentAlerts = this.generatePerformanceAlerts(contentMetrics, sentimentTrend);

      return {
        summary: {
          totalContent: contentMetrics.length,
          totalEngagement,
          averageEngagementRate,
          totalReach,
          growthMetrics
        },
        topPerformingContent: topContent,
        platformBreakdown,
        audienceInsights,
        sentimentTrend,
        recentAlerts
      };
    } catch (error) {
      console.error('Error getting analytics dashboard:', error);
      throw new Error(`Failed to get analytics dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get content performance trends over time
   */
  async getContentPerformanceTrends(
    brandId: string,
    timeRange: { start: Date; end: Date },
    granularity: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<Array<{
    date: string;
    contentCount: number;
    totalEngagement: number;
    averageEngagementRate: number;
    reach: number;
    platformBreakdown: Record<Platform, number>;
  }>> {
    try {
      // Get content metrics for the time range
      const contentMetrics = await this.engagementMetricsTracker.getContentMetricsInRange(
        brandId,
        timeRange.start,
        timeRange.end
      );

      // Group data by time periods
      const trends = this.groupContentByTimePeriod(contentMetrics, granularity);

      return trends;
    } catch (error) {
      console.error('Error getting content performance trends:', error);
      throw new Error(`Failed to get performance trends: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get competitor analysis (if data available)
   */
  async getCompetitorAnalysis(
    brandId: string,
    competitors: string[],
    timeRange: { start: Date; end: Date }
  ): Promise<{
    brandPerformance: {
      engagementRate: number;
      contentVolume: number;
      reach: number;
    };
    competitorComparisons: Array<{
      competitor: string;
      engagementRate: number;
      contentVolume: number;
      reach: number;
      performanceGap: number;
    }>;
    insights: string[];
  }> {
    try {
      // Get brand performance
      const brandMetrics = await this.engagementMetricsTracker.getContentMetricsInRange(
        brandId,
        timeRange.start,
        timeRange.end
      );

      const brandPerformance = {
        engagementRate: brandMetrics.reduce((sum, m) => sum + m.metrics.engagementRate, 0) / Math.max(brandMetrics.length, 1),
        contentVolume: brandMetrics.length,
        reach: brandMetrics.reduce((sum, m) => sum + m.metrics.reach, 0)
      };

      // In a real implementation, this would fetch competitor data
      const competitorComparisons = competitors.map(competitor => ({
        competitor,
        engagementRate: 0.035, // Mock data
        contentVolume: 15,
        reach: 25000,
        performanceGap: 0
      }));

      // Calculate performance gaps
      competitorComparisons.forEach(comp => {
        comp.performanceGap = brandPerformance.engagementRate - comp.engagementRate;
      });

      // Generate insights
      const insights = this.generateCompetitorInsights(brandPerformance, competitorComparisons);

      return {
        brandPerformance,
        competitorComparisons,
        insights
      };
    } catch (error) {
      console.error('Error getting competitor analysis:', error);
      throw new Error(`Failed to get competitor analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Schedule automated reports
   */
  async scheduleReport(
    brandId: string,
    reportType: 'daily' | 'weekly' | 'monthly' | 'quarterly',
    recipients: string[],
    enabled = true
  ): Promise<{
    scheduleId: string;
    nextRunDate: Date;
    frequency: string;
  }> {
    try {
      return await this.performanceReportGenerator.scheduleReport(brandId, reportType, recipients, enabled);
    } catch (error) {
      console.error('Error scheduling report:', error);
      throw new Error(`Failed to schedule report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get analytics configuration for a brand
   */
  async getAnalyticsConfig(brandId: string): Promise<AnalyticsConfig> {
    try {
      // In a real implementation, this would fetch from database
      const config: AnalyticsConfig = {
        brandId,
        trackingEnabled: true,
        platforms: [Platform.INSTAGRAM, Platform.TIKTOK, Platform.FACEBOOK, Platform.YOUTUBE],
        updateFrequency: 'daily',
        retentionPeriod: 365,
        benchmarkIndustry: 'beauty',
        alertThresholds: {
          lowEngagementRate: 0.01,
          highNegativeSentiment: -0.5,
          viralContentThreshold: 10000
        },
        reportSchedule: {
          daily: false,
          weekly: true,
          monthly: true,
          recipients: []
        }
      };

      return config;
    } catch (error) {
      console.error('Error getting analytics config:', error);
      throw new Error(`Failed to get analytics config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update analytics configuration
   */
  async updateAnalyticsConfig(brandId: string, config: Partial<AnalyticsConfig>): Promise<AnalyticsConfig> {
    try {
      // In a real implementation, this would update the database
      const currentConfig = await this.getAnalyticsConfig(brandId);
      const updatedConfig = { ...currentConfig, ...config };

      console.log(`Updated analytics config for brand ${brandId}:`, updatedConfig);

      return updatedConfig;
    } catch (error) {
      console.error('Error updating analytics config:', error);
      throw new Error(`Failed to update analytics config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Helper method to generate platform breakdown
   */
  private generatePlatformBreakdown(contentMetrics: ContentPerformance[]): Record<Platform, any> {
    const platformData = new Map<Platform, {
      contentCount: number;
      totalEngagement: number;
      totalReach: number;
      engagementRates: number[];
    }>();

    // Aggregate data by platform
    for (const content of contentMetrics) {
      if (!platformData.has(content.platform)) {
        platformData.set(content.platform, {
          contentCount: 0,
          totalEngagement: 0,
          totalReach: 0,
          engagementRates: []
        });
      }

      const data = platformData.get(content.platform)!;
      data.contentCount++;
      data.totalEngagement += content.metrics.likes + content.metrics.comments + content.metrics.shares;
      data.totalReach += content.metrics.reach;
      data.engagementRates.push(content.metrics.engagementRate);
    }

    // Convert to report format
    const breakdown: Record<Platform, any> = {};
    for (const [platform, data] of platformData) {
      const averageEngagementRate = data.engagementRates.length > 0
        ? data.engagementRates.reduce((sum, rate) => sum + rate, 0) / data.engagementRates.length
        : 0;

      breakdown[platform] = {
        contentCount: data.contentCount,
        totalEngagement: data.totalEngagement,
        averageEngagementRate,
        reach: data.totalReach
      };
    }

    return breakdown;
  }

  /**
   * Generate performance alerts based on thresholds
   */
  private generatePerformanceAlerts(
    contentMetrics: ContentPerformance[],
    sentimentTrend: SentimentTrend
  ): Array<{
    type: 'performance' | 'sentiment' | 'engagement';
    message: string;
    severity: 'high' | 'medium' | 'low';
    timestamp: string;
  }> {
    const alerts: Array<{
      type: 'performance' | 'sentiment' | 'engagement';
      message: string;
      severity: 'high' | 'medium' | 'low';
      timestamp: string;
    }> = [];

    // Check for low engagement
    const avgEngagement = contentMetrics.length > 0
      ? contentMetrics.reduce((sum, c) => sum + c.metrics.engagementRate, 0) / contentMetrics.length
      : 0;

    if (avgEngagement < 0.01) {
      alerts.push({
        type: 'engagement',
        message: 'Average engagement rate is below 1%',
        severity: 'high',
        timestamp: new Date().toISOString()
      });
    }

    // Check sentiment trend
    if (sentimentTrend.overallTrend === 'declining' && sentimentTrend.trendStrength > 0.3) {
      alerts.push({
        type: 'sentiment',
        message: 'Brand sentiment is declining significantly',
        severity: 'high',
        timestamp: new Date().toISOString()
      });
    }

    // Check for viral content
    const viralContent = contentMetrics.filter(c => c.metrics.views > 50000);
    if (viralContent.length > 0) {
      alerts.push({
        type: 'performance',
        message: `${viralContent.length} content piece(s) showing viral potential`,
        severity: 'low',
        timestamp: new Date().toISOString()
      });
    }

    return alerts;
  }

  /**
   * Group content metrics by time period
   */
  private groupContentByTimePeriod(
    contentMetrics: ContentPerformance[],
    granularity: 'daily' | 'weekly' | 'monthly'
  ): Array<{
    date: string;
    contentCount: number;
    totalEngagement: number;
    averageEngagementRate: number;
    reach: number;
    platformBreakdown: Record<Platform, number>;
  }> {
    const groups = new Map<string, ContentPerformance[]>();

    // Group content by time period
    for (const content of contentMetrics) {
      const date = new Date(content.publishedAt);
      let key: string;

      switch (granularity) {
        case 'daily':
          key = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(content);
    }

    // Convert to trend data
    const trends: Array<{
      date: string;
      contentCount: number;
      totalEngagement: number;
      averageEngagementRate: number;
      reach: number;
      platformBreakdown: Record<Platform, number>;
    }> = [];

    for (const [date, contents] of groups) {
      const totalEngagement = contents.reduce((sum, c) => 
        sum + c.metrics.likes + c.metrics.comments + c.metrics.shares, 0
      );
      
      const averageEngagementRate = contents.reduce((sum, c) => sum + c.metrics.engagementRate, 0) / contents.length;
      const reach = contents.reduce((sum, c) => sum + c.metrics.reach, 0);

      // Platform breakdown
      const platformBreakdown: Record<Platform, number> = {};
      for (const content of contents) {
        platformBreakdown[content.platform] = (platformBreakdown[content.platform] || 0) + 1;
      }

      trends.push({
        date,
        contentCount: contents.length,
        totalEngagement,
        averageEngagementRate,
        reach,
        platformBreakdown
      });
    }

    return trends.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Generate competitor insights
   */
  private generateCompetitorInsights(
    brandPerformance: { engagementRate: number; contentVolume: number; reach: number },
    competitorComparisons: Array<{ competitor: string; engagementRate: number; performanceGap: number }>
  ): string[] {
    const insights: string[] = [];

    const outperformingCompetitors = competitorComparisons.filter(c => c.performanceGap < 0);
    const underperformingCompetitors = competitorComparisons.filter(c => c.performanceGap > 0);

    if (outperformingCompetitors.length > 0) {
      insights.push(`Outperforming ${outperformingCompetitors.length} competitor(s) in engagement rate`);
    }

    if (underperformingCompetitors.length > 0) {
      const topCompetitor = underperformingCompetitors.reduce((top, current) => 
        current.engagementRate > top.engagementRate ? current : top
      );
      insights.push(`${topCompetitor.competitor} leads in engagement with ${(topCompetitor.engagementRate * 100).toFixed(2)}% rate`);
    }

    if (brandPerformance.contentVolume < 10) {
      insights.push('Consider increasing content volume to improve competitive positioning');
    }

    return insights;
  }
}