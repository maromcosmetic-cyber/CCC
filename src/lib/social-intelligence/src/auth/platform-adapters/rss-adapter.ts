/**
 * RSS Authentication Adapter
 * Handles authentication for RSS feeds and web crawlers (mostly no-auth)
 */

import { Platform } from '../../types/core';
import { AuthToken, PlatformCredentials, TokenType } from '../types';
import { BasePlatformAdapter } from './base-adapter';

/**
 * RSS/Web Crawler authentication adapter
 * Most RSS feeds don't require authentication, but some may require API keys
 */
export class RSSAuthAdapter extends BasePlatformAdapter {
  constructor() {
    super(Platform.RSS);
  }

  /**
   * Authenticate with RSS feeds (usually no authentication required)
   */
  async authenticate(credentials: PlatformCredentials): Promise<AuthToken> {
    // Most RSS feeds don't require authentication
    // Create a dummy token for consistency with other platforms
    
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
    
    return {
      accessToken: credentials.additionalParams?.apiKey || 'no-auth-required',
      refreshToken: undefined,
      tokenType: TokenType.BEARER, // Use BEARER as default since 'none' is not a valid TokenType
      expiresAt,
      expiresIn: 365 * 24 * 60 * 60, // 1 year in seconds
      scopes: ['read'],
      platform: Platform.RSS,
      userId: 'rss-user',
      metadata: {
        raw: { type: 'rss', requiresAuth: false },
        obtainedAt: new Date().toISOString(),
        feedUrls: credentials.additionalParams?.feedUrls || []
      }
    };
  }

  /**
   * Get user info (not applicable for RSS)
   */
  async getUserInfo(token: AuthToken): Promise<any> {
    return {
      id: 'rss-user',
      name: 'RSS Feed Reader',
      type: 'system',
      feeds: token.metadata?.feedUrls || []
    };
  }

  /**
   * Refresh token (not needed for RSS)
   */
  async refreshToken(token: AuthToken): Promise<AuthToken> {
    // RSS doesn't need token refresh, just return the same token
    return token;
  }

  /**
   * Validate token (always valid for RSS)
   */
  async validateToken(token: AuthToken): Promise<boolean> {
    return true;
  }

  /**
   * Revoke token (not applicable for RSS)
   */
  async revokeToken(token: AuthToken): Promise<void> {
    // Nothing to revoke for RSS
    return;
  }

  /**
   * Handle rate limiting for RSS feeds
   */
  async handleRateLimit(error: any): Promise<void> {
    // Implement respectful crawling delays
    // Most RSS feeds should be polled no more than once per hour
    
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 3600; // Default 1 hour
      console.warn(`RSS feed rate limited, waiting ${retryAfter} seconds`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    }
  }

  /**
   * Validate RSS feed URL
   */
  async validateFeedUrl(feedUrl: string): Promise<boolean> {
    try {
      const response = await this.httpClient.head(feedUrl, {
        timeout: 10000 // 10 second timeout
      });
      
      const contentType = response.headers['content-type'] || '';
      return contentType.includes('xml') || 
             contentType.includes('rss') || 
             contentType.includes('atom') ||
             response.status === 200;
    } catch (error) {
      console.warn(`Failed to validate RSS feed URL ${feedUrl}:`, error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Fetch RSS feed content
   */
  async fetchFeedContent(token: AuthToken, feedUrl: string): Promise<any> {
    try {
      const response = await this.httpClient.get(feedUrl, {
        headers: {
          'User-Agent': 'CCC-Social-Intelligence/1.0 RSS Reader',
          'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml'
        },
        timeout: 30000 // 30 second timeout
      });

      return {
        url: feedUrl,
        content: response.data,
        contentType: response.headers['content-type'],
        lastModified: response.headers['last-modified'],
        etag: response.headers['etag'],
        fetchedAt: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to fetch RSS feed ${feedUrl}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if RSS feed has been updated since last fetch
   */
  async checkFeedUpdated(
    feedUrl: string, 
    lastModified?: string, 
    etag?: string
  ): Promise<boolean> {
    try {
      const headers: any = {};
      
      if (lastModified) {
        headers['If-Modified-Since'] = lastModified;
      }
      
      if (etag) {
        headers['If-None-Match'] = etag;
      }

      const response = await this.httpClient.head(feedUrl, {
        headers,
        timeout: 10000
      });

      // If we get 304 Not Modified, the feed hasn't changed
      return response.status !== 304;
    } catch (error) {
      if ((error as any)?.response?.status === 304) {
        return false; // Not modified
      }
      
      // If we can't check, assume it's updated
      console.warn(`Could not check if RSS feed ${feedUrl} was updated:`, error instanceof Error ? error.message : String(error));
      return true;
    }
  }

  /**
   * Get RSS feed metadata
   */
  async getFeedMetadata(feedUrl: string): Promise<any> {
    try {
      const response = await this.httpClient.get(feedUrl, {
        headers: {
          'User-Agent': 'CCC-Social-Intelligence/1.0 RSS Reader'
        },
        timeout: 30000
      });

      // Basic XML parsing to extract feed metadata
      const content = response.data;
      const metadata: any = {
        url: feedUrl,
        type: 'unknown',
        title: '',
        description: '',
        lastBuildDate: '',
        language: '',
        generator: ''
      };

      // Detect feed type
      if (content.includes('<rss')) {
        metadata.type = 'rss';
      } else if (content.includes('<feed') && content.includes('atom')) {
        metadata.type = 'atom';
      }

      // Extract basic metadata (simple regex parsing)
      const titleMatch = content.match(/<title[^>]*>(.*?)<\/title>/i);
      if (titleMatch) {
        metadata.title = titleMatch[1].trim();
      }

      const descMatch = content.match(/<description[^>]*>(.*?)<\/description>/i);
      if (descMatch) {
        metadata.description = descMatch[1].trim();
      }

      return metadata;
    } catch (error) {
      throw new Error(`Failed to get RSS feed metadata for ${feedUrl}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Batch validate multiple RSS feed URLs
   */
  async validateMultipleFeeds(feedUrls: string[]): Promise<Array<{
    url: string;
    valid: boolean;
    error?: string;
  }>> {
    const results = await Promise.allSettled(
      feedUrls.map(async (url) => {
        try {
          const valid = await this.validateFeedUrl(url);
          return { url, valid };
        } catch (error) {
          return { url, valid: false, error: error instanceof Error ? error.message : String(error) };
        }
      })
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          url: feedUrls[index],
          valid: false,
          error: result.reason.message
        };
      }
    });
  }
}