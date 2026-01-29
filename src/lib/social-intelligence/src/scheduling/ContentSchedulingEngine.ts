/**
 * Content Scheduling Engine
 * Implements calendar view, scheduling operations, conflict prevention, and optimal time suggestions
 */

import { 
  ScheduledContent, 
  SchedulingRequest,
  BulkSchedulingRequest,
  SchedulingConflict,
  CalendarView,
  OptimalPostingTime,
  CampaignSchedule,
  SchedulingFilters,
  PublishingConfig,
  SchedulingStatus,
  ConflictType,
  PublishingPriority,
  ScheduledContentSchema,
  SchedulingConflictSchema,
  CalendarViewSchema,
  OptimalPostingTimeSchema
} from './types';
import { Platform, ContentType } from '../types/core';
import { BrandContextService } from '../brand/BrandContextService';

export interface SchedulingRepository {
  createSchedule(schedule: ScheduledContent): Promise<ScheduledContent>;
  updateSchedule(id: string, updates: Partial<ScheduledContent>): Promise<ScheduledContent>;
  deleteSchedule(id: string): Promise<void>;
  getSchedule(id: string): Promise<ScheduledContent | null>;
  getSchedules(filters: SchedulingFilters): Promise<ScheduledContent[]>;
  getSchedulesByTimeRange(brandId: string, start: Date, end: Date): Promise<ScheduledContent[]>;
  getConflictingSchedules(schedule: ScheduledContent): Promise<ScheduledContent[]>;
}

export interface OptimalTimingService {
  getOptimalPostingTimes(
    brandId: string, 
    platform: Platform, 
    contentType: ContentType,
    timeRange?: { start: Date; end: Date }
  ): Promise<OptimalPostingTime[]>;
  
  calculateOptimalDistribution(
    schedules: SchedulingRequest[],
    timeRange: { start: Date; end: Date },
    strategy: 'even' | 'optimal' | 'custom'
  ): Promise<Array<{ schedule: SchedulingRequest; suggestedTime: Date }>>;
}

export interface PlatformLimitsService {
  getPlatformLimits(brandId: string, platform: Platform): Promise<{
    dailyLimit: number;
    hourlyLimit: number;
    minInterval: number; // minutes
  }>;
  
  checkLimits(
    brandId: string, 
    platform: Platform, 
    scheduledTime: Date
  ): Promise<{
    withinLimits: boolean;
    dailyCount: number;
    hourlyCount: number;
    nextAvailableTime?: Date;
  }>;
}

export class ContentSchedulingEngine {
  constructor(
    private brandContextService: BrandContextService,
    private schedulingRepository: SchedulingRepository,
    private optimalTimingService: OptimalTimingService,
    private platformLimitsService: PlatformLimitsService
  ) {}

  /**
   * Display a calendar view of all scheduled content across platforms
   * Requirement 10.1: Display a calendar view of all scheduled content across platforms
   */
  async getCalendarView(
    brandId: string,
    viewType: 'day' | 'week' | 'month' | 'year',
    startDate: Date,
    timezone = 'UTC'
  ): Promise<CalendarView> {
    try {
      // Validate brand context
      const brandContext = await this.brandContextService.loadBrandContext(brandId);
      if (!brandContext) {
        throw new Error(`Brand context not found for brandId: ${brandId}`);
      }

      // Calculate end date based on view type
      const endDate = this.calculateEndDate(startDate, viewType);

      // Get scheduled content for the time range
      const scheduledContent = await this.schedulingRepository.getSchedulesByTimeRange(
        brandId, 
        startDate, 
        endDate
      );

      // Detect conflicts
      const conflicts = await this.detectConflicts(scheduledContent);

      // Get optimal posting times for the period
      const optimalTimes = await this.getOptimalTimesForPeriod(
        brandId, 
        startDate, 
        endDate
      );

      // Get platform limits and current usage
      const platformLimits = await this.getPlatformLimitsForPeriod(
        brandId, 
        startDate, 
        endDate, 
        scheduledContent
      );

      const calendarView: CalendarView = {
        brandId,
        viewType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        timezone,
        scheduledContent,
        conflicts,
        optimalTimes,
        platformLimits
      };

      return CalendarViewSchema.parse(calendarView);
    } catch (error) {
      console.error('Error getting calendar view:', error);
      throw new Error(`Failed to get calendar view: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Allow scheduling of content for specific dates, times, and platforms
   * Requirement 10.2: Allow scheduling of content for specific dates, times, and platforms
   */
  async scheduleContent(request: SchedulingRequest): Promise<ScheduledContent> {
    try {
      // Validate brand context
      const brandContext = await this.brandContextService.loadBrandContext(request.brandId);
      if (!brandContext) {
        throw new Error(`Brand context not found for brandId: ${request.brandId}`);
      }

      // Create scheduled content object
      const scheduledContent: ScheduledContent = {
        id: this.generateScheduleId(),
        brandId: request.brandId,
        contentId: request.contentId,
        title: request.title,
        description: request.description,
        content: request.content,
        platforms: request.platforms,
        contentType: request.contentType,
        scheduledTime: request.scheduledTime,
        timezone: request.timezone,
        status: SchedulingStatus.SCHEDULED,
        priority: request.priority,
        campaignId: request.campaignId,
        tags: request.tags || [],
        createdBy: request.createdBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 3,
        notificationsSent: []
      };

      // Check for conflicts if not allowed
      if (!request.allowConflicts) {
        const conflicts = await this.checkSchedulingConflicts(scheduledContent);
        if (conflicts.length > 0) {
          const highSeverityConflicts = conflicts.filter(c => c.severity === 'high');
          if (highSeverityConflicts.length > 0) {
            throw new Error(`Scheduling conflicts detected: ${highSeverityConflicts.map(c => c.description).join(', ')}`);
          }
        }
      }

      // Check platform limits
      for (const platform of request.platforms) {
        const limitsCheck = await this.platformLimitsService.checkLimits(
          request.brandId,
          platform,
          new Date(request.scheduledTime)
        );
        
        if (!limitsCheck.withinLimits) {
          throw new Error(`Platform limits exceeded for ${platform}. Next available time: ${limitsCheck.nextAvailableTime?.toISOString()}`);
        }
      }

      // Save the scheduled content
      const savedSchedule = await this.schedulingRepository.createSchedule(scheduledContent);

      // Schedule notifications if configured
      if (request.notificationSettings) {
        await this.scheduleNotifications(savedSchedule, request.notificationSettings);
      }

      return ScheduledContentSchema.parse(savedSchedule);
    } catch (error) {
      console.error('Error scheduling content:', error);
      throw new Error(`Failed to schedule content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Prevent scheduling conflicts and suggest optimal posting times
   * Requirement 10.3: Prevent scheduling conflicts and suggest optimal posting times
   */
  async checkSchedulingConflicts(schedule: ScheduledContent): Promise<SchedulingConflict[]> {
    try {
      const conflicts: SchedulingConflict[] = [];

      // Get potentially conflicting schedules
      const conflictingSchedules = await this.schedulingRepository.getConflictingSchedules(schedule);

      // Check for time overlap conflicts
      const timeConflicts = this.detectTimeOverlapConflicts(schedule, conflictingSchedules);
      conflicts.push(...timeConflicts);

      // Check for platform limit conflicts
      const platformConflicts = await this.detectPlatformLimitConflicts(schedule);
      conflicts.push(...platformConflicts);

      // Check for content similarity conflicts
      const similarityConflicts = this.detectContentSimilarityConflicts(schedule, conflictingSchedules);
      conflicts.push(...similarityConflicts);

      // Check for campaign conflicts
      const campaignConflicts = this.detectCampaignConflicts(schedule, conflictingSchedules);
      conflicts.push(...campaignConflicts);

      return conflicts.map(conflict => SchedulingConflictSchema.parse(conflict));
    } catch (error) {
      console.error('Error checking scheduling conflicts:', error);
      throw new Error(`Failed to check conflicts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Suggest optimal posting times for content
   */
  async suggestOptimalTimes(
    brandId: string,
    platforms: Platform[],
    contentType: ContentType,
    timeRange: { start: Date; end: Date },
    count = 5
  ): Promise<OptimalPostingTime[]> {
    try {
      const allOptimalTimes: OptimalPostingTime[] = [];

      // Get optimal times for each platform
      for (const platform of platforms) {
        const platformTimes = await this.optimalTimingService.getOptimalPostingTimes(
          brandId,
          platform,
          contentType,
          timeRange
        );
        allOptimalTimes.push(...platformTimes);
      }

      // Sort by score and return top suggestions
      const sortedTimes = allOptimalTimes
        .sort((a, b) => b.score - a.score)
        .slice(0, count);

      return sortedTimes.map(time => OptimalPostingTimeSchema.parse(time));
    } catch (error) {
      console.error('Error suggesting optimal times:', error);
      throw new Error(`Failed to suggest optimal times: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Provide bulk scheduling capabilities for campaign content
   * Requirement 10.4: Provide bulk scheduling capabilities for campaign content
   */
  async bulkScheduleContent(request: BulkSchedulingRequest): Promise<{
    scheduled: ScheduledContent[];
    conflicts: Array<{ scheduleIndex: number; conflicts: SchedulingConflict[] }>;
    failed: Array<{ scheduleIndex: number; error: string }>;
  }> {
    try {
      // Validate brand context
      const brandContext = await this.brandContextService.loadBrandContext(request.brandId);
      if (!brandContext) {
        throw new Error(`Brand context not found for brandId: ${request.brandId}`);
      }

      const scheduled: ScheduledContent[] = [];
      const conflicts: Array<{ scheduleIndex: number; conflicts: SchedulingConflict[] }> = [];
      const failed: Array<{ scheduleIndex: number; error: string }> = [];

      // Calculate optimal distribution if needed
      let schedulesWithTimes = request.schedules.map(schedule => ({
        schedule,
        suggestedTime: new Date(schedule.scheduledTime)
      }));

      if (request.distributionStrategy === 'optimal' && request.timeRange) {
        const timeRange = {
          start: new Date(request.timeRange.start),
          end: new Date(request.timeRange.end)
        };
        schedulesWithTimes = await this.optimalTimingService.calculateOptimalDistribution(
          request.schedules,
          timeRange,
          request.distributionStrategy
        );
      } else if (request.distributionStrategy === 'even' && request.timeRange) {
        const timeRange = {
          start: new Date(request.timeRange.start),
          end: new Date(request.timeRange.end)
        };
        schedulesWithTimes = this.distributeEvenly(request.schedules, timeRange);
      }

      // Process each schedule
      for (let i = 0; i < schedulesWithTimes.length; i++) {
        const { schedule, suggestedTime } = schedulesWithTimes[i];
        
        try {
          // Update schedule time if suggested
          const updatedSchedule = {
            ...schedule,
            scheduledTime: suggestedTime.toISOString(),
            campaignId: request.campaignId || schedule.campaignId
          };

          // Attempt to schedule
          const scheduledContent = await this.scheduleContent(updatedSchedule);
          scheduled.push(scheduledContent);
        } catch (error) {
          // Check if it's a conflict error
          if (error instanceof Error && error.message.includes('conflicts detected')) {
            // Try to get the conflicts for reporting
            try {
              const tempSchedule: ScheduledContent = {
                id: this.generateScheduleId(),
                brandId: schedule.brandId,
                contentId: schedule.contentId,
                title: schedule.title,
                description: schedule.description,
                content: schedule.content,
                platforms: schedule.platforms,
                contentType: schedule.contentType,
                scheduledTime: suggestedTime.toISOString(),
                timezone: schedule.timezone,
                status: SchedulingStatus.DRAFT,
                priority: schedule.priority,
                campaignId: request.campaignId || schedule.campaignId,
                tags: schedule.tags || [],
                createdBy: schedule.createdBy,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                retryCount: 0,
                maxRetries: 3,
                notificationsSent: []
              };

              const scheduleConflicts = await this.checkSchedulingConflicts(tempSchedule);
              conflicts.push({ scheduleIndex: i, conflicts: scheduleConflicts });
            } catch {
              failed.push({ scheduleIndex: i, error: error.message });
            }
          } else {
            failed.push({ scheduleIndex: i, error: error instanceof Error ? error.message : 'Unknown error' });
          }
        }
      }

      return { scheduled, conflicts, failed };
    } catch (error) {
      console.error('Error bulk scheduling content:', error);
      throw new Error(`Failed to bulk schedule content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update scheduled content
   */
  async updateScheduledContent(
    scheduleId: string,
    updates: Partial<ScheduledContent>
  ): Promise<ScheduledContent> {
    try {
      // Get existing schedule
      const existingSchedule = await this.schedulingRepository.getSchedule(scheduleId);
      if (!existingSchedule) {
        throw new Error(`Schedule not found: ${scheduleId}`);
      }

      // Check if time is being updated and validate conflicts
      if (updates.scheduledTime && updates.scheduledTime !== existingSchedule.scheduledTime) {
        const updatedSchedule = { ...existingSchedule, ...updates };
        const conflicts = await this.checkSchedulingConflicts(updatedSchedule);
        
        const highSeverityConflicts = conflicts.filter(c => c.severity === 'high');
        if (highSeverityConflicts.length > 0) {
          throw new Error(`Update would create conflicts: ${highSeverityConflicts.map(c => c.description).join(', ')}`);
        }
      }

      // Update the schedule
      const updatedSchedule = await this.schedulingRepository.updateSchedule(scheduleId, {
        ...updates,
        updatedAt: new Date().toISOString()
      });

      return ScheduledContentSchema.parse(updatedSchedule);
    } catch (error) {
      console.error('Error updating scheduled content:', error);
      throw new Error(`Failed to update scheduled content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel scheduled content
   */
  async cancelScheduledContent(scheduleId: string, reason?: string): Promise<void> {
    try {
      await this.schedulingRepository.updateSchedule(scheduleId, {
        status: SchedulingStatus.CANCELLED,
        failureReason: reason,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error cancelling scheduled content:', error);
      throw new Error(`Failed to cancel scheduled content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get scheduled content with filters
   */
  async getScheduledContent(filters: SchedulingFilters): Promise<ScheduledContent[]> {
    try {
      const schedules = await this.schedulingRepository.getSchedules(filters);
      return schedules.map(schedule => ScheduledContentSchema.parse(schedule));
    } catch (error) {
      console.error('Error getting scheduled content:', error);
      throw new Error(`Failed to get scheduled content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Private helper methods
   */
  private generateScheduleId(): string {
    return `schedule_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private calculateEndDate(startDate: Date, viewType: 'day' | 'week' | 'month' | 'year'): Date {
    const endDate = new Date(startDate);
    
    switch (viewType) {
      case 'day':
        endDate.setDate(endDate.getDate() + 1);
        break;
      case 'week':
        endDate.setDate(endDate.getDate() + 7);
        break;
      case 'month':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'year':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
    }
    
    return endDate;
  }

  private async detectConflicts(scheduledContent: ScheduledContent[]): Promise<SchedulingConflict[]> {
    const conflicts: SchedulingConflict[] = [];

    // Check for time overlaps within the same platform
    for (let i = 0; i < scheduledContent.length; i++) {
      for (let j = i + 1; j < scheduledContent.length; j++) {
        const schedule1 = scheduledContent[i];
        const schedule2 = scheduledContent[j];

        // Check if they share platforms and have time overlap
        const sharedPlatforms = schedule1.platforms.filter(p => schedule2.platforms.includes(p));
        if (sharedPlatforms.length > 0) {
          const time1 = new Date(schedule1.scheduledTime);
          const time2 = new Date(schedule2.scheduledTime);
          const timeDiff = Math.abs(time1.getTime() - time2.getTime()) / (1000 * 60); // minutes

          if (timeDiff < 30) { // Less than 30 minutes apart
            conflicts.push({
              type: ConflictType.TIME_OVERLAP,
              severity: 'medium',
              description: `Content scheduled too close together on ${sharedPlatforms.join(', ')}`,
              conflictingScheduleIds: [schedule1.id, schedule2.id],
              suggestedResolution: {
                action: 'reschedule',
                newTime: new Date(time1.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour later
                reason: 'Maintain minimum 1-hour interval between posts'
              },
              autoResolvable: true
            });
          }
        }
      }
    }

    return conflicts;
  }

  private detectTimeOverlapConflicts(
    schedule: ScheduledContent, 
    conflictingSchedules: ScheduledContent[]
  ): SchedulingConflict[] {
    const conflicts: SchedulingConflict[] = [];
    const scheduleTime = new Date(schedule.scheduledTime);

    for (const conflicting of conflictingSchedules) {
      const conflictingTime = new Date(conflicting.scheduledTime);
      const timeDiff = Math.abs(scheduleTime.getTime() - conflictingTime.getTime()) / (1000 * 60);

      // Check if they share platforms and are too close in time
      const sharedPlatforms = schedule.platforms.filter(p => conflicting.platforms.includes(p));
      if (sharedPlatforms.length > 0 && timeDiff < 30) {
        conflicts.push({
          type: ConflictType.TIME_OVERLAP,
          severity: timeDiff < 15 ? 'high' : 'medium',
          description: `Scheduled too close to existing content on ${sharedPlatforms.join(', ')}`,
          conflictingScheduleIds: [conflicting.id],
          suggestedResolution: {
            action: 'reschedule',
            newTime: new Date(conflictingTime.getTime() + 60 * 60 * 1000).toISOString(),
            reason: 'Maintain minimum interval between posts'
          },
          autoResolvable: true
        });
      }
    }

    return conflicts;
  }

  private async detectPlatformLimitConflicts(schedule: ScheduledContent): Promise<SchedulingConflict[]> {
    const conflicts: SchedulingConflict[] = [];
    const scheduleTime = new Date(schedule.scheduledTime);

    for (const platform of schedule.platforms) {
      const limitsCheck = await this.platformLimitsService.checkLimits(
        schedule.brandId,
        platform,
        scheduleTime
      );

      if (!limitsCheck.withinLimits) {
        conflicts.push({
          type: ConflictType.PLATFORM_LIMIT,
          severity: 'high',
          description: `Exceeds ${platform} posting limits (daily: ${limitsCheck.dailyCount}, hourly: ${limitsCheck.hourlyCount})`,
          conflictingScheduleIds: [],
          suggestedResolution: {
            action: 'reschedule',
            newTime: limitsCheck.nextAvailableTime?.toISOString(),
            reason: 'Respect platform posting limits'
          },
          autoResolvable: true
        });
      }
    }

    return conflicts;
  }

  private detectContentSimilarityConflicts(
    schedule: ScheduledContent,
    conflictingSchedules: ScheduledContent[]
  ): SchedulingConflict[] {
    const conflicts: SchedulingConflict[] = [];

    for (const conflicting of conflictingSchedules) {
      // Simple similarity check based on title and hashtags
      const titleSimilarity = this.calculateTextSimilarity(schedule.title, conflicting.title);
      const hashtagSimilarity = this.calculateArraySimilarity(
        schedule.content.hashtags || [],
        conflicting.content.hashtags || []
      );

      if (titleSimilarity > 0.7 || hashtagSimilarity > 0.8) {
        const scheduleTime = new Date(schedule.scheduledTime);
        const conflictingTime = new Date(conflicting.scheduledTime);
        const timeDiff = Math.abs(scheduleTime.getTime() - conflictingTime.getTime()) / (1000 * 60 * 60 * 24); // days

        if (timeDiff < 7) { // Within a week
          conflicts.push({
            type: ConflictType.CONTENT_SIMILARITY,
            severity: 'low',
            description: 'Similar content scheduled within a week',
            conflictingScheduleIds: [conflicting.id],
            suggestedResolution: {
              action: 'reschedule',
              newTime: new Date(conflictingTime.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              reason: 'Space out similar content'
            },
            autoResolvable: false
          });
        }
      }
    }

    return conflicts;
  }

  private detectCampaignConflicts(
    schedule: ScheduledContent,
    conflictingSchedules: ScheduledContent[]
  ): SchedulingConflict[] {
    const conflicts: SchedulingConflict[] = [];

    if (!schedule.campaignId) return conflicts;

    // Check for campaign scheduling conflicts
    const campaignSchedules = conflictingSchedules.filter(s => s.campaignId === schedule.campaignId);
    
    for (const campaignSchedule of campaignSchedules) {
      const scheduleTime = new Date(schedule.scheduledTime);
      const campaignTime = new Date(campaignSchedule.scheduledTime);
      const timeDiff = Math.abs(scheduleTime.getTime() - campaignTime.getTime()) / (1000 * 60);

      // Campaign content should be spaced appropriately
      if (timeDiff < 120) { // Less than 2 hours
        conflicts.push({
          type: ConflictType.CAMPAIGN_CONFLICT,
          severity: 'medium',
          description: 'Campaign content scheduled too close together',
          conflictingScheduleIds: [campaignSchedule.id],
          suggestedResolution: {
            action: 'reschedule',
            newTime: new Date(campaignTime.getTime() + 2 * 60 * 60 * 1000).toISOString(),
            reason: 'Space campaign content appropriately'
          },
          autoResolvable: true
        });
      }
    }

    return conflicts;
  }

  private async getOptimalTimesForPeriod(
    brandId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    platform: Platform;
    time: string;
    score: number;
    reason: string;
  }>> {
    const optimalTimes: Array<{
      platform: Platform;
      time: string;
      score: number;
      reason: string;
    }> = [];

    // Get optimal times for each platform
    for (const platform of Object.values(Platform)) {
      try {
        const platformTimes = await this.optimalTimingService.getOptimalPostingTimes(
          brandId,
          platform,
          ContentType.IMAGE, // Default content type
          { start: startDate, end: endDate }
        );

        // Take top 3 times per platform
        const topTimes = platformTimes.slice(0, 3);
        for (const time of topTimes) {
          optimalTimes.push({
            platform: time.platform,
            time: new Date(startDate.getTime() + time.dayOfWeek * 24 * 60 * 60 * 1000 + time.hour * 60 * 60 * 1000).toISOString(),
            score: time.score,
            reason: `High audience activity (${(time.audienceActivity * 100).toFixed(0)}%) with low competition`
          });
        }
      } catch (error) {
        console.warn(`Failed to get optimal times for ${platform}:`, error);
      }
    }

    return optimalTimes.sort((a, b) => b.score - a.score).slice(0, 10);
  }

  private async getPlatformLimitsForPeriod(
    brandId: string,
    startDate: Date,
    endDate: Date,
    scheduledContent: ScheduledContent[]
  ): Promise<Record<Platform, { dailyLimit: number; currentCount: number; remaining: number }>> {
    const platformLimits = {} as Record<Platform, { dailyLimit: number; currentCount: number; remaining: number }>;

    for (const platform of Object.values(Platform)) {
      try {
        const limits = await this.platformLimitsService.getPlatformLimits(brandId, platform);
        const currentCount = scheduledContent.filter(s => 
          s.platforms.includes(platform) && 
          s.status === SchedulingStatus.SCHEDULED
        ).length;

        platformLimits[platform] = {
          dailyLimit: limits.dailyLimit,
          currentCount,
          remaining: Math.max(0, limits.dailyLimit - currentCount)
        };
      } catch (error) {
        console.warn(`Failed to get limits for ${platform}:`, error);
        platformLimits[platform] = {
          dailyLimit: 10, // Default
          currentCount: 0,
          remaining: 10
        };
      }
    }

    return platformLimits;
  }

  private distributeEvenly(
    schedules: SchedulingRequest[],
    timeRange: { start: Date; end: Date }
  ): Array<{ schedule: SchedulingRequest; suggestedTime: Date }> {
    const totalDuration = timeRange.end.getTime() - timeRange.start.getTime();
    const interval = totalDuration / schedules.length;

    return schedules.map((schedule, index) => ({
      schedule,
      suggestedTime: new Date(timeRange.start.getTime() + interval * index)
    }));
  }

  private async scheduleNotifications(
    schedule: ScheduledContent,
    notificationSettings: { prePublishMinutes: number; recipients?: string[] }
  ): Promise<void> {
    // In a real implementation, this would schedule notifications
    // For now, we'll just log the intent
    console.log(`Scheduling notification for ${schedule.id} at ${new Date(
      new Date(schedule.scheduledTime).getTime() - notificationSettings.prePublishMinutes * 60 * 1000
    ).toISOString()}`);
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    // Simple similarity calculation based on common words
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;
    
    return commonWords.length / totalWords;
  }

  private calculateArraySimilarity(arr1: string[], arr2: string[]): number {
    if (arr1.length === 0 && arr2.length === 0) return 1;
    if (arr1.length === 0 || arr2.length === 0) return 0;
    
    const set1 = new Set(arr1.map(item => item.toLowerCase()));
    const set2 = new Set(arr2.map(item => item.toLowerCase()));
    
    const intersection = new Set([...set1].filter(item => set2.has(item)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }
}