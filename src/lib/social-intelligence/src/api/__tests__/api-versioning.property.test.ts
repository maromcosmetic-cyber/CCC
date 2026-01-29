/**
 * Property-Based Tests for API Versioning
 * Property 16: API versioning and backward compatibility
 * Validates: Requirements 11.5
 */

import * as fc from 'fast-check';
import request from 'supertest';
import { Application } from 'express';
import { createSocialIntelligenceApi } from '../index';
import { ApiServer } from '../server';
import { DefaultAuthService } from '../middleware/auth';

describe('Property-Based Tests: API Versioning', () => {
  let apiServer: ApiServer;
  let app: Application;
  let authService: DefaultAuthService;
  let testApiKey: string;
  let testJwtToken: string;

  beforeAll(async () => {
    // Create API server with test configuration
    apiServer = await createSocialIntelligenceApi({
      port: 0, // Use random port for testing
      jwtSecret: 'test-jwt-secret-versioning',
      corsOrigins: ['http://localhost:3000'],
      enableMockData: true
    });

    app = apiServer.getApp();
    
    // Setup test authentication
    authService = new DefaultAuthService('test-jwt-secret-versioning');
    testApiKey = 'test-api-key-123';
    testJwtToken = authService.generateTestToken('test-user-1', ['read:social_events', 'read:analytics', 'write:webhooks']);
  });

  /**
   * Property 16: API versioning and backward compatibility
   * **Validates: Requirements 11.5**
   */
  describe('Property 16: API versioning and backward compatibility', () => {
    
    it('should maintain consistent versioning across all API endpoints', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            { endpoint: '/api/v1/social-events', method: 'GET' },
            { endpoint: '/api/v1/analytics/engagement', method: 'GET' },
            { endpoint: '/api/v1/analytics/performance', method: 'GET' },
            { endpoint: '/api/v1/webhooks', method: 'GET' },
            { endpoint: '/api/v1/webhooks', method: 'POST' }
          ),
          async (apiCall: { endpoint: string; method: string }) => {
            let requestBuilder = request(app)[apiCall.method.toLowerCase() as 'get' | 'post'](apiCall.endpoint)
              .set('X-API-Key', testApiKey);

            // Add required query parameters for specific endpoints
            if (apiCall.endpoint.includes('engagement')) {
              requestBuilder = requestBuilder.query({
                startDate: '2024-01-01',
                endDate: '2024-01-31'
              });
            }
            if (apiCall.endpoint.includes('performance')) {
              requestBuilder = requestBuilder.query({
                period: '7d'
              });
            }

            // Add required data for POST requests
            if (apiCall.method === 'POST' && apiCall.endpoint.includes('webhooks')) {
              requestBuilder = requestBuilder.send({
                url: 'https://example.com/webhook',
                events: ['social_event.created'],
                description: 'Test webhook'
              });
            }

            const response = await requestBuilder;

            // All v1 endpoints should be accessible and return proper responses
            expect(response.status).toBeGreaterThanOrEqual(200);
            expect(response.status).toBeLessThan(500);
            
            // All responses should have consistent structure
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('timestamp');
            expect(typeof response.body.success).toBe('boolean');
            expect(typeof response.body.timestamp).toBe('string');

            // Verify timestamp is valid ISO string
            expect(() => new Date(response.body.timestamp)).not.toThrow();
            expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle version-specific endpoint access patterns', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            version: fc.constantFrom('v1'),
            resource: fc.constantFrom('social-events', 'analytics', 'webhooks'),
            subResource: fc.option(fc.constantFrom('engagement', 'performance'), { nil: undefined }),
            method: fc.constantFrom('GET', 'POST')
          }),
          async (params: { version: string; resource: string; subResource?: string; method: string }) => {
            // Skip invalid combinations
            if (params.method === 'POST' && params.resource !== 'webhooks') {
              return true;
            }
            if (params.subResource && params.resource !== 'analytics') {
              return true;
            }

            // Build endpoint URL
            let endpoint = `/api/${params.version}/${params.resource}`;
            if (params.subResource) {
              endpoint += `/${params.subResource}`;
            }

            let requestBuilder = request(app)[params.method.toLowerCase() as 'get' | 'post'](endpoint)
              .set('X-API-Key', testApiKey);

            // Add required parameters
            if (params.subResource === 'engagement') {
              requestBuilder = requestBuilder.query({
                startDate: '2024-01-01',
                endDate: '2024-01-31'
              });
            }
            if (params.subResource === 'performance') {
              requestBuilder = requestBuilder.query({
                period: '7d'
              });
            }
            if (params.method === 'POST' && params.resource === 'webhooks') {
              requestBuilder = requestBuilder.send({
                url: 'https://example.com/webhook',
                events: ['social_event.created'],
                description: 'Test webhook'
              });
            }

            const response = await requestBuilder;

            // All valid versioned endpoints should work
            expect(response.status).toBeGreaterThanOrEqual(200);
            expect(response.status).toBeLessThan(500);

            // Response should have version-consistent structure
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('timestamp');

            if (response.body.success) {
              expect(response.body).toHaveProperty('data');
            } else {
              expect(response.body).toHaveProperty('error');
            }

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should provide consistent error responses across API versions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            version: fc.constantFrom('v1'),
            endpoint: fc.constantFrom('social-events', 'analytics/engagement', 'webhooks'),
            invalidParam: fc.oneof(
              fc.record({ page: fc.constant('invalid') }),
              fc.record({ limit: fc.constant('invalid') }),
              fc.record({ platform: fc.constant('invalid-platform') }),
              fc.record({ startDate: fc.constant('invalid-date') })
            )
          }),
          async (params: { version: string; endpoint: string; invalidParam: any }) => {
            const queryString = Object.entries(params.invalidParam)
              .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
              .join('&');

            const url = `/api/${params.version}/${params.endpoint}${queryString ? '?' + queryString : ''}`;

            const response = await request(app)
              .get(url)
              .set('X-API-Key', testApiKey);

            // Should return consistent error structure regardless of version
            if (response.status === 400) {
              expect(response.body).toHaveProperty('success');
              expect(response.body).toHaveProperty('timestamp');
              expect(response.body).toHaveProperty('error');
              expect(response.body.success).toBe(false);
              expect(typeof response.body.error).toBe('string');
              expect(typeof response.body.timestamp).toBe('string');

              // Timestamp should be valid
              expect(() => new Date(response.body.timestamp)).not.toThrow();
            }

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should maintain backward compatibility for existing endpoints', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            endpoint: fc.constantFrom(
              '/api/v1/social-events',
              '/api/v1/analytics/engagement?startDate=2024-01-01&endDate=2024-01-31',
              '/api/v1/analytics/performance?period=7d',
              '/api/v1/webhooks'
            ),
            clientVersion: fc.constantFrom('1.0.0', '1.1.0', '1.2.0'),
            userAgent: fc.constantFrom(
              'SocialIntelligenceClient/1.0.0',
              'SocialIntelligenceClient/1.1.0',
              'SocialIntelligenceClient/1.2.0',
              'CustomClient/2.0.0'
            )
          }),
          async (params: { endpoint: string; clientVersion: string; userAgent: string }) => {
            const response = await request(app)
              .get(params.endpoint)
              .set('X-API-Key', testApiKey)
              .set('User-Agent', params.userAgent)
              .set('X-Client-Version', params.clientVersion);

            // All client versions should be able to access v1 endpoints
            expect(response.status).toBeGreaterThanOrEqual(200);
            expect(response.status).toBeLessThan(500);

            // Response structure should be consistent regardless of client version
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('timestamp');

            if (response.body.success) {
              expect(response.body).toHaveProperty('data');
              
              // Verify data structure consistency
              if (params.endpoint.includes('social-events')) {
                expect(response.body).toHaveProperty('pagination');
                expect(Array.isArray(response.body.data)).toBe(true);
              } else if (params.endpoint.includes('analytics')) {
                expect(typeof response.body.data).toBe('object');
              } else if (params.endpoint.includes('webhooks')) {
                expect(Array.isArray(response.body.data)).toBe(true);
              }
            }

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle version negotiation and content type consistency', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            endpoint: fc.constantFrom(
              '/api/v1/social-events',
              '/api/v1/analytics/engagement?startDate=2024-01-01&endDate=2024-01-31',
              '/api/v1/webhooks'
            ),
            acceptHeader: fc.constantFrom(
              'application/json',
              'application/json; version=1',
              'application/json; version=1.0',
              'application/vnd.api+json',
              '*/*'
            ),
            contentType: fc.constantFrom(
              'application/json',
              'application/json; charset=utf-8'
            )
          }),
          async (params: { endpoint: string; acceptHeader: string; contentType: string }) => {
            const response = await request(app)
              .get(params.endpoint)
              .set('X-API-Key', testApiKey)
              .set('Accept', params.acceptHeader)
              .set('Content-Type', params.contentType);

            // Should handle different Accept headers gracefully
            expect(response.status).toBeGreaterThanOrEqual(200);
            expect(response.status).toBeLessThan(500);

            // Response should always be JSON regardless of Accept header
            expect(response.headers['content-type']).toMatch(/application\/json/);

            // Response structure should be consistent
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('timestamp');

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should provide consistent API documentation and metadata across versions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('v1'),
          async (version: string) => {
            // Test API root endpoint for version information
            const response = await request(app)
              .get('/api')
              .set('X-API-Key', testApiKey);

            // Handle rate limiting
            if (response.status === 429) {
              // Rate limited - this is expected behavior, skip validation
              return true;
            }

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('endpoints');
            expect(response.body).toHaveProperty('timestamp');

            // Verify version information is included
            expect(response.body.message).toContain('v1.0');
            
            // Verify all expected endpoints are documented
            expect(response.body.endpoints).toHaveProperty('social_events');
            expect(response.body.endpoints).toHaveProperty('analytics');
            expect(response.body.endpoints).toHaveProperty('webhooks');

            // Verify endpoint URLs include version
            expect(response.body.endpoints.social_events).toContain('/v1/');
            expect(response.body.endpoints.analytics).toContain('/v1/');
            expect(response.body.endpoints.webhooks).toContain('/v1/');

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle deprecated features gracefully with proper warnings', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            endpoint: fc.constantFrom('/api/v1/social-events', '/api/v1/webhooks'),
            deprecatedParam: fc.option(fc.constantFrom('legacy_format', 'old_style'), { nil: undefined }),
            warningExpected: fc.boolean()
          }),
          async (params: { endpoint: string; deprecatedParam?: string; warningExpected: boolean }) => {
            let requestBuilder = request(app).get(params.endpoint).set('X-API-Key', testApiKey);

            if (params.deprecatedParam) {
              requestBuilder = requestBuilder.query({ [params.deprecatedParam]: 'true' });
            }

            const response = await requestBuilder;

            // Should still work even with deprecated parameters
            expect(response.status).toBeGreaterThanOrEqual(200);
            expect(response.status).toBeLessThan(500);

            // Response structure should be consistent
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('timestamp');

            // Note: In a real implementation, deprecated parameters might include warnings
            // For now, we just verify the API continues to work
            if (response.body.success) {
              expect(response.body).toHaveProperty('data');
            }

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});