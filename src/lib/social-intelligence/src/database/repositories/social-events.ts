/**
 * Repository for Social Events data access
 */

import { BaseRepository, QueryOptions, PaginatedResult } from './base';
import { SocialEvent, Platform, EventType, SocialEventSchema } from '../../types/core';

export interface SocialEventFilters {
  platform?: Platform | Platform[];
  eventType?: EventType | EventType[];
  authorId?: string;
  brandId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  hashtags?: string[];
  mentions?: string[];
  minEngagementRate?: number;
  hasLocation?: boolean;
}

export interface SocialEventQueryOptions extends QueryOptions {
  filters?: SocialEventFilters;
}

export class SocialEventsRepository extends BaseRepository<SocialEvent> {
  constructor() {
    super('social_events');
  }

  /**
   * Find events by platform
   */
  async findByPlatform(platform: Platform, options: QueryOptions = {}): Promise<PaginatedResult<SocialEvent>> {
    return this.find({
      ...options,
      filters: { ...options.filters, platform }
    });
  }

  /**
   * Find events by author
   */
  async findByAuthor(authorId: string, options: QueryOptions = {}): Promise<PaginatedResult<SocialEvent>> {
    return this.find({
      ...options,
      filters: { ...options.filters, author_id: authorId }
    });
  }

  /**
   * Find events by hashtag
   */
  async findByHashtag(hashtag: string, options: QueryOptions = {}): Promise<PaginatedResult<SocialEvent>> {
    try {
      let query = this.client
        .from(this.tableName)
        .select('*', { count: 'exact' })
        .contains('content_hashtags', [hashtag]);

      // Apply additional filters
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      // Apply ordering and pagination
      if (options.orderBy) {
        query = query.order(options.orderBy, { 
          ascending: options.orderDirection !== 'desc' 
        });
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      const mappedData = data?.map(item => this.mapFromDatabase(item)) || [];
      const totalCount = count || 0;
      const hasMore = options.limit ? 
        (options.offset || 0) + mappedData.length < totalCount : 
        false;

      return {
        data: mappedData,
        count: totalCount,
        hasMore,
        nextOffset: hasMore ? (options.offset || 0) + (options.limit || 10) : undefined
      };
    } catch (error) {
      console.error('Error finding events by hashtag:', error);
      throw error;
    }
  }

  /**
   * Find events by mention
   */
  async findByMention(mention: string, options: QueryOptions = {}): Promise<PaginatedResult<SocialEvent>> {
    try {
      let query = this.client
        .from(this.tableName)
        .select('*', { count: 'exact' })
        .contains('content_mentions', [mention]);

      // Apply additional filters and pagination similar to findByHashtag
      // ... (implementation similar to above)

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      const mappedData = data?.map(item => this.mapFromDatabase(item)) || [];
      const totalCount = count || 0;
      const hasMore = options.limit ? 
        (options.offset || 0) + mappedData.length < totalCount : 
        false;

      return {
        data: mappedData,
        count: totalCount,
        hasMore,
        nextOffset: hasMore ? (options.offset || 0) + (options.limit || 10) : undefined
      };
    } catch (error) {
      console.error('Error finding events by mention:', error);
      throw error;
    }
  }

  /**
   * Find events within date range
   */
  async findByDateRange(
    startDate: Date, 
    endDate: Date, 
    options: QueryOptions = {}
  ): Promise<PaginatedResult<SocialEvent>> {
    try {
      let query = this.client
        .from(this.tableName)
        .select('*', { count: 'exact' })
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      // Apply additional filters and pagination
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      if (options.orderBy) {
        query = query.order(options.orderBy, { 
          ascending: options.orderDirection !== 'desc' 
        });
      } else {
        query = query.order('timestamp', { ascending: false });
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      const mappedData = data?.map(item => this.mapFromDatabase(item)) || [];
      const totalCount = count || 0;
      const hasMore = options.limit ? 
        (options.offset || 0) + mappedData.length < totalCount : 
        false;

      return {
        data: mappedData,
        count: totalCount,
        hasMore,
        nextOffset: hasMore ? (options.offset || 0) + (options.limit || 10) : undefined
      };
    } catch (error) {
      console.error('Error finding events by date range:', error);
      throw error;
    }
  }

  /**
   * Search events by text content
   */
  async searchByContent(
    searchTerm: string, 
    options: QueryOptions = {}
  ): Promise<PaginatedResult<SocialEvent>> {
    try {
      let query = this.client
        .from(this.tableName)
        .select('*', { count: 'exact' })
        .textSearch('content_text', searchTerm);

      // Apply additional filters and pagination
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      if (options.orderBy) {
        query = query.order(options.orderBy, { 
          ascending: options.orderDirection !== 'desc' 
        });
      } else {
        query = query.order('timestamp', { ascending: false });
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      const mappedData = data?.map(item => this.mapFromDatabase(item)) || [];
      const totalCount = count || 0;
      const hasMore = options.limit ? 
        (options.offset || 0) + mappedData.length < totalCount : 
        false;

      return {
        data: mappedData,
        count: totalCount,
        hasMore,
        nextOffset: hasMore ? (options.offset || 0) + (options.limit || 10) : undefined
      };
    } catch (error) {
      console.error('Error searching events by content:', error);
      throw error;
    }
  }

  /**
   * Get engagement statistics for events
   */
  async getEngagementStats(filters?: SocialEventFilters): Promise<{
    totalEvents: number;
    avgEngagementRate: number;
    totalLikes: number;
    totalShares: number;
    totalComments: number;
    totalViews: number;
  }> {
    try {
      let query = this.client
        .from(this.tableName)
        .select(`
          engagement_likes,
          engagement_shares,
          engagement_comments,
          engagement_views,
          engagement_rate
        `);

      // Apply filters
      if (filters) {
        if (filters.platform) {
          if (Array.isArray(filters.platform)) {
            query = query.in('platform', filters.platform);
          } else {
            query = query.eq('platform', filters.platform);
          }
        }
        if (filters.eventType) {
          if (Array.isArray(filters.eventType)) {
            query = query.in('event_type', filters.eventType);
          } else {
            query = query.eq('event_type', filters.eventType);
          }
        }
        if (filters.dateFrom) {
          query = query.gte('timestamp', filters.dateFrom.toISOString());
        }
        if (filters.dateTo) {
          query = query.lte('timestamp', filters.dateTo.toISOString());
        }
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        return {
          totalEvents: 0,
          avgEngagementRate: 0,
          totalLikes: 0,
          totalShares: 0,
          totalComments: 0,
          totalViews: 0
        };
      }

      const stats = data.reduce((acc, event) => ({
        totalEvents: acc.totalEvents + 1,
        totalLikes: acc.totalLikes + (event.engagement_likes || 0),
        totalShares: acc.totalShares + (event.engagement_shares || 0),
        totalComments: acc.totalComments + (event.engagement_comments || 0),
        totalViews: acc.totalViews + (event.engagement_views || 0),
        totalEngagementRate: acc.totalEngagementRate + (event.engagement_rate || 0)
      }), {
        totalEvents: 0,
        totalLikes: 0,
        totalShares: 0,
        totalComments: 0,
        totalViews: 0,
        totalEngagementRate: 0
      });

      return {
        ...stats,
        avgEngagementRate: stats.totalEngagementRate / stats.totalEvents
      };
    } catch (error) {
      console.error('Error getting engagement stats:', error);
      throw error;
    }
  }

  /**
   * Check if event exists by platform and platform ID
   */
  async existsByPlatformId(platform: Platform, platformId: string): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('id')
        .eq('platform', platform)
        .eq('platform_id', platformId)
        .limit(1);

      if (error) {
        throw error;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking event existence:', error);
      throw error;
    }
  }

  /**
   * Map database record to domain model
   */
  protected mapFromDatabase(data: any): SocialEvent {
    const mapped = {
      id: data.id,
      platform: data.platform,
      platformId: data.platform_id,
      timestamp: data.timestamp,
      eventType: data.event_type,
      content: {
        text: data.content_text || '',
        mediaUrls: data.content_media_urls || [],
        hashtags: data.content_hashtags || [],
        mentions: data.content_mentions || [],
        language: data.content_language || 'en'
      },
      author: {
        id: data.author_id,
        username: data.author_username,
        displayName: data.author_display_name,
        followerCount: data.author_follower_count || 0,
        verified: data.author_verified || false,
        profileUrl: data.author_profile_url
      },
      engagement: {
        likes: data.engagement_likes || 0,
        shares: data.engagement_shares || 0,
        comments: data.engagement_comments || 0,
        views: data.engagement_views || 0,
        engagementRate: parseFloat(data.engagement_rate) || 0
      },
      context: data.context_parent_post_id || data.context_thread_id ? {
        parentPostId: data.context_parent_post_id,
        threadId: data.context_thread_id,
        conversationId: data.context_conversation_id,
        isReply: data.context_is_reply || false,
        replyToUserId: data.context_reply_to_user_id
      } : undefined,
      location: data.location_country || data.location_coordinates ? {
        country: data.location_country,
        region: data.location_region,
        city: data.location_city,
        coordinates: data.location_coordinates ? 
          [data.location_coordinates.x, data.location_coordinates.y] : undefined
      } : undefined,
      metadata: {
        source: data.metadata_source,
        processingTimestamp: data.metadata_processing_timestamp,
        version: data.metadata_version || '1.0',
        rawData: data.metadata_raw_data ? JSON.stringify(data.metadata_raw_data) : undefined
      }
    };

    // Validate the mapped data
    return SocialEventSchema.parse(mapped);
  }

  /**
   * Map domain model to database record
   */
  protected mapToDatabase(data: Partial<SocialEvent>): any {
    const mapped: any = {};

    if (data.id) mapped.id = data.id;
    if (data.platform) mapped.platform = data.platform;
    if (data.platformId) mapped.platform_id = data.platformId;
    if (data.timestamp) mapped.timestamp = data.timestamp;
    if (data.eventType) mapped.event_type = data.eventType;

    if (data.content) {
      mapped.content_text = data.content.text;
      mapped.content_media_urls = data.content.mediaUrls;
      mapped.content_hashtags = data.content.hashtags;
      mapped.content_mentions = data.content.mentions;
      mapped.content_language = data.content.language;
    }

    if (data.author) {
      mapped.author_id = data.author.id;
      mapped.author_username = data.author.username;
      mapped.author_display_name = data.author.displayName;
      mapped.author_follower_count = data.author.followerCount;
      mapped.author_verified = data.author.verified;
      mapped.author_profile_url = data.author.profileUrl;
    }

    if (data.engagement) {
      mapped.engagement_likes = data.engagement.likes;
      mapped.engagement_shares = data.engagement.shares;
      mapped.engagement_comments = data.engagement.comments;
      mapped.engagement_views = data.engagement.views;
      mapped.engagement_rate = data.engagement.engagementRate;
    }

    if (data.context) {
      mapped.context_parent_post_id = data.context.parentPostId;
      mapped.context_thread_id = data.context.threadId;
      mapped.context_conversation_id = data.context.conversationId;
      mapped.context_is_reply = data.context.isReply;
      mapped.context_reply_to_user_id = data.context.replyToUserId;
    }

    if (data.location) {
      mapped.location_country = data.location.country;
      mapped.location_region = data.location.region;
      mapped.location_city = data.location.city;
      if (data.location.coordinates) {
        mapped.location_coordinates = `(${data.location.coordinates[0]},${data.location.coordinates[1]})`;
      }
    }

    if (data.metadata) {
      mapped.metadata_source = data.metadata.source;
      mapped.metadata_processing_timestamp = data.metadata.processingTimestamp;
      mapped.metadata_version = data.metadata.version;
      if (data.metadata.rawData) {
        mapped.metadata_raw_data = JSON.parse(data.metadata.rawData);
      }
    }

    return mapped;
  }

  /**
   * Validate social event data
   */
  protected validate(data: Partial<SocialEvent>): void {
    try {
      SocialEventSchema.partial().parse(data);
    } catch (error) {
      throw new Error(`Invalid social event data: ${error}`);
    }
  }
}