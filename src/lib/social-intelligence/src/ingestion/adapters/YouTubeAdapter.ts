/**
 * YouTube Data API Adapter
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

export class YouTubeAdapter extends BaseAdapter {
  private readonly baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor(config: AdapterConfig) {
    super(Platform.YOUTUBE, config);
  }

  /**
   * Authenticate with YouTube Data API
   */
  async authenticate(): Promise<AuthToken> {
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    
    const params = {
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'client_credentials',
      scope: 'https://www.googleapis.com/auth/youtube.readonly'
    };

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`YouTube authentication failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`YouTube API error: ${data.error_description}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope?.split(' ') || [],
      platform: Platform.YOUTUBE,
      tokenType: 'Bearer'
    };
  }

  /**
   * Refresh YouTube access token
   */
  async refreshToken(token: AuthToken): Promise<AuthToken> {
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    
    const params = {
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken!,
    };

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`YouTube token refresh failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`YouTube API error: ${data.error_description}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || token.refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope?.split(' ') || token.scopes,
      platform: Platform.YOUTUBE,
      tokenType: 'Bearer'
    };
  }

  /**
   * Fetch data from YouTube Data API
   */
  async fetchData(params: FetchParams): Promise<FetchResult> {
    const results: RawPlatformData[] = [];
    
    // Search for videos based on keywords/hashtags
    if (params.keywords || params.hashtags) {
      const searchData = await this.searchVideos(params);
      results.push(...searchData.data);
    }

    // Fetch channel videos (if channel ID is configured)
    const channelData = await this.fetchChannelVideos(params);
    results.push(...channelData.data);

    // Fetch comments for videos
    const commentsData = await this.fetchVideoComments(params);
    results.push(...commentsData.data);

    return {
      data: results,
      nextCursor: channelData.nextCursor || commentsData.nextCursor,
      hasMore: channelData.hasMore || commentsData.hasMore,
      rateLimit: channelData.rateLimit
    };
  }

  /**
   * Search for YouTube videos
   */
  private async searchVideos(params: FetchParams): Promise<FetchResult> {
    const url = `${this.baseUrl}/search`;
    
    const searchTerms = [
      ...(params.keywords || []),
      ...(params.hashtags || [])
    ].join(' ');

    const queryParams = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      q: searchTerms,
      ...(params.limit && { maxResults: Math.min(params.limit, 50).toString() }),
      ...(params.cursor && { pageToken: params.cursor }),
      ...(params.since && { publishedAfter: params.since.toISOString() }),
      ...(params.until && { publishedBefore: params.until.toISOString() }),
      order: 'date'
    });

    const response = await this.makeRequest(`${url}?${queryParams}`);
    const data = await response.json();

    if (data.error) {
      throw new Error(`YouTube API error: ${data.error.message}`);
    }

    const rawData: RawPlatformData[] = data.items.map((item: any) => ({
      id: item.id.videoId,
      platform: Platform.YOUTUBE,
      timestamp: this.parseTimestamp(item.snippet.publishedAt),
      type: 'video',
      data: item,
      metadata: {
        source: 'search_api',
        endpoint: 'search'
      }
    }));

    return {
      data: rawData,
      nextCursor: data.nextPageToken,
      hasMore: !!data.nextPageToken,
      rateLimit: this.extractRateLimit(response)
    };
  }

  /**
   * Fetch videos from a specific channel
   */
  private async fetchChannelVideos(params: FetchParams): Promise<FetchResult> {
    // Note: This requires a channel ID to be configured
    const channelId = 'UC_x5XG1OV2P6uZZ5FSM9Ttw'; // Should be configurable
    const url = `${this.baseUrl}/search`;
    
    const queryParams = new URLSearchParams({
      part: 'snippet',
      channelId: channelId,
      type: 'video',
      ...(params.limit && { maxResults: Math.min(params.limit, 50).toString() }),
      ...(params.cursor && { pageToken: params.cursor }),
      ...(params.since && { publishedAfter: params.since.toISOString() }),
      ...(params.until && { publishedBefore: params.until.toISOString() }),
      order: 'date'
    });

    const response = await this.makeRequest(`${url}?${queryParams}`);
    const data = await response.json();

    if (data.error) {
      throw new Error(`YouTube API error: ${data.error.message}`);
    }

    const rawData: RawPlatformData[] = data.items.map((item: any) => ({
      id: item.id.videoId,
      platform: Platform.YOUTUBE,
      timestamp: this.parseTimestamp(item.snippet.publishedAt),
      type: 'video',
      data: item,
      metadata: {
        source: 'channel_api',
        endpoint: 'search',
        channelId
      }
    }));

    return {
      data: rawData,
      nextCursor: data.nextPageToken,
      hasMore: !!data.nextPageToken,
      rateLimit: this.extractRateLimit(response)
    };
  }

  /**
   * Fetch comments for YouTube videos
   */
  private async fetchVideoComments(params: FetchParams): Promise<FetchResult> {
    // This would require video IDs from previous video fetches
    // For now, return empty result as comments require specific video IDs
    return {
      data: [],
      hasMore: false
    };
  }

  /**
   * Normalize YouTube data to SocialEvent format
   */
  async normalizeData(rawData: RawPlatformData): Promise<SocialEvent> {
    const data = rawData.data;
    const snippet = data.snippet;
    
    return {
      id: this.generateEventId(rawData.id),
      platform: Platform.YOUTUBE,
      platformId: rawData.id,
      timestamp: rawData.timestamp,
      eventType: this.determineEventType(data),
      content: {
        text: this.normalizeText(snippet.title + ' ' + (snippet.description || '')),
        mediaUrls: this.extractMediaUrls(snippet),
        hashtags: this.extractHashtags(snippet.description || ''),
        mentions: this.extractMentions(snippet.description || ''),
        language: snippet.defaultLanguage || snippet.defaultAudioLanguage || 'en'
      },
      author: {
        id: snippet.channelId,
        username: snippet.channelTitle,
        displayName: snippet.channelTitle,
        followerCount: 0, // Would need additional API call to get subscriber count
        verified: false, // Would need additional API call
        profileUrl: `https://www.youtube.com/channel/${snippet.channelId}`
      },
      engagement: {
        likes: 0, // Would need additional API call to get video statistics
        shares: 0, // Not available in basic API response
        comments: 0, // Would need additional API call
        views: 0, // Would need additional API call to get video statistics
        engagementRate: 0 // Cannot calculate without view/engagement data
      },
      context: rawData.type === 'comment' ? {
        parentPostId: data.parentId,
        isReply: !!data.parentId
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
   * Extract media URLs from YouTube data
   */
  private extractMediaUrls(snippet: any): string[] {
    const urls: string[] = [];
    
    if (snippet.thumbnails) {
      // Add thumbnail URLs in order of quality
      if (snippet.thumbnails.maxres) urls.push(snippet.thumbnails.maxres.url);
      if (snippet.thumbnails.high) urls.push(snippet.thumbnails.high.url);
      if (snippet.thumbnails.medium) urls.push(snippet.thumbnails.medium.url);
      if (snippet.thumbnails.default) urls.push(snippet.thumbnails.default.url);
    }
    
    return urls;
  }

  /**
   * Extract rate limit information from response headers
   */
  private extractRateLimit(response: Response) {
    const quotaUser = response.headers.get('x-goog-quota-user');
    const quotaUsed = response.headers.get('x-goog-quota-used');
    
    if (quotaUsed) {
      // YouTube uses quota units, with 10,000 units per day by default
      const used = parseInt(quotaUsed);
      const dailyQuota = 10000;
      
      return {
        remaining: Math.max(0, dailyQuota - used),
        resetTime: new Date(new Date().setHours(24, 0, 0, 0)) // Resets at midnight PST
      };
    }
    
    return undefined;
  }

  /**
   * Determine YouTube-specific event type
   */
  protected determineEventType(data: any): EventType {
    if (data.kind === 'youtube#commentThread' || data.kind === 'youtube#comment') {
      return EventType.COMMENT;
    }
    
    if (data.kind === 'youtube#video' || data.id?.videoId) {
      return EventType.POST;
    }
    
    return EventType.POST;
  }
}