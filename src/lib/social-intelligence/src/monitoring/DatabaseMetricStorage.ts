/**
 * Database Metric Storage Implementation
 * 
 * PostgreSQL-based storage for performance metrics and alerts with
 * optimized time-series queries and efficient data retention.
 */

import { Pool, PoolClient } from 'pg';
import {
  MetricDefinition,
  MetricDataPoint,
  TimeSeriesData,
  MetricType,
  AlertRule,
  AlertInstance,
  AlertStatus
} from './types';
import { IMetricStorage, IAlertStorage } from './PerformanceMonitor';

export class DatabaseMetricStorage implements IMetricStorage, IAlertStorage {
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
   * Initialize database schema for metrics and alerts
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create metrics table
      await client.query(`
        CREATE TABLE IF NOT EXISTS performance_metrics (
          id BIGSERIAL PRIMARY KEY,
          metric_type VARCHAR(100) NOT NULL,
          metric_name VARCHAR(255) NOT NULL,
          metric_unit VARCHAR(20) NOT NULL,
          metric_description TEXT,
          aggregation VARCHAR(20) NOT NULL DEFAULT 'avg',
          
          timestamp TIMESTAMPTZ NOT NULL,
          value DECIMAL(20,6) NOT NULL,
          tags JSONB,
          metadata JSONB,
          
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Create time-series optimized indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_performance_metrics_type_timestamp 
        ON performance_metrics (metric_type, timestamp DESC)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp 
        ON performance_metrics (timestamp DESC)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_performance_metrics_tags 
        ON performance_metrics USING GIN (tags)
      `);

      // Create partitioning function for time-series data
      await client.query(`
        CREATE OR REPLACE FUNCTION create_monthly_partition(table_name TEXT, start_date DATE)
        RETURNS VOID AS $$
        DECLARE
          partition_name TEXT;
          end_date DATE;
        BEGIN
          partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
          end_date := start_date + INTERVAL '1 month';
          
          EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF %I 
                         FOR VALUES FROM (%L) TO (%L)',
                         partition_name, table_name, start_date, end_date);
        END;
        $$ LANGUAGE plpgsql;
      `);

      // Create alert rules table
      await client.query(`
        CREATE TABLE IF NOT EXISTS alert_rules (
          id UUID PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          metric_type VARCHAR(100) NOT NULL,
          
          -- Thresholds
          warning_threshold DECIMAL(20,6),
          critical_threshold DECIMAL(20,6),
          emergency_threshold DECIMAL(20,6),
          
          -- Evaluation settings
          evaluation_window INTEGER NOT NULL, -- minutes
          evaluation_frequency INTEGER NOT NULL, -- minutes
          minimum_data_points INTEGER NOT NULL DEFAULT 3,
          
          -- Alert settings
          severity VARCHAR(20) NOT NULL,
          enabled BOOLEAN NOT NULL DEFAULT true,
          suppression_duration INTEGER NOT NULL DEFAULT 60, -- minutes
          
          -- Notification settings
          notification_channels TEXT[],
          escalation_rules JSONB,
          
          -- Metadata
          tags JSONB,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        )
      `);

      // Create alert instances table
      await client.query(`
        CREATE TABLE IF NOT EXISTS alert_instances (
          id UUID PRIMARY KEY,
          rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
          rule_name VARCHAR(255) NOT NULL,
          
          -- Alert details
          severity VARCHAR(20) NOT NULL,
          status VARCHAR(20) NOT NULL,
          message TEXT NOT NULL,
          description TEXT,
          
          -- Trigger information
          triggered_at TIMESTAMPTZ NOT NULL,
          triggered_value DECIMAL(20,6) NOT NULL,
          threshold DECIMAL(20,6) NOT NULL,
          metric_type VARCHAR(100) NOT NULL,
          
          -- Resolution information
          acknowledged_at TIMESTAMPTZ,
          acknowledged_by VARCHAR(255),
          resolved_at TIMESTAMPTZ,
          resolved_by VARCHAR(255),
          resolution_note TEXT,
          
          -- Context
          tags JSONB,
          metadata JSONB,
          related_events TEXT[],
          
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Create indexes for alerts
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_alert_instances_rule_id 
        ON alert_instances (rule_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_alert_instances_status 
        ON alert_instances (status)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_alert_instances_triggered_at 
        ON alert_instances (triggered_at DESC)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_alert_instances_severity 
        ON alert_instances (severity)
      `);

      // Create cleanup functions
      await client.query(`
        CREATE OR REPLACE FUNCTION cleanup_old_metrics(retention_days INTEGER)
        RETURNS INTEGER AS $$
        DECLARE
          deleted_count INTEGER;
        BEGIN
          DELETE FROM performance_metrics 
          WHERE timestamp < NOW() - INTERVAL '1 day' * retention_days;
          
          GET DIAGNOSTICS deleted_count = ROW_COUNT;
          RETURN deleted_count;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await client.query(`
        CREATE OR REPLACE FUNCTION cleanup_old_alerts(retention_days INTEGER)
        RETURNS INTEGER AS $$
        DECLARE
          deleted_count INTEGER;
        BEGIN
          DELETE FROM alert_instances 
          WHERE triggered_at < NOW() - INTERVAL '1 day' * retention_days
          AND status = 'resolved';
          
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
   * Store a single metric data point
   */
  async storeMetric(metric: MetricDefinition, dataPoint: MetricDataPoint): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        INSERT INTO performance_metrics (
          metric_type, metric_name, metric_unit, metric_description, aggregation,
          timestamp, value, tags, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        metric.type,
        metric.name,
        metric.unit,
        metric.description,
        metric.aggregation,
        dataPoint.timestamp,
        dataPoint.value,
        dataPoint.tags ? JSON.stringify(dataPoint.tags) : null,
        dataPoint.metadata ? JSON.stringify(dataPoint.metadata) : null
      ]);
    } finally {
      client.release();
    }
  }

  /**
   * Store multiple metric data points in batch
   */
  async storeMetrics(metrics: Array<{ metric: MetricDefinition; dataPoint: MetricDataPoint }>): Promise<void> {
    if (metrics.length === 0) return;

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      for (const { metric, dataPoint } of metrics) {
        await client.query(`
          INSERT INTO performance_metrics (
            metric_type, metric_name, metric_unit, metric_description, aggregation,
            timestamp, value, tags, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          metric.type,
          metric.name,
          metric.unit,
          metric.description,
          metric.aggregation,
          dataPoint.timestamp,
          dataPoint.value,
          dataPoint.tags ? JSON.stringify(dataPoint.tags) : null,
          dataPoint.metadata ? JSON.stringify(dataPoint.metadata) : null
        ]);
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
   * Get time series data for a metric
   */
  async getTimeSeriesData(
    metricType: MetricType,
    startTime: Date,
    endTime: Date,
    tags?: Record<string, string>
  ): Promise<TimeSeriesData> {
    const client = await this.pool.connect();
    
    try {
      let query = `
        SELECT 
          metric_type, metric_name, metric_unit, metric_description, aggregation,
          timestamp, value, tags, metadata
        FROM performance_metrics
        WHERE metric_type = $1 
        AND timestamp >= $2 
        AND timestamp <= $3
      `;
      
      const params: any[] = [metricType, startTime, endTime];

      // Add tag filtering if provided
      if (tags && Object.keys(tags).length > 0) {
        query += ` AND tags @> $4`;
        params.push(JSON.stringify(tags));
      }

      query += ` ORDER BY timestamp ASC`;

      const result = await client.query(query, params);

      if (result.rows.length === 0) {
        // Return empty time series data
        return {
          metric: {
            name: metricType,
            type: metricType,
            unit: 'count' as any,
            description: 'No data available',
            aggregation: 'avg'
          },
          dataPoints: []
        };
      }

      const firstRow = result.rows[0];
      const metric: MetricDefinition = {
        name: firstRow.metric_name,
        type: firstRow.metric_type,
        unit: firstRow.metric_unit,
        description: firstRow.metric_description,
        aggregation: firstRow.aggregation
      };

      const dataPoints: MetricDataPoint[] = result.rows.map(row => ({
        timestamp: new Date(row.timestamp),
        value: parseFloat(row.value),
        tags: row.tags ? JSON.parse(row.tags) : undefined,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      }));

      // Calculate aggregated value and trend
      const values = dataPoints.map(dp => dp.value);
      const aggregatedValue = this.calculateAggregatedValue(values, metric.aggregation);
      const trend = this.calculateTrend(values);

      return {
        metric,
        dataPoints,
        aggregatedValue,
        trend
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get latest value for a metric
   */
  async getLatestValue(metricType: MetricType, tags?: Record<string, string>): Promise<MetricDataPoint | null> {
    const client = await this.pool.connect();
    
    try {
      let query = `
        SELECT timestamp, value, tags, metadata
        FROM performance_metrics
        WHERE metric_type = $1
      `;
      
      const params: any[] = [metricType];

      if (tags && Object.keys(tags).length > 0) {
        query += ` AND tags @> $2`;
        params.push(JSON.stringify(tags));
      }

      query += ` ORDER BY timestamp DESC LIMIT 1`;

      const result = await client.query(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        timestamp: new Date(row.timestamp),
        value: parseFloat(row.value),
        tags: row.tags ? JSON.parse(row.tags) : undefined,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      };
    } finally {
      client.release();
    }
  }

  /**
   * Cleanup old metrics
   */
  async cleanup(retentionDays: number): Promise<number> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query('SELECT cleanup_old_metrics($1)', [retentionDays]);
      return result.rows[0].cleanup_old_metrics;
    } finally {
      client.release();
    }
  }

  /**
   * Alert Rule Management
   */
  async storeRule(rule: AlertRule): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        INSERT INTO alert_rules (
          id, name, description, metric_type,
          warning_threshold, critical_threshold, emergency_threshold,
          evaluation_window, evaluation_frequency, minimum_data_points,
          severity, enabled, suppression_duration,
          notification_channels, escalation_rules,
          tags, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      `, [
        rule.id,
        rule.name,
        rule.description,
        rule.metricType,
        rule.thresholds.warning,
        rule.thresholds.critical,
        rule.thresholds.emergency,
        rule.evaluationWindow,
        rule.evaluationFrequency,
        rule.minimumDataPoints,
        rule.severity,
        rule.enabled,
        rule.suppressionDuration,
        rule.notificationChannels,
        rule.escalationRules ? JSON.stringify(rule.escalationRules) : null,
        rule.tags ? JSON.stringify(rule.tags) : null,
        rule.createdAt,
        rule.updatedAt
      ]);
    } finally {
      client.release();
    }
  }

  async updateRule(rule: AlertRule): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        UPDATE alert_rules SET
          name = $2, description = $3, metric_type = $4,
          warning_threshold = $5, critical_threshold = $6, emergency_threshold = $7,
          evaluation_window = $8, evaluation_frequency = $9, minimum_data_points = $10,
          severity = $11, enabled = $12, suppression_duration = $13,
          notification_channels = $14, escalation_rules = $15,
          tags = $16, updated_at = $17
        WHERE id = $1
      `, [
        rule.id,
        rule.name,
        rule.description,
        rule.metricType,
        rule.thresholds.warning,
        rule.thresholds.critical,
        rule.thresholds.emergency,
        rule.evaluationWindow,
        rule.evaluationFrequency,
        rule.minimumDataPoints,
        rule.severity,
        rule.enabled,
        rule.suppressionDuration,
        rule.notificationChannels,
        rule.escalationRules ? JSON.stringify(rule.escalationRules) : null,
        rule.tags ? JSON.stringify(rule.tags) : null,
        rule.updatedAt
      ]);
    } finally {
      client.release();
    }
  }

  async deleteRule(ruleId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('DELETE FROM alert_rules WHERE id = $1', [ruleId]);
    } finally {
      client.release();
    }
  }

  async getRule(ruleId: string): Promise<AlertRule | null> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query('SELECT * FROM alert_rules WHERE id = $1', [ruleId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToAlertRule(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getAllRules(): Promise<AlertRule[]> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query('SELECT * FROM alert_rules ORDER BY name');
      return result.rows.map(row => this.mapRowToAlertRule(row));
    } finally {
      client.release();
    }
  }

  /**
   * Alert Instance Management
   */
  async storeAlert(alert: AlertInstance): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        INSERT INTO alert_instances (
          id, rule_id, rule_name, severity, status, message, description,
          triggered_at, triggered_value, threshold, metric_type,
          acknowledged_at, acknowledged_by, resolved_at, resolved_by, resolution_note,
          tags, metadata, related_events
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      `, [
        alert.id,
        alert.ruleId,
        alert.ruleName,
        alert.severity,
        alert.status,
        alert.message,
        alert.description,
        alert.triggeredAt,
        alert.triggeredValue,
        alert.threshold,
        alert.metricType,
        alert.acknowledgedAt,
        alert.acknowledgedBy,
        alert.resolvedAt,
        alert.resolvedBy,
        alert.resolutionNote,
        alert.tags ? JSON.stringify(alert.tags) : null,
        alert.metadata ? JSON.stringify(alert.metadata) : null,
        alert.relatedEvents
      ]);
    } finally {
      client.release();
    }
  }

  async updateAlert(alert: AlertInstance): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        UPDATE alert_instances SET
          severity = $2, status = $3, message = $4, description = $5,
          acknowledged_at = $6, acknowledged_by = $7, resolved_at = $8, resolved_by = $9, resolution_note = $10,
          tags = $11, metadata = $12, related_events = $13
        WHERE id = $1
      `, [
        alert.id,
        alert.severity,
        alert.status,
        alert.message,
        alert.description,
        alert.acknowledgedAt,
        alert.acknowledgedBy,
        alert.resolvedAt,
        alert.resolvedBy,
        alert.resolutionNote,
        alert.tags ? JSON.stringify(alert.tags) : null,
        alert.metadata ? JSON.stringify(alert.metadata) : null,
        alert.relatedEvents
      ]);
    } finally {
      client.release();
    }
  }

  async getAlert(alertId: string): Promise<AlertInstance | null> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query('SELECT * FROM alert_instances WHERE id = $1', [alertId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToAlertInstance(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getActiveAlerts(): Promise<AlertInstance[]> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT * FROM alert_instances 
        WHERE status IN ('active', 'acknowledged')
        ORDER BY triggered_at DESC
      `);
      
      return result.rows.map(row => this.mapRowToAlertInstance(row));
    } finally {
      client.release();
    }
  }

  async getAlertHistory(startTime: Date, endTime: Date): Promise<AlertInstance[]> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT * FROM alert_instances 
        WHERE triggered_at >= $1 AND triggered_at <= $2
        ORDER BY triggered_at DESC
      `, [startTime, endTime]);
      
      return result.rows.map(row => this.mapRowToAlertInstance(row));
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

  /**
   * Private helper methods
   */
  private calculateAggregatedValue(values: number[], aggregation: string): number {
    if (values.length === 0) return 0;

    switch (aggregation) {
      case 'avg':
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0);
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
        return values.length;
      default:
        return values[values.length - 1];
    }
  }

  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';

    const first = values[0];
    const last = values[values.length - 1];
    const threshold = Math.abs(first) * 0.05; // 5% threshold

    if (last > first + threshold) return 'increasing';
    if (last < first - threshold) return 'decreasing';
    return 'stable';
  }

  private mapRowToAlertRule(row: any): AlertRule {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      metricType: row.metric_type,
      thresholds: {
        warning: row.warning_threshold,
        critical: row.critical_threshold,
        emergency: row.emergency_threshold
      },
      evaluationWindow: row.evaluation_window,
      evaluationFrequency: row.evaluation_frequency,
      minimumDataPoints: row.minimum_data_points,
      severity: row.severity,
      enabled: row.enabled,
      suppressionDuration: row.suppression_duration,
      notificationChannels: row.notification_channels || [],
      escalationRules: row.escalation_rules ? JSON.parse(row.escalation_rules) : undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToAlertInstance(row: any): AlertInstance {
    return {
      id: row.id,
      ruleId: row.rule_id,
      ruleName: row.rule_name,
      severity: row.severity,
      status: row.status,
      message: row.message,
      description: row.description,
      triggeredAt: new Date(row.triggered_at),
      triggeredValue: parseFloat(row.triggered_value),
      threshold: parseFloat(row.threshold),
      metricType: row.metric_type,
      acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at) : undefined,
      acknowledgedBy: row.acknowledged_by,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      resolvedBy: row.resolved_by,
      resolutionNote: row.resolution_note,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      relatedEvents: row.related_events || []
    };
  }
}