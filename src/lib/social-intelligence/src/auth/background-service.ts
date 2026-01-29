/**
 * Authentication Background Service
 * Manages background tasks for authentication including token refresh and health monitoring
 */

import { EventEmitter } from 'events';
import { Platform } from '../types/core';
import { AuthManager, AuthError } from './types';
import { TokenHealthMonitor, TokenHealthMonitorConfig, TokenHealthAlert } from './token-health-monitor';

export interface BackgroundServiceConfig {
  tokenHealthMonitor?: Partial<TokenHealthMonitorConfig>;
  enableMetricsCollection: boolean;
  metricsCollectionInterval: number; // milliseconds
  enableAlertLogging: boolean;
  alertLogLevel: 'info' | 'warn' | 'error';
}

export interface BackgroundServiceMetrics {
  uptime: number; // milliseconds
  totalTokenRefreshes: number;
  successfulRefreshes: number;
  failedRefreshes: number;
  totalHealthChecks: number;
  averageHealthCheckDuration: number;
  alertsGenerated: number;
  lastHealthCheck: Date;
  serviceStatus: 'running' | 'stopped' | 'error';
}

/**
 * Background service for authentication management
 */
export class AuthBackgroundService extends EventEmitter {
  private authManager: AuthManager;
  private tokenHealthMonitor: TokenHealthMonitor;
  private config: BackgroundServiceConfig;
  private isRunning = false;
  private startTime?: Date;
  private metrics: BackgroundServiceMetrics;
  private metricsInterval?: NodeJS.Timeout;

  constructor(
    authManager: AuthManager,
    config?: Partial<BackgroundServiceConfig>
  ) {
    super();
    
    this.authManager = authManager;
    this.config = {
      enableMetricsCollection: true,
      metricsCollectionInterval: 60000, // 1 minute
      enableAlertLogging: true,
      alertLogLevel: 'warn',
      ...config
    };

    this.tokenHealthMonitor = new TokenHealthMonitor(
      authManager,
      config?.tokenHealthMonitor
    );

    this.metrics = this.initializeMetrics();
    this.setupEventHandlers();
  }

  private initializeMetrics(): BackgroundServiceMetrics {
    return {
      uptime: 0,
      totalTokenRefreshes: 0,
      successfulRefreshes: 0,
      failedRefreshes: 0,
      totalHealthChecks: 0,
      averageHealthCheckDuration: 0,
      alertsGenerated: 0,
      lastHealthCheck: new Date(),
      serviceStatus: 'stopped'
    };
  }

  private setupEventHandlers(): void {
    // Handle token health alerts
    this.tokenHealthMonitor.onAlert((alert: TokenHealthAlert) => {
      this.handleHealthAlert(alert);
    });

    // Handle auth manager events if it's an EventEmitter
    if (this.authManager instanceof EventEmitter) {
      this.authManager.on('tokenRefreshed', (platform: Platform) => {
        this.metrics.totalTokenRefreshes++;
        this.metrics.successfulRefreshes++;
        this.emit('tokenRefreshed', platform);
      });

      this.authManager.on('tokenRefreshFailed', (platform: Platform, error: any) => {
        this.metrics.totalTokenRefreshes++;
        this.metrics.failedRefreshes++;
        this.emit('tokenRefreshFailed', platform, error);
      });
    }
  }

  private handleHealthAlert(alert: TokenHealthAlert): void {
    this.metrics.alertsGenerated++;

    if (this.config.enableAlertLogging) {
      const logMessage = `[${alert.platform}] ${alert.message}`;
      
      switch (alert.severity) {
        case 'error':
        case 'critical':
          console.error(`AUTH ALERT: ${logMessage}`, alert.metadata);
          break;
        case 'warning':
          console.warn(`AUTH ALERT: ${logMessage}`, alert.metadata);
          break;
        case 'info':
          console.log(`AUTH ALERT: ${logMessage}`, alert.metadata);
          break;
      }
    }

    // Emit alert event for external handlers
    this.emit('alert', alert);

    // Handle critical alerts
    if (alert.severity === 'critical') {
      this.emit('criticalAlert', alert);
    }
  }

  /**
   * Start the background service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Auth background service is already running');
      return;
    }

    try {
      this.isRunning = true;
      this.startTime = new Date();
      this.metrics.serviceStatus = 'running';

      // Start token health monitoring
      this.tokenHealthMonitor.start();

      // Start metrics collection if enabled
      if (this.config.enableMetricsCollection) {
        this.startMetricsCollection();
      }

      console.log('Auth background service started successfully');
      this.emit('started');

    } catch (error) {
      this.metrics.serviceStatus = 'error';
      console.error('Failed to start auth background service:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stop the background service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      this.isRunning = false;
      this.metrics.serviceStatus = 'stopped';

      // Stop token health monitoring
      this.tokenHealthMonitor.stop();

      // Stop metrics collection
      if (this.metricsInterval) {
        clearInterval(this.metricsInterval);
        this.metricsInterval = undefined;
      }

      console.log('Auth background service stopped');
      this.emit('stopped');

    } catch (error) {
      this.metrics.serviceStatus = 'error';
      console.error('Error stopping auth background service:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, this.config.metricsCollectionInterval);
  }

  /**
   * Update service metrics
   */
  private updateMetrics(): void {
    if (this.startTime) {
      this.metrics.uptime = Date.now() - this.startTime.getTime();
    }

    // Get health monitor metrics
    const healthMetrics = this.tokenHealthMonitor.getMetrics();
    this.metrics.lastHealthCheck = healthMetrics.lastCheckTime;

    // Emit metrics event for external monitoring
    this.emit('metrics', this.getMetrics());
  }

  /**
   * Get current service metrics
   */
  getMetrics(): BackgroundServiceMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get token health metrics
   */
  getTokenHealthMetrics() {
    return this.tokenHealthMonitor.getMetrics();
  }

  /**
   * Get service status
   */
  getStatus(): {
    isRunning: boolean;
    uptime: number;
    status: string;
    healthSummary: any;
    recentAlerts: TokenHealthAlert[];
  } {
    const healthSummary = this.tokenHealthMonitor.getHealthSummary();
    const recentAlerts = this.tokenHealthMonitor.getRecentAlerts(10);

    return {
      isRunning: this.isRunning,
      uptime: this.metrics.uptime,
      status: this.metrics.serviceStatus,
      healthSummary,
      recentAlerts
    };
  }

  /**
   * Force token refresh for a specific platform
   */
  async forceTokenRefresh(platform: Platform): Promise<void> {
    try {
      await this.tokenHealthMonitor.forceRefresh(platform);
      this.emit('tokenRefreshed', platform);
    } catch (error) {
      this.emit('tokenRefreshFailed', platform, error);
      throw error;
    }
  }

  /**
   * Force token refresh for all platforms
   */
  async forceTokenRefreshAll(): Promise<any> {
    try {
      const result = await this.tokenHealthMonitor.forceRefreshAll();
      this.emit('batchTokenRefresh', result);
      return result;
    } catch (error) {
      this.emit('batchTokenRefreshFailed', error);
      throw error;
    }
  }

  /**
   * Perform immediate health check
   */
  async performHealthCheck(): Promise<any> {
    const startTime = Date.now();
    
    try {
      const result = await this.tokenHealthMonitor.performHealthCheck();
      
      const duration = Date.now() - startTime;
      this.metrics.totalHealthChecks++;
      
      // Update average duration using exponential moving average
      const alpha = 0.1;
      this.metrics.averageHealthCheckDuration = 
        alpha * duration + (1 - alpha) * this.metrics.averageHealthCheckDuration;

      this.emit('healthCheckCompleted', result);
      return result;
      
    } catch (error) {
      this.emit('healthCheckFailed', error);
      throw error;
    }
  }

  /**
   * Handle authentication failures
   */
  async handleAuthFailure(platform: Platform, error: AuthError): Promise<void> {
    try {
      await this.authManager.handleAuthFailure(platform, error);
      
      // Trigger immediate health check after handling failure
      setTimeout(() => {
        this.performHealthCheck().catch(err => {
          console.error('Health check after auth failure handling failed:', err);
        });
      }, 1000);
      
    } catch (handlingError) {
      console.error(`Failed to handle auth failure for ${platform}:`, handlingError);
      this.emit('authFailureHandlingFailed', platform, error, handlingError);
      throw handlingError;
    }
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(count: number = 50): TokenHealthAlert[] {
    return this.tokenHealthMonitor.getRecentAlerts(count);
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.tokenHealthMonitor.clearAlerts();
  }

  /**
   * Register alert handler
   */
  onAlert(handler: (alert: TokenHealthAlert) => void): void {
    this.tokenHealthMonitor.onAlert(handler);
  }

  /**
   * Remove alert handler
   */
  offAlert(handler: (alert: TokenHealthAlert) => void): void {
    this.tokenHealthMonitor.offAlert(handler);
  }

  /**
   * Get comprehensive service report
   */
  async getServiceReport(): Promise<{
    service: BackgroundServiceMetrics;
    tokenHealth: any;
    authManager: any;
    recommendations: string[];
  }> {
    const serviceMetrics = this.getMetrics();
    const tokenHealthMetrics = this.getTokenHealthMetrics();
    const healthSummary = this.tokenHealthMonitor.getHealthSummary();
    
    // Get auth manager metrics if available
    let authManagerMetrics = {};
    if ('getMetrics' in this.authManager) {
      try {
        authManagerMetrics = await (this.authManager as any).getMetrics();
      } catch (error) {
        console.warn('Could not get auth manager metrics:', error instanceof Error ? error.message : String(error));
      }
    }

    const recommendations: string[] = [];
    
    // Add recommendations based on metrics
    if (serviceMetrics.failedRefreshes > serviceMetrics.successfulRefreshes * 0.1) {
      recommendations.push('High token refresh failure rate - check platform credentials and network connectivity');
    }
    
    if (tokenHealthMetrics.expiredTokens > 0) {
      recommendations.push('Some tokens have expired - manual intervention may be required');
    }
    
    if (serviceMetrics.averageHealthCheckDuration > 30000) {
      recommendations.push('Health checks are taking longer than expected - consider optimizing or reducing check frequency');
    }

    recommendations.push(...healthSummary.recommendations);

    return {
      service: serviceMetrics,
      tokenHealth: tokenHealthMetrics,
      authManager: authManagerMetrics,
      recommendations: [...new Set(recommendations)] // Remove duplicates
    };
  }
}