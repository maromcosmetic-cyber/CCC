/**
 * Database connection and configuration for Social Intelligence Engine
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface DatabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  schema?: string;
}

export class DatabaseConnection {
  private client: SupabaseClient<any, 'public', any>;
  private serviceClient?: SupabaseClient<any, 'public', any>;

  constructor(config: DatabaseConfig) {
    // Public client for authenticated operations
    this.client = createClient(config.url, config.anonKey, {
      db: {
        schema: 'public'
      }
    });

    // Service client for admin operations (if service role key provided)
    if (config.serviceRoleKey) {
      this.serviceClient = createClient(config.url, config.serviceRoleKey, {
        db: {
          schema: 'public'
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    }
  }

  /**
   * Get the public client for authenticated operations
   */
  getClient(): SupabaseClient<any, 'public', any> {
    return this.client;
  }

  /**
   * Get the service client for admin operations
   */
  getServiceClient(): SupabaseClient<any, 'public', any> {
    if (!this.serviceClient) {
      throw new Error('Service client not available. Service role key not provided.');
    }
    return this.serviceClient;
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('social_events')
        .select('count', { count: 'exact', head: true });
      
      return !error;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Run database migrations
   */
  async runMigrations(migrations: string[]): Promise<void> {
    if (!this.serviceClient) {
      throw new Error('Service client required for migrations');
    }

    for (const migration of migrations) {
      try {
        const { error } = await this.serviceClient.rpc('exec_sql', {
          sql: migration
        });

        if (error) {
          throw new Error(`Migration failed: ${error.message}`);
        }
      } catch (error) {
        console.error('Migration error:', error);
        throw error;
      }
    }
  }

  /**
   * Get database health metrics
   */
  async getHealthMetrics(): Promise<{
    connectionCount: number;
    avgResponseTime: number;
    errorRate: number;
  }> {
    try {
      const start = Date.now();
      
      const { data, error } = await this.client
        .from('performance_metrics')
        .select('*')
        .eq('component', 'database')
        .order('timestamp', { ascending: false })
        .limit(100);

      const responseTime = Date.now() - start;

      if (error) {
        throw error;
      }

      // Calculate metrics from recent performance data
      const connectionCount = data?.filter(m => m.metric_name === 'connection_count').length || 0;
      const avgResponseTime = data?.filter(m => m.metric_name === 'response_time')
        .reduce((sum, m) => sum + m.metric_value, 0) / Math.max(1, data?.length || 1);
      const errorRate = data?.filter(m => m.metric_name === 'error_rate')
        .reduce((sum, m) => sum + m.metric_value, 0) / Math.max(1, data?.length || 1);

      return {
        connectionCount,
        avgResponseTime: avgResponseTime || responseTime,
        errorRate: errorRate || 0
      };
    } catch (error) {
      console.error('Failed to get health metrics:', error);
      return {
        connectionCount: 0,
        avgResponseTime: 0,
        errorRate: 1
      };
    }
  }
}

// Singleton instance
let dbConnection: DatabaseConnection | null = null;

/**
 * Initialize database connection
 */
export function initializeDatabase(config: DatabaseConfig): DatabaseConnection {
  if (!dbConnection) {
    dbConnection = new DatabaseConnection(config);
  }
  return dbConnection;
}

/**
 * Get the current database connection
 */
export function getDatabase(): DatabaseConnection {
  if (!dbConnection) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return dbConnection;
}