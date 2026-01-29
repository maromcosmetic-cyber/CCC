/**
 * Audit Service Integration
 * 
 * High-level service that integrates audit logging with all system components,
 * providing convenient methods for logging common operations and maintaining
 * audit trails across the entire social intelligence system.
 */

import { AuditLogger, createAuditLogger } from './AuditLogger';
import { DatabaseAuditStorage } from './DatabaseAuditStorage';
import {
  AuditConfig,
  AuditEventType,
  AuditSeverity,
  UserContext,
  DecisionContext,
  AuditQueryFilters,
  AuditStatistics
} from './types';
import { SocialEvent } from '../types/core';
import { DecisionOutput } from '../decision/DecisionEngine';

/**
 * Audit Service Configuration
 */
export interface AuditServiceConfig {
  database: {
    connectionString: string;
  };
  audit: AuditConfig;
}

/**
 * Main Audit Service
 */
export class AuditService {
  private logger: AuditLogger;
  private storage: DatabaseAuditStorage;
  private config: AuditServiceConfig;

  constructor(config: AuditServiceConfig) {
    this.config = config;
    this.storage = new DatabaseAuditStorage(config.database.connectionString);
    this.logger = createAuditLogger(config.audit, this.storage);
  }

  /**
   * Initialize the audit service
   */
  async initialize(): Promise<void> {
    await this.storage.initialize();
    
    await this.logger.logSystemOperation(
      'audit_service_initialized',
      true,
      undefined,
      { config: this.config.audit }
    );
  }

  /**
   * Decision Engine Integration
   */
  async logDecisionMade(
    socialEvent: SocialEvent,
    decision: DecisionOutput,
    processingTime: number
  ): Promise<void> {
    const decisionContext: DecisionContext = {
      eventId: socialEvent.id,
      decisionId: decision.id,
      confidence: decision.confidence,
      priorityScore: decision.priority,
      routingDecision: decision.route,
      brandContext: decision.brandContext ? {
        playbook: decision.brandContext.playbook,
        persona: decision.brandContext.persona,
        complianceRules: decision.brandContext.complianceRules || []
      } : undefined,
      aiAnalysis: decision.analysis ? {
        sentiment: {
          overall: decision.analysis.sentiment?.overall || 0,
          confidence: decision.analysis.sentiment?.confidence || 0
        },
        intent: {
          category: decision.analysis.intent?.category || 'unknown',
          confidence: decision.analysis.intent?.confidence || 0
        },
        topics: decision.analysis.topics || []
      } : undefined
    };

    await this.logger.logDecision(
      socialEvent.id,
      decision.id,
      decision.confidence,
      decision.priority,
      decision.route,
      decisionContext
    );

    // Log performance metrics
    await this.logger.log(
      this.logger.event(AuditEventType.SYSTEM_START, 'Decision processing completed')
        .decisionContext(decisionContext)
        .performance({ duration: processingTime })
        .tags(['decision-engine', 'performance'])
        .metadata({
          platform: socialEvent.platform,
          contentType: socialEvent.contentType,
          actionCount: decision.actions.length
        })
        .build()
    );
  }

  async logActionExecuted(
    decisionId: string,
    actionType: string,
    success: boolean,
    executionTime: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logger.log(
      this.logger.event(
        AuditEventType.ACTION_EXECUTED,
        `Action executed: ${actionType}`
      )
        .severity(success ? AuditSeverity.INFO : AuditSeverity.ERROR)
        .performance({ duration: executionTime })
        .metadata({
          decisionId,
          actionType,
          success,
          ...metadata
        })
        .tags(['action-execution', actionType])
        .build()
    );
  }

  /**
   * Data Operations Logging
   */
  async logDataIngestion(
    platform: string,
    recordCount: number,
    processingTime: number,
    success: boolean,
    errors?: string[]
  ): Promise<void> {
    await this.logger.logDataOperation(
      'ingested',
      recordCount,
      `${platform}_events`,
      {
        platform,
        success,
        errors: errors || [],
        processingTimeMs: processingTime
      }
    );

    if (!success && errors) {
      for (const error of errors) {
        await this.logger.log(
          this.logger.event(AuditEventType.ERROR_OCCURRED, `Data ingestion error: ${error}`)
            .severity(AuditSeverity.ERROR)
            .metadata({ platform, error })
            .tags(['data-ingestion', 'error', platform])
            .build()
        );
      }
    }
  }

  async logDataProcessing(
    eventId: string,
    processingStage: string,
    success: boolean,
    processingTime: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logger.logDataOperation(
      'processed',
      1,
      processingStage,
      {
        eventId,
        success,
        processingTimeMs: processingTime,
        ...metadata
      }
    );
  }

  /**
   * User Action Logging
   */
  async logUserLogin(userContext: UserContext): Promise<void> {
    await this.logger.log(
      this.logger.event(AuditEventType.USER_LOGIN, 'User logged in')
        .userContext(userContext)
        .tags(['authentication', 'login'])
        .compliance(['security-audit'])
        .build()
    );
  }

  async logUserLogout(userContext: UserContext): Promise<void> {
    await this.logger.log(
      this.logger.event(AuditEventType.USER_LOGOUT, 'User logged out')
        .userContext(userContext)
        .tags(['authentication', 'logout'])
        .compliance(['security-audit'])
        .build()
    );
  }

  async logUserAction(
    action: string,
    userContext: UserContext,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logger.logUserAction(action, userContext, metadata);
  }

  async logConfigurationChange(
    configType: string,
    changes: Record<string, any>,
    userContext: UserContext
  ): Promise<void> {
    await this.logger.log(
      this.logger.event(AuditEventType.CONFIGURATION_CHANGE, `Configuration changed: ${configType}`)
        .userContext(userContext)
        .metadata({ configType, changes })
        .tags(['configuration', 'admin'])
        .compliance(['admin-audit'])
        .build()
    );
  }

  /**
   * Security Event Logging
   */
  async logAuthenticationFailure(
    reason: string,
    userContext?: Partial<UserContext>
  ): Promise<void> {
    await this.logger.logSecurityEvent(
      AuditEventType.AUTHENTICATION_FAILED,
      `Authentication failed: ${reason}`,
      userContext as UserContext,
      AuditSeverity.WARN
    );
  }

  async logAuthorizationDenied(
    resource: string,
    action: string,
    userContext: UserContext
  ): Promise<void> {
    await this.logger.logSecurityEvent(
      AuditEventType.AUTHORIZATION_DENIED,
      `Authorization denied for ${action} on ${resource}`,
      userContext,
      AuditSeverity.WARN
    );
  }

  async logSuspiciousActivity(
    activity: string,
    userContext?: UserContext,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logger.log(
      this.logger.event(AuditEventType.SUSPICIOUS_ACTIVITY, `Suspicious activity detected: ${activity}`)
        .severity(AuditSeverity.ERROR)
        .userContext(userContext)
        .metadata(metadata || {})
        .tags(['security', 'suspicious'])
        .compliance(['security-audit'])
        .build()
    );
  }

  /**
   * External Integration Logging
   */
  async logExternalAPICall(
    platform: string,
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    success: boolean
  ): Promise<void> {
    await this.logger.log(
      this.logger.event(AuditEventType.EXTERNAL_API_CALL, `API call to ${platform}: ${method} ${endpoint}`)
        .severity(success ? AuditSeverity.INFO : AuditSeverity.WARN)
        .performance({ 
          duration: responseTime,
          networkLatency: responseTime 
        })
        .metadata({
          platform,
          endpoint,
          method,
          statusCode,
          success
        })
        .tags(['external-api', platform])
        .build()
    );
  }

  async logWebhookReceived(
    platform: string,
    eventType: string,
    processingTime: number,
    success: boolean,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logger.log(
      this.logger.event(AuditEventType.WEBHOOK_RECEIVED, `Webhook received from ${platform}: ${eventType}`)
        .severity(success ? AuditSeverity.INFO : AuditSeverity.WARN)
        .performance({ duration: processingTime })
        .metadata({
          platform,
          eventType,
          success,
          ...metadata
        })
        .tags(['webhook', platform])
        .build()
    );
  }

  async logNotificationSent(
    type: string,
    recipient: string,
    success: boolean,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logger.log(
      this.logger.event(AuditEventType.NOTIFICATION_SENT, `Notification sent: ${type}`)
        .severity(success ? AuditSeverity.INFO : AuditSeverity.WARN)
        .metadata({
          type,
          recipient: this.anonymizeRecipient(recipient),
          success,
          ...metadata
        })
        .tags(['notification', type])
        .build()
    );
  }

  /**
   * System Health Logging
   */
  async logSystemStart(): Promise<void> {
    await this.logger.log(
      this.logger.event(AuditEventType.SYSTEM_START, 'Social Intelligence System started')
        .tags(['system', 'startup'])
        .build()
    );
  }

  async logSystemShutdown(): Promise<void> {
    await this.logger.log(
      this.logger.event(AuditEventType.SYSTEM_SHUTDOWN, 'Social Intelligence System shutting down')
        .tags(['system', 'shutdown'])
        .build()
    );
  }

  async logServiceRestart(serviceName: string, reason?: string): Promise<void> {
    await this.logger.log(
      this.logger.event(AuditEventType.SERVICE_RESTART, `Service restarted: ${serviceName}`)
        .metadata({ serviceName, reason })
        .tags(['system', 'restart', serviceName])
        .build()
    );
  }

  async logError(
    error: Error,
    context?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logger.log(
      this.logger.event(AuditEventType.ERROR_OCCURRED, `Error occurred: ${error.message}`)
        .severity(AuditSeverity.ERROR)
        .error('SYSTEM_ERROR', error.message, error.stack)
        .metadata({
          context,
          errorName: error.name,
          ...metadata
        })
        .tags(['error', 'system'])
        .build()
    );
  }

  /**
   * Query and Analytics
   */
  async queryLogs(filters: AuditQueryFilters) {
    return this.logger.query(filters);
  }

  async getStatistics(filters?: Partial<AuditQueryFilters>): Promise<AuditStatistics> {
    return this.logger.getStatistics(filters);
  }

  async getMetrics() {
    return this.logger.getMetrics();
  }

  /**
   * Maintenance Operations
   */
  async cleanup(): Promise<number> {
    const deletedCount = await this.logger.cleanup();
    
    await this.logger.logSystemOperation(
      'audit_logs_cleanup',
      true,
      undefined,
      { deletedCount }
    );

    return deletedCount;
  }

  async flush(): Promise<void> {
    await this.logger.flush();
  }

  /**
   * Shutdown the audit service
   */
  async shutdown(): Promise<void> {
    await this.logger.shutdown();
    await this.storage.close();
  }

  /**
   * Helper Methods
   */
  private anonymizeRecipient(recipient: string): string {
    if (recipient.includes('@')) {
      // Email anonymization
      const [local, domain] = recipient.split('@');
      return `${local.substring(0, 2)}***@${domain}`;
    } else if (recipient.match(/^\+?\d+$/)) {
      // Phone number anonymization
      return `***${recipient.slice(-4)}`;
    } else {
      // Generic anonymization
      return `***${recipient.slice(-3)}`;
    }
  }

  /**
   * Create audit context from request
   */
  createUserContext(req: any): UserContext {
    return {
      userId: req.user?.id,
      username: req.user?.username,
      email: req.user?.email,
      role: req.user?.role,
      sessionId: req.sessionID,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };
  }

  /**
   * Create correlation ID for request tracking
   */
  createCorrelationId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Singleton audit service instance
 */
let auditServiceInstance: AuditService | null = null;

export function createAuditService(config: AuditServiceConfig): AuditService {
  auditServiceInstance = new AuditService(config);
  return auditServiceInstance;
}

export function getAuditService(): AuditService {
  if (!auditServiceInstance) {
    throw new Error('Audit service not initialized. Call createAuditService first.');
  }
  return auditServiceInstance;
}