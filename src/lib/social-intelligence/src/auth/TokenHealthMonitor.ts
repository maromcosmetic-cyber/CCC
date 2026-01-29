/**
 * Token Health Monitoring Service
 * Monitors token expiration and automatically refreshes tokens
 */

import { AuthManager } from './AuthManager';
import { Platform } from '../types/core';
import { TokenHealthReport } from './types';

export class TokenHealthMonitor {
  private authManager: AuthManager;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly checkIntervalMs: number = 5 * 60 * 1000; // 5 minutes
  private readonly refreshThresholdMs: number = 10 * 60 * 1000; // 10 minutes before expiry

  constructor(authManager: AuthManager) {
    this.authManager = authManager;
  }

  /**
   * Start monitoring token health
   */
  start(): void {
    if (this.monitoringInterval) {
      console.warn('Token health monitoring is already running');
      return;
    }

    console.log('Starting token health monitoring...');
    this.monitoringInterval = setInterval(() => {
      this.checkAndRefreshTokens().catch(console.error);
    }, this.checkIntervalMs);

    // Run initial check
    this.checkAndRefreshTokens().catch(console.error);
  }

  /**
   * Stop monitoring token health
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('Token health monitoring stopped');
    }
  }

  /**
   * Get current health status for all platforms
   */
  async getHealthStatus(): Promise<TokenHealthReport[]> {
    return await this.authManager.monitorTokenHealth();
  }

  /**
   * Check and refresh tokens that are about to expire
   */
  private async checkAndRefreshTokens(): Promise<void> {
    try {
      const healthReports = await this.authManager.monitorTokenHealth();
      
      for (const report of healthReports) {
        if (this.shouldRefreshToken(report)) {
          console.log(`Refreshing token for ${report.platform} (expires in ${report.expiresIn}s)`);
          
          try {
            await this.authManager.getValidToken(report.platform);
            console.log(`Successfully refreshed token for ${report.platform}`);
          } catch (error) {
            console.error(`Failed to refresh token for ${report.platform}:`, error);
            
            // Handle the auth failure
            if (error instanceof Error) {
              await this.authManager.handleAuthFailure(report.platform, error as any);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error during token health check:', error);
    }
  }

  /**
   * Determine if a token should be refreshed based on health report
   */
  private shouldRefreshToken(report: TokenHealthReport): boolean {
    // Don't refresh if token is already invalid (will be handled on next request)
    if (!report.isValid) {
      return false;
    }

    // Refresh if token expires within threshold
    const expiresInMs = report.expiresIn * 1000;
    return expiresInMs <= this.refreshThresholdMs;
  }

  /**
   * Force refresh all tokens
   */
  async forceRefreshAll(): Promise<void> {
    console.log('Force refreshing all tokens...');
    
    const platforms = Object.values(Platform);
    const refreshPromises = platforms.map(async (platform) => {
      try {
        await this.authManager.getValidToken(platform);
        console.log(`Force refreshed token for ${platform}`);
      } catch (error) {
        console.error(`Failed to force refresh token for ${platform}:`, error);
      }
    });

    await Promise.allSettled(refreshPromises);
    console.log('Force refresh completed');
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats(): {
    isRunning: boolean;
    checkIntervalMs: number;
    refreshThresholdMs: number;
    nextCheckIn: number;
  } {
    const nextCheckIn = this.monitoringInterval ? this.checkIntervalMs : 0;
    
    return {
      isRunning: this.monitoringInterval !== null,
      checkIntervalMs: this.checkIntervalMs,
      refreshThresholdMs: this.refreshThresholdMs,
      nextCheckIn
    };
  }
}