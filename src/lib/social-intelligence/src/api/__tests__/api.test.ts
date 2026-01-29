/**
 * API Layer Unit Tests
 * Tests for REST API endpoints and services
 */

import request from 'supertest';
import { Application } from 'express';
import { createSocialIntelligenceApi } from '../index';
import { ApiServer } from '../server';
import { DefaultAuthService } from '../middleware/auth';

describe('Social Intelligence API', () => {
  let apiServer: ApiServer;
  let app: Application;
  let authService: DefaultAuthService;
  let testApiKey: string;
  let testJwtToken: string;

  beforeAll(async () => {
    // Create API server with test configuration
    apiServer = await createSocialIntelligenceApi({
      port: 0, // Use random port for testing
      jwtSecret: 'test-jwt-secret',
      corsOrigins: ['http://localhost:3000'],
      enableMockData: true
    });

    app = apiServer.getApp();
    
    // Setup test authentication
    authService = new DefaultAuthService('test-jwt-secret');
    testApiKey = 'test-api-key-123';
    testJwtToken = authService.generateTestToken('test-user-1', ['read:social_events', 'read:analytics']);
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        status: 'healthy',
        timestamp: expect.any(String),
        version: '1.0.0'
      });
    });
  });

  describe('API Documentation', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Social Intelligence API v1.0',
        endpoints: {
          social_events: '/api/v1/social-events',
          analytics: '/api/v1/analytics',
          webhooks: '/api/v1/webhooks'
        },
        documentation: '/api/docs',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Authentication', () => {
    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/social-events')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Authentication required. Provide either Authorization header with Bearer token or X-API-Key header',
        timestamp: expect.any(String)
      });
    });

    it('should accept valid API key', async () => {
      const response = await request(app)
        .get('/api/v1/social-events')
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should accept valid JWT token', async () => {
      const response = await request(app)
        .get('/api/v1/social-events')
        .set('Authorization', `Bearer ${testJwtToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject invalid API key', async () => {
      const response = await request(app)
        .get('/api/v1/social-events')
        .set('X-API-Key', 'invalid-key')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid API key',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Social Events API', () => {
    it('should get social events with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/social-events?page=1&limit=10')
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.any(Array),
        pagination: {
          page: 1,
          limit: 10,
          total: expect.any(Number),
          totalPages: expect.any(Number),
          hasNext: expect.any(Boolean),
          hasPrev: false
        },
        timestamp: expect.any(String)
      });

      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });

    it('should filter social events by platform', async () => {
      const response = await request(app)
        .get('/api/v1/social-events?platform=tiktok')
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((event: any) => {
        expect(event.platform).toBe('tiktok');
      });
    });

    it('should get social event by ID', async () => {
      // First get a list to find a valid ID
      const listResponse = await request(app)
        .get('/api/v1/social-events?limit=1')
        .set('X-API-Key', testApiKey)
        .expect(200);

      if (listResponse.body.data.length > 0) {
        const eventId = listResponse.body.data[0].id;
        
        const response = await request(app)
          .get(`/api/v1/social-events/${eventId}`)
          .set('X-API-Key', testApiKey)
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: expect.objectContaining({
            id: eventId,
            platform: expect.any(String),
            content: expect.any(String)
          }),
          timestamp: expect.any(String)
        });
      }
    });

    it('should return 404 for non-existent social event', async () => {
      const response = await request(app)
        .get('/api/v1/social-events/00000000-0000-0000-0000-000000000000')
        .set('X-API-Key', testApiKey)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Social event not found',
        timestamp: expect.any(String)
      });
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/social-events?page=invalid')
        .set('X-API-Key', testApiKey)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid query parameters',
        details: expect.any(Array),
        timestamp: expect.any(String)
      });
    });
  });

  describe('Analytics API', () => {
    it('should get engagement metrics', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/engagement?startDate=2024-01-01&endDate=2024-01-31')
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          timeSeriesData: expect.any(Array),
          totals: expect.objectContaining({
            likes: expect.any(Number),
            shares: expect.any(Number),
            comments: expect.any(Number),
            views: expect.any(Number),
            engagement_rate: expect.any(Number)
          }),
          growth: expect.any(Object)
        },
        timestamp: expect.any(String)
      });
    });

    it('should get performance metrics', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/performance?period=7d')
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          topPerformingContent: expect.any(Array),
          platformComparison: expect.any(Array),
          contentTypePerformance: expect.any(Array)
        },
        timestamp: expect.any(String)
      });
    });

    it('should require date parameters for engagement metrics', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/engagement')
        .set('X-API-Key', testApiKey)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid query parameters');
    });
  });

  describe('Webhooks API', () => {
    let webhookId: string;

    it('should create a webhook', async () => {
      const webhookData = {
        url: 'https://example.com/webhook',
        events: ['social_event.created', 'decision.made'],
        description: 'Test webhook'
      };

      const response = await request(app)
        .post('/api/v1/webhooks')
        .set('X-API-Key', testApiKey)
        .send(webhookData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: expect.any(String),
          url: webhookData.url,
          events: webhookData.events,
          description: webhookData.description,
          active: true,
          created_at: expect.any(String)
        }),
        timestamp: expect.any(String)
      });

      webhookId = response.body.data.id;
    });

    it('should get all webhooks', async () => {
      const response = await request(app)
        .get('/api/v1/webhooks')
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.any(Array),
        timestamp: expect.any(String)
      });
    });

    it('should get webhook by ID', async () => {
      if (webhookId) {
        const response = await request(app)
          .get(`/api/v1/webhooks/${webhookId}`)
          .set('X-API-Key', testApiKey)
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: expect.objectContaining({
            id: webhookId,
            url: expect.any(String),
            events: expect.any(Array)
          }),
          timestamp: expect.any(String)
        });
      }
    });

    it('should validate webhook creation data', async () => {
      const invalidWebhookData = {
        url: 'invalid-url',
        events: []
      };

      const response = await request(app)
        .post('/api/v1/webhooks')
        .set('X-API-Key', testApiKey)
        .send(invalidWebhookData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting', async () => {
      // This test would need to be adjusted based on actual rate limit settings
      // For now, we'll just verify the middleware is in place
      const response = await request(app)
        .get('/api/v1/social-events')
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown API endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/unknown-endpoint')
        .set('X-API-Key', testApiKey)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'API endpoint not found',
        timestamp: expect.any(String)
      });
    });
  });
});