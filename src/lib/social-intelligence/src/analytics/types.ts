/**
 * Analytics and Performance Tracking Types
 * Defines data structures for tracking content performance and generating insights
 */

import { z } from 'zod';
import { Platform, ContentType } from '../types/core';

// Base engagement metrics
export const EngagementMetricsSchema = z.object({
  likes: z.number().min(0),
  shares: z.number().min(0),
  comments: z.number().min(0),
  views: z.number().min(0),
  clicks: z.number().min(0),
  saves: z.number().min(0),
  reactions: z.record(z.string(), z.number()).optional(), // Platform-specific reactions
  engagementRate: z.number().min(0).max(1),
  reach: z.number().min(0),
  impressions: z.number().min(0)
});

export type EngagementMetrics = z.infer<typeof EngagementMetricsSchema>;

// Content performance data
export const ContentPerformanceSchema = z.object({
  contentId: z.string(),
  brandId: z.string(),
  platform: z.nativeEnum(Platform),
  contentType: z.nativeEnum(ContentType),
  publishedAt: z.string().datetime(),
  metrics: EngagementMetricsSchema,
  audienceData: z.object({
    demographics: z.record(z.string(), z.number()).optional(),
    topLocations: z.array(z.string()).optional(),
    ageGroups: z.record(z.string(), z.number()).optional(),
    genderBreakdown: z.record(z.string(), z.number()).optional()
  }).optional(),
  lastUpdated: z.string().datetime()
});

export type ContentPerformance = z.infer<typeof ContentPerformanceSchema>;

// Performance analysis results
export const PerformanceAnalysisSchema = z.object({
  contentId: z.string(),
  overallScore: z.number().min(0).max(100),
  platformScore: z.number().min(0).max(100),
  contentTypeScore: z.number().min(0).max(100),
  timingScore: z.number().min(0).max(100),
  benchmarkComparison: z.object({
    industryAverage: z.number().optional(),
    brandAverage: z.number(),
    percentileRank: z.number().min(0).max(100)
  }),
  successFactors: z.array(z.string()),
  improvementAreas: z.array(z.string()),
  recommendations: z.array(z.string())
});

export type PerformanceAnalysis = z.infer<typeof PerformanceAnalysisSchema>;

// Top performing content
export const TopPerformingContentSchema = z.object({
  contentId: z.string(),
  title: z.string(),
  platform: z.nativeEnum(Platform),
  contentType: z.nativeEnum(ContentType),
  publishedAt: z.string().datetime(),
  metrics: EngagementMetricsSchema,
  performanceScore: z.number().min(0).max(100),
  successFactors: z.array(z.string())
});

export type TopPerformingContent = z.infer<typeof TopPerformingContentSchema>;

// Audience insights
export const AudienceInsightsSchema = z.object({
  brandId: z.string(),
  platform: z.nativeEnum(Platform).optional(),
  timeRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }),
  demographics: z.object({
    ageGroups: z.record(z.string(), z.object({
      percentage: z.number().min(0).max(100),
      engagementRate: z.number().min(0).max(1)
    })),
    genderBreakdown: z.record(z.string(), z.object({
      percentage: z.number().min(0).max(100),
      engagementRate: z.number().min(0).max(1)
    })),
    topLocations: z.array(z.object({
      location: z.string(),
      percentage: z.number().min(0).max(100),
      engagementRate: z.number().min(0).max(1)
    }))
  }),
  behaviorPatterns: z.object({
    peakEngagementHours: z.array(z.number().min(0).max(23)),
    preferredContentTypes: z.array(z.object({
      type: z.nativeEnum(ContentType),
      preference: z.number().min(0).max(1)
    })),
    averageSessionDuration: z.number().min(0),
    contentConsumptionRate: z.number().min(0)
  }),
  interests: z.array(z.object({
    topic: z.string(),
    relevance: z.number().min(0).max(1),
    engagementLevel: z.number().min(0).max(1)
  }))
});

export type AudienceInsights = z.infer<typeof AudienceInsightsSchema>;

// Performance report
export const PerformanceReportSchema = z.object({
  brandId: z.string(),
  reportType: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'custom']),
  timeRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }),
  generatedAt: z.string().datetime(),
  summary: z.object({
    totalContent: z.number().min(0),
    totalEngagement: z.number().min(0),
    averageEngagementRate: z.number().min(0).max(1),
    totalReach: z.number().min(0),
    topPlatform: z.nativeEnum(Platform),
    bestPerformingContentType: z.nativeEnum(ContentType)
  }),
  platformBreakdown: z.record(z.nativeEnum(Platform), z.object({
    contentCount: z.number().min(0),
    totalEngagement: z.number().min(0),
    averageEngagementRate: z.number().min(0).max(1),
    reach: z.number().min(0),
    topContentType: z.nativeEnum(ContentType)
  })),
  topPerformingContent: z.array(TopPerformingContentSchema),
  audienceInsights: AudienceInsightsSchema,
  recommendations: z.array(z.object({
    category: z.enum(['content', 'timing', 'platform', 'audience']),
    priority: z.enum(['high', 'medium', 'low']),
    recommendation: z.string(),
    expectedImpact: z.string(),
    actionItems: z.array(z.string())
  })),
  benchmarkComparisons: z.object({
    industryBenchmarks: z.record(z.string(), z.number()).optional(),
    competitorComparisons: z.array(z.object({
      competitor: z.string(),
      metric: z.string(),
      ourValue: z.number(),
      theirValue: z.number(),
      difference: z.number()
    })).optional(),
    historicalComparison: z.object({
      previousPeriod: z.object({
        engagementRate: z.number(),
        reach: z.number(),
        contentVolume: z.number()
      }),
      changePercentage: z.object({
        engagementRate: z.number(),
        reach: z.number(),
        contentVolume: z.number()
      })
    })
  })
});

export type PerformanceReport = z.infer<typeof PerformanceReportSchema>;

// Brand mention sentiment trends
export const SentimentTrendSchema = z.object({
  brandId: z.string(),
  timeRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }),
  dataPoints: z.array(z.object({
    timestamp: z.string().datetime(),
    sentimentScore: z.number().min(-1).max(1),
    mentionCount: z.number().min(0),
    platform: z.nativeEnum(Platform),
    topics: z.array(z.string())
  })),
  overallTrend: z.enum(['improving', 'declining', 'stable']),
  trendStrength: z.number().min(0).max(1),
  significantEvents: z.array(z.object({
    timestamp: z.string().datetime(),
    event: z.string(),
    impact: z.number().min(-1).max(1),
    description: z.string()
  }))
});

export type SentimentTrend = z.infer<typeof SentimentTrendSchema>;

// Analytics query filters
export const AnalyticsFiltersSchema = z.object({
  brandId: z.string(),
  platforms: z.array(z.nativeEnum(Platform)).optional(),
  contentTypes: z.array(z.nativeEnum(ContentType)).optional(),
  timeRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).optional(),
  minEngagementRate: z.number().min(0).max(1).optional(),
  minReach: z.number().min(0).optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z.enum(['engagement', 'reach', 'date', 'performance_score']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.number().min(1).max(1000).optional()
});

export type AnalyticsFilters = z.infer<typeof AnalyticsFiltersSchema>;

// Industry benchmarks
export const IndustryBenchmarkSchema = z.object({
  industry: z.string(),
  platform: z.nativeEnum(Platform),
  contentType: z.nativeEnum(ContentType),
  metrics: z.object({
    averageEngagementRate: z.number().min(0).max(1),
    averageReach: z.number().min(0),
    averageLikes: z.number().min(0),
    averageShares: z.number().min(0),
    averageComments: z.number().min(0)
  }),
  sampleSize: z.number().min(1),
  lastUpdated: z.string().datetime()
});

export type IndustryBenchmark = z.infer<typeof IndustryBenchmarkSchema>;

// Analytics configuration
export const AnalyticsConfigSchema = z.object({
  brandId: z.string(),
  trackingEnabled: z.boolean(),
  platforms: z.array(z.nativeEnum(Platform)),
  updateFrequency: z.enum(['realtime', 'hourly', 'daily']),
  retentionPeriod: z.number().min(30).max(2555), // Days (7 years max)
  benchmarkIndustry: z.string().optional(),
  alertThresholds: z.object({
    lowEngagementRate: z.number().min(0).max(1),
    highNegativeSentiment: z.number().min(-1).max(0),
    viralContentThreshold: z.number().min(1000)
  }),
  reportSchedule: z.object({
    daily: z.boolean(),
    weekly: z.boolean(),
    monthly: z.boolean(),
    recipients: z.array(z.string().email())
  })
});

export type AnalyticsConfig = z.infer<typeof AnalyticsConfigSchema>;

// Export all schemas for validation
export const AnalyticsSchemas = {
  EngagementMetrics: EngagementMetricsSchema,
  ContentPerformance: ContentPerformanceSchema,
  PerformanceAnalysis: PerformanceAnalysisSchema,
  TopPerformingContent: TopPerformingContentSchema,
  AudienceInsights: AudienceInsightsSchema,
  PerformanceReport: PerformanceReportSchema,
  SentimentTrend: SentimentTrendSchema,
  AnalyticsFilters: AnalyticsFiltersSchema,
  IndustryBenchmark: IndustryBenchmarkSchema,
  AnalyticsConfig: AnalyticsConfigSchema
};