/**
 * Social Events API Routes
 * Provides REST endpoints for accessing Social_Event data with filtering and pagination
 * Requirements: 11.1
 */

import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { SocialEvent } from '../../types/core';

// Request validation schemas
const GetSocialEventsQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  platform: z.enum(['tiktok', 'meta', 'youtube', 'reddit', 'rss']).optional(),
  eventType: z.enum(['post', 'comment', 'mention', 'hashtag', 'user_action']).optional(),
  startDate: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), {
    message: 'Invalid start date format'
  }),
  endDate: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), {
    message: 'Invalid end date format'
  }),
  sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  search: z.string().optional()
});

const GetSocialEventParamsSchema = z.object({
  id: z.string().uuid()
});

export interface SocialEventsService {
  getSocialEvents(filters: SocialEventFilters): Promise<PaginatedResponse<SocialEvent>>;
  getSocialEventById(id: string): Promise<SocialEvent | null>;
  getSocialEventMetrics(id: string): Promise<SocialEventMetrics>;
}

export interface SocialEventFilters {
  page: number;
  limit: number;
  platform?: string;
  eventType?: string;
  startDate?: Date;
  endDate?: Date;
  sentiment?: string;
  priority?: string;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SocialEventMetrics {
  engagement: {
    likes: number;
    shares: number;
    comments: number;
    views: number;
  };
  reach: {
    impressions: number;
    uniqueUsers: number;
  };
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
    confidence: number;
  };
}

export class SocialEventsController {
  constructor(private socialEventsService: SocialEventsService) {}

  /**
   * GET /api/v1/social-events
   * Retrieve social events with filtering and pagination
   */
  async getSocialEvents(req: Request, res: Response): Promise<void> {
    try {
      const query = GetSocialEventsQuerySchema.parse(req.query);
      
      const filters: SocialEventFilters = {
        page: query.page,
        limit: Math.min(query.limit, 100), // Cap at 100 items per page
        platform: query.platform,
        eventType: query.eventType,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        sentiment: query.sentiment,
        priority: query.priority,
        search: query.search
      };

      const result = await this.socialEventsService.getSocialEvents(filters);
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error retrieving social events:', error);
      
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
   * GET /api/v1/social-events/:id
   * Retrieve a specific social event by ID
   */
  async getSocialEventById(req: Request, res: Response): Promise<void> {
    try {
      const params = GetSocialEventParamsSchema.parse(req.params);
      
      const event = await this.socialEventsService.getSocialEventById(params.id);
      
      if (!event) {
        res.status(404).json({
          success: false,
          error: 'Social event not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        data: event,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error retrieving social event:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid event ID',
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
   * GET /api/v1/social-events/:id/metrics
   * Retrieve metrics for a specific social event
   */
  async getSocialEventMetrics(req: Request, res: Response): Promise<void> {
    try {
      const params = GetSocialEventParamsSchema.parse(req.params);
      
      const metrics = await this.socialEventsService.getSocialEventMetrics(params.id);
      
      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error retrieving social event metrics:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid event ID',
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
}

/**
 * Create social events router
 */
export function createSocialEventsRouter(socialEventsService: SocialEventsService): Router {
  const router = Router();
  const controller = new SocialEventsController(socialEventsService);

  // Bind methods to preserve 'this' context
  router.get('/', controller.getSocialEvents.bind(controller));
  router.get('/:id', controller.getSocialEventById.bind(controller));
  router.get('/:id/metrics', controller.getSocialEventMetrics.bind(controller));

  return router;
}