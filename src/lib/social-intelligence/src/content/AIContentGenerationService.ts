/**
 * AI Content Generation Service
 * Implements Copywriter AI for weekly content planning with platform-specific optimization
 */

import { 
  ContentPlan, 
  ContentGenerationRequest, 
  PlatformContent, 
  TrendingTopic, 
  UGCBrief,
  ContentFormat,
  GenerationStrategy,
  ContentVariation
} from './types';
import { Platform, BrandPlaybook, Persona, ContentType } from '../types/core';
import { BrandContextService } from '../brand/BrandContextService';
import { PersonaMatchingEngine } from '../brand/PersonaMatchingEngine';
import { ComplianceValidationService } from '../brand/ComplianceValidationService';

interface TrendingTopicsAPI {
  getTrendingTopics(platforms: Platform[]): Promise<TrendingTopic[]>;
}

interface ContentGenerationAI {
  generateContent(prompt: string, context: any): Promise<string>;
  generateVariations(baseContent: string, count: number): Promise<string[]>;
}

interface EngagementAnalytics {
  getOptimalPostingTimes(platform: Platform, brandId: string): Promise<Date[]>;
  predictEngagement(content: string, platform: Platform): Promise<number>;
  estimateReach(content: string, platform: Platform): Promise<number>;
}

export class AIContentGenerationService {
  private brandContextService: BrandContextService;
  private personaMatchingEngine: PersonaMatchingEngine;
  private complianceValidationService: ComplianceValidationService;
  private trendingTopicsAPI: TrendingTopicsAPI;
  private contentGenerationAI: ContentGenerationAI;
  private engagementAnalytics: EngagementAnalytics;

  constructor(
    brandContextService: BrandContextService,
    personaMatchingEngine: PersonaMatchingEngine,
    complianceValidationService: ComplianceValidationService,
    trendingTopicsAPI: TrendingTopicsAPI,
    contentGenerationAI: ContentGenerationAI,
    engagementAnalytics: EngagementAnalytics
  ) {
    this.brandContextService = brandContextService;
    this.personaMatchingEngine = personaMatchingEngine;
    this.complianceValidationService = complianceValidationService;
    this.trendingTopicsAPI = trendingTopicsAPI;
    this.contentGenerationAI = contentGenerationAI;
    this.engagementAnalytics = engagementAnalytics;
  }

  /**
   * Generate comprehensive weekly content plan
   */
  async generateWeeklyContentPlan(request: ContentGenerationRequest): Promise<ContentPlan> {
    try {
      // Load brand context
      const brandContext = await this.brandContextService.getBrandContext(request.brandId);
      if (!brandContext) {
        throw new Error(`Brand context not found for brand: ${request.brandId}`);
      }

      // Get trending topics if requested
      const trendingTopics = request.includeTrending 
        ? await this.getTrendingTopicsForBrand(request.platforms, brandContext.playbook)
        : [];

      // Generate platform-specific content
      const platformContent = await this.generatePlatformContent(
        request,
        brandContext.playbook,
        brandContext.personas,
        trendingTopics
      );

      // Generate UGC briefs if requested
      const ugcBriefs = request.includeUGCBriefs
        ? await this.generateUGCBriefs(brandContext.playbook, trendingTopics)
        : [];

      // Calculate aggregated metrics
      const totalEstimatedReach = platformContent.reduce((sum, content) => sum + content.estimatedReach, 0);
      const averageEstimatedEngagement = platformContent.length > 0
        ? platformContent.reduce((sum, content) => sum + content.estimatedEngagement, 0) / platformContent.length
        : 0;

      // Validate compliance
      const complianceStatus = await this.validateContentPlanCompliance(platformContent, brandContext.playbook);

      const contentPlan: ContentPlan = {
        id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        brandId: request.brandId,
        weekStarting: request.weekStarting.toISOString(),
        strategy: request.strategy,
        trendingTopics,
        platformContent,
        ugcBriefs,
        totalEstimatedReach,
        averageEstimatedEngagement,
        complianceStatus,
        generatedAt: new Date().toISOString()
      };

      return contentPlan;
    } catch (error) {
      throw new Error(`Failed to generate content plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate content for specific platform and format
   */
  async generatePlatformSpecificContent(
    platform: Platform,
    format: ContentFormat,
    brandPlaybook: BrandPlaybook,
    personas: Persona[],
    trendingTopics: TrendingTopic[] = [],
    customPrompt?: string
  ): Promise<PlatformContent> {
    try {
      // Get platform-specific rules
      const platformRules = brandPlaybook.platformSpecificRules[platform] || {};
      
      // Select most relevant persona for this platform
      const targetPersona = this.selectTargetPersona(personas, platform);
      
      // Build content generation context
      const context = {
        brand: brandPlaybook.brandIdentity,
        voiceAndTone: brandPlaybook.voiceAndTone,
        platformRules,
        targetPersona,
        trendingTopics: trendingTopics.slice(0, 3), // Top 3 trending topics
        format,
        customPrompt
      };

      // Generate base content
      const baseContent = await this.generateBaseContent(context);
      
      // Generate variations for A/B testing
      const variations = await this.generateContentVariations(baseContent, targetPersona, 3);
      
      // Get optimal posting time
      const optimalTimes = await this.engagementAnalytics.getOptimalPostingTimes(platform, brandPlaybook.brandId);
      const optimalPostingTime = optimalTimes[0] || new Date();
      
      // Estimate performance
      const estimatedReach = await this.engagementAnalytics.estimateReach(baseContent.text, platform);
      const estimatedEngagement = await this.engagementAnalytics.predictEngagement(baseContent.text, platform);

      // Determine media requirements based on format
      const mediaRequirements = this.getMediaRequirements(format, platform);

      const platformContent: PlatformContent = {
        platform,
        format,
        content: {
          text: baseContent.text,
          hashtags: baseContent.hashtags,
          mentions: baseContent.mentions || [],
          callToAction: baseContent.callToAction,
          mediaRequirements
        },
        variations,
        optimalPostingTime: optimalPostingTime.toISOString(),
        estimatedReach,
        estimatedEngagement
      };

      return platformContent;
    } catch (error) {
      throw new Error(`Failed to generate platform content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get trending topics relevant to brand
   */
  private async getTrendingTopicsForBrand(
    platforms: Platform[], 
    brandPlaybook: BrandPlaybook
  ): Promise<TrendingTopic[]> {
    try {
      const allTrendingTopics = await this.trendingTopicsAPI.getTrendingTopics(platforms);
      
      // Filter and score topics based on brand alignment
      const relevantTopics = allTrendingTopics
        .map(topic => ({
          ...topic,
          brandAlignment: this.calculateBrandAlignment(topic, brandPlaybook)
        }))
        .filter(topic => topic.brandAlignment > 0.3) // Only topics with >30% brand alignment
        .sort((a, b) => b.brandAlignment - a.brandAlignment)
        .slice(0, 10); // Top 10 most relevant topics

      return relevantTopics;
    } catch (error) {
      console.warn('Failed to fetch trending topics, using fallback:', error);
      return [];
    }
  }

  /**
   * Generate platform-specific content for all requested platforms
   */
  private async generatePlatformContent(
    request: ContentGenerationRequest,
    brandPlaybook: BrandPlaybook,
    personas: Persona[],
    trendingTopics: TrendingTopic[]
  ): Promise<PlatformContent[]> {
    const platformContent: PlatformContent[] = [];

    for (const platform of request.platforms) {
      for (const format of request.contentTypes) {
        // Skip invalid combinations
        if (!this.isValidPlatformFormatCombination(platform, format)) {
          continue;
        }

        const content = await this.generatePlatformSpecificContent(
          platform,
          format,
          brandPlaybook,
          personas,
          trendingTopics,
          request.customPrompts?.[0]
        );

        platformContent.push(content);
      }
    }

    return platformContent;
  }

  /**
   * Generate UGC briefs based on trending topics and brand guidelines
   */
  private async generateUGCBriefs(
    brandPlaybook: BrandPlaybook,
    trendingTopics: TrendingTopic[]
  ): Promise<UGCBrief[]> {
    const ugcBriefs: UGCBrief[] = [];

    // Generate 2-3 UGC briefs based on top trending topics
    const topTopics = trendingTopics.slice(0, 3);

    for (const topic of topTopics) {
      const brief: UGCBrief = {
        id: `ugc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: `${brandPlaybook.brandIdentity.name} x ${topic.topic}`,
        description: `Create authentic content showcasing how ${brandPlaybook.brandIdentity.name} fits into your ${topic.topic} lifestyle`,
        guidelines: [
          `Include ${brandPlaybook.brandIdentity.name} product naturally in your content`,
          `Use hashtags: ${topic.hashtags.join(', ')}`,
          `Keep tone authentic and personal`,
          `Follow platform community guidelines`,
          ...brandPlaybook.complianceRules.forbiddenClaims.map(claim => `Avoid claiming: ${claim}`)
        ],
        hashtags: [...topic.hashtags, `#${brandPlaybook.brandIdentity.name.replace(/\s+/g, '')}`],
        targetAudience: 'Brand enthusiasts and lifestyle content creators',
        incentive: 'Featured on our official channels + exclusive discount code',
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
        platforms: topic.trendingPlatforms
      };

      ugcBriefs.push(brief);
    }

    return ugcBriefs;
  }

  /**
   * Generate base content using AI
   */
  private async generateBaseContent(context: any): Promise<{
    text: string;
    hashtags: string[];
    mentions?: string[];
    callToAction?: string;
  }> {
    const prompt = this.buildContentPrompt(context);
    const generatedText = await this.contentGenerationAI.generateContent(prompt, context);
    
    // Parse generated content to extract components
    const parsed = this.parseGeneratedContent(generatedText, context);
    
    return parsed;
  }

  /**
   * Generate content variations for A/B testing
   */
  private async generateContentVariations(
    baseContent: { text: string; hashtags: string[] },
    targetPersona: Persona,
    count: number
  ): Promise<ContentVariation[]> {
    const variations: ContentVariation[] = [];
    
    const variationPrompts = [
      'Make this more casual and conversational',
      'Add more urgency and call-to-action',
      'Focus on emotional benefits',
      'Emphasize social proof and community'
    ];

    for (let i = 0; i < Math.min(count, variationPrompts.length); i++) {
      const variationText = await this.contentGenerationAI.generateVariations(
        baseContent.text, 
        1
      );

      const variation: ContentVariation = {
        id: `var_${i + 1}`,
        text: variationText[0],
        hashtags: baseContent.hashtags,
        tone: variationPrompts[i],
        targetAudience: targetPersona.name,
        estimatedPerformance: Math.random() * 0.3 + 0.4 // Random between 0.4-0.7
      };

      variations.push(variation);
    }

    return variations;
  }

  /**
   * Build AI prompt for content generation
   */
  private buildContentPrompt(context: any): string {
    const {
      brand,
      voiceAndTone,
      platformRules,
      targetPersona,
      trendingTopics,
      format,
      customPrompt
    } = context;

    let prompt = `Generate ${format} content for ${brand.name} on social media.\n\n`;
    
    prompt += `Brand Identity:\n`;
    prompt += `- Mission: ${brand.mission}\n`;
    prompt += `- Values: ${brand.values.join(', ')}\n`;
    prompt += `- Personality: ${brand.personality.join(', ')}\n\n`;
    
    prompt += `Voice & Tone:\n`;
    prompt += `- Primary tone: ${voiceAndTone.primaryTone}\n`;
    prompt += `- Use phrases like: ${voiceAndTone.doUse.join(', ')}\n`;
    prompt += `- Avoid phrases like: ${voiceAndTone.dontUse.join(', ')}\n\n`;
    
    if (targetPersona) {
      prompt += `Target Audience: ${targetPersona.name}\n`;
      prompt += `- Interests: ${targetPersona.psychographics.interests.join(', ')}\n`;
      prompt += `- Communication preference: ${targetPersona.behaviorPatterns.communicationPreference}\n\n`;
    }
    
    if (trendingTopics.length > 0) {
      prompt += `Trending Topics to Consider:\n`;
      trendingTopics.forEach((topic: TrendingTopic) => {
        prompt += `- ${topic.topic} (${topic.hashtags.join(', ')})\n`;
      });
      prompt += '\n';
    }
    
    if (platformRules.maxCaptionLength) {
      prompt += `Platform Requirements:\n`;
      prompt += `- Max caption length: ${platformRules.maxCaptionLength} characters\n`;
      if (platformRules.hashtagLimit) {
        prompt += `- Max hashtags: ${platformRules.hashtagLimit}\n`;
      }
      prompt += '\n';
    }
    
    if (customPrompt) {
      prompt += `Additional Requirements: ${customPrompt}\n\n`;
    }
    
    prompt += `Please generate engaging content that:\n`;
    prompt += `1. Aligns with the brand voice and values\n`;
    prompt += `2. Resonates with the target audience\n`;
    prompt += `3. Incorporates relevant trending topics naturally\n`;
    prompt += `4. Includes appropriate hashtags\n`;
    prompt += `5. Has a clear call-to-action when appropriate\n`;
    prompt += `\nFormat the response as:\nTEXT: [main content]\nHASHTAGS: [hashtags separated by spaces]\nCTA: [call to action if any]`;

    return prompt;
  }

  /**
   * Parse AI-generated content into structured format
   */
  private parseGeneratedContent(generatedText: string, context: any): {
    text: string;
    hashtags: string[];
    mentions?: string[];
    callToAction?: string;
  } {
    const lines = generatedText.split('\n');
    let text = '';
    let hashtags: string[] = [];
    let callToAction: string | undefined;

    for (const line of lines) {
      if (line.startsWith('TEXT:')) {
        text = line.substring(5).trim();
      } else if (line.startsWith('HASHTAGS:')) {
        hashtags = line.substring(9).trim().split(' ').filter(tag => tag.startsWith('#'));
      } else if (line.startsWith('CTA:')) {
        callToAction = line.substring(4).trim();
      }
    }

    // Fallback parsing if structured format not found
    if (!text) {
      text = generatedText.split('\n')[0] || generatedText;
      hashtags = (generatedText.match(/#\w+/g) || []);
    }

    // Ensure hashtags don't exceed platform limits
    const platformRules = context.platformRules || {};
    if (platformRules.hashtagLimit && hashtags.length > platformRules.hashtagLimit) {
      hashtags = hashtags.slice(0, platformRules.hashtagLimit);
    }

    return {
      text,
      hashtags,
      callToAction
    };
  }

  /**
   * Select the most appropriate persona for a platform
   */
  private selectTargetPersona(personas: Persona[], platform: Platform): Persona {
    // Find persona with this platform as primary preference
    const primaryMatch = personas.find(persona => 
      persona.platformPreferences.primary.includes(platform)
    );
    
    if (primaryMatch) return primaryMatch;
    
    // Find persona with this platform as secondary preference
    const secondaryMatch = personas.find(persona => 
      persona.platformPreferences.secondary.includes(platform)
    );
    
    if (secondaryMatch) return secondaryMatch;
    
    // Return first persona as fallback
    return personas[0];
  }

  /**
   * Calculate brand alignment score for trending topic
   */
  private calculateBrandAlignment(topic: TrendingTopic, brandPlaybook: BrandPlaybook): number {
    let alignmentScore = 0;
    
    // Check alignment with brand values
    const topicLower = topic.topic.toLowerCase();
    for (const value of brandPlaybook.brandIdentity.values) {
      if (topicLower.includes(value.toLowerCase())) {
        alignmentScore += 0.3;
      }
    }
    
    // Check alignment with brand personality
    for (const trait of brandPlaybook.brandIdentity.personality) {
      if (topicLower.includes(trait.toLowerCase())) {
        alignmentScore += 0.2;
      }
    }
    
    // Check for forbidden content
    for (const forbidden of brandPlaybook.complianceRules.forbiddenClaims) {
      if (topicLower.includes(forbidden.toLowerCase())) {
        alignmentScore -= 0.5;
      }
    }
    
    // Normalize score between 0 and 1
    return Math.max(0, Math.min(1, alignmentScore));
  }

  /**
   * Get media requirements for content format and platform
   */
  private getMediaRequirements(format: ContentFormat, platform: Platform): any {
    const requirements: any = {
      type: ContentType.IMAGE // Default
    };

    switch (format) {
      case ContentFormat.REEL:
        requirements.type = ContentType.VIDEO;
        requirements.aspectRatio = '9:16';
        requirements.duration = platform === Platform.INSTAGRAM ? 90 : 60;
        break;
      case ContentFormat.STORY:
        requirements.type = ContentType.IMAGE;
        requirements.aspectRatio = '9:16';
        break;
      case ContentFormat.CAROUSEL:
        requirements.type = ContentType.CAROUSEL;
        requirements.aspectRatio = '1:1';
        break;
      case ContentFormat.VIDEO:
        requirements.type = ContentType.VIDEO;
        requirements.aspectRatio = platform === Platform.YOUTUBE ? '16:9' : '1:1';
        break;
      default:
        requirements.aspectRatio = '1:1';
    }

    return requirements;
  }

  /**
   * Check if platform and format combination is valid
   */
  private isValidPlatformFormatCombination(platform: Platform, format: ContentFormat): boolean {
    const validCombinations: Record<Platform, ContentFormat[]> = {
      [Platform.INSTAGRAM]: [ContentFormat.POST, ContentFormat.STORY, ContentFormat.REEL, ContentFormat.CAROUSEL],
      [Platform.TIKTOK]: [ContentFormat.VIDEO, ContentFormat.POST],
      [Platform.FACEBOOK]: [ContentFormat.POST, ContentFormat.STORY, ContentFormat.VIDEO, ContentFormat.CAROUSEL],
      [Platform.YOUTUBE]: [ContentFormat.VIDEO, ContentFormat.POST],
      [Platform.REDDIT]: [ContentFormat.POST],
      [Platform.RSS]: [ContentFormat.POST]
    };

    return validCombinations[platform]?.includes(format) || false;
  }

  /**
   * Validate content plan compliance
   */
  private async validateContentPlanCompliance(
    platformContent: PlatformContent[],
    brandPlaybook: BrandPlaybook
  ): Promise<'compliant' | 'needs_review' | 'violations_found'> {
    let hasViolations = false;
    let needsReview = false;

    for (const content of platformContent) {
      try {
        const validation = await this.complianceValidationService.validateContent(
          content.content.text,
          brandPlaybook
        );

        if (validation.hasViolations) {
          hasViolations = true;
        } else if (validation.needsReview) {
          needsReview = true;
        }
      } catch (error) {
        console.warn('Compliance validation failed:', error);
        needsReview = true;
      }
    }

    if (hasViolations) return 'violations_found';
    if (needsReview) return 'needs_review';
    return 'compliant';
  }
}