/**
 * Database Audit Storage Implementation
 * 
 * PostgreSQL-based storage for audit logs with optimized queries,
 * indexing, and retention management.
 */

import { Pool, PoolClient } from 'pg';
import {
  IAuditStorage,
  AuditLogEntry,
  AuditQueryFilters,
  AuditStatistics,
  AuditEventType,
  AuditSeverity
} from './AuditLogger';

export class DatabaseAuditStorage implements IAuditStorage {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  /**
   * Initialize database schema for audit logs
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create audit_logs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY,
          timestamp TIMESTAMPTZ NOT NULL,
          event_type VARCHAR(50) NOT NULL,
          severity VARCHAR(20) NOT NULL,
          message TEXT NOT NULL,
          description TEXT,
          
          -- User context
          user_id VARCHAR(255),
          username VARCHAR(255),
          user_email VARCHAR(255),
          user_role VARCHAR(100),
          session_id VARCHAR(255),
          ip_address INET,
          user_agent TEXT,
          
          -- System context
          service_id VARCHAR(100) NOT NULL,
          service_name VARCHAR(255) NOT NULL,
          service_version VARCHAR(50) NOT NULL,
          environment VARCHAR(20) NOT NULL,
          hostname VARCHAR(255) NOT NULL,
          process_id INTEGER NOT NULL,
          request_id VARCHAR(255),
          correlation_id VARCHAR(255),
          
          -- Decision context
          decision_event_id VARCHAR(255),
          decision_id VARCHAR(255),
          confidence DECIMAL(5,2),
          priority_score DECIMAL(5,2),
          routing_decision VARCHAR(50),
          brand_playbook VARCHAR(255),
          brand_persona VARCHAR(255),
          compliance_rules TEXT[],
          
          -- AI analysis
          sentiment_overall DECIMAL(3,2),
          sentiment_confidence DECIMAL(3,2),
          intent_category VARCHAR(100),
          intent_confidence DECIMAL(3,2),
          topics TEXT[],
          
          -- Performance metrics
          duration_ms INTEGER,
          memory_usage_bytes BIGINT,
          cpu_usage_percent DECIMAL(5,2),
          network_latency_ms INTEGER,
          throughput_ops_per_sec DECIMAL(10,2),
          error_rate_percent DECIMAL(5,2),
          
          -- Error details
          error_code VARCHAR(100),
          error_message TEXT,
          stack_trace TEXT,
          caused_by_event_id UUID,
          
          -- Additional data
          metadata JSONB,
          tags TEXT[],
          
          -- Compliance and retention
          retention_policy VARCHAR(100) DEFAULT 'default',
          compliance_flags TEXT[],
          
          -- Relationships
          parent_event_id UUID,
          related_event_ids UUID[],
          
          -- Audit metadata
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Create indexes for performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp 
        ON audit_logs (timestamp DESC)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type 
        ON audit_logs (event_type)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_severity 
        ON audit_logs (severity)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id 
        ON audit_logs (user_id) WHERE user_id IS NOT NULL
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_service_id 
        ON audit_logs (service_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_decision_id 
        ON audit_logs (decision_id) WHERE decision_id IS NOT NULL
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_tags 
        ON audit_logs USING GIN (tags)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata 
        ON audit_logs USING GIN (metadata)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation_id 
        ON audit_logs (correlation_id) WHERE correlation_id IS NOT NULL
      `);

      // Create retention policy function
      await client.query(`
        CREATE OR REPLACE FUNCTION cleanup_audit_logs(retention_days INTEGER)
        RETURNS INTEGER AS $$
        DECLARE
          deleted_count INTEGER;
        BEGIN
          DELETE FROM audit_logs 
          WHERE timestamp < NOW() - INTERVAL '1 day' * retention_days;
          
          GET DIAGNOSTICS deleted_count = ROW_COUNT;
          RETURN deleted_count;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Store a single audit log entry
   */
  async store(entry: AuditLogEntry): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        INSERT INTO audit_logs (
          id, timestamp, event_type, severity, message, description,
          user_id, username, user_email, user_role, session_id, ip_address, user_agent,
          service_id, service_name, service_version, environment, hostname, process_id,
          request_id, correlation_id,
          decision_event_id, decision_id, confidence, priority_score, routing_decision,
          brand_playbook, brand_persona, compliance_rules,
          sentiment_overall, sentiment_confidence, intent_category, intent_confidence, topics,
          duration_ms, memory_usage_bytes, cpu_usage_percent, network_latency_ms,
          throughput_ops_per_sec, error_rate_percent,
          error_code, error_message, stack_trace, caused_by_event_id,
          metadata, tags, retention_policy, compliance_flags,
          parent_event_id, related_event_ids
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19,
          $20, $21,
          $22, $23, $24, $25, $26,
          $27, $28, $29,
          $30, $31, $32, $33, $34,
          $35, $36, $37, $38,
          $39, $40,
          $41, $42, $43, $44,
          $45, $46, $47, $48,
          $49, $50
        )
      `, [
        entry.id,
        entry.timestamp,
        entry.eventType,
        entry.severity,
        entry.message,
        entry.description,
        
        // User context
        entry.userContext?.userId,
        entry.userContext?.username,
        entry.userContext?.email,
        entry.userContext?.role,
        entry.userContext?.sessionId,
        entry.userContext?.ipAddress,
        entry.userContext?.userAgent,
        
        // System context
        entry.systemContext.serviceId,
        entry.systemContext.serviceName,
        entry.systemContext.version,
        entry.systemContext.environment,
        entry.systemContext.hostname,
        entry.systemContext.processId,
        entry.systemContext.requestId,
        entry.systemContext.correlationId,
        
        // Decision context
        entry.decisionContext?.eventId,
        entry.decisionContext?.decisionId,
        entry.decisionContext?.confidence,
        entry.decisionContext?.priorityScore,
        entry.decisionContext?.routingDecision,
        entry.decisionContext?.brandContext?.playbook,
        entry.decisionContext?.brandContext?.persona,
        entry.decisionContext?.brandContext?.complianceRules,
        
        // AI analysis
        entry.decisionContext?.aiAnalysis?.sentiment?.overall,
        entry.decisionContext?.aiAnalysis?.sentiment?.confidence,
        entry.decisionContext?.aiAnalysis?.intent?.category,
        entry.decisionContext?.aiAnalysis?.intent?.confidence,
        entry.decisionContext?.aiAnalysis?.topics,
        
        // Performance metrics
        entry.performanceMetrics?.duration,
        entry.performanceMetrics?.memoryUsage,
        entry.performanceMetrics?.cpuUsage,
        entry.performanceMetrics?.networkLatency,
        entry.performanceMetrics?.throughput,
        entry.performanceMetrics?.errorRate,
        
        // Error details
        entry.errorDetails?.errorCode,
        entry.errorDetails?.errorMessage,
        entry.errorDetails?.stackTrace,
        entry.errorDetails?.causedBy,
        
        // Additional data
        entry.metadata ? JSON.stringify(entry.metadata) : null,
        entry.tags,
        entry.retentionPolicy,
        entry.complianceFlags,
        
        // Relationships
        entry.parentEventId,
        entry.relatedEventIds
      ]);
    } finally {
      client.release();
    }
  }

  /**
   * Store multiple audit log entries in a batch
   */
  async storeBatch(entries: AuditLogEntry[]): Promise<void> {
    if (entries.length === 0) return;

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      for (const entry of entries) {
        await this.store(entry);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Query audit logs with filters
   */
  async query(filters: AuditQueryFilters): Promise<AuditLogEntry[]> {
    const client = await this.pool.connect();
    
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Build WHERE conditions
      if (filters.eventTypes && filters.eventTypes.length > 0) {
        conditions.push(`event_type = ANY($${paramIndex})`);
        params.push(filters.eventTypes);
        paramIndex++;
      }

      if (filters.severities && filters.severities.length > 0) {
        conditions.push(`severity = ANY($${paramIndex})`);
        params.push(filters.severities);
        paramIndex++;
      }

      if (filters.userId) {
        conditions.push(`user_id = $${paramIndex}`);
        params.push(filters.userId);
        paramIndex++;
      }

      if (filters.serviceId) {
        conditions.push(`service_id = $${paramIndex}`);
        params.push(filters.serviceId);
        paramIndex++;
      }

      if (filters.startTime) {
        conditions.push(`timestamp >= $${paramIndex}`);
        params.push(filters.startTime);
        paramIndex++;
      }

      if (filters.endTime) {
        conditions.push(`timestamp <= $${paramIndex}`);
        params.push(filters.endTime);
        paramIndex++;
      }

      if (filters.tags && filters.tags.length > 0) {
        conditions.push(`tags && $${paramIndex}`);
        params.push(filters.tags);
        paramIndex++;
      }

      if (filters.searchText) {
        conditions.push(`(message ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
        params.push(`%${filters.searchText}%`);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const query = `
        SELECT * FROM audit_logs
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(filters.limit, filters.offset);

      const result = await client.query(query, params);
      
      return result.rows.map(row => this.mapRowToAuditLogEntry(row));
    } finally {
      client.release();
    }
  }

  /**
   * Get audit statistics
   */
  async getStatistics(filters: Partial<AuditQueryFilters>): Promise<AuditStatistics> {
    const client = await this.pool.connect();
    
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Build WHERE conditions (similar to query method)
      if (filters.startTime) {
        conditions.push(`timestamp >= $${paramIndex}`);
        params.push(filters.startTime);
        paramIndex++;
      }

      if (filters.endTime) {
        conditions.push(`timestamp <= $${paramIndex}`);
        params.push(filters.endTime);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total events
      const totalResult = await client.query(`
        SELECT COUNT(*) as total FROM audit_logs ${whereClause}
      `, params);

      // Get events by type
      const typeResult = await client.query(`
        SELECT event_type, COUNT(*) as count 
        FROM audit_logs ${whereClause}
        GROUP BY event_type
      `, params);

      // Get events by severity
      const severityResult = await client.query(`
        SELECT severity, COUNT(*) as count 
        FROM audit_logs ${whereClause}
        GROUP BY severity
      `, params);

      // Get events over time (last 24 hours in hourly buckets)
      const timeResult = await client.query(`
        SELECT 
          date_trunc('hour', timestamp) as hour,
          COUNT(*) as count
        FROM audit_logs 
        ${whereClause}
        AND timestamp >= NOW() - INTERVAL '24 hours'
        GROUP BY hour
        ORDER BY hour
      `, params);

      // Get top users
      const usersResult = await client.query(`
        SELECT user_id, COUNT(*) as count
        FROM audit_logs 
        ${whereClause}
        AND user_id IS NOT NULL
        GROUP BY user_id
        ORDER BY count DESC
        LIMIT 10
      `, params);

      // Get top services
      const servicesResult = await client.query(`
        SELECT service_id, COUNT(*) as count
        FROM audit_logs 
        ${whereClause}
        GROUP BY service_id
        ORDER BY count DESC
        LIMIT 10
      `, params);

      // Get average performance metrics
      const performanceResult = await client.query(`
        SELECT 
          AVG(duration_ms) as avg_duration,
          AVG(memory_usage_bytes) as avg_memory,
          AVG(cpu_usage_percent) as avg_cpu,
          AVG(network_latency_ms) as avg_latency,
          AVG(throughput_ops_per_sec) as avg_throughput,
          AVG(error_rate_percent) as avg_error_rate
        FROM audit_logs 
        ${whereClause}
        AND duration_ms IS NOT NULL
      `, params);

      const stats: AuditStatistics = {
        totalEvents: parseInt(totalResult.rows[0].total),
        eventsByType: typeResult.rows.reduce((acc, row) => {
          acc[row.event_type as AuditEventType] = parseInt(row.count);
          return acc;
        }, {} as Record<AuditEventType, number>),
        eventsBySeverity: severityResult.rows.reduce((acc, row) => {
          acc[row.severity as AuditSeverity] = parseInt(row.count);
          return acc;
        }, {} as Record<AuditSeverity, number>),
        eventsOverTime: timeResult.rows.map(row => ({
          timestamp: new Date(row.hour),
          count: parseInt(row.count)
        })),
        topUsers: usersResult.rows.map(row => ({
          userId: row.user_id,
          eventCount: parseInt(row.count)
        })),
        topServices: servicesResult.rows.map(row => ({
          serviceId: row.service_id,
          eventCount: parseInt(row.count)
        })),
        averagePerformance: performanceResult.rows[0].avg_duration ? {
          duration: parseFloat(performanceResult.rows[0].avg_duration),
          memoryUsage: performanceResult.rows[0].avg_memory ? parseInt(performanceResult.rows[0].avg_memory) : undefined,
          cpuUsage: performanceResult.rows[0].avg_cpu ? parseFloat(performanceResult.rows[0].avg_cpu) : undefined,
          networkLatency: performanceResult.rows[0].avg_latency ? parseFloat(performanceResult.rows[0].avg_latency) : undefined,
          throughput: performanceResult.rows[0].avg_throughput ? parseFloat(performanceResult.rows[0].avg_throughput) : undefined,
          errorRate: performanceResult.rows[0].avg_error_rate ? parseFloat(performanceResult.rows[0].avg_error_rate) : undefined
        } : undefined
      };

      return stats;
    } finally {
      client.release();
    }
  }

  /**
   * Cleanup old audit logs
   */
  async cleanup(retentionDays: number): Promise<number> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query('SELECT cleanup_audit_logs($1)', [retentionDays]);
      return result.rows[0].cleanup_audit_logs;
    } finally {
      client.release();
    }
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  private mapRowToAuditLogEntry(row: any): AuditLogEntry {
    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      eventType: row.event_type as AuditEventType,
      severity: row.severity as AuditSeverity,
      message: row.message,
      description: row.description,
      
      userContext: row.user_id ? {
        userId: row.user_id,
        username: row.username,
        email: row.user_email,
        role: row.user_role,
        sessionId: row.session_id,
        ipAddress: row.ip_address,
        userAgent: row.user_agent
      } : undefined,
      
      systemContext: {
        serviceId: row.service_id,
        serviceName: row.service_name,
        version: row.service_version,
        environment: row.environment,
        hostname: row.hostname,
        processId: row.process_id,
        requestId: row.request_id,
        correlationId: row.correlation_id
      },
      
      decisionContext: row.decision_id ? {
        eventId: row.decision_event_id,
        decisionId: row.decision_id,
        confidence: parseFloat(row.confidence),
        priorityScore: parseFloat(row.priority_score),
        routingDecision: row.routing_decision,
        brandContext: row.brand_playbook ? {
          playbook: row.brand_playbook,
          persona: row.brand_persona,
          complianceRules: row.compliance_rules || []
        } : undefined,
        aiAnalysis: row.sentiment_overall !== null ? {
          sentiment: {
            overall: parseFloat(row.sentiment_overall),
            confidence: parseFloat(row.sentiment_confidence)
          },
          intent: {
            category: row.intent_category,
            confidence: parseFloat(row.intent_confidence)
          },
          topics: row.topics || []
        } : undefined
      } : undefined,
      
      performanceMetrics: row.duration_ms ? {
        duration: row.duration_ms,
        memoryUsage: row.memory_usage_bytes,
        cpuUsage: row.cpu_usage_percent,
        networkLatency: row.network_latency_ms,
        throughput: row.throughput_ops_per_sec,
        errorRate: row.error_rate_percent
      } : undefined,
      
      errorDetails: row.error_code ? {
        errorCode: row.error_code,
        errorMessage: row.error_message,
        stackTrace: row.stack_trace,
        causedBy: row.caused_by_event_id
      } : undefined,
      
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      tags: row.tags || [],
      retentionPolicy: row.retention_policy,
      complianceFlags: row.compliance_flags || [],
      parentEventId: row.parent_event_id,
      relatedEventIds: row.related_event_ids || []
    };
  }
}