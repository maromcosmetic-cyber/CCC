/**
 * OAuth 2.0 Authentication Manager for Social Media Platforms
 */

import { Platform } from '../types/core';
import { 
  AuthToken, 
  PlatformCredentials, 
  AuthConfig, 
  TokenHealthReport, 
  AuthError 
} from './types';

export class AuthManager {
  private tokens: Map<Platform, AuthToken> = new Map();
  private credentials: AuthConfig;
  private refreshPromises: Map<Platform, Promise<AuthToken>> = new Map();

  constructor(credentials: AuthConfig) {
    this.credentials = credentials;
  }

  /**
   * Store authentication credentials for a platform
   */
  async storeCredentials(platform: Platform, credentials: PlatformCredentials): Promise<void> {
    this.credentials[platform] = credentials;
  }

  /**
   * Get a valid token for a platform, refreshing if necessary
   */
  async getValidToken(platform: Platform): Promise<AuthToken> {
    const existingToken = this.tokens.get(platform);
    
    if (existingToken && this.isTokenValid(existingToken)) {
      return existingToken;
    }

    // Check if refresh is already in progress
    const existingRefresh = this.refreshPromises.get(platform);
    if (existingRefresh) {
      return existingRefresh;
    }

    // Start token refresh
    const refreshPromise = this.refreshToken(platform, existingToken);
    this.refreshPromises.set(platform, refreshPromise);

    try {
      const newToken = await refreshPromise;
      this.tokens.set(platform, newToken);
      return newToken;
    } finally {
      this.refreshPromises.delete(platform);
    }
  }

  /**
   * Refresh an expired token
   */
  async refreshToken(platform: Platform, existingToken?: AuthToken): Promise<AuthToken> {
    const credentials = this.credentials[platform];
    if (!credentials) {
      throw this.createAuthError(`No credentials configured for platform: ${platform}`, platform, 'NO_CREDENTIALS', false);
    }

    try {
      switch (platform) {
        case Platform.TIKTOK:
          return await this.refreshTikTokToken(credentials, existingToken);
        case Platform.INSTAGRAM:
        case Platform.FACEBOOK:
          return await this.refreshMetaToken(credentials, existingToken);
        case Platform.YOUTUBE:
          return await this.refreshYouTubeToken(credentials, existingToken);
        case Platform.REDDIT:
          return await this.refreshRedditToken(credentials, existingToken);
        case Platform.RSS:
          return await this.refreshRSSToken(credentials, existingToken);
        default:
          throw this.createAuthError(`Unsupported platform: ${platform}`, platform, 'UNSUPPORTED_PLATFORM', false);
      }
    } catch (error) {
      throw this.handleAuthError(platform, error);
    }
  }

  /**
   * Handle authentication failures with proper error classification
   */
  async handleAuthFailure(platform: Platform, error: AuthError): Promise<void> {
    console.error(`Authentication failure for ${platform}:`, error);
    
    // Remove invalid token
    this.tokens.delete(platform);
    
    // Log the failure for monitoring
    // TODO: Integrate with audit logging system
    
    if (error.retryable) {
      // Schedule retry with exponential backoff
      setTimeout(() => {
        this.getValidToken(platform).catch(console.error);
      }, this.calculateBackoffDelay(platform));
    }
  }

  /**
   * Monitor token health across all platforms
   */
  async monitorTokenHealth(): Promise<TokenHealthReport[]> {
    const reports: TokenHealthReport[] = [];
    
    for (const platform of Object.values(Platform)) {
      const token = this.tokens.get(platform);
      const report: TokenHealthReport = {
        platform,
        isValid: token ? this.isTokenValid(token) : false,
        expiresIn: token ? Math.max(0, Math.floor((token.expiresAt.getTime() - Date.now()) / 1000)) : 0,
        lastRefreshed: token ? new Date() : new Date(0),
        errors: []
      };
      
      reports.push(report);
    }
    
    return reports;
  }

  /**
   * Check if a token is still valid
   */
  private isTokenValid(token: AuthToken): boolean {
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
    return token.expiresAt.getTime() > now.getTime() + bufferTime;
  }

  /**
   * Refresh TikTok Business API token
   */
  private async refreshTikTokToken(credentials: PlatformCredentials, existingToken?: AuthToken): Promise<AuthToken> {
    const tokenUrl = 'https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/';
    
    const params = new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      grant_type: existingToken?.refreshToken ? 'refresh_token' : 'client_credentials',
    });

    if (existingToken?.refreshToken) {
      params.append('refresh_token', existingToken.refreshToken);
    }

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
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope?.split(',') || [],
      platform: Platform.TIKTOK,
      tokenType: data.token_type || 'Bearer'
    };
  }

  /**
   * Refresh Meta (Instagram/Facebook) API token
   */
  private async refreshMetaToken(credentials: PlatformCredentials, existingToken?: AuthToken): Promise<AuthToken> {
    const tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token';
    
    const params = new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      grant_type: existingToken?.refreshToken ? 'refresh_token' : 'client_credentials',
    });

    if (existingToken?.refreshToken) {
      params.append('refresh_token', existingToken.refreshToken);
    }

    const response = await fetch(`${tokenUrl}?${params}`);

    if (!response.ok) {
      throw new Error(`Meta token refresh failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
      scopes: [],
      platform: Platform.INSTAGRAM, // Will be overridden based on usage
      tokenType: data.token_type || 'Bearer'
    };
  }

  /**
   * Refresh YouTube Data API token
   */
  private async refreshYouTubeToken(credentials: PlatformCredentials, existingToken?: AuthToken): Promise<AuthToken> {
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    
    const params = {
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      grant_type: existingToken?.refreshToken ? 'refresh_token' : 'client_credentials',
      refresh_token: existingToken?.refreshToken,
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
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || existingToken?.refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope?.split(' ') || [],
      platform: Platform.YOUTUBE,
      tokenType: data.token_type || 'Bearer'
    };
  }

  /**
   * Refresh Reddit API token
   */
  private async refreshRedditToken(credentials: PlatformCredentials, existingToken?: AuthToken): Promise<AuthToken> {
    const tokenUrl = 'https://www.reddit.com/api/v1/access_token';
    
    const auth = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');
    
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'SocialIntelligence/1.0',
      },
      body: params,
    });

    if (!response.ok) {
      throw new Error(`Reddit token refresh failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope?.split(' ') || [],
      platform: Platform.REDDIT,
      tokenType: data.token_type || 'Bearer'
    };
  }

  /**
   * Refresh RSS token (placeholder - RSS doesn't require OAuth)
   */
  private async refreshRSSToken(credentials: PlatformCredentials, existingToken?: AuthToken): Promise<AuthToken> {
    // RSS feeds don't require authentication, return a dummy token
    return {
      accessToken: 'rss-no-auth-required',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      scopes: [],
      platform: Platform.RSS,
      tokenType: 'None'
    };
  }

  /**
   * Handle and classify authentication errors
   */
  private handleAuthError(platform: Platform, error: any): AuthError {
    return this.createAuthError(
      error.message || 'Authentication failed',
      platform,
      error.code || 'UNKNOWN_ERROR',
      this.isRetryableError(error)
    );
  }

  /**
   * Create an AuthError instance
   */
  private createAuthError(message: string, platform: Platform, code: string, retryable: boolean): AuthError {
    const error = new Error(message) as AuthError;
    error.platform = platform;
    error.code = code;
    error.retryable = retryable;
    return error;
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors are typically retryable
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }
    
    // Rate limit errors are retryable after delay
    if (error.status === 429) {
      return true;
    }
    
    // Server errors are retryable
    if (error.status >= 500) {
      return true;
    }
    
    // Client errors (4xx) are typically not retryable
    return false;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(platform: Platform): number {
    // Simple exponential backoff: 1s, 2s, 4s, 8s, 16s (max)
    const baseDelay = 1000;
    const maxDelay = 16000;
    const attempt = this.getRetryAttempt(platform);
    
    return Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  }

  /**
   * Get current retry attempt for a platform
   */
  private getRetryAttempt(platform: Platform): number {
    // TODO: Implement retry attempt tracking
    return 0;
  }
}