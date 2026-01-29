/**
 * Performance Report Generator
 * Generates performance reports with actionable recommendations and benchmark comparisons
 */

import { 
  PerformanceReport, 
  ContentPerformance,
  TopPerformingContent,
  AudienceInsights,
  IndustryBenchmark,
  PerformanceReportSchema
} from './types';
import { Platform, ContentType } from '../types/core';
import { BrandContextService } from '../brand/BrandContextService';
import { EngagementMetricsTracker } from './EngagementMetricsTracker';
import { AudienceInsightsService } from './AudienceInsightsService';

export interface BenchmarkProvider {
  getIndustryBenchmarks(industry: string): Promise<IndustryBenchmark[]>;
  getCompetitorData(brandId: string): Promise<Array<{
    competitor: string;
    metric: string;
    value: number;
  }>>;
}

export interface HistoricalDataProvider {
  getPreviousPeriodData(
    brandId: string,
    currentPeriod: { start: Date; end: Date },
    periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  ): Promise<{
    engagementRate: number;
    reach: number;
    contentVolume: number;
  }>;
}

export class PerformanceReportGenerator {
  constructor(
    private brandContextService: BrandContextService,
    private engagementMetricsTracker: EngagementMetricsTracker,
    private audienceInsightsService: AudienceInsightsService,
    private benchmarkProvider: BenchmarkProvider,
    private historicalDataProvider: HistoricalDataProvider
  ) {}

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
      // Validate brand context
      const brandContext = await this.brandContextService.getBrandContext(brandId);
      if (!brandContext) {
        throw new Error(`Brand context not found for brandId: ${brandId}`);
      }

      // Calculate time range based on report type
      const analysisTimeRange = timeRange || this.calculateTimeRange(reportType);

      // Get content performance data
      const contentPerformances = await this.engagementMetricsTracker.getContentMetricsInRange(
        brandId,
        analysisTimeRange.start,
        analysisTimeRange.end
      );

      // Get top performing content
      const topPerformingContent = await this.engagementMetricsTracker.getTopPerformingContent(
        brandId,
        {
          brandId,
          timeRange: {
            start: analysisTimeRange.start.toISOString(),
            end: analysisTimeRange.end.toISOString()
          }
        },
        10
      );

      // Get audience insights
      const audienceInsights = await this.audienceInsightsService.getAudienceInsights(
        brandId,
        undefined,
        analysisTimeRange
      );

      // Generate summary metrics
      const summary = this.generateSummary(contentPerformances);

      // Generate platform breakdown
      const platformBreakdown = this.generatePlatformBreakdown(contentPerformances);

      // Generate recommendations
      const recommendations = await this.generateRecommendations(
        contentPerformances,
        topPerformingContent,
        audienceInsights,
        brandContext
      );

      // Get benchmark comparisons
      const benchmarkComparisons = await this.generateBenchmarkComparisons(
        brandId,
        contentPerformances,
        analysisTimeRange,
        reportType
      );

      const report: PerformanceReport = {
        brandId,
        reportType,
        timeRange: {
          start: analysisTimeRange.start.toISOString(),
          end: analysisTimeRange.end.toISOString()
        },
        generatedAt: new Date().toISOString(),
        summary,
        platformBreakdown,
        topPerformingContent,
        audienceInsights,
        recommendations,
        benchmarkComparisons
      };

      return PerformanceReportSchema.parse(report);
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
    industryBenchmarks: IndustryBenchmark[];
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
      // Get brand performance data
      const contentPerformances = await this.engagementMetricsTracker.getContentMetricsInRange(
        brandId,
        timeRange.start,
        timeRange.end
      );

      const brandPerformance = {
        engagementRate: this.calculateAverageEngagementRate(contentPerformances),
        reach: this.calculateTotalReach(contentPerformances),
        contentVolume: contentPerformances.length
      };

      // Get industry benchmarks
      const industryBenchmarks = await this.benchmarkProvider.getIndustryBenchmarks(industry);

      // Generate comparisons
      const comparisons = this.generateBenchmarkComparisons(brandPerformance, industryBenchmarks);

      // Generate benchmark-specific recommendations
      const recommendations = this.generateBenchmarkRecommendations(comparisons);

      return {
        brandPerformance,
        industryBenchmarks,
        comparisons,
        recommendations
      };
    } catch (error) {
      console.error('Error generating benchmark report:', error);
      throw new Error(`Failed to generate benchmark report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate automated report scheduling
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
      // Calculate next run date based on report type
      const nextRunDate = this.calculateNextRunDate(reportType);
      
      // Generate unique schedule ID
      const scheduleId = `${brandId}_${reportType}_${Date.now()}`;

      // In a real implementation, this would save to a job scheduler
      console.log(`Scheduled ${reportType} report for brand ${brandId}`, {
        scheduleId,
        nextRunDate,
        recipients,
        enabled
      });

      return {
        scheduleId,
        nextRunDate,
        frequency: reportType
      };
    } catch (error) {
      console.error('Error scheduling report:', error);
      throw new Error(`Failed to schedule report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate executive summary report
   */
  async generateExecutiveSummary(
    brandId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<{
    keyMetrics: {
      totalEngagement: number;
      engagementGrowth: number;
      reachGrowth: number;
      topPlatform: Platform;
      contentEfficiency: number;
    };
    highlights: string[];
    concerns: string[];
    priorities: Array<{
      priority: string;
      impact: 'high' | 'medium' | 'low';
      effort: 'high' | 'medium' | 'low';
      timeline: string;
    }>;
  }> {
    try {
      // Get current period data
      const contentPerformances = await this.engagementMetricsTracker.getContentMetricsInRange(
        brandId,
        timeRange.start,
        timeRange.end
      );

      // Get previous period for comparison
      const previousPeriodData = await this.historicalDataProvider.getPreviousPeriodData(
        brandId,
        timeRange,
        'monthly'
      );

      // Calculate key metrics
      const totalEngagement = contentPerformances.reduce((sum, content) => 
        sum + content.metrics.likes + content.metrics.comments + content.metrics.shares, 0
      );
      
      const currentEngagementRate = this.calculateAverageEngagementRate(contentPerformances);
      const engagementGrowth = ((currentEngagementRate - previousPeriodData.engagementRate) / 
                               previousPeriodData.engagementRate) * 100;

      const currentReach = this.calculateTotalReach(contentPerformances);
      const reachGrowth = ((currentReach - previousPeriodData.reach) / previousPeriodData.reach) * 100;

      const topPlatform = this.getTopPerformingPlatform(contentPerformances);
      const contentEfficiency = totalEngagement / Math.max(contentPerformances.length, 1);

      const keyMetrics = {
        totalEngagement,
        engagementGrowth,
        reachGrowth,
        topPlatform,
        contentEfficiency
      };

      // Generate highlights and concerns
      const highlights = this.generateHighlights(keyMetrics, contentPerformances);
      const concerns = this.generateConcerns(keyMetrics, contentPerformances);
      const priorities = this.generatePriorities(keyMetrics, contentPerformances);

      return {
        keyMetrics,
        highlights,
        concerns,
        priorities
      };
    } catch (error) {
      console.error('Error generating executive summary:', error);
      throw new Error(`Failed to generate executive summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate time range based on report type
   */
  private calculateTimeRange(reportType: 'daily' | 'weekly' | 'monthly' | 'quarterly'): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    switch (reportType) {
      case 'daily':
        start.setDate(end.getDate() - 1);
        break;
      case 'weekly':
        start.setDate(end.getDate() - 7);
        break;
      case 'monthly':
        start.setMonth(end.getMonth() - 1);
        break;
      case 'quarterly':
        start.setMonth(end.getMonth() - 3);
        break;
    }

    return { start, end };
  }

  /**
   * Generate summary metrics
   */
  private generateSummary(contentPerformances: ContentPerformance[]) {
    if (contentPerformances.length === 0) {
      return {
        totalContent: 0,
        totalEngagement: 0,
        averageEngagementRate: 0,
        totalReach: 0,
        topPlatform: Platform.INSTAGRAM,
        bestPerformingContentType: ContentType.IMAGE
      };
    }

    const totalEngagement = contentPerformances.reduce((sum, content) => 
      sum + content.metrics.likes + content.metrics.comments + content.metrics.shares, 0
    );

    const averageEngagementRate = contentPerformances.reduce((sum, content) => 
      sum + content.metrics.engagementRate, 0
    ) / contentPerformances.length;

    const totalReach = contentPerformances.reduce((sum, content) => sum + content.metrics.reach, 0);

    const topPlatform = this.getTopPerformingPlatform(contentPerformances);
    const bestPerformingContentType = this.getBestPerformingContentType(contentPerformances);

    return {
      totalContent: contentPerformances.length,
      totalEngagement,
      averageEngagementRate,
      totalReach,
      topPlatform,
      bestPerformingContentType
    };
  }

  /**
   * Generate platform breakdown
   */
  private generatePlatformBreakdown(contentPerformances: ContentPerformance[]) {
    const platformData = new Map<Platform, {
      contentCount: number;
      totalEngagement: number;
      totalReach: number;
      engagementRates: number[];
      contentTypes: Map<ContentType, number>;
    }>();

    // Aggregate data by platform
    for (const content of contentPerformances) {
      if (!platformData.has(content.platform)) {
        platformData.set(content.platform, {
          contentCount: 0,
          totalEngagement: 0,
          totalReach: 0,
          engagementRates: [],
          contentTypes: new Map()
        });
      }

      const data = platformData.get(content.platform)!;
      data.contentCount++;
      data.totalEngagement += content.metrics.likes + content.metrics.comments + content.metrics.shares;
      data.totalReach += content.metrics.reach;
      data.engagementRates.push(content.metrics.engagementRate);

      const currentCount = data.contentTypes.get(content.contentType) || 0;
      data.contentTypes.set(content.contentType, currentCount + 1);
    }

    // Convert to report format
    const breakdown: Record<Platform, any> = {};
    for (const [platform, data] of platformData) {
      const averageEngagementRate = data.engagementRates.reduce((sum, rate) => sum + rate, 0) / 
                                   data.engagementRates.length;
      
      const topContentType = Array.from(data.contentTypes.entries())
        .sort(([,a], [,b]) => b - a)[0]?.[0] || ContentType.IMAGE;

      breakdown[platform] = {
        contentCount: data.contentCount,
        totalEngagement: data.totalEngagement,
        averageEngagementRate,
        reach: data.totalReach,
        topContentType
      };
    }

    return breakdown;
  }

  /**
   * Generate actionable recommendations
   */
  private async generateRecommendations(
    contentPerformances: ContentPerformance[],
    topPerformingContent: TopPerformingContent[],
    audienceInsights: AudienceInsights,
    brandContext: any
  ) {
    const recommendations: Array<{
      category: 'content' | 'timing' | 'platform' | 'audience';
      priority: 'high' | 'medium' | 'low';
      recommendation: string;
      expectedImpact: string;
      actionItems: string[];
    }> = [];

    // Content recommendations
    if (topPerformingContent.length > 0) {
      const commonSuccessFactors = this.findCommonSuccessFactors(topPerformingContent);
      if (commonSuccessFactors.length > 0) {
        recommendations.push({
          category: 'content',
          priority: 'high',
          recommendation: `Focus on content with these success factors: ${commonSuccessFactors.join(', ')}`,
          expectedImpact: 'Increase engagement rate by 15-25%',
          actionItems: [
            'Analyze top-performing content patterns',
            'Create content templates based on successful formats',
            'Train content creators on identified success factors'
          ]
        });
      }
    }

    // Timing recommendations
    const peakHours = audienceInsights.behaviorPatterns.peakEngagementHours;
    if (peakHours.length > 0) {
      recommendations.push({
        category: 'timing',
        priority: 'medium',
        recommendation: `Optimize posting times to align with peak audience activity (${peakHours.slice(0, 3).join(', ')}:00)`,
        expectedImpact: 'Increase reach by 10-20%',
        actionItems: [
          'Schedule content during peak engagement hours',
          'Test different posting times for each platform',
          'Monitor engagement patterns weekly'
        ]
      });
    }

    // Platform recommendations
    const platformPerformance = this.analyzePlatformPerformance(contentPerformances);
    const underperformingPlatforms = platformPerformance.filter(p => p.performance < 0.5);
    
    if (underperformingPlatforms.length > 0) {
      recommendations.push({
        category: 'platform',
        priority: 'medium',
        recommendation: `Improve performance on ${underperformingPlatforms.map(p => p.platform).join(', ')}`,
        expectedImpact: 'Increase overall brand reach by 5-15%',
        actionItems: [
          'Research platform-specific best practices',
          'Adapt content formats for each platform',
          'Increase posting frequency on underperforming platforms'
        ]
      });
    }

    // Audience recommendations
    const topInterests = audienceInsights.interests.slice(0, 3);
    if (topInterests.length > 0) {
      recommendations.push({
        category: 'audience',
        priority: 'high',
        recommendation: `Create more content around top audience interests: ${topInterests.map(i => i.topic).join(', ')}`,
        expectedImpact: 'Increase engagement rate by 20-30%',
        actionItems: [
          'Develop content calendar around top interests',
          'Create educational content on relevant topics',
          'Engage with trending conversations in these areas'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Generate benchmark comparisons
   */
  private async generateBenchmarkComparisons(
    brandId: string,
    contentPerformances: ContentPerformance[],
    timeRange: { start: Date; end: Date },
    reportType: string
  ) {
    try {
      // Get historical data for comparison
      const previousPeriodData = await this.historicalDataProvider.getPreviousPeriodData(
        brandId,
        timeRange,
        reportType as any
      );

      // Calculate current period metrics
      const currentEngagementRate = this.calculateAverageEngagementRate(contentPerformances);
      const currentReach = this.calculateTotalReach(contentPerformances);
      const currentContentVolume = contentPerformances.length;

      // Calculate percentage changes
      const engagementRateChange = ((currentEngagementRate - previousPeriodData.engagementRate) / 
                                   previousPeriodData.engagementRate) * 100;
      const reachChange = ((currentReach - previousPeriodData.reach) / previousPeriodData.reach) * 100;
      const contentVolumeChange = ((currentContentVolume - previousPeriodData.contentVolume) / 
                                  previousPeriodData.contentVolume) * 100;

      return {
        industryBenchmarks: {}, // Would be populated with actual industry data
        competitorComparisons: [], // Would be populated with competitor data
        historicalComparison: {
          previousPeriod: previousPeriodData,
          changePercentage: {
            engagementRate: engagementRateChange,
            reach: reachChange,
            contentVolume: contentVolumeChange
          }
        }
      };
    } catch (error) {
      console.warn('Error generating benchmark comparisons:', error);
      return {
        industryBenchmarks: {},
        competitorComparisons: [],
        historicalComparison: {
          previousPeriod: {
            engagementRate: 0,
            reach: 0,
            contentVolume: 0
          },
          changePercentage: {
            engagementRate: 0,
            reach: 0,
            contentVolume: 0
          }
        }
      };
    }
  }

  /**
   * Helper methods
   */
  private calculateAverageEngagementRate(contentPerformances: ContentPerformance[]): number {
    if (contentPerformances.length === 0) return 0;
    return contentPerformances.reduce((sum, content) => sum + content.metrics.engagementRate, 0) / 
           contentPerformances.length;
  }

  private calculateTotalReach(contentPerformances: ContentPerformance[]): number {
    return contentPerformances.reduce((sum, content) => sum + content.metrics.reach, 0);
  }

  private getTopPerformingPlatform(contentPerformances: ContentPerformance[]): Platform {
    const platformEngagement = new Map<Platform, number>();
    
    for (const content of contentPerformances) {
      const current = platformEngagement.get(content.platform) || 0;
      platformEngagement.set(content.platform, current + content.metrics.engagementRate);
    }

    let topPlatform = Platform.INSTAGRAM;
    let maxEngagement = 0;
    
    for (const [platform, engagement] of platformEngagement) {
      if (engagement > maxEngagement) {
        maxEngagement = engagement;
        topPlatform = platform;
      }
    }

    return topPlatform;
  }

  private getBestPerformingContentType(contentPerformances: ContentPerformance[]): ContentType {
    const typeEngagement = new Map<ContentType, number>();
    
    for (const content of contentPerformances) {
      const current = typeEngagement.get(content.contentType) || 0;
      typeEngagement.set(content.contentType, current + content.metrics.engagementRate);
    }

    let topType = ContentType.IMAGE;
    let maxEngagement = 0;
    
    for (const [type, engagement] of typeEngagement) {
      if (engagement > maxEngagement) {
        maxEngagement = engagement;
        topType = type;
      }
    }

    return topType;
  }

  private findCommonSuccessFactors(topPerformingContent: TopPerformingContent[]): string[] {
    const factorCounts = new Map<string, number>();
    
    for (const content of topPerformingContent) {
      for (const factor of content.successFactors) {
        factorCounts.set(factor, (factorCounts.get(factor) || 0) + 1);
      }
    }

    // Return factors that appear in at least 50% of top content
    const threshold = Math.ceil(topPerformingContent.length * 0.5);
    return Array.from(factorCounts.entries())
      .filter(([, count]) => count >= threshold)
      .map(([factor]) => factor);
  }

  private analyzePlatformPerformance(contentPerformances: ContentPerformance[]) {
    const platformData = new Map<Platform, { total: number; count: number }>();
    
    for (const content of contentPerformances) {
      if (!platformData.has(content.platform)) {
        platformData.set(content.platform, { total: 0, count: 0 });
      }
      const data = platformData.get(content.platform)!;
      data.total += content.metrics.engagementRate;
      data.count++;
    }

    return Array.from(platformData.entries()).map(([platform, data]) => ({
      platform,
      performance: data.total / data.count
    }));
  }

  private calculateNextRunDate(reportType: 'daily' | 'weekly' | 'monthly' | 'quarterly'): Date {
    const nextRun = new Date();
    
    switch (reportType) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + 7);
        break;
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1);
        break;
      case 'quarterly':
        nextRun.setMonth(nextRun.getMonth() + 3);
        break;
    }

    return nextRun;
  }

  private generateBenchmarkComparisons(
    brandPerformance: { engagementRate: number; reach: number; contentVolume: number },
    industryBenchmarks: IndustryBenchmark[]
  ) {
    const comparisons: Array<{
      metric: string;
      brandValue: number;
      industryAverage: number;
      percentageDifference: number;
      performance: 'above' | 'below' | 'at' | 'no_data';
    }> = [];

    // Group benchmarks by metric
    const benchmarksByMetric = new Map<string, number[]>();
    
    for (const benchmark of industryBenchmarks) {
      if (!benchmarksByMetric.has('engagementRate')) {
        benchmarksByMetric.set('engagementRate', []);
      }
      benchmarksByMetric.get('engagementRate')!.push(benchmark.metrics.averageEngagementRate);
    }

    // Calculate comparisons
    for (const [metric, values] of benchmarksByMetric) {
      if (values.length === 0) continue;
      
      const industryAverage = values.reduce((sum, val) => sum + val, 0) / values.length;
      let brandValue = 0;
      
      switch (metric) {
        case 'engagementRate':
          brandValue = brandPerformance.engagementRate;
          break;
      }

      const percentageDifference = ((brandValue - industryAverage) / industryAverage) * 100;
      let performance: 'above' | 'below' | 'at' | 'no_data';
      
      if (Math.abs(percentageDifference) < 5) {
        performance = 'at';
      } else if (percentageDifference > 0) {
        performance = 'above';
      } else {
        performance = 'below';
      }

      comparisons.push({
        metric,
        brandValue,
        industryAverage,
        percentageDifference,
        performance
      });
    }

    return comparisons;
  }

  private generateBenchmarkRecommendations(comparisons: Array<{
    metric: string;
    performance: 'above' | 'below' | 'at' | 'no_data';
    percentageDifference: number;
  }>): string[] {
    const recommendations: string[] = [];

    for (const comparison of comparisons) {
      if (comparison.performance === 'below' && Math.abs(comparison.percentageDifference) > 10) {
        switch (comparison.metric) {
          case 'engagementRate':
            recommendations.push('Focus on creating more engaging content with stronger calls-to-action');
            break;
        }
      }
    }

    return recommendations;
  }

  private generateHighlights(keyMetrics: any, contentPerformances: ContentPerformance[]): string[] {
    const highlights: string[] = [];

    if (keyMetrics.engagementGrowth > 10) {
      highlights.push(`Engagement rate increased by ${keyMetrics.engagementGrowth.toFixed(1)}%`);
    }
    
    if (keyMetrics.reachGrowth > 15) {
      highlights.push(`Reach expanded by ${keyMetrics.reachGrowth.toFixed(1)}%`);
    }

    if (keyMetrics.contentEfficiency > 100) {
      highlights.push(`High content efficiency with ${keyMetrics.contentEfficiency.toFixed(0)} average engagements per post`);
    }

    return highlights;
  }

  private generateConcerns(keyMetrics: any, contentPerformances: ContentPerformance[]): string[] {
    const concerns: string[] = [];

    if (keyMetrics.engagementGrowth < -10) {
      concerns.push(`Engagement rate declined by ${Math.abs(keyMetrics.engagementGrowth).toFixed(1)}%`);
    }
    
    if (keyMetrics.reachGrowth < -15) {
      concerns.push(`Reach decreased by ${Math.abs(keyMetrics.reachGrowth).toFixed(1)}%`);
    }

    if (contentPerformances.length < 5) {
      concerns.push('Low content volume may be limiting growth potential');
    }

    return concerns;
  }

  private generatePriorities(keyMetrics: any, contentPerformances: ContentPerformance[]) {
    const priorities: Array<{
      priority: string;
      impact: 'high' | 'medium' | 'low';
      effort: 'high' | 'medium' | 'low';
      timeline: string;
    }> = [];

    if (keyMetrics.engagementGrowth < 0) {
      priorities.push({
        priority: 'Improve content engagement strategies',
        impact: 'high',
        effort: 'medium',
        timeline: '2-4 weeks'
      });
    }

    if (contentPerformances.length < 10) {
      priorities.push({
        priority: 'Increase content production volume',
        impact: 'medium',
        effort: 'high',
        timeline: '4-8 weeks'
      });
    }

    return priorities;
  }
}