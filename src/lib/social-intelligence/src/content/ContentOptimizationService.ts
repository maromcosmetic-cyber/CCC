/**
 * Content Optimization and Reuse Service
 * Suggests optimal posting times, identifies reuse opportunities, and validates content
 */

import { 
  ContentOptimization, 
  OptimalTiming, 
  ReuseOpportunity, 
  ManagedContent 
} from './types';
import { Platform, BrandPlaybook } from '../types/core';
import { BrandContextService } from '../brand/BrandContextService';
import { ComplianceValidationService } from '../brand/ComplianceValidationService';

interface EngagementAnalyticsService {
  getOptimalPostingTimes(platform: Platform, brandId: string): Promise<OptimalTiming[]>;
  predictContentPerformance(content: ManagedContent, platform: Platform): Promise<{
    expectedViews: number;
    expectedEngagementRate: number;
    confidence: number;
  }>;
  getAudienceActiveHours(platform: Platform, brandId: string): Promise<Array<{
    hour: number;
    dayOfWeek: string;
    engagementLevel: number;
  }>>;
}

interface ContentAnalysisService {
  analyzeContentSimilarity(content1: ManagedContent, content2: ManagedContent): Promise<number>;
  extractContentFeatures(content: ManagedContent): Promise<{
    topics: string[];
    visualStyle: string;
    tone: string;
    complexity: number;
  }>;
  identifySuccessFactors(content: ManagedContent): Promise<string[]>;
}

interface PlatformRequirementsService {
  validatePlatformRequirements(content: ManagedContent, platform: Platform): Promise<{
    isValid: boolean;
    issues: string[];
    adaptationSuggestions: string[];
  }>;
  getPlatformSpecifications(platform: Platform): {
    maxFileSize: number;
    supportedFormats: string[];
    aspectRatios: string[];
    maxDuration?: number;
    maxTextLength?: number;
  };
}

export class ContentOptimizationService {
  private brandContextService: BrandContextService;
  private complianceValidationService: ComplianceValidationService;
  private engagementAnalyticsService: EngagementAnalyticsService;
  private contentAnalysisService: ContentAnalysisService;
  private platformRequirementsService: PlatformRequirementsService;

  constructor(
    brandContextService: BrandContextService,
    complianceValidationService: ComplianceValidationService,
    engagementAnalyticsService: EngagementAnalyticsService,
    contentAnalysisService: ContentAnalysisService,
    platformRequirementsService: PlatformRequirementsService
  ) {
    this.brandContextService = brandContextService;
    this.complianceValidationService = complianceValidationService;
    this.engagementAnalyticsService = engagementAnalyticsService;
    this.contentAnalysisService = contentAnalysisService;
    this.platformRequirementsService = platformRequirementsService;
  }

  /**
   * Generate comprehensive content optimization recommendations
   */
  async optimizeContent(content: ManagedContent): Promise<ContentOptimization> {
    try {
      // Get optimal posting times for all target platforms
      const optimalTiming = await this.getOptimalPostingTimes(content);
      
      // Identify content reuse opportunities
      const reuseOpportunities = await this.identifyReuseOpportunities(content);
      
      // Predict performance across platforms
      const performancePrediction = await this.predictContentPerformance(content);
      
      // Generate optimization recommendations
      const recommendations = await this.generateOptimizationRecommendations(content);

      const optimization: ContentOptimization = {
        contentId: content.id,
        brandId: content.brandId,
        optimalTiming,
        reuseOpportunities,
        performancePrediction,
        recommendations,
        generatedAt: new Date().toISOString()
      };

      return optimization;
    } catch (error) {
      throw new Error(`Failed to optimize content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get optimal posting times for content across platforms
   */
  async getOptimalPostingTimes(content: ManagedContent): Promise<OptimalTiming[]> {
    const optimalTiming: OptimalTiming[] = [];

    for (const platform of content.targetPlatforms) {
      try {
        const platformTiming = await this.engagementAnalyticsService.getOptimalPostingTimes(
          platform, 
          content.brandId
        );
        
        // Filter and enhance timing data
        const enhancedTiming = platformTiming.map(timing => ({
          ...timing,
          platform,
          timezone: timing.timezone || 'UTC'
        }));
        
        optimalTiming.push(...enhancedTiming);
      } catch (error) {
        console.warn(`Failed to get optimal timing for ${platform}:`, error);
        
        // Provide fallback timing based on general best practices
        const fallbackTiming = this.getFallbackOptimalTiming(platform);
        optimalTiming.push(...fallbackTiming);
      }
    }

    return optimalTiming.sort((a, b) => b.expectedEngagement - a.expectedEngagement);
  }

  /**
   * Identify opportunities to reuse content on other platforms
   */
  async identifyReuseOpportunities(content: ManagedContent): Promise<ReuseOpportunity[]> {
    const reuseOpportunities: ReuseOpportunity[] = [];
    
    // Get all available platforms (excluding current target platforms)
    const allPlatforms = Object.values(Platform);
    const availablePlatforms = allPlatforms.filter(platform => 
      !content.targetPlatforms.includes(platform)
    );

    for (const platform of availablePlatforms) {
      try {
        // Check platform compatibility
        const platformValidation = await this.platformRequirementsService.validatePlatformRequirements(
          content, 
          platform
        );
        
        if (platformValidation.isValid || platformValidation.adaptationSuggestions.length > 0) {
          // Predict performance on this platform
          const performancePrediction = await this.engagementAnalyticsService.predictContentPerformance(
            content, 
            platform
          );
          
          // Only suggest if expected performance is reasonable
          if (performancePrediction.expectedEngagementRate > 0.02) { // >2% engagement rate
            const opportunity: ReuseOpportunity = {
              contentId: content.id,
              originalPlatform: content.targetPlatforms[0], // Use first platform as original
              suggestedPlatforms: [platform],
              adaptationRequired: !platformValidation.isValid,
              adaptationSuggestions: platformValidation.adaptationSuggestions,
              expectedPerformance: performancePrediction.expectedEngagementRate,
              reasoning: this.generateReuseReasoning(content, platform, performancePrediction)
            };
            
            reuseOpportunities.push(opportunity);
          }
        }
      } catch (error) {
        console.warn(`Failed to analyze reuse opportunity for ${platform}:`, error);
      }
    }

    return reuseOpportunities.sort((a, b) => b.expectedPerformance - a.expectedPerformance);
  }

  /**
   * Predict content performance across platforms
   */
  private async predictContentPerformance(content: ManagedContent): Promise<{
    expectedViews: number;
    expectedEngagementRate: number;
    confidenceLevel: number;
  }> {
    try {
      let totalExpectedViews = 0;
      let totalExpectedEngagement = 0;
      let totalConfidence = 0;
      let platformCount = 0;

      for (const platform of content.targetPlatforms) {
        try {
          const prediction = await this.engagementAnalyticsService.predictContentPerformance(
            content, 
            platform
          );
          
          totalExpectedViews += prediction.expectedViews;
          totalExpectedEngagement += prediction.expectedEngagementRate;
          totalConfidence += prediction.confidence;
          platformCount++;
        } catch (error) {
          console.warn(`Failed to predict performance for ${platform}:`, error);
        }
      }

      return {
        expectedViews: platformCount > 0 ? Math.round(totalExpectedViews) : 0,
        expectedEngagementRate: platformCount > 0 ? totalExpectedEngagement / platformCount : 0,
        confidenceLevel: platformCount > 0 ? totalConfidence / platformCount : 0
      };
    } catch (error) {
      console.error('Performance prediction failed:', error);
      return {
        expectedViews: 0,
        expectedEngagementRate: 0,
        confidenceLevel: 0
      };
    }
  }

  /**
   * Generate optimization recommendations
   */
  private async generateOptimizationRecommendations(content: ManagedContent): Promise<string[]> {
    const recommendations: string[] = [];

    try {
      // Analyze content features
      const contentFeatures = await this.contentAnalysisService.extractContentFeatures(content);
      
      // Get brand context for compliance checking
      const brandContext = await this.brandContextService.getBrandContext(content.brandId);
      
      // Performance-based recommendations
      if (content.performance.averageEngagementRate < 0.03) {
        recommendations.push('Consider adding more engaging call-to-action phrases to improve interaction rates');
      }
      
      if (content.performance.totalViews < 1000 && content.createdAt < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) {
        recommendations.push('Content may benefit from reposting at optimal times or with updated hashtags');
      }
      
      // Content feature recommendations
      if (contentFeatures.complexity > 0.8) {
        recommendations.push('Consider simplifying the message for broader audience appeal');
      }
      
      if (contentFeatures.topics.length < 2) {
        recommendations.push('Adding more relevant topics could improve discoverability');
      }
      
      // Platform-specific recommendations
      for (const platform of content.targetPlatforms) {
        const platformRecs = await this.getPlatformSpecificRecommendations(content, platform);
        recommendations.push(...platformRecs);
      }
      
      // Brand alignment recommendations
      if (brandContext) {
        const brandRecs = await this.getBrandAlignmentRecommendations(content, brandContext.playbook);
        recommendations.push(...brandRecs);
      }
      
      // Timing recommendations
      const timingRecs = await this.getTimingRecommendations(content);
      recommendations.push(...timingRecs);
      
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      recommendations.push('Unable to generate specific recommendations due to analysis error');
    }

    return recommendations.slice(0, 10); // Limit to top 10 recommendations
  }

  /**
   * Get platform-specific optimization recommendations
   */
  private async getPlatformSpecificRecommendations(
    content: ManagedContent, 
    platform: Platform
  ): Promise<string[]> {
    const recommendations: string[] = [];

    try {
      const validation = await this.platformRequirementsService.validatePlatformRequirements(
        content, 
        platform
      );
      
      if (!validation.isValid) {
        recommendations.push(...validation.adaptationSuggestions.map(suggestion => 
          `${platform}: ${suggestion}`
        ));
      }
      
      // Platform-specific best practices
      switch (platform) {
        case Platform.INSTAGRAM:
          if (content.metadata.tags.length < 5) {
            recommendations.push('Instagram: Consider using 5-10 relevant hashtags for better discoverability');
          }
          if (content.type === 'video' && !content.files[0]?.duration) {
            recommendations.push('Instagram: Videos under 60 seconds typically perform better in feed');
          }
          break;
          
        case Platform.TIKTOK:
          if (content.type === 'video') {
            recommendations.push('TikTok: Ensure video has engaging hook in first 3 seconds');
            recommendations.push('TikTok: Consider adding trending sounds or effects');
          }
          break;
          
        case Platform.YOUTUBE:
          if (content.metadata.description.length < 100) {
            recommendations.push('YouTube: Longer descriptions (100+ characters) improve SEO and engagement');
          }
          break;
          
        case Platform.FACEBOOK:
          if (content.textContent && content.textContent.length > 250) {
            recommendations.push('Facebook: Consider shorter text (under 250 characters) for better engagement');
          }
          break;
      }
    } catch (error) {
      console.warn(`Failed to get platform recommendations for ${platform}:`, error);
    }

    return recommendations;
  }

  /**
   * Get brand alignment recommendations
   */
  private async getBrandAlignmentRecommendations(
    content: ManagedContent, 
    brandPlaybook: BrandPlaybook
  ): Promise<string[]> {
    const recommendations: string[] = [];

    try {
      // Check voice and tone alignment
      const contentText = `${content.metadata.title} ${content.metadata.description} ${content.textContent || ''}`;
      
      if (contentText) {
        const validation = await this.complianceValidationService.validateContent(
          contentText, 
          brandPlaybook
        );
        
        if (validation.needsReview) {
          recommendations.push('Review content tone to ensure alignment with brand voice guidelines');
        }
        
        // Check for brand voice elements
        const hasPositiveLanguage = brandPlaybook.voiceAndTone.doUse.some(phrase => 
          contentText.toLowerCase().includes(phrase.toLowerCase())
        );
        
        if (!hasPositiveLanguage) {
          recommendations.push(`Consider incorporating brand voice elements: ${brandPlaybook.voiceAndTone.doUse.slice(0, 2).join(', ')}`);
        }
        
        // Check for forbidden language
        const hasForbiddenLanguage = brandPlaybook.voiceAndTone.dontUse.some(phrase => 
          contentText.toLowerCase().includes(phrase.toLowerCase())
        );
        
        if (hasForbiddenLanguage) {
          recommendations.push('Remove language that conflicts with brand voice guidelines');
        }
      }
      
      // Check brand values alignment
      const brandValues = brandPlaybook.brandIdentity.values;
      const contentTopics = content.metadata.tags;
      
      const hasValueAlignment = brandValues.some(value => 
        contentTopics.some(topic => topic.toLowerCase().includes(value.toLowerCase()))
      );
      
      if (!hasValueAlignment) {
        recommendations.push(`Consider highlighting brand values: ${brandValues.slice(0, 2).join(', ')}`);
      }
      
    } catch (error) {
      console.warn('Failed to get brand alignment recommendations:', error);
    }

    return recommendations;
  }

  /**
   * Get timing optimization recommendations
   */
  private async getTimingRecommendations(content: ManagedContent): Promise<string[]> {
    const recommendations: string[] = [];

    try {
      for (const platform of content.targetPlatforms) {
        const audienceHours = await this.engagementAnalyticsService.getAudienceActiveHours(
          platform, 
          content.brandId
        );
        
        if (audienceHours.length > 0) {
          const bestHour = audienceHours.reduce((best, current) => 
            current.engagementLevel > best.engagementLevel ? current : best
          );
          
          recommendations.push(
            `${platform}: Optimal posting time is ${bestHour.dayOfWeek} at ${bestHour.hour}:00`
          );
        }
      }
    } catch (error) {
      console.warn('Failed to get timing recommendations:', error);
    }

    return recommendations;
  }

  /**
   * Generate reasoning for reuse opportunity
   */
  private generateReuseReasoning(
    content: ManagedContent, 
    platform: Platform, 
    performancePrediction: any
  ): string {
    const reasons: string[] = [];
    
    if (performancePrediction.expectedEngagementRate > 0.05) {
      reasons.push('high predicted engagement rate');
    }
    
    if (content.performance.averageEngagementRate > 0.04) {
      reasons.push('strong performance on original platform');
    }
    
    if (content.metadata.tags.length > 5) {
      reasons.push('rich hashtag strategy suitable for platform');
    }
    
    if (content.type === 'video' && platform === Platform.TIKTOK) {
      reasons.push('video content performs well on TikTok');
    }
    
    if (content.type === 'image' && platform === Platform.INSTAGRAM) {
      reasons.push('visual content aligns with Instagram audience preferences');
    }
    
    return reasons.length > 0 
      ? `Recommended due to ${reasons.join(', ')}`
      : 'Content characteristics suggest good fit for platform';
  }

  /**
   * Get fallback optimal timing when analytics are unavailable
   */
  private getFallbackOptimalTiming(platform: Platform): OptimalTiming[] {
    const fallbackTimes: Record<Platform, OptimalTiming[]> = {
      [Platform.INSTAGRAM]: [
        {
          platform,
          dayOfWeek: 'Tuesday',
          hour: 11,
          timezone: 'UTC',
          confidence: 0.6,
          expectedEngagement: 0.04
        },
        {
          platform,
          dayOfWeek: 'Thursday',
          hour: 14,
          timezone: 'UTC',
          confidence: 0.6,
          expectedEngagement: 0.038
        }
      ],
      [Platform.TIKTOK]: [
        {
          platform,
          dayOfWeek: 'Tuesday',
          hour: 18,
          timezone: 'UTC',
          confidence: 0.6,
          expectedEngagement: 0.06
        }
      ],
      [Platform.FACEBOOK]: [
        {
          platform,
          dayOfWeek: 'Wednesday',
          hour: 15,
          timezone: 'UTC',
          confidence: 0.6,
          expectedEngagement: 0.03
        }
      ],
      [Platform.YOUTUBE]: [
        {
          platform,
          dayOfWeek: 'Saturday',
          hour: 20,
          timezone: 'UTC',
          confidence: 0.6,
          expectedEngagement: 0.05
        }
      ],
      [Platform.REDDIT]: [
        {
          platform,
          dayOfWeek: 'Monday',
          hour: 10,
          timezone: 'UTC',
          confidence: 0.5,
          expectedEngagement: 0.02
        }
      ],
      [Platform.RSS]: [
        {
          platform,
          dayOfWeek: 'Monday',
          hour: 9,
          timezone: 'UTC',
          confidence: 0.5,
          expectedEngagement: 0.01
        }
      ]
    };

    return fallbackTimes[platform] || [];
  }
}