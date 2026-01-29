/**
 * YouTube Authentication Adapter
 * Handles OAuth 2.0 authentication for YouTube Data API
 */

import { Platform } from '../../types/core';
import { AuthToken, PlatformCredentials, YouTubeAuthAdapter as IYouTubeAuthAdapter } from '../types';
import { BasePlatformAdapter } from './base-adapter';

/**
 * YouTube Data API authentication adapter
 */
export class YouTubeAuthAdapter extends BasePlatformAdapter implements IYouTubeAuthAdapter {
  constructor() {
    super(Platform.YOUTUBE);
  }

  /**
   * Authenticate with YouTube Data API (Google OAuth 2.0)
   */
  async authenticate(credentials: PlatformCredentials): Promise<AuthToken> {
    // YouTube uses Google OAuth 2.0 with authorization code flow
    throw new Error('YouTube authentication requires authorization code from OAuth callback');
  }

  /**
   * Exchange authorization code for YouTube access token
   */
  async exchangeAuthorizationCode(
    credentials: PlatformCredentials,
    authorizationCode: string
  ): Promise<AuthToken> {
    return this.exchangeCodeForToken(credentials, authorizationCode);
  }

  /**
   * Authenticate channel access
   */
  async authenticateChannelAccess(credentials: PlatformCredentials): Promise<AuthToken> {
    const authUrl = this.buildAuthUrl(credentials);
    console.log(`YouTube authorization URL: ${authUrl}`);
    throw new Error('Manual authorization required - redirect user to authorization URL');
  }

  /**
   * Get YouTube channel information
   */
  async getChannelInfo(token: AuthToken): Promise<any> {
    const response = await this.httpClient.get('/youtube/v3/channels', {
      baseURL: 'https://www.googleapis.com',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`
      },
      params: {
        part: 'snippet,statistics,contentDetails,brandingSettings',
        mine: true
      }
    });

    return response.data;
  }

  /**
   * Get user information from Google API
   */
  async getUserInfo(token: AuthToken): Promise<any> {
    const response = await this.httpClient.get('/oauth2/v2/userinfo', {
      baseURL: 'https://www.googleapis.com',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`
      }
    });

    return response.data;
  }

  /**
   * Refresh YouTube access token using Google OAuth 2.0
   */
  async refreshToken(token: AuthToken): Promise<AuthToken> {
    if (!token.refreshToken) {
      throw new Error('No refresh token available for YouTube');
    }

    const config = this.getConfig();
    
    const refreshData = {
      client_id: token.metadata?.clientId,
      client_secret: token.metadata?.clientSecret,
      refresh_token: token.refreshToken,
      grant_type: 'refresh_token'
    };

    const response = await this.httpClient.post(config.endpoints?.refresh!, refreshData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const newToken = this.parseTokenResponse(response);
    
    // Google refresh tokens are single-use, but the response might not include a new one
    // If no new refresh token, keep the old one
    if (!newToken.refreshToken && token.refreshToken) {
      newToken.refreshToken = token.refreshToken;
    }

    return newToken;
  }

  /**
   * Validate YouTube token
   */
  async validateToken(token: AuthToken): Promise<boolean> {
    try {
      // Use Google's tokeninfo endpoint to validate
      const response = await this.httpClient.get('/oauth2/v1/tokeninfo', {
        baseURL: 'https://www.googleapis.com',
        params: {
          access_token: token.accessToken
        }
      });

      const data = response.data;
      return !data.error && data.expires_in > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Revoke YouTube token
   */
  async revokeToken(token: AuthToken): Promise<void> {
    try {
      await this.httpClient.post('/oauth2/revoke', null, {
        baseURL: 'https://oauth2.googleapis.com',
        params: {
          token: token.accessToken
        }
      });
    } catch (error) {
      console.warn(`Failed to revoke YouTube token:`, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Handle YouTube/Google-specific rate limiting
   */
  async handleRateLimit(error: any): Promise<void> {
    // YouTube Data API has quota limits:
    // - 10,000 quota units per day by default
    // - Different operations cost different amounts
    
    if (error.response?.status === 403 && 
        error.response?.data?.error?.errors?.[0]?.reason === 'quotaExceeded') {
      
      // Quota exceeded - wait until next day
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const waitTime = tomorrow.getTime() - now.getTime();
      console.warn(`YouTube quota exceeded, waiting until ${tomorrow.toISOString()}`);
      
      // In practice, you might want to handle this differently
      // For now, we'll wait a shorter time for testing
      await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 60000)));
    } else if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 60;
      console.warn(`YouTube rate limit hit, waiting ${retryAfter} seconds`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    }
  }

  /**
   * Get YouTube channel analytics
   */
  async getChannelAnalytics(token: AuthToken, channelId: string, metrics: string[]): Promise<any> {
    const response = await this.httpClient.get('/youtube/analytics/v2/reports', {
      baseURL: 'https://youtubeanalytics.googleapis.com',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`
      },
      params: {
        ids: `channel==${channelId}`,
        metrics: metrics.join(','),
        startDate: '2023-01-01',
        endDate: new Date().toISOString().split('T')[0],
        dimensions: 'day'
      }
    });

    return response.data;
  }

  /**
   * Get YouTube videos for a channel
   */
  async getChannelVideos(token: AuthToken, channelId: string, maxResults: number = 50): Promise<any> {
    // First get the uploads playlist ID
    const channelResponse = await this.httpClient.get('/youtube/v3/channels', {
      baseURL: 'https://www.googleapis.com',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`
      },
      params: {
        part: 'contentDetails',
        id: channelId
      }
    });

    const uploadsPlaylistId = channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    
    if (!uploadsPlaylistId) {
      throw new Error('Could not find uploads playlist for channel');
    }

    // Get videos from uploads playlist
    const videosResponse = await this.httpClient.get('/youtube/v3/playlistItems', {
      baseURL: 'https://www.googleapis.com',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`
      },
      params: {
        part: 'snippet,contentDetails',
        playlistId: uploadsPlaylistId,
        maxResults
      }
    });

    return videosResponse.data;
  }

  /**
   * Build YouTube-specific authorization URL
   */
  protected buildAuthUrl(credentials: PlatformCredentials, state?: string): string {
    const config = this.getConfig();
    const params = new URLSearchParams({
      client_id: credentials.clientId,
      redirect_uri: credentials.redirectUri,
      scope: credentials.scopes.join(' '), // Google uses space-separated scopes
      response_type: 'code',
      access_type: 'offline', // Required to get refresh token
      prompt: 'consent', // Force consent screen to ensure refresh token
      ...(state && { state })
    });

    return `${config.endpoints?.authorize}?${params.toString()}`;
  }

  /**
   * Parse Google/YouTube token response
   */
  protected parseTokenResponse(response: any): AuthToken {
    const data = response.data;
    
    if (data.error) {
      throw new Error(`YouTube token error: ${data.error_description || data.error}`);
    }

    if (!data.access_token) {
      throw new Error('No access token in YouTube response');
    }

    const expiresIn = data.expires_in || 3600; // Google tokens typically last 1 hour
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type || 'Bearer',
      expiresAt,
      expiresIn,
      scopes: data.scope ? data.scope.split(' ') : [],
      platform: Platform.YOUTUBE,
      userId: undefined, // Will be populated when we get user info
      metadata: {
        raw: data,
        obtainedAt: new Date().toISOString(),
        id_token: data.id_token // Google ID token if present
      }
    };
  }
}