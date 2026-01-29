/**
 * Base adapter class for platform ingestion
 */

import { Platform, SocialEvent, EventType } from '../types/core';
import { AuthToken } from '../auth/types';
import { 
  PlatformAdapter, 
  RawPlatformData, 
  FetchParams, 
  FetchResult, 
  RateLimitError,
  AdapterConfig,
  IngestionMetrics
} from './types';

export abstract class BaseAdapter implements PlatformAdapter {
  public readonly platform: Platform;
  protected config: AdapterConfig;
  protected authToken?: AuthToken;
  protected metrics: IngestionMetrics;

  constructor(platform: Platform, config: AdapterConfig) {
    this.platform = platform;
    this.config = config;
    this.metrics = {
      platform,
      eventsProcessed: 0,
      errorsEncountered: 0,
      lastSuccessfulFetch: new Date(0),
      averageProcessingTime: 0,
      rateLimitHits: 0
    };
  }

  abstract authenticate(): Promise<AuthToken>;
  abstract refreshToken(token: AuthToken): Promise<AuthToken>;
  abstract fetchData(params: FetchParams): Promise<FetchResult>;
  abstract normalizeData(rawData: RawPlatformData): Promise<SocialEvent>;

  /**
   * Handle rate limit errors with exponential backoff
   */
  async handleRateLimit(error: RateLimitError): Promise<void> {
    this.metrics.rateLimitHits++;
    
    const delay = this.calculateBackoffDelay(error.retryAfter);
    console.warn(`Rate limit hit for ${this.platform}. Waiting ${delay}ms before retry.`);
    
    await this.sleep(delay);
  }

  /**
   * Get current adapter metrics
   */
  getMetrics(): IngestionMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics counters
   */
  resetMetrics(): void {
    this.metrics = {
      ...this.metrics,
      eventsProcessed: 0,
      errorsEncountered: 0,
      rateLimitHits: 0
    };
  }

  /**
   * Make authenticated HTTP request
   */
  protected async makeRequest(
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    const startTime = Date.now();
    
    try {
      // Ensure we have a valid token
      if (!this.authToken || this.isTokenExpired(this.authToken)) {
        this.authToken = await this.authenticate();
      }

      const headers = {
        'Authorization': `${this.authToken.tokenType || 'Bearer'} ${this.authToken.accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'SocialIntelligence/1.0',
        ...options.headers
      };

      const response = await fetch(url, {
        ...options,
        headers
      });

      // Update metrics
      const processingTime = Date.now() - startTime;
      this.updateProcessingTime(processingTime);

      if (!response.ok) {
        await this.handleHttpError(response);
      }

      this.metrics.lastSuccessfulFetch = new Date();
      return response;

    } catch (error) {
      this.metrics.errorsEncountered++;
      throw error;
    }
  }

  /**
   * Handle HTTP errors and convert to appropriate error types
   */
  protected async handleHttpError(response: Response): Promise<never> {
    const errorData = await response.json().catch(() => ({}));
    
    if (response.status === 429) {
      const resetTime = response.headers.get('x-rate-limit-reset');
      const retryAfter = response.headers.get('retry-after');
      
      const rateLimitError = new Error(`Rate limit exceeded for ${this.platform}`) as RateLimitError;
      rateLimitError.platform = this.platform;
      rateLimitError.resetTime = resetTime ? new Date(parseInt(resetTime) * 1000) : new Date(Date.now() + 60000);
      rateLimitError.remainingRequests = 0;
      rateLimitError.retryAfter = retryAfter ? parseInt(retryAfter) : 60;
      
      throw rateLimitError;
    }

    throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
  }

  /**
   * Check if token is expired
   */
  protected isTokenExpired(token: AuthToken): boolean {
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
    return token.expiresAt.getTime() <= Date.now() + bufferTime;
  }

  /**
   * Calculate exponential backoff delay
   */
  protected calculateBackoffDelay(baseDelay: number): number {
    const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
    return Math.min(baseDelay * 1000 + jitter, 60000); // Max 60 seconds
  }

  /**
   * Sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update average processing time metric
   */
  private updateProcessingTime(newTime: number): void {
    const totalEvents = this.metrics.eventsProcessed + 1;
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime * this.metrics.eventsProcessed + newTime) / totalEvents;
  }

  /**
   * Generate unique event ID
   */
  protected generateEventId(platformId: string): string {
    return `${this.platform}_${platformId}_${Date.now()}`;
  }

  /**
   * Parse platform-specific timestamp
   */
  protected parseTimestamp(timestamp: string | number): string {
    if (typeof timestamp === 'number') {
      return new Date(timestamp * 1000).toISOString();
    }
    return new Date(timestamp).toISOString();
  }

  /**
   * Determine event type from platform data
   */
  protected determineEventType(data: any): EventType {
    // Default implementation - should be overridden by platform adapters
    if (data.type) {
      switch (data.type.toLowerCase()) {
        case 'post':
        case 'video':
        case 'photo':
          return EventType.POST;
        case 'comment':
          return EventType.COMMENT;
        case 'mention':
          return EventType.MENTION;
        case 'message':
          return EventType.MESSAGE;
        case 'share':
        case 'repost':
          return EventType.SHARE;
        case 'like':
        case 'reaction':
          return EventType.REACTION;
        default:
          return EventType.POST;
      }
    }
    return EventType.POST;
  }

  /**
   * Extract hashtags from text
   */
  protected extractHashtags(text: string): string[] {
    const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
    return text.match(hashtagRegex) || [];
  }

  /**
   * Extract mentions from text
   */
  protected extractMentions(text: string): string[] {
    const mentionRegex = /@[\w\u0590-\u05ff]+/g;
    return text.match(mentionRegex) || [];
  }

  /**
   * Clean and normalize text content
   */
  protected normalizeText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 5000); // Limit length
  }
}