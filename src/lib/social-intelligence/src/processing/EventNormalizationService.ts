/**
 * Event Normalization Service
 * Converts platform-specific data to unified SocialEvent format
 * Preserves original metadata while adding standardized fields
 * Implements data lineage tracking
 */

import { Platform, SocialEvent, EventType } from '../types/core';
import { RawPlatformData } from '../ingestion/types';

export interface NormalizationRule {
  platform: Platform;
  fieldMappings: Record<string, string | ((data: any) => any)>;
  transformations: Record<string, (value: any, data: any) => any>;
  validations: Array<(event: SocialEvent) => boolean>;
}

export interface DataLineage {
  sourceId: string;
  sourcePlatform: Platform;
  ingestionTimestamp: string;
  normalizationTimestamp: string;
  transformationsApplied: string[];
  originalDataHash: string;
  version: string;
}

export interface NormalizationMetrics {
  totalProcessed: number;
  successfulNormalizations: number;
  failedNormalizations: number;
  averageProcessingTime: number;
  errorsByType: Record<string, number>;
  platformBreakdown: Record<Platform, {
    processed: number;
    successful: number;
    failed: number;
  }>;
}

export class EventNormalizationService {
  private rules: Map<Platform, NormalizationRule> = new Map();
  private metrics: NormalizationMetrics;

  constructor() {
    this.metrics = {
      totalProcessed: 0,
      successfulNormalizations: 0,
      failedNormalizations: 0,
      averageProcessingTime: 0,
      errorsByType: {},
      platformBreakdown: {} as Record<Platform, any>
    };
    
    this.initializeDefaultRules();
  }

  /**
   * Normalize raw platform data to SocialEvent format
   */
  async normalize(rawData: RawPlatformData): Promise<SocialEvent> {
    const startTime = Date.now();
    this.metrics.totalProcessed++;

    try {
      // Get platform-specific normalization rule
      const rule = this.rules.get(rawData.platform);
      if (!rule) {
        throw new Error(`No normalization rule found for platform: ${rawData.platform}`);
      }

      // Apply field mappings and transformations
      const normalizedEvent = await this.applyNormalizationRule(rawData, rule);
      
      // Add data lineage tracking
      normalizedEvent.metadata = {
        ...normalizedEvent.metadata,
        dataLineage: this.createDataLineage(rawData, ['field_mapping', 'content_normalization', 'engagement_calculation'])
      };

      // Validate the normalized event
      this.validateNormalizedEvent(normalizedEvent, rule);

      // Update metrics
      this.updateMetrics(rawData.platform, Date.now() - startTime, true);
      this.metrics.successfulNormalizations++;

      return normalizedEvent;

    } catch (error) {
      this.updateMetrics(rawData.platform, Date.now() - startTime, false);
      this.metrics.failedNormalizations++;
      
      const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
      this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1;
      
      throw new Error(`Failed to normalize event from ${rawData.platform}: ${error}`);
    }
  }

  /**
   * Batch normalize multiple raw data items
   */
  async normalizeBatch(rawDataItems: RawPlatformData[]): Promise<{
    successful: SocialEvent[];
    failed: Array<{ rawData: RawPlatformData; error: Error }>;
  }> {
    const successful: SocialEvent[] = [];
    const failed: Array<{ rawData: RawPlatformData; error: Error }> = [];

    // Process items in parallel with concurrency limit
    const concurrencyLimit = 10;
    const chunks = this.chunkArray(rawDataItems, concurrencyLimit);

    for (const chunk of chunks) {
      const promises = chunk.map(async (rawData) => {
        try {
          const normalized = await this.normalize(rawData);
          return { success: true, data: normalized, rawData };
        } catch (error) {
          return { success: false, error: error as Error, rawData };
        }
      });

      const results = await Promise.all(promises);
      
      results.forEach(result => {
        if (result.success) {
          successful.push(result.data);
        } else {
          failed.push({ rawData: result.rawData, error: result.error });
        }
      });
    }

    return { successful, failed };
  }

  /**
   * Apply normalization rule to raw data
   */
  private async applyNormalizationRule(rawData: RawPlatformData, rule: NormalizationRule): Promise<SocialEvent> {
    const data = rawData.data;
    
    // Generate unique event ID
    const eventId = this.generateEventId(rawData);
    
    // Apply field mappings
    const mappedFields = this.applyFieldMappings(data, rule.fieldMappings);
    
    // Create base event structure
    const event: SocialEvent = {
      id: eventId,
      platform: rawData.platform,
      platformId: rawData.id,
      timestamp: rawData.timestamp,
      eventType: this.determineEventType(data, rawData.platform),
      content: {
        text: this.normalizeText(mappedFields.text || ''),
        mediaUrls: this.normalizeMediaUrls(mappedFields.mediaUrls || []),
        hashtags: this.extractHashtags(mappedFields.text || ''),
        mentions: this.extractMentions(mappedFields.text || ''),
        language: mappedFields.language || 'en'
      },
      author: {
        id: mappedFields.authorId || 'unknown',
        username: mappedFields.authorUsername || 'unknown',
        displayName: mappedFields.authorDisplayName || 'Unknown User',
        followerCount: Math.max(0, mappedFields.authorFollowerCount || 0),
        verified: Boolean(mappedFields.authorVerified),
        profileUrl: mappedFields.authorProfileUrl
      },
      engagement: {
        likes: Math.max(0, mappedFields.likes || 0),
        shares: Math.max(0, mappedFields.shares || 0),
        comments: Math.max(0, mappedFields.comments || 0),
        views: Math.max(0, mappedFields.views || 0),
        engagementRate: this.calculateEngagementRate(mappedFields)
      },
      context: this.buildContext(data, rawData.platform),
      location: this.extractLocation(data, rawData.platform),
      metadata: {
        source: 'normalization_service',
        processingTimestamp: new Date().toISOString(),
        version: '1.0',
        originalPlatform: rawData.platform,
        rawDataPreserved: true
      }
    };

    // Apply platform-specific transformations
    for (const [field, transformer] of Object.entries(rule.transformations)) {
      if (field in event) {
        (event as any)[field] = transformer((event as any)[field], data);
      }
    }

    return event;
  }

  /**
   * Apply field mappings from raw data
   */
  private applyFieldMappings(data: any, mappings: Record<string, string | ((data: any) => any)>): Record<string, any> {
    const mapped: Record<string, any> = {};

    for (const [targetField, source] of Object.entries(mappings)) {
      if (typeof source === 'function') {
        mapped[targetField] = source(data);
      } else if (typeof source === 'string') {
        mapped[targetField] = this.getNestedValue(data, source);
      }
    }

    return mapped;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(rawData: RawPlatformData): string {
    const timestamp = Date.now();
    const hash = this.simpleHash(JSON.stringify(rawData));
    return `${rawData.platform}_${rawData.id}_${timestamp}_${hash}`;
  }

  /**
   * Simple hash function for generating IDs
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Determine event type from platform data
   */
  private determineEventType(data: any, platform: Platform): EventType {
    // Platform-specific event type determination
    switch (platform) {
      case Platform.TIKTOK:
        if (data.comment_id || data.parent_id) return EventType.COMMENT;
        if (data.video_id || data.cover_image_url) return EventType.POST;
        return EventType.POST;

      case Platform.INSTAGRAM:
      case Platform.FACEBOOK:
        if (data.parent || data.parent_id) return EventType.COMMENT;
        if (data.type === 'status' || data.message || data.caption) return EventType.POST;
        return EventType.POST;

      case Platform.YOUTUBE:
        if (data.kind === 'youtube#commentThread' || data.kind === 'youtube#comment') return EventType.COMMENT;
        if (data.kind === 'youtube#video' || data.id?.videoId) return EventType.POST;
        return EventType.POST;

      case Platform.REDDIT:
        if (data.parent_id) return EventType.COMMENT;
        return EventType.POST;

      case Platform.RSS:
        return EventType.POST;

      default:
        return EventType.POST;
    }
  }

  /**
   * Normalize text content
   */
  private normalizeText(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[\r\n]+/g, ' ') // Replace line breaks with spaces
      .trim()
      .substring(0, 5000); // Limit length
  }

  /**
   * Normalize media URLs
   */
  private normalizeMediaUrls(urls: any): string[] {
    if (!Array.isArray(urls)) {
      urls = urls ? [urls] : [];
    }
    
    return urls
      .filter((url: any) => typeof url === 'string' && url.length > 0)
      .map((url: string) => url.trim())
      .filter((url: string) => this.isValidUrl(url))
      .slice(0, 10); // Limit to 10 URLs
  }

  /**
   * Check if URL is valid
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract hashtags from text
   */
  private extractHashtags(text: string): string[] {
    if (!text) return [];
    
    const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
    const hashtags = text.match(hashtagRegex) || [];
    
    return [...new Set(hashtags)] // Remove duplicates
      .slice(0, 20); // Limit to 20 hashtags
  }

  /**
   * Extract mentions from text
   */
  private extractMentions(text: string): string[] {
    if (!text) return [];
    
    const mentionRegex = /@[\w\u0590-\u05ff]+/g;
    const mentions = text.match(mentionRegex) || [];
    
    return [...new Set(mentions)] // Remove duplicates
      .slice(0, 20); // Limit to 20 mentions
  }

  /**
   * Calculate engagement rate
   */
  private calculateEngagementRate(mappedFields: Record<string, any>): number {
    const likes = mappedFields.likes || 0;
    const comments = mappedFields.comments || 0;
    const shares = mappedFields.shares || 0;
    const views = mappedFields.views || 0;

    if (views === 0) return 0;

    const totalEngagements = likes + comments + shares;
    return Math.min(totalEngagements / views, 1); // Cap at 100%
  }

  /**
   * Build context object
   */
  private buildContext(data: any, platform: Platform): SocialEvent['context'] {
    const context: SocialEvent['context'] = {
      isReply: false
    };

    // Platform-specific context building
    switch (platform) {
      case Platform.REDDIT:
        if (data.parent_id) {
          context.parentPostId = data.parent_id.replace(/^t[13]_/, '');
          context.threadId = data.link_id?.replace(/^t3_/, '');
          context.isReply = true;
        } else {
          context.threadId = data.id;
        }
        break;

      case Platform.YOUTUBE:
        if (data.parentId) {
          context.parentPostId = data.parentId;
          context.isReply = true;
        }
        break;

      case Platform.TIKTOK:
      case Platform.INSTAGRAM:
      case Platform.FACEBOOK:
        if (data.parent_id || data.parent) {
          context.parentPostId = data.parent_id || data.parent?.id;
          context.isReply = true;
        }
        break;

      case Platform.RSS:
        context.threadId = data.guid || data.link;
        break;
    }

    return context;
  }

  /**
   * Extract location information
   */
  private extractLocation(data: any, platform: Platform): SocialEvent['location'] {
    const location: SocialEvent['location'] = {};

    switch (platform) {
      case Platform.REDDIT:
        if (data.subreddit) {
          location.region = data.subreddit;
        }
        break;

      case Platform.RSS:
        if (data.link) {
          location.url = data.link;
        }
        break;

      // Other platforms might have location data in different formats
      default:
        if (data.location) {
          location.coordinates = data.location;
        }
        if (data.place) {
          location.region = data.place.name;
        }
        break;
    }

    return Object.keys(location).length > 0 ? location : undefined;
  }

  /**
   * Create data lineage record
   */
  private createDataLineage(rawData: RawPlatformData, transformations: string[]): DataLineage {
    return {
      sourceId: rawData.id,
      sourcePlatform: rawData.platform,
      ingestionTimestamp: rawData.timestamp,
      normalizationTimestamp: new Date().toISOString(),
      transformationsApplied: transformations,
      originalDataHash: this.simpleHash(JSON.stringify(rawData.data)),
      version: '1.0'
    };
  }

  /**
   * Validate normalized event
   */
  private validateNormalizedEvent(event: SocialEvent, rule: NormalizationRule): void {
    for (const validation of rule.validations) {
      if (!validation(event)) {
        throw new Error(`Validation failed for event ${event.id}`);
      }
    }

    // Basic validations
    if (!event.id || !event.platform || !event.platformId) {
      throw new Error('Missing required fields in normalized event');
    }

    if (event.engagement.engagementRate < 0 || event.engagement.engagementRate > 1) {
      throw new Error('Invalid engagement rate');
    }
  }

  /**
   * Update metrics
   */
  private updateMetrics(platform: Platform, processingTime: number, success: boolean): void {
    // Update platform breakdown
    if (!this.metrics.platformBreakdown[platform]) {
      this.metrics.platformBreakdown[platform] = {
        processed: 0,
        successful: 0,
        failed: 0
      };
    }

    this.metrics.platformBreakdown[platform].processed++;
    if (success) {
      this.metrics.platformBreakdown[platform].successful++;
    } else {
      this.metrics.platformBreakdown[platform].failed++;
    }

    // Update average processing time
    const totalTime = this.metrics.averageProcessingTime * (this.metrics.totalProcessed - 1) + processingTime;
    this.metrics.averageProcessingTime = totalTime / this.metrics.totalProcessed;
  }

  /**
   * Initialize default normalization rules
   */
  private initializeDefaultRules(): void {
    // TikTok normalization rule
    this.rules.set(Platform.TIKTOK, {
      platform: Platform.TIKTOK,
      fieldMappings: {
        text: (data: any) => data.title || data.text || '',
        mediaUrls: (data: any) => data.cover_image_url ? [data.cover_image_url] : [],
        authorId: (data: any) => data.author_id || data.user_id || 'unknown',
        authorUsername: (data: any) => data.username || data.author_username || 'unknown',
        authorDisplayName: (data: any) => data.display_name || data.author_display_name || 'Unknown User',
        authorFollowerCount: (data: any) => data.follower_count || 0,
        authorVerified: (data: any) => data.verified || false,
        authorProfileUrl: 'profile_url',
        likes: 'like_count',
        comments: 'comment_count',
        shares: 'share_count',
        views: (data: any) => data.video_views || data.view_count || 0
      },
      transformations: {},
      validations: [
        (event: SocialEvent) => event.platform === Platform.TIKTOK,
        (event: SocialEvent) => event.engagement.engagementRate >= 0 && event.engagement.engagementRate <= 1
      ]
    });

    // Add rules for other platforms...
    this.initializeMetaRules();
    this.initializeYouTubeRules();
    this.initializeRedditRules();
    this.initializeRSSRules();
  }

  /**
   * Initialize Meta (Instagram/Facebook) rules
   */
  private initializeMetaRules(): void {
    const metaRule: NormalizationRule = {
      platform: Platform.INSTAGRAM, // Will be overridden per platform
      fieldMappings: {
        text: (data: any) => data.message || data.caption || data.story || '',
        mediaUrls: (data: any) => {
          const urls: string[] = [];
          if (data.media_url) urls.push(data.media_url);
          if (data.thumbnail_url) urls.push(data.thumbnail_url);
          if (data.picture) urls.push(data.picture);
          if (data.full_picture) urls.push(data.full_picture);
          return urls;
        },
        authorId: (data: any) => data.from?.id || data.user_id || 'unknown',
        authorUsername: (data: any) => data.from?.username || data.username || 'unknown',
        authorDisplayName: (data: any) => data.from?.name || data.username || 'Unknown User',
        authorProfileUrl: (data: any) => data.from?.link,
        likes: (data: any) => data.like_count || data.likes?.summary?.total_count || 0,
        comments: (data: any) => data.comments_count || data.comments?.summary?.total_count || 0,
        shares: (data: any) => data.shares?.count || 0,
        views: 0
      },
      transformations: {},
      validations: [
        (event: SocialEvent) => [Platform.INSTAGRAM, Platform.FACEBOOK].includes(event.platform),
        (event: SocialEvent) => event.engagement.engagementRate >= 0 && event.engagement.engagementRate <= 1
      ]
    };

    this.rules.set(Platform.INSTAGRAM, { ...metaRule, platform: Platform.INSTAGRAM });
    this.rules.set(Platform.FACEBOOK, { ...metaRule, platform: Platform.FACEBOOK });
  }

  /**
   * Initialize YouTube rules
   */
  private initializeYouTubeRules(): void {
    this.rules.set(Platform.YOUTUBE, {
      platform: Platform.YOUTUBE,
      fieldMappings: {
        text: (data: any) => {
          const snippet = data.snippet;
          return snippet ? `${snippet.title} ${snippet.description || ''}` : '';
        },
        mediaUrls: (data: any) => {
          const urls: string[] = [];
          const snippet = data.snippet;
          if (snippet?.thumbnails) {
            if (snippet.thumbnails.maxres) urls.push(snippet.thumbnails.maxres.url);
            if (snippet.thumbnails.high) urls.push(snippet.thumbnails.high.url);
            if (snippet.thumbnails.medium) urls.push(snippet.thumbnails.medium.url);
            if (snippet.thumbnails.default) urls.push(snippet.thumbnails.default.url);
          }
          return urls;
        },
        authorId: (data: any) => data.snippet?.channelId || 'unknown',
        authorUsername: (data: any) => data.snippet?.channelTitle || 'unknown',
        authorDisplayName: (data: any) => data.snippet?.channelTitle || 'Unknown Channel',
        authorProfileUrl: (data: any) => data.snippet?.channelId ? `https://www.youtube.com/channel/${data.snippet.channelId}` : undefined,
        language: (data: any) => data.snippet?.defaultLanguage || data.snippet?.defaultAudioLanguage || 'en',
        likes: 0, // Would need additional API call
        comments: 0, // Would need additional API call
        shares: 0,
        views: 0 // Would need additional API call
      },
      transformations: {},
      validations: [
        (event: SocialEvent) => event.platform === Platform.YOUTUBE
      ]
    });
  }

  /**
   * Initialize Reddit rules
   */
  private initializeRedditRules(): void {
    this.rules.set(Platform.REDDIT, {
      platform: Platform.REDDIT,
      fieldMappings: {
        text: (data: any) => `${data.title || ''} ${data.selftext || ''}`.trim(),
        mediaUrls: (data: any) => {
          const urls: string[] = [];
          if (data.url && this.isMediaUrl(data.url)) urls.push(data.url);
          if (data.thumbnail && !['self', 'default'].includes(data.thumbnail)) urls.push(data.thumbnail);
          if (data.preview?.images) {
            data.preview.images.forEach((image: any) => {
              if (image.source?.url) {
                urls.push(image.source.url.replace(/&amp;/g, '&'));
              }
            });
          }
          return urls;
        },
        authorId: 'author',
        authorUsername: 'author',
        authorDisplayName: 'author',
        authorVerified: 'is_verified',
        authorProfileUrl: (data: any) => `https://www.reddit.com/user/${data.author}`,
        likes: (data: any) => Math.max(0, data.ups || 0),
        comments: 'num_comments',
        shares: 0,
        views: 0
      },
      transformations: {
        engagement: (engagement: any, data: any) => ({
          ...engagement,
          engagementRate: this.calculateRedditEngagementRate(data)
        })
      },
      validations: [
        (event: SocialEvent) => event.platform === Platform.REDDIT
      ]
    });
  }

  /**
   * Initialize RSS rules
   */
  private initializeRSSRules(): void {
    this.rules.set(Platform.RSS, {
      platform: Platform.RSS,
      fieldMappings: {
        text: (data: any) => `${data.title || ''}\n\n${data.content || data.description || ''}`.trim(),
        mediaUrls: (data: any) => this.extractRSSMediaUrls(data.content || data.description || ''),
        authorId: (data: any) => data.author || data.feedTitle || 'unknown',
        authorUsername: (data: any) => data.author || data.feedTitle || 'unknown',
        authorDisplayName: (data: any) => data.author || data.feedTitle || 'Unknown Author',
        authorProfileUrl: 'feedUrl',
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0
      },
      transformations: {},
      validations: [
        (event: SocialEvent) => event.platform === Platform.RSS
      ]
    });
  }

  /**
   * Check if URL is a media URL (for Reddit)
   */
  private isMediaUrl(url: string): boolean {
    const mediaExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm'];
    const mediaDomains = ['i.redd.it', 'v.redd.it', 'imgur.com', 'gfycat.com'];
    
    return mediaExtensions.some(ext => url.toLowerCase().includes(ext)) ||
           mediaDomains.some(domain => url.includes(domain));
  }

  /**
   * Calculate Reddit-specific engagement rate
   */
  private calculateRedditEngagementRate(data: any): number {
    const upvotes = Math.max(0, data.ups || 0);
    const downvotes = Math.max(0, data.downs || 0);
    const comments = data.num_comments || 0;
    
    const totalVotes = upvotes + downvotes;
    if (totalVotes === 0) return 0;
    
    const upvoteRatio = upvotes / totalVotes;
    const commentRatio = Math.min(comments / Math.max(totalVotes, 1), 1);
    
    return (upvoteRatio * 0.7 + commentRatio * 0.3);
  }

  /**
   * Extract media URLs from RSS content
   */
  private extractRSSMediaUrls(content: string): string[] {
    const urls: string[] = [];
    
    // Extract image URLs from HTML
    const imgMatches = content.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi) || [];
    imgMatches.forEach(match => {
      const srcMatch = match.match(/src=["']([^"']+)["']/i);
      if (srcMatch && srcMatch[1]) {
        urls.push(srcMatch[1]);
      }
    });

    // Extract video URLs
    const videoMatches = content.match(/<video[^>]+src=["']([^"']+)["'][^>]*>/gi) || [];
    videoMatches.forEach(match => {
      const srcMatch = match.match(/src=["']([^"']+)["']/i);
      if (srcMatch && srcMatch[1]) {
        urls.push(srcMatch[1]);
      }
    });

    return urls;
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Get current metrics
   */
  getMetrics(): NormalizationMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalProcessed: 0,
      successfulNormalizations: 0,
      failedNormalizations: 0,
      averageProcessingTime: 0,
      errorsByType: {},
      platformBreakdown: {} as Record<Platform, any>
    };
  }

  /**
   * Add custom normalization rule
   */
  addNormalizationRule(rule: NormalizationRule): void {
    this.rules.set(rule.platform, rule);
  }

  /**
   * Get normalization rule for platform
   */
  getNormalizationRule(platform: Platform): NormalizationRule | undefined {
    return this.rules.get(platform);
  }
}