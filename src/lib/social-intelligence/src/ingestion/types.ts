/**
 * Types for platform ingestion adapters
 */

import { Platform, SocialEvent } from '../types/core';
import { AuthToken } from '../auth/types';

export interface RawPlatformData {
  id: string;
  platform: Platform;
  timestamp: string;
  type: string;
  data: any;
  metadata?: any;
}

export interface FetchParams {
  since?: Date;
  until?: Date;
  limit?: number;
  cursor?: string;
  keywords?: string[];
  hashtags?: string[];
  mentions?: string[];
}

export interface FetchResult {
  data: RawPlatformData[];
  nextCursor?: string;
  hasMore: boolean;
  rateLimit?: {
    remaining: number;
    resetTime: Date;
  };
}

export interface WebhookCallback {
  (data: RawPlatformData): Promise<void>;
}

export interface PlatformAdapter {
  platform: Platform;
  authenticate(): Promise<AuthToken>;
  refreshToken(token: AuthToken): Promise<AuthToken>;
  fetchData(params: FetchParams): Promise<FetchResult>;
  subscribeToWebhooks?(callback: WebhookCallback): Promise<void>;
  handleRateLimit(error: RateLimitError): Promise<void>;
  normalizeData(rawData: RawPlatformData): Promise<SocialEvent>;
}

export interface RateLimitError extends Error {
  platform: Platform;
  resetTime: Date;
  remainingRequests: number;
  retryAfter: number;
}

export interface AdapterConfig {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  scopes?: string[];
  webhookSecret?: string;
  baseUrl?: string;
  apiVersion?: string;
}

export interface IngestionMetrics {
  platform: Platform;
  eventsProcessed: number;
  errorsEncountered: number;
  lastSuccessfulFetch: Date;
  averageProcessingTime: number;
  rateLimitHits: number;
}