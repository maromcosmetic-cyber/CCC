/**
 * Ingestion Service Orchestrator
 * Coordinates all platform adapters and manages data ingestion workflow
 */

import { Platform, SocialEvent } from '../types/core';
import { AuthManager } from '../auth/AuthManager';
import { TikTokAdapter } from './adapters/TikTokAdapter';
import { MetaAdapter } from './adapters/MetaAdapter';
import { YouTubeAdapter } from './adapters/YouTubeAdapter';
import { RedditAdapter } from './adapters/RedditAdapter';
import { RSSAdapter } from './adapters/RSSAdapter';
import { 
  PlatformAdapter, 
  FetchParams, 
  FetchResult, 
  AdapterConfig,
  IngestionMetrics,
  WebhookCallback
} from './types';

export interface IngestionConfig {
  platforms: {
    [Platform.TIKTOK]?: AdapterConfig;
    [Platform.INSTAGRAM]?: AdapterConfig;
    [Platform.FACEBOOK]?: AdapterConfig;
    [Platform.YOUTUBE]?: AdapterConfig;
    [Platform.REDDIT]?: AdapterConfig;
    [Platform.RSS]?: AdapterConfig & { feedUrls: string[] };
  };
  defaultFetchParams?: Partial<FetchParams>;
  batchSize?: number;
  maxConcurrentRequests?: number;
  retryAttempts?: number;
  webhookEndpoint?: string;
}

export interface IngestionResult {
  platform: Platform;
  events: SocialEvent[];
  errors: Error[];
  metrics: IngestionMetrics;
  nextCursor?: string;
  hasMore: boolean;
}

export interface IngestionSummary {
  totalEvents: number;
  eventsByPlatform: Record<Platform, number>;
  totalErrors: number;
  errorsByPlatform: Record<Platform, number>;
  processingTime: number;
  successfulPlatforms: Platform[];
  failedPlatforms: Platform[];
}

export class IngestionService {
  private adapters: Map<Platform, PlatformAdapter> = new Map();
  private authManager: AuthManager;
  private config: IngestionConfig;
  private isRunning = false;
  private webhookCallbacks: Map<Platform, WebhookCallback> = new Map();

  constructor(config: IngestionConfig, authManager: AuthManager) {
    this.config = config;
    this.authManager = authManager;
    this.initializeAdapters();
  }

  /**
   * Initialize platform adapters based on configuration
   */
  private initializeAdapters(): void {
    const { platforms } = this.config;

    // Initialize TikTok adapter
    if (platforms[Platform.TIKTOK]) {
      this.adapters.set(Platform.TIKTOK, new TikTokAdapter(platforms[Platform.TIKTOK]));
    }

    // Initialize Instagram adapter
    if (platforms[Platform.INSTAGRAM]) {
      this.adapters.set(Platform.INSTAGRAM, new MetaAdapter(platforms[Platform.INSTAGRAM], Platform.INSTAGRAM));
    }

    // Initialize Facebook adapter
    if (platforms[Platform.FACEBOOK]) {
      this.adapters.set(Platform.FACEBOOK, new MetaAdapter(platforms[Platform.FACEBOOK], Platform.FACEBOOK));
    }

    // Initialize YouTube adapter
    if (platforms[Platform.YOUTUBE]) {
      this.adapters.set(Platform.YOUTUBE, new YouTubeAdapter(platforms[Platform.YOUTUBE]));
    }

    // Initialize Reddit adapter
    if (platforms[Platform.REDDIT]) {
      this.adapters.set(Platform.REDDIT, new RedditAdapter(platforms[Platform.REDDIT]));
    }

    // Initialize RSS adapter
    if (platforms[Platform.RSS]) {
      this.adapters.set(Platform.RSS, new RSSAdapter(platforms[Platform.RSS]));
    }
  }

  /**
   * Ingest data from all configured platforms
   */
  async ingestAll(params?: Partial<FetchParams>): Promise<IngestionSummary> {
    if (this.isRunning) {
      throw new Error('Ingestion is already running');
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      const fetchParams = { ...this.config.defaultFetchParams, ...params };
      const platforms = Array.from(this.adapters.keys());
      
      // Process platforms in batches to respect rate limits
      const batchSize = this.config.batchSize || 3;
      const results: IngestionResult[] = [];
      
      for (let i = 0; i < platforms.length; i += batchSize) {
        const batch = platforms.slice(i, i + batchSize);
        const batchPromises = batch.map(platform => 
          this.ingestFromPlatform(platform, fetchParams)
        );
        
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            // Create error result for failed platform
            const platform = batch[index];
            results.push({
              platform,
              events: [],
              errors: [result.reason],
              metrics: this.adapters.get(platform)?.getMetrics() || {
                platform,
                eventsProcessed: 0,
                errorsEncountered: 1,
                lastSuccessfulFetch: new Date(0),
                averageProcessingTime: 0,
                rateLimitHits: 0
              },
              hasMore: false
            });
          }
        });

        // Add delay between batches to be respectful to APIs
        if (i + batchSize < platforms.length) {
          await this.sleep(2000);
        }
      }

      return this.generateSummary(results, Date.now() - startTime);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Ingest data from a specific platform
   */
  async ingestFromPlatform(platform: Platform, params?: Partial<FetchParams>): Promise<IngestionResult> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new Error(`No adapter configured for platform: ${platform}`);
    }

    const errors: Error[] = [];
    const events: SocialEvent[] = [];
    let hasMore = false;
    let nextCursor: string | undefined;

    try {
      // Fetch raw data from platform
      const fetchParams = { ...this.config.defaultFetchParams, ...params };
      const result = await adapter.fetchData(fetchParams);
      
      hasMore = result.hasMore;
      nextCursor = result.nextCursor;

      // Normalize and process each raw data item
      for (const rawData of result.data) {
        try {
          const normalizedEvent = await adapter.normalizeData(rawData);
          events.push(normalizedEvent);
        } catch (error) {
          errors.push(new Error(`Failed to normalize data from ${platform}: ${error}`));
        }
      }

    } catch (error) {
      errors.push(new Error(`Failed to fetch data from ${platform}: ${error}`));
    }

    return {
      platform,
      events,
      errors,
      metrics: adapter.getMetrics(),
      nextCursor,
      hasMore
    };
  }

  /**
   * Set up webhook subscriptions for real-time data
   */
  async setupWebhooks(): Promise<void> {
    const webhookCallback: WebhookCallback = async (data) => {
      try {
        const adapter = this.adapters.get(data.platform);
        if (adapter) {
          const normalizedEvent = await adapter.normalizeData(data);
          await this.processWebhookEvent(normalizedEvent);
        }
      } catch (error) {
        console.error(`Failed to process webhook data from ${data.platform}:`, error);
      }
    };

    // Set up webhooks for platforms that support them
    for (const [platform, adapter] of this.adapters) {
      if (adapter.subscribeToWebhooks) {
        try {
          await adapter.subscribeToWebhooks(webhookCallback);
          this.webhookCallbacks.set(platform, webhookCallback);
          console.log(`Webhook subscription set up for ${platform}`);
        } catch (error) {
          console.error(`Failed to set up webhook for ${platform}:`, error);
        }
      }
    }
  }

  /**
   * Process webhook event (override this method to customize processing)
   */
  protected async processWebhookEvent(event: SocialEvent): Promise<void> {
    // Default implementation - log the event
    console.log(`Received webhook event from ${event.platform}:`, event.id);
    
    // In a real implementation, this would:
    // 1. Store the event in the database
    // 2. Trigger AI analysis
    // 3. Execute decision engine logic
    // 4. Send notifications if needed
  }

  /**
   * Get metrics for all platforms
   */
  getAllMetrics(): Record<Platform, IngestionMetrics> {
    const metrics: Record<string, IngestionMetrics> = {};
    
    for (const [platform, adapter] of this.adapters) {
      metrics[platform] = adapter.getMetrics();
    }
    
    return metrics as Record<Platform, IngestionMetrics>;
  }

  /**
   * Reset metrics for all platforms
   */
  resetAllMetrics(): void {
    for (const adapter of this.adapters.values()) {
      adapter.resetMetrics();
    }
  }

  /**
   * Get adapter for a specific platform
   */
  getAdapter(platform: Platform): PlatformAdapter | undefined {
    return this.adapters.get(platform);
  }

  /**
   * Check if ingestion is currently running
   */
  isIngestionRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get list of configured platforms
   */
  getConfiguredPlatforms(): Platform[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Update configuration for a specific platform
   */
  updatePlatformConfig(platform: Platform, config: AdapterConfig): void {
    if (!this.adapters.has(platform)) {
      throw new Error(`Platform ${platform} is not configured`);
    }

    // Reinitialize the adapter with new config
    switch (platform) {
      case Platform.TIKTOK:
        this.adapters.set(platform, new TikTokAdapter(config));
        break;
      case Platform.INSTAGRAM:
        this.adapters.set(platform, new MetaAdapter(config, Platform.INSTAGRAM));
        break;
      case Platform.FACEBOOK:
        this.adapters.set(platform, new MetaAdapter(config, Platform.FACEBOOK));
        break;
      case Platform.YOUTUBE:
        this.adapters.set(platform, new YouTubeAdapter(config));
        break;
      case Platform.REDDIT:
        this.adapters.set(platform, new RedditAdapter(config));
        break;
      case Platform.RSS:
        this.adapters.set(platform, new RSSAdapter(config as AdapterConfig & { feedUrls: string[] }));
        break;
    }
  }

  /**
   * Generate ingestion summary from results
   */
  private generateSummary(results: IngestionResult[], processingTime: number): IngestionSummary {
    const summary: IngestionSummary = {
      totalEvents: 0,
      eventsByPlatform: {} as Record<Platform, number>,
      totalErrors: 0,
      errorsByPlatform: {} as Record<Platform, number>,
      processingTime,
      successfulPlatforms: [],
      failedPlatforms: []
    };

    for (const result of results) {
      summary.totalEvents += result.events.length;
      summary.eventsByPlatform[result.platform] = result.events.length;
      
      summary.totalErrors += result.errors.length;
      summary.errorsByPlatform[result.platform] = result.errors.length;

      if (result.errors.length === 0 && result.events.length > 0) {
        summary.successfulPlatforms.push(result.platform);
      } else if (result.errors.length > 0) {
        summary.failedPlatforms.push(result.platform);
      }
    }

    return summary;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Graceful shutdown - stop all ongoing operations
   */
  async shutdown(): Promise<void> {
    this.isRunning = false;
    
    // Clear webhook callbacks
    this.webhookCallbacks.clear();
    
    // Reset all adapter metrics
    this.resetAllMetrics();
    
    console.log('Ingestion service shut down gracefully');
  }
}