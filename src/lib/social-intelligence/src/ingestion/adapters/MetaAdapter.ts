/**
 * Meta API Adapter for Instagram and Facebook Pages
 */

import { Platform, SocialEvent, EventType } from '../../types/core';
import { AuthToken } from '../../auth/types';
import { BaseAdapter } from '../BaseAdapter';
import { 
  RawPlatformData, 
  FetchParams, 
  FetchResult, 
  AdapterConfig,
  WebhookCallback 
} from '../types';

export class MetaAdapter extends BaseAdapter {
  private readonly baseUrl = 'https://graph.facebook.com/v18.0';
  private targetPlatform: Platform.INSTAGRAM | Platform.FACEBOOK;

  constructor(config: AdapterConfig, targetPlatform: Platform.INSTAGRAM | Platform.FACEBOOK = Platform.INSTAGRAM) {
    super(targetPlatform, config);
    this.targetPlatform = targetPlatform;
  }

  /**
   * Authenticate with Meta API
   */
  async authenticate(): Promise<AuthToken> {
    const tokenUrl = `${this.baseUrl}/oauth/access_token`;
    
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'client_credentials',
    });

    const response = await fetch(`${tokenUrl}?${params}`);

    if (!response.ok) {
      throw new Error(`Meta authentication failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Meta API error: ${data.error.message}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
      scopes: [],
      platform: this.targetPlatform,
      tokenType: 'Bearer'
    };
  }

  /**
   * Refresh Meta access token
   */
  async refreshToken(token: AuthToken): Promise<AuthToken> {
    const tokenUrl = `${this.baseUrl}/oauth/access_token`;
    
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      fb_exchange_token: token.accessToken,
    });

    const response = await fetch(`${tokenUrl}?${params}`);

    if (!response.ok) {
      throw new Error(`Meta token refresh failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Meta API error: ${data.error.message}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: token.refreshToken,
      expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
      scopes: token.scopes,
      platform: this.targetPlatform,
      tokenType: 'Bearer'
    };
  }

  /**
   * Fetch data from Meta API
   */
  async fetchData(params: FetchParams): Promise<FetchResult> {
    if (this.targetPlatform === Platform.INSTAGRAM) {
      return this.fetchInstagramData(params);
    } else {
      return this.fetchFacebookData(params);
    }
  }

  /**
   * Fetch Instagram data
   */
  private async fetchInstagramData(params: FetchParams): Promise<FetchResult> {
    const results: RawPlatformData[] = [];
    
    // Fetch Instagram posts
    const postsData = await this.fetchInstagramPosts(params);
    results.push(...postsData.data);

    // Fetch comments for recent posts
    const commentsData = await this.fetchInstagramComments(params);
    results.push(...commentsData.data);

    return {
      data: results,
      nextCursor: postsData.nextCursor || commentsData.nextCursor,
      hasMore: postsData.hasMore || commentsData.hasMore,
      rateLimit: postsData.rateLimit
    };
  }

  /**
   * Fetch Facebook Page data
   */
  private async fetchFacebookData(params: FetchParams): Promise<FetchResult> {
    const results: RawPlatformData[] = [];
    
    // Fetch Facebook page posts
    const postsData = await this.fetchFacebookPosts(params);
    results.push(...postsData.data);

    // Fetch comments
    const commentsData = await this.fetchFacebookComments(params);
    results.push(...commentsData.data);

    return {
      data: results,
      nextCursor: postsData.nextCursor || commentsData.nextCursor,
      hasMore: postsData.hasMore || commentsData.hasMore,
      rateLimit: postsData.rateLimit
    };
  }

  /**
   * Fetch Instagram posts
   */
  private async fetchInstagramPosts(params: FetchParams): Promise<FetchResult> {
    // Note: This requires an Instagram Business Account ID
    const accountId = 'me'; // Should be configured
    const url = `${this.baseUrl}/${accountId}/media`;
    
    const queryParams = new URLSearchParams({
      fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,username',
      ...(params.limit && { limit: params.limit.toString() }),
      ...(params.cursor && { after: params.cursor }),
      ...(params.since && { since: Math.floor(params.since.getTime() / 1000).toString() }),
      ...(params.until && { until: Math.floor(params.until.getTime() / 1000).toString() })
    });

    const response = await this.makeRequest(`${url}?${queryParams}`);
    const data = await response.json();

    if (data.error) {
      throw new Error(`Instagram API error: ${data.error.message}`);
    }

    const rawData: RawPlatformData[] = data.data.map((item: any) => ({
      id: item.id,
      platform: Platform.INSTAGRAM,
      timestamp: this.parseTimestamp(item.timestamp),
      type: 'post',
      data: item,
      metadata: {
        source: 'graph_api',
        endpoint: 'media'
      }
    }));

    return {
      data: rawData,
      nextCursor: data.paging?.cursors?.after,
      hasMore: !!data.paging?.next,
      rateLimit: this.extractRateLimit(response)
    };
  }

  /**
   * Fetch Instagram comments
   */
  private async fetchInstagramComments(params: FetchParams): Promise<FetchResult> {
    // This would require media IDs from previous posts fetch
    // For now, return empty result
    return {
      data: [],
      hasMore: false
    };
  }

  /**
   * Fetch Facebook page posts
   */
  private async fetchFacebookPosts(params: FetchParams): Promise<FetchResult> {
    // Note: This requires a Facebook Page ID
    const pageId = 'me'; // Should be configured
    const url = `${this.baseUrl}/${pageId}/posts`;
    
    const queryParams = new URLSearchParams({
      fields: 'id,message,story,created_time,updated_time,type,link,picture,full_picture,likes.summary(true),comments.summary(true),shares',
      ...(params.limit && { limit: params.limit.toString() }),
      ...(params.cursor && { after: params.cursor }),
      ...(params.since && { since: Math.floor(params.since.getTime() / 1000).toString() }),
      ...(params.until && { until: Math.floor(params.until.getTime() / 1000).toString() })
    });

    const response = await this.makeRequest(`${url}?${queryParams}`);
    const data = await response.json();

    if (data.error) {
      throw new Error(`Facebook API error: ${data.error.message}`);
    }

    const rawData: RawPlatformData[] = data.data.map((item: any) => ({
      id: item.id,
      platform: Platform.FACEBOOK,
      timestamp: this.parseTimestamp(item.created_time),
      type: 'post',
      data: item,
      metadata: {
        source: 'graph_api',
        endpoint: 'posts'
      }
    }));

    return {
      data: rawData,
      nextCursor: data.paging?.cursors?.after,
      hasMore: !!data.paging?.next,
      rateLimit: this.extractRateLimit(response)
    };
  }

  /**
   * Fetch Facebook comments
   */
  private async fetchFacebookComments(params: FetchParams): Promise<FetchResult> {
    // This would require post IDs from previous posts fetch
    // For now, return empty result
    return {
      data: [],
      hasMore: false
    };
  }

  /**
   * Subscribe to Meta webhooks
   */
  async subscribeToWebhooks(callback: WebhookCallback): Promise<void> {
    // Meta webhook subscription would be configured in the Facebook App settings
    // This method would handle incoming webhook data
    console.log(`Webhook subscription configured for ${this.targetPlatform}`);
  }

  /**
   * Normalize Meta data to SocialEvent format
   */
  async normalizeData(rawData: RawPlatformData): Promise<SocialEvent> {
    const data = rawData.data;
    
    return {
      id: this.generateEventId(rawData.id),
      platform: rawData.platform,
      platformId: rawData.id,
      timestamp: rawData.timestamp,
      eventType: this.determineEventType(data),
      content: {
        text: this.normalizeText(data.message || data.caption || data.story || ''),
        mediaUrls: this.extractMediaUrls(data),
        hashtags: this.extractHashtags(data.message || data.caption || ''),
        mentions: this.extractMentions(data.message || data.caption || ''),
        language: 'en' // Meta doesn't provide automatic language detection
      },
      author: {
        id: data.from?.id || data.user_id || 'unknown',
        username: data.from?.username || data.username || 'unknown',
        displayName: data.from?.name || data.username || 'Unknown User',
        followerCount: 0, // Not available in basic API response
        verified: false, // Would need additional API call
        profileUrl: data.from?.link
      },
      engagement: {
        likes: this.extractLikeCount(data),
        shares: data.shares?.count || 0,
        comments: this.extractCommentCount(data),
        views: 0, // Not available for all content types
        engagementRate: this.calculateEngagementRate(data)
      },
      context: rawData.type === 'comment' ? {
        parentPostId: data.parent?.id,
        isReply: true
      } : undefined,
      metadata: {
        source: 'api',
        processingTimestamp: new Date().toISOString(),
        version: '1.0',
        rawData: JSON.stringify(rawData.data)
      }
    };
  }

  /**
   * Extract media URLs from Meta data
   */
  private extractMediaUrls(data: any): string[] {
    const urls: string[] = [];
    
    if (data.media_url) urls.push(data.media_url);
    if (data.thumbnail_url) urls.push(data.thumbnail_url);
    if (data.picture) urls.push(data.picture);
    if (data.full_picture) urls.push(data.full_picture);
    
    return urls;
  }

  /**
   * Extract like count from Meta data
   */
  private extractLikeCount(data: any): number {
    if (data.like_count) return data.like_count;
    if (data.likes?.summary?.total_count) return data.likes.summary.total_count;
    return 0;
  }

  /**
   * Extract comment count from Meta data
   */
  private extractCommentCount(data: any): number {
    if (data.comments_count) return data.comments_count;
    if (data.comments?.summary?.total_count) return data.comments.summary.total_count;
    return 0;
  }

  /**
   * Calculate engagement rate for Meta content
   */
  private calculateEngagementRate(data: any): number {
    // For Meta platforms, we don't always have view counts
    // Use follower count or estimate based on reach if available
    const likes = this.extractLikeCount(data);
    const comments = this.extractCommentCount(data);
    const shares = data.shares?.count || 0;
    
    const totalEngagements = likes + comments + shares;
    
    // Without view/reach data, return a normalized engagement score
    return Math.min(totalEngagements / 1000, 1); // Normalize to max 1.0
  }

  /**
   * Extract rate limit information from response headers
   */
  private extractRateLimit(response: Response) {
    const usage = response.headers.get('x-business-use-case-usage');
    const appUsage = response.headers.get('x-app-usage');
    
    if (usage || appUsage) {
      // Meta uses percentage-based rate limiting
      const usageData = JSON.parse(usage || appUsage || '{}');
      return {
        remaining: 100 - (usageData.call_count || 0),
        resetTime: new Date(Date.now() + 60 * 60 * 1000) // Resets hourly
      };
    }
    
    return undefined;
  }

  /**
   * Determine Meta-specific event type
   */
  protected determineEventType(data: any): EventType {
    if (data.parent || data.parent_id) {
      return EventType.COMMENT;
    }
    
    if (data.type === 'status' || data.message || data.caption) {
      return EventType.POST;
    }
    
    if (data.type === 'photo' || data.type === 'video') {
      return EventType.POST;
    }
    
    return EventType.POST;
  }
}