/**
 * TikTok Business API Adapter
 */

import { Platform, SocialEvent, EventType } from '../../types/core';
import { AuthToken } from '../../auth/types';
import { BaseAdapter } from '../BaseAdapter';
import { 
  RawPlatformData, 
  FetchParams, 
  FetchResult, 
  AdapterConfig 
} from '../types';

export class TikTokAdapter extends BaseAdapter {
  private readonly baseUrl = 'https://business-api.tiktok.com/open_api/v1.3';

  constructor(config: AdapterConfig) {
    super(Platform.TIKTOK, config);
  }

  /**
   * Authenticate with TikTok Business API
   */
  async authenticate(): Promise<AuthToken> {
    const tokenUrl = `${this.baseUrl}/oauth2/access_token/`;
    
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'client_credentials',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      throw new Error(`TikTok authentication failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.code !== 0) {
      throw new Error(`TikTok API error: ${data.message}`);
    }

    return {
      accessToken: data.data.access_token,
      refreshToken: data.data.refresh_token,
      expiresAt: new Date(Date.now() + data.data.expires_in * 1000),
      scopes: data.data.scope?.split(',') || [],
      platform: Platform.TIKTOK,
      tokenType: 'Bearer'
    };
  }

  /**
   * Refresh TikTok access token
   */
  async refreshToken(token: AuthToken): Promise<AuthToken> {
    const tokenUrl = `${this.baseUrl}/oauth2/access_token/`;
    
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken!,
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      throw new Error(`TikTok token refresh failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.code !== 0) {
      throw new Error(`TikTok API error: ${data.message}`);
    }

    return {
      accessToken: data.data.access_token,
      refreshToken: data.data.refresh_token,
      expiresAt: new Date(Date.now() + data.data.expires_in * 1000),
      scopes: data.data.scope?.split(',') || [],
      platform: Platform.TIKTOK,
      tokenType: 'Bearer'
    };
  }

  /**
   * Fetch data from TikTok Business API
   */
  async fetchData(params: FetchParams): Promise<FetchResult> {
    const results: RawPlatformData[] = [];
    
    // Fetch business content
    const contentData = await this.fetchBusinessContent(params);
    results.push(...contentData.data);

    // Fetch comments for recent posts
    const commentsData = await this.fetchComments(params);
    results.push(...commentsData.data);

    return {
      data: results,
      nextCursor: contentData.nextCursor || commentsData.nextCursor,
      hasMore: contentData.hasMore || commentsData.hasMore,
      rateLimit: contentData.rateLimit
    };
  }

  /**
   * Fetch business content (posts, videos)
   */
  private async fetchBusinessContent(params: FetchParams): Promise<FetchResult> {
    const url = `${this.baseUrl}/business/get/`;
    
    const queryParams = new URLSearchParams({
      fields: 'id,create_time,update_time,video_id,title,cover_image_url,video_views,like_count,comment_count,share_count',
      ...(params.limit && { count: params.limit.toString() }),
      ...(params.cursor && { cursor: params.cursor }),
      ...(params.since && { start_time: Math.floor(params.since.getTime() / 1000).toString() }),
      ...(params.until && { end_time: Math.floor(params.until.getTime() / 1000).toString() })
    });

    const response = await this.makeRequest(`${url}?${queryParams}`);
    const data = await response.json();

    if (data.code !== 0) {
      throw new Error(`TikTok API error: ${data.message}`);
    }

    const rawData: RawPlatformData[] = data.data.list.map((item: any) => ({
      id: item.id,
      platform: Platform.TIKTOK,
      timestamp: this.parseTimestamp(item.create_time),
      type: 'post',
      data: item,
      metadata: {
        source: 'business_api',
        endpoint: 'business/get'
      }
    }));

    return {
      data: rawData,
      nextCursor: data.data.cursor,
      hasMore: data.data.has_more,
      rateLimit: this.extractRateLimit(response)
    };
  }

  /**
   * Fetch comments for posts
   */
  private async fetchComments(params: FetchParams): Promise<FetchResult> {
    // Note: This would require video IDs from previous content fetch
    // For now, return empty result as comments require specific video IDs
    return {
      data: [],
      hasMore: false
    };
  }

  /**
   * Normalize TikTok data to SocialEvent format
   */
  async normalizeData(rawData: RawPlatformData): Promise<SocialEvent> {
    const data = rawData.data;
    
    return {
      id: this.generateEventId(rawData.id),
      platform: Platform.TIKTOK,
      platformId: rawData.id,
      timestamp: rawData.timestamp,
      eventType: this.determineEventType(data),
      content: {
        text: this.normalizeText(data.title || data.text || ''),
        mediaUrls: data.cover_image_url ? [data.cover_image_url] : [],
        hashtags: this.extractHashtags(data.title || data.text || ''),
        mentions: this.extractMentions(data.title || data.text || ''),
        language: 'en' // TikTok doesn't provide language detection
      },
      author: {
        id: data.author_id || data.user_id || 'unknown',
        username: data.username || data.author_username || 'unknown',
        displayName: data.display_name || data.author_display_name || 'Unknown User',
        followerCount: data.follower_count || 0,
        verified: data.verified || false,
        profileUrl: data.profile_url
      },
      engagement: {
        likes: data.like_count || 0,
        shares: data.share_count || 0,
        comments: data.comment_count || 0,
        views: data.video_views || data.view_count || 0,
        engagementRate: this.calculateEngagementRate(data)
      },
      context: rawData.type === 'comment' ? {
        parentPostId: data.parent_id,
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
   * Calculate engagement rate for TikTok content
   */
  private calculateEngagementRate(data: any): number {
    const views = data.video_views || data.view_count || 0;
    if (views === 0) return 0;
    
    const engagements = (data.like_count || 0) + (data.comment_count || 0) + (data.share_count || 0);
    return Math.min(engagements / views, 1);
  }

  /**
   * Extract rate limit information from response headers
   */
  private extractRateLimit(response: Response) {
    const remaining = response.headers.get('x-rate-limit-remaining');
    const reset = response.headers.get('x-rate-limit-reset');
    
    if (remaining && reset) {
      return {
        remaining: parseInt(remaining),
        resetTime: new Date(parseInt(reset) * 1000)
      };
    }
    
    return undefined;
  }

  /**
   * Determine TikTok-specific event type
   */
  protected determineEventType(data: any): EventType {
    if (data.comment_id || data.parent_id) {
      return EventType.COMMENT;
    }
    
    if (data.video_id || data.cover_image_url) {
      return EventType.POST;
    }
    
    return EventType.POST;
  }
}