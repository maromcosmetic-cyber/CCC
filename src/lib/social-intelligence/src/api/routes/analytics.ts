/**
 * Analytics API Routes
 * Provides REST endpoints for retrieving analytics and performance metrics
 * Requirements: 11.2
 */

import { Request, Response, Router } from 'express';
import { z } from 'zod';

// Request validation schemas
const GetAnalyticsQuerySchema = z.object({
  startDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Invalid start date format'
  }),
  endDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Invalid end date format'
  }),
  platform: z.enum(['tiktok', 'meta', 'youtube', 'reddit', 'rss']).optional(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).optional().default('day'),
  metrics: z.string().optional().transform(val => val ? val.split(',') : undefined)
});

const GetPerformanceQuerySchema = z.object({
  period: z.enum(['24h', '7d', '30d', '90d']).optional().default('7d'),
  contentType: z.enum(['post', 'comment', 'mention', 'hashtag']).optional(),
  platform: z.enum(['tiktok', 'meta', 'youtube', 'reddit', 'rss']).optional()
});

export interface AnalyticsService {
  getEngagementMetrics(filters: EngagementFilters): Promise<EngagementMetrics>;
  getPerformanceMetrics(filters: PerformanceFilters): Promise<PerformanceMetrics>;
  getAudienceInsights(filters: AudienceFilters): Promise<AudienceInsights>;
  getSentimentAnalytics(filters: SentimentFilters): Promise<SentimentAnalytics>;
  getTrendingTopics(filters: TrendingFilters): Promise<TrendingTopics>;
}

export interface EngagementFilters {
  startDate: Date;
  endDate: Date;
  platform?: string;
  granularity: string;
  metrics?: string[];
}

export interface PerformanceFilters {
  period: string;
  contentType?: string;
  platform?: string;
}

export interface AudienceFilters {
  startDate: Date;
  endDate: Date;
  platform?: string;
}

export interface SentimentFilters {
  startDate: Date;
  endDate: Date;
  platform?: string;
}

export interface TrendingFilters {
  period: string;
  platform?: string;
  limit?: number;
}

export interface EngagementMetrics {
  timeSeriesData: Array<{
    timestamp: string;
    likes: number;
    shares: number;
    comments: number;
    views: number;
    engagement_rate: number;
  }>;
  totals: {
    likes: number;
    shares: number;
    comments: number;
    views: number;
    engagement_rate: number;
  };
  growth: {
    likes_growth: number;
    shares_growth: number;
    comments_growth: number;
    views_growth: number;
  };
}

export interface PerformanceMetrics {
  topPerformingContent: Array<{
    id: string;
    title: string;
    platform: string;
    engagement_score: number;
    reach: number;
    impressions: number;
  }>;
  platformComparison: Array<{
    platform: string;
    total_posts: number;
    avg_engagement: number;
    reach: number;
  }>;
  contentTypePerformance: Array<{
    type: string;
    count: number;
    avg_engagement: number;
    total_reach: number;
  }>;
}

export interface AudienceInsights {
  demographics: {
    age_groups: Array<{ range: string; percentage: number }>;
    gender: Array<{ type: string; percentage: number }>;
    locations: Array<{ country: string; percentage: number }>;
  };
  behavior: {
    peak_activity_hours: Array<{ hour: number; activity_level: number }>;
    engagement_patterns: Array<{ day: string; engagement_rate: number }>;
  };
  interests: Array<{
    category: string;
    relevance_score: number;
    audience_overlap: number;
  }>;
}

export interface SentimentAnalytics {
  overall: {
    positive: number;
    negative: number;
    neutral: number;
    confidence: number;
  };
  trends: Array<{
    date: string;
    positive: number;
    negative: number;
    neutral: number;
  }>;
  topics: Array<{
    topic: string;
    sentiment_score: number;
    mention_count: number;
  }>;
}

export interface TrendingTopics {
  topics: Array<{
    topic: string;
    mention_count: number;
    growth_rate: number;
    sentiment_score: number;
    platforms: string[];
  }>;
  hashtags: Array<{
    hashtag: string;
    usage_count: number;
    growth_rate: number;
    platforms: string[];
  }>;
}

export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  /**
   * GET /api/v1/analytics/engagement
   * Retrieve engagement metrics with time series data
   */
  async getEngagementMetrics(req: Request, res: Response): Promise<void> {
    try {
      const query = GetAnalyticsQuerySchema.parse(req.query);
      
      const filters: EngagementFilters = {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
        platform: query.platform,
        granularity: query.granularity,
        metrics: query.metrics
      };

      const metrics = await this.analyticsService.getEngagementMetrics(filters);
      
      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error retrieving engagement metrics:', error);
      this.handleError(error, res);
    }
  }

  /**
   * GET /api/v1/analytics/performance
   * Retrieve performance metrics and top content
   */
  async getPerformanceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const query = GetPerformanceQuerySchema.parse(req.query);
      
      const filters: PerformanceFilters = {
        period: query.period,
        contentType: query.contentType,
        platform: query.platform
      };

      const metrics = await this.analyticsService.getPerformanceMetrics(filters);
      
      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error retrieving performance metrics:', error);
      this.handleError(error, res);
    }
  }

  /**
   * GET /api/v1/analytics/audience
   * Retrieve audience insights and demographics
   */
  async getAudienceInsights(req: Request, res: Response): Promise<void> {
    try {
      const query = GetAnalyticsQuerySchema.parse(req.query);
      
      const filters: AudienceFilters = {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
        platform: query.platform
      };

      const insights = await this.analyticsService.getAudienceInsights(filters);
      
      res.json({
        success: true,
        data: insights,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error retrieving audience insights:', error);
      this.handleError(error, res);
    }
  }

  /**
   * GET /api/v1/analytics/sentiment
   * Retrieve sentiment analytics and trends
   */
  async getSentimentAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const query = GetAnalyticsQuerySchema.parse(req.query);
      
      const filters: SentimentFilters = {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
        platform: query.platform
      };

      const analytics = await this.analyticsService.getSentimentAnalytics(filters);
      
      res.json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error retrieving sentiment analytics:', error);
      this.handleError(error, res);
    }
  }

  /**
   * GET /api/v1/analytics/trending
   * Retrieve trending topics and hashtags
   */
  async getTrendingTopics(req: Request, res: Response): Promise<void> {
    try {
      const query = GetPerformanceQuerySchema.parse(req.query);
      
      const filters: TrendingFilters = {
        period: query.period,
        platform: query.platform,
        limit: 20
      };

      const trending = await this.analyticsService.getTrendingTopics(filters);
      
      res.json({
        success: true,
        data: trending,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error retrieving trending topics:', error);
      this.handleError(error, res);
    }
  }

  private handleError(error: unknown, res: Response): void {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors,
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Create analytics router
 */
export function createAnalyticsRouter(analyticsService: AnalyticsService): Router {
  const router = Router();
  const controller = new AnalyticsController(analyticsService);

  // Bind methods to preserve 'this' context
  router.get('/engagement', controller.getEngagementMetrics.bind(controller));
  router.get('/performance', controller.getPerformanceMetrics.bind(controller));
  router.get('/audience', controller.getAudienceInsights.bind(controller));
  router.get('/sentiment', controller.getSentimentAnalytics.bind(controller));
  router.get('/trending', controller.getTrendingTopics.bind(controller));

  return router;
}