/**
 * Data Quality Monitor
 * 
 * Monitors ingested content for anomalies, quality issues, and data integrity
 * problems. Flags suspicious or malformed data and tracks completeness metrics.
 */

import { EventEmitter } from 'events';
import { SocialEvent } from '../types/core';
import { AuditService } from '../audit/AuditService';

/**
 * Data Quality Issue Types
 */
export enum DataQualityIssueType {
  // Content Issues
  MISSING_REQUIRED_FIELD = 'missing_required_field',
  INVALID_DATA_FORMAT = 'invalid_data_format',
  SUSPICIOUS_CONTENT = 'suspicious_content',
  DUPLICATE_CONTENT = 'duplicate_content',
  
  // Metadata Issues
  MISSING_METADATA = 'missing_metadata',
  INVALID_TIMESTAMP = 'invalid_timestamp',
  INCONSISTENT_PLATFORM_DATA = 'inconsistent_platform_data',
  
  // Engagement Issues
  UNREALISTIC_ENGAGEMENT = 'unrealistic_engagement',
  NEGATIVE_METRICS = 'negative_metrics',
  ENGAGEMENT_SPIKE = 'engagement_spike',
  
  // Author Issues
  MISSING_AUTHOR_INFO = 'missing_author_info',
  SUSPICIOUS_AUTHOR = 'suspicious_author',
  BOT_LIKE_BEHAVIOR = 'bot_like_behavior',
  
  // Platform Issues
  PLATFORM_INCONSISTENCY = 'platform_inconsistency',
  API_DATA_CORRUPTION = 'api_data_corruption',
  RATE_LIMIT_ARTIFACTS = 'rate_limit_artifacts'
}

/**
 * Data Quality Issue Severity
 */
export enum DataQualityIssueSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Data Quality Issue
 */
export interface DataQualityIssue {
  id: string;
  eventId: string;
  type: DataQualityIssueType;
  severity: DataQualityIssueSeverity;
  message: string;
  description: string;
  detectedAt: Date;
  field?: string;
  expectedValue?: any;
  actualValue?: any;
  metadata?: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

/**
 * Data Quality Metrics
 */
export interface DataQualityMetrics {
  totalEvents: number;
  validEvents: number;
  invalidEvents: number;
  qualityScore: number; // 0-100
  completenessScore: number; // 0-100
  accuracyScore: number; // 0-100
  consistencyScore: number; // 0-100
  issuesByType: Record<DataQualityIssueType, number>;
  issuesBySeverity: Record<DataQualityIssueSeverity, number>;
  platformQuality: Record<string, number>;
  timeRange: {
    start: Date;
    end: Date;
  };
}

/**
 * Data Quality Rule
 */
export interface DataQualityRule {
  id: string;
  name: string;
  description: string;
  type: DataQualityIssueType;
  severity: DataQualityIssueSeverity;
  enabled: boolean;
  platforms?: string[];
  condition: (event: SocialEvent) => boolean;
  message: (event: SocialEvent) => string;
  metadata?: Record<string, any>;
}

/**
 * Data Quality Validator
 */
export class DataQualityValidator {
  private rules: Map<string, DataQualityRule> = new Map();

  constructor() {
    this.registerDefaultRules();
  }

  /**
   * Register default quality rules
   */
  private registerDefaultRules(): void {
    // Required field validation
    this.registerRule({
      id: 'required-fields',
      name: 'Required Fields Validation',
      description: 'Validates that all required fields are present',
      type: DataQualityIssueType.MISSING_REQUIRED_FIELD,
      severity: DataQualityIssueSeverity.HIGH,
      enabled: true,
      condition: (event) => {
        return !!(event.id && event.platform && event.eventType && event.timestamp);
      },
      message: (event) => `Missing required fields in event ${event.id}`
    });

    // Content validation
    this.registerRule({
      id: 'content-validation',
      name: 'Content Validation',
      description: 'Validates content structure and format',
      type: DataQualityIssueType.INVALID_DATA_FORMAT,
      severity: DataQualityIssueSeverity.MEDIUM,
      enabled: true,
      condition: (event) => {
        if (event.contentType === 'text' && event.content?.text) {
          return event.content.text.length > 0 && event.content.text.length < 10000;
        }
        return true;
      },
      message: (event) => `Invalid content format in event ${event.id}`
    });

    // Timestamp validation
    this.registerRule({
      id: 'timestamp-validation',
      name: 'Timestamp Validation',
      description: 'Validates timestamp is reasonable',
      type: DataQualityIssueType.INVALID_TIMESTAMP,
      severity: DataQualityIssueSeverity.MEDIUM,
      enabled: true,
      condition: (event) => {
        const now = new Date();
        const eventTime = new Date(event.timestamp);
        const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        const oneHourFuture = new Date(now.getTime() + 60 * 60 * 1000);
        
        return eventTime >= oneYearAgo && eventTime <= oneHourFuture;
      },
      message: (event) => `Invalid timestamp in event ${event.id}: ${event.timestamp}`
    });

    // Engagement validation
    this.registerRule({
      id: 'engagement-validation',
      name: 'Engagement Metrics Validation',
      description: 'Validates engagement metrics are reasonable',
      type: DataQualityIssueType.UNREALISTIC_ENGAGEMENT,
      severity: DataQualityIssueSeverity.MEDIUM,
      enabled: true,
      condition: (event) => {
        if (!event.engagement) return true;
        
        const { likes = 0, shares = 0, comments = 0, views = 0 } = event.engagement;
        
        // Check for negative values
        if (likes < 0 || shares < 0 || comments < 0 || views < 0) {
          return false;
        }
        
        // Check for unrealistic ratios
        if (views > 0 && likes > views) return false;
        if (likes > 0 && shares > likes * 2) return false;
        
        return true;
      },
      message: (event) => `Unrealistic engagement metrics in event ${event.id}`
    });

    // Author validation
    this.registerRule({
      id: 'author-validation',
      name: 'Author Information Validation',
      description: 'Validates author information is present and reasonable',
      type: DataQualityIssueType.MISSING_AUTHOR_INFO,
      severity: DataQualityIssueSeverity.LOW,
      enabled: true,
      condition: (event) => {
        return !!(event.author?.id && (event.author.username || event.author.displayName));
      },
      message: (event) => `Missing or incomplete author information in event ${event.id}`
    });

    // Platform consistency validation
    this.registerRule({
      id: 'platform-consistency',
      name: 'Platform Data Consistency',
      description: 'Validates platform-specific data consistency',
      type: DataQualityIssueType.PLATFORM_INCONSISTENCY,
      severity: DataQualityIssueSeverity.MEDIUM,
      enabled: true,
      condition: (event) => {
        // Platform-specific validation
        switch (event.platform) {
          case 'tiktok':
            return event.platformEventId?.startsWith('tiktok_') !== false;
          case 'instagram':
          case 'facebook':
            return event.platformEventId?.includes('_') !== false;
          case 'youtube':
            return event.platformEventId?.length === 11 || event.platformEventId?.length === 28;
          default:
            return true;
        }
      },
      message: (event) => `Platform data inconsistency in event ${event.id} for platform ${event.platform}`
    });

    // Suspicious content detection
    this.registerRule({
      id: 'suspicious-content',
      name: 'Suspicious Content Detection',
      description: 'Detects potentially suspicious or spam content',
      type: DataQualityIssueType.SUSPICIOUS_CONTENT,
      severity: DataQualityIssueSeverity.HIGH,
      enabled: true,
      condition: (event) => {
        if (!event.content?.text) return true;
        
        const text = event.content.text.toLowerCase();
        const suspiciousPatterns = [
          /(.)\1{10,}/, // Repeated characters
          /https?:\/\/[^\s]+/g, // Multiple URLs
          /\b(buy now|click here|limited time|act fast)\b/gi, // Spam phrases
          /[^\w\s]{5,}/ // Excessive special characters
        ];
        
        // Check for suspicious patterns
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(text)) {
            const matches = text.match(pattern);
            if (matches && matches.length > 3) {
              return false;
            }
          }
        }
        
        return true;
      },
      message: (event) => `Suspicious content detected in event ${event.id}`
    });
  }

  /**
   * Register a custom quality rule
   */
  registerRule(rule: DataQualityRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove a quality rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Get all registered rules
   */
  getRules(): DataQualityRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Validate an event against all rules
   */
  validateEvent(event: SocialEvent): DataQualityIssue[] {
    const issues: DataQualityIssue[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;
      
      // Check platform filter
      if (rule.platforms && !rule.platforms.includes(event.platform)) {
        continue;
      }

      try {
        const isValid = rule.condition(event);
        if (!isValid) {
          issues.push({
            id: `${rule.id}_${event.id}_${Date.now()}`,
            eventId: event.id,
            type: rule.type,
            severity: rule.severity,
            message: rule.message(event),
            description: rule.description,
            detectedAt: new Date(),
            metadata: {
              ruleId: rule.id,
              ruleName: rule.name,
              ...rule.metadata
            },
            resolved: false
          });
        }
      } catch (error) {
        // Log rule execution error but don't fail validation
        console.error(`Error executing quality rule ${rule.id}:`, error);
      }
    }

    return issues;
  }
}

/**
 * Main Data Quality Monitor
 */
export class DataQualityMonitor extends EventEmitter {
  private validator: DataQualityValidator;
  private auditService?: AuditService;
  private issues: Map<string, DataQualityIssue> = new Map();
  private metrics: DataQualityMetrics;
  private isEnabled = true;

  // Statistics tracking
  private stats = {
    totalEvents: 0,
    validEvents: 0,
    invalidEvents: 0,
    issuesByType: new Map<DataQualityIssueType, number>(),
    issuesBySeverity: new Map<DataQualityIssueSeverity, number>(),
    platformStats: new Map<string, { total: number; valid: number }>()
  };

  constructor(auditService?: AuditService) {
    super();
    this.validator = new DataQualityValidator();
    this.auditService = auditService;
    this.metrics = this.initializeMetrics();
  }

  /**
   * Enable or disable data quality monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.emit('monitoring_toggled', { enabled });
  }

  /**
   * Monitor a single social event
   */
  async monitorEvent(event: SocialEvent): Promise<DataQualityIssue[]> {
    if (!this.isEnabled) {
      return [];
    }

    this.stats.totalEvents++;
    
    // Update platform stats
    const platformStat = this.stats.platformStats.get(event.platform) || { total: 0, valid: 0 };
    platformStat.total++;
    this.stats.platformStats.set(event.platform, platformStat);

    try {
      // Validate the event
      const issues = this.validator.validateEvent(event);

      if (issues.length === 0) {
        this.stats.validEvents++;
        platformStat.valid++;
        this.emit('event_validated', { eventId: event.id, valid: true });
      } else {
        this.stats.invalidEvents++;
        
        // Store issues
        for (const issue of issues) {
          this.issues.set(issue.id, issue);
          
          // Update statistics
          this.updateIssueStats(issue);
          
          // Emit issue event
          this.emit('quality_issue_detected', issue);
          
          // Log to audit service if available
          if (this.auditService) {
            await this.auditService.logDataProcessing(
              event.id,
              'data_quality_check',
              false,
              0,
              {
                issueType: issue.type,
                severity: issue.severity,
                message: issue.message
              }
            );
          }
        }

        this.emit('event_validated', { eventId: event.id, valid: false, issues });
      }

      // Update metrics
      this.updateMetrics();

      return issues;
    } catch (error) {
      this.emit('monitoring_error', { eventId: event.id, error });
      throw error;
    }
  }

  /**
   * Monitor multiple events in batch
   */
  async monitorEvents(events: SocialEvent[]): Promise<Map<string, DataQualityIssue[]>> {
    const results = new Map<string, DataQualityIssue[]>();

    for (const event of events) {
      try {
        const issues = await this.monitorEvent(event);
        results.set(event.id, issues);
      } catch (error) {
        this.emit('monitoring_error', { eventId: event.id, error });
        results.set(event.id, []);
      }
    }

    this.emit('batch_monitoring_completed', { 
      totalEvents: events.length, 
      results: results.size 
    });

    return results;
  }

  /**
   * Get current data quality metrics
   */
  getMetrics(): DataQualityMetrics {
    return { ...this.metrics };
  }

  /**
   * Get quality issues by criteria
   */
  getIssues(filters?: {
    eventId?: string;
    type?: DataQualityIssueType;
    severity?: DataQualityIssueSeverity;
    resolved?: boolean;
    startTime?: Date;
    endTime?: Date;
  }): DataQualityIssue[] {
    let issues = Array.from(this.issues.values());

    if (filters) {
      if (filters.eventId) {
        issues = issues.filter(issue => issue.eventId === filters.eventId);
      }
      if (filters.type) {
        issues = issues.filter(issue => issue.type === filters.type);
      }
      if (filters.severity) {
        issues = issues.filter(issue => issue.severity === filters.severity);
      }
      if (filters.resolved !== undefined) {
        issues = issues.filter(issue => issue.resolved === filters.resolved);
      }
      if (filters.startTime) {
        issues = issues.filter(issue => issue.detectedAt >= filters.startTime!);
      }
      if (filters.endTime) {
        issues = issues.filter(issue => issue.detectedAt <= filters.endTime!);
      }
    }

    return issues.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
  }

  /**
   * Resolve a quality issue
   */
  async resolveIssue(issueId: string, resolvedBy: string, note?: string): Promise<void> {
    const issue = this.issues.get(issueId);
    if (!issue) {
      throw new Error(`Quality issue ${issueId} not found`);
    }

    if (issue.resolved) {
      return; // Already resolved
    }

    issue.resolved = true;
    issue.resolvedAt = new Date();
    issue.resolvedBy = resolvedBy;
    if (note) {
      issue.metadata = { ...issue.metadata, resolutionNote: note };
    }

    this.issues.set(issueId, issue);
    this.emit('issue_resolved', issue);

    // Log to audit service
    if (this.auditService) {
      await this.auditService.logUserAction(
        'resolve_quality_issue',
        { userId: resolvedBy },
        { issueId, issueType: issue.type, note }
      );
    }
  }

  /**
   * Get quality statistics by platform
   */
  getPlatformQualityStats(): Record<string, {
    totalEvents: number;
    validEvents: number;
    qualityScore: number;
    commonIssues: Array<{ type: DataQualityIssueType; count: number }>;
  }> {
    const stats: Record<string, any> = {};

    for (const [platform, platformStat] of this.stats.platformStats) {
      const qualityScore = platformStat.total > 0 
        ? (platformStat.valid / platformStat.total) * 100 
        : 100;

      // Get common issues for this platform
      const platformIssues = Array.from(this.issues.values())
        .filter(issue => {
          // We'd need to track platform in issues for this to work properly
          // For now, return empty array
          return false;
        });

      const issueTypeCounts = new Map<DataQualityIssueType, number>();
      for (const issue of platformIssues) {
        issueTypeCounts.set(issue.type, (issueTypeCounts.get(issue.type) || 0) + 1);
      }

      const commonIssues = Array.from(issueTypeCounts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      stats[platform] = {
        totalEvents: platformStat.total,
        validEvents: platformStat.valid,
        qualityScore,
        commonIssues
      };
    }

    return stats;
  }

  /**
   * Generate quality report
   */
  generateQualityReport(startTime?: Date, endTime?: Date): {
    summary: DataQualityMetrics;
    topIssues: Array<{ type: DataQualityIssueType; count: number; severity: DataQualityIssueSeverity }>;
    platformBreakdown: Record<string, any>;
    recommendations: string[];
  } {
    const filteredIssues = this.getIssues({ startTime, endTime });
    
    // Calculate top issues
    const issueTypeCounts = new Map<DataQualityIssueType, { count: number; severity: DataQualityIssueSeverity }>();
    for (const issue of filteredIssues) {
      const current = issueTypeCounts.get(issue.type) || { count: 0, severity: issue.severity };
      current.count++;
      // Keep the highest severity
      if (this.getSeverityWeight(issue.severity) > this.getSeverityWeight(current.severity)) {
        current.severity = issue.severity;
      }
      issueTypeCounts.set(issue.type, current);
    }

    const topIssues = Array.from(issueTypeCounts.entries())
      .map(([type, data]) => ({ type, count: data.count, severity: data.severity }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Generate recommendations
    const recommendations = this.generateRecommendations(topIssues);

    return {
      summary: this.getMetrics(),
      topIssues,
      platformBreakdown: this.getPlatformQualityStats(),
      recommendations
    };
  }

  /**
   * Clear old resolved issues
   */
  cleanupResolvedIssues(olderThanDays: number = 30): number {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    let removedCount = 0;

    for (const [issueId, issue] of this.issues) {
      if (issue.resolved && issue.resolvedAt && issue.resolvedAt < cutoffDate) {
        this.issues.delete(issueId);
        removedCount++;
      }
    }

    this.emit('cleanup_completed', { removedCount });
    return removedCount;
  }

  /**
   * Private helper methods
   */
  private initializeMetrics(): DataQualityMetrics {
    return {
      totalEvents: 0,
      validEvents: 0,
      invalidEvents: 0,
      qualityScore: 100,
      completenessScore: 100,
      accuracyScore: 100,
      consistencyScore: 100,
      issuesByType: {} as Record<DataQualityIssueType, number>,
      issuesBySeverity: {} as Record<DataQualityIssueSeverity, number>,
      platformQuality: {},
      timeRange: {
        start: new Date(),
        end: new Date()
      }
    };
  }

  private updateIssueStats(issue: DataQualityIssue): void {
    // Update issue type stats
    const typeCount = this.stats.issuesByType.get(issue.type) || 0;
    this.stats.issuesByType.set(issue.type, typeCount + 1);

    // Update severity stats
    const severityCount = this.stats.issuesBySeverity.get(issue.severity) || 0;
    this.stats.issuesBySeverity.set(issue.severity, severityCount + 1);
  }

  private updateMetrics(): void {
    const totalEvents = this.stats.totalEvents;
    const validEvents = this.stats.validEvents;
    const invalidEvents = this.stats.invalidEvents;

    this.metrics = {
      totalEvents,
      validEvents,
      invalidEvents,
      qualityScore: totalEvents > 0 ? (validEvents / totalEvents) * 100 : 100,
      completenessScore: this.calculateCompletenessScore(),
      accuracyScore: this.calculateAccuracyScore(),
      consistencyScore: this.calculateConsistencyScore(),
      issuesByType: Object.fromEntries(this.stats.issuesByType) as Record<DataQualityIssueType, number>,
      issuesBySeverity: Object.fromEntries(this.stats.issuesBySeverity) as Record<DataQualityIssueSeverity, number>,
      platformQuality: this.calculatePlatformQuality(),
      timeRange: {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        end: new Date()
      }
    };
  }

  private calculateCompletenessScore(): number {
    const missingFieldIssues = this.stats.issuesByType.get(DataQualityIssueType.MISSING_REQUIRED_FIELD) || 0;
    const missingMetadataIssues = this.stats.issuesByType.get(DataQualityIssueType.MISSING_METADATA) || 0;
    const totalCompletenessIssues = missingFieldIssues + missingMetadataIssues;
    
    return this.stats.totalEvents > 0 
      ? Math.max(0, 100 - (totalCompletenessIssues / this.stats.totalEvents) * 100)
      : 100;
  }

  private calculateAccuracyScore(): number {
    const formatIssues = this.stats.issuesByType.get(DataQualityIssueType.INVALID_DATA_FORMAT) || 0;
    const timestampIssues = this.stats.issuesByType.get(DataQualityIssueType.INVALID_TIMESTAMP) || 0;
    const totalAccuracyIssues = formatIssues + timestampIssues;
    
    return this.stats.totalEvents > 0 
      ? Math.max(0, 100 - (totalAccuracyIssues / this.stats.totalEvents) * 100)
      : 100;
  }

  private calculateConsistencyScore(): number {
    const consistencyIssues = this.stats.issuesByType.get(DataQualityIssueType.PLATFORM_INCONSISTENCY) || 0;
    
    return this.stats.totalEvents > 0 
      ? Math.max(0, 100 - (consistencyIssues / this.stats.totalEvents) * 100)
      : 100;
  }

  private calculatePlatformQuality(): Record<string, number> {
    const platformQuality: Record<string, number> = {};
    
    for (const [platform, stats] of this.stats.platformStats) {
      platformQuality[platform] = stats.total > 0 ? (stats.valid / stats.total) * 100 : 100;
    }
    
    return platformQuality;
  }

  private getSeverityWeight(severity: DataQualityIssueSeverity): number {
    switch (severity) {
      case DataQualityIssueSeverity.LOW: return 1;
      case DataQualityIssueSeverity.MEDIUM: return 2;
      case DataQualityIssueSeverity.HIGH: return 3;
      case DataQualityIssueSeverity.CRITICAL: return 4;
      default: return 0;
    }
  }

  private generateRecommendations(topIssues: Array<{ type: DataQualityIssueType; count: number }>): string[] {
    const recommendations: string[] = [];

    for (const issue of topIssues.slice(0, 5)) {
      switch (issue.type) {
        case DataQualityIssueType.MISSING_REQUIRED_FIELD:
          recommendations.push(`Address ${issue.count} missing required field issues by improving data validation at ingestion`);
          break;
        case DataQualityIssueType.INVALID_TIMESTAMP:
          recommendations.push(`Fix ${issue.count} timestamp issues by implementing proper date parsing and validation`);
          break;
        case DataQualityIssueType.UNREALISTIC_ENGAGEMENT:
          recommendations.push(`Investigate ${issue.count} unrealistic engagement metrics - possible API issues or bot activity`);
          break;
        case DataQualityIssueType.SUSPICIOUS_CONTENT:
          recommendations.push(`Review ${issue.count} suspicious content detections and refine spam detection rules`);
          break;
        case DataQualityIssueType.PLATFORM_INCONSISTENCY:
          recommendations.push(`Resolve ${issue.count} platform inconsistencies by updating platform-specific validation rules`);
          break;
        default:
          recommendations.push(`Address ${issue.count} ${issue.type.replace(/_/g, ' ')} issues`);
      }
    }

    // Add general recommendations based on overall quality
    if (this.metrics.qualityScore < 90) {
      recommendations.push('Overall data quality is below 90% - consider implementing stricter validation rules');
    }

    if (this.metrics.completenessScore < 85) {
      recommendations.push('Data completeness is low - review data ingestion processes and API configurations');
    }

    return recommendations;
  }
}