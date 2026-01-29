/**
 * Scheduling Service Orchestrator
 * Coordinates content scheduling and publishing management
 */

import { ContentSchedulingEngine } from './ContentSchedulingEngine';
import { PublishingManagementService } from './PublishingManagementService';
import { 
  ScheduledContent,
  SchedulingRequest,
  BulkSchedulingRequest,
  SchedulingConflict,
  CalendarView,
  PublishingStatus,
  SchedulingFilters
} from './types';
import { Platform, ContentType } from '../types/core';

export class SchedulingService {
  constructor(
    private schedulingEngine: ContentSchedulingEngine,
    private publishingManager: PublishingManagementService
  ) {}

  // Content Scheduling Operations
  async getCalendarView(
    brandId: string,
    viewType: 'day' | 'week' | 'month' | 'year',
    startDate: Date,
    timezone = 'UTC'
  ): Promise<CalendarView> {
    return this.schedulingEngine.getCalendarView(brandId, viewType, startDate, timezone);
  }

  async scheduleContent(request: SchedulingRequest): Promise<ScheduledContent> {
    const scheduledContent = await this.schedulingEngine.scheduleContent(request);
    
    // Schedule pre-publish notifications if configured
    if (request.notificationSettings) {
      await this.publishingManager.schedulePrePublishNotifications(
        scheduledContent,
        request.notificationSettings.prePublishMinutes
      );
    }

    return scheduledContent;
  }

  async bulkScheduleContent(request: BulkSchedulingRequest): Promise<{
    scheduled: ScheduledContent[];
    conflicts: Array<{ scheduleIndex: number; conflicts: SchedulingConflict[] }>;
    failed: Array<{ scheduleIndex: number; error: string }>;
  }> {
    return this.schedulingEngine.bulkScheduleContent(request);
  }

  async checkSchedulingConflicts(schedule: ScheduledContent): Promise<SchedulingConflict[]> {
    return this.schedulingEngine.checkSchedulingConflicts(schedule);
  }

  async suggestOptimalTimes(
    brandId: string,
    platforms: Platform[],
    contentType: ContentType,
    timeRange: { start: Date; end: Date },
    count = 5
  ) {
    return this.schedulingEngine.suggestOptimalTimes(brandId, platforms, contentType, timeRange, count);
  }

  async updateScheduledContent(
    scheduleId: string,
    updates: Partial<ScheduledContent>
  ): Promise<ScheduledContent> {
    return this.schedulingEngine.updateScheduledContent(scheduleId, updates);
  }

  async cancelScheduledContent(scheduleId: string, reason?: string): Promise<void> {
    return this.schedulingEngine.cancelScheduledContent(scheduleId, reason);
  }

  async getScheduledContent(filters: SchedulingFilters): Promise<ScheduledContent[]> {
    return this.schedulingEngine.getScheduledContent(filters);
  }

  // Publishing Management Operations
  async publishScheduledContent(schedule: ScheduledContent): Promise<PublishingStatus[]> {
    return this.publishingManager.publishScheduledContent(schedule);
  }

  async editScheduledContent(
    scheduleId: string,
    updates: Partial<ScheduledContent>,
    userId: string
  ): Promise<ScheduledContent> {
    return this.publishingManager.editScheduledContent(scheduleId, updates, userId);
  }

  async cancelScheduledContentWithNotification(
    scheduleId: string,
    reason: string,
    userId: string
  ): Promise<void> {
    return this.publishingManager.cancelScheduledContent(scheduleId, reason, userId);
  }

  async getPublishingStatus(scheduleId: string): Promise<PublishingStatus[]> {
    return this.publishingManager.getPublishingStatus(scheduleId);
  }

  // Queue Processing
  async processPublishingQueue(): Promise<void> {
    return this.publishingManager.processPublishingQueue();
  }

  async processNotificationQueue(): Promise<void> {
    return this.publishingManager.processNotificationQueue();
  }

  // Utility Methods
  async schedulePrePublishNotifications(
    schedule: ScheduledContent,
    prePublishMinutes = 30
  ): Promise<void> {
    return this.publishingManager.schedulePrePublishNotifications(schedule, prePublishMinutes);
  }
}