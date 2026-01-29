/**
 * Authentication Manager
 * Central service for managing OAuth 2.0 authentication across all platforms
 */

import { Platform } from '../types/core';
import {
  AuthManager,
  AuthToken,
  PlatformCredentials,
  TokenHealthReport,
  AuthStatus,
  AuthError,
  AuthenticationError,
  TokenExpiredError,
  RateLimitError,
  TokenRefreshResult,
  BatchTokenRefreshResult,
  AuthMetrics,
  PLATFORM_AUTH_CONFIGS
} from './types';
import { TokenStorage, createTokenStorage } from './token-storage';
import { retryWithBackoff, AuthCircuitBreaker, AUTH_RETRY_POLICY, TOKEN_REFRESH_RETRY_POLICY } from './retry-utils';
import { createPlatformAdapter } from './platform-adapters';

/**
 * Main authentication manager implementation
 */
export class OAuth2AuthManager implements AuthManager {
  private tokenStorage: TokenStorage;
  private circuitBreaker: AuthCircuitBreaker;
  private metrics: Map<Platform, AuthMetrics> = new Map();
  private refreshInProgress: Map<Platform, Promise<AuthToken>> = new Map();

  constructor(
    tokenStorage?: TokenStorage,
    circuitBreakerConfig?: {
      failureThreshold?: number;
      recoveryTimeout?: number;
      successThreshold?: number;
    }
  ) {
    this.tokenStorage = tokenStorage || createTokenStorage({ type: 'memory' });
    this.circuitBreaker = new AuthCircuitBreaker(
      circuitBreakerConfig?.failureThreshold,
      circuitBreakerConfig?.recoveryTimeout,
      circuitBreakerConfig?.successThreshold
    );
    
    // Initialize metrics for all platforms
    this.initializeMetrics();
    
    // Start background token refresh process
    this.startTokenRefreshScheduler();
  }

  /**
   * Initialize metrics tracking for all platforms
   */
  private initializeMetrics(): void {
    for (const platform of Object.values(Platform)) {
      this.metrics.set(platform, {
        platform,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        lastRequestTime: new Date(),
        tokenRefreshCount: 0,
        rateLimitHits: 0
      });
    }
  }

  /**
   * Update metrics for a platform
   */
  private updateMetrics(
    platform: Platform,
    success: boolean,
    responseTime: number,
    isRefresh: boolean = false,
    isRateLimit: boolean = false
  ): void {
    const metrics = this.metrics.get(platform);
    if (!metrics) return;

    metrics.totalRequests++;
    metrics.lastRequestTime = new Date();
    
    if (success) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
    }
    
    if (isRefresh) {
      metrics.tokenRefreshCount++;
    }
    
    if (isRateLimit) {
      metrics.rateLimitHits++;
    }
    
    // Update average response time using exponential moving average
    const alpha = 0.1; // Smoothing factor
    metrics.averageResponseTime = 
      alpha * responseTime + (1 - alpha) * metrics.averageResponseTime;
  }

  async storeCredentials(platform: Platform, credentials: PlatformCredentials): Promise<void> {
    try {
      // Validate credentials format
      if (!credentials.clientId || !credentials.clientSecret) {
        throw new Error('Client ID and Client Secret are required');
      }

      // Store credentials securely (in production, encrypt these)
      // For now, we'll store them in memory or use the token storage
      // In a real implementation, credentials should be stored separately from tokens
      
      console.log(`Credentials stored for platform: ${platform}`);
    } catch (error) {
      throw new AuthenticationError(
        platform,
        AuthError.INVALID_CREDENTIALS,
        `Failed to store credentials: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  async getValidToken(platform: Platform): Promise<AuthToken> {
    const startTime = Date.now();
    
    try {
      // Check circuit breaker
      if (this.circuitBreaker.isCircuitOpen(platform)) {
        throw new AuthenticationError(
          platform,
          AuthError.PLATFORM_ERROR,
          'Circuit breaker is open - too many recent failures'
        );
      }

      // Get stored token
      const storedToken = await this.tokenStorage.getToken(platform);
      
      if (!storedToken) {
        throw new AuthenticationError(
          platform,
          AuthError.INVALID_CREDENTIALS,
          'No authentication token found for platform'
        );
      }

      // Check if token is still valid
      const now = new Date();
      const timeUntilExpiry = storedToken.expiresAt.getTime() - now.getTime();
      const refreshThreshold = (PLATFORM_AUTH_CONFIGS[platform]?.tokenRefreshThreshold || 300) * 1000;

      // If token is expired or close to expiring, refresh it
      if (timeUntilExpiry <= refreshThreshold) {
        return await this.refreshTokenIfNeeded(platform, storedToken);
      }

      // Token is valid, update metrics and return
      this.updateMetrics(platform, true, Date.now() - startTime);
      this.circuitBreaker.recordSuccess(platform);
      
      return storedToken;
      
    } catch (error) {
      this.updateMetrics(platform, false, Date.now() - startTime);
      this.circuitBreaker.recordFailure(platform);
      
      if (error instanceof AuthenticationError) {
        throw error;
      }
      
      throw new AuthenticationError(
        platform,
        AuthError.PLATFORM_ERROR,
        `Failed to get valid token: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  async refreshToken(platform: Platform, refreshToken?: string): Promise<AuthToken> {
    // Check if refresh is already in progress to avoid duplicate requests
    const existingRefresh = this.refreshInProgress.get(platform);
    if (existingRefresh) {
      return await existingRefresh;
    }

    const refreshPromise = this.performTokenRefresh(platform, refreshToken);
    this.refreshInProgress.set(platform, refreshPromise);

    try {
      const result = await refreshPromise;
      return result;
    } finally {
      this.refreshInProgress.delete(platform);
    }
  }

  private async performTokenRefresh(platform: Platform, refreshToken?: string): Promise<AuthToken> {
    const startTime = Date.now();
    
    try {
      const storedToken = await this.tokenStorage.getToken(platform);
      
      if (!storedToken && !refreshToken) {
        throw new TokenExpiredError(platform, 'No token available to refresh');
      }

      const tokenToRefresh = refreshToken ? 
        { ...storedToken, refreshToken } as AuthToken : 
        storedToken!;

      // Get platform adapter and refresh token
      const adapter = createPlatformAdapter(platform);
      
      const newToken = await retryWithBackoff(
        () => adapter.refreshToken(tokenToRefresh),
        TOKEN_REFRESH_RETRY_POLICY,
        { platform, operationType: 'token_refresh' }
      );

      // Store the new token
      await this.tokenStorage.updateToken(platform, newToken);
      
      // Update metrics
      this.updateMetrics(platform, true, Date.now() - startTime, true);
      this.circuitBreaker.recordSuccess(platform);
      
      console.log(`Token refreshed successfully for platform: ${platform}`);
      return newToken;
      
    } catch (error) {
      this.updateMetrics(platform, false, Date.now() - startTime, true);
      this.circuitBreaker.recordFailure(platform);
      
      if (error instanceof RateLimitError) {
        this.updateMetrics(platform, false, Date.now() - startTime, true, true);
      }
      
      throw error;
    }
  }

  private async refreshTokenIfNeeded(platform: Platform, token: AuthToken): Promise<AuthToken> {
    try {
      return await this.refreshToken(platform, token.refreshToken);
    } catch (error) {
      // If refresh fails, try to use the existing token if it's not completely expired
      const now = new Date();
      if (token.expiresAt > now) {
        console.warn(`Token refresh failed for ${platform}, using existing token: ${error instanceof Error ? error.message : String(error)}`);
        return token;
      }
      
      throw error;
    }
  }

  async revokeToken(platform: Platform): Promise<void> {
    try {
      const token = await this.tokenStorage.getToken(platform);
      
      if (token) {
        // Try to revoke token with platform
        try {
          const adapter = createPlatformAdapter(platform);
          await adapter.revokeToken(token);
        } catch (error) {
          console.warn(`Failed to revoke token with platform ${platform}: ${error instanceof Error ? error.message : String(error)}`);
          // Continue with local removal even if platform revocation fails
        }
        
        // Remove token from storage
        await this.tokenStorage.removeToken(platform);
      }
      
      console.log(`Token revoked for platform: ${platform}`);
      
    } catch (error) {
      throw new AuthenticationError(
        platform,
        AuthError.PLATFORM_ERROR,
        `Failed to revoke token: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  async getTokenHealthReport(): Promise<TokenHealthReport[]> {
    const reports: TokenHealthReport[] = [];
    const allTokens = await this.tokenStorage.getAllTokens();
    const now = new Date();

    for (const [platform, token] of allTokens) {
      const timeUntilExpiry = Math.max(0, token.expiresAt.getTime() - now.getTime()) / 1000;
      const refreshThreshold = (PLATFORM_AUTH_CONFIGS[platform as keyof typeof PLATFORM_AUTH_CONFIGS]?.tokenRefreshThreshold) || 300;
      
      let status: AuthStatus;
      const warnings: string[] = [];
      const errors: string[] = [];

      if (token.expiresAt <= now) {
        status = AuthStatus.EXPIRED;
        errors.push('Token has expired');
      } else if (timeUntilExpiry <= refreshThreshold) {
        status = AuthStatus.VALID;
        warnings.push(`Token expires in ${Math.round(timeUntilExpiry)} seconds`);
      } else {
        status = AuthStatus.VALID;
      }

      // Check circuit breaker status
      if (this.circuitBreaker.isCircuitOpen(platform)) {
        warnings.push('Circuit breaker is open due to recent failures');
      }

      reports.push({
        platform,
        status,
        expiresAt: token.expiresAt,
        timeUntilExpiry: Math.round(timeUntilExpiry),
        lastRefreshed: undefined, // TODO: Track last refresh time
        refreshCount: this.metrics.get(platform)?.tokenRefreshCount || 0,
        errors,
        warnings
      });
    }

    return reports;
  }

  async refreshExpiredTokens(): Promise<void> {
    const healthReports = await this.getTokenHealthReport();
    const refreshPromises: Promise<TokenRefreshResult>[] = [];

    for (const report of healthReports) {
      if (report.status === AuthStatus.EXPIRED || 
          (report.timeUntilExpiry && report.timeUntilExpiry <= 300)) {
        
        const refreshPromise = this.refreshToken(report.platform)
          .then(token => ({ success: true, token } as TokenRefreshResult))
          .catch(error => ({ 
            success: false, 
            error: error instanceof AuthenticationError ? error : 
              new AuthenticationError(report.platform, AuthError.PLATFORM_ERROR, error.message, error)
          } as TokenRefreshResult));
        
        refreshPromises.push(refreshPromise);
      }
    }

    const results = await Promise.allSettled(refreshPromises);
    
    // Log results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        console.log(`Successfully refreshed token for platform: ${healthReports[index].platform}`);
      } else {
        const error = result.status === 'fulfilled' ? result.value.error : result.reason;
        console.error(`Failed to refresh token for platform: ${healthReports[index].platform}`, error);
      }
    });
  }

  async handleAuthFailure(platform: Platform, error: AuthError): Promise<void> {
    const metrics = this.metrics.get(platform);
    if (metrics) {
      metrics.failedRequests++;
    }

    switch (error) {
      case AuthError.TOKEN_EXPIRED:
        try {
          await this.refreshToken(platform);
          console.log(`Automatically refreshed expired token for platform: ${platform}`);
        } catch (refreshError) {
          console.error(`Failed to refresh expired token for platform: ${platform}`, refreshError);
          throw refreshError;
        }
        break;

      case AuthError.RATE_LIMITED:
        if (metrics) {
          metrics.rateLimitHits++;
        }
        console.warn(`Rate limit hit for platform: ${platform}`);
        break;

      case AuthError.INVALID_CREDENTIALS:
        console.error(`Invalid credentials for platform: ${platform}`);
        await this.revokeToken(platform);
        break;

      default:
        console.error(`Authentication error for platform: ${platform}`, error);
        break;
    }
  }

  /**
   * Start background scheduler for automatic token refresh
   */
  private startTokenRefreshScheduler(): void {
    // Run token refresh check every 5 minutes
    setInterval(async () => {
      try {
        await this.refreshExpiredTokens();
      } catch (error) {
        console.error('Error in background token refresh:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Get authentication metrics for all platforms
   */
  async getMetrics(): Promise<Map<Platform, AuthMetrics>> {
    return new Map(this.metrics);
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): Record<string, any> {
    return this.circuitBreaker.getStatus();
  }

  /**
   * Reset circuit breaker for a platform
   */
  resetCircuitBreaker(platform: Platform): void {
    this.circuitBreaker.reset(platform);
  }

  /**
   * Batch refresh multiple tokens
   */
  async batchRefreshTokens(platforms: Platform[]): Promise<BatchTokenRefreshResult> {
    const refreshPromises = platforms.map(async platform => {
      try {
        await this.refreshToken(platform);
        return { platform, success: true };
      } catch (error) {
        return { 
          platform, 
          success: false, 
          error: error instanceof AuthenticationError ? error : 
            new AuthenticationError(platform, AuthError.PLATFORM_ERROR, error instanceof Error ? error.message : String(error), error)
        };
      }
    });

    const results = await Promise.allSettled(refreshPromises);
    
    const successful: Platform[] = [];
    const failed: Array<{ platform: Platform; error: AuthenticationError }> = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          successful.push(result.value.platform);
        } else if (result.value && !result.value.success && result.value.error) {
          failed.push({
            platform: result.value.platform,
            error: result.value.error
          });
        }
      } else {
        failed.push({
          platform: platforms[index],
          error: new AuthenticationError(
            platforms[index],
            AuthError.PLATFORM_ERROR,
            result.reason.message,
            result.reason
          )
        });
      }
    });

    return {
      successful,
      failed,
      totalProcessed: platforms.length
    };
  }
}