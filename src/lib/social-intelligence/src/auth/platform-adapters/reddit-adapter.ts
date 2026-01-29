/**
 * Reddit Authentication Adapter
 * Handles OAuth 2.0 authentication for Reddit API
 */

import { Platform } from '../../types/core';
import { AuthToken, PlatformCredentials, RedditAuthAdapter as IRedditAuthAdapter } from '../types';
import { BasePlatformAdapter } from './base-adapter';

/**
 * Reddit API authentication adapter
 */
export class RedditAuthAdapter extends BasePlatformAdapter implements IRedditAuthAdapter {
  constructor() {
    super(Platform.REDDIT);
  }

  /**
   * Authenticate with Reddit API
   */
  async authenticate(credentials: PlatformCredentials): Promise<AuthToken> {
    // Reddit supports both authorization code flow and script app flow
    // For script apps (personal use), we can authenticate directly
    return this.authenticateScriptApp(credentials);
  }

  /**
   * Authenticate Reddit script application (for personal use)
   */
  async authenticateScriptApp(credentials: PlatformCredentials): Promise<AuthToken> {
    const config = this.getConfig();
    
    // Reddit script apps use client credentials flow with username/password
    const authData = {
      grant_type: 'password',
      username: credentials.additionalParams?.username,
      password: credentials.additionalParams?.password
    };

    if (!authData.username || !authData.password) {
      throw new Error('Username and password required for Reddit script app authentication');
    }

    // Reddit requires Basic auth with client_id:client_secret
    const authHeader = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');

    const response = await this.httpClient.post(config.endpoints?.token!, authData, {
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'CCC-Social-Intelligence/1.0'
      }
    });

    return this.parseTokenResponse(response);
  }

  /**
   * Exchange authorization code for Reddit access token (for web apps)
   */
  async exchangeAuthorizationCode(
    credentials: PlatformCredentials,
    authorizationCode: string
  ): Promise<AuthToken> {
    const config = this.getConfig();
    
    const tokenData = {
      grant_type: 'authorization_code',
      code: authorizationCode,
      redirect_uri: credentials.redirectUri
    };

    const authHeader = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');

    const response = await this.httpClient.post(config.endpoints?.token!, tokenData, {
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'CCC-Social-Intelligence/1.0'
      }
    });

    return this.parseTokenResponse(response);
  }

  /**
   * Get Reddit user information
   */
  async getUserInfo(token: AuthToken): Promise<any> {
    const response = await this.httpClient.get('/api/v1/me', {
      baseURL: 'https://oauth.reddit.com',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
        'User-Agent': 'CCC-Social-Intelligence/1.0'
      }
    });

    return response.data;
  }

  /**
   * Refresh Reddit access token
   */
  async refreshToken(token: AuthToken): Promise<AuthToken> {
    if (!token.refreshToken) {
      throw new Error('No refresh token available for Reddit');
    }

    const config = this.getConfig();
    
    const refreshData = {
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken
    };

    const authHeader = Buffer.from(`${token.metadata?.clientId}:${token.metadata?.clientSecret}`).toString('base64');

    const response = await this.httpClient.post(config.endpoints?.token!, refreshData, {
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'CCC-Social-Intelligence/1.0'
      }
    });

    const newToken = this.parseTokenResponse(response);
    
    // Reddit refresh tokens are single-use, but response includes new refresh token
    return newToken;
  }

  /**
   * Validate Reddit token
   */
  async validateToken(token: AuthToken): Promise<boolean> {
    try {
      await this.getUserInfo(token);
      return true;
    } catch (error) {
      if ((error as any)?.response?.status === 401) {
        return false;
      }
      // Other errors might be temporary
      return true;
    }
  }

  /**
   * Revoke Reddit token
   */
  async revokeToken(token: AuthToken): Promise<void> {
    try {
      const authHeader = Buffer.from(`${token.metadata?.clientId}:${token.metadata?.clientSecret}`).toString('base64');
      
      await this.httpClient.post('/api/v1/revoke_token', {
        token: token.accessToken,
        token_type_hint: 'access_token'
      }, {
        baseURL: 'https://www.reddit.com',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'CCC-Social-Intelligence/1.0'
        }
      });
    } catch (error) {
      console.warn(`Failed to revoke Reddit token:`, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Handle Reddit-specific rate limiting
   */
  async handleRateLimit(error: any): Promise<void> {
    // Reddit has rate limits:
    // - 60 requests per minute per OAuth client
    // - Additional limits based on user karma and account age
    
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 60;
      console.warn(`Reddit rate limit hit, waiting ${retryAfter} seconds`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    }
  }

  /**
   * Get Reddit subreddit information
   */
  async getSubredditInfo(token: AuthToken, subreddit: string): Promise<any> {
    const response = await this.httpClient.get(`/r/${subreddit}/about`, {
      baseURL: 'https://oauth.reddit.com',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
        'User-Agent': 'CCC-Social-Intelligence/1.0'
      }
    });

    return response.data;
  }

  /**
   * Get Reddit posts from a subreddit
   */
  async getSubredditPosts(
    token: AuthToken, 
    subreddit: string, 
    sort: 'hot' | 'new' | 'top' | 'rising' = 'hot',
    limit: number = 25
  ): Promise<any> {
    const response = await this.httpClient.get(`/r/${subreddit}/${sort}`, {
      baseURL: 'https://oauth.reddit.com',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
        'User-Agent': 'CCC-Social-Intelligence/1.0'
      },
      params: {
        limit,
        raw_json: 1
      }
    });

    return response.data;
  }

  /**
   * Search Reddit posts
   */
  async searchPosts(
    token: AuthToken,
    query: string,
    subreddit?: string,
    sort: 'relevance' | 'hot' | 'top' | 'new' | 'comments' = 'relevance',
    timeframe: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all' = 'all',
    limit: number = 25
  ): Promise<any> {
    const searchPath = subreddit ? `/r/${subreddit}/search` : '/search';
    
    const response = await this.httpClient.get(searchPath, {
      baseURL: 'https://oauth.reddit.com',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
        'User-Agent': 'CCC-Social-Intelligence/1.0'
      },
      params: {
        q: query,
        sort,
        t: timeframe,
        limit,
        restrict_sr: subreddit ? 'true' : 'false',
        raw_json: 1
      }
    });

    return response.data;
  }

  /**
   * Build Reddit-specific authorization URL
   */
  protected buildAuthUrl(credentials: PlatformCredentials, state?: string): string {
    const config = this.getConfig();
    const params = new URLSearchParams({
      client_id: credentials.clientId,
      response_type: 'code',
      state: state || Math.random().toString(36).substring(7),
      redirect_uri: credentials.redirectUri,
      duration: 'permanent', // Request permanent access (refresh token)
      scope: credentials.scopes.join(' ') // Reddit uses space-separated scopes
    });

    return `${config.endpoints?.authorize}?${params.toString()}`;
  }

  /**
   * Parse Reddit token response
   */
  protected parseTokenResponse(response: any): AuthToken {
    const data = response.data;
    
    if (data.error) {
      throw new Error(`Reddit token error: ${data.error_description || data.error}`);
    }

    if (!data.access_token) {
      throw new Error('No access token in Reddit response');
    }

    const expiresIn = data.expires_in || 3600; // Reddit tokens typically last 1 hour
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type || 'bearer',
      expiresAt,
      expiresIn,
      scopes: data.scope ? data.scope.split(' ') : [],
      platform: Platform.REDDIT,
      userId: undefined, // Will be populated when we get user info
      metadata: {
        raw: data,
        obtainedAt: new Date().toISOString()
      }
    };
  }
}