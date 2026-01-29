/**
 * Scheduling and Publishing Types
 * Defines data structures for content scheduling, publishing management, and calendar operations
 */

import { z } from 'zod';
import { Platform, ContentType } from '../types/core';

// Scheduling status
export enum SchedulingStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHING = 'publishing',
  PUBLISHED = 'published',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// Publishing priority
export enum PublishingPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

// Scheduling conflict types
export enum ConflictType {
  TIME_OVERLAP = 'time_overlap',
  PLATFORM_LIMIT = 'platform_limit',
  CONTENT_SIMILARITY = 'content_similarity',
  CAMPAIGN_CONFLICT = 'campaign_conflict'
}

// Scheduled content
export const ScheduledContentSchema = z.object({
  id: z.string(),
  brandId: z.string(),
  contentId: z.string().optional(), // Reference to existing content
  title: z.string(),
  description: z.string().optional(),
  content: z.object({
    text: z.string().optional(),
    mediaUrls: z.array(z.string()).optional(),
    hashtags: z.array(z.string()).optional(),
    mentions: z.array(z.string()).optional()
  }),
  platforms: z.array(z.nativeEnum(Platform)),
  contentType: z.nativeEnum(ContentType),
  scheduledTime: z.string().datetime(),
  timezone: z.string(),
  status: z.nativeEnum(SchedulingStatus),
  priority: z.nativeEnum(PublishingPriority),
  campaignId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().optional(),
  failureReason: z.string().optional(),
  retryCount: z.number().min(0).default(0),
  maxRetries: z.number().min(0).default(3),
  notificationsSent: z.array(z.object({
    type: z.enum(['pre_publish', 'published', 'failed']),
    sentAt: z.string().datetime(),
    recipients: z.array(z.string())
  })).default([]),
  metadata: z.record(z.string(), z.any()).optional()
});

export type ScheduledContent = z.infer<typeof ScheduledContentSchema>;

// Scheduling request
export const SchedulingRequestSchema = z.object({
  brandId: z.string(),
  contentId: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  content: z.object({
    text: z.string().optional(),
    mediaUrls: z.array(z.string()).optional(),
    hashtags: z.array(z.string()).optional(),
    mentions: z.array(z.string()).optional()
  }),
  platforms: z.array(z.nativeEnum(Platform)),
  contentType: z.nativeEnum(ContentType),
  scheduledTime: z.string().datetime(),
  timezone: z.string().default('UTC'),
  priority: z.nativeEnum(PublishingPriority).default(PublishingPriority.MEDIUM),
  campaignId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  createdBy: z.string(),
  allowConflicts: z.boolean().default(false),
  notificationSettings: z.object({
    prePublishMinutes: z.number().min(0).default(30),
    recipients: z.array(z.string().email()).optional()
  }).optional()
});

export type SchedulingRequest = z.infer<typeof SchedulingRequestSchema>;

// Bulk scheduling request
export const BulkSchedulingRequestSchema = z.object({
  brandId: z.string(),
  campaignId: z.string().optional(),
  schedules: z.array(SchedulingRequestSchema),
  distributionStrategy: z.enum(['even', 'optimal', 'custom']).default('optimal'),
  timeRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).optional(),
  createdBy: z.string()
});

export type BulkSchedulingRequest = z.infer<typeof BulkSchedulingRequestSchema>;

// Scheduling conflict
export const SchedulingConflictSchema = z.object({
  type: z.nativeEnum(ConflictType),
  severity: z.enum(['low', 'medium', 'high']),
  description: z.string(),
  conflictingScheduleIds: z.array(z.string()),
  suggestedResolution: z.object({
    action: z.enum(['reschedule', 'merge', 'cancel', 'ignore']),
    newTime: z.string().datetime().optional(),
    reason: z.string()
  }),
  autoResolvable: z.boolean()
});

export type SchedulingConflict = z.infer<typeof SchedulingConflictSchema>;

// Calendar view data
export const CalendarViewSchema = z.object({
  brandId: z.string(),
  viewType: z.enum(['day', 'week', 'month', 'year']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  timezone: z.string(),
  scheduledContent: z.array(ScheduledContentSchema),
  conflicts: z.array(SchedulingConflictSchema),
  optimalTimes: z.array(z.object({
    platform: z.nativeEnum(Platform),
    time: z.string().datetime(),
    score: z.number().min(0).max(1),
    reason: z.string()
  })),
  platformLimits: z.record(z.nativeEnum(Platform), z.object({
    dailyLimit: z.number(),
    currentCount: z.number(),
    remaining: z.number()
  }))
});

export type CalendarView = z.infer<typeof CalendarViewSchema>;

// Publishing status
export const PublishingStatusSchema = z.object({
  scheduleId: z.string(),
  platform: z.nativeEnum(Platform),
  status: z.enum(['pending', 'publishing', 'published', 'failed', 'cancelled']),
  publishedAt: z.string().datetime().optional(),
  platformPostId: z.string().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional()
  }).optional(),
  metrics: z.object({
    likes: z.number().optional(),
    shares: z.number().optional(),
    comments: z.number().optional(),
    views: z.number().optional(),
    reach: z.number().optional()
  }).optional(),
  lastUpdated: z.string().datetime()
});

export type PublishingStatus = z.infer<typeof PublishingStatusSchema>;

// Publishing notification
export const PublishingNotificationSchema = z.object({
  id: z.string(),
  scheduleId: z.string(),
  type: z.enum(['pre_publish', 'published', 'failed', 'cancelled']),
  title: z.string(),
  message: z.string(),
  recipients: z.array(z.string().email()),
  channels: z.array(z.enum(['email', 'slack', 'webhook'])),
  scheduledFor: z.string().datetime().optional(),
  sentAt: z.string().datetime().optional(),
  status: z.enum(['pending', 'sent', 'failed']),
  metadata: z.record(z.string(), z.any()).optional()
});

export type PublishingNotification = z.infer<typeof PublishingNotificationSchema>;

// Optimal posting time
export const OptimalPostingTimeSchema = z.object({
  platform: z.nativeEnum(Platform),
  contentType: z.nativeEnum(ContentType),
  dayOfWeek: z.number().min(0).max(6), // 0 = Sunday
  hour: z.number().min(0).max(23),
  timezone: z.string(),
  score: z.number().min(0).max(1),
  audienceActivity: z.number().min(0).max(1),
  competitionLevel: z.number().min(0).max(1),
  historicalPerformance: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1)
});

export type OptimalPostingTime = z.infer<typeof OptimalPostingTimeSchema>;

// Campaign scheduling
export const CampaignScheduleSchema = z.object({
  id: z.string(),
  brandId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  platforms: z.array(z.nativeEnum(Platform)),
  contentCount: z.number().min(1),
  scheduledContent: z.array(z.string()), // Schedule IDs
  distributionStrategy: z.enum(['even', 'optimal', 'custom']),
  status: z.enum(['draft', 'scheduled', 'active', 'completed', 'cancelled']),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  metadata: z.record(z.string(), z.any()).optional()
});

export type CampaignSchedule = z.infer<typeof CampaignScheduleSchema>;

// Scheduling filters
export const SchedulingFiltersSchema = z.object({
  brandId: z.string(),
  platforms: z.array(z.nativeEnum(Platform)).optional(),
  status: z.array(z.nativeEnum(SchedulingStatus)).optional(),
  priority: z.array(z.nativeEnum(PublishingPriority)).optional(),
  campaignId: z.string().optional(),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).optional(),
  createdBy: z.string().optional(),
  tags: z.array(z.string()).optional(),
  contentType: z.array(z.nativeEnum(ContentType)).optional(),
  limit: z.number().min(1).max(1000).optional(),
  offset: z.number().min(0).optional(),
  sortBy: z.enum(['scheduledTime', 'createdAt', 'priority', 'status']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

export type SchedulingFilters = z.infer<typeof SchedulingFiltersSchema>;

// Publishing configuration
export const PublishingConfigSchema = z.object({
  brandId: z.string(),
  platforms: z.record(z.nativeEnum(Platform), z.object({
    enabled: z.boolean(),
    dailyLimit: z.number().min(0),
    hourlyLimit: z.number().min(0),
    minInterval: z.number().min(0), // Minutes between posts
    optimalTimes: z.array(z.object({
      dayOfWeek: z.number().min(0).max(6),
      hour: z.number().min(0).max(23),
      score: z.number().min(0).max(1)
    })),
    retrySettings: z.object({
      maxRetries: z.number().min(0).max(10),
      retryDelay: z.number().min(1), // Minutes
      backoffMultiplier: z.number().min(1)
    })
  })),
  notifications: z.object({
    prePublishMinutes: z.number().min(0),
    defaultRecipients: z.array(z.string().email()),
    channels: z.array(z.enum(['email', 'slack', 'webhook'])),
    webhookUrl: z.string().url().optional()
  }),
  conflictResolution: z.object({
    autoResolve: z.boolean(),
    maxConflicts: z.number().min(1),
    resolutionStrategy: z.enum(['reschedule', 'merge', 'cancel'])
  }),
  timezone: z.string().default('UTC')
});

export type PublishingConfig = z.infer<typeof PublishingConfigSchema>;

// Export all schemas for validation
export const SchedulingSchemas = {
  ScheduledContent: ScheduledContentSchema,
  SchedulingRequest: SchedulingRequestSchema,
  BulkSchedulingRequest: BulkSchedulingRequestSchema,
  SchedulingConflict: SchedulingConflictSchema,
  CalendarView: CalendarViewSchema,
  PublishingStatus: PublishingStatusSchema,
  PublishingNotification: PublishingNotificationSchema,
  OptimalPostingTime: OptimalPostingTimeSchema,
  CampaignSchedule: CampaignScheduleSchema,
  SchedulingFilters: SchedulingFiltersSchema,
  PublishingConfig: PublishingConfigSchema
};