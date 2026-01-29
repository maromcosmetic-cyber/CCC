/**
 * Social Events API Service Implementation
 * Provides data access for Social_Event REST endpoints
 * Requirements: 11.1
 */

import { SocialEvent, Platform, EventType } from '../../types/core';
import { 
  SocialEventsService, 
  SocialEventFilters, 
  PaginatedResponse, 
  SocialEventMetrics 
} from '../routes/social-events';

export class SocialEventsApiService implements SocialEventsService {
  constructor(
    private socialEventsRepository: SocialEventsRepository
  ) {}

  /**
   * Get social events with filtering and pagination
   */
  async getSocialEvents(filters: SocialEventFilters): Promise<PaginatedResponse<SocialEvent>> {
    try {
      const offset = (filters.page - 1) * filters.limit;
      
      // Build query filters
      const queryFilters: Record<string, any> = {};
      
      if (filters.platform) {
        queryFilters.platform = filters.platform;
      }
      
      if (filters.eventType) {
        queryFilters.event_type = filters.eventType;
      }
      
      if (filters.startDate) {
        queryFilters.created_at_gte = filters.startDate;
      }
      
      if (filters.endDate) {
        queryFilters.created_at_lte = filters.endDate;
      }
      
      if (filters.sentiment) {
        queryFilters.sentiment = filters.sentiment;
      }
      
      if (filters.priority) {
        queryFilters.priority = filters.priority;
      }
      
      if (filters.search) {
        queryFilters.search = filters.search;
      }

      // Get total count for pagination
      const total = await this.socialEventsRepository.count(queryFilters);
      
      // Get paginated results
      const events = await this.socialEventsRepository.findMany({
        filters: queryFilters,
        limit: filters.limit,
        offset,
        orderBy: { created_at: 'desc' }
      });

      const totalPages = Math.ceil(total / filters.limit);

      return {
        data: events,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total,
          totalPages,
          hasNext: filters.page < totalPages,
          hasPrev: filters.page > 1
        }
      };
    } catch (error) {
      console.error('Error retrieving social events:', error);
      throw new Error(`Failed to retrieve social events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get social event by ID
   */
  async getSocialEventById(id: string): Promise<SocialEvent | null> {
    try {
      return await this.socialEventsRepository.findById(id);
    } catch (error) {
      console.error('Error retrieving social event by ID:', error);
      throw new Error(`Failed to retrieve social event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get metrics for a social event
   */
  async getSocialEventMetrics(id: string): Promise<SocialEventMetrics> {
    try {
      const event = await this.socialEventsRepository.findById(id);
      
      if (!event) {
        throw new Error('Social event not found');
      }

      // Extract metrics from event engagement data
      const metrics: SocialEventMetrics = {
        engagement: {
          likes: event.engagement.likes,
          shares: event.engagement.shares,
          comments: event.engagement.comments,
          views: event.engagement.views
        },
        reach: {
          impressions: event.engagement.views, // Use views as impressions for mock data
          uniqueUsers: Math.floor(event.engagement.views * 0.7) // Estimate unique users
        },
        sentiment: {
          positive: 0.6, // Mock sentiment data
          negative: 0.2,
          neutral: 0.2,
          confidence: 0.85
        }
      };

      return metrics;
    } catch (error) {
      console.error('Error retrieving social event metrics:', error);
      throw new Error(`Failed to retrieve metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Social Events Repository Interface
 */
export interface SocialEventsRepository {
  findMany(options: FindManyOptions): Promise<SocialEvent[]>;
  findById(id: string): Promise<SocialEvent | null>;
  count(filters: Record<string, any>): Promise<number>;
}

export interface FindManyOptions {
  filters: Record<string, any>;
  limit: number;
  offset: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
}

/**
 * Mock Social Events Repository for testing
 */
export class MockSocialEventsRepository implements SocialEventsRepository {
  private events: SocialEvent[] = [];

  constructor() {
    // Initialize with some mock data
    this.events = this.generateMockEvents(100);
  }

  async findMany(options: FindManyOptions): Promise<SocialEvent[]> {
    let filteredEvents = [...this.events];

    // Apply filters
    if (options.filters.platform) {
      filteredEvents = filteredEvents.filter(e => e.platform === options.filters.platform);
    }
    
    if (options.filters.event_type) {
      filteredEvents = filteredEvents.filter(e => e.eventType === options.filters.event_type);
    }
    
    if (options.filters.search) {
      const searchTerm = options.filters.search.toLowerCase();
      filteredEvents = filteredEvents.filter(e => 
        e.content.text.toLowerCase().includes(searchTerm) ||
        e.author.username.toLowerCase().includes(searchTerm)
      );
    }

    // Apply date filters
    if (options.filters.created_at_gte) {
      filteredEvents = filteredEvents.filter(e => 
        new Date(e.timestamp) >= new Date(options.filters.created_at_gte)
      );
    }
    
    if (options.filters.created_at_lte) {
      filteredEvents = filteredEvents.filter(e => 
        new Date(e.timestamp) <= new Date(options.filters.created_at_lte)
      );
    }

    // Apply ordering
    if (options.orderBy?.created_at === 'desc') {
      filteredEvents.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }

    // Apply pagination
    return filteredEvents.slice(options.offset, options.offset + options.limit);
  }

  async findById(id: string): Promise<SocialEvent | null> {
    return this.events.find(e => e.id === id) || null;
  }

  async count(filters: Record<string, any>): Promise<number> {
    const options: FindManyOptions = {
      filters,
      limit: Number.MAX_SAFE_INTEGER,
      offset: 0
    };
    
    const results = await this.findMany(options);
    return results.length;
  }

  private generateMockEvents(count: number): SocialEvent[] {
    const platforms = [Platform.TIKTOK, Platform.INSTAGRAM, Platform.YOUTUBE, Platform.REDDIT, Platform.RSS];
    const eventTypes = [EventType.POST, EventType.COMMENT, EventType.MENTION, EventType.SHARE];
    
    return Array.from({ length: count }, (_, i) => ({
      id: `event-${i + 1}`,
      platform: platforms[Math.floor(Math.random() * platforms.length)],
      platformId: `platform-${i + 1}`,
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      content: {
        text: `Mock social media content ${i + 1}`,
        mediaUrls: [],
        hashtags: [`#hashtag${i % 5 + 1}`],
        mentions: [],
        language: 'en'
      },
      author: {
        id: `user-${Math.floor(Math.random() * 50) + 1}`,
        username: `user${Math.floor(Math.random() * 50) + 1}`,
        displayName: `User ${Math.floor(Math.random() * 50) + 1}`,
        followerCount: Math.floor(Math.random() * 10000),
        verified: Math.random() > 0.8
      },
      engagement: {
        likes: Math.floor(Math.random() * 1000),
        shares: Math.floor(Math.random() * 100),
        comments: Math.floor(Math.random() * 50),
        views: Math.floor(Math.random() * 10000),
        engagementRate: Math.random() * 0.1
      },
      metadata: {
        source: Math.random() > 0.5 ? 'api' : 'webhook' as 'api' | 'webhook' | 'crawler',
        processingTimestamp: new Date().toISOString(),
        version: '1.0'
      }
    }));
  }
}