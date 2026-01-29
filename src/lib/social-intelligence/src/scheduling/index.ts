/**
 * Scheduling Module Exports
 * Provides content scheduling and publishing management functionality
 */

// Core services
export { ContentSchedulingEngine } from './ContentSchedulingEngine';
export { PublishingManagementService } from './PublishingManagementService';
export { SchedulingService } from './SchedulingService';

// Types and schemas
export * from './types';

// Interfaces for dependency injection
export type {
  SchedulingRepository,
  OptimalTimingService,
  PlatformLimitsService
} from './ContentSchedulingEngine';

export type {
  PublishingRepository,
  PlatformPublisher,
  NotificationService,
  PublishingMetricsCollector
} from './PublishingManagementService';