/**
 * Meta (Instagram/Facebook) Authentication Adapter
 * Handles OAuth 2.0 authentication for Meta APIs
 */

import { Platform } from '../../types/core';
import { AuthToken, PlatformCredentials, MetaAuthAdapter as IMetaAuthAdapter } from '../types';
import { BasePlatformAdapter } from './base-adapter';

/**
 * Meta API authentication adapter for Instagram and Facebook
 */
export class MetaAuthAdapter extends BasePlatformAdapter implements IMetaAuthAdapter {
  constructor() {
    super(Platform.FACEBOOK); // Default to Facebook, can be overridden
  }

  /**
   * Authenticate with Meta API
   */
  async authenticate(credentials: PlatformCredentials): Promise<AuthToken> {
    // Meta uses OAuth 2.0 with authorization code flow
    // This requires user interaction for authorization
    throw new Error('Meta authentication requires authorization code from OAuth callback');
  }

  /**
   * Exchange authorization code for Meta access token
   */
  async exchangeAuthorizationCode(
    credentials: PlatformCredentials,
    authorizationCode: string
  ): Promise<AuthToken> {
    return this.exchangeCodeForToken(credentials, authorizationCode);
  }

  /**
   * Authenticate page access for Facebook/Instagram
   */
  async authenticatePageAccess(credentials: PlatformCredentials, pageId: string): Promise<AuthToken> {
    // First get user access token, then exchange for page access token
    const authUrl = this.buildAuthUrl(credentials);
    console.log(`Meta authorization URL: ${authUrl}`);
    throw new Error('Manual authorization required - redirect user to authorization URL');
  }

  /**
   * Exchange short-lived token for long-lived token
   */
  async exchangeForLongLivedToken(token: AuthToken): Promise<AuthToken> {
    const config = this.getConfig();
    
    const response = await this.httpClient.get(config.endpoints?.token!, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: token.metadata?.clientId,
        client_secret: token.metadata?.clientSecret,
        fb_exchange_token: token.accessToken
      }
    });

    const newToken = this.parseTokenResponse(response);
    
    // Long-lived tokens typically last 60 days
    newToken.expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    
    return newToken;
  }

  /**
   * Get page access tokens for managed pages
   */
  async getPageAccessTokens(token: AuthToken): Promise<any[]> {
    const response = await this.httpClient.get('/me/accounts', {
      baseURL: 'https://graph.facebook.com/v18.0',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`
      },
      params: {
        fields: 'id,name,access_token,category,tasks'
      }
    });

    return response.data.data || [];
  }

  /**
   * Get Instagram Business accounts connected to Facebook pages
   */
  async getInstagramBusinessAccounts(token: AuthToken, pageId: string): Promise<any[]> {
    const response = await this.httpClient.get(`/${pageId}`, {
      baseURL: 'https://graph.facebook.com/v18.0',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`
      },
      params: {
        fields: 'instagram_business_account'
      }
    });

    return response.data.instagram_business_account ? [response.data.instagram_business_account] : [];
  }

  /**
   * Get user information from Meta API
   */
  async getUserInfo(token: AuthToken): Promise<any> {
    const response = await this.httpClient.get('/me', {
      baseURL: 'https://graph.facebook.com/v18.0',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`
      },
      params: {
        fields: 'id,name,email,picture'
      }
    });

    return response.data;
  }

  /**
   * Refresh Meta access token
   */
  async refreshToken(token: AuthToken): Promise<AuthToken> {
    // Meta doesn't use traditional refresh tokens
    // Instead, we need to exchange for a long-lived token
    return this.exchangeForLongLivedToken(token);
  }

  /**
   * Validate Meta token
   */
  async validateToken(token: AuthToken): Promise<boolean> {
    try {
      // Use debug_token endpoint to validate
      const response = await this.httpClient.get('/debug_token', {
        baseURL: 'https://graph.facebook.com/v18.0',
        params: {
          input_token: token.accessToken,
          access_token: `${token.metadata?.appId}|${token.metadata?.appSecret}`
        }
      });

      const data = response.data.data;
      return data.is_valid && !data.error;
    } catch (error) {
      return false;
    }
  }

  /**
   * Handle Meta-specific rate limiting
   */
  async handleRateLimit(error: any): Promise<void> {
    // Meta uses different rate limiting based on:
    // - App-level rate limiting
    // - User-level rate limiting  
    // - Business Use Case rate limiting
    
    if (error.response?.status === 429 || 
        (error.response?.data?.error?.code === 4 || error.response?.data?.error?.code === 17)) {
      
      const retryAfter = error.response.headers['retry-after'] || 
                        error.response.data?.error?.error_user_msg?.match(/(\d+)/)?.[1] || 
                        300; // Default 5 minutes
      
      console.warn(`Meta rate limit hit, waiting ${retryAfter} seconds`);
      await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000));
    }
  }

  /**
   * Get Facebook page information
   */
  async getPageInfo(token: AuthToken, pageId: string): Promise<any> {
    const response = await this.httpClient.get(`/${pageId}`, {
      baseURL: 'https://graph.facebook.com/v18.0',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`
      },
      params: {
        fields: 'id,name,category,about,website,phone,emails,fan_count,followers_count'
      }
    });

    return response.data;
  }

  /**
   * Get Instagram account information
   */
  async getInstagramAccountInfo(token: AuthToken, accountId: string): Promise<any> {
    const response = await this.httpClient.get(`/${accountId}`, {
      baseURL: 'https://graph.facebook.com/v18.0',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`
      },
      params: {
        fields: 'id,username,name,biography,website,followers_count,media_count,profile_picture_url'
      }
    });

    return response.data;
  }

  /**
   * Build Meta-specific authorization URL
   */
  protected buildAuthUrl(credentials: PlatformCredentials, state?: string): string {
    const config = this.getConfig();
    const params = new URLSearchParams({
      client_id: credentials.clientId,
      redirect_uri: credentials.redirectUri,
      scope: credentials.scopes.join(','), // Meta uses comma-separated scopes
      response_type: 'code',
      ...(state && { state }),
      display: 'popup' // Optional: can be 'page', 'popup', 'touch', 'wap'
    });

    return `${config.endpoints?.authorize}?${params.toString()}`;
  }

  /**
   * Parse Meta token response
   */
  protected parseTokenResponse(response: any): AuthToken {
    const data = response.data;
    
    if (data.error) {
      throw new Error(`Meta token error: ${data.error.message}`);
    }

    if (!data.access_token) {
      throw new Error('No access token in Meta response');
    }

    const expiresIn = data.expires_in || 3600; // Default 1 hour for short-lived tokens
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return {
      accessToken: data.access_token,
      refreshToken: undefined, // Meta doesn't use refresh tokens
      tokenType: data.token_type || 'bearer',
      expiresAt,
      expiresIn,
      scopes: data.scope ? data.scope.split(',') : [],
      platform: this.platform,
      userId: data.user_id,
      metadata: {
        raw: data,
        obtainedAt: new Date().toISOString(),
        tokenType: data.expires_in > 7200 ? 'long_lived' : 'short_lived'
      }
    };
  }
}