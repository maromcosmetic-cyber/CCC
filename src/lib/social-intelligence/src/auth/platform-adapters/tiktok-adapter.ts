/**
 * TikTok Authentication Adapter
 * Handles OAuth 2.0 authentication for TikTok Business API
 */

import { Platform } from '../../types/core';
import { AuthToken, PlatformCredentials, TikTokAuthAdapter as ITikTokAuthAdapter, TokenType } from '../types';
import { BasePlatformAdapter } from './base-adapter';

/**
 * TikTok Business API authentication adapter
 */
export class TikTokAuthAdapter extends BasePlatformAdapter implements ITikTokAuthAdapter {
  constructor() {
    super(Platform.TIKTOK);
  }

  /**
   * Authenticate with TikTok Business API
   */
  async authenticate(credentials: PlatformCredentials): Promise<AuthToken> {
    // TikTok uses OAuth 2.0 with authorization code flow
    // In a real implementation, this would:
    // 1. Redirect user to TikTok authorization URL
    // 2. Handle callback with authorization code
    // 3. Exchange code for access token
    
    // For now, we'll simulate the token exchange
    // In production, this would be called after receiving the authorization code
    throw new Error('TikTok authentication requires authorization code from OAuth callback');
  }

  /**
   * Authenticate TikTok Business Account
   */
  async authenticateBusinessAccount(credentials: PlatformCredentials): Promise<AuthToken> {
    // Build authorization URL for TikTok Business
    const authUrl = this.buildAuthUrl(credentials);
    
    // In a real implementation, you would:
    // 1. Redirect user to authUrl
    // 2. Handle the callback with authorization code
    // 3. Exchange code for token using exchangeCodeForToken
    
    console.log(`TikTok Business authorization URL: ${authUrl}`);
    throw new Error('Manual authorization required - redirect user to authorization URL');
  }

  /**
   * Exchange authorization code for TikTok access token
   */
  async exchangeAuthorizationCode(
    credentials: PlatformCredentials,
    authorizationCode: string
  ): Promise<AuthToken> {
    const config = this.getConfig();
    
    const tokenData = {
      client_key: credentials.clientId, // TikTok uses client_key instead of client_id
      client_secret: credentials.clientSecret,
      code: authorizationCode,
      grant_type: 'authorization_code'
    };

    const response = await this.httpClient.post(config.endpoints?.token!, tokenData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return this.parseTokenResponse(response);
  }

  /**
   * Refresh TikTok access token
   */
  async refreshToken(token: AuthToken): Promise<AuthToken> {
    if (!token.refreshToken) {
      throw new Error('No refresh token available for TikTok');
    }

    const config = this.getConfig();
    
    const refreshData = {
      client_key: token.metadata?.clientKey, // Need to store client_key in metadata
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken
    };

    const response = await this.httpClient.post(config.endpoints?.refresh!, refreshData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return this.parseTokenResponse(response);
  }

  /**
   * Get TikTok user profile information
   */
  async getUserInfo(token: AuthToken): Promise<any> {
    const config = this.getConfig();
    
    const response = await this.httpClient.get(config.endpoints?.userInfo!, {
      headers: {
        'Authorization': `Bearer ${token.accessToken}`
      },
      params: {
        fields: 'open_id,union_id,avatar_url,display_name'
      }
    });

    return response.data;
  }

  /**
   * Get TikTok user profile (alias for getUserInfo)
   */
  async getUserProfile(token: AuthToken): Promise<any> {
    return this.getUserInfo(token);
  }

  /**
   * Get TikTok Business account information
   */
  async getBusinessAccountInfo(token: AuthToken): Promise<any> {
    const response = await this.httpClient.get('/business/get/', {
      headers: {
        'Authorization': `Bearer ${token.accessToken}`
      }
    });

    return response.data;
  }

  /**
   * Get TikTok ad accounts
   */
  async getAdAccounts(token: AuthToken): Promise<any> {
    const response = await this.httpClient.get('/advertiser/get/', {
      headers: {
        'Authorization': `Bearer ${token.accessToken}`
      }
    });

    return response.data;
  }

  /**
   * Handle TikTok-specific rate limiting
   */
  async handleRateLimit(error: any): Promise<void> {
    // TikTok has specific rate limiting rules
    // Business API: 1000 requests per day per app
    // Different endpoints have different limits
    
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 60;
      console.warn(`TikTok rate limit hit, waiting ${retryAfter} seconds`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    }
  }

  /**
   * Validate TikTok token by making a test API call
   */
  async validateToken(token: AuthToken): Promise<boolean> {
    try {
      await this.getUserInfo(token);
      return true;
    } catch (error) {
      if ((error as any)?.response?.status === 401) {
        return false;
      }
      // Other errors might be temporary, so consider token valid
      return true;
    }
  }

  /**
   * Build TikTok-specific authorization URL
   */
  protected buildAuthUrl(credentials: PlatformCredentials, state?: string): string {
    const config = this.getConfig();
    const params = new URLSearchParams({
      client_key: credentials.clientId, // TikTok uses client_key
      redirect_uri: credentials.redirectUri,
      scope: credentials.scopes.join(','), // TikTok uses comma-separated scopes
      response_type: 'code',
      ...(state && { state })
    });

    return `${config.endpoints?.authorize}?${params.toString()}`;
  }

  /**
   * Parse TikTok token response
   */
  protected parseTokenResponse(response: any): AuthToken {
    const data = response.data;
    
    if (data.code !== 0 || !data.data?.access_token) {
      throw new Error(`TikTok token error: ${data.message || 'Unknown error'}`);
    }

    const tokenData = data.data;
    const expiresIn = tokenData.expires_in || 86400; // TikTok tokens typically last 24 hours
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenType: TokenType.BEARER,
      expiresAt,
      expiresIn,
      scopes: tokenData.scope ? tokenData.scope.split(',') : [],
      platform: Platform.TIKTOK,
      userId: tokenData.open_id,
      metadata: {
        raw: tokenData,
        obtainedAt: new Date().toISOString(),
        advertiser_ids: tokenData.advertiser_ids || []
      }
    };
  }
}