/**
 * Audit Logging Types
 * 
 * Defines comprehensive audit logging types for tracking all automated decisions,
 * user actions, and system operations with sufficient context for debugging,
 * compliance tracking, and system analysis.
 */

import { z } from 'zod';

/**
 * Audit Event Types - categorizes different types of auditable events
 */
export enum AuditEventType {
  // Decision Engine Events
  DECISION_MADE = 'decision_made',
  ACTION_EXECUTED = 'action_executed',
  PRIORITY_CALCULATED = 'priority_calculated',
  ROUTING_DECISION = 'routing_decision',
  
  // User Actions
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_ACTION = 'user_action',
  CONFIGURATION_CHANGE = 'configuration_change',
  
  // System Operations
  SYSTEM_START = 'system_start',
  SYSTEM_SHUTDOWN = 'system_shutdown',
  SERVICE_RESTART = 'service_restart',
  ERROR_OCCURRED = 'error_occurred',
  
  // Data Operations
  DATA_INGESTED = 'data_ingested',
  DATA_PROCESSED = 'data_processed',
  DATA_EXPORTED = 'data_exported',
  DATA_DELETED = 'data_deleted',
  
  // Security Events
  AUTHENTICATION_FAILED = 'authentication_failed',
  AUTHORIZATION_DENIED = 'authorization_denied',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  
  // Integration Events
  EXTERNAL_API_CALL = 'external_api_call',
  WEBHOOK_RECEIVED = 'webhook_received',
  NOTIFICATION_SENT = 'notification_sent'
}

/**
 * Audit Severity Levels
 */
export enum AuditSeverity {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * User Context for audit events
 */
export const UserContextSchema = z.object({
  userId: z.string().optional(),
  username: z.string().optional(),
  email: z.string().email().optional(),
  role: z.string().optional(),
  sessionId: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional()
});

/**
 * System Context for audit events
 */
export const SystemContextSchema = z.object({
  serviceId: z.string(),
  serviceName: z.string(),
  version: z.string(),
  environment: z.enum(['development', 'staging', 'production']),
  hostname: z.string(),
  processId: z.number(),
  requestId: z.string().optional(),
  correlationId: z.string().optional()
});

/**
 * Decision Context for decision-related audit events
 */
export const DecisionContextSchema = z.object({
  eventId: z.string(),
  decisionId: z.string(),
  confidence: z.number().min(0).max(100),
  priorityScore: z.number().min(0).max(100),
  routingDecision: z.enum(['auto_response', 'suggestion', 'human_review']),
  brandContext: z.object({
    playbook: z.string(),
    persona: z.string().optional(),
    complianceRules: z.array(z.string())
  }).optional(),
  aiAnalysis: z.object({
    sentiment: z.object({
      overall: z.number().min(-1).max(1),
      confidence: z.number().min(0).max(1)
    }),
    intent: z.object({
      category: z.string(),
      confidence: z.number().min(0).max(1)
    }),
    topics: z.array(z.string())
  }).optional()
});

/**
 * Performance Metrics for system operations
 */
export const PerformanceMetricsSchema = z.object({
  duration: z.number().positive(), // milliseconds
  memoryUsage: z.number().positive().optional(), // bytes
  cpuUsage: z.number().min(0).max(100).optional(), // percentage
  networkLatency: z.number().positive().optional(), // milliseconds
  throughput: z.number().positive().optional(), // operations per second
  errorRate: z.number().min(0).max(100).optional() // percentage
});

/**
 * Core Audit Log Entry
 */
export const AuditLogEntrySchema = z.object({
  // Core identification
  id: z.string().uuid(),
  timestamp: z.date(),
  eventType: z.nativeEnum(AuditEventType),
  severity: z.nativeEnum(AuditSeverity),
  
  // Event description
  message: z.string(),
  description: z.string().optional(),
  
  // Context information
  userContext: UserContextSchema.optional(),
  systemContext: SystemContextSchema,
  decisionContext: DecisionContextSchema.optional(),
  
  // Additional data
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  
  // Performance and error information
  performanceMetrics: PerformanceMetricsSchema.optional(),
  errorDetails: z.object({
    errorCode: z.string(),
    errorMessage: z.string(),
    stackTrace: z.string().optional(),
    causedBy: z.string().optional()
  }).optional(),
  
  // Compliance and retention
  retentionPolicy: z.string().default('default'),
  complianceFlags: z.array(z.string()).optional(),
  
  // Relationships
  parentEventId: z.string().uuid().optional(),
  relatedEventIds: z.array(z.string().uuid()).optional()
});

/**
 * Audit Query Filters
 */
export const AuditQueryFiltersSchema = z.object({
  eventTypes: z.array(z.nativeEnum(AuditEventType)).optional(),
  severities: z.array(z.nativeEnum(AuditSeverity)).optional(),
  userId: z.string().optional(),
  serviceId: z.string().optional(),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  tags: z.array(z.string()).optional(),
  searchText: z.string().optional(),
  limit: z.number().positive().max(1000).default(100),
  offset: z.number().min(0).default(0)
});

/**
 * Audit Statistics
 */
export const AuditStatisticsSchema = z.object({
  totalEvents: z.number().min(0),
  eventsByType: z.record(z.nativeEnum(AuditEventType), z.number().min(0)),
  eventsBySeverity: z.record(z.nativeEnum(AuditSeverity), z.number().min(0)),
  eventsOverTime: z.array(z.object({
    timestamp: z.date(),
    count: z.number().min(0)
  })),
  topUsers: z.array(z.object({
    userId: z.string(),
    eventCount: z.number().min(0)
  })),
  topServices: z.array(z.object({
    serviceId: z.string(),
    eventCount: z.number().min(0)
  })),
  averagePerformance: PerformanceMetricsSchema.optional()
});

// Type exports
export type UserContext = z.infer<typeof UserContextSchema>;
export type SystemContext = z.infer<typeof SystemContextSchema>;
export type DecisionContext = z.infer<typeof DecisionContextSchema>;
export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;
export type AuditQueryFilters = z.infer<typeof AuditQueryFiltersSchema>;
export type AuditStatistics = z.infer<typeof AuditStatisticsSchema>;

/**
 * Audit Configuration
 */
export const AuditConfigSchema = z.object({
  enabled: z.boolean().default(true),
  logLevel: z.nativeEnum(AuditSeverity).default(AuditSeverity.INFO),
  storage: z.object({
    type: z.enum(['database', 'file', 'elasticsearch']).default('database'),
    connectionString: z.string(),
    retentionDays: z.number().positive().default(365),
    batchSize: z.number().positive().default(100),
    flushInterval: z.number().positive().default(5000) // milliseconds
  }),
  compliance: z.object({
    gdprEnabled: z.boolean().default(true),
    ccpaEnabled: z.boolean().default(true),
    dataAnonymization: z.boolean().default(true),
    encryptionEnabled: z.boolean().default(true)
  }),
  performance: z.object({
    enableMetrics: z.boolean().default(true),
    metricsRetentionDays: z.number().positive().default(90),
    alertThresholds: z.object({
      errorRate: z.number().min(0).max(100).default(5), // percentage
      responseTime: z.number().positive().default(5000), // milliseconds
      memoryUsage: z.number().min(0).max(100).default(80) // percentage
    })
  })
});

export type AuditConfig = z.infer<typeof AuditConfigSchema>;