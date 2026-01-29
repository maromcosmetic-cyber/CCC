/**
 * Social Intelligence API
 * Main entry point for REST API layer
 * Requirements: 11.1, 11.2, 11.3
 */

import { ApiServer, createApiServer, ApiServerConfig, ApiServices } from './server';
import { DefaultAuthService } from './middleware/auth';
import { SocialEventsApiService, MockSocialEventsRepository } from './services/SocialEventsApiService';

export { ApiServer, createApiServer, ApiServerConfig, ApiServices } from './server';

// Route exports
export { 
  createSocialEventsRouter, 
  SocialEventsController,
  SocialEventsService,
  SocialEventFilters,
  PaginatedResponse,
  SocialEventMetrics
} from './routes/social-events';

export { 
  createAnalyticsRouter,
  AnalyticsController,
  AnalyticsService,
  EngagementMetrics,
  PerformanceMetrics,
  AudienceInsights,
  SentimentAnalytics,
  TrendingTopics
} from './routes/analytics';

export { 
  createWebhooksRouter,
  WebhooksController,
  WebhookService,
  WebhookEventDispatcher,
  Webhook,
  WebhookDelivery,
  CreateWebhookRequest,
  UpdateWebhookRequest
} from './routes/webhooks';

// Middleware exports
export { 
  authMiddleware, 
  requirePermissions,
  AuthService,
  DefaultAuthService,
  AuthenticatedRequest,
  ApiKeyValidationResult,
  JwtValidationResult
} from './middleware/auth';

export { 
  errorHandler, 
  createApiError, 
  asyncHandler,
  ApiError
} from './middleware/error-handler';

export { 
  requestLogger, 
  createLogMessage,
  RequestLogEntry
} from './middleware/request-logger';

// Service exports
export { 
  SocialEventsApiService,
  MockSocialEventsRepository,
  SocialEventsRepository,
  FindManyOptions
} from './services/SocialEventsApiService';

/**
 * Create a complete API server with all services
 */
export async function createSocialIntelligenceApi(config?: {
  port?: number;
  jwtSecret?: string;
  corsOrigins?: string[];
  enableMockData?: boolean;
}): Promise<ApiServer> {
  const {
    port = 3001,
    jwtSecret = 'your-jwt-secret-key',
    corsOrigins = ['http://localhost:3000'],
    enableMockData = true
  } = config || {};

  // Initialize services
  const authService = new DefaultAuthService(jwtSecret);
  
  // Mock implementations for development/testing
  const socialEventsRepository = enableMockData ? new MockSocialEventsRepository() : null;
  const socialEventsService = socialEventsRepository ? 
    new SocialEventsApiService(socialEventsRepository) : null;

  // Mock analytics service
  const analyticsService = createMockAnalyticsService();
  
  // Mock webhook service
  const webhookService = createMockWebhookService();

  if (!socialEventsService) {
    throw new Error('Social events service not initialized');
  }

  const services: ApiServices = {
    socialEventsService,
    analyticsService,
    webhookService,
    authService
  };

  const serverConfig = {
    port,
    corsOrigins,
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    rateLimitMaxRequests: 100,
    enableRequestLogging: true
  };

  return createApiServer(services, serverConfig);
}

/**
 * Mock Analytics Service for development
 */
function createMockAnalyticsService(): any {
  return {
    async getEngagementMetrics() {
      return {
        timeSeriesData: Array.from({ length: 7 }, (_, i) => ({
          timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          likes: Math.floor(Math.random() * 1000),
          shares: Math.floor(Math.random() * 100),
          comments: Math.floor(Math.random() * 50),
          views: Math.floor(Math.random() * 10000),
          engagement_rate: Math.random() * 0.1
        })),
        totals: {
          likes: 5000,
          shares: 500,
          comments: 250,
          views: 50000,
          engagement_rate: 0.05
        },
        growth: {
          likes_growth: 0.15,
          shares_growth: 0.08,
          comments_growth: 0.12,
          views_growth: 0.20
        }
      };
    },

    async getPerformanceMetrics() {
      return {
        topPerformingContent: Array.from({ length: 10 }, (_, i) => ({
          id: `content-${i + 1}`,
          title: `Top Content ${i + 1}`,
          platform: ['tiktok', 'meta', 'youtube'][Math.floor(Math.random() * 3)],
          engagement_score: Math.random() * 100,
          reach: Math.floor(Math.random() * 10000),
          impressions: Math.floor(Math.random() * 50000)
        })),
        platformComparison: [
          { platform: 'tiktok', total_posts: 50, avg_engagement: 0.08, reach: 25000 },
          { platform: 'meta', total_posts: 30, avg_engagement: 0.05, reach: 15000 },
          { platform: 'youtube', total_posts: 20, avg_engagement: 0.12, reach: 35000 }
        ],
        contentTypePerformance: [
          { type: 'post', count: 60, avg_engagement: 0.06, total_reach: 40000 },
          { type: 'comment', count: 200, avg_engagement: 0.03, total_reach: 15000 },
          { type: 'mention', count: 80, avg_engagement: 0.04, total_reach: 20000 }
        ]
      };
    },

    async getAudienceInsights() {
      return {
        demographics: {
          age_groups: [
            { range: '18-24', percentage: 25 },
            { range: '25-34', percentage: 35 },
            { range: '35-44', percentage: 25 },
            { range: '45+', percentage: 15 }
          ],
          gender: [
            { type: 'female', percentage: 55 },
            { type: 'male', percentage: 42 },
            { type: 'other', percentage: 3 }
          ],
          locations: [
            { country: 'US', percentage: 40 },
            { country: 'UK', percentage: 20 },
            { country: 'CA', percentage: 15 },
            { country: 'AU', percentage: 10 },
            { country: 'Other', percentage: 15 }
          ]
        },
        behavior: {
          peak_activity_hours: Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            activity_level: Math.random() * 100
          })),
          engagement_patterns: [
            { day: 'Monday', engagement_rate: 0.04 },
            { day: 'Tuesday', engagement_rate: 0.05 },
            { day: 'Wednesday', engagement_rate: 0.06 },
            { day: 'Thursday', engagement_rate: 0.07 },
            { day: 'Friday', engagement_rate: 0.08 },
            { day: 'Saturday', engagement_rate: 0.09 },
            { day: 'Sunday', engagement_rate: 0.06 }
          ]
        },
        interests: [
          { category: 'Beauty', relevance_score: 0.8, audience_overlap: 0.6 },
          { category: 'Health', relevance_score: 0.7, audience_overlap: 0.5 },
          { category: 'Lifestyle', relevance_score: 0.6, audience_overlap: 0.4 }
        ]
      };
    },

    async getSentimentAnalytics() {
      return {
        overall: {
          positive: 0.6,
          negative: 0.2,
          neutral: 0.2,
          confidence: 0.85
        },
        trends: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          positive: Math.random() * 0.8,
          negative: Math.random() * 0.3,
          neutral: Math.random() * 0.4
        })),
        topics: [
          { topic: 'product quality', sentiment_score: 0.7, mention_count: 150 },
          { topic: 'customer service', sentiment_score: 0.8, mention_count: 100 },
          { topic: 'pricing', sentiment_score: 0.4, mention_count: 80 }
        ]
      };
    },

    async getTrendingTopics() {
      return {
        topics: [
          { topic: 'natural ingredients', mention_count: 200, growth_rate: 0.25, sentiment_score: 0.8, platforms: ['tiktok', 'meta'] },
          { topic: 'hair care routine', mention_count: 150, growth_rate: 0.15, sentiment_score: 0.7, platforms: ['youtube', 'meta'] },
          { topic: 'sustainable beauty', mention_count: 100, growth_rate: 0.30, sentiment_score: 0.9, platforms: ['tiktok', 'reddit'] }
        ],
        hashtags: [
          { hashtag: '#naturalhair', usage_count: 500, growth_rate: 0.20, platforms: ['tiktok', 'meta'] },
          { hashtag: '#haircare', usage_count: 300, growth_rate: 0.10, platforms: ['youtube', 'meta'] },
          { hashtag: '#cleanbeauty', usage_count: 200, growth_rate: 0.35, platforms: ['tiktok', 'reddit'] }
        ]
      };
    }
  };
}

/**
 * Mock Webhook Service for development
 */
function createMockWebhookService(): any {
  const webhooks: any[] = [];
  
  return {
    async createWebhook(webhook: any) {
      const newWebhook = {
        id: `webhook-${Date.now()}`,
        ...webhook,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        delivery_count: 0,
        failure_count: 0
      };
      webhooks.push(newWebhook);
      return newWebhook;
    },

    async getWebhooks() {
      return webhooks;
    },

    async getWebhookById(id: string) {
      return webhooks.find(w => w.id === id) || null;
    },

    async updateWebhook(id: string, updates: any) {
      const index = webhooks.findIndex(w => w.id === id);
      if (index === -1) throw new Error('Webhook not found');
      
      webhooks[index] = {
        ...webhooks[index],
        ...updates,
        updated_at: new Date().toISOString()
      };
      return webhooks[index];
    },

    async deleteWebhook(id: string) {
      const index = webhooks.findIndex(w => w.id === id);
      if (index === -1) throw new Error('Webhook not found');
      webhooks.splice(index, 1);
    },

    async testWebhook(id: string, testData: any) {
      const webhook = webhooks.find(w => w.id === id);
      if (!webhook) throw new Error('Webhook not found');
      
      return {
        success: true,
        status_code: 200,
        response_time_ms: Math.floor(Math.random() * 500) + 100,
        delivered_at: new Date().toISOString()
      };
    },

    async getWebhookDeliveries(id: string, limit = 50) {
      return Array.from({ length: Math.min(limit, 10) }, (_, i) => ({
        id: `delivery-${i + 1}`,
        webhook_id: id,
        event_type: 'social_event.created',
        payload: { test: 'data' },
        status_code: 200,
        success: true,
        response_time_ms: Math.floor(Math.random() * 500) + 100,
        delivered_at: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
        attempts: 1
      }));
    }
  };
}