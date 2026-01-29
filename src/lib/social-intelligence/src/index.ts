/**
 * Brand-Aware Social Intelligence & Action Engine
 * Main entry point for the social intelligence system
 */

// Core types and schemas
export * from './types/core';

// Authentication and token management
export * from './auth';

// Analytics and performance tracking
export * from './analytics';

// Database connection and repositories
export { DatabaseConnection, initializeDatabase, getDatabase } from './database/connection';
export { BaseRepository } from './database/repositories/base';
export { SocialEventsRepository } from './database/repositories/social-events';

// Version information
export const VERSION = '1.0.0';
export const BUILD_DATE = new Date().toISOString();

/**
 * Initialize the Social Intelligence Engine
 */
export interface SocialIntelligenceConfig {
  database: {
    url: string;
    anonKey: string;
    serviceRoleKey?: string;
    schema?: string;
  };
  ai?: {
    openaiApiKey?: string;
    anthropicApiKey?: string;
  };
  platforms?: {
    tiktok?: {
      clientId: string;
      clientSecret: string;
    };
    meta?: {
      appId: string;
      appSecret: string;
    };
    youtube?: {
      apiKey: string;
      clientId: string;
      clientSecret: string;
    };
    reddit?: {
      clientId: string;
      clientSecret: string;
      userAgent: string;
    };
  };
  monitoring?: {
    enabled: boolean;
    metricsEndpoint?: string;
    alertsEndpoint?: string;
  };
}

export class SocialIntelligenceEngine {
  private config: SocialIntelligenceConfig;
  private initialized = false;

  constructor(config: SocialIntelligenceConfig) {
    this.config = config;
  }

  /**
   * Initialize the engine with all required services
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize database connection
      const db = initializeDatabase(this.config.database);
      
      // Test database connection
      const isConnected = await db.testConnection();
      if (!isConnected) {
        throw new Error('Failed to connect to database');
      }

      // TODO: Initialize other services
      // - Platform adapters
      // - AI services
      // - Event processing pipeline
      // - Decision engine
      // - Monitoring services

      this.initialized = true;
      console.log('Social Intelligence Engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Social Intelligence Engine:', error);
      throw error;
    }
  }

  /**
   * Get engine status and health metrics
   */
  async getStatus(): Promise<{
    initialized: boolean;
    version: string;
    buildDate: string;
    database: {
      connected: boolean;
      health: any;
    };
    services: {
      [key: string]: {
        status: 'running' | 'stopped' | 'error';
        lastCheck: string;
      };
    };
  }> {
    const db = getDatabase();
    const dbHealth = await db.getHealthMetrics();

    return {
      initialized: this.initialized,
      version: VERSION,
      buildDate: BUILD_DATE,
      database: {
        connected: await db.testConnection(),
        health: dbHealth
      },
      services: {
        // TODO: Add service status checks
        ingestion: {
          status: 'stopped',
          lastCheck: new Date().toISOString()
        },
        intelligence: {
          status: 'stopped',
          lastCheck: new Date().toISOString()
        },
        decision: {
          status: 'stopped',
          lastCheck: new Date().toISOString()
        }
      }
    };
  }

  /**
   * Shutdown the engine gracefully
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      // TODO: Shutdown services gracefully
      // - Stop event processing
      // - Close database connections
      // - Stop monitoring

      this.initialized = false;
      console.log('Social Intelligence Engine shutdown complete');
    } catch (error) {
      console.error('Error during engine shutdown:', error);
      throw error;
    }
  }
}

// Default export
export default SocialIntelligenceEngine;