/**
 * Audit Logger Service
 * 
 * Comprehensive audit logging system that tracks all automated decisions,
 * user actions, and system operations with sufficient context for debugging,
 * compliance tracking, and system analysis.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  AuditLogEntry,
  AuditEventType,
  AuditSeverity,
  UserContext,
  SystemContext,
  DecisionContext,
  PerformanceMetrics,
  AuditConfig,
  AuditQueryFilters,
  AuditStatistics,
  AuditLogEntrySchema,
  AuditConfigSchema
} from './types';

/**
 * Audit Storage Interface
 */
export interface IAuditStorage {
  store(entry: AuditLogEntry): Promise<void>;
  storeBatch(entries: AuditLogEntry[]): Promise<void>;
  query(filters: AuditQueryFilters): Promise<AuditLogEntry[]>;
  getStatistics(filters: Partial<AuditQueryFilters>): Promise<AuditStatistics>;
  cleanup(retentionDays: number): Promise<number>;
}

/**
 * Audit Event Builder for fluent API
 */
export class AuditEventBuilder {
  private entry: Partial<AuditLogEntry>;

  constructor(eventType: AuditEventType, message: string) {
    this.entry = {
      id: uuidv4(),
      timestamp: new Date(),
      eventType,
      message,
      severity: AuditSeverity.INFO,
      systemContext: this.getDefaultSystemContext()
    };
  }

  private getDefaultSystemContext(): SystemContext {
    return {
      serviceId: 'social-intelligence',
      serviceName: 'Brand-Aware Social Intelligence Engine',
      version: '1.0.0',
      environment: (process.env.NODE_ENV as any) || 'development',
      hostname: process.env.HOSTNAME || 'localhost',
      processId: process.pid,
      requestId: process.env.REQUEST_ID,
      correlationId: process.env.CORRELATION_ID
    };
  }

  severity(severity: AuditSeverity): AuditEventBuilder {
    this.entry.severity = severity;
    return this;
  }

  description(description: string): AuditEventBuilder {
    this.entry.description = description;
    return this;
  }

  userContext(context: UserContext): AuditEventBuilder {
    this.entry.userContext = context;
    return this;
  }

  systemContext(context: Partial<SystemContext>): AuditEventBuilder {
    this.entry.systemContext = { ...this.entry.systemContext!, ...context };
    return this;
  }

  decisionContext(context: DecisionContext): AuditEventBuilder {
    this.entry.decisionContext = context;
    return this;
  }

  metadata(metadata: Record<string, any>): AuditEventBuilder {
    this.entry.metadata = { ...this.entry.metadata, ...metadata };
    return this;
  }

  tags(tags: string[]): AuditEventBuilder {
    this.entry.tags = [...(this.entry.tags || []), ...tags];
    return this;
  }

  performance(metrics: PerformanceMetrics): AuditEventBuilder {
    this.entry.performanceMetrics = metrics;
    return this;
  }

  error(errorCode: string, errorMessage: string, stackTrace?: string): AuditEventBuilder {
    this.entry.errorDetails = {
      errorCode,
      errorMessage,
      stackTrace,
      causedBy: this.entry.parentEventId
    };
    this.entry.severity = AuditSeverity.ERROR;
    return this;
  }

  parentEvent(parentEventId: string): AuditEventBuilder {
    this.entry.parentEventId = parentEventId;
    return this;
  }

  relatedEvents(eventIds: string[]): AuditEventBuilder {
    this.entry.relatedEventIds = [...(this.entry.relatedEventIds || []), ...eventIds];
    return this;
  }

  compliance(flags: string[]): AuditEventBuilder {
    this.entry.complianceFlags = [...(this.entry.complianceFlags || []), ...flags];
    return this;
  }

  retention(policy: string): AuditEventBuilder {
    this.entry.retentionPolicy = policy;
    return this;
  }

  build(): AuditLogEntry {
    const validated = AuditLogEntrySchema.parse(this.entry);
    return validated;
  }
}

/**
 * Main Audit Logger Service
 */
export class AuditLogger {
  private config: AuditConfig;
  private storage: IAuditStorage;
  private buffer: AuditLogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private metrics = {
    totalEvents: 0,
    errorEvents: 0,
    lastFlush: new Date(),
    bufferSize: 0
  };

  constructor(config: AuditConfig, storage: IAuditStorage) {
    this.config = AuditConfigSchema.parse(config);
    this.storage = storage;
    this.startFlushTimer();
  }

  /**
   * Create a new audit event builder
   */
  event(eventType: AuditEventType, message: string): AuditEventBuilder {
    return new AuditEventBuilder(eventType, message);
  }

  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    // Check if event meets minimum log level
    if (!this.shouldLog(entry.severity)) {
      return;
    }

    try {
      // Apply compliance transformations
      const processedEntry = this.applyComplianceRules(entry);
      
      // Add to buffer
      this.buffer.push(processedEntry);
      this.metrics.totalEvents++;
      this.metrics.bufferSize = this.buffer.length;

      // Flush immediately for critical events
      if (entry.severity === AuditSeverity.CRITICAL || entry.severity === AuditSeverity.ERROR) {
        await this.flush();
      }

      // Flush if buffer is full
      if (this.buffer.length >= this.config.storage.batchSize) {
        await this.flush();
      }
    } catch (error) {
      this.metrics.errorEvents++;
      console.error('Failed to log audit event:', error);
      
      // Try to log the error itself (without recursion)
      if (entry.eventType !== AuditEventType.ERROR_OCCURRED) {
        const errorEntry = this.event(AuditEventType.ERROR_OCCURRED, 'Audit logging failed')
          .severity(AuditSeverity.ERROR)
          .error('AUDIT_LOG_FAILED', error instanceof Error ? error.message : 'Unknown error')
          .metadata({ originalEvent: entry })
          .build();
        
        // Store directly without buffering to avoid recursion
        await this.storage.store(errorEntry);
      }
    }
  }

  /**
   * Convenience methods for common audit events
   */
  async logDecision(
    eventId: string,
    decisionId: string,
    confidence: number,
    priorityScore: number,
    routingDecision: 'auto_response' | 'suggestion' | 'human_review',
    context?: Partial<DecisionContext>
  ): Promise<void> {
    const entry = this.event(AuditEventType.DECISION_MADE, 'Decision engine made routing decision')
      .decisionContext({
        eventId,
        decisionId,
        confidence,
        priorityScore,
        routingDecision,
        ...context
      })
      .tags(['decision-engine', 'routing'])
      .build();

    await this.log(entry);
  }

  async logUserAction(
    userId: string,
    action: string,
    userContext: UserContext,
    metadata?: Record<string, any>
  ): Promise<void> {
    const entry = this.event(AuditEventType.USER_ACTION, `User performed action: ${action}`)
      .userContext(userContext)
      .metadata(metadata || {})
      .tags(['user-action'])
      .build();

    await this.log(entry);
  }

  async logSystemOperation(
    operation: string,
    success: boolean,
    duration?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    const entry = this.event(
      success ? AuditEventType.SYSTEM_START : AuditEventType.ERROR_OCCURRED,
      `System operation: ${operation}`
    )
      .severity(success ? AuditSeverity.INFO : AuditSeverity.ERROR)
      .metadata(metadata || {})
      .tags(['system-operation']);

    if (duration) {
      entry.performance({ duration });
    }

    if (!success && metadata?.error) {
      entry.error('SYSTEM_OPERATION_FAILED', metadata.error);
    }

    await this.log(entry.build());
  }

  async logDataOperation(
    operation: 'ingested' | 'processed' | 'exported' | 'deleted',
    recordCount: number,
    dataType: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const eventTypeMap = {
      ingested: AuditEventType.DATA_INGESTED,
      processed: AuditEventType.DATA_PROCESSED,
      exported: AuditEventType.DATA_EXPORTED,
      deleted: AuditEventType.DATA_DELETED
    };

    const entry = this.event(
      eventTypeMap[operation],
      `Data ${operation}: ${recordCount} ${dataType} records`
    )
      .metadata({
        recordCount,
        dataType,
        ...metadata
      })
      .tags(['data-operation', operation, dataType])
      .build();

    await this.log(entry);
  }

  async logSecurityEvent(
    eventType: AuditEventType,
    message: string,
    userContext?: UserContext,
    severity: AuditSeverity = AuditSeverity.WARN
  ): Promise<void> {
    const entry = this.event(eventType, message)
      .severity(severity)
      .userContext(userContext)
      .tags(['security'])
      .compliance(['security-audit'])
      .build();

    await this.log(entry);
  }

  /**
   * Query audit logs
   */
  async query(filters: AuditQueryFilters): Promise<AuditLogEntry[]> {
    return this.storage.query(filters);
  }

  /**
   * Get audit statistics
   */
  async getStatistics(filters?: Partial<AuditQueryFilters>): Promise<AuditStatistics> {
    return this.storage.getStatistics(filters || {});
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      bufferSize: this.buffer.length,
      configEnabled: this.config.enabled,
      lastFlush: this.metrics.lastFlush
    };
  }

  /**
   * Flush buffered events to storage
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    try {
      const events = [...this.buffer];
      this.buffer = [];
      this.metrics.bufferSize = 0;

      await this.storage.storeBatch(events);
      this.metrics.lastFlush = new Date();
    } catch (error) {
      // Put events back in buffer on failure
      this.buffer.unshift(...this.buffer);
      this.metrics.errorEvents++;
      throw error;
    }
  }

  /**
   * Cleanup old audit logs
   */
  async cleanup(): Promise<number> {
    return this.storage.cleanup(this.config.storage.retentionDays);
  }

  /**
   * Shutdown the audit logger
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    await this.flush();
    
    await this.logSystemOperation('audit_logger_shutdown', true);
  }

  private shouldLog(severity: AuditSeverity): boolean {
    const severityLevels = {
      [AuditSeverity.DEBUG]: 0,
      [AuditSeverity.INFO]: 1,
      [AuditSeverity.WARN]: 2,
      [AuditSeverity.ERROR]: 3,
      [AuditSeverity.CRITICAL]: 4
    };

    return severityLevels[severity] >= severityLevels[this.config.logLevel];
  }

  private applyComplianceRules(entry: AuditLogEntry): AuditLogEntry {
    let processedEntry = { ...entry };

    if (this.config.compliance.dataAnonymization) {
      processedEntry = this.anonymizePersonalData(processedEntry);
    }

    if (this.config.compliance.encryptionEnabled) {
      processedEntry = this.encryptSensitiveData(processedEntry);
    }

    return processedEntry;
  }

  private anonymizePersonalData(entry: AuditLogEntry): AuditLogEntry {
    const anonymized = { ...entry };

    // Anonymize user context
    if (anonymized.userContext) {
      anonymized.userContext = {
        ...anonymized.userContext,
        email: anonymized.userContext.email ? this.hashEmail(anonymized.userContext.email) : undefined,
        ipAddress: anonymized.userContext.ipAddress ? this.anonymizeIP(anonymized.userContext.ipAddress) : undefined
      };
    }

    // Anonymize metadata
    if (anonymized.metadata) {
      anonymized.metadata = this.anonymizeMetadata(anonymized.metadata);
    }

    return anonymized;
  }

  private encryptSensitiveData(entry: AuditLogEntry): AuditLogEntry {
    // In a real implementation, this would encrypt sensitive fields
    // For now, we'll just mark them as encrypted
    const encrypted = { ...entry };
    
    if (encrypted.metadata?.sensitiveData) {
      encrypted.metadata.sensitiveData = '[ENCRYPTED]';
    }

    return encrypted;
  }

  private hashEmail(email: string): string {
    // Simple hash for demonstration - use proper crypto in production
    const domain = email.split('@')[1];
    return `user_${email.length}_hash@${domain}`;
  }

  private anonymizeIP(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
    return 'xxx.xxx.xxx.xxx';
  }

  private anonymizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const anonymized = { ...metadata };
    
    // Remove or anonymize known sensitive fields
    const sensitiveFields = ['email', 'phone', 'ssn', 'creditCard', 'password'];
    
    for (const field of sensitiveFields) {
      if (anonymized[field]) {
        anonymized[field] = '[ANONYMIZED]';
      }
    }

    return anonymized;
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      try {
        await this.flush();
      } catch (error) {
        console.error('Failed to flush audit logs:', error);
      }
    }, this.config.storage.flushInterval);
  }
}

/**
 * Singleton audit logger instance
 */
let auditLoggerInstance: AuditLogger | null = null;

export function createAuditLogger(config: AuditConfig, storage: IAuditStorage): AuditLogger {
  auditLoggerInstance = new AuditLogger(config, storage);
  return auditLoggerInstance;
}

export function getAuditLogger(): AuditLogger {
  if (!auditLoggerInstance) {
    throw new Error('Audit logger not initialized. Call createAuditLogger first.');
  }
  return auditLoggerInstance;
}