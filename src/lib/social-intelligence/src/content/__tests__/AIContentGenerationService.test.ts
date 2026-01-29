/**
 * Unit tests for AI Content Generation Service
 */

import { AIContentGenerationService } from '../AIContentGenerationService';
import { 
  ContentGenerationRequest, 
  GenerationStrategy, 
  ContentFormat 
} from '../types';
import { Platform, BrandPlaybook, Persona } from '../../types/core';
import { BrandContextService } from '../../brand/BrandContextService';
import { PersonaMatchingEngine } from '../../brand/PersonaMatchingEngine';
import { ComplianceValidationService } from '../../brand/ComplianceValidationService';

// Mock dependencies
const mockBrandContextService = {
  getBrandContext: jest.fn()
} as jest.Mocked<BrandContextService>;

const mockPersonaMatchingEngine = {
  matchPersona: jest.fn()
} as jest.Mocked<PersonaMatchingEngine>;

const mockComplianceValidationService = {
  validateContent: jest.fn()
} as jest.Mocked<ComplianceValidationService>;

const mockTrendingTopicsAPI = {
  getTrendingTopics: jest.fn()
};

const mockContentGenerationAI = {
  generateContent: jest.fn(),
  generateVariations: jest.fn()
};

const mockEngagementAnalytics = {
  getOptimalPostingTimes: jest.fn(),
  predictEngagement: jest.fn(),
  estimateReach: jest.fn(),
  getAudienceActiveHours: jest.fn()
};

describe('AIContentGenerationService', () => {
  let service: AIContentGenerationService;
  let mockBrandPlaybook: BrandPlaybook;
  let mockPersonas: Persona[];

  beforeEach(() => {
    service = new AIContentGenerationService(
      mockBrandContextService,
      mockPersonaMatchingEngine,
      mockComplianceValidationService,
      mockTrendingTopicsAPI,
      mockContentGenerationAI,
      mockEngagementAnalytics
    );

    // Setup mock data
    mockBrandPlaybook = {
      id: 'brand_001',
      brandId: 'test_brand',
      version: '1.0',
      lastUpdated: '2024-01-01T00:00:00Z',
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
        doUse: ['We\'re excited to help', 'Thanks for reaching out'],
        dontUse: ['That\'s not our problem', 'Obviously']
      },
      complianceRules: {
        forbiddenClaims: ['guaranteed results', 'miracle cure'],
        requiredDisclosures: [],
        regulatoryCompliance: ['FDA', 'FTC'],
        contentRestrictions: {}
      },
      visualGuidelines: {
        logoUsage: {
          primaryLogo: 'https://example.com/logo.svg',
          variations: ['dark', 'light'],
          minSize: '24px',
          clearSpace: '2x logo height'
        },
        colorPalette: {
          primary: '#FF6B35',
          secondary: '#004E89',
          accent: '#FFD23F',
          neutral: ['#FFFFFF', '#F5F5F5']
        },
        typography: {
          primary: 'Inter',
          secondary: 'Roboto',
          headingStyle: 'bold',
          bodyStyle: 'regular'
        }
      },
      platformSpecificRules: {
        [Platform.INSTAGRAM]: {
          maxCaptionLength: 2200,
          hashtagLimit: 30,
          preferredAspectRatio: '1:1'
        }
      }
    };

    mockPersonas = [
      {
        id: 'persona_001',
        name: 'Tech Enthusiast',
        brandId: 'test_brand',
        demographics: {
          ageRange: '25-35',
          gender: 'all',
          income: 'middle',
          education: 'college',
          location: ['US', 'Canada'],
          occupation: ['tech', 'marketing']
        },
        psychographics: {
          interests: ['technology', 'innovation'],
          values: ['efficiency', 'quality'],
          lifestyle: ['digital-first', 'early-adopter'],
          painPoints: ['complexity', 'time-constraints']
        },
        behaviorPatterns: {
          purchaseDrivers: ['features', 'reviews'],
          decisionMakingStyle: 'research-driven',
          brandLoyalty: 'moderate',
          pricesensitivity: 'moderate',
          communicationPreference: 'direct'
        },
        platformPreferences: {
          primary: [Platform.INSTAGRAM, Platform.YOUTUBE],
          secondary: [Platform.TIKTOK],
          contentTypes: ['video', 'carousel'],
          engagementStyle: 'active',
          activeHours: ['9-11', '18-20']
        },
        triggers: {
          positive: ['innovation', 'efficiency'],
          negative: ['complexity', 'outdated']
        },
        responseStrategies: {
          contentTone: 'informative',
          messageLength: 'medium',
          includeData: true,
          visualStyle: 'clean',
          callToAction: 'learn_more'
        }
      }
    ];

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('generateWeeklyContentPlan', () => {
    it('should generate comprehensive weekly content plan', async () => {
      // Setup mocks
      mockBrandContextService.getBrandContext.mockResolvedValue({
        brandId: 'test_brand',
        playbook: mockBrandPlaybook,
        personas: mockPersonas,
        assets: []
      });

      mockTrendingTopicsAPI.getTrendingTopics.mockResolvedValue([
        {
          topic: 'AI Innovation',
          hashtags: ['#AI', '#Innovation'],
          relevanceScore: 0.8,
          trendingPlatforms: [Platform.INSTAGRAM],
          peakTime: '2024-01-15T12:00:00Z',
          brandAlignment: 0.9
        }
      ]);

      mockContentGenerationAI.generateContent.mockResolvedValue(
        'TEXT: Exciting AI innovations are transforming how we work!\nHASHTAGS: #AI #Innovation #TechTrends\nCTA: Learn more about our AI solutions'
      );

      mockContentGenerationAI.generateVariations.mockResolvedValue([
        'Discover how AI is revolutionizing productivity in 2024',
        'The future of work is here with cutting-edge AI technology',
        'Transform your workflow with intelligent automation'
      ]);

      mockEngagementAnalytics.getOptimalPostingTimes.mockResolvedValue([
        new Date('2024-01-15T14:00:00Z')
      ]);

      mockEngagementAnalytics.estimateReach.mockResolvedValue(5000);
      mockEngagementAnalytics.predictEngagement.mockResolvedValue(0.045);

      mockComplianceValidationService.validateContent.mockResolvedValue({
        hasViolations: false,
        needsReview: false,
        violations: [],
        suggestions: []
      });

      const request: ContentGenerationRequest = {
        brandId: 'test_brand',
        strategy: GenerationStrategy.TRENDING_TOPICS,
        platforms: [Platform.INSTAGRAM, Platform.TIKTOK],
        contentTypes: [ContentFormat.POST, ContentFormat.REEL],
        weekStarting: new Date('2024-01-15T00:00:00Z'),
        includeTrending: true,
        includeUGCBriefs: true
      };

      // Execute
      const result = await service.generateWeeklyContentPlan(request);

      // Verify
      expect(result).toBeDefined();
      expect(result.brandId).toBe('test_brand');
      expect(result.strategy).toBe(GenerationStrategy.TRENDING_TOPICS);
      expect(result.platformContent).toHaveLength(3); // Instagram post + reel, TikTok video
      expect(result.trendingTopics).toHaveLength(1);
      expect(result.ugcBriefs).toHaveLength(1);
      expect(result.complianceStatus).toBe('compliant');
      expect(result.totalEstimatedReach).toBeGreaterThan(0);
      expect(result.averageEstimatedEngagement).toBeGreaterThan(0);

      // Verify service calls
      expect(mockBrandContextService.getBrandContext).toHaveBeenCalledWith('test_brand');
      expect(mockTrendingTopicsAPI.getTrendingTopics).toHaveBeenCalledWith([Platform.INSTAGRAM, Platform.TIKTOK]);
      expect(mockContentGenerationAI.generateContent).toHaveBeenCalled();
      expect(mockEngagementAnalytics.getOptimalPostingTimes).toHaveBeenCalled();
    });

    it('should handle missing brand context', async () => {
      mockBrandContextService.getBrandContext.mockResolvedValue(null);

      const request: ContentGenerationRequest = {
        brandId: 'nonexistent_brand',
        strategy: GenerationStrategy.BRAND_FOCUSED,
        platforms: [Platform.INSTAGRAM],
        contentTypes: [ContentFormat.POST],
        weekStarting: new Date(),
        includeTrending: false,
        includeUGCBriefs: false
      };

      await expect(service.generateWeeklyContentPlan(request)).rejects.toThrow(
        'Brand context not found for brand: nonexistent_brand'
      );
    });

    it('should generate content without trending topics when not requested', async () => {
      mockBrandContextService.getBrandContext.mockResolvedValue({
        brandId: 'test_brand',
        playbook: mockBrandPlaybook,
        personas: mockPersonas,
        assets: []
      });

      mockContentGenerationAI.generateContent.mockResolvedValue(
        'TEXT: Quality products for modern professionals\nHASHTAGS: #Quality #Professional\nCTA: Shop now'
      );

      mockContentGenerationAI.generateVariations.mockResolvedValue([
        'Premium solutions for today\'s professionals'
      ]);

      mockEngagementAnalytics.getOptimalPostingTimes.mockResolvedValue([new Date()]);
      mockEngagementAnalytics.estimateReach.mockResolvedValue(3000);
      mockEngagementAnalytics.predictEngagement.mockResolvedValue(0.035);

      mockComplianceValidationService.validateContent.mockResolvedValue({
        hasViolations: false,
        needsReview: false,
        violations: [],
        suggestions: []
      });

      const request: ContentGenerationRequest = {
        brandId: 'test_brand',
        strategy: GenerationStrategy.BRAND_FOCUSED,
        platforms: [Platform.INSTAGRAM],
        contentTypes: [ContentFormat.POST],
        weekStarting: new Date(),
        includeTrending: false,
        includeUGCBriefs: false
      };

      const result = await service.generateWeeklyContentPlan(request);

      expect(result.trendingTopics).toHaveLength(0);
      expect(result.ugcBriefs).toHaveLength(0);
      expect(result.platformContent).toHaveLength(1);
      expect(mockTrendingTopicsAPI.getTrendingTopics).not.toHaveBeenCalled();
    });

    it('should handle compliance violations', async () => {
      mockBrandContextService.getBrandContext.mockResolvedValue({
        brandId: 'test_brand',
        playbook: mockBrandPlaybook,
        personas: mockPersonas,
        assets: []
      });

      mockContentGenerationAI.generateContent.mockResolvedValue(
        'TEXT: Guaranteed results with our miracle cure!\nHASHTAGS: #Guaranteed #Miracle\nCTA: Buy now'
      );

      mockContentGenerationAI.generateVariations.mockResolvedValue([
        'Amazing guaranteed results await you!'
      ]);

      mockEngagementAnalytics.getOptimalPostingTimes.mockResolvedValue([new Date()]);
      mockEngagementAnalytics.estimateReach.mockResolvedValue(2000);
      mockEngagementAnalytics.predictEngagement.mockResolvedValue(0.025);

      mockComplianceValidationService.validateContent.mockResolvedValue({
        hasViolations: true,
        needsReview: true,
        violations: ['Contains forbidden claim: guaranteed results'],
        suggestions: ['Remove guarantee language']
      });

      const request: ContentGenerationRequest = {
        brandId: 'test_brand',
        strategy: GenerationStrategy.BRAND_FOCUSED,
        platforms: [Platform.INSTAGRAM],
        contentTypes: [ContentFormat.POST],
        weekStarting: new Date(),
        includeTrending: false,
        includeUGCBriefs: false
      };

      const result = await service.generateWeeklyContentPlan(request);

      expect(result.complianceStatus).toBe('violations_found');
    });
  });

  describe('generatePlatformSpecificContent', () => {
    it('should generate platform-specific content with proper formatting', async () => {
      mockContentGenerationAI.generateContent.mockResolvedValue(
        'TEXT: Perfect for your Instagram feed! ✨\nHASHTAGS: #Instagram #Content #Engagement\nCTA: Double tap if you agree!'
      );

      mockContentGenerationAI.generateVariations.mockResolvedValue([
        'Love this Instagram-worthy content! 💕',
        'Instagram vibes are strong with this one! 🔥'
      ]);

      mockEngagementAnalytics.getOptimalPostingTimes.mockResolvedValue([
        new Date('2024-01-15T14:00:00Z')
      ]);

      mockEngagementAnalytics.estimateReach.mockResolvedValue(4000);
      mockEngagementAnalytics.predictEngagement.mockResolvedValue(0.055);

      const result = await service.generatePlatformSpecificContent(
        Platform.INSTAGRAM,
        ContentFormat.POST,
        mockBrandPlaybook,
        mockPersonas,
        [],
        'Create engaging Instagram content'
      );

      expect(result.platform).toBe(Platform.INSTAGRAM);
      expect(result.format).toBe(ContentFormat.POST);
      expect(result.content.text).toContain('Perfect for your Instagram feed!');
      expect(result.content.hashtags).toContain('#Instagram');
      expect(result.content.callToAction).toBe('Double tap if you agree!');
      expect(result.variations).toHaveLength(3);
      expect(result.estimatedReach).toBe(4000);
      expect(result.estimatedEngagement).toBe(0.055);
    });

    it('should respect platform-specific constraints', async () => {
      const longContent = 'A'.repeat(3000); // Exceeds Instagram limit
      mockContentGenerationAI.generateContent.mockResolvedValue(
        `TEXT: ${longContent}\nHASHTAGS: ${Array(35).fill('#tag').join(' ')}\nCTA: Click here`
      );

      mockContentGenerationAI.generateVariations.mockResolvedValue(['Variation 1']);
      mockEngagementAnalytics.getOptimalPostingTimes.mockResolvedValue([new Date()]);
      mockEngagementAnalytics.estimateReach.mockResolvedValue(1000);
      mockEngagementAnalytics.predictEngagement.mockResolvedValue(0.02);

      const result = await service.generatePlatformSpecificContent(
        Platform.INSTAGRAM,
        ContentFormat.POST,
        mockBrandPlaybook,
        mockPersonas
      );

      // Should respect Instagram hashtag limit (30)
      expect(result.content.hashtags.length).toBeLessThanOrEqual(30);
    });
  });

  describe('error handling', () => {
    it('should handle AI generation failures gracefully', async () => {
      mockBrandContextService.getBrandContext.mockResolvedValue({
        brandId: 'test_brand',
        playbook: mockBrandPlaybook,
        personas: mockPersonas,
        assets: []
      });

      mockContentGenerationAI.generateContent.mockRejectedValue(
        new Error('AI service unavailable')
      );

      const request: ContentGenerationRequest = {
        brandId: 'test_brand',
        strategy: GenerationStrategy.BRAND_FOCUSED,
        platforms: [Platform.INSTAGRAM],
        contentTypes: [ContentFormat.POST],
        weekStarting: new Date(),
        includeTrending: false,
        includeUGCBriefs: false
      };

      await expect(service.generateWeeklyContentPlan(request)).rejects.toThrow(
        'Failed to generate content plan'
      );
    });

    it('should handle trending topics API failures', async () => {
      mockBrandContextService.getBrandContext.mockResolvedValue({
        brandId: 'test_brand',
        playbook: mockBrandPlaybook,
        personas: mockPersonas,
        assets: []
      });

      mockTrendingTopicsAPI.getTrendingTopics.mockRejectedValue(
        new Error('Trending API unavailable')
      );

      mockContentGenerationAI.generateContent.mockResolvedValue(
        'TEXT: Fallback content\nHASHTAGS: #Fallback\nCTA: Learn more'
      );

      mockContentGenerationAI.generateVariations.mockResolvedValue(['Variation']);
      mockEngagementAnalytics.getOptimalPostingTimes.mockResolvedValue([new Date()]);
      mockEngagementAnalytics.estimateReach.mockResolvedValue(1000);
      mockEngagementAnalytics.predictEngagement.mockResolvedValue(0.02);

      mockComplianceValidationService.validateContent.mockResolvedValue({
        hasViolations: false,
        needsReview: false,
        violations: [],
        suggestions: []
      });

      const request: ContentGenerationRequest = {
        brandId: 'test_brand',
        strategy: GenerationStrategy.TRENDING_TOPICS,
        platforms: [Platform.INSTAGRAM],
        contentTypes: [ContentFormat.POST],
        weekStarting: new Date(),
        includeTrending: true,
        includeUGCBriefs: false
      };

      const result = await service.generateWeeklyContentPlan(request);

      // Should still generate content plan without trending topics
      expect(result.trendingTopics).toHaveLength(0);
      expect(result.platformContent).toHaveLength(1);
    });
  });
});