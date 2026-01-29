/**
 * Reddit API Adapter
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

export class RedditAdapter extends BaseAdapter {
  private readonly baseUrl = 'https://oauth.reddit.com';
  private readonly authUrl = 'https://www.reddit.com/api/v1/access_token';

  constructor(config: AdapterConfig) {
    super(Platform.REDDIT, config);
  }

  /**
   * Authenticate with Reddit API
   */
  async authenticate(): Promise<AuthToken> {
    const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
    
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
    });

    const response = await fetch(this.authUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'SocialIntelligence/1.0 by YourUsername',
      },
      body: params,
    });

    if (!response.ok) {
      throw new Error(`Reddit authentication failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Reddit API error: ${data.error_description || data.error}`);
    }

    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope?.split(' ') || [],
      platform: Platform.REDDIT,
      tokenType: data.token_type || 'Bearer'
    };
  }

  /**
   * Refresh Reddit access token (Reddit uses client credentials, so re-authenticate)
   */
  async refreshToken(token: AuthToken): Promise<AuthToken> {
    return this.authenticate();
  }

  /**
   * Fetch data from Reddit API
   */
  async fetchData(params: FetchParams): Promise<FetchResult> {
    const results: RawPlatformData[] = [];
    
    // Search for posts based on keywords
    if (params.keywords || params.hashtags) {
      const searchData = await this.searchPosts(params);
      results.push(...searchData.data);
    }

    // Fetch posts from specific subreddits
    const subredditData = await this.fetchSubredditPosts(params);
    results.push(...subredditData.data);

    // Fetch comments for posts
    const commentsData = await this.fetchPostComments(params);
    results.push(...commentsData.data);

    return {
      data: results,
      nextCursor: subredditData.nextCursor || commentsData.nextCursor,
      hasMore: subredditData.hasMore || commentsData.hasMore,
      rateLimit: subredditData.rateLimit
    };
  }

  /**
   * Search for Reddit posts
   */
  private async searchPosts(params: FetchParams): Promise<FetchResult> {
    const url = `${this.baseUrl}/search`;
    
    const searchTerms = [
      ...(params.keywords || []),
      ...(params.hashtags || [])
    ].join(' ');

    const queryParams = new URLSearchParams({
      q: searchTerms,
      type: 'link',
      sort: 'new',
      ...(params.limit && { limit: Math.min(params.limit, 100).toString() }),
      ...(params.cursor && { after: params.cursor }),
      t: 'day' // Time filter: day, week, month, year, all
    });

    const response = await this.makeRequest(`${url}?${queryParams}`);
    const data = await response.json();

    if (data.error) {
      throw new Error(`Reddit API error: ${data.message}`);
    }

    const rawData: RawPlatformData[] = data.data.children.map((item: any) => ({
      id: item.data.id,
      platform: Platform.REDDIT,
      timestamp: this.parseTimestamp(item.data.created_utc),
      type: 'post',
      data: item.data,
      metadata: {
        source: 'search_api',
        endpoint: 'search',
        subreddit: item.data.subreddit
      }
    }));

    return {
      data: rawData,
      nextCursor: data.data.after,
      hasMore: !!data.data.after,
      rateLimit: this.extractRateLimit(response)
    };
  }

  /**
   * Fetch posts from specific subreddits
   */
  private async fetchSubredditPosts(params: FetchParams): Promise<FetchResult> {
    // Default subreddits to monitor - should be configurable
    const subreddits = ['all']; // Could be ['technology', 'business', 'marketing']
    const subreddit = subreddits[0];
    
    const url = `${this.baseUrl}/r/${subreddit}/new`;
    
    const queryParams = new URLSearchParams({
      ...(params.limit && { limit: Math.min(params.limit, 100).toString() }),
      ...(params.cursor && { after: params.cursor })
    });

    const response = await this.makeRequest(`${url}?${queryParams}`);
    const data = await response.json();

    if (data.error) {
      throw new Error(`Reddit API error: ${data.message}`);
    }

    const rawData: RawPlatformData[] = data.data.children.map((item: any) => ({
      id: item.data.id,
      platform: Platform.REDDIT,
      timestamp: this.parseTimestamp(item.data.created_utc),
      type: 'post',
      data: item.data,
      metadata: {
        source: 'subreddit_api',
        endpoint: `r/${subreddit}/new`,
        subreddit: item.data.subreddit
      }
    }));

    return {
      data: rawData,
      nextCursor: data.data.after,
      hasMore: !!data.data.after,
      rateLimit: this.extractRateLimit(response)
    };
  }

  /**
   * Fetch comments for Reddit posts
   */
  private async fetchPostComments(params: FetchParams): Promise<FetchResult> {
    // This would require post IDs from previous post fetches
    // For now, return empty result as comments require specific post IDs
    return {
      data: [],
      hasMore: false
    };
  }

  /**
   * Normalize Reddit data to SocialEvent format
   */
  async normalizeData(rawData: RawPlatformData): Promise<SocialEvent> {
    const data = rawData.data;
    
    return {
      id: this.generateEventId(rawData.id),
      platform: Platform.REDDIT,
      platformId: rawData.id,
      timestamp: rawData.timestamp,
      eventType: this.determineEventType(data),
      content: {
        text: this.normalizeText(data.title + ' ' + (data.selftext || '')),
        mediaUrls: this.extractMediaUrls(data),
        hashtags: [], // Reddit doesn't use hashtags
        mentions: this.extractMentions(data.selftext || ''),
        language: 'en' // Reddit doesn't provide language detection
      },
      author: {
        id: data.author,
        username: data.author,
        displayName: data.author,
        followerCount: 0, // Not available in Reddit API
        verified: data.is_verified || false,
        profileUrl: `https://www.reddit.com/user/${data.author}`
      },
      engagement: {
        likes: Math.max(0, data.ups || 0),
        shares: 0, // Reddit doesn't track shares
        comments: data.num_comments || 0,
        views: 0, // Not available in Reddit API
        engagementRate: this.calculateEngagementRate(data)
      },
      context: rawData.type === 'comment' ? {
        parentPostId: data.parent_id?.replace('t1_', '').replace('t3_', ''),
        threadId: data.link_id?.replace('t3_', ''),
        isReply: !!data.parent_id
      } : {
        threadId: data.id,
        isReply: false
      },
      location: {
        // Reddit posts can have location context through subreddit
        region: data.subreddit
      },
      metadata: {
        source: 'api',
        processingTimestamp: new Date().toISOString(),
        version: '1.0',
        rawData: JSON.stringify(rawData.data)
      }
    };
  }

  /**
   * Extract media URLs from Reddit data
   */
  private extractMediaUrls(data: any): string[] {
    const urls: string[] = [];
    
    if (data.url && this.isMediaUrl(data.url)) {
      urls.push(data.url);
    }
    
    if (data.thumbnail && data.thumbnail !== 'self' && data.thumbnail !== 'default') {
      urls.push(data.thumbnail);
    }
    
    if (data.preview?.images) {
      data.preview.images.forEach((image: any) => {
        if (image.source?.url) {
          urls.push(image.source.url.replace(/&amp;/g, '&'));
        }
      });
    }
    
    return urls;
  }

  /**
   * Check if URL is a media URL
   */
  private isMediaUrl(url: string): boolean {
    const mediaExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm'];
    const mediaDomains = ['i.redd.it', 'v.redd.it', 'imgur.com', 'gfycat.com'];
    
    return mediaExtensions.some(ext => url.toLowerCase().includes(ext)) ||
           mediaDomains.some(domain => url.includes(domain));
  }

  /**
   * Calculate engagement rate for Reddit content
   */
  private calculateEngagementRate(data: any): number {
    const upvotes = Math.max(0, data.ups || 0);
    const downvotes = Math.max(0, data.downs || 0);
    const comments = data.num_comments || 0;
    
    const totalVotes = upvotes + downvotes;
    if (totalVotes === 0) return 0;
    
    // Reddit engagement rate based on upvote ratio and comment activity
    const upvoteRatio = upvotes / totalVotes;
    const commentRatio = Math.min(comments / Math.max(totalVotes, 1), 1);
    
    return (upvoteRatio * 0.7 + commentRatio * 0.3);
  }

  /**
   * Extract rate limit information from response headers
   */
  private extractRateLimit(response: Response) {
    const remaining = response.headers.get('x-ratelimit-remaining');
    const reset = response.headers.get('x-ratelimit-reset');
    
    if (remaining && reset) {
      return {
        remaining: parseInt(remaining),
        resetTime: new Date(parseInt(reset) * 1000)
      };
    }
    
    return undefined;
  }

  /**
   * Determine Reddit-specific event type
   */
  protected determineEventType(data: any): EventType {
    if (data.parent_id) {
      return EventType.COMMENT;
    }
    
    if (data.is_self) {
      return EventType.POST; // Text post
    }
    
    if (data.url) {
      return EventType.POST; // Link post
    }
    
    return EventType.POST;
  }

  /**
   * Override makeRequest to include Reddit-specific headers
   */
  protected async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = {
      'User-Agent': 'SocialIntelligence/1.0 by YourUsername',
      ...options.headers
    };

    return super.makeRequest(url, { ...options, headers });
  }
}