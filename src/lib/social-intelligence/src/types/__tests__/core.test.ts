/**
 * Unit tests for core data models and schemas
 */

import { describe, it, expect } from '@jest/globals';
import {
  SocialEventSchema,
  BrandPlaybookSchema,
  PersonaSchema,
  AssetIntelligenceSchema,
  DecisionOutputSchema,
  Platform,
  EventType,
  SentimentLabel,
  IntentCategory,
  ActionType,
  UrgencyLevel
} from '../core';
import { testUtils } from '../../test/setup';

describe('Core Data Models', () => {
  describe('SocialEventSchema', () => {
    it('should validate a complete social event', () => {
      const event = testUtils.createTestSocialEvent();
      
      expect(() => SocialEventSchema.parse(event)).not.toThrow();
    });

    it('should validate a minimal social event', () => {
      const minimalEvent = {
        id: 'test-id',
        platform: Platform.TIKTOK,
        platformId: 'platform-123',
        timestamp: new Date().toISOString(),
        eventType: EventType.POST,
        content: {
          text: 'Test content',
          mediaUrls: [],
          hashtags: [],
          mentions: [],
          language: 'en'
        },
        author: {
          id: 'author-123',
          username: 'testuser',
          displayName: 'Test User',
          followerCount: 0,
          verified: false
        },
        engagement: {
          likes: 0,
          shares: 0,
          comments: 0,
          views: 0,
          engagementRate: 0
        },
        metadata: {
          source: 'api' as const,
          processingTimestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

      expect(() => SocialEventSchema.parse(minimalEvent)).not.toThrow();
    });

    it('should reject invalid platform', () => {
      const event = testUtils.createTestSocialEvent({
        platform: 'invalid-platform'
      });

      expect(() => SocialEventSchema.parse(event)).toThrow();
    });

    it('should reject invalid engagement rate', () => {
      const event = testUtils.createTestSocialEvent({
        engagement: {
          likes: 10,
          shares: 2,
          comments: 5,
          views: 100,
          engagementRate: 1.5 // Invalid: > 1
        }
      });

      expect(() => SocialEventSchema.parse(event)).toThrow();
    });

    it('should reject negative follower count', () => {
      const event = testUtils.createTestSocialEvent({
        author: {
          id: 'author-123',
          username: 'testuser',
          displayName: 'Test User',
          followerCount: -100, // Invalid: negative
          verified: false
        }
      });

      expect(() => SocialEventSchema.parse(event)).toThrow();
    });
  });

  describe('BrandPlaybookSchema', () => {
    it('should validate a complete brand playbook', () => {
      const playbook = testUtils.createTestBrandPlaybook();
      
      expect(() => BrandPlaybookSchema.parse(playbook)).not.toThrow();
    });

    it('should require all mandatory fields', () => {
      const incompletePlaybook = {
        id: 'test-id',
        brandId: 'brand-123',
        version: '1.0'
        // Missing required fields
      };

      expect(() => BrandPlaybookSchema.parse(incompletePlaybook)).toThrow();
    });

    it('should validate platform-specific rules', () => {
      const playbook = testUtils.createTestBrandPlaybook({
        platformSpecificRules: {
          tiktok: {
            maxVideoLength: 180,
            hashtagLimit: 5
          },
          instagram: {
            maxCaptionLength: 2200,
            hashtagLimit: 30
          }
        }
      });

      expect(() => BrandPlaybookSchema.parse(playbook)).not.toThrow();
    });
  });

  describe('PersonaSchema', () => {
    it('should validate a complete persona', () => {
      const persona = testUtils.createTestPersona();
      
      expect(() => PersonaSchema.parse(persona)).not.toThrow();
    });

    it('should validate platform preferences', () => {
      const persona = testUtils.createTestPersona({
        platformPreferences: {
          primary: [Platform.INSTAGRAM, Platform.TIKTOK],
          secondary: [Platform.YOUTUBE],
          contentTypes: ['video', 'image'],
          engagementStyle: 'likes_and_shares',
          activeHours: ['9am-11am', '7pm-9pm']
        }
      });

      expect(() => PersonaSchema.parse(persona)).not.toThrow();
    });
  });

  describe('AssetIntelligenceSchema', () => {
    it('should validate a complete asset', () => {
      const asset = {
        id: 'asset-123',
        type: 'video' as const,
        brandId: 'brand-123',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          title: 'Test Video',
          description: 'A test video asset',
          tags: ['test', 'video'],
          category: 'marketing',
          creator: {
            type: 'internal' as const,
            id: 'creator-123',
            name: 'Test Creator',
            attribution: 'Created by Test Creator'
          }
        },
        technicalSpecs: {
          fileUrl: 'https://example.com/video.mp4',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          duration: 60,
          dimensions: {
            width: 1920,
            height: 1080,
            aspectRatio: '16:9'
          },
          fileSize: 10485760,
          format: 'mp4',
          quality: '1080p'
        },
        usageRights: {
          license: 'brand_owned' as const,
          platforms: [Platform.TIKTOK, Platform.INSTAGRAM],
          restrictions: [],
          commercialUse: true
        },
        performanceData: {
          totalViews: 1000,
          totalEngagements: 100,
          averageEngagementRate: 0.1,
          platformPerformance: {
            tiktok: {
              views: 600,
              likes: 50,
              shares: 10,
              comments: 5,
              engagementRate: 0.108
            }
          },
          audienceInsights: {
            topDemographics: ['25-34', 'tech_enthusiasts'],
            peakEngagementHours: ['7pm-9pm'],
            sentimentBreakdown: {
              positive: 0.8,
              neutral: 0.15,
              negative: 0.05
            }
          }
        },
        contentAnalysis: {
          topics: ['technology', 'innovation'],
          sentiment: SentimentLabel.POSITIVE,
          brandMentions: ['test-brand'],
          competitorMentions: [],
          keyMessages: ['innovation', 'quality']
        },
        optimizationSuggestions: {
          bestPerformingPlatforms: [Platform.TIKTOK],
          optimalPostingTimes: ['7pm-8pm'],
          recommendedHashtags: ['#tech', '#innovation'],
          contentImprovements: ['add_captions']
        }
      };

      expect(() => AssetIntelligenceSchema.parse(asset)).not.toThrow();
    });

    it('should reject invalid file size', () => {
      const asset = {
        id: 'asset-123',
        type: 'video' as const,
        brandId: 'brand-123',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          title: 'Test Video',
          description: 'A test video asset',
          tags: ['test'],
          category: 'marketing',
          creator: {
            type: 'internal' as const,
            id: 'creator-123',
            name: 'Test Creator',
            attribution: 'Created by Test Creator'
          }
        },
        technicalSpecs: {
          fileUrl: 'https://example.com/video.mp4',
          fileSize: -1000, // Invalid: negative
          format: 'mp4'
        },
        usageRights: {
          license: 'brand_owned' as const,
          platforms: [Platform.TIKTOK],
          restrictions: [],
          commercialUse: true
        },
        performanceData: {
          totalViews: 0,
          totalEngagements: 0,
          averageEngagementRate: 0,
          platformPerformance: {},
          audienceInsights: {
            topDemographics: [],
            peakEngagementHours: [],
            sentimentBreakdown: {
              positive: 0,
              neutral: 0,
              negative: 0
            }
          }
        },
        contentAnalysis: {
          topics: [],
          sentiment: SentimentLabel.NEUTRAL,
          brandMentions: [],
          competitorMentions: [],
          keyMessages: []
        },
        optimizationSuggestions: {
          bestPerformingPlatforms: [],
          optimalPostingTimes: [],
          recommendedHashtags: [],
          contentImprovements: []
        }
      };

      expect(() => AssetIntelligenceSchema.parse(asset)).toThrow();
    });
  });

  describe('DecisionOutputSchema', () => {
    it('should validate a complete decision output', () => {
      const decision = {
        id: 'decision-123',
        eventId: 'event-123',
        timestamp: new Date().toISOString(),
        brandContext: {
          brandId: 'brand-123',
          playbookVersion: '1.0',
          matchedPersona: 'persona-123',
          complianceStatus: 'approved'
        },
        analysis: {
          sentiment: {
            score: 0.8,
            label: SentimentLabel.POSITIVE,
            confidence: 0.9
          },
          intent: {
            primary: IntentCategory.PURCHASE_INQUIRY,
            secondary: IntentCategory.INFORMATION_SEEKING,
            confidence: 0.85
          },
          topics: ['product', 'pricing'],
          urgency: UrgencyLevel.MEDIUM,
          brandImpact: 'positive_opportunity'
        },
        decision: {
          primaryAction: ActionType.RESPOND,
          secondaryActions: [ActionType.ESCALATE],
          confidence: 0.88,
          reasoning: 'High-intent purchase inquiry with positive sentiment',
          humanReviewRequired: false,
          escalationLevel: 'none'
        },
        recommendedActions: [
          {
            type: ActionType.RESPOND,
            priority: 1,
            action: {
              platform: 'tiktok',
              responseType: 'comment',
              content: 'Thank you for your interest!'
            },
            timing: 'immediate',
            approvalRequired: false
          }
        ],
        webhooks: [
          {
            endpoint: 'https://api.example.com/webhook',
            payload: {
              eventType: 'decision_made',
              data: {}
            },
            retryPolicy: 'exponential_backoff'
          }
        ],
        monitoring: {
          trackingId: 'track-123',
          kpis: ['response_time', 'customer_satisfaction'],
          followUpRequired: true,
          followUpDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      };

      expect(() => DecisionOutputSchema.parse(decision)).not.toThrow();
    });

    it('should reject invalid confidence scores', () => {
      const decision = {
        id: 'decision-123',
        eventId: 'event-123',
        timestamp: new Date().toISOString(),
        brandContext: {
          brandId: 'brand-123',
          playbookVersion: '1.0',
          complianceStatus: 'approved'
        },
        analysis: {
          sentiment: {
            score: 2.0, // Invalid: > 1
            label: SentimentLabel.POSITIVE,
            confidence: 0.9
          },
          intent: {
            primary: IntentCategory.PURCHASE_INQUIRY,
            confidence: 1.5 // Invalid: > 1
          },
          topics: [],
          urgency: UrgencyLevel.MEDIUM,
          brandImpact: 'positive'
        },
        decision: {
          primaryAction: ActionType.RESPOND,
          secondaryActions: [],
          confidence: -0.1, // Invalid: < 0
          reasoning: 'Test reasoning',
          humanReviewRequired: false,
          escalationLevel: 'none'
        },
        recommendedActions: [],
        webhooks: [],
        monitoring: {
          trackingId: 'track-123',
          kpis: [],
          followUpRequired: false
        }
      };

      expect(() => DecisionOutputSchema.parse(decision)).toThrow();
    });
  });

  describe('Enums', () => {
    it('should have correct Platform values', () => {
      expect(Platform.TIKTOK).toBe('tiktok');
      expect(Platform.INSTAGRAM).toBe('instagram');
      expect(Platform.FACEBOOK).toBe('facebook');
      expect(Platform.YOUTUBE).toBe('youtube');
      expect(Platform.REDDIT).toBe('reddit');
      expect(Platform.RSS).toBe('rss');
    });

    it('should have correct EventType values', () => {
      expect(EventType.POST).toBe('post');
      expect(EventType.COMMENT).toBe('comment');
      expect(EventType.MENTION).toBe('mention');
      expect(EventType.MESSAGE).toBe('message');
      expect(EventType.SHARE).toBe('share');
      expect(EventType.REACTION).toBe('reaction');
    });

    it('should have correct SentimentLabel values', () => {
      expect(SentimentLabel.POSITIVE).toBe('positive');
      expect(SentimentLabel.NEGATIVE).toBe('negative');
      expect(SentimentLabel.NEUTRAL).toBe('neutral');
    });

    it('should have correct IntentCategory values', () => {
      expect(IntentCategory.PURCHASE_INQUIRY).toBe('purchase_inquiry');
      expect(IntentCategory.SUPPORT_REQUEST).toBe('support_request');
      expect(IntentCategory.COMPLAINT).toBe('complaint');
      expect(IntentCategory.INFORMATION_SEEKING).toBe('information_seeking');
      expect(IntentCategory.PRAISE).toBe('praise');
      expect(IntentCategory.FEATURE_REQUEST).toBe('feature_request');
      expect(IntentCategory.COMPARISON_SHOPPING).toBe('comparison_shopping');
    });

    it('should have correct ActionType values', () => {
      expect(ActionType.RESPOND).toBe('respond');
      expect(ActionType.ENGAGE).toBe('engage');
      expect(ActionType.CREATE).toBe('create');
      expect(ActionType.ESCALATE).toBe('escalate');
      expect(ActionType.MONITOR).toBe('monitor');
      expect(ActionType.SUPPRESS).toBe('suppress');
    });

    it('should have correct UrgencyLevel values', () => {
      expect(UrgencyLevel.CRITICAL).toBe('critical');
      expect(UrgencyLevel.HIGH).toBe('high');
      expect(UrgencyLevel.MEDIUM).toBe('medium');
      expect(UrgencyLevel.LOW).toBe('low');
      expect(UrgencyLevel.MINIMAL).toBe('minimal');
    });
  });
});