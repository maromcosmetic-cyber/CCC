/**
 * Core data models for the Brand-Aware Social Intelligence & Action Engine
 * These types represent the unified data structures used throughout the system
 */

import { z } from 'zod';

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

export enum Platform {
  TIKTOK = 'tiktok',
  INSTAGRAM = 'instagram',
  FACEBOOK = 'facebook',
  YOUTUBE = 'youtube',
  REDDIT = 'reddit',
  RSS = 'rss'
}

export enum EventType {
  POST = 'post',
  COMMENT = 'comment',
  MENTION = 'mention',
  MESSAGE = 'message',
  SHARE = 'share',
  REACTION = 'reaction'
}

export enum ContentType {
  VIDEO = 'video',
  IMAGE = 'image',
  TEXT = 'text',
  CAROUSEL = 'carousel',
  STORY = 'story'
}

export enum SentimentLabel {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral'
}

export enum IntentCategory {
  PURCHASE_INQUIRY = 'purchase_inquiry',
  SUPPORT_REQUEST = 'support_request',
  COMPLAINT = 'complaint',
  INFORMATION_SEEKING = 'information_seeking',
  PRAISE = 'praise',
  FEATURE_REQUEST = 'feature_request',
  COMPARISON_SHOPPING = 'comparison_shopping'
}

export enum ActionType {
  RESPOND = 'respond',
  ENGAGE = 'engage',
  CREATE = 'create',
  ESCALATE = 'escalate',
  MONITOR = 'monitor',
  SUPPRESS = 'suppress'
}

export enum UrgencyLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  MINIMAL = 'minimal'
}

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

// Social Event Content Schema
const SocialEventContentSchema = z.object({
  text: z.string(),
  mediaUrls: z.array(z.string().url()).default([]),
  hashtags: z.array(z.string()).default([]),
  mentions: z.array(z.string()).default([]),
  language: z.string().default('en')
});

// Social Event Author Schema
const SocialEventAuthorSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  followerCount: z.number().int().min(0),
  verified: z.boolean().default(false),
  profileUrl: z.string().url().optional()
});

// Engagement Metrics Schema
const EngagementMetricsSchema = z.object({
  likes: z.number().int().min(0).default(0),
  shares: z.number().int().min(0).default(0),
  comments: z.number().int().min(0).default(0),
  views: z.number().int().min(0).default(0),
  engagementRate: z.number().min(0).max(1).default(0)
});

// Location Schema
const LocationSchema = z.object({
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  coordinates: z.tuple([z.number(), z.number()]).optional()
});

// Event Context Schema
const EventContextSchema = z.object({
  parentPostId: z.string().optional(),
  threadId: z.string().optional(),
  conversationId: z.string().optional(),
  isReply: z.boolean().default(false),
  replyToUserId: z.string().optional()
});

// Event Metadata Schema
const EventMetadataSchema = z.object({
  source: z.enum(['api', 'webhook', 'crawler']),
  processingTimestamp: z.string().datetime(),
  version: z.string().default('1.0'),
  rawData: z.string().optional()
});

// ============================================================================
// SOCIAL EVENT MODEL
// ============================================================================

export const SocialEventSchema = z.object({
  id: z.string(),
  platform: z.nativeEnum(Platform),
  platformId: z.string(),
  timestamp: z.string().datetime(),
  eventType: z.nativeEnum(EventType),
  content: SocialEventContentSchema,
  author: SocialEventAuthorSchema,
  engagement: EngagementMetricsSchema,
  context: EventContextSchema.optional(),
  location: LocationSchema.optional(),
  metadata: EventMetadataSchema
});

export type SocialEvent = z.infer<typeof SocialEventSchema>;

// ============================================================================
// BRAND PLAYBOOK MODEL
// ============================================================================

const BrandIdentitySchema = z.object({
  name: z.string(),
  tagline: z.string(),
  mission: z.string(),
  values: z.array(z.string()),
  personality: z.array(z.string())
});

const VoiceAndToneSchema = z.object({
  primaryTone: z.string(),
  attributes: z.object({
    formality: z.string(),
    enthusiasm: z.string(),
    empathy: z.string(),
    authority: z.string()
  }),
  doUse: z.array(z.string()),
  dontUse: z.array(z.string())
});

const ComplianceRulesSchema = z.object({
  forbiddenClaims: z.array(z.string()),
  requiredDisclosures: z.array(z.object({
    trigger: z.string(),
    disclosure: z.string()
  })),
  regulatoryCompliance: z.array(z.string()),
  contentRestrictions: z.record(z.boolean())
});

const VisualGuidelinesSchema = z.object({
  logoUsage: z.object({
    primaryLogo: z.string().url(),
    variations: z.array(z.string()),
    minSize: z.string(),
    clearSpace: z.string()
  }),
  colorPalette: z.object({
    primary: z.string(),
    secondary: z.string(),
    accent: z.string(),
    neutral: z.array(z.string())
  }),
  typography: z.object({
    primary: z.string(),
    secondary: z.string(),
    headingStyle: z.string(),
    bodyStyle: z.string()
  })
});

const PlatformSpecificRulesSchema = z.record(z.object({
  maxVideoLength: z.number().optional(),
  preferredAspectRatio: z.string().optional(),
  hashtagLimit: z.number().optional(),
  maxCaptionLength: z.number().optional(),
  toneAdjustment: z.string().optional(),
  includeCompanyUpdates: z.boolean().optional()
}));

export const BrandPlaybookSchema = z.object({
  id: z.string(),
  brandId: z.string(),
  version: z.string(),
  lastUpdated: z.string().datetime(),
  brandIdentity: BrandIdentitySchema,
  voiceAndTone: VoiceAndToneSchema,
  complianceRules: ComplianceRulesSchema,
  visualGuidelines: VisualGuidelinesSchema,
  platformSpecificRules: PlatformSpecificRulesSchema
});

export type BrandPlaybook = z.infer<typeof BrandPlaybookSchema>;

// ============================================================================
// PERSONA MODEL
// ============================================================================

const DemographicsSchema = z.object({
  ageRange: z.string(),
  gender: z.string(),
  income: z.string(),
  education: z.string(),
  location: z.array(z.string()),
  occupation: z.array(z.string())
});

const PsychographicsSchema = z.object({
  interests: z.array(z.string()),
  values: z.array(z.string()),
  lifestyle: z.array(z.string()),
  painPoints: z.array(z.string())
});

const BehaviorPatternsSchema = z.object({
  purchaseDrivers: z.array(z.string()),
  decisionMakingStyle: z.string(),
  brandLoyalty: z.string(),
  pricesensitivity: z.string(),
  communicationPreference: z.string()
});

const PlatformPreferencesSchema = z.object({
  primary: z.array(z.nativeEnum(Platform)),
  secondary: z.array(z.nativeEnum(Platform)),
  contentTypes: z.array(z.string()),
  engagementStyle: z.string(),
  activeHours: z.array(z.string())
});

const TriggersSchema = z.object({
  positive: z.array(z.string()),
  negative: z.array(z.string())
});

const ResponseStrategiesSchema = z.object({
  contentTone: z.string(),
  messageLength: z.string(),
  includeData: z.boolean(),
  visualStyle: z.string(),
  callToAction: z.string()
});

export const PersonaSchema = z.object({
  id: z.string(),
  name: z.string(),
  brandId: z.string(),
  demographics: DemographicsSchema,
  psychographics: PsychographicsSchema,
  behaviorPatterns: BehaviorPatternsSchema,
  platformPreferences: PlatformPreferencesSchema,
  triggers: TriggersSchema,
  responseStrategies: ResponseStrategiesSchema
});

export type Persona = z.infer<typeof PersonaSchema>;

// ============================================================================
// ASSET INTELLIGENCE MODEL
// ============================================================================

const AssetMetadataSchema = z.object({
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  category: z.string(),
  creator: z.object({
    type: z.enum(['internal', 'ugc', 'influencer']),
    id: z.string(),
    name: z.string(),
    attribution: z.string()
  })
});

const TechnicalSpecsSchema = z.object({
  fileUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  duration: z.number().positive().optional(),
  dimensions: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    aspectRatio: z.string()
  }).optional(),
  fileSize: z.number().positive(),
  format: z.string(),
  quality: z.string().optional()
});

const UsageRightsSchema = z.object({
  license: z.enum(['brand_owned', 'licensed', 'ugc_permission']),
  expirationDate: z.string().datetime().optional(),
  platforms: z.array(z.nativeEnum(Platform)),
  restrictions: z.array(z.string()),
  commercialUse: z.boolean()
});

const PlatformPerformanceSchema = z.record(z.object({
  views: z.number(),
  likes: z.number(),
  shares: z.number(),
  comments: z.number(),
  engagementRate: z.number()
}));

const PerformanceDataSchema = z.object({
  totalViews: z.number(),
  totalEngagements: z.number(),
  averageEngagementRate: z.number(),
  platformPerformance: PlatformPerformanceSchema,
  audienceInsights: z.object({
    topDemographics: z.array(z.string()),
    peakEngagementHours: z.array(z.string()),
    sentimentBreakdown: z.object({
      positive: z.number(),
      neutral: z.number(),
      negative: z.number()
    })
  })
});

const ContentAnalysisSchema = z.object({
  topics: z.array(z.string()),
  sentiment: z.nativeEnum(SentimentLabel),
  brandMentions: z.array(z.string()),
  competitorMentions: z.array(z.string()),
  keyMessages: z.array(z.string())
});

const OptimizationSuggestionsSchema = z.object({
  bestPerformingPlatforms: z.array(z.nativeEnum(Platform)),
  optimalPostingTimes: z.array(z.string()),
  recommendedHashtags: z.array(z.string()),
  contentImprovements: z.array(z.string())
});

export const AssetIntelligenceSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(ContentType),
  brandId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  metadata: AssetMetadataSchema,
  technicalSpecs: TechnicalSpecsSchema,
  usageRights: UsageRightsSchema,
  performanceData: PerformanceDataSchema,
  contentAnalysis: ContentAnalysisSchema,
  optimizationSuggestions: OptimizationSuggestionsSchema
});

export type AssetIntelligence = z.infer<typeof AssetIntelligenceSchema>;

// ============================================================================
// DECISION OUTPUT MODEL
// ============================================================================

const SentimentResultSchema = z.object({
  score: z.number().min(-1).max(1),
  label: z.nativeEnum(SentimentLabel),
  confidence: z.number().min(0).max(1)
});

const IntentResultSchema = z.object({
  primary: z.nativeEnum(IntentCategory),
  secondary: z.nativeEnum(IntentCategory).optional(),
  confidence: z.number().min(0).max(1)
});

const AnalysisSchema = z.object({
  sentiment: SentimentResultSchema,
  intent: IntentResultSchema,
  topics: z.array(z.string()),
  urgency: z.nativeEnum(UrgencyLevel),
  brandImpact: z.string()
});

const DecisionSchema = z.object({
  primaryAction: z.nativeEnum(ActionType),
  secondaryActions: z.array(z.nativeEnum(ActionType)),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  humanReviewRequired: z.boolean(),
  escalationLevel: z.string()
});

const ActionSchema = z.object({
  type: z.nativeEnum(ActionType),
  priority: z.number().int().min(1),
  action: z.record(z.any()),
  timing: z.string(),
  approvalRequired: z.boolean()
});

const WebhookSchema = z.object({
  endpoint: z.string().url(),
  payload: z.record(z.any()),
  retryPolicy: z.string()
});

const MonitoringSchema = z.object({
  trackingId: z.string(),
  kpis: z.array(z.string()),
  followUpRequired: z.boolean(),
  followUpDate: z.string().datetime().optional()
});

export const DecisionOutputSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  timestamp: z.string().datetime(),
  brandContext: z.object({
    brandId: z.string(),
    playbookVersion: z.string(),
    matchedPersona: z.string().optional(),
    complianceStatus: z.string()
  }),
  analysis: AnalysisSchema,
  decision: DecisionSchema,
  recommendedActions: z.array(ActionSchema),
  webhooks: z.array(WebhookSchema),
  monitoring: MonitoringSchema
});

export type DecisionOutput = z.infer<typeof DecisionOutputSchema>;

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface BrandContext {
  brandId: string;
  playbook: BrandPlaybook;
  personas: Persona[];
  assets: AssetIntelligence[];
}

export interface ProcessingContext {
  event: SocialEvent;
  brandContext: BrandContext;
  timestamp: Date;
  processingId: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConfidenceScore {
  overall: number;
  components: {
    dataQuality: number;
    modelAccuracy: number;
    contextRelevance: number;
    historicalPerformance: number;
  };
  factors: Array<{
    factor: string;
    impact: number;
    reasoning: string;
  }>;
}

// ============================================================================
// EXPORT ALL SCHEMAS FOR VALIDATION
// ============================================================================

export const CoreSchemas = {
  SocialEvent: SocialEventSchema,
  BrandPlaybook: BrandPlaybookSchema,
  Persona: PersonaSchema,
  AssetIntelligence: AssetIntelligenceSchema,
  DecisionOutput: DecisionOutputSchema
} as const;