/**
 * Webhooks API Routes
 * Provides REST endpoints for real-time event notifications
 * Requirements: 11.3
 */

import { Request, Response, Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';

// Request validation schemas
const CreateWebhookSchema = z.object({
  url: z.string().url('Invalid webhook URL'),
  events: z.array(z.enum([
    'social_event.created',
    'social_event.updated',
    'decision.made',
    'action.executed',
    'alert.triggered',
    'content.published',
    'analytics.updated'
  ])).min(1, 'At least one event type is required'),
  secret: z.string().min(8, 'Secret must be at least 8 characters').optional(),
  active: z.boolean().optional().default(true),
  description: z.string().optional()
});

const UpdateWebhookSchema = z.object({
  url: z.string().url('Invalid webhook URL').optional(),
  events: z.array(z.enum([
    'social_event.created',
    'social_event.updated',
    'decision.made',
    'action.executed',
    'alert.triggered',
    'content.published',
    'analytics.updated'
  ])).min(1, 'At least one event type is required').optional(),
  secret: z.string().min(8, 'Secret must be at least 8 characters').optional(),
  active: z.boolean().optional(),
  description: z.string().optional()
});

const WebhookParamsSchema = z.object({
  id: z.string().uuid()
});

const TestWebhookSchema = z.object({
  event_type: z.enum([
    'social_event.created',
    'social_event.updated',
    'decision.made',
    'action.executed',
    'alert.triggered',
    'content.published',
    'analytics.updated'
  ]),
  test_data: z.record(z.any()).optional()
});

export interface WebhookService {
  createWebhook(webhook: CreateWebhookRequest): Promise<Webhook>;
  getWebhooks(): Promise<Webhook[]>;
  getWebhookById(id: string): Promise<Webhook | null>;
  updateWebhook(id: string, updates: UpdateWebhookRequest): Promise<Webhook>;
  deleteWebhook(id: string): Promise<void>;
  testWebhook(id: string, testData: TestWebhookRequest): Promise<WebhookTestResult>;
  getWebhookDeliveries(id: string, limit?: number): Promise<WebhookDelivery[]>;
}

export interface CreateWebhookRequest {
  url: string;
  events: string[];
  secret?: string;
  active?: boolean;
  description?: string;
}

export interface UpdateWebhookRequest {
  url?: string;
  events?: string[];
  secret?: string;
  active?: boolean;
  description?: string;
}

export interface TestWebhookRequest {
  event_type: string;
  test_data?: Record<string, any>;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
  last_delivery?: string;
  delivery_count: number;
  failure_count: number;
}

export interface WebhookTestResult {
  success: boolean;
  status_code?: number;
  response_time_ms: number;
  error?: string;
  delivered_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: Record<string, any>;
  status_code?: number;
  success: boolean;
  response_time_ms?: number;
  error?: string;
  delivered_at: string;
  attempts: number;
}

export class WebhooksController {
  constructor(private webhookService: WebhookService) {}

  /**
   * POST /api/v1/webhooks
   * Create a new webhook endpoint
   */
  async createWebhook(req: Request, res: Response): Promise<void> {
    try {
      const webhookData = CreateWebhookSchema.parse(req.body);
      
      const webhook = await this.webhookService.createWebhook(webhookData);
      
      res.status(201).json({
        success: true,
        data: webhook,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error creating webhook:', error);
      this.handleError(error, res);
    }
  }

  /**
   * GET /api/v1/webhooks
   * Retrieve all webhook endpoints
   */
  async getWebhooks(req: Request, res: Response): Promise<void> {
    try {
      const webhooks = await this.webhookService.getWebhooks();
      
      res.json({
        success: true,
        data: webhooks,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error retrieving webhooks:', error);
      this.handleError(error, res);
    }
  }

  /**
   * GET /api/v1/webhooks/:id
   * Retrieve a specific webhook endpoint
   */
  async getWebhookById(req: Request, res: Response): Promise<void> {
    try {
      const params = WebhookParamsSchema.parse(req.params);
      
      const webhook = await this.webhookService.getWebhookById(params.id);
      
      if (!webhook) {
        res.status(404).json({
          success: false,
          error: 'Webhook not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        data: webhook,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error retrieving webhook:', error);
      this.handleError(error, res);
    }
  }

  /**
   * PUT /api/v1/webhooks/:id
   * Update a webhook endpoint
   */
  async updateWebhook(req: Request, res: Response): Promise<void> {
    try {
      const params = WebhookParamsSchema.parse(req.params);
      const updates = UpdateWebhookSchema.parse(req.body);
      
      const webhook = await this.webhookService.updateWebhook(params.id, updates);
      
      res.json({
        success: true,
        data: webhook,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating webhook:', error);
      this.handleError(error, res);
    }
  }

  /**
   * DELETE /api/v1/webhooks/:id
   * Delete a webhook endpoint
   */
  async deleteWebhook(req: Request, res: Response): Promise<void> {
    try {
      const params = WebhookParamsSchema.parse(req.params);
      
      await this.webhookService.deleteWebhook(params.id);
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting webhook:', error);
      this.handleError(error, res);
    }
  }

  /**
   * POST /api/v1/webhooks/:id/test
   * Test a webhook endpoint with sample data
   */
  async testWebhook(req: Request, res: Response): Promise<void> {
    try {
      const params = WebhookParamsSchema.parse(req.params);
      const testData = TestWebhookSchema.parse(req.body);
      
      const result = await this.webhookService.testWebhook(params.id, testData);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error testing webhook:', error);
      this.handleError(error, res);
    }
  }

  /**
   * GET /api/v1/webhooks/:id/deliveries
   * Retrieve delivery history for a webhook
   */
  async getWebhookDeliveries(req: Request, res: Response): Promise<void> {
    try {
      const params = WebhookParamsSchema.parse(req.params);
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      
      const deliveries = await this.webhookService.getWebhookDeliveries(params.id, limit);
      
      res.json({
        success: true,
        data: deliveries,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error retrieving webhook deliveries:', error);
      this.handleError(error, res);
    }
  }

  private handleError(error: unknown, res: Response): void {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
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
 * Webhook Event Dispatcher
 * Handles sending webhook notifications for various events
 */
export class WebhookEventDispatcher {
  constructor(private webhookService: WebhookService) {}

  /**
   * Dispatch an event to all registered webhooks
   */
  async dispatchEvent(eventType: string, payload: Record<string, any>): Promise<void> {
    try {
      const webhooks = await this.webhookService.getWebhooks();
      const relevantWebhooks = webhooks.filter(
        webhook => webhook.active && webhook.events.includes(eventType)
      );

      const deliveryPromises = relevantWebhooks.map(webhook => 
        this.deliverWebhook(webhook, eventType, payload)
      );

      await Promise.allSettled(deliveryPromises);
    } catch (error) {
      console.error('Error dispatching webhook event:', error);
    }
  }

  /**
   * Deliver webhook to a specific endpoint
   */
  private async deliverWebhook(
    webhook: Webhook, 
    eventType: string, 
    payload: Record<string, any>
  ): Promise<void> {
    try {
      const webhookPayload = {
        event: eventType,
        timestamp: new Date().toISOString(),
        data: payload
      };

      const signature = webhook.secret 
        ? this.generateSignature(JSON.stringify(webhookPayload), webhook.secret)
        : undefined;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'SocialIntelligence-Webhook/1.0'
      };

      if (signature) {
        headers['X-Webhook-Signature'] = signature;
      }

      const startTime = Date.now();
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(webhookPayload),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      const responseTime = Date.now() - startTime;
      const success = response.ok;

      console.log(`Webhook delivered to ${webhook.url}: ${response.status} (${responseTime}ms)`);
    } catch (error) {
      console.error(`Failed to deliver webhook to ${webhook.url}:`, error);
    }
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: string, secret: string): string {
    return 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }
}

/**
 * Create webhooks router
 */
export function createWebhooksRouter(webhookService: WebhookService): Router {
  const router = Router();
  const controller = new WebhooksController(webhookService);

  // Bind methods to preserve 'this' context
  router.post('/', controller.createWebhook.bind(controller));
  router.get('/', controller.getWebhooks.bind(controller));
  router.get('/:id', controller.getWebhookById.bind(controller));
  router.put('/:id', controller.updateWebhook.bind(controller));
  router.delete('/:id', controller.deleteWebhook.bind(controller));
  router.post('/:id/test', controller.testWebhook.bind(controller));
  router.get('/:id/deliveries', controller.getWebhookDeliveries.bind(controller));

  return router;
}