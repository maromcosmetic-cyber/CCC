/**
 * Social Intelligence API Server
 * Main Express server for REST API endpoints
 * Requirements: 11.1, 11.2, 11.3
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createSocialEventsRouter, SocialEventsService } from './routes/social-events';
import { createAnalyticsRouter, AnalyticsService } from './routes/analytics';
import { createWebhooksRouter, WebhookService } from './routes/webhooks';
import { authMiddleware, AuthService } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';

export interface ApiServerConfig {
  port: number;
  corsOrigins: string[];
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  enableRequestLogging: boolean;
}

export interface ApiServices {
  socialEventsService: SocialEventsService;
  analyticsService: AnalyticsService;
  webhookService: WebhookService;
  authService: AuthService;
}

export class ApiServer {
  private app: Application;
  private config: ApiServerConfig;
  private services: ApiServices;

  constructor(config: ApiServerConfig, services: ApiServices) {
    this.config = config;
    this.services = services;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: this.config.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: this.config.rateLimitWindowMs,
      max: this.config.rateLimitMaxRequests,
      message: {
        success: false,
        error: 'Too many requests, please try again later',
        timestamp: new Date().toISOString()
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    if (this.config.enableRequestLogging) {
      this.app.use(requestLogger);
    }

    // Authentication middleware for API routes
    this.app.use('/api/', authMiddleware(this.services.authService));
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // API documentation endpoint
    this.app.get('/api', (req: Request, res: Response) => {
      res.json({
        success: true,
        message: 'Social Intelligence API v1.0',
        endpoints: {
          social_events: '/api/v1/social-events',
          analytics: '/api/v1/analytics',
          webhooks: '/api/v1/webhooks'
        },
        documentation: '/api/docs',
        timestamp: new Date().toISOString()
      });
    });

    // API v1 routes
    this.app.use('/api/v1/social-events', createSocialEventsRouter(this.services.socialEventsService));
    this.app.use('/api/v1/analytics', createAnalyticsRouter(this.services.analyticsService));
    this.app.use('/api/v1/webhooks', createWebhooksRouter(this.services.webhookService));

    // 404 handler for API routes
    this.app.use('/api/*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: 'API endpoint not found',
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const server = this.app.listen(this.config.port, () => {
          console.log(`Social Intelligence API server started on port ${this.config.port}`);
          console.log(`Health check: http://localhost:${this.config.port}/health`);
          console.log(`API documentation: http://localhost:${this.config.port}/api`);
          resolve();
        });

        server.on('error', (error) => {
          console.error('Server error:', error);
          reject(error);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
          console.log('SIGTERM received, shutting down gracefully');
          server.close(() => {
            console.log('Server closed');
            process.exit(0);
          });
        });

        process.on('SIGINT', () => {
          console.log('SIGINT received, shutting down gracefully');
          server.close(() => {
            console.log('Server closed');
            process.exit(0);
          });
        });

      } catch (error) {
        console.error('Failed to start server:', error);
        reject(error);
      }
    });
  }

  /**
   * Get Express app instance
   */
  public getApp(): Application {
    return this.app;
  }
}

/**
 * Create API server with default configuration
 */
export function createApiServer(services: ApiServices, config?: Partial<ApiServerConfig>): ApiServer {
  const defaultConfig: ApiServerConfig = {
    port: 3001,
    corsOrigins: ['http://localhost:3000', 'http://localhost:3001'],
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    rateLimitMaxRequests: 100, // 100 requests per window
    enableRequestLogging: true
  };

  const finalConfig = { ...defaultConfig, ...config };
  return new ApiServer(finalConfig, services);
}