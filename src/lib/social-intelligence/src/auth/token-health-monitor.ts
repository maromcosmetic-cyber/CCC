/**
 * Token Health Monitoring Service
 * Monitors token health and automatically refreshes tokens before expiration
 */

import { Platform } from '../types/core';
import {
  AuthManager,
  TokenHealthReport,
  AuthStatus,
  AuthToken,
  BatchTokenRefreshResult,
  PLATFORM_AUTH_CONFIGS
} from './types';

export interface TokenHealthMonitorConfig {
  checkInterval: number; // milliseconds between health checks
  refreshThreshold: number; // seconds before expiry to trigger refresh
  maxConcurrentRefreshes: number; // max number of simultaneous refreshes
  alertThresholds: {
    warningBeforeExpiry: number; // seconds
    criticalBeforeExpiry: number; // seconds
  };
  retryFailedRefreshAfter: number; // seconds to wait before retrying failed refresh
}

export interface TokenHealthAlert {
  platform: Platform;
  severity: 'info' | 'warning' | 'critical' | 'error';
  message: string;
  timestamp: Date;
  metadata?: any;
}

export interface TokenHealthMetrics {
  totalTokens: number;
  healthyTokens: number;
  expiredTokens: number;
  expiringTokens: number;
  failedRefreshes: number;
  successfulRefreshes: number;
  lastCheckTime: Date;
  nextCheckTime: Date;
  alerts: TokenHealthAlert[];
}

/**
 * Token Health Monitoring Service
 */
export class TokenHealthMonitor {
  private authManager: AuthManager;
  private config: TokenHealthMonitorConfig;
  private monitoringInterval?: NodeJS.Timeout;
  private isRunning = false;
  private refreshQueue: Set<Platform> = new Set();
  private failedRefreshAttempts: Map<Platform, { count: number; lastAttempt: Date }> = new Map();
  private metrics: TokenHealthMetrics;
  private alertHandlers: Array<(alert: TokenHealthAlert) => void> = [];

  constructor(authManager: AuthManager, config?: Partial<TokenHealthMonitorConfig>) {
    this.authManager = authManager;
    this.config = {
      checkInterval: 5 * 60 * 1000, // 5 minutes
      refreshThreshold: 300, // 5 minutes
      maxConcurrentRefreshes: 3,
      alertThresholds: {
        warningBeforeExpiry: 1800, // 30 minutes
        criticalBeforeExpiry: 600 // 10 minutes
      },
      retryFailedRefreshAfter: 1800, // 30 minutes
      ...config
    };

    this.metrics = this.initializeMetrics();
  }

  private initializeMetrics(): TokenHealthMetrics {
    return {
      totalTokens: 0,
      healthyTokens: 0,
      expiredTokens: 0,
      expiringTokens: 0,
      failedRefreshes: 0,
      successfulRefreshes: 0,
      lastCheckTime: new Date(),
      nextCheckTime: new Date(Date.now() + this.config.checkInterval),
      alerts: []
    };
  }

  /**
   * Start the token health monitoring service
   */
  start(): void {
    if (this.isRunning) {
      console.warn('Token health monitor is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting token health monitor...');

    // Perform initial health check
    this.performHealthCheck().catch(error => {
      console.error('Error in initial health check:', error);
    });

    // Schedule periodic health checks
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck().catch(error => {
        console.error('Error in periodic health check:', error);
      });
    }, this.config.checkInterval);

    this.emitAlert({
      platform: Platform.RSS, // Use RSS as a generic platform for system alerts
      severity: 'info',
      message: 'Token health monitoring started',
      timestamp: new Date()
    });
  }

  /**
   * Stop the token health monitoring service
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    console.log('Token health monitor stopped');
    
    this.emitAlert({
      platform: Platform.RSS,
      severity: 'info',
      message: 'Token health monitoring stopped',
      timestamp: new Date()
    });
  }

  /**
   * Perform a comprehensive health check of all tokens
   */
  async performHealthCheck(): Promise<TokenHealthMetrics> {
    const startTime = Date.now();
    
    try {
      // Get health reports from auth manager
      const healthReports = await this.authManager.getTokenHealthReport();
      
      // Update metrics
      this.updateMetrics(healthReports);
      
      // Process each token's health status
      const refreshPromises: Promise<void>[] = [];
      
      for (const report of healthReports) {
        await this.processTokenHealth(report, refreshPromises);
      }

      // Wait for all refresh operations to complete (with concurrency limit)
      if (refreshPromises.length > 0) {
        await this.executeConcurrentRefreshes(refreshPromises);
      }

      // Update timing metrics
      this.metrics.lastCheckTime = new Date();
      this.metrics.nextCheckTime = new Date(Date.now() + this.config.checkInterval);

      const duration = Date.now() - startTime;
      console.log(`Health check completed in ${duration}ms. Processed ${healthReports.length} tokens.`);

      return this.metrics;
      
    } catch (error) {
      console.error('Error during health check:', error);
      
      this.emitAlert({
        platform: Platform.RSS,
        severity: 'error',
        message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
        metadata: { error: error instanceof Error ? error.stack : String(error) }
      });
      
      throw error;
    }
  }

  /**
   * Process individual token health and determine actions
   */
  private async processTokenHealth(
    report: TokenHealthReport,
    refreshPromises: Promise<void>[]
  ): Promise<void> {
    const { platform, status, timeUntilExpiry, errors, warnings } = report;

    // Emit alerts for errors and warnings
    for (const error of errors) {
      this.emitAlert({
        platform,
        severity: 'error',
        message: error,
        timestamp: new Date()
      });
    }

    for (const warning of warnings) {
      this.emitAlert({
        platform,
        severity: 'warning',
        message: warning,
        timestamp: new Date()
      });
    }

    // Check if token needs refresh
    if (this.shouldRefreshToken(report)) {
      if (!this.refreshQueue.has(platform)) {
        this.refreshQueue.add(platform);
        
        const refreshPromise = this.refreshTokenWithRetry(platform)
          .finally(() => {
            this.refreshQueue.delete(platform);
          });
        
        refreshPromises.push(refreshPromise);
      }
    }

    // Check for alert thresholds
    if (timeUntilExpiry !== undefined) {
      if (timeUntilExpiry <= this.config.alertThresholds.criticalBeforeExpiry) {
        this.emitAlert({
          platform,
          severity: 'critical',
          message: `Token expires in ${Math.round(timeUntilExpiry)} seconds`,
          timestamp: new Date(),
          metadata: { timeUntilExpiry, status }
        });
      } else if (timeUntilExpiry <= this.config.alertThresholds.warningBeforeExpiry) {
        this.emitAlert({
          platform,
          severity: 'warning',
          message: `Token expires in ${Math.round(timeUntilExpiry / 60)} minutes`,
          timestamp: new Date(),
          metadata: { timeUntilExpiry, status }
        });
      }
    }
  }

  /**
   * Determine if a token should be refreshed
   */
  private shouldRefreshToken(report: TokenHealthReport): boolean {
    const { platform, status, timeUntilExpiry } = report;

    // Don't refresh if already expired (let auth manager handle this)
    if (status === AuthStatus.EXPIRED) {
      return false;
    }

    // Don't refresh if already in queue
    if (this.refreshQueue.has(platform)) {
      return false;
    }

    // Check if we recently failed to refresh this token
    const failedAttempt = this.failedRefreshAttempts.get(platform);
    if (failedAttempt) {
      const timeSinceLastAttempt = (Date.now() - failedAttempt.lastAttempt.getTime()) / 1000;
      if (timeSinceLastAttempt < this.config.retryFailedRefreshAfter) {
        return false;
      }
    }

    // Check if token is close to expiring
    if (timeUntilExpiry !== undefined) {
      const platformConfig = PLATFORM_AUTH_CONFIGS[platform];
      const refreshThreshold = platformConfig?.tokenRefreshThreshold || this.config.refreshThreshold;
      
      return timeUntilExpiry <= refreshThreshold;
    }

    return false;
  }

  /**
   * Refresh token with retry logic and error handling
   */
  private async refreshTokenWithRetry(platform: Platform): Promise<void> {
    try {
      console.log(`Attempting to refresh token for platform: ${platform}`);
      
      await this.authManager.refreshToken(platform);
      
      // Clear failed attempts on success
      this.failedRefreshAttempts.delete(platform);
      this.metrics.successfulRefreshes++;
      
      this.emitAlert({
        platform,
        severity: 'info',
        message: 'Token refreshed successfully',
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error(`Failed to refresh token for platform ${platform}:`, error);
      
      // Track failed attempt
      const currentAttempts = this.failedRefreshAttempts.get(platform) || { count: 0, lastAttempt: new Date() };
      this.failedRefreshAttempts.set(platform, {
        count: currentAttempts.count + 1,
        lastAttempt: new Date()
      });
      
      this.metrics.failedRefreshes++;
      
      this.emitAlert({
        platform,
        severity: 'error',
        message: `Token refresh failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
        metadata: { 
          error: error instanceof Error ? error.stack : String(error),
          attemptCount: currentAttempts.count + 1
        }
      });
    }
  }

  /**
   * Execute concurrent token refreshes with concurrency limit
   */
  private async executeConcurrentRefreshes(refreshPromises: Promise<void>[]): Promise<void> {
    const { maxConcurrentRefreshes } = this.config;
    
    if (refreshPromises.length <= maxConcurrentRefreshes) {
      await Promise.allSettled(refreshPromises);
      return;
    }

    // Execute in batches to respect concurrency limit
    for (let i = 0; i < refreshPromises.length; i += maxConcurrentRefreshes) {
      const batch = refreshPromises.slice(i, i + maxConcurrentRefreshes);
      await Promise.allSettled(batch);
    }
  }

  /**
   * Update metrics based on health reports
   */
  private updateMetrics(healthReports: TokenHealthReport[]): void {
    this.metrics.totalTokens = healthReports.length;
    this.metrics.healthyTokens = 0;
    this.metrics.expiredTokens = 0;
    this.metrics.expiringTokens = 0;

    for (const report of healthReports) {
      switch (report.status) {
        case AuthStatus.VALID:
          if (report.timeUntilExpiry && report.timeUntilExpiry <= this.config.alertThresholds.warningBeforeExpiry) {
            this.metrics.expiringTokens++;
          } else {
            this.metrics.healthyTokens++;
          }
          break;
        case AuthStatus.EXPIRED:
          this.metrics.expiredTokens++;
          break;
        default:
          // Count invalid/revoked as expired for metrics purposes
          this.metrics.expiredTokens++;
          break;
      }
    }
  }

  /**
   * Emit an alert to all registered handlers
   */
  private emitAlert(alert: TokenHealthAlert): void {
    this.metrics.alerts.push(alert);
    
    // Keep only recent alerts (last 100)
    if (this.metrics.alerts.length > 100) {
      this.metrics.alerts = this.metrics.alerts.slice(-100);
    }

    // Notify all alert handlers
    for (const handler of this.alertHandlers) {
      try {
        handler(alert);
      } catch (error) {
        console.error('Error in alert handler:', error);
      }
    }
  }

  /**
   * Register an alert handler
   */
  onAlert(handler: (alert: TokenHealthAlert) => void): void {
    this.alertHandlers.push(handler);
  }

  /**
   * Remove an alert handler
   */
  offAlert(handler: (alert: TokenHealthAlert) => void): void {
    const index = this.alertHandlers.indexOf(handler);
    if (index > -1) {
      this.alertHandlers.splice(index, 1);
    }
  }

  /**
   * Get current health metrics
   */
  getMetrics(): TokenHealthMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(count: number = 50): TokenHealthAlert[] {
    return this.metrics.alerts.slice(-count);
  }

  /**
   * Clear old alerts
   */
  clearAlerts(): void {
    this.metrics.alerts = [];
  }

  /**
   * Force refresh of specific platform token
   */
  async forceRefresh(platform: Platform): Promise<void> {
    if (this.refreshQueue.has(platform)) {
      throw new Error(`Refresh already in progress for platform: ${platform}`);
    }

    await this.refreshTokenWithRetry(platform);
  }

  /**
   * Force refresh of all platform tokens
   */
  async forceRefreshAll(): Promise<BatchTokenRefreshResult> {
    const healthReports = await this.authManager.getTokenHealthReport();
    const platforms = healthReports.map(report => report.platform);
    
    // Use auth manager's batch refresh functionality
    if ('batchRefreshTokens' in this.authManager) {
      return await (this.authManager as any).batchRefreshTokens(platforms);
    }

    // Fallback to individual refreshes
    const results: BatchTokenRefreshResult = {
      successful: [],
      failed: [],
      totalProcessed: platforms.length
    };

    for (const platform of platforms) {
      try {
        await this.forceRefresh(platform);
        results.successful.push(platform);
      } catch (error) {
        results.failed.push({
          platform,
          error: error as any
        });
      }
    }

    return results;
  }

  /**
   * Get health status summary
   */
  getHealthSummary(): {
    overall: 'healthy' | 'warning' | 'critical';
    details: string;
    recommendations: string[];
  } {
    const { totalTokens, healthyTokens, expiredTokens, expiringTokens, failedRefreshes } = this.metrics;
    
    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
    const recommendations: string[] = [];
    
    if (expiredTokens > 0) {
      overall = 'critical';
      recommendations.push(`${expiredTokens} token(s) have expired and need manual intervention`);
    } else if (expiringTokens > 0 || failedRefreshes > 0) {
      overall = 'warning';
      if (expiringTokens > 0) {
        recommendations.push(`${expiringTokens} token(s) are expiring soon`);
      }
      if (failedRefreshes > 0) {
        recommendations.push('Some token refreshes have failed - check platform credentials');
      }
    }

    const healthyPercentage = totalTokens > 0 ? Math.round((healthyTokens / totalTokens) * 100) : 100;
    
    return {
      overall,
      details: `${healthyTokens}/${totalTokens} tokens healthy (${healthyPercentage}%)`,
      recommendations
    };
  }
}