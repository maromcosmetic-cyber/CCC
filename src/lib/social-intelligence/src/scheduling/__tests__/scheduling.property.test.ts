/**
 * Property-Based Tests for Scheduling Management
 * **Property 14: Content scheduling and publishing management**
 * **Validates: Requirements 10.2, 10.3, 10.4, 10.5, 10.6, 10.7**
 */

import fc from 'fast-check';
import { ContentSchedulingEngine, SchedulingRepository, OptimalTimingService, PlatformLimitsService } from '../ContentSchedulingEngine';
import { PublishingManagementService, PublishingRepository, PlatformPublisher, NotificationService, PublishingMetricsCollector } from '../PublishingManagementService';
import { SchedulingService } from '../SchedulingService';
import { BrandContextService } from '../../brand/BrandContextService';
import { 
  ScheduledContent,
  SchedulingRequest,
  BulkSchedulingRequest,
  SchedulingStatus,
  PublishingPriority,
  ConflictType
} from '../types';
import { Platform, ContentType } from '../../types/core';

// Test setup and mocks
const createMockBrandContextService = (): Partial<BrandContextService> => ({
  loadBrandContext: jest.fn().mockResolvedValue({
    brandId: 'test-brand',
    playbook: {},
    personas: [],
    assets: []
  })
});

const createMockSchedulingRepository = (): SchedulingRepository => ({
  createSchedule: jest.fn().mockImplementation(async (schedule: ScheduledContent) => ({
    ...schedule,
    id: `schedule_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  })),
  updateSchedule: jest.fn().mockImplementation(async (id: string, updates: Partial<ScheduledContent>) => ({
    id,
    ...updates,
    updatedAt: new Date().toISOString()
  })),
  deleteSchedule: jest.fn(),
  getSchedule: jest.fn(),
  getSchedules: jest.fn().mockResolvedValue([]),
  getSchedulesByTimeRange: jest.fn().mockResolvedValue([]),
  getConflictingSchedules: jest.fn().mockResolvedValue([])
});

const createMockOptimalTimingService = () => ({
  getOptimalPostingTimes: jest.fn().mockResolvedValue([
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
  ]),
  calculateOptimalDistribution: jest.fn().mockImplementation(async (schedules: any[]) => 
    schedules.map((schedule: any, index: number) => ({
      schedule,
      suggestedTime: new Date(Date.now() + (index + 1) * 60 * 60 * 1000)
    }))
  )
});

const createMockPlatformLimitsService = (): PlatformLimitsService => ({
  getPlatformLimits: jest.fn().mockResolvedValue({
    dailyLimit: 10,
    hourlyLimit: 2,
    minInterval: 30
  }),
  checkLimits: jest.fn().mockResolvedValue({
    withinLimits: true,
    dailyCount: 2,
    hourlyCount: 1
  })
});

const createMockPublishingRepository = (): PublishingRepository => ({
  updateScheduleStatus: jest.fn(),
  getScheduleById: jest.fn(),
  getSchedulesDueForPublishing: jest.fn().mockResolvedValue([]),
  getSchedulesDueForNotification: jest.fn().mockResolvedValue([])
});

const createMockPlatformPublisher = (): PlatformPublisher => ({
  publishContent: jest.fn().mockResolvedValue({
    success: true,
    platformPostId: 'post-123'
  }),
  validateContent: jest.fn().mockResolvedValue({
    valid: true,
    issues: []
  })
});

const createMockNotificationService = (): NotificationService => ({
  sendNotification: jest.fn().mockResolvedValue({ success: true }),
  scheduleNotification: jest.fn().mockResolvedValue('notification-123'),
  cancelNotification: jest.fn()
});

const createMockMetricsCollector = (): PublishingMetricsCollector => ({
  collectInitialMetrics: jest.fn().mockResolvedValue({
    likes: 0,
    shares: 0,
    comments: 0,
    views: 0
  })
});

// Arbitraries for generating test data
const platformArbitrary = fc.constantFrom(...Object.values(Platform));
const contentTypeArbitrary = fc.constantFrom(...Object.values(ContentType));
const priorityArbitrary = fc.constantFrom(...Object.values(PublishingPriority));

const schedulingRequestArbitrary = fc.record({
  brandId: fc.string({ minLength: 1, maxLength: 50 }),
  contentId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  title: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
  content: fc.record({
    text: fc.option(fc.string({ minLength: 1, maxLength: 2000 }), { nil: undefined }),
    hashtags: fc.option(fc.array(fc.string({ minLength: 2, maxLength: 30 }), { minLength: 0, maxLength: 10 }), { nil: undefined }),
    mediaUrls: fc.option(fc.array(fc.webUrl(), { minLength: 0, maxLength: 5 }), { nil: undefined })
  }),
  platforms: fc.array(platformArbitrary, { minLength: 1, maxLength: 3 }).map(arr => [...new Set(arr)]),
  contentType: contentTypeArbitrary,
  scheduledTime: fc.date({ min: new Date(), max: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) })
    .map(date => date.toISOString()),
  timezone: fc.constantFrom('UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'),
  priority: priorityArbitrary,
  campaignId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  tags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 10 }), { nil: undefined }),
  createdBy: fc.string({ minLength: 1, maxLength: 50 }),
  allowConflicts: fc.boolean()
});

const bulkSchedulingRequestArbitrary = fc.record({
  brandId: fc.string({ minLength: 1, maxLength: 50 }),
  campaignId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  schedules: fc.array(schedulingRequestArbitrary, { minLength: 1, maxLength: 10 }),
  distributionStrategy: fc.constantFrom('even' as const, 'optimal' as const, 'custom' as const),
  timeRange: fc.option(fc.record({
    start: fc.date({ min: new Date(), max: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })
      .map(date => date.toISOString()),
    end: fc.date({ min: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), max: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) })
      .map(date => date.toISOString())
  }), { nil: undefined }),
  createdBy: fc.string({ minLength: 1, maxLength: 50 })
});

describe('Property-Based Tests: Content Scheduling and Publishing Management', () => {
  let schedulingEngine: ContentSchedulingEngine;
  let publishingManager: PublishingManagementService;
  let schedulingService: SchedulingService;

  beforeEach(() => {
    // Create fresh mocks for each test
    const brandContextService = createMockBrandContextService() as BrandContextService;
    const schedulingRepository = createMockSchedulingRepository();
    const optimalTimingService = createMockOptimalTimingService();
    const platformLimitsService = createMockPlatformLimitsService();
    const publishingRepository = createMockPublishingRepository();
    const platformPublisher = createMockPlatformPublisher();
    const notificationService = createMockNotificationService();
    const metricsCollector = createMockMetricsCollector();

    schedulingEngine = new ContentSchedulingEngine(
      brandContextService,
      schedulingRepository,
      optimalTimingService,
      platformLimitsService
    );

    publishingManager = new PublishingManagementService(
      brandContextService,
      publishingRepository,
      platformPublisher,
      notificationService,
      metricsCollector
    );

    schedulingService = new SchedulingService(schedulingEngine, publishingManager);
  });

  /**
   * Property 14.1: Content scheduling preserves all input data
   * Validates: Requirement 10.2 - Allow scheduling of content for specific dates, times, and platforms
   */
  test('Property 14.1: Content scheduling preserves all input data', async () => {
    await fc.assert(
      fc.asyncProperty(schedulingRequestArbitrary, async (request) => {
        try {
          const scheduled = await schedulingEngine.scheduleContent(request);

          // Verify all essential data is preserved
          expect(scheduled.brandId).toBe(request.brandId);
          expect(scheduled.title).toBe(request.title);
          expect(scheduled.description).toBe(request.description);
          expect(scheduled.content).toEqual(request.content);
          expect(scheduled.platforms).toEqual(request.platforms);
          expect(scheduled.contentType).toBe(request.contentType);
          expect(scheduled.scheduledTime).toBe(request.scheduledTime);
          expect(scheduled.timezone).toBe(request.timezone);
          expect(scheduled.priority).toBe(request.priority);
          expect(scheduled.campaignId).toBe(request.campaignId);
          expect(scheduled.tags).toEqual(request.tags || []);
          expect(scheduled.createdBy).toBe(request.createdBy);

          // Verify system-generated fields are present
          expect(scheduled.id).toBeDefined();
          expect(scheduled.status).toBe(SchedulingStatus.SCHEDULED);
          expect(scheduled.createdAt).toBeDefined();
          expect(scheduled.updatedAt).toBeDefined();
          expect(scheduled.retryCount).toBe(0);
          expect(scheduled.maxRetries).toBeGreaterThan(0);
          expect(Array.isArray(scheduled.notificationsSent)).toBe(true);

          return true;
        } catch (error) {
          // Allow expected validation errors
          if (error instanceof Error && (
            error.message.includes('Brand context not found') ||
            error.message.includes('Platform limits exceeded') ||
            error.message.includes('conflicts detected')
          )) {
            return true;
          }
          throw error;
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.2: Conflict detection is consistent and deterministic
   * Validates: Requirement 10.3 - Prevent scheduling conflicts and suggest optimal posting times
   */
  test('Property 14.2: Conflict detection is consistent and deterministic', async () => {
    await fc.assert(
      fc.asyncProperty(
        schedulingRequestArbitrary,
        fc.array(schedulingRequestArbitrary, { minLength: 0, maxLength: 5 }),
        async (schedule, conflictingSchedules) => {
          try {
            // Convert request to scheduled content for conflict checking
            const scheduledContent = {
              id: 'test-schedule',
              brandId: schedule.brandId,
              contentId: schedule.contentId,
              title: schedule.title,
              description: schedule.description,
              content: schedule.content,
              platforms: schedule.platforms,
              contentType: schedule.contentType,
              scheduledTime: schedule.scheduledTime,
              timezone: schedule.timezone,
              status: SchedulingStatus.SCHEDULED,
              priority: schedule.priority,
              campaignId: schedule.campaignId,
              tags: schedule.tags || [],
              createdBy: schedule.createdBy,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              retryCount: 0,
              maxRetries: 3,
              notificationsSent: []
            };

            // Mock conflicting schedules
            const mockConflictingSchedules = conflictingSchedules.map((req, index) => ({
              id: `conflicting-${index}`,
              brandId: req.brandId,
              contentId: req.contentId,
              title: req.title,
              description: req.description,
              content: req.content,
              platforms: req.platforms,
              contentType: req.contentType,
              scheduledTime: req.scheduledTime,
              timezone: req.timezone,
              status: SchedulingStatus.SCHEDULED,
              priority: req.priority,
              campaignId: req.campaignId,
              tags: req.tags || [],
              createdBy: req.createdBy,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              retryCount: 0,
              maxRetries: 3,
              notificationsSent: []
            }));

            // Setup mock to return conflicting schedules
            const mockRepo = (schedulingEngine as any)['schedulingRepository'];
            mockRepo.getConflictingSchedules.mockResolvedValue(mockConflictingSchedules);

            // Check conflicts multiple times - should be consistent
            const conflicts1 = await schedulingEngine.checkSchedulingConflicts(scheduledContent);
            const conflicts2 = await schedulingEngine.checkSchedulingConflicts(scheduledContent);

            // Conflicts should be deterministic
            expect(conflicts1).toHaveLength(conflicts2.length);
            
            // Each conflict should have required properties
            conflicts1.forEach((conflict: any) => {
              expect(Object.values(ConflictType)).toContain(conflict.type);
              expect(['low', 'medium', 'high']).toContain(conflict.severity);
              expect(typeof conflict.description).toBe('string');
              expect(Array.isArray(conflict.conflictingScheduleIds)).toBe(true);
              expect(typeof conflict.autoResolvable).toBe('boolean');
              expect(conflict.suggestedResolution).toBeDefined();
              expect(['reschedule', 'merge', 'cancel', 'ignore']).toContain(conflict.suggestedResolution.action);
            });

            return true;
          } catch (error) {
            // Allow expected errors
            if (error instanceof Error && error.message.includes('Brand context not found')) {
              return true;
            }
            throw error;
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 14.3: Bulk scheduling maintains individual schedule integrity
   * Validates: Requirement 10.4 - Provide bulk scheduling capabilities for campaign content
   */
  test('Property 14.3: Bulk scheduling maintains individual schedule integrity', async () => {
    await fc.assert(
      fc.asyncProperty(bulkSchedulingRequestArbitrary, async (bulkRequest) => {
        try {
          const result = await schedulingEngine.bulkScheduleContent(bulkRequest);

          // Total processed should equal input count
          const totalProcessed = result.scheduled.length + result.conflicts.length + result.failed.length;
          expect(totalProcessed).toBe(bulkRequest.schedules.length);

          // Each successfully scheduled item should preserve original data
          result.scheduled.forEach((scheduled: any, index: number) => {
            // Find the original request that matches this scheduled item
            const original = bulkRequest.schedules.find((req: any) => 
              req.title === scheduled.title && req.platforms.join(',') === scheduled.platforms.join(',')
            );
            
            if (original) {
              expect(scheduled.brandId).toBe(original.brandId);
              expect(scheduled.title).toBe(original.title);
              expect(scheduled.platforms).toEqual(original.platforms);
              expect(scheduled.contentType).toBe(original.contentType);
              expect(scheduled.createdBy).toBe(original.createdBy);
              
              // Campaign ID should be set from bulk request if not in individual schedule
              if (bulkRequest.campaignId) {
                expect(scheduled.campaignId).toBe(bulkRequest.campaignId);
              }
            }
          });

          // Conflicts should reference valid schedule indices
          result.conflicts.forEach((conflict: any) => {
            expect(conflict.scheduleIndex).toBeGreaterThanOrEqual(0);
            expect(conflict.scheduleIndex).toBeLessThan(bulkRequest.schedules.length);
            expect(Array.isArray(conflict.conflicts)).toBe(true);
          });

          // Failed items should reference valid schedule indices
          result.failed.forEach((failure: any) => {
            expect(failure.scheduleIndex).toBeGreaterThanOrEqual(0);
            expect(failure.scheduleIndex).toBeLessThan(bulkRequest.schedules.length);
            expect(typeof failure.error).toBe('string');
          });

          return true;
        } catch (error) {
          // Allow expected validation errors
          if (error instanceof Error && error.message.includes('Brand context not found')) {
            return true;
          }
          throw error;
        }
      }),
      { numRuns: 30 }
    );
  });

  /**
   * Property 14.4: Publishing status tracking is comprehensive
   * Validates: Requirement 10.6 - Track publishing status and provide failure notifications
   */
  test('Property 14.4: Publishing status tracking is comprehensive', async () => {
    await fc.assert(
      fc.asyncProperty(schedulingRequestArbitrary, async (request) => {
        try {
          // Create a scheduled content item
          const scheduledContent: ScheduledContent = {
            id: 'test-schedule',
            brandId: request.brandId,
            contentId: request.contentId || undefined,
            title: request.title,
            description: request.description || undefined,
            content: {
              text: request.content.text || undefined,
              hashtags: request.content.hashtags || undefined,
              mediaUrls: request.content.mediaUrls || undefined
            },
            platforms: request.platforms,
            contentType: request.contentType,
            scheduledTime: request.scheduledTime,
            timezone: request.timezone,
            status: SchedulingStatus.SCHEDULED,
            priority: request.priority,
            campaignId: request.campaignId || undefined,
            tags: request.tags || [],
            createdBy: request.createdBy,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            retryCount: 0,
            maxRetries: 3,
            notificationsSent: []
          };

          // Attempt to publish
          const publishingStatuses = await publishingManager.publishScheduledContent(scheduledContent);

          // Should have status for each platform
          expect(publishingStatuses).toHaveLength(request.platforms.length);

          // Each status should have required fields
          publishingStatuses.forEach((status: any, index: number) => {
            expect(status.scheduleId).toBe('test-schedule');
            expect(request.platforms).toContain(status.platform);
            expect(['pending', 'publishing', 'published', 'failed', 'cancelled']).toContain(status.status);
            expect(status.lastUpdated).toBeDefined();

            // If published, should have publishedAt and potentially platformPostId
            if (status.status === 'published') {
              expect(status.publishedAt).toBeDefined();
              // platformPostId is optional but if present should be a string
              if (status.platformPostId) {
                expect(typeof status.platformPostId).toBe('string');
              }
            }

            // If failed, should have error information
            if (status.status === 'failed') {
              expect(status.error).toBeDefined();
              expect(typeof status.error!.code).toBe('string');
              expect(typeof status.error!.message).toBe('string');
            }
          });

          return true;
        } catch (error) {
          // Allow expected errors
          if (error instanceof Error && (
            error.message.includes('Brand context not found') ||
            error.message.includes('Failed to publish content')
          )) {
            return true;
          }
          throw error;
        }
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Property 14.5: Content editing preserves data integrity
   * Validates: Requirement 10.7 - Allow last-minute edits and cancellations of scheduled content
   */
  test('Property 14.5: Content editing preserves data integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        schedulingRequestArbitrary,
        fc.record({
          title: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
          description: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
          scheduledTime: fc.option(fc.date({ min: new Date(Date.now() + 10 * 60 * 1000), max: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) })
            .map(date => date.toISOString()), { nil: undefined }),
          tags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 10 }), { nil: undefined })
        }),
        async (originalRequest, updates) => {
          try {
            // Create original scheduled content with future time (more than 5 minutes)
            const futureTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
            const originalSchedule: ScheduledContent = {
              id: 'test-schedule',
              brandId: originalRequest.brandId,
              contentId: originalRequest.contentId || undefined,
              title: originalRequest.title,
              description: originalRequest.description || undefined,
              content: {
                text: originalRequest.content.text || undefined,
                hashtags: originalRequest.content.hashtags || undefined,
                mediaUrls: originalRequest.content.mediaUrls || undefined
              },
              platforms: originalRequest.platforms,
              contentType: originalRequest.contentType,
              scheduledTime: futureTime.toISOString(),
              timezone: originalRequest.timezone,
              status: SchedulingStatus.SCHEDULED,
              priority: originalRequest.priority,
              campaignId: originalRequest.campaignId || undefined,
              tags: originalRequest.tags || [],
              createdBy: originalRequest.createdBy,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              retryCount: 0,
              maxRetries: 3,
              notificationsSent: []
            };

            // Mock repository to return the original schedule
            const mockRepo = (publishingManager as any)['publishingRepository'];
            mockRepo.getScheduleById.mockResolvedValue(originalSchedule);

            // Filter out undefined values from updates
            const cleanUpdates = Object.fromEntries(
              Object.entries(updates).filter(([_, value]) => value !== undefined)
            );

            if (Object.keys(cleanUpdates).length === 0) {
              return true; // Skip if no actual updates
            }

            // Attempt to edit
            const editedSchedule = await publishingManager.editScheduledContent(
              'test-schedule',
              cleanUpdates,
              'editor-user'
            );

            // Verify updates were applied
            Object.entries(cleanUpdates).forEach(([key, value]) => {
              expect(editedSchedule[key as keyof ScheduledContent]).toEqual(value);
            });

            // Verify unchanged fields remain the same
            const unchangedFields = ['brandId', 'contentId', 'content', 'platforms', 'contentType', 'createdBy'];
            unchangedFields.forEach((field: string) => {
              if (!(field in cleanUpdates)) {
                expect(editedSchedule[field as keyof ScheduledContent]).toEqual(originalSchedule[field as keyof ScheduledContent]);
              }
            });

            // Verify system fields are updated appropriately
            expect(editedSchedule.updatedAt).toBeDefined();
            if (!cleanUpdates.scheduledTime) {
              expect(editedSchedule.scheduledTime).toBe(originalSchedule.scheduledTime);
            }

            return true;
          } catch (error) {
            // Allow expected validation errors
            if (error instanceof Error && (
              error.message.includes('Schedule not found') ||
              error.message.includes('Cannot edit content') ||
              error.message.includes('Brand context not found')
            )) {
              return true;
            }
            throw error;
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 14.6: Calendar view data consistency
   * Validates: Requirement 10.1 - Display a calendar view of all scheduled content across platforms
   */
  test('Property 14.6: Calendar view data consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.constantFrom('day' as const, 'week' as const, 'month' as const, 'year' as const),
        fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }),
        fc.constantFrom('UTC', 'America/New_York', 'Europe/London'),
        async (brandId, viewType, startDate, timezone) => {
          try {
            const calendarView = await schedulingEngine.getCalendarView(brandId, viewType, startDate, timezone);

            // Verify basic structure
            expect(calendarView.brandId).toBe(brandId);
            expect(calendarView.viewType).toBe(viewType);
            expect(calendarView.timezone).toBe(timezone);
            expect(new Date(calendarView.startDate)).toEqual(startDate);

            // Verify end date is calculated correctly based on view type
            const expectedEndDate = new Date(startDate);
            switch (viewType) {
              case 'day':
                expectedEndDate.setDate(expectedEndDate.getDate() + 1);
                break;
              case 'week':
                expectedEndDate.setDate(expectedEndDate.getDate() + 7);
                break;
              case 'month':
                expectedEndDate.setMonth(expectedEndDate.getMonth() + 1);
                break;
              case 'year':
                expectedEndDate.setFullYear(expectedEndDate.getFullYear() + 1);
                break;
            }
            expect(new Date(calendarView.endDate).getTime()).toBeCloseTo(expectedEndDate.getTime(), -3);

            // Verify data structure integrity
            expect(Array.isArray(calendarView.scheduledContent)).toBe(true);
            expect(Array.isArray(calendarView.conflicts)).toBe(true);
            expect(Array.isArray(calendarView.optimalTimes)).toBe(true);
            expect(typeof calendarView.platformLimits).toBe('object');

            // Verify scheduled content structure
            calendarView.scheduledContent.forEach((content: any) => {
              expect(typeof content.id).toBe('string');
              expect(content.brandId).toBe(brandId);
              expect(Array.isArray(content.platforms)).toBe(true);
              expect(content.platforms.length).toBeGreaterThan(0);
              expect(Object.values(ContentType)).toContain(content.contentType);
            });

            // Verify conflicts structure
            calendarView.conflicts.forEach((conflict: any) => {
              expect(Object.values(ConflictType)).toContain(conflict.type);
              expect(['low', 'medium', 'high']).toContain(conflict.severity);
              expect(Array.isArray(conflict.conflictingScheduleIds)).toBe(true);
            });

            // Verify optimal times structure
            calendarView.optimalTimes.forEach((optimalTime: any) => {
              expect(Object.values(Platform)).toContain(optimalTime.platform);
              expect(typeof optimalTime.score).toBe('number');
              expect(optimalTime.score).toBeGreaterThanOrEqual(0);
              expect(optimalTime.score).toBeLessThanOrEqual(1);
            });

            return true;
          } catch (error) {
            // Allow expected validation errors
            if (error instanceof Error && error.message.includes('Brand context not found')) {
              return true;
            }
            throw error;
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});