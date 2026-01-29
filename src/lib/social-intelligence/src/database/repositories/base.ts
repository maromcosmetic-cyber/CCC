/**
 * Base repository class with common database operations
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getDatabase } from '../connection';

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  hasMore: boolean;
  nextOffset?: number;
}

export abstract class BaseRepository<T> {
  protected client: SupabaseClient<any, 'public', any>;
  protected tableName: string;

  constructor(tableName: string) {
    this.client = getDatabase().getClient();
    this.tableName = tableName;
  }

  /**
   * Find a record by ID
   */
  async findById(id: string): Promise<T | null> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Record not found
        }
        throw error;
      }

      return this.mapFromDatabase(data);
    } catch (error) {
      console.error(`Error finding ${this.tableName} by ID:`, error);
      throw error;
    }
  }

  /**
   * Find multiple records with options
   */
  async find(options: QueryOptions = {}): Promise<PaginatedResult<T>> {
    try {
      let query = this.client
        .from(this.tableName)
        .select('*', { count: 'exact' });

      // Apply filters
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      // Apply ordering
      if (options.orderBy) {
        query = query.order(options.orderBy, { 
          ascending: options.orderDirection !== 'desc' 
        });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      const mappedData = data?.map(item => this.mapFromDatabase(item)) || [];
      const totalCount = count || 0;
      const hasMore = options.limit ? 
        (options.offset || 0) + mappedData.length < totalCount : 
        false;

      return {
        data: mappedData,
        count: totalCount,
        hasMore,
        nextOffset: hasMore ? (options.offset || 0) + (options.limit || 10) : undefined
      };
    } catch (error) {
      console.error(`Error finding ${this.tableName} records:`, error);
      throw error;
    }
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>): Promise<T> {
    try {
      const dbData = this.mapToDatabase(data);
      
      const { data: result, error } = await this.client
        .from(this.tableName)
        .insert(dbData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return this.mapFromDatabase(result);
    } catch (error) {
      console.error(`Error creating ${this.tableName} record:`, error);
      throw error;
    }
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    try {
      const dbData = this.mapToDatabase(data);
      
      const { data: result, error } = await this.client
        .from(this.tableName)
        .update(dbData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return this.mapFromDatabase(result);
    } catch (error) {
      console.error(`Error updating ${this.tableName} record:`, error);
      throw error;
    }
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error(`Error deleting ${this.tableName} record:`, error);
      throw error;
    }
  }

  /**
   * Count records with optional filters
   */
  async count(filters?: Record<string, any>): Promise<number> {
    try {
      let query = this.client
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      const { count, error } = await query;

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error(`Error counting ${this.tableName} records:`, error);
      throw error;
    }
  }

  /**
   * Execute a custom query
   */
  protected async executeQuery(query: string, params?: any[]): Promise<any> {
    try {
      const { data, error } = await this.client.rpc('exec_sql', {
        sql: query,
        params: params || []
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`Error executing custom query:`, error);
      throw error;
    }
  }

  /**
   * Map database record to domain model
   * Override in subclasses for custom mapping
   */
  protected mapFromDatabase(data: any): T {
    return data as T;
  }

  /**
   * Map domain model to database record
   * Override in subclasses for custom mapping
   */
  protected mapToDatabase(data: Partial<T>): any {
    return data;
  }

  /**
   * Validate data before database operations
   * Override in subclasses for custom validation
   */
  protected validate(data: Partial<T>): void {
    // Base validation - override in subclasses
  }
}