/**
 * Analytics Module
 * Exports all analytics and performance tracking services and types
 */

// Core analytics service
export { AnalyticsService } from './AnalyticsService';

// Individual services
export { EngagementMetricsTracker } from './EngagementMetricsTracker';
export { AudienceInsightsService } from './AudienceInsightsService';
export { PerformanceReportGenerator } from './PerformanceReportGenerator';

// Types and schemas
export * from './types';

// Service interfaces for dependency injection
export type {
  PlatformMetricsAPI,
  ContentRepository,
  BenchmarkService
} from './EngagementMetricsTracker';

export type {
  AudienceDataProvider,
  SentimentDataProvider
} from './AudienceInsightsService';

export type {
  BenchmarkProvider,
  HistoricalDataProvider
} from './PerformanceReportGenerator';