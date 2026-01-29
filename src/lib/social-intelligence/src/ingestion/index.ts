/**
 * Ingestion Layer Exports
 */

// Core ingestion service
export { IngestionService } from './IngestionService';
export type { IngestionConfig, IngestionResult, IngestionSummary } from './IngestionService';

// Base adapter
export { BaseAdapter } from './BaseAdapter';

// Platform adapters
export { TikTokAdapter } from './adapters/TikTokAdapter';
export { MetaAdapter } from './adapters/MetaAdapter';
export { YouTubeAdapter } from './adapters/YouTubeAdapter';
export { RedditAdapter } from './adapters/RedditAdapter';
export { RSSAdapter } from './adapters/RSSAdapter';

// Types
export type {
  PlatformAdapter,
  RawPlatformData,
  FetchParams,
  FetchResult,
  WebhookCallback,
  RateLimitError,
  AdapterConfig,
  IngestionMetrics
} from './types';