/**
 * Audience Insights Service
 * Provides insights on audience demographics and behavior patterns
 */

import { 
  AudienceInsights, 
  ContentPerformance,
  SentimentTrend,
  AudienceInsightsSchema,
  SentimentTrendSchema
} from './types';
import { Platform, ContentType, SocialEvent } from '../types/core';
import { BrandContextService } from '../brand/BrandContextService';

export interface AudienceDataProvider {
  getAudienceDemographics(brandId: string, platform?: Platform): Promise<{
    ageGroups: Record<string, { count: number; engagementRate: number }>;
    genderBreakdown: Record<string, { count: number; engagementRate: number }>;
    topLocations: Array<{ location: string; count: number; engagementRate: number }>;
  }>;
  
  getBehaviorPatterns(brandId: string, platform?: Platform): Promise<{
    peakEngagementHours: number[];
    contentTypePreferences: Array<{ type: ContentType; score: number }>;
    averageSessionDuration: number;
    contentConsumptionRate: number;
  }>;
  
  getAudienceInterests(brandId: string, platform?: Platform): Promise<Array<{
    topic: string;
    relevance: number;
    engagementLevel: number;
  }>>;
}

export interface SentimentDataProvider {
  getBrandMentions(
    brandId: string, 
    timeRange: { start: Date; end: Date },
    platforms?: Platform[]
  ): Promise<Array<{
    timestamp: string;
    platform: Platform;
    sentimentScore: number;
    topics: string[];
    mentionCount: number;
  }>>;
  
  getSignificantEvents(
    brandId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<Array<{
    timestamp: string;
    event: string;
    impact: number;
    description: string;
  }>>;
}

export class AudienceInsightsService {
  constructor(
    private brandContextService: BrandContextService,
    private audienceDataProvider: AudienceDataProvider,
    private sentimentDataProvider: SentimentDataProvider
  ) {}

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
      // Validate brand context
      const brandContext = await this.brandContextService.getBrandContext(brandId);
      if (!brandContext) {
        throw new Error(`Brand context not found for brandId: ${brandId}`);
      }

      // Set default time range if not provided (last 30 days)
      const defaultTimeRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      };
      const analysisTimeRange = timeRange || defaultTimeRange;

      // Get audience demographics
      const demographicsData = await this.audienceDataProvider.getAudienceDemographics(brandId, platform);
      
      // Convert demographics to insights format
      const demographics = {
        ageGroups: this.convertToPercentageFormat(demographicsData.ageGroups),
        genderBreakdown: this.convertToPercentageFormat(demographicsData.genderBreakdown),
        topLocations: demographicsData.topLocations.map(loc => ({
          location: loc.location,
          percentage: this.calculatePercentage(loc.count, this.getTotalCount(demographicsData.ageGroups)),
          engagementRate: loc.engagementRate
        }))
      };

      // Get behavior patterns
      const behaviorData = await this.audienceDataProvider.getBehaviorPatterns(brandId, platform);
      
      const behaviorPatterns = {
        peakEngagementHours: behaviorData.peakEngagementHours,
        preferredContentTypes: behaviorData.contentTypePreferences.map(pref => ({
          type: pref.type,
          preference: pref.score
        })),
        averageSessionDuration: behaviorData.averageSessionDuration,
        contentConsumptionRate: behaviorData.contentConsumptionRate
      };

      // Get audience interests
      const interests = await this.audienceDataProvider.getAudienceInterests(brandId, platform);

      const insights: AudienceInsights = {
        brandId,
        platform,
        timeRange: {
          start: analysisTimeRange.start.toISOString(),
          end: analysisTimeRange.end.toISOString()
        },
        demographics,
        behaviorPatterns,
        interests
      };

      return AudienceInsightsSchema.parse(insights);
    } catch (error) {
      console.error('Error getting audience insights:', error);
      throw new Error(`Failed to get audience insights: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      // Validate brand context
      const brandContext = await this.brandContextService.getBrandContext(brandId);
      if (!brandContext) {
        throw new Error(`Brand context not found for brandId: ${brandId}`);
      }

      // Get brand mentions with sentiment data
      const mentions = await this.sentimentDataProvider.getBrandMentions(
        brandId, 
        timeRange, 
        platforms
      );

      // Get significant events that might have impacted sentiment
      const significantEvents = await this.sentimentDataProvider.getSignificantEvents(
        brandId,
        timeRange
      );

      // Process mentions into data points
      const dataPoints = mentions.map(mention => ({
        timestamp: mention.timestamp,
        sentimentScore: mention.sentimentScore,
        mentionCount: mention.mentionCount,
        platform: mention.platform,
        topics: mention.topics
      }));

      // Calculate overall trend
      const { overallTrend, trendStrength } = this.calculateSentimentTrend(dataPoints);

      const sentimentTrend: SentimentTrend = {
        brandId,
        timeRange: {
          start: timeRange.start.toISOString(),
          end: timeRange.end.toISOString()
        },
        dataPoints,
        overallTrend,
        trendStrength,
        significantEvents
      };

      return SentimentTrendSchema.parse(sentimentTrend);
    } catch (error) {
      console.error('Error getting sentiment trends:', error);
      throw new Error(`Failed to get sentiment trends: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get audience insights for multiple platforms
   */
  async getMultiPlatformAudienceInsights(
    brandId: string,
    platforms: Platform[],
    timeRange?: { start: Date; end: Date }
  ): Promise<Map<Platform, AudienceInsights>> {
    try {
      const insights = new Map<Platform, AudienceInsights>();

      // Get insights for each platform
      for (const platform of platforms) {
        try {
          const platformInsights = await this.getAudienceInsights(brandId, platform, timeRange);
          insights.set(platform, platformInsights);
        } catch (error) {
          console.warn(`Failed to get insights for platform ${platform}:`, error);
          // Continue with other platforms
        }
      }

      return insights;
    } catch (error) {
      console.error('Error getting multi-platform audience insights:', error);
      throw new Error(`Failed to get multi-platform insights: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compare audience insights across time periods
   */
  async compareAudienceInsights(
    brandId: string,
    currentPeriod: { start: Date; end: Date },
    previousPeriod: { start: Date; end: Date },
    platform?: Platform
  ): Promise<{
    current: AudienceInsights;
    previous: AudienceInsights;
    changes: {
      demographicShifts: Array<{
        metric: string;
        change: number;
        significance: 'high' | 'medium' | 'low';
      }>;
      behaviorChanges: Array<{
        metric: string;
        change: number;
        significance: 'high' | 'medium' | 'low';
      }>;
      interestShifts: Array<{
        topic: string;
        relevanceChange: number;
        engagementChange: number;
      }>;
    };
  }> {
    try {
      // Get insights for both periods
      const [currentInsights, previousInsights] = await Promise.all([
        this.getAudienceInsights(brandId, platform, currentPeriod),
        this.getAudienceInsights(brandId, platform, previousPeriod)
      ]);

      // Calculate changes
      const changes = {
        demographicShifts: this.calculateDemographicShifts(currentInsights, previousInsights),
        behaviorChanges: this.calculateBehaviorChanges(currentInsights, previousInsights),
        interestShifts: this.calculateInterestShifts(currentInsights, previousInsights)
      };

      return {
        current: currentInsights,
        previous: previousInsights,
        changes
      };
    } catch (error) {
      console.error('Error comparing audience insights:', error);
      throw new Error(`Failed to compare audience insights: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get audience segment analysis
   */
  async getAudienceSegmentAnalysis(
    brandId: string,
    platform?: Platform
  ): Promise<Array<{
    segmentName: string;
    size: number;
    characteristics: Record<string, any>;
    engagementRate: number;
    preferredContentTypes: ContentType[];
    recommendedStrategy: string;
  }>> {
    try {
      const insights = await this.getAudienceInsights(brandId, platform);
      
      // Create audience segments based on demographics and behavior
      const segments: Array<{
        segmentName: string;
        size: number;
        characteristics: Record<string, any>;
        engagementRate: number;
        preferredContentTypes: ContentType[];
        recommendedStrategy: string;
      }> = [];

      // Young Engaged Segment (18-24, high engagement)
      const youngEngagedSize = this.getAgeGroupSize(insights.demographics.ageGroups, '18-24');
      if (youngEngagedSize > 0) {
        segments.push({
          segmentName: 'Young Engaged',
          size: youngEngagedSize,
          characteristics: {
            ageRange: '18-24',
            engagementStyle: 'high-interaction',
            preferredTimes: insights.behaviorPatterns.peakEngagementHours.slice(0, 3)
          },
          engagementRate: insights.demographics.ageGroups['18-24']?.engagementRate || 0,
          preferredContentTypes: [ContentType.VIDEO, ContentType.IMAGE],
          recommendedStrategy: 'Create trendy, visually appealing content with strong calls-to-action'
        });
      }

      // Professional Segment (25-44, moderate engagement)
      const professionalSize = this.getAgeGroupSize(insights.demographics.ageGroups, '25-34') +
                              this.getAgeGroupSize(insights.demographics.ageGroups, '35-44');
      if (professionalSize > 0) {
        segments.push({
          segmentName: 'Professional',
          size: professionalSize,
          characteristics: {
            ageRange: '25-44',
            engagementStyle: 'value-focused',
            preferredTimes: insights.behaviorPatterns.peakEngagementHours.filter(h => h >= 9 && h <= 17)
          },
          engagementRate: (
            (insights.demographics.ageGroups['25-34']?.engagementRate || 0) +
            (insights.demographics.ageGroups['35-44']?.engagementRate || 0)
          ) / 2,
          preferredContentTypes: [ContentType.TEXT, ContentType.IMAGE],
          recommendedStrategy: 'Focus on educational and professional development content'
        });
      }

      return segments;
    } catch (error) {
      console.error('Error getting audience segment analysis:', error);
      throw new Error(`Failed to get audience segment analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Helper method to convert count data to percentage format
   */
  private convertToPercentageFormat(
    data: Record<string, { count: number; engagementRate: number }>
  ): Record<string, { percentage: number; engagementRate: number }> {
    const total = this.getTotalCount(data);
    const result: Record<string, { percentage: number; engagementRate: number }> = {};
    
    for (const [key, value] of Object.entries(data)) {
      result[key] = {
        percentage: this.calculatePercentage(value.count, total),
        engagementRate: value.engagementRate
      };
    }
    
    return result;
  }

  /**
   * Helper method to get total count from demographic data
   */
  private getTotalCount(data: Record<string, { count: number; engagementRate: number }>): number {
    return Object.values(data).reduce((sum, item) => sum + item.count, 0);
  }

  /**
   * Helper method to calculate percentage
   */
  private calculatePercentage(count: number, total: number): number {
    return total > 0 ? Math.round((count / total) * 100 * 100) / 100 : 0;
  }

  /**
   * Calculate sentiment trend direction and strength
   */
  private calculateSentimentTrend(
    dataPoints: Array<{ timestamp: string; sentimentScore: number; mentionCount: number }>
  ): { overallTrend: 'improving' | 'declining' | 'stable'; trendStrength: number } {
    if (dataPoints.length < 2) {
      return { overallTrend: 'stable', trendStrength: 0 };
    }

    // Sort by timestamp
    const sortedPoints = dataPoints.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Calculate trend using linear regression
    const n = sortedPoints.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    sortedPoints.forEach((point, index) => {
      const x = index;
      const y = point.sentimentScore;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const trendStrength = Math.abs(slope);

    let overallTrend: 'improving' | 'declining' | 'stable';
    if (slope > 0.01) {
      overallTrend = 'improving';
    } else if (slope < -0.01) {
      overallTrend = 'declining';
    } else {
      overallTrend = 'stable';
    }

    return { overallTrend, trendStrength: Math.min(trendStrength, 1) };
  }

  /**
   * Calculate demographic shifts between periods
   */
  private calculateDemographicShifts(
    current: AudienceInsights,
    previous: AudienceInsights
  ): Array<{ metric: string; change: number; significance: 'high' | 'medium' | 'low' }> {
    const shifts: Array<{ metric: string; change: number; significance: 'high' | 'medium' | 'low' }> = [];

    // Compare age groups
    for (const [ageGroup, currentData] of Object.entries(current.demographics.ageGroups)) {
      const previousData = previous.demographics.ageGroups[ageGroup];
      if (previousData) {
        const change = currentData.percentage - previousData.percentage;
        const significance = Math.abs(change) > 10 ? 'high' : Math.abs(change) > 5 ? 'medium' : 'low';
        
        shifts.push({
          metric: `age_group_${ageGroup}`,
          change,
          significance
        });
      }
    }

    return shifts;
  }

  /**
   * Calculate behavior changes between periods
   */
  private calculateBehaviorChanges(
    current: AudienceInsights,
    previous: AudienceInsights
  ): Array<{ metric: string; change: number; significance: 'high' | 'medium' | 'low' }> {
    const changes: Array<{ metric: string; change: number; significance: 'high' | 'medium' | 'low' }> = [];

    // Compare session duration
    const sessionDurationChange = current.behaviorPatterns.averageSessionDuration - 
                                 previous.behaviorPatterns.averageSessionDuration;
    changes.push({
      metric: 'average_session_duration',
      change: sessionDurationChange,
      significance: Math.abs(sessionDurationChange) > 60 ? 'high' : 
                   Math.abs(sessionDurationChange) > 30 ? 'medium' : 'low'
    });

    // Compare consumption rate
    const consumptionRateChange = current.behaviorPatterns.contentConsumptionRate - 
                                 previous.behaviorPatterns.contentConsumptionRate;
    changes.push({
      metric: 'content_consumption_rate',
      change: consumptionRateChange,
      significance: Math.abs(consumptionRateChange) > 0.5 ? 'high' : 
                   Math.abs(consumptionRateChange) > 0.2 ? 'medium' : 'low'
    });

    return changes;
  }

  /**
   * Calculate interest shifts between periods
   */
  private calculateInterestShifts(
    current: AudienceInsights,
    previous: AudienceInsights
  ): Array<{ topic: string; relevanceChange: number; engagementChange: number }> {
    const shifts: Array<{ topic: string; relevanceChange: number; engagementChange: number }> = [];

    // Create maps for easier lookup
    const currentInterests = new Map(current.interests.map(i => [i.topic, i]));
    const previousInterests = new Map(previous.interests.map(i => [i.topic, i]));

    // Compare common topics
    for (const [topic, currentData] of currentInterests) {
      const previousData = previousInterests.get(topic);
      if (previousData) {
        shifts.push({
          topic,
          relevanceChange: currentData.relevance - previousData.relevance,
          engagementChange: currentData.engagementLevel - previousData.engagementLevel
        });
      }
    }

    return shifts;
  }

  /**
   * Helper to get age group size from demographics
   */
  private getAgeGroupSize(
    ageGroups: Record<string, { percentage: number; engagementRate: number }>,
    ageGroup: string
  ): number {
    return ageGroups[ageGroup]?.percentage || 0;
  }
}