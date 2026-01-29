/**
 * Publishing Management Service Unit Tests
 */

import { PublishingManagementService } from '../PublishingManagementService';
import { BrandContextService } from '../../brand/BrandContextService';
import { 
  ScheduledContent,
  PublishingStatus,
  SchedulingStatus,
  PublishingPriority
} from '../types';
import { Platform, ContentType } from '../../types/core';

// Mock dependencies
const mockBrandContextService = {
  loadBrandContext: jest.fn()
};

const mockPublishingRepository = {
  updateScheduleStatus: jest.fn(),
  getScheduleById: jest.fn(),
  getSchedulesDueForPublishing: jest.fn(),
  getSchedulesDueForNotification: jest.fn()
};

const mockPlatformPublisher = {
  publishContent: jest.fn(),
  validateContent: jest.fn()
};

const mockNotificationService = {
  sendNotification: jest.fn(),
  scheduleNotification: jest.fn(),
  cancelNotification: jest.fn()
};

const mockMetricsCollector = {
  collectInitialMetrics: jest.fn()
};

describe('PublishingManagementService', () => {
  let service: PublishingManagementService;
  let mockSchedule: ScheduledContent;

  beforeEach(() => {
    jest.clearAllMocks();
    
    service = new PublishingManagementService(
      mockBrandContextService as BrandContextService,
      mockPublishingRepository,
      mockPlatformPublisher,
      mockNotificationService,
      mockMetricsCollector
    );

    mockSchedule = {
      id: 'schedule-123',
      brandId: 'brand-456',
      contentId: 'content-789',
      title: 'Test Content',
      description: 'Test description',
      content: {
        text: 'Test post content',
        hashtags: ['#test', '#content'],
        mediaUrls: ['https://example.com/image.jpg']
      },
      platforms: [Platform.INSTAGRAM, Platform.TIKTOK],
      contentType: ContentType.IMAGE,
      scheduledTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      timezone: 'UTC',
      status: SchedulingStatus.SCHEDULED,
      priority: PublishingPriority.MEDIUM,
      tags: ['campaign1'],
      createdBy: 'user-123',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 3,
      notificationsSent: []
    };

    // Setup default mocks
    mockBrandContextService.loadBrandContext.mockResolvedValue({
      brandId: 'brand-456',
      playbook: {} as any,
      personas: [],
      assets: []
    });
  });

  describe('schedulePrePublishNotifications', () => {
    it('should schedule pre-publish notifications successfully', async () => {
      mockNotificationService.scheduleNotification.mockResolvedValue('notification-123');

      await service.schedulePrePublishNotifications(mockSchedule, 30);

      expect(mockNotificationService.scheduleNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduleId: 'schedule-123',
          type: 'pre_publish',
          title: 'Content Publishing Soon: Test Content'
        })
      );
    });

    it('should not schedule notification if time is in the past', async () => {
      const pastSchedule = {
        ...mockSchedule,
        scheduledTime: new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1 hour ago
      };

      await service.schedulePrePublishNotifications(pastSchedule, 30);

      expect(mockNotificationService.scheduleNotification).not.toHaveBeenCalled();
    });

    it('should handle notification scheduling errors', async () => {
      mockNotificationService.scheduleNotification.mockRejectedValue(new Error('Notification failed'));

      await expect(service.schedulePrePublishNotifications(mockSchedule, 30))
        .rejects.toThrow('Failed to schedule notification');
    });
  });

  describe('publishScheduledContent', () => {
    beforeEach(() => {
      mockPlatformPublisher.validateContent.mockResolvedValue({
        valid: true,
        issues: []
      });
      mockPlatformPublisher.publishContent.mockResolvedValue({
        success: true,
        platformPostId: 'post-123'
      });
      mockMetricsCollector.collectInitialMetrics.mockResolvedValue({
        likes: 0,
        shares: 0,
        comments: 0,
        views: 0
      });
      mockNotificationService.sendNotification.mockResolvedValue({
        success: true
      });
    });

    it('should publish content successfully to all platforms', async () => {
      const statuses = await service.publishScheduledContent(mockSchedule);

      expect(statuses).toHaveLength(2); // Instagram and TikTok
      expect(statuses.every(s => s.status === 'published')).toBe(true);
      expect(mockPublishingRepository.updateScheduleStatus).toHaveBeenCalledWith(
        'schedule-123',
        SchedulingStatus.PUBLISHED
      );
    });

    it('should handle validation failures', async () => {
      mockPlatformPublisher.validateContent.mockResolvedValue({
        valid: false,
        issues: ['Content too long', 'Invalid hashtags']
      });

      const statuses = await service.publishScheduledContent(mockSchedule);

      expect(statuses[0].status).toBe('failed');
      expect(statuses[0].error?.code).toBe('VALIDATION_FAILED');
      expect(statuses[0].error?.message).toContain('Content too long');
    });

    it('should handle publishing failures', async () => {
      mockPlatformPublisher.publishContent.mockResolvedValue({
        success: false,
        error: {
          code: 'API_ERROR',
          message: 'Platform API unavailable'
        }
      });

      const statuses = await service.publishScheduledContent(mockSchedule);

      expect(statuses.every(s => s.status === 'failed')).toBe(true);
      expect(mockPublishingRepository.updateScheduleStatus).toHaveBeenCalledWith(
        'schedule-123',
        SchedulingStatus.FAILED,
        'All platform publishing failed'
      );
    });

    it('should handle partial publishing success', async () => {
      mockPlatformPublisher.publishContent
        .mockResolvedValueOnce({
          success: true,
          platformPostId: 'post-123'
        })
        .mockResolvedValueOnce({
          success: false,
          error: { code: 'API_ERROR', message: 'Failed' }
        });

      const statuses = await service.publishScheduledContent(mockSchedule);

      expect(statuses[0].status).toBe('published');
      expect(statuses[1].status).toBe('failed');
      expect(mockPublishingRepository.updateScheduleStatus).toHaveBeenCalledWith(
        'schedule-123',
        SchedulingStatus.PUBLISHED,
        'Partial publishing success'
      );
    });

    it('should collect initial metrics after successful publishing', async () => {
      await service.publishScheduledContent(mockSchedule);

      expect(mockMetricsCollector.collectInitialMetrics).toHaveBeenCalledWith(
        Platform.INSTAGRAM,
        'post-123'
      );
    });

    it('should send success notifications', async () => {
      await service.publishScheduledContent(mockSchedule);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'published',
          title: 'Content Published Successfully: Test Content'
        })
      );
    });

    it('should send failure notifications', async () => {
      mockPlatformPublisher.publishContent.mockResolvedValue({
        success: false,
        error: { code: 'API_ERROR', message: 'Failed' }
      });

      await service.publishScheduledContent(mockSchedule);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'failed',
          title: 'Content Publishing Failed: Test Content'
        })
      );
    });
  });

  describe('editScheduledContent', () => {
    beforeEach(() => {
      mockPublishingRepository.getScheduleById.mockResolvedValue(mockSchedule);
    });

    it('should allow editing scheduled content', async () => {
      const updates = {
        title: 'Updated Title',
        content: { text: 'Updated content' }
      };

      const result = await service.editScheduledContent('schedule-123', updates, 'user-456');

      expect(result.title).toBe('Updated Title');
      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Scheduled Content Edited: Updated Title'
        })
      );
    });

    it('should prevent editing content less than 5 minutes before publishing', async () => {
      const nearFutureSchedule = {
        ...mockSchedule,
        scheduledTime: new Date(Date.now() + 4 * 60 * 1000).toISOString() // 4 minutes from now
      };
      mockPublishingRepository.getScheduleById.mockResolvedValue(nearFutureSchedule);

      await expect(service.editScheduledContent('schedule-123', { title: 'New Title' }, 'user-456'))
        .rejects.toThrow('Cannot edit content less than 5 minutes before publishing');
    });

    it('should prevent editing content that is currently publishing', async () => {
      const publishingSchedule = {
        ...mockSchedule,
        status: SchedulingStatus.PUBLISHING
      };
      mockPublishingRepository.getScheduleById.mockResolvedValue(publishingSchedule);

      await expect(service.editScheduledContent('schedule-123', { title: 'New Title' }, 'user-456'))
        .rejects.toThrow('Cannot edit content that is currently being published');
    });

    it('should prevent editing already published content', async () => {
      const publishedSchedule = {
        ...mockSchedule,
        status: SchedulingStatus.PUBLISHED
      };
      mockPublishingRepository.getScheduleById.mockResolvedValue(publishedSchedule);

      await expect(service.editScheduledContent('schedule-123', { title: 'New Title' }, 'user-456'))
        .rejects.toThrow('Cannot edit content that has already been published');
    });

    it('should handle non-existent schedule', async () => {
      mockPublishingRepository.getScheduleById.mockResolvedValue(null);

      await expect(service.editScheduledContent('nonexistent', { title: 'New Title' }, 'user-456'))
        .rejects.toThrow('Schedule not found: nonexistent');
    });
  });

  describe('cancelScheduledContent', () => {
    beforeEach(() => {
      mockPublishingRepository.getScheduleById.mockResolvedValue(mockSchedule);
    });

    it('should cancel scheduled content successfully', async () => {
      await service.cancelScheduledContent('schedule-123', 'User requested cancellation', 'user-456');

      expect(mockPublishingRepository.updateScheduleStatus).toHaveBeenCalledWith(
        'schedule-123',
        SchedulingStatus.CANCELLED,
        'User requested cancellation'
      );
      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'cancelled',
          title: 'Scheduled Content Cancelled: Test Content'
        })
      );
    });

    it('should prevent cancelling content that is currently publishing', async () => {
      const publishingSchedule = {
        ...mockSchedule,
        status: SchedulingStatus.PUBLISHING
      };
      mockPublishingRepository.getScheduleById.mockResolvedValue(publishingSchedule);

      await expect(service.cancelScheduledContent('schedule-123', 'Cancel', 'user-456'))
        .rejects.toThrow('Cannot cancel content that is currently being published');
    });

    it('should prevent cancelling already published content', async () => {
      const publishedSchedule = {
        ...mockSchedule,
        status: SchedulingStatus.PUBLISHED
      };
      mockPublishingRepository.getScheduleById.mockResolvedValue(publishedSchedule);

      await expect(service.cancelScheduledContent('schedule-123', 'Cancel', 'user-456'))
        .rejects.toThrow('Cannot cancel content that has already been published');
    });
  });

  describe('processPublishingQueue', () => {
    it('should process schedules due for publishing', async () => {
      const dueSchedules = [mockSchedule];
      mockPublishingRepository.getSchedulesDueForPublishing.mockResolvedValue(dueSchedules);
      mockPlatformPublisher.validateContent.mockResolvedValue({ valid: true, issues: [] });
      mockPlatformPublisher.publishContent.mockResolvedValue({ success: true, platformPostId: 'post-123' });
      mockNotificationService.sendNotification.mockResolvedValue({ success: true });

      await service.processPublishingQueue();

      expect(mockPublishingRepository.getSchedulesDueForPublishing).toHaveBeenCalled();
      expect(mockPlatformPublisher.publishContent).toHaveBeenCalledTimes(2); // 2 platforms
    });

    it('should handle publishing failures with retry logic', async () => {
      const failingSchedule = {
        ...mockSchedule,
        retryCount: 0,
        maxRetries: 3
      };
      mockPublishingRepository.getSchedulesDueForPublishing.mockResolvedValue([failingSchedule]);
      mockPlatformPublisher.validateContent.mockResolvedValue({ valid: true, issues: [] });
      mockPlatformPublisher.publishContent.mockRejectedValue(new Error('Publishing failed'));

      await service.processPublishingQueue();

      // Should not mark as failed on first retry
      expect(mockPublishingRepository.updateScheduleStatus).not.toHaveBeenCalledWith(
        'schedule-123',
        SchedulingStatus.FAILED,
        expect.any(String)
      );
    });

    it('should mark as failed after max retries exceeded', async () => {
      const maxRetriedSchedule = {
        ...mockSchedule,
        retryCount: 3,
        maxRetries: 3
      };
      mockPublishingRepository.getSchedulesDueForPublishing.mockResolvedValue([maxRetriedSchedule]);
      mockPlatformPublisher.validateContent.mockResolvedValue({ valid: true, issues: [] });
      mockPlatformPublisher.publishContent.mockRejectedValue(new Error('Publishing failed'));

      await service.processPublishingQueue();

      expect(mockPublishingRepository.updateScheduleStatus).toHaveBeenCalledWith(
        'schedule-123',
        SchedulingStatus.FAILED,
        'Max retries (3) exceeded'
      );
    });
  });

  describe('getPublishingStatus', () => {
    it('should return publishing status for a schedule', async () => {
      mockPublishingRepository.getScheduleById.mockResolvedValue(mockSchedule);

      const statuses = await service.getPublishingStatus('schedule-123');

      expect(statuses).toHaveLength(2); // 2 platforms
      expect(statuses[0].scheduleId).toBe('schedule-123');
      expect(statuses[0].platform).toBe(Platform.INSTAGRAM);
      expect(statuses[1].platform).toBe(Platform.TIKTOK);
    });

    it('should handle non-existent schedule', async () => {
      mockPublishingRepository.getScheduleById.mockResolvedValue(null);

      await expect(service.getPublishingStatus('nonexistent'))
        .rejects.toThrow('Schedule not found: nonexistent');
    });
  });
});