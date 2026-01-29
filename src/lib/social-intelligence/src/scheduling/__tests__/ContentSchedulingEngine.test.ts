/**
 * Content Scheduling Engine Unit Tests
 */

import { ContentSchedulingEngine } from '../ContentSchedulingEngine';
import { BrandContextService } from '../../brand/BrandContextService';
import { 
  ScheduledContent,
  SchedulingRequest,
  BulkSchedulingRequest,
  SchedulingConflict,
  CalendarView,
  SchedulingStatus,
  PublishingPriority,
  ConflictType
} from '../types';
import { Platform, ContentType } from '../../types/core';

// Mock dependencies
const mockBrandContextService = {
  loadBrandContext: jest.fn()
};

const mockSchedulingRepository = {
  createSchedule: jest.fn(),
  updateSchedule: jest.fn(),
  deleteSchedule: jest.fn(),
  getSchedule: jest.fn(),
  getSchedules: jest.fn(),
  getSchedulesByTimeRange: jest.fn(),
  getConflictingSchedules: jest.fn()
};

const mockOptimalTimingService = {
  getOptimalPostingTimes: jest.fn(),
  calculateOptimalDistribution: jest.fn()
};

const mockPlatformLimitsService = {
  getPlatformLimits: jest.fn(),
  checkLimits: jest.fn()
};

describe('ContentSchedulingEngine', () => {
  let engine: ContentSchedulingEngine;
  let mockSchedulingRequest: SchedulingRequest;
  let mockScheduledContent: ScheduledContent;

  beforeEach(() => {
    jest.clearAllMocks();
    
    engine = new ContentSchedulingEngine(
      mockBrandContextService as BrandContextService,
      mockSchedulingRepository,
      mockOptimalTimingService,
      mockPlatformLimitsService
    );

    mockSchedulingRequest = {
      brandId: 'brand-123',
      contentId: 'content-456',
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
      priority: PublishingPriority.MEDIUM,
      tags: ['campaign1'],
      createdBy: 'user-123',
      allowConflicts: false
    };

    mockScheduledContent = {
      id: 'schedule-789',
      brandId: 'brand-123',
      contentId: 'content-456',
      title: 'Test Content',
      description: 'Test description',
      content: {
        text: 'Test post content',
        hashtags: ['#test', '#content'],
        mediaUrls: ['https://example.com/image.jpg']
      },
      platforms: [Platform.INSTAGRAM, Platform.TIKTOK],
      contentType: ContentType.IMAGE,
      scheduledTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
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
      brandId: 'brand-123',
      playbook: {} as any,
      personas: [],
      assets: []
    });

    mockPlatformLimitsService.checkLimits.mockResolvedValue({
      withinLimits: true,
      dailyCount: 2,
      hourlyCount: 1
    });

    mockSchedulingRepository.createSchedule.mockImplementation(async (schedule) => schedule);
  });

  describe('getCalendarView', () => {
    beforeEach(() => {
      mockSchedulingRepository.getSchedulesByTimeRange.mockResolvedValue([mockScheduledContent]);
      mockOptimalTimingService.getOptimalPostingTimes.mockResolvedValue([
        {
          platform: Platform.INSTAGRAM,
          contentType: ContentType.IMAGE,
          dayOfWeek: 1,
          hour: 10,
          timezone: 'UTC',
          score: 0.85,
          audienceActivity: 0.9,
          competitionLevel: 0.2,
          historicalPerformance: 0.8,
          confidence: 0.85
        }
      ]);
      mockPlatformLimitsService.getPlatformLimits.mockResolvedValue({
        dailyLimit: 10,
        hourlyLimit: 2,
        minInterval: 30
      });
    });

    it('should return calendar view for day view', async () => {
      const startDate = new Date();
      const calendarView = await engine.getCalendarView('brand-123', 'day', startDate, 'UTC');

      expect(calendarView.brandId).toBe('brand-123');
      expect(calendarView.viewType).toBe('day');
      expect(calendarView.scheduledContent).toHaveLength(1);
      expect(mockSchedulingRepository.getSchedulesByTimeRange).toHaveBeenCalled();
    });

    it('should return calendar view for week view', async () => {
      const startDate = new Date();
      const calendarView = await engine.getCalendarView('brand-123', 'week', startDate, 'UTC');

      expect(calendarView.viewType).toBe('week');
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
      expect(new Date(calendarView.endDate).getTime()).toBeCloseTo(endDate.getTime(), -3);
    });

    it('should return calendar view for month view', async () => {
      const startDate = new Date();
      const calendarView = await engine.getCalendarView('brand-123', 'month', startDate, 'UTC');

      expect(calendarView.viewType).toBe('month');
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      expect(new Date(calendarView.endDate).getTime()).toBeCloseTo(endDate.getTime(), -3);
    });

    it('should handle brand context not found', async () => {
      mockBrandContextService.loadBrandContext.mockResolvedValue(null);

      await expect(engine.getCalendarView('nonexistent', 'day', new Date()))
        .rejects.toThrow('Brand context not found for brandId: nonexistent');
    });
  });

  describe('scheduleContent', () => {
    it('should schedule content successfully', async () => {
      const scheduledContent = await engine.scheduleContent(mockSchedulingRequest);

      expect(scheduledContent.brandId).toBe('brand-123');
      expect(scheduledContent.title).toBe('Test Content');
      expect(scheduledContent.platforms).toEqual([Platform.INSTAGRAM, Platform.TIKTOK]);
      expect(mockSchedulingRepository.createSchedule).toHaveBeenCalled();
    });

    it('should check platform limits before scheduling', async () => {
      await engine.scheduleContent(mockSchedulingRequest);

      expect(mockPlatformLimitsService.checkLimits).toHaveBeenCalledWith(
        'brand-123',
        Platform.INSTAGRAM,
        expect.any(Date)
      );
      expect(mockPlatformLimitsService.checkLimits).toHaveBeenCalledWith(
        'brand-123',
        Platform.TIKTOK,
        expect.any(Date)
      );
    });

    it('should reject scheduling when platform limits exceeded', async () => {
      mockPlatformLimitsService.checkLimits.mockResolvedValue({
        withinLimits: false,
        dailyCount: 10,
        hourlyCount: 5,
        nextAvailableTime: new Date(Date.now() + 2 * 60 * 60 * 1000)
      });

      await expect(engine.scheduleContent(mockSchedulingRequest))
        .rejects.toThrow('Platform limits exceeded');
    });

    it('should check for conflicts when allowConflicts is false', async () => {
      const conflictingSchedule = {
        ...mockScheduledContent,
        id: 'conflicting-schedule',
        scheduledTime: mockSchedulingRequest.scheduledTime // Same time
      };
      mockSchedulingRepository.getConflictingSchedules.mockResolvedValue([conflictingSchedule]);

      await expect(engine.scheduleContent(mockSchedulingRequest))
        .rejects.toThrow('Scheduling conflicts detected');
    });

    it('should allow scheduling with conflicts when allowConflicts is true', async () => {
      const requestWithConflicts = {
        ...mockSchedulingRequest,
        allowConflicts: true
      };
      const conflictingSchedule = {
        ...mockScheduledContent,
        id: 'conflicting-schedule',
        scheduledTime: mockSchedulingRequest.scheduledTime
      };
      mockSchedulingRepository.getConflictingSchedules.mockResolvedValue([conflictingSchedule]);

      const result = await engine.scheduleContent(requestWithConflicts);

      expect(result).toBeDefined();
      expect(mockSchedulingRepository.createSchedule).toHaveBeenCalled();
    });

    it('should handle brand context not found', async () => {
      mockBrandContextService.loadBrandContext.mockResolvedValue(null);

      await expect(engine.scheduleContent(mockSchedulingRequest))
        .rejects.toThrow('Brand context not found for brandId: brand-123');
    });
  });

  describe('checkSchedulingConflicts', () => {
    it('should detect time overlap conflicts', async () => {
      const conflictingSchedule = {
        ...mockScheduledContent,
        id: 'conflicting-schedule',
        scheduledTime: new Date(new Date(mockScheduledContent.scheduledTime).getTime() + 15 * 60 * 1000).toISOString() // 15 minutes later
      };
      mockSchedulingRepository.getConflictingSchedules.mockResolvedValue([conflictingSchedule]);

      const conflicts = await engine.checkSchedulingConflicts(mockScheduledContent);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe(ConflictType.TIME_OVERLAP);
      expect(conflicts[0].severity).toBe('high'); // Less than 15 minutes
    });

    it('should detect platform limit conflicts', async () => {
      mockPlatformLimitsService.checkLimits.mockResolvedValue({
        withinLimits: false,
        dailyCount: 10,
        hourlyCount: 5,
        nextAvailableTime: new Date(Date.now() + 2 * 60 * 60 * 1000)
      });
      mockSchedulingRepository.getConflictingSchedules.mockResolvedValue([]);

      const conflicts = await engine.checkSchedulingConflicts(mockScheduledContent);

      expect(conflicts.some(c => c.type === ConflictType.PLATFORM_LIMIT)).toBe(true);
    });

    it('should detect content similarity conflicts', async () => {
      const similarSchedule = {
        ...mockScheduledContent,
        id: 'similar-schedule',
        title: 'Test Content', // Same title
        scheduledTime: new Date(new Date(mockScheduledContent.scheduledTime).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days later
      };
      mockSchedulingRepository.getConflictingSchedules.mockResolvedValue([similarSchedule]);

      const conflicts = await engine.checkSchedulingConflicts(mockScheduledContent);

      expect(conflicts.some(c => c.type === ConflictType.CONTENT_SIMILARITY)).toBe(true);
    });

    it('should detect campaign conflicts', async () => {
      const campaignSchedule = {
        ...mockScheduledContent,
        id: 'campaign-schedule',
        campaignId: 'campaign-123',
        scheduledTime: new Date(new Date(mockScheduledContent.scheduledTime).getTime() + 60 * 60 * 1000).toISOString() // 1 hour later
      };
      const scheduleWithCampaign = {
        ...mockScheduledContent,
        campaignId: 'campaign-123'
      };
      mockSchedulingRepository.getConflictingSchedules.mockResolvedValue([campaignSchedule]);

      const conflicts = await engine.checkSchedulingConflicts(scheduleWithCampaign);

      expect(conflicts.some(c => c.type === ConflictType.CAMPAIGN_CONFLICT)).toBe(true);
    });
  });

  describe('suggestOptimalTimes', () => {
    beforeEach(() => {
      mockOptimalTimingService.getOptimalPostingTimes.mockResolvedValue([
        {
          platform: Platform.INSTAGRAM,
          contentType: ContentType.IMAGE,
          dayOfWeek: 1,
          hour: 10,
          timezone: 'UTC',
          score: 0.85,
          audienceActivity: 0.9,
          competitionLevel: 0.2,
          historicalPerformance: 0.8,
          confidence: 0.85
        },
        {
          platform: Platform.TIKTOK,
          contentType: ContentType.IMAGE,
          dayOfWeek: 2,
          hour: 14,
          timezone: 'UTC',
          score: 0.78,
          audienceActivity: 0.8,
          competitionLevel: 0.3,
          historicalPerformance: 0.75,
          confidence: 0.78
        }
      ]);
    });

    it('should suggest optimal posting times', async () => {
      const timeRange = {
        start: new Date(),
        end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      const suggestions = await engine.suggestOptimalTimes(
        'brand-123',
        [Platform.INSTAGRAM, Platform.TIKTOK],
        ContentType.IMAGE,
        timeRange,
        5
      );

      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].score).toBeGreaterThan(suggestions[1].score); // Sorted by score
      expect(mockOptimalTimingService.getOptimalPostingTimes).toHaveBeenCalledTimes(2);
    });

    it('should limit suggestions to requested count', async () => {
      const timeRange = {
        start: new Date(),
        end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      const suggestions = await engine.suggestOptimalTimes(
        'brand-123',
        [Platform.INSTAGRAM, Platform.TIKTOK],
        ContentType.IMAGE,
        timeRange,
        1
      );

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].score).toBe(0.85); // Highest score
    });
  });

  describe('bulkScheduleContent', () => {
    let bulkRequest: BulkSchedulingRequest;

    beforeEach(() => {
      bulkRequest = {
        brandId: 'brand-123',
        campaignId: 'campaign-456',
        schedules: [
          mockSchedulingRequest,
          {
            ...mockSchedulingRequest,
            title: 'Second Content',
            scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
          }
        ],
        distributionStrategy: 'optimal',
        timeRange: {
          start: new Date().toISOString(),
          end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        createdBy: 'user-123'
      };

      mockOptimalTimingService.calculateOptimalDistribution.mockResolvedValue([
        {
          schedule: bulkRequest.schedules[0],
          suggestedTime: new Date(Date.now() + 60 * 60 * 1000)
        },
        {
          schedule: bulkRequest.schedules[1],
          suggestedTime: new Date(Date.now() + 3 * 60 * 60 * 1000)
        }
      ]);
    });

    it('should bulk schedule content successfully', async () => {
      const result = await engine.bulkScheduleContent(bulkRequest);

      expect(result.scheduled).toHaveLength(2);
      expect(result.conflicts).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
      expect(mockSchedulingRepository.createSchedule).toHaveBeenCalledTimes(2);
    });

    it('should use optimal distribution when specified', async () => {
      await engine.bulkScheduleContent(bulkRequest);

      expect(mockOptimalTimingService.calculateOptimalDistribution).toHaveBeenCalledWith(
        bulkRequest.schedules,
        expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date)
        }),
        'optimal'
      );
    });

    it('should handle scheduling failures in bulk operation', async () => {
      mockPlatformLimitsService.checkLimits
        .mockResolvedValueOnce({ withinLimits: true, dailyCount: 1, hourlyCount: 1 })
        .mockResolvedValueOnce({ withinLimits: true, dailyCount: 1, hourlyCount: 1 })
        .mockResolvedValueOnce({ 
          withinLimits: false, 
          dailyCount: 10, 
          hourlyCount: 5,
          nextAvailableTime: new Date(Date.now() + 2 * 60 * 60 * 1000)
        });

      const result = await engine.bulkScheduleContent(bulkRequest);

      expect(result.scheduled).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toContain('Platform limits exceeded');
    });

    it('should handle conflicts in bulk operation', async () => {
      const conflictingSchedule = {
        ...mockScheduledContent,
        id: 'conflicting-schedule'
      };
      mockSchedulingRepository.getConflictingSchedules.mockResolvedValue([conflictingSchedule]);

      const result = await engine.bulkScheduleContent(bulkRequest);

      expect(result.conflicts.length).toBeGreaterThan(0);
    });

    it('should handle brand context not found in bulk operation', async () => {
      mockBrandContextService.loadBrandContext.mockResolvedValue(null);

      await expect(engine.bulkScheduleContent(bulkRequest))
        .rejects.toThrow('Brand context not found for brandId: brand-123');
    });
  });

  describe('updateScheduledContent', () => {
    beforeEach(() => {
      mockSchedulingRepository.getSchedule.mockResolvedValue(mockScheduledContent);
      mockSchedulingRepository.updateSchedule.mockImplementation(async (id, updates) => ({
        ...mockScheduledContent,
        ...updates
      }));
    });

    it('should update scheduled content successfully', async () => {
      const updates = {
        title: 'Updated Title',
        description: 'Updated description'
      };

      const result = await engine.updateScheduledContent('schedule-789', updates);

      expect(result.title).toBe('Updated Title');
      expect(result.description).toBe('Updated description');
      expect(mockSchedulingRepository.updateSchedule).toHaveBeenCalledWith(
        'schedule-789',
        expect.objectContaining(updates)
      );
    });

    it('should check conflicts when updating scheduled time', async () => {
      const updates = {
        scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      };
      mockSchedulingRepository.getConflictingSchedules.mockResolvedValue([]);

      await engine.updateScheduledContent('schedule-789', updates);

      expect(mockSchedulingRepository.updateSchedule).toHaveBeenCalled();
    });

    it('should reject update if it creates high severity conflicts', async () => {
      const updates = {
        scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      };
      const conflictingSchedule = {
        ...mockScheduledContent,
        id: 'conflicting-schedule',
        scheduledTime: updates.scheduledTime
      };
      mockSchedulingRepository.getConflictingSchedules.mockResolvedValue([conflictingSchedule]);

      await expect(engine.updateScheduledContent('schedule-789', updates))
        .rejects.toThrow('Update would create conflicts');
    });

    it('should handle non-existent schedule', async () => {
      mockSchedulingRepository.getSchedule.mockResolvedValue(null);

      await expect(engine.updateScheduledContent('nonexistent', { title: 'New Title' }))
        .rejects.toThrow('Schedule not found: nonexistent');
    });
  });

  describe('cancelScheduledContent', () => {
    it('should cancel scheduled content', async () => {
      await engine.cancelScheduledContent('schedule-789', 'User requested cancellation');

      expect(mockSchedulingRepository.updateSchedule).toHaveBeenCalledWith(
        'schedule-789',
        expect.objectContaining({
          status: SchedulingStatus.CANCELLED,
          failureReason: 'User requested cancellation'
        })
      );
    });
  });

  describe('getScheduledContent', () => {
    it('should get scheduled content with filters', async () => {
      const filters = {
        brandId: 'brand-123',
        platforms: [Platform.INSTAGRAM],
        status: [SchedulingStatus.SCHEDULED]
      };
      mockSchedulingRepository.getSchedules.mockResolvedValue([mockScheduledContent]);

      const result = await engine.getScheduledContent(filters);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('schedule-789');
      expect(mockSchedulingRepository.getSchedules).toHaveBeenCalledWith(filters);
    });
  });
});