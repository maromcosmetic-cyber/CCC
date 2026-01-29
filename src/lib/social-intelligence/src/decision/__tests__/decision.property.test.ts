/**
 * Property-Based Tests for Decision Engine
 * Tests universal correctness properties for decision-making components
 * 
 * **Validates: Requirements 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7**
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { fc } from 'fast-check';
import { 
  SocialEvent, 
  Platform, 
  EventType, 
  ContentType, 
  SentimentLabel, 
  IntentCategory, 
  UrgencyLevel,
  ActionType,
  BrandContext
} from '../../types/core';
import { SentimentResult } from '../../ai/SentimentAnalysisService';
import { IntentResult } from '../../ai/IntentDetectionService';
import { PriorityScoringService, PriorityConfig } from '../PriorityScoringService';
import { DecisionRoutingService, RoutingConfig } from '../DecisionRoutingService';
import { ActionExecutionService, ActionExecutionConfig } from '../ActionExecutionService';
import { DecisionEngine, DecisionEngineConfig } from '../DecisionEngine';

// Test data generators
const platformArb = fc.constantFrom(...Object.values(Platform));
const eventTypeArb = fc.constantFrom(...Object.values(EventType));
const contentTypeArb = fc.constantFrom(...Object.values(ContentType));
const sentimentLabelArb = fc.constantFrom(...Object.values(SentimentLabel));
const intentCategoryArb = fc.constantFrom(...Object.values(IntentCategory));
const urgencyLevelArb = fc.constantFrom(...Object.values(UrgencyLevel));
const actionTypeArb = fc.constantFrom(...Object.values(ActionType));

const socialEventArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 50 }),
  platform: platformArb,
  platformId: fc.string({ minLength: 1, maxLength: 50 }),
  timestamp: fc.date().map(d => d.toISOString()),
  eventType: eventTypeArb,
  content: fc.record({
    text: fc.string({ minLength: 1, maxLength: 500 }),
    mediaUrls: fc.array(fc.webUrl(), { maxLength: 3 }),
    hashtags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
    mentions: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
    language: fc.constantFrom('en', 'es', 'fr', 'de')
  }),
  author: fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }),
    username: fc.string({ minLength: 1, maxLength: 30 }),
    displayName: fc.string({ minLength: 1, maxLength: 50 }),
    followerCount: fc.integer({ min: 0, max: 10000000 }),
    verified: fc.boolean(),
    profileUrl: fc.option(fc.webUrl())
  }),
  engagement: fc.record({
    likes: fc.integer({ min: 0, max: 100000 }),
    shares: fc.integer({ min: 0, max: 10000 }),
    comments: fc.integer({ min: 0, max: 1000 }),
    views: fc.integer({ min: 0, max: 1000000 }),
    engagementRate: fc.float({ min: 0, max: 1 })
  }),
  context: fc.option(fc.record({
    parentPostId: fc.option(fc.string()),
    threadId: fc.option(fc.string()),
    conversationId: fc.option(fc.string()),
    isReply: fc.boolean(),
    replyToUserId: fc.option(fc.string())
  })),
  location: fc.option(fc.record({
    country: fc.option(fc.string()),
    region: fc.option(fc.string()),
    city: fc.option(fc.string()),
    coordinates: fc.option(fc.tuple(fc.float(), fc.float()))
  })),
  metadata: fc.record({
    source: fc.constantFrom('api', 'webhook', 'crawler'),
    processingTimestamp: fc.date().map(d => d.toISOString()),
    version: fc.constant('1.0'),
    rawData: fc.option(fc.string())
  })
});

const sentimentResultArb = fc.record({
  overall: fc.record({
    label: sentimentLabelArb,
    score: fc.float({ min: -1, max: 1 }),
    confidence: fc.float({ min: 0, max: 1 })
  }),
  modelScores: fc.record({
    bert: fc.option(fc.float({ min: -1, max: 1 })),
    roberta: fc.option(fc.float({ min: -1, max: 1 })),
    vader: fc.option(fc.float({ min: -1, max: 1 }))
  }),
  aspectSentiments: fc.array(fc.record({
    aspect: fc.string({ minLength: 1, maxLength: 20 }),
    sentiment: sentimentLabelArb,
    score: fc.float({ min: -1, max: 1 }),
    confidence: fc.float({ min: 0, max: 1 }),
    mentions: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 3 })
  }), { maxLength: 5 }),
  platformAdjusted: fc.record({
    originalScore: fc.float({ min: -1, max: 1 }),
    adjustedScore: fc.float({ min: -1, max: 1 }),
    adjustmentFactor: fc.float({ min: 0.5, max: 2 })
  }),
  metadata: fc.record({
    processingTime: fc.integer({ min: 1, max: 5000 }),
    textLength: fc.integer({ min: 1, max: 500 }),
    language: fc.string(),
    modelVersions: fc.record({
      bert: fc.constant('1.0.0'),
      roberta: fc.constant('1.0.0'),
      vader: fc.constant('1.0.0')
    })
  })
});

const intentResultArb = fc.record({
  primary: fc.record({
    intent: intentCategoryArb,
    confidence: fc.float({ min: 0, max: 1 }),
    reasoning: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 3 })
  }),
  secondary: fc.option(fc.record({
    intent: intentCategoryArb,
    confidence: fc.float({ min: 0, max: 1 }),
    reasoning: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 3 })
  })),
  entities: fc.array(fc.record({
    type: fc.constantFrom('PRODUCT', 'PRICE', 'TIME', 'EMAIL', 'PERSON'),
    value: fc.string({ minLength: 1, maxLength: 50 }),
    confidence: fc.float({ min: 0, max: 1 }),
    position: fc.record({
      start: fc.integer({ min: 0, max: 100 }),
      end: fc.integer({ min: 0, max: 100 })
    })
  }), { maxLength: 5 }),
  urgency: fc.record({
    level: urgencyLevelArb,
    score: fc.float({ min: 0, max: 1 }),
    factors: fc.array(fc.record({
      factor: fc.string({ minLength: 1, maxLength: 50 }),
      impact: fc.float({ min: 0, max: 1 }),
      reasoning: fc.string({ minLength: 1, maxLength: 100 })
    }), { maxLength: 5 })
  }),
  nextActions: fc.array(fc.record({
    action: fc.string({ minLength: 1, maxLength: 50 }),
    priority: fc.integer({ min: 1, max: 5 }),
    confidence: fc.float({ min: 0, max: 1 }),
    reasoning: fc.string({ minLength: 1, maxLength: 100 })
  }), { maxLength: 5 }),
  metadata: fc.record({
    processingTime: fc.integer({ min: 1, max: 5000 }),
    modelVersion: fc.constant('1.0.0'),
    fallbackUsed: fc.boolean(),
    textLength: fc.integer({ min: 1, max: 500 })
  })
});

const brandContextArb = fc.record({
  brandId: fc.string({ minLength: 1, maxLength: 50 }),
  playbook: fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }),
    brandId: fc.string({ minLength: 1, maxLength: 50 }),
    version: fc.string({ minLength: 1, maxLength: 10 }),
    lastUpdated: fc.date().map(d => d.toISOString()),
    brandIdentity: fc.record({
      name: fc.string({ minLength: 1, maxLength: 50 }),
      tagline: fc.string({ minLength: 1, maxLength: 100 }),
      mission: fc.string({ minLength: 1, maxLength: 200 }),
      values: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
      personality: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 })
    }),
    voiceAndTone: fc.record({
      primaryTone: fc.constantFrom('professional', 'friendly', 'casual', 'authoritative'),
      attributes: fc.record({
        formality: fc.constantFrom('formal', 'moderate', 'casual'),
        enthusiasm: fc.constantFrom('high', 'moderate', 'low'),
        empathy: fc.constantFrom('high', 'moderate', 'low'),
        authority: fc.constantFrom('high', 'moderate', 'low')
      }),
      doUse: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 5 }),
      dontUse: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 5 })
    }),
    complianceRules: fc.record({
      forbiddenClaims: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { maxLength: 5 }),
      requiredDisclosures: fc.array(fc.record({
        trigger: fc.string({ minLength: 1, maxLength: 50 }),
        disclosure: fc.string({ minLength: 1, maxLength: 200 })
      }), { maxLength: 3 }),
      regulatoryCompliance: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 3 }),
      contentRestrictions: fc.dictionary(fc.string(), fc.boolean())
    }),
    visualGuidelines: fc.record({
      logoUsage: fc.record({
        primaryLogo: fc.webUrl(),
        variations: fc.array(fc.string(), { maxLength: 3 }),
        minSize: fc.string(),
        clearSpace: fc.string()
      }),
      colorPalette: fc.record({
        primary: fc.string(),
        secondary: fc.string(),
        accent: fc.string(),
        neutral: fc.array(fc.string(), { maxLength: 3 })
      }),
      typography: fc.record({
        primary: fc.string(),
        secondary: fc.string(),
        headingStyle: fc.string(),
        bodyStyle: fc.string()
      })
    }),
    platformSpecificRules: fc.dictionary(fc.string(), fc.record({
      maxVideoLength: fc.option(fc.integer({ min: 1, max: 300 })),
      preferredAspectRatio: fc.option(fc.string()),
      hashtagLimit: fc.option(fc.integer({ min: 1, max: 30 })),
      maxCaptionLength: fc.option(fc.integer({ min: 1, max: 2000 })),
      toneAdjustment: fc.option(fc.string()),
      includeCompanyUpdates: fc.option(fc.boolean())
    }))
  }),
  personas: fc.array(fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    brandId: fc.string({ minLength: 1, maxLength: 50 }),
    demographics: fc.record({
      ageRange: fc.string(),
      gender: fc.string(),
      income: fc.string(),
      education: fc.string(),
      location: fc.array(fc.string(), { maxLength: 3 }),
      occupation: fc.array(fc.string(), { maxLength: 3 })
    }),
    psychographics: fc.record({
      interests: fc.array(fc.string(), { maxLength: 5 }),
      values: fc.array(fc.string(), { maxLength: 5 }),
      lifestyle: fc.array(fc.string(), { maxLength: 5 }),
      painPoints: fc.array(fc.string(), { maxLength: 5 })
    }),
    behaviorPatterns: fc.record({
      purchaseDrivers: fc.array(fc.string(), { maxLength: 5 }),
      decisionMakingStyle: fc.string(),
      brandLoyalty: fc.string(),
      pricesensitivity: fc.string(),
      communicationPreference: fc.string()
    }),
    platformPreferences: fc.record({
      primary: fc.array(platformArb, { maxLength: 3 }),
      secondary: fc.array(platformArb, { maxLength: 3 }),
      contentTypes: fc.array(fc.string(), { maxLength: 3 }),
      engagementStyle: fc.string(),
      activeHours: fc.array(fc.string(), { maxLength: 5 })
    }),
    triggers: fc.record({
      positive: fc.array(fc.string(), { maxLength: 5 }),
      negative: fc.array(fc.string(), { maxLength: 5 })
    }),
    responseStrategies: fc.record({
      contentTone: fc.string(),
      messageLength: fc.string(),
      includeData: fc.boolean(),
      visualStyle: fc.string(),
      callToAction: fc.string()
    })
  }), { minLength: 1, maxLength: 3 }),
  assets: fc.array(fc.record({
    id: fc.string(),
    type: contentTypeArb,
    brandId: fc.string(),
    createdAt: fc.date().map(d => d.toISOString()),
    updatedAt: fc.date().map(d => d.toISOString()),
    metadata: fc.record({
      title: fc.string(),
      description: fc.string(),
      tags: fc.array(fc.string(), { maxLength: 5 }),
      category: fc.string(),
      creator: fc.record({
        type: fc.constantFrom('internal', 'ugc', 'influencer'),
        id: fc.string(),
        name: fc.string(),
        attribution: fc.string()
      })
    }),
    technicalSpecs: fc.record({
      fileUrl: fc.webUrl(),
      thumbnailUrl: fc.option(fc.webUrl()),
      duration: fc.option(fc.integer({ min: 1, max: 300 })),
      dimensions: fc.option(fc.record({
        width: fc.integer({ min: 1, max: 4000 }),
        height: fc.integer({ min: 1, max: 4000 }),
        aspectRatio: fc.string()
      })),
      fileSize: fc.integer({ min: 1, max: 100000000 }),
      format: fc.string(),
      quality: fc.option(fc.string())
    }),
    usageRights: fc.record({
      license: fc.constantFrom('brand_owned', 'licensed', 'ugc_permission'),
      expirationDate: fc.option(fc.date().map(d => d.toISOString())),
      platforms: fc.array(platformArb, { maxLength: 6 }),
      restrictions: fc.array(fc.string(), { maxLength: 3 }),
      commercialUse: fc.boolean()
    }),
    performanceData: fc.record({
      totalViews: fc.integer({ min: 0, max: 1000000 }),
      totalEngagements: fc.integer({ min: 0, max: 100000 }),
      averageEngagementRate: fc.float({ min: 0, max: 1 }),
      platformPerformance: fc.dictionary(fc.string(), fc.record({
        views: fc.integer({ min: 0, max: 1000000 }),
        likes: fc.integer({ min: 0, max: 100000 }),
        shares: fc.integer({ min: 0, max: 10000 }),
        comments: fc.integer({ min: 0, max: 1000 }),
        engagementRate: fc.float({ min: 0, max: 1 })
      })),
      audienceInsights: fc.record({
        topDemographics: fc.array(fc.string(), { maxLength: 5 }),
        peakEngagementHours: fc.array(fc.string(), { maxLength: 5 }),
        sentimentBreakdown: fc.record({
          positive: fc.float({ min: 0, max: 1 }),
          neutral: fc.float({ min: 0, max: 1 }),
          negative: fc.float({ min: 0, max: 1 })
        })
      })
    }),
    contentAnalysis: fc.record({
      topics: fc.array(fc.string(), { maxLength: 5 }),
      sentiment: sentimentLabelArb,
      brandMentions: fc.array(fc.string(), { maxLength: 3 }),
      competitorMentions: fc.array(fc.string(), { maxLength: 3 }),
      keyMessages: fc.array(fc.string(), { maxLength: 5 })
    }),
    optimizationSuggestions: fc.record({
      bestPerformingPlatforms: fc.array(platformArb, { maxLength: 3 }),
      optimalPostingTimes: fc.array(fc.string(), { maxLength: 5 }),
      recommendedHashtags: fc.array(fc.string(), { maxLength: 10 }),
      contentImprovements: fc.array(fc.string(), { maxLength: 5 })
    })
  }), { maxLength: 3 })
});

// Test configurations
const createTestPriorityConfig = () => ({
  weights: {
    urgency: 0.3,
    impact: 0.25,
    sentiment: 0.2,
    reach: 0.15,
    brandRisk: 0.1
  },
  urgencyScoring: {
    [UrgencyLevel.CRITICAL]: 1.0,
    [UrgencyLevel.HIGH]: 0.8,
    [UrgencyLevel.MEDIUM]: 0.6,
    [UrgencyLevel.LOW]: 0.4,
    [UrgencyLevel.MINIMAL]: 0.2
  },
  impactFactors: {
    intentMultipliers: {
      [IntentCategory.COMPLAINT]: 1.0,
      [IntentCategory.SUPPORT_REQUEST]: 0.8,
      [IntentCategory.PURCHASE_INQUIRY]: 0.7,
      [IntentCategory.FEATURE_REQUEST]: 0.5,
      [IntentCategory.INFORMATION_SEEKING]: 0.4,
      [IntentCategory.COMPARISON_SHOPPING]: 0.6,
      [IntentCategory.PRAISE]: 0.3
    },
    platformMultipliers: {
      [Platform.TIKTOK]: 1.2,
      [Platform.INSTAGRAM]: 1.1,
      [Platform.FACEBOOK]: 1.0,
      [Platform.YOUTUBE]: 0.9,
      [Platform.REDDIT]: 0.8,
      [Platform.RSS]: 0.7
    },
    verifiedAccountBonus: 0.1,
    highEngagementThreshold: 0.05,
    highEngagementBonus: 0.15
  },
  sentimentImpact: {
    positiveBonus: 0.1,
    negativeMultiplier: 1.3,
    neutralBase: 0.5,
    confidenceThreshold: 0.7
  },
  reachFactors: {
    followerCountWeight: 0.6,
    engagementRateWeight: 0.4,
    viralityThreshold: 0.1,
    viralityBonus: 0.2,
    platformReachModifiers: {
      [Platform.TIKTOK]: 1.3,
      [Platform.INSTAGRAM]: 1.2,
      [Platform.FACEBOOK]: 1.0,
      [Platform.YOUTUBE]: 1.1,
      [Platform.REDDIT]: 0.9,
      [Platform.RSS]: 0.8
    }
  },
  brandRisk: {
    complianceViolationMultiplier: 2.0,
    negativeViralityRisk: 0.3,
    competitorMentionRisk: 0.2,
    crisisKeywords: ['lawsuit', 'recall', 'dangerous', 'toxic', 'scam'],
    crisisMultiplier: 0.5
  },
  businessRules: {
    minimumScore: 0.0,
    maximumScore: 1.0,
    autoEscalationThreshold: 0.8,
    timeDecayFactor: 0.95,
    timeDecayHours: 24
  }
});

const createTestRoutingConfig = () => ({
  confidenceThresholds: {
    autoResponse: 0.9,
    suggestion: 0.7,
    humanReview: 0.0
  },
  routingRules: {
    alwaysHumanReview: {
      intents: [IntentCategory.COMPLAINT],
      urgencyLevels: [UrgencyLevel.CRITICAL],
      priorityThreshold: 90
    },
    neverAutoRespond: {
      intents: [IntentCategory.COMPLAINT],
      platforms: [],
      keywords: ['legal', 'lawsuit', 'attorney']
    },
    confidenceOverrides: [
      {
        condition: 'verified === true && followerCount > 100000',
        newConfidence: 0.95,
        reasoning: 'High-profile verified account'
      }
    ]
  },
  queues: {
    autoResponse: {
      maxConcurrent: 10,
      retryAttempts: 3,
      timeoutMs: 30000
    },
    humanReview: {
      priorityLevels: 5,
      escalationTimeoutMs: 3600000,
      assignmentStrategy: 'priority'
    },
    suggestions: {
      maxSuggestions: 3,
      suggestionTimeoutMs: 14400000,
      requireApproval: true
    }
  }
});

const createTestExecutionConfig = () => ({
  responseGeneration: {
    templates: {
      thank_you: {
        content: 'Thank you {{username}} for your feedback!',
        variables: ['username'],
        platforms: Object.values(Platform),
        maxLength: 280
      },
      complaint_response: {
        content: 'Hi {{username}}, we apologize for the issue. Please DM us for assistance.',
        variables: ['username'],
        platforms: Object.values(Platform),
        maxLength: 280
      }
    },
    aiGeneration: {
      enabled: false,
      fallbackToTemplate: true,
      maxRetries: 2
    },
    personalization: {
      enabled: true,
      includeUsername: true,
      includePlatformContext: true,
      includeProductRecommendations: false
    }
  },
  supportTickets: {
    enabled: true,
    system: 'custom',
    defaultPriority: 'medium',
    autoAssignment: true,
    ticketFields: {}
  },
  crm: {
    enabled: true,
    system: 'custom',
    leadScoring: {
      enabled: true,
      factors: {
        intent: 30,
        sentiment: 10,
        engagement: 15,
        verified: 10,
        followers: 5
      }
    },
    opportunityCreation: {
      enabled: true,
      minimumScore: 70,
      defaultStage: 'qualification'
    }
  },
  webhooks: {
    enabled: false,
    endpoints: []
  },
  limits: {
    maxConcurrentActions: 20,
    rateLimits: {
      [ActionType.RESPOND]: { maxPerHour: 100, maxPerDay: 1000 },
      [ActionType.ESCALATE]: { maxPerHour: 50, maxPerDay: 200 },
      [ActionType.CREATE]: { maxPerHour: 30, maxPerDay: 100 },
      [ActionType.MONITOR]: { maxPerHour: 200, maxPerDay: 2000 },
      [ActionType.ENGAGE]: { maxPerHour: 150, maxPerDay: 1500 },
      [ActionType.SUPPRESS]: { maxPerHour: 10, maxPerDay: 50 }
    },
    timeouts: {
      responseGeneration: 10000,
      supportTicket: 15000,
      crmUpdate: 20000,
      webhook: 5000
    }
  }
});

const createTestDecisionEngineConfig = () => ({
  priority: createTestPriorityConfig(),
  routing: createTestRoutingConfig(),
  execution: createTestExecutionConfig(),
  engine: {
    enableParallelProcessing: true,
    maxConcurrentDecisions: 5,
    decisionTimeoutMs: 60000,
    enableDecisionCaching: true,
    cacheExpirationMs: 300000
  },
  qualityAssurance: {
    enableValidation: true,
    requireMinimumConfidence: 0.5,
    enableAuditLogging: true,
    enablePerformanceMonitoring: true
  }
});

describe('Decision Engine Property Tests', () => {
  let priorityService;
  let routingService;
  let executionService;
  let decisionEngine;

  beforeEach(() => {
    const priorityConfig = createTestPriorityConfig();
    const routingConfig = createTestRoutingConfig();
    const executionConfig = createTestExecutionConfig();
    const engineConfig = createTestDecisionEngineConfig();

    priorityService = new PriorityScoringService(priorityConfig);
    routingService = new DecisionRoutingService(routingConfig);
    executionService = new ActionExecutionService(executionConfig);
    decisionEngine = new DecisionEngine(engineConfig);
  });

  /**
   * Property 7: Confidence-based decision making and review routing
   * **Validates: Requirements 5.6, 6.2, 6.3, 6.7**
   */
  test('Property 7: Confidence-based decision making and review routing', () => {
    fc.assert(fc.property(
      socialEventArb,
      sentimentResultArb,
      intentResultArb,
      brandContextArb,
      async (event, sentimentResult, intentResult, brandContext) => {
        // Calculate priority score
        const priorityScore = await priorityService.calculatePriority(
          event,
          sentimentResult,
          intentResult,
          brandContext
        );

        // Route decision
        const routingDecision = await routingService.routeDecision(
          event,
          sentimentResult,
          intentResult,
          priorityScore,
          brandContext
        );

        // Confidence-based routing assertions
        if (routingDecision.confidence >= 0.9) {
          // High confidence should route to auto-response (unless overridden)
          const isOverridden = routingDecision.metadata.overridesApplied.length > 0;
          if (!isOverridden) {
            expect(routingDecision.route).toBe('auto-response');
          }
        } else if (routingDecision.confidence >= 0.7) {
          // Medium confidence should route to suggestions (unless overridden)
          const isOverridden = routingDecision.metadata.overridesApplied.length > 0;
          if (!isOverridden && routingDecision.route !== 'human-review') {
            expect(routingDecision.route).toBe('suggestion');
          }
        } else {
          // Low confidence should route to human review
          expect(routingDecision.route).toBe('human-review');
        }

        // Routing decision must have valid confidence
        expect(routingDecision.confidence).toBeGreaterThanOrEqual(0);
        expect(routingDecision.confidence).toBeLessThanOrEqual(1);

        // Routing decision must have reasoning
        expect(routingDecision.reasoning).toBeDefined();
        expect(routingDecision.reasoning.length).toBeGreaterThan(0);

        // Actions must be appropriate for route
        expect(routingDecision.actions).toBeDefined();
        expect(Array.isArray(routingDecision.actions)).toBe(true);

        // Auto-response actions should be automated
        if (routingDecision.route === 'auto-response') {
          const automatedActions = routingDecision.actions.filter(a => a.automated);
          expect(automatedActions.length).toBeGreaterThan(0);
        }

        // Human review should have escalation info
        if (routingDecision.route === 'human-review') {
          expect(routingDecision.escalation).toBeDefined();
          expect(routingDecision.queue.estimatedWaitTime).toBeDefined();
        }

        // Suggestions should require approval
        if (routingDecision.route === 'suggestion') {
          const approvalRequired = routingDecision.actions.some(a => a.requiresApproval);
          expect(approvalRequired).toBe(true);
        }

        return true;
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 8: Priority-based action determination
   * **Validates: Requirements 6.1**
   */
  test('Property 8: Priority-based action determination', () => {
    fc.assert(fc.property(
      socialEventArb,
      sentimentResultArb,
      intentResultArb,
      brandContextArb,
      async (event, sentimentResult, intentResult, brandContext) => {
        // Calculate priority score
        const priorityScore = await priorityService.calculatePriority(
          event,
          sentimentResult,
          intentResult,
          brandContext
        );

        // Priority score must be within valid range
        expect(priorityScore.overall).toBeGreaterThanOrEqual(0);
        expect(priorityScore.overall).toBeLessThanOrEqual(100);

        // Priority components must be within valid range
        Object.values(priorityScore.components).forEach(component => {
          expect(component).toBeGreaterThanOrEqual(0);
          expect(component).toBeLessThanOrEqual(1);
        });

        // Priority factors must have valid contributions
        priorityScore.factors.forEach(factor => {
          expect(factor.value).toBeGreaterThanOrEqual(0);
          expect(factor.weight).toBeGreaterThanOrEqual(0);
          expect(factor.contribution).toBeGreaterThanOrEqual(0);
          expect(factor.reasoning).toBeDefined();
          expect(factor.reasoning.length).toBeGreaterThan(0);
        });

        // High priority events should trigger auto-escalation
        if (priorityScore.overall >= 80) {
          expect(priorityScore.businessRules.autoEscalation).toBe(true);
        }

        // Priority calculation must be deterministic for same inputs
        const priorityScore2 = await priorityService.calculatePriority(
          event,
          sentimentResult,
          intentResult,
          brandContext
        );
        expect(Math.abs(priorityScore.overall - priorityScore2.overall)).toBeLessThan(0.01);

        // Confidence must be reasonable
        expect(priorityScore.metadata.confidence).toBeGreaterThanOrEqual(0.1);
        expect(priorityScore.metadata.confidence).toBeLessThanOrEqual(1.0);

        return true;
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 9: Event-driven system integration
   * **Validates: Requirements 6.4, 6.5, 6.6**
   */
  test('Property 9: Event-driven system integration', () => {
    fc.assert(fc.property(
      socialEventArb,
      sentimentResultArb,
      intentResultArb,
      brandContextArb,
      async (event, sentimentResult, intentResult, brandContext) => {
        // Process complete decision pipeline
        const result = await decisionEngine.processEvent(
          event,
          sentimentResult,
          intentResult,
          brandContext
        );

        // Decision result must have all required components
        expect(result.decisionId).toBeDefined();
        expect(result.eventId).toBe(event.id);
        expect(result.timestamp).toBeDefined();
        expect(result.priorityScore).toBeDefined();
        expect(result.routingDecision).toBeDefined();
        expect(result.executionResults).toBeDefined();
        expect(result.decisionOutput).toBeDefined();

        // Performance metrics must be reasonable
        expect(result.performance.totalProcessingTime).toBeGreaterThan(0);
        expect(result.performance.priorityCalculationTime).toBeGreaterThan(0);
        expect(result.performance.routingDecisionTime).toBeGreaterThan(0);
        expect(result.performance.actionExecutionTime).toBeGreaterThanOrEqual(0);

        // Total time should be sum of component times (approximately)
        const componentSum = 
          result.performance.priorityCalculationTime +
          result.performance.routingDecisionTime +
          result.performance.actionExecutionTime;
        
        // Allow for some overhead in total time
        expect(result.performance.totalProcessingTime).toBeGreaterThanOrEqual(componentSum * 0.8);

        // Quality metrics must be valid
        expect(result.quality.overallConfidence).toBeGreaterThanOrEqual(0);
        expect(result.quality.overallConfidence).toBeLessThanOrEqual(1);
        expect(result.quality.validationPassed).toBeDefined();
        expect(result.quality.auditTrail).toBeDefined();
        expect(result.quality.auditTrail.length).toBeGreaterThan(0);

        // Decision output must be properly formatted
        expect(result.decisionOutput.id).toBe(result.decisionId);
        expect(result.decisionOutput.eventId).toBe(event.id);
        expect(result.decisionOutput.brandContext.brandId).toBe(brandContext.brandId);

        // Execution results must match routing decision
        if (result.routingDecision.route === 'auto-response') {
          expect(result.executionResults.length).toBeGreaterThan(0);
        }

        // All execution results must have valid status
        result.executionResults.forEach(execResult => {
          expect(['success', 'failed', 'partial', 'pending']).toContain(execResult.status);
          expect(execResult.executionTime).toBeGreaterThanOrEqual(0);
          expect(execResult.metadata.eventId).toBe(event.id);
        });

        // Audit trail must show progression through stages
        const stageNames = result.quality.auditTrail.map(entry => entry.stage);
        expect(stageNames).toContain('priority_scoring_start');
        expect(stageNames).toContain('priority_scoring_complete');
        expect(stageNames).toContain('routing_start');
        expect(stageNames).toContain('routing_complete');

        return true;
      }
    ), { numRuns: 50 }); // Reduced runs due to complexity
  });

  /**
   * Property: Decision consistency and determinism
   * Ensures that identical inputs produce consistent decisions
   */
  test('Property: Decision consistency and determinism', () => {
    fc.assert(fc.property(
      socialEventArb,
      sentimentResultArb,
      intentResultArb,
      brandContextArb,
      async (event, sentimentResult, intentResult, brandContext) => {
        // Process the same event twice
        const result1 = await decisionEngine.processEvent(
          event,
          sentimentResult,
          intentResult,
          brandContext
        );

        const result2 = await decisionEngine.processEvent(
          event,
          sentimentResult,
          intentResult,
          brandContext
        );

        // Core decision components should be identical
        expect(Math.abs(result1.priorityScore.overall - result2.priorityScore.overall)).toBeLessThan(0.01);
        expect(result1.routingDecision.route).toBe(result2.routingDecision.route);
        expect(Math.abs(result1.routingDecision.confidence - result2.routingDecision.confidence)).toBeLessThan(0.01);
        expect(result1.quality.overallConfidence).toBeCloseTo(result2.quality.overallConfidence, 2);

        // Action types should be consistent
        const actions1 = result1.routingDecision.actions.map(a => a.type).sort();
        const actions2 = result2.routingDecision.actions.map(a => a.type).sort();
        expect(actions1).toEqual(actions2);

        return true;
      }
    ), { numRuns: 30 }); // Reduced runs due to complexity
  });

  /**
   * Property: Resource and performance constraints
   * Ensures the system operates within acceptable performance bounds
   */
  test('Property: Resource and performance constraints', () => {
    fc.assert(fc.property(
      socialEventArb,
      sentimentResultArb,
      intentResultArb,
      brandContextArb,
      async (event, sentimentResult, intentResult, brandContext) => {
        const startTime = Date.now();
        
        const result = await decisionEngine.processEvent(
          event,
          sentimentResult,
          intentResult,
          brandContext
        );

        const actualTime = Date.now() - startTime;

        // Processing should complete within reasonable time
        expect(actualTime).toBeLessThan(60000); // 60 seconds max

        // Reported processing time should be reasonable
        expect(result.performance.totalProcessingTime).toBeLessThan(60000);
        expect(result.performance.totalProcessingTime).toBeGreaterThan(0);

        // Individual stage times should be reasonable
        expect(result.performance.priorityCalculationTime).toBeLessThan(10000);
        expect(result.performance.routingDecisionTime).toBeLessThan(10000);
        expect(result.performance.actionExecutionTime).toBeLessThan(30000);

        // Memory usage should be reasonable (audit trail not too large)
        expect(result.quality.auditTrail.length).toBeLessThan(50);

        // Action count should be reasonable
        expect(result.routingDecision.actions.length).toBeLessThan(20);
        expect(result.executionResults.length).toBeLessThan(20);

        return true;
      }
    ), { numRuns: 20 }); // Reduced runs due to performance testing
  });
});