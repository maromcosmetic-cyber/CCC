/**
 * Performance Monitoring Types
 * 
 * Defines types for comprehensive system performance monitoring including
 * API response times, processing latency, AI model performance, and alerting.
 */

import { z } from 'zod';

/**
 * Metric Types
 */
export enum MetricType {
  // API Performance
  API_RESPONSE_TIME = 'api_response_time',
  API_AVAILABILITY = 'api_availability',
  API_ERROR_RATE = 'api_error_rate',
  API_THROUGHPUT = 'api_throughput',
  
  // Processing Performance
  EVENT_PROCESSING_LATENCY = 'event_processing_latency',
  INGESTION_THROUGHPUT = 'ingestion_throughput',
  NORMALIZATION_TIME = 'normalization_time',
  DEDUPLICATION_TIME = 'deduplication_time',
  
  // AI Model Performance
  AI_MODEL_ACCURACY = 'ai_model_accuracy',
  AI_MODEL_LATENCY = 'ai_model_latency',
  AI_MODEL_CONFIDENCE = 'ai_model_confidence',
  AI_MODEL_THROUGHPUT = 'ai_model_throughput',
  
  // Decision Engine Performance
  DECISION_PROCESSING_TIME = 'decision_processing_time',
  PRIORITY_CALCULATION_TIME = 'priority_calculation_time',
  ROUTING_DECISION_TIME = 'routing_decision_time',
  ACTION_EXECUTION_TIME = 'action_execution_time',
  
  // System Resources
  CPU_USAGE = 'cpu_usage',
  MEMORY_USAGE = 'memory_usage',
  DISK_USAGE = 'disk_usage',
  NETWORK_LATENCY = 'network_latency',
  
  // Queue Performance
  QUEUE_SIZE = 'queue_size',
  QUEUE_PROCESSING_RATE = 'queue_processing_rate',
  QUEUE_WAIT_TIME = 'queue_wait_time',
  
  // Database Performance
  DB_CONNECTION_POOL_SIZE = 'db_connection_pool_size',
  DB_QUERY_TIME = 'db_query_time',
  DB_TRANSACTION_TIME = 'db_transaction_time',
  
  // Custom Business Metrics
  EVENTS_PER_MINUTE = 'events_per_minute',
  DECISIONS_PER_MINUTE = 'decisions_per_minute',
  ACTIONS_PER_MINUTE = 'actions_per_minute'
}

/**
 * Metric Units
 */
export enum MetricUnit {
  MILLISECONDS = 'ms',
  SECONDS = 's',
  MINUTES = 'min',
  HOURS = 'h',
  PERCENTAGE = '%',
  COUNT = 'count',
  BYTES = 'bytes',
  KILOBYTES = 'kb',
  MEGABYTES = 'mb',
  GIGABYTES = 'gb',
  REQUESTS_PER_SECOND = 'rps',
  EVENTS_PER_SECOND = 'eps',
  OPERATIONS_PER_SECOND = 'ops'
}

/**
 * Alert Severity Levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

/**
 * Alert Status
 */
export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  SUPPRESSED = 'suppressed'
}

/**
 * Metric Data Point
 */
export const MetricDataPointSchema = z.object({
  timestamp: z.date(),
  value: z.number(),
  tags: z.record(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

/**
 * Metric Definition
 */
export const MetricDefinitionSchema = z.object({
  name: z.string(),
  type: z.nativeEnum(MetricType),
  unit: z.nativeEnum(MetricUnit),
  description: z.string(),
  tags: z.record(z.string()).optional(),
  aggregation: z.enum(['sum', 'avg', 'min', 'max', 'count', 'rate']).default('avg'),
  retentionDays: z.number().positive().default(90)
});

/**
 * Time Series Data
 */
export const TimeSeriesDataSchema = z.object({
  metric: MetricDefinitionSchema,
  dataPoints: z.array(MetricDataPointSchema),
  aggregatedValue: z.number().optional(),
  trend: z.enum(['increasing', 'decreasing', 'stable']).optional()
});

/**
 * Alert Rule
 */
export const AlertRuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  metricType: z.nativeEnum(MetricType),
  
  // Threshold conditions
  thresholds: z.object({
    warning: z.number().optional(),
    critical: z.number().optional(),
    emergency: z.number().optional()
  }),
  
  // Evaluation settings
  evaluationWindow: z.number().positive(), // minutes
  evaluationFrequency: z.number().positive(), // minutes
  minimumDataPoints: z.number().positive().default(3),
  
  // Alert settings
  severity: z.nativeEnum(AlertSeverity),
  enabled: z.boolean().default(true),
  suppressionDuration: z.number().positive().default(60), // minutes
  
  // Notification settings
  notificationChannels: z.array(z.string()),
  escalationRules: z.array(z.object({
    afterMinutes: z.number().positive(),
    channels: z.array(z.string())
  })).optional(),
  
  // Metadata
  tags: z.record(z.string()).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

/**
 * Alert Instance
 */
export const AlertInstanceSchema = z.object({
  id: z.string().uuid(),
  ruleId: z.string().uuid(),
  ruleName: z.string(),
  
  // Alert details
  severity: z.nativeEnum(AlertSeverity),
  status: z.nativeEnum(AlertStatus),
  message: z.string(),
  description: z.string().optional(),
  
  // Trigger information
  triggeredAt: z.date(),
  triggeredValue: z.number(),
  threshold: z.number(),
  metricType: z.nativeEnum(MetricType),
  
  // Resolution information
  acknowledgedAt: z.date().optional(),
  acknowledgedBy: z.string().optional(),
  resolvedAt: z.date().optional(),
  resolvedBy: z.string().optional(),
  resolutionNote: z.string().optional(),
  
  // Context
  tags: z.record(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  relatedEvents: z.array(z.string()).optional()
});

/**
 * Performance Dashboard Configuration
 */
export const DashboardConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  
  // Layout configuration
  widgets: z.array(z.object({
    id: z.string(),
    type: z.enum(['line_chart', 'bar_chart', 'gauge', 'counter', 'table', 'heatmap']),
    title: z.string(),
    position: z.object({
      x: z.number().min(0),
      y: z.number().min(0),
      width: z.number().positive(),
      height: z.number().positive()
    }),
    
    // Data configuration
    metrics: z.array(z.nativeEnum(MetricType)),
    timeRange: z.enum(['1h', '6h', '24h', '7d', '30d']).default('24h'),
    refreshInterval: z.number().positive().default(60), // seconds
    
    // Display options
    options: z.record(z.any()).optional()
  })),
  
  // Access control
  visibility: z.enum(['public', 'private', 'team']).default('team'),
  allowedUsers: z.array(z.string()).optional(),
  allowedRoles: z.array(z.string()).optional(),
  
  // Metadata
  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
});

/**
 * System Health Status
 */
export const SystemHealthStatusSchema = z.object({
  overall: z.enum(['healthy', 'degraded', 'unhealthy', 'unknown']),
  components: z.record(z.object({
    status: z.enum(['healthy', 'degraded', 'unhealthy', 'unknown']),
    lastCheck: z.date(),
    responseTime: z.number().optional(),
    errorRate: z.number().optional(),
    message: z.string().optional()
  })),
  lastUpdated: z.date()
});

/**
 * Performance Report
 */
export const PerformanceReportSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  period: z.object({
    start: z.date(),
    end: z.date()
  }),
  
  // Summary metrics
  summary: z.object({
    totalEvents: z.number().min(0),
    totalDecisions: z.number().min(0),
    totalActions: z.number().min(0),
    averageProcessingTime: z.number().positive(),
    errorRate: z.number().min(0).max(100),
    availability: z.number().min(0).max(100)
  }),
  
  // Detailed metrics by component
  components: z.record(z.object({
    metrics: z.record(z.object({
      value: z.number(),
      unit: z.nativeEnum(MetricUnit),
      trend: z.enum(['up', 'down', 'stable']),
      changePercent: z.number().optional()
    })),
    alerts: z.array(AlertInstanceSchema),
    recommendations: z.array(z.string()).optional()
  })),
  
  // Trends and insights
  insights: z.array(z.object({
    type: z.enum(['performance', 'capacity', 'reliability', 'cost']),
    severity: z.nativeEnum(AlertSeverity),
    title: z.string(),
    description: z.string(),
    recommendation: z.string().optional(),
    impact: z.enum(['low', 'medium', 'high'])
  })),
  
  generatedAt: z.date(),
  generatedBy: z.string().optional()
});

// Type exports
export type MetricDataPoint = z.infer<typeof MetricDataPointSchema>;
export type MetricDefinition = z.infer<typeof MetricDefinitionSchema>;
export type TimeSeriesData = z.infer<typeof TimeSeriesDataSchema>;
export type AlertRule = z.infer<typeof AlertRuleSchema>;
export type AlertInstance = z.infer<typeof AlertInstanceSchema>;
export type DashboardConfig = z.infer<typeof DashboardConfigSchema>;
export type SystemHealthStatus = z.infer<typeof SystemHealthStatusSchema>;
export type PerformanceReport = z.infer<typeof PerformanceReportSchema>;

/**
 * Monitoring Configuration
 */
export const MonitoringConfigSchema = z.object({
  enabled: z.boolean().default(true),
  
  // Collection settings
  collection: z.object({
    interval: z.number().positive().default(60), // seconds
    batchSize: z.number().positive().default(100),
    retentionDays: z.number().positive().default(90)
  }),
  
  // Storage settings
  storage: z.object({
    type: z.enum(['memory', 'database', 'timeseries']).default('database'),
    connectionString: z.string().optional(),
    compression: z.boolean().default(true),
    partitioning: z.boolean().default(true)
  }),
  
  // Alert settings
  alerting: z.object({
    enabled: z.boolean().default(true),
    evaluationInterval: z.number().positive().default(60), // seconds
    defaultChannels: z.array(z.string()).default([]),
    escalationEnabled: z.boolean().default(true)
  }),
  
  // Dashboard settings
  dashboards: z.object({
    enabled: z.boolean().default(true),
    autoRefresh: z.boolean().default(true),
    defaultTimeRange: z.enum(['1h', '6h', '24h', '7d', '30d']).default('24h')
  }),
  
  // Performance settings
  performance: z.object({
    enableProfiling: z.boolean().default(false),
    profilingSampleRate: z.number().min(0).max(1).default(0.01),
    enableTracing: z.boolean().default(true),
    tracingSampleRate: z.number().min(0).max(1).default(0.1)
  })
});

export type MonitoringConfig = z.infer<typeof MonitoringConfigSchema>;