/**
 * Publishing Management Service
 * Handles publishing notifications, status tracking, failure notifications, and last-minute edits
 */

import { 
  ScheduledContent,
  PublishingStatus,
  PublishingNotification,
  SchedulingStatus,
  PublishingStatusSchema
} from './types';
import { Platform } from '../types/core';
import { BrandContextService } from '../brand/BrandContextService';

export interface PublishingRepository {
  updateScheduleStatus(scheduleId: string, status: SchedulingStatus, error?: string): Promise<void>;
  getScheduleById(scheduleId: string): Promise<ScheduledContent | null>;
  getSchedulesDueForPublishing(beforeTime: Date): Promise<ScheduledContent[]>;
  getSchedulesDueForNotification(beforeTime: Date): Promise<ScheduledContent[]>;
}

export interface PlatformPublisher {
  publishContent(
    platform: Platform, 
    content: ScheduledContent
  ): Promise<{
    success: boolean;
    platformPostId?: string;
    error?: { code: string; message: string; details?: any };
  }>;
  
  validateContent(platform: Platform, content: ScheduledContent): Promise<{
    valid: boolean;
    issues: string[];
  }>;
}

export interface NotificationService {
  sendNotification(notification: PublishingNotification): Promise<{
    success: boolean;
    error?: string;
  }>;
  
  scheduleNotification(notification: PublishingNotification): Promise<string>; // Returns notification ID
  cancelNotification(notificationId: string): Promise<void>;
}

export interface PublishingMetricsCollector {
  collectInitialMetrics(
    platform: Platform, 
    platformPostId: string
  ): Promise<{
    likes?: number;
    shares?: number;
    comments?: number;
    views?: number;
    reach?: number;
  }>;
}

export class PublishingManagementService {
  private publishingJobs = new Map<string, NodeJS.Timeout>();
  private notificationJobs = new Map<string, NodeJS.Timeout>();

  constructor(
    private brandContextService: BrandContextService,
    private publishingRepository: PublishingRepository,
    private platformPublisher: PlatformPublisher,
    private notificationService: NotificationService,
    private metricsCollector: PublishingMetricsCollector
  ) {}

  /**
   * Send notifications before scheduled posts go live
   * Requirement 10.5: Send notifications before scheduled posts go live
   */
  async schedulePrePublishNotifications(schedule: ScheduledContent, prePublishMinutes = 30): Promise<void> {
    try {
      const scheduledTime = new Date(schedule.scheduledTime);
      const notificationTime = new Date(scheduledTime.getTime() - prePublishMinutes * 60 * 1000);
      
      // Don't schedule if notification time is in the past
      if (notificationTime <= new Date()) {
        console.warn(`Pre-publish notification time is in the past for schedule ${schedule.id}`);
        return;
      }

      const notification: PublishingNotification = {
        id: this.generateNotificationId(),
        scheduleId: schedule.id,
        type: 'pre_publish',
        title: `Content Publishing Soon: ${schedule.title}`,
        message: `Content "${schedule.title}" is scheduled to publish in ${prePublishMinutes} minutes on ${schedule.platforms.join(', ')}.`,
        recipients: await this.getNotificationRecipients(schedule.brandId),
        channels: ['email'],
        scheduledFor: notificationTime.toISOString(),
        status: 'pending'
      };

      // Schedule the notification
      await this.notificationService.scheduleNotification(notification);
      
      // Set up local timeout as backup
      const timeoutId = setTimeout(async () => {
        await this.sendPrePublishNotification(schedule);
        this.notificationJobs.delete(schedule.id);
      }, notificationTime.getTime() - Date.now());

      this.notificationJobs.set(schedule.id, timeoutId);

      console.log(`Pre-publish notification scheduled for ${schedule.id} at ${notificationTime.toISOString()}`);
    } catch (error) {
      console.error('Error scheduling pre-publish notification:', error);
      throw new Error(`Failed to schedule notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Track publishing status and provide failure notifications
   * Requirement 10.6: Track publishing status and provide failure notifications
   */
  async publishScheduledContent(schedule: ScheduledContent): Promise<PublishingStatus[]> {
    try {
      const publishingStatuses: PublishingStatus[] = [];

      // Update schedule status to publishing
      await this.publishingRepository.updateScheduleStatus(schedule.id, SchedulingStatus.PUBLISHING);

      // Publish to each platform
      for (const platform of schedule.platforms) {
        const status: PublishingStatus = {
          scheduleId: schedule.id,
          platform,
          status: 'publishing',
          lastUpdated: new Date().toISOString()
        };

        try {
          // Validate content for platform
          const validation = await this.platformPublisher.validateContent(platform, schedule);
          if (!validation.valid) {
            status.status = 'failed';
            status.error = {
              code: 'VALIDATION_FAILED',
              message: `Content validation failed: ${validation.issues.join(', ')}`,
              details: validation.issues
            };
            publishingStatuses.push(PublishingStatusSchema.parse(status));
            continue;
          }

          // Attempt to publish
          const publishResult = await this.platformPublisher.publishContent(platform, schedule);
          
          if (publishResult.success) {
            status.status = 'published';
            status.publishedAt = new Date().toISOString();
            status.platformPostId = publishResult.platformPostId;

            // Collect initial metrics
            if (publishResult.platformPostId) {
              try {
                const metrics = await this.metricsCollector.collectInitialMetrics(
                  platform, 
                  publishResult.platformPostId
                );
                status.metrics = metrics;
              } catch (metricsError) {
                console.warn(`Failed to collect initial metrics for ${platform}:`, metricsError);
              }
            }

            // Send success notification
            await this.sendPublishingSuccessNotification(schedule, platform, publishResult.platformPostId);
          } else {
            status.status = 'failed';
            status.error = publishResult.error;

            // Send failure notification
            await this.sendPublishingFailureNotification(schedule, platform, publishResult.error);
          }
        } catch (error) {
          status.status = 'failed';
          status.error = {
            code: 'PUBLISHING_ERROR',
            message: error instanceof Error ? error.message : 'Unknown publishing error',
            details: error
          };

          // Send failure notification
          await this.sendPublishingFailureNotification(schedule, platform, status.error);
        }

        publishingStatuses.push(PublishingStatusSchema.parse(status));
      }

      // Update overall schedule status
      const allSuccessful = publishingStatuses.every(s => s.status === 'published');
      const anySuccessful = publishingStatuses.some(s => s.status === 'published');
      
      if (allSuccessful) {
        await this.publishingRepository.updateScheduleStatus(schedule.id, SchedulingStatus.PUBLISHED);
      } else if (anySuccessful) {
        await this.publishingRepository.updateScheduleStatus(
          schedule.id, 
          SchedulingStatus.PUBLISHED, 
          'Partial publishing success'
        );
      } else {
        await this.publishingRepository.updateScheduleStatus(
          schedule.id, 
          SchedulingStatus.FAILED, 
          'All platform publishing failed'
        );
      }

      return publishingStatuses;
    } catch (error) {
      console.error('Error publishing scheduled content:', error);
      
      // Update status to failed
      await this.publishingRepository.updateScheduleStatus(
        schedule.id, 
        SchedulingStatus.FAILED, 
        error instanceof Error ? error.message : 'Unknown error'
      );

      throw new Error(`Failed to publish content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Allow last-minute edits and cancellations of scheduled content
   * Requirement 10.7: Allow last-minute edits and cancellations of scheduled content
   */
  async editScheduledContent(
    scheduleId: string, 
    updates: Partial<ScheduledContent>,
    userId: string
  ): Promise<ScheduledContent> {
    try {
      const schedule = await this.publishingRepository.getScheduleById(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule not found: ${scheduleId}`);
      }

      // Check if editing is still allowed
      const scheduledTime = new Date(schedule.scheduledTime);
      const now = new Date();
      const minutesUntilPublish = (scheduledTime.getTime() - now.getTime()) / (1000 * 60);

      if (minutesUntilPublish < 5) {
        throw new Error('Cannot edit content less than 5 minutes before publishing');
      }

      if (schedule.status === SchedulingStatus.PUBLISHING) {
        throw new Error('Cannot edit content that is currently being published');
      }

      if (schedule.status === SchedulingStatus.PUBLISHED) {
        throw new Error('Cannot edit content that has already been published');
      }

      // Apply updates
      const updatedSchedule: ScheduledContent = {
        ...schedule,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // If time is being changed, reschedule notifications and publishing
      if (updates.scheduledTime && updates.scheduledTime !== schedule.scheduledTime) {
        await this.rescheduleJobs(scheduleId, new Date(updates.scheduledTime));
      }

      // Send edit notification
      await this.sendEditNotification(schedule, updates, userId);

      return updatedSchedule;
    } catch (error) {
      console.error('Error editing scheduled content:', error);
      throw new Error(`Failed to edit scheduled content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel scheduled content
   */
  async cancelScheduledContent(scheduleId: string, reason: string, userId: string): Promise<void> {
    try {
      const schedule = await this.publishingRepository.getScheduleById(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule not found: ${scheduleId}`);
      }

      if (schedule.status === SchedulingStatus.PUBLISHING) {
        throw new Error('Cannot cancel content that is currently being published');
      }

      if (schedule.status === SchedulingStatus.PUBLISHED) {
        throw new Error('Cannot cancel content that has already been published');
      }

      // Cancel scheduled jobs
      await this.cancelScheduledJobs(scheduleId);

      // Update status
      await this.publishingRepository.updateScheduleStatus(
        scheduleId, 
        SchedulingStatus.CANCELLED, 
        reason
      );

      // Send cancellation notification
      await this.sendCancellationNotification(schedule, reason, userId);

      console.log(`Cancelled scheduled content ${scheduleId}: ${reason}`);
    } catch (error) {
      console.error('Error cancelling scheduled content:', error);
      throw new Error(`Failed to cancel scheduled content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process publishing queue - check for content due to be published
   */
  async processPublishingQueue(): Promise<void> {
    try {
      const now = new Date();
      const schedulesDue = await this.publishingRepository.getSchedulesDueForPublishing(now);

      console.log(`Processing ${schedulesDue.length} schedules due for publishing`);

      for (const schedule of schedulesDue) {
        try {
          await this.publishScheduledContent(schedule);
        } catch (error) {
          console.error(`Failed to publish schedule ${schedule.id}:`, error);
          
          // Increment retry count and reschedule if under limit
          if (schedule.retryCount < schedule.maxRetries) {
            const retryDelay = Math.pow(2, schedule.retryCount) * 5; // Exponential backoff: 5, 10, 20 minutes
            const retryTime = new Date(now.getTime() + retryDelay * 60 * 1000);
            
            // Update retry count and reschedule
            const updatedSchedule = {
              ...schedule,
              retryCount: schedule.retryCount + 1,
              scheduledTime: retryTime.toISOString(),
              updatedAt: new Date().toISOString()
            };

            console.log(`Rescheduling failed publish for ${schedule.id} to ${retryTime.toISOString()} (attempt ${updatedSchedule.retryCount})`);
          } else {
            // Max retries reached, mark as failed
            await this.publishingRepository.updateScheduleStatus(
              schedule.id, 
              SchedulingStatus.FAILED, 
              `Max retries (${schedule.maxRetries}) exceeded`
            );
          }
        }
      }
    } catch (error) {
      console.error('Error processing publishing queue:', error);
    }
  }

  /**
   * Process notification queue - check for notifications due to be sent
   */
  async processNotificationQueue(): Promise<void> {
    try {
      const now = new Date();
      const schedulesDue = await this.publishingRepository.getSchedulesDueForNotification(now);

      for (const schedule of schedulesDue) {
        try {
          await this.sendPrePublishNotification(schedule);
        } catch (error) {
          console.error(`Failed to send notification for schedule ${schedule.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error processing notification queue:', error);
    }
  }

  /**
   * Get publishing status for a schedule
   */
  async getPublishingStatus(scheduleId: string): Promise<PublishingStatus[]> {
    try {
      const schedule = await this.publishingRepository.getScheduleById(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule not found: ${scheduleId}`);
      }

      // In a real implementation, this would fetch from a publishing status store
      // For now, we'll return a basic status based on the schedule
      const statuses: PublishingStatus[] = schedule.platforms.map(platform => ({
        scheduleId,
        platform,
        status: this.mapSchedulingStatusToPublishingStatus(schedule.status),
        publishedAt: schedule.publishedAt,
        lastUpdated: schedule.updatedAt
      }));

      return statuses.map(status => PublishingStatusSchema.parse(status));
    } catch (error) {
      console.error('Error getting publishing status:', error);
      throw new Error(`Failed to get publishing status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Private helper methods
   */
  private generateNotificationId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private async getNotificationRecipients(brandId: string): Promise<string[]> {
    try {
      const brandContext = await this.brandContextService.loadBrandContext(brandId);
      // In a real implementation, this would get recipients from brand configuration
      return ['social@brand.com']; // Default recipient
    } catch (error) {
      console.warn('Failed to get notification recipients:', error);
      return ['social@brand.com'];
    }
  }

  private async sendPrePublishNotification(schedule: ScheduledContent): Promise<void> {
    try {
      const notification: PublishingNotification = {
        id: this.generateNotificationId(),
        scheduleId: schedule.id,
        type: 'pre_publish',
        title: `Content Publishing Soon: ${schedule.title}`,
        message: `Content "${schedule.title}" is scheduled to publish in 30 minutes on ${schedule.platforms.join(', ')}.`,
        recipients: await this.getNotificationRecipients(schedule.brandId),
        channels: ['email'],
        sentAt: new Date().toISOString(),
        status: 'sent'
      };

      await this.notificationService.sendNotification(notification);
      console.log(`Sent pre-publish notification for ${schedule.id}`);
    } catch (error) {
      console.error('Error sending pre-publish notification:', error);
    }
  }

  private async sendPublishingSuccessNotification(
    schedule: ScheduledContent, 
    platform: Platform, 
    platformPostId?: string
  ): Promise<void> {
    try {
      const notification: PublishingNotification = {
        id: this.generateNotificationId(),
        scheduleId: schedule.id,
        type: 'published',
        title: `Content Published Successfully: ${schedule.title}`,
        message: `Content "${schedule.title}" has been successfully published on ${platform}.${platformPostId ? ` Post ID: ${platformPostId}` : ''}`,
        recipients: await this.getNotificationRecipients(schedule.brandId),
        channels: ['email'],
        sentAt: new Date().toISOString(),
        status: 'sent',
        metadata: { platform, platformPostId }
      };

      await this.notificationService.sendNotification(notification);
    } catch (error) {
      console.error('Error sending success notification:', error);
    }
  }

  private async sendPublishingFailureNotification(
    schedule: ScheduledContent, 
    platform: Platform, 
    error?: { code: string; message: string; details?: any }
  ): Promise<void> {
    try {
      const notification: PublishingNotification = {
        id: this.generateNotificationId(),
        scheduleId: schedule.id,
        type: 'failed',
        title: `Content Publishing Failed: ${schedule.title}`,
        message: `Failed to publish "${schedule.title}" on ${platform}. Error: ${error?.message || 'Unknown error'}`,
        recipients: await this.getNotificationRecipients(schedule.brandId),
        channels: ['email'],
        sentAt: new Date().toISOString(),
        status: 'sent',
        metadata: { platform, error }
      };

      await this.notificationService.sendNotification(notification);
    } catch (error) {
      console.error('Error sending failure notification:', error);
    }
  }

  private async sendEditNotification(
    schedule: ScheduledContent, 
    updates: Partial<ScheduledContent>, 
    userId: string
  ): Promise<void> {
    try {
      const changedFields = Object.keys(updates).filter(key => key !== 'updatedAt');
      
      const notification: PublishingNotification = {
        id: this.generateNotificationId(),
        scheduleId: schedule.id,
        type: 'pre_publish', // Using pre_publish type for edits
        title: `Scheduled Content Edited: ${schedule.title}`,
        message: `Scheduled content "${schedule.title}" has been edited by ${userId}. Changed fields: ${changedFields.join(', ')}`,
        recipients: await this.getNotificationRecipients(schedule.brandId),
        channels: ['email'],
        sentAt: new Date().toISOString(),
        status: 'sent',
        metadata: { editedBy: userId, changedFields }
      };

      await this.notificationService.sendNotification(notification);
    } catch (error) {
      console.error('Error sending edit notification:', error);
    }
  }

  private async sendCancellationNotification(
    schedule: ScheduledContent, 
    reason: string, 
    userId: string
  ): Promise<void> {
    try {
      const notification: PublishingNotification = {
        id: this.generateNotificationId(),
        scheduleId: schedule.id,
        type: 'cancelled',
        title: `Scheduled Content Cancelled: ${schedule.title}`,
        message: `Scheduled content "${schedule.title}" has been cancelled by ${userId}. Reason: ${reason}`,
        recipients: await this.getNotificationRecipients(schedule.brandId),
        channels: ['email'],
        sentAt: new Date().toISOString(),
        status: 'sent',
        metadata: { cancelledBy: userId, reason }
      };

      await this.notificationService.sendNotification(notification);
    } catch (error) {
      console.error('Error sending cancellation notification:', error);
    }
  }

  private async rescheduleJobs(scheduleId: string, newTime: Date): Promise<void> {
    // Cancel existing jobs
    await this.cancelScheduledJobs(scheduleId);

    // Schedule new jobs would be implemented here
    console.log(`Rescheduled jobs for ${scheduleId} to ${newTime.toISOString()}`);
  }

  private async cancelScheduledJobs(scheduleId: string): Promise<void> {
    // Cancel notification job
    const notificationJob = this.notificationJobs.get(scheduleId);
    if (notificationJob) {
      clearTimeout(notificationJob);
      this.notificationJobs.delete(scheduleId);
    }

    // Cancel publishing job
    const publishingJob = this.publishingJobs.get(scheduleId);
    if (publishingJob) {
      clearTimeout(publishingJob);
      this.publishingJobs.delete(scheduleId);
    }

    console.log(`Cancelled scheduled jobs for ${scheduleId}`);
  }

  private mapSchedulingStatusToPublishingStatus(
    status: SchedulingStatus
  ): 'pending' | 'publishing' | 'published' | 'failed' | 'cancelled' {
    switch (status) {
      case SchedulingStatus.SCHEDULED:
        return 'pending';
      case SchedulingStatus.PUBLISHING:
        return 'publishing';
      case SchedulingStatus.PUBLISHED:
        return 'published';
      case SchedulingStatus.FAILED:
        return 'failed';
      case SchedulingStatus.CANCELLED:
        return 'cancelled';
      default:
        return 'pending';
    }
  }
}