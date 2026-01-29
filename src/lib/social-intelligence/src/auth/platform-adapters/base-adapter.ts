/**
 * Base Platform Adapter
 * Common functionality shared across all platform authentication adapters
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Platform } from '../../types/core';
import {
  PlatformAdapter,
  AuthToken,
  PlatformCredentials,
  AuthenticationError,
  AuthError,
  RateLimitError,
  TokenExpiredError,
  InvalidCredentialsError,
  PLATFORM_AUTH_CONFIGS
} from '../types';

/**
 * Base class for all platform authentication adapters
 */
export abstract class BasePlatformAdapter implements PlatformAdapter {
  protected httpClient: AxiosInstance;
  protected platform: Platform;

  constructor(platform: Platform) {
    this.platform = platform;
    this.httpClient = axios.create({
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'CCC-Social-Intelligence/1.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Add response interceptor for common error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => this.handleHttpError(error)
    );
  }

  /**
   * Handle common HTTP errors and convert to appropriate AuthenticationError
   */
  protected handleHttpError(error: any): never {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          if (data?.error === 'invalid_grant' || data?.error_description?.includes('expired')) {
            throw new TokenExpiredError(this.platform, 'Token has expired or is invalid');
          }
          throw new InvalidCredentialsError(this.platform, data?.error_description || 'Invalid request');

        case 401:
          throw new InvalidCredentialsError(this.platform, 'Invalid credentials or unauthorized');

        case 403:
          throw new AuthenticationError(
            this.platform,
            AuthError.INSUFFICIENT_PERMISSIONS,
            'Insufficient permissions'
          );

        case 429:
          const retryAfter = error.response.headers['retry-after'];
          throw new RateLimitError(
            this.platform,
            retryAfter ? parseInt(retryAfter, 10) : undefined,
            'Rate limit exceeded'
          );

        case 500:
        case 502:
        case 503:
        case 504:
          throw new AuthenticationError(
            this.platform,
            AuthError.PLATFORM_ERROR,
            `Platform server error: ${status}`
          );

        default:
          throw new AuthenticationError(
            this.platform,
            AuthError.PLATFORM_ERROR,
            `HTTP error ${status}: ${data?.error_description || error.message}`
          );
      }
    } else if (error.request) {
      throw new AuthenticationError(
        this.platform,
        AuthError.NETWORK_ERROR,
        'Network error - no response received'
      );
    } else {
      throw new AuthenticationError(
        this.platform,
        AuthError.PLATFORM_ERROR,
        `Request setup error: ${error.message}`
      );
    }
  }

  /**
   * Get platform configuration
   */
  protected getConfig() {
    const config = PLATFORM_AUTH_CONFIGS[this.platform];
    if (!config) {
      throw new Error(`No configuration found for platform: ${this.platform}`);
    }
    return config;
  }

  /**
   * Build authorization URL for OAuth flow
   */
  protected buildAuthUrl(credentials: PlatformCredentials, state?: string): string {
    const config = this.getConfig();
    const params = new URLSearchParams({
      client_id: credentials.clientId,
      redirect_uri: credentials.redirectUri,
      scope: credentials.scopes.join(' '),
      response_type: 'code',
      ...(state && { state }),
      ...(credentials.additionalParams || {})
    });

    return `${config.endpoints?.authorize}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  protected async exchangeCodeForToken(
    credentials: PlatformCredentials,
    authorizationCode: string
  ): Promise<AuthToken> {
    const config = this.getConfig();
    
    const tokenData = {
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      code: authorizationCode,
      redirect_uri: credentials.redirectUri,
      grant_type: 'authorization_code'
    };

    const response = await this.httpClient.post(config.endpoints?.token!, tokenData);
    return this.parseTokenResponse(response);
  }

  /**
   * Parse token response from platform
   */
  protected parseTokenResponse(response: AxiosResponse): AuthToken {
    const data = response.data;
    
    if (!data.access_token) {
      throw new AuthenticationError(
        this.platform,
        AuthError.PLATFORM_ERROR,
        'No access token in response'
      );
    }

    const expiresIn = data.expires_in || 3600; // Default to 1 hour
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type || 'bearer',
      expiresAt,
      expiresIn,
      scopes: data.scope ? data.scope.split(' ') : [],
      platform: this.platform,
      userId: data.user_id,
      metadata: {
        raw: data,
        obtainedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(token: AuthToken): Promise<AuthToken> {
    if (!token.refreshToken) {
      throw new TokenExpiredError(this.platform, 'No refresh token available');
    }

    const config = this.getConfig();
    if (!config.endpoints?.refresh) {
      throw new AuthenticationError(
        this.platform,
        AuthError.PLATFORM_ERROR,
        'Platform does not support token refresh'
      );
    }

    const refreshData = {
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken
    };

    const response = await this.httpClient.post(config.endpoints.refresh, refreshData);
    const newToken = this.parseTokenResponse(response);
    
    // Preserve refresh token if not provided in response
    if (!newToken.refreshToken && token.refreshToken) {
      newToken.refreshToken = token.refreshToken;
    }

    return newToken;
  }

  /**
   * Validate if token is still valid
   */
  async validateToken(token: AuthToken): Promise<boolean> {
    try {
      // Check expiration time
      if (token.expiresAt <= new Date()) {
        return false;
      }

      // Try to make a simple API call to validate token
      await this.getUserInfo(token);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Revoke a token
   */
  async revokeToken(token: AuthToken): Promise<void> {
    const config = this.getConfig();
    
    if (!config.endpoints?.revoke) {
      // Platform doesn't support revocation, just return
      return;
    }

    try {
      await this.httpClient.post(config.endpoints.revoke, {
        token: token.accessToken
      });
    } catch (error) {
      // Log error but don't throw - revocation is best effort
      console.warn(`Failed to revoke token for ${this.platform}:`, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Handle platform-specific rate limiting
   */
  async handleRateLimit(error: any): Promise<void> {
    if (error instanceof RateLimitError) {
      const delay = error.retryAfter ? error.retryAfter * 1000 : 60000; // Default 1 minute
      console.warn(`Rate limited on ${this.platform}, waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Abstract methods that must be implemented by platform-specific adapters
  abstract authenticate(credentials: PlatformCredentials): Promise<AuthToken>;
  abstract getUserInfo(token: AuthToken): Promise<any>;
}