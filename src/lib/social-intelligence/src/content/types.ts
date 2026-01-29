/**
 * Content Creation and Management Types
 * Types for AI content generation, content management, and publishing
 */

import { z } from 'zod';
import { Platform, ContentType } from '../types/core';

// ============================================================================
// ENUMS
// ============================================================================

export enum ContentFormat {
  POST = 'post',
  STORY = 'story',
  REEL = 'reel',
  CAROUSEL = 'carousel',
  VIDEO = 'video'
}

export enum ContentStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export enum GenerationStrategy {
  TRENDING_TOPICS = 'trending_topics',
  BRAND_FOCUSED = 'brand_focused',
  UGC_INSPIRED = 'ugc_inspired',
  SEASONAL = 'seasonal',
  PRODUCT_HIGHLIGHT = 'product_highlight'
}

// ============================================================================
// CONTENT GENERATION SCHEMAS
// ============================================================================

const ContentVariationSchema = z.object({
  id: z.string(),
  text: z.string(),
  hashtags: z.array(z.string()),
  callToAction: z.string().optional(),
  tone: z.string(),
  targetAudience: z.string(),
  estimatedPerformance: z.number().min(0).max(1)
});

const PlatformContentSchema = z.object({
  platform: z.nativeEnum(Platform),
  format: z.nativeEnum(ContentFormat),
  content: z.object({
    text: z.string(),
    hashtags: z.array(z.string()),
    mentions: z.array(z.string()).default([]),
    callToAction: z.string().optional(),
    mediaRequirements: z.object({
      type: z.nativeEnum(ContentType),
      aspectRatio: z.string(),
      duration: z.number().optional(),
      specifications: z.record(z.any()).optional()
    }).optional()
  }),
  variations: z.array(ContentVariationSchema),
  optimalPostingTime: z.string().datetime(),
  estimatedReach: z.number().int().min(0),
  estimatedEngagement: z.number().min(0).max(1)
});

const TrendingTopicSchema = z.object({
  topic: z.string(),
  hashtags: z.array(z.string()),
  relevanceScore: z.number().min(0).max(1),
  trendingPlatforms: z.array(z.nativeEnum(Platform)),
  peakTime: z.string().datetime(),
  brandAlignment: z.number().min(0).max(1)
});

const UGCBriefSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  guidelines: z.array(z.string()),
  hashtags: z.array(z.string()),
  targetAudience: z.string(),
  incentive: z.string().optional(),
  deadline: z.string().datetime().optional(),
  platforms: z.array(z.nativeEnum(Platform))
});

export const ContentPlanSchema = z.object({
  id: z.string(),
  brandId: z.string(),
  weekStarting: z.string().datetime(),
  strategy: z.nativeEnum(GenerationStrategy),
  trendingTopics: z.array(TrendingTopicSchema),
  platformContent: z.array(PlatformContentSchema),
  ugcBriefs: z.array(UGCBriefSchema),
  totalEstimatedReach: z.number().int().min(0),
  averageEstimatedEngagement: z.number().min(0).max(1),
  complianceStatus: z.enum(['compliant', 'needs_review', 'violations_found']),
  generatedAt: z.string().datetime(),
  approvedAt: z.string().datetime().optional(),
  approvedBy: z.string().optional()
});

export type ContentPlan = z.infer<typeof ContentPlanSchema>;
export type PlatformContent = z.infer<typeof PlatformContentSchema>;
export type ContentVariation = z.infer<typeof ContentVariationSchema>;
export type TrendingTopic = z.infer<typeof TrendingTopicSchema>;
export type UGCBrief = z.infer<typeof UGCBriefSchema>;

// ============================================================================
// CONTENT MANAGEMENT SCHEMAS
// ============================================================================

const ContentMetadataSchema = z.object({
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  category: z.string(),
  subcategory: z.string().optional(),
  brand: z.string(),
  campaign: z.string().optional(),
  creator: z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['internal', 'agency', 'ugc', 'influencer'])
  })
});

const ContentFileSchema = z.object({
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  filename: z.string(),
  fileSize: z.number().positive(),
  mimeType: z.string(),
  dimensions: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    aspectRatio: z.string()
  }).optional(),
  duration: z.number().positive().optional(),
  quality: z.enum(['low', 'medium', 'high', 'ultra']).optional()
});

const ContentPerformanceSchema = z.object({
  totalViews: z.number().int().min(0).default(0),
  totalLikes: z.number().int().min(0).default(0),
  totalShares: z.number().int().min(0).default(0),
  totalComments: z.number().int().min(0).default(0),
  averageEngagementRate: z.number().min(0).max(1).default(0),
  platformBreakdown: z.record(z.object({
    views: z.number().int().min(0),
    likes: z.number().int().min(0),
    shares: z.number().int().min(0),
    comments: z.number().int().min(0),
    engagementRate: z.number().min(0).max(1)
  })),
  lastUpdated: z.string().datetime()
});

const ContentUsageHistorySchema = z.object({
  usageId: z.string(),
  platform: z.nativeEnum(Platform),
  publishedAt: z.string().datetime(),
  campaignId: z.string().optional(),
  performance: z.object({
    views: z.number().int().min(0),
    likes: z.number().int().min(0),
    shares: z.number().int().min(0),
    comments: z.number().int().min(0),
    engagementRate: z.number().min(0).max(1)
  })
});

export const ManagedContentSchema = z.object({
  id: z.string(),
  brandId: z.string(),
  type: z.nativeEnum(ContentType),
  format: z.nativeEnum(ContentFormat),
  status: z.nativeEnum(ContentStatus),
  metadata: ContentMetadataSchema,
  files: z.array(ContentFileSchema),
  textContent: z.string().optional(),
  hashtags: z.array(z.string()).default([]),
  mentions: z.array(z.string()).default([]),
  callToAction: z.string().optional(),
  targetPlatforms: z.array(z.nativeEnum(Platform)),
  performance: ContentPerformanceSchema,
  usageHistory: z.array(ContentUsageHistorySchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().optional(),
  archivedAt: z.string().datetime().optional()
});

export type ManagedContent = z.infer<typeof ManagedContentSchema>;
export type ContentMetadata = z.infer<typeof ContentMetadataSchema>;
export type ContentFile = z.infer<typeof ContentFileSchema>;
export type ContentPerformance = z.infer<typeof ContentPerformanceSchema>;
export type ContentUsageHistory = z.infer<typeof ContentUsageHistorySchema>;

// ============================================================================
// CONTENT OPTIMIZATION SCHEMAS
// ============================================================================

const OptimalTimingSchema = z.object({
  platform: z.nativeEnum(Platform),
  dayOfWeek: z.string(),
  hour: z.number().int().min(0).max(23),
  timezone: z.string(),
  confidence: z.number().min(0).max(1),
  expectedEngagement: z.number().min(0).max(1)
});

const ReuseOpportunitySchema = z.object({
  contentId: z.string(),
  originalPlatform: z.nativeEnum(Platform),
  suggestedPlatforms: z.array(z.nativeEnum(Platform)),
  adaptationRequired: z.boolean(),
  adaptationSuggestions: z.array(z.string()),
  expectedPerformance: z.number().min(0).max(1),
  reasoning: z.string()
});

export const ContentOptimizationSchema = z.object({
  contentId: z.string(),
  brandId: z.string(),
  optimalTiming: z.array(OptimalTimingSchema),
  reuseOpportunities: z.array(ReuseOpportunitySchema),
  performancePrediction: z.object({
    expectedViews: z.number().int().min(0),
    expectedEngagementRate: z.number().min(0).max(1),
    confidenceLevel: z.number().min(0).max(1)
  }),
  recommendations: z.array(z.string()),
  generatedAt: z.string().datetime()
});

export type ContentOptimization = z.infer<typeof ContentOptimizationSchema>;
export type OptimalTiming = z.infer<typeof OptimalTimingSchema>;
export type ReuseOpportunity = z.infer<typeof ReuseOpportunitySchema>;

// ============================================================================
// UTILITY INTERFACES
// ============================================================================

export interface ContentGenerationRequest {
  brandId: string;
  strategy: GenerationStrategy;
  platforms: Platform[];
  contentTypes: ContentFormat[];
  weekStarting: Date;
  includeTrending: boolean;
  includeUGCBriefs: boolean;
  customPrompts?: string[];
}

export interface ContentUploadRequest {
  brandId: string;
  files: File[];
  metadata: Partial<ContentMetadata>;
  targetPlatforms: Platform[];
  autoTag: boolean;
}

export interface ContentSearchFilters {
  brandId?: string;
  type?: ContentType;
  format?: ContentFormat;
  status?: ContentStatus;
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  performanceThreshold?: number;
  platforms?: Platform[];
}

export interface ContentAnalytics {
  totalContent: number;
  contentByType: Record<ContentType, number>;
  contentByStatus: Record<ContentStatus, number>;
  averagePerformance: {
    views: number;
    engagementRate: number;
  };
  topPerformingContent: ManagedContent[];
  trendingTags: Array<{
    tag: string;
    count: number;
    avgPerformance: number;
  }>;
}