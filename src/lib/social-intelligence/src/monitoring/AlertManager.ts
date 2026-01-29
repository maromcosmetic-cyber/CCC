/**
 * Alert Manager
 * 
 * Manages performance alerts, evaluates alert rules, and handles
 * alert lifecycle including creation, acknowledgment, and resolution.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  AlertRule,
  AlertInstance,
  AlertSeverity,
  AlertStatus,
  TimeSeriesData,
  MetricType,
  AlertRuleSchema,
  AlertInstanceSchema
} from './types';
import { IAlertManager } from './PerformanceMonitor';

/**
 * Alert Storage Interface
 */
export interface IAlertStorage {
  storeRule(rule: AlertRule): Promise<void>;
  updateRule(rule: AlertRule): Promise<void>;
  deleteRule(ruleId: string): Promise<void>;
  getRule(ruleId: string): Promise<AlertRule | null>;
  getAllRules(): Promise<AlertRule[]>;
  
  storeAlert(alert: AlertInstance): Promise<void>;
  updateAlert(alert: AlertInstance): Promise<void>;
  getAlert(alertId: string): Promise<AlertInstance | null>;
  getActiveAlerts(): Promise<AlertInstance[]>;
  getAlertHistory(startTime: Date, endTime: Date): Promise<AlertInstance[]>;
}

/**
 * Notification Channel Interface
 */
export interface INotificationChannel {
  name: string;
  send(alert: AlertInstance, message: string): Promise<void>;
}

/**
 * Alert Rule Evaluator
 */
export class AlertRuleEvaluator {
  /**
   * Evaluate a single alert rule against time series data
   */
  static evaluate(rule: AlertRule, data: TimeSeriesData): AlertEvaluationResult {
    if (!rule.enabled || data.dataPoints.length < rule.minimumDataPoints) {
      return { shouldAlert: false, triggeredValue: 0, threshold: 0, severity: rule.severity };
    }

    // Calculate the aggregated value based on the evaluation window
    const windowStart = new Date(Date.now() - rule.evaluationWindow * 60 * 1000);
    const relevantPoints = data.dataPoints.filter(point => point.timestamp >= windowStart);

    if (relevantPoints.length < rule.minimumDataPoints) {
      return { shouldAlert: false, triggeredValue: 0, threshold: 0, severity: rule.severity };
    }

    const aggregatedValue = this.aggregateValues(relevantPoints.map(p => p.value), data.metric.aggregation);

    // Check thresholds in order of severity
    if (rule.thresholds.emergency !== undefined && this.exceedsThreshold(aggregatedValue, rule.thresholds.emergency, rule.metricType)) {
      return {
        shouldAlert: true,
        triggeredValue: aggregatedValue,
        threshold: rule.thresholds.emergency,
        severity: AlertSeverity.EMERGENCY
      };
    }

    if (rule.thresholds.critical !== undefined && this.exceedsThreshold(aggregatedValue, rule.thresholds.critical, rule.metricType)) {
      return {
        shouldAlert: true,
        triggeredValue: aggregatedValue,
        threshold: rule.thresholds.critical,
        severity: AlertSeverity.CRITICAL
      };
    }

    if (rule.thresholds.warning !== undefined && this.exceedsThreshold(aggregatedValue, rule.thresholds.warning, rule.metricType)) {
      return {
        shouldAlert: true,
        triggeredValue: aggregatedValue,
        threshold: rule.thresholds.warning,
        severity: AlertSeverity.WARNING
      };
    }

    return { shouldAlert: false, triggeredValue: aggregatedValue, threshold: 0, severity: rule.severity };
  }

  private static aggregateValues(values: number[], aggregation: string): number {
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
      case 'rate':
        // Calculate rate per minute
        return values.length / (values.length > 1 ? 1 : 1); // Simplified rate calculation
      default:
        return values[values.length - 1]; // Latest value
    }
  }

  private static exceedsThreshold(value: number, threshold: number, metricType: MetricType): boolean {
    // For error rates and latency metrics, exceeding means greater than threshold
    // For availability metrics, exceeding means less than threshold
    const invertedMetrics = [
      MetricType.API_AVAILABILITY,
      MetricType.AI_MODEL_ACCURACY
    ];

    if (invertedMetrics.includes(metricType)) {
      return value < threshold;
    }

    return value > threshold;
  }
}

/**
 * Alert Evaluation Result
 */
interface AlertEvaluationResult {
  shouldAlert: boolean;
  triggeredValue: number;
  threshold: number;
  severity: AlertSeverity;
}

/**
 * Main Alert Manager
 */
export class AlertManager extends EventEmitter implements IAlertManager {
  private storage: IAlertStorage;
  private notificationChannels: Map<string, INotificationChannel> = new Map();
  private activeAlerts: Map<string, AlertInstance> = new Map();
  private suppressedAlerts: Map<string, Date> = new Map();

  constructor(storage: IAlertStorage) {
    super();
    this.storage = storage;
  }

  /**
   * Register a notification channel
   */
  registerNotificationChannel(channel: INotificationChannel): void {
    this.notificationChannels.set(channel.name, channel);
  }

  /**
   * Create a new alert rule
   */
  async createRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<AlertRule> {
    const newRule: AlertRule = AlertRuleSchema.parse({
      ...rule,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await this.storage.storeRule(newRule);
    this.emit('rule_created', newRule);
    return newRule;
  }

  /**
   * Update an existing alert rule
   */
  async updateRule(ruleId: string, updates: Partial<AlertRule>): Promise<AlertRule> {
    const existingRule = await this.storage.getRule(ruleId);
    if (!existingRule) {
      throw new Error(`Alert rule ${ruleId} not found`);
    }

    const updatedRule: AlertRule = AlertRuleSchema.parse({
      ...existingRule,
      ...updates,
      updatedAt: new Date()
    });

    await this.storage.updateRule(updatedRule);
    this.emit('rule_updated', updatedRule);
    return updatedRule;
  }

  /**
   * Delete an alert rule
   */
  async deleteRule(ruleId: string): Promise<void> {
    const rule = await this.storage.getRule(ruleId);
    if (!rule) {
      throw new Error(`Alert rule ${ruleId} not found`);
    }

    await this.storage.deleteRule(ruleId);
    this.emit('rule_deleted', rule);
  }

  /**
   * Get all alert rules
   */
  async getAllRules(): Promise<AlertRule[]> {
    return this.storage.getAllRules();
  }

  /**
   * Evaluate all alert rules against current metrics
   */
  async evaluateRules(metricsData: TimeSeriesData[]): Promise<AlertInstance[]> {
    const rules = await this.getAllRules();
    const triggeredAlerts: AlertInstance[] = [];

    for (const rule of rules) {
      if (!rule.enabled) continue;

      // Find matching metric data
      const metricData = metricsData.find(data => data.metric.type === rule.metricType);
      if (!metricData) continue;

      // Check if alert is suppressed
      if (this.isAlertSuppressed(rule.id)) continue;

      // Evaluate the rule
      const evaluation = AlertRuleEvaluator.evaluate(rule, metricData);
      
      if (evaluation.shouldAlert) {
        // Check if there's already an active alert for this rule
        const existingAlert = Array.from(this.activeAlerts.values())
          .find(alert => alert.ruleId === rule.id && alert.status === AlertStatus.ACTIVE);

        if (!existingAlert) {
          // Create new alert
          const alert = await this.createAlert(rule, evaluation.triggeredValue, evaluation.threshold);
          alert.severity = evaluation.severity; // Override with evaluated severity
          triggeredAlerts.push(alert);
        }
      } else {
        // Check if we should resolve any active alerts for this rule
        const activeAlert = Array.from(this.activeAlerts.values())
          .find(alert => alert.ruleId === rule.id && alert.status === AlertStatus.ACTIVE);

        if (activeAlert) {
          await this.resolveAlert(activeAlert.id, 'system', 'Metric returned to normal levels');
        }
      }
    }

    return triggeredAlerts;
  }

  /**
   * Create a new alert instance
   */
  async createAlert(rule: AlertRule, triggeredValue: number, threshold: number): Promise<AlertInstance> {
    const alert: AlertInstance = AlertInstanceSchema.parse({
      id: uuidv4(),
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      status: AlertStatus.ACTIVE,
      message: this.generateAlertMessage(rule, triggeredValue, threshold),
      description: rule.description,
      triggeredAt: new Date(),
      triggeredValue,
      threshold,
      metricType: rule.metricType,
      tags: rule.tags,
      metadata: {
        evaluationWindow: rule.evaluationWindow,
        minimumDataPoints: rule.minimumDataPoints
      }
    });

    await this.storage.storeAlert(alert);
    this.activeAlerts.set(alert.id, alert);

    // Send notifications
    await this.sendNotifications(alert, rule);

    // Set suppression
    this.suppressedAlerts.set(rule.id, new Date(Date.now() + rule.suppressionDuration * 60 * 1000));

    this.emit('alert_created', alert);
    return alert;
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string, note?: string): Promise<void> {
    const alert = await this.storage.getAlert(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    if (alert.status !== AlertStatus.ACTIVE) {
      throw new Error(`Alert ${alertId} is not active`);
    }

    const updatedAlert: AlertInstance = {
      ...alert,
      status: AlertStatus.ACKNOWLEDGED,
      acknowledgedAt: new Date(),
      acknowledgedBy,
      resolutionNote: note
    };

    await this.storage.updateAlert(updatedAlert);
    this.activeAlerts.set(alertId, updatedAlert);

    this.emit('alert_acknowledged', updatedAlert);
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolvedBy: string, note?: string): Promise<void> {
    const alert = await this.storage.getAlert(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    if (alert.status === AlertStatus.RESOLVED) {
      return; // Already resolved
    }

    const updatedAlert: AlertInstance = {
      ...alert,
      status: AlertStatus.RESOLVED,
      resolvedAt: new Date(),
      resolvedBy,
      resolutionNote: note
    };

    await this.storage.updateAlert(updatedAlert);
    this.activeAlerts.delete(alertId);

    this.emit('alert_resolved', updatedAlert);
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<AlertInstance[]> {
    return this.storage.getActiveAlerts();
  }

  /**
   * Get alert history
   */
  async getAlertHistory(startTime: Date, endTime: Date): Promise<AlertInstance[]> {
    return this.storage.getAlertHistory(startTime, endTime);
  }

  /**
   * Get alert statistics
   */
  async getAlertStatistics(startTime: Date, endTime: Date): Promise<{
    totalAlerts: number;
    alertsBySeverity: Record<AlertSeverity, number>;
    alertsByStatus: Record<AlertStatus, number>;
    averageResolutionTime: number;
    topAlertRules: Array<{ ruleId: string; ruleName: string; count: number }>;
  }> {
    const alerts = await this.getAlertHistory(startTime, endTime);

    const alertsBySeverity = alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<AlertSeverity, number>);

    const alertsByStatus = alerts.reduce((acc, alert) => {
      acc[alert.status] = (acc[alert.status] || 0) + 1;
      return acc;
    }, {} as Record<AlertStatus, number>);

    const resolvedAlerts = alerts.filter(alert => alert.resolvedAt);
    const averageResolutionTime = resolvedAlerts.length > 0
      ? resolvedAlerts.reduce((sum, alert) => {
          const resolutionTime = alert.resolvedAt!.getTime() - alert.triggeredAt.getTime();
          return sum + resolutionTime;
        }, 0) / resolvedAlerts.length / 1000 / 60 // Convert to minutes
      : 0;

    const ruleAlertCounts = alerts.reduce((acc, alert) => {
      const key = alert.ruleId;
      acc[key] = acc[key] || { ruleId: alert.ruleId, ruleName: alert.ruleName, count: 0 };
      acc[key].count++;
      return acc;
    }, {} as Record<string, { ruleId: string; ruleName: string; count: number }>);

    const topAlertRules = Object.values(ruleAlertCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalAlerts: alerts.length,
      alertsBySeverity,
      alertsByStatus,
      averageResolutionTime,
      topAlertRules
    };
  }

  /**
   * Private helper methods
   */
  private isAlertSuppressed(ruleId: string): boolean {
    const suppressionEnd = this.suppressedAlerts.get(ruleId);
    if (!suppressionEnd) return false;

    if (new Date() > suppressionEnd) {
      this.suppressedAlerts.delete(ruleId);
      return false;
    }

    return true;
  }

  private generateAlertMessage(rule: AlertRule, triggeredValue: number, threshold: number): string {
    const metricName = rule.metricType.replace(/_/g, ' ');
    const direction = this.getThresholdDirection(rule.metricType);
    
    return `${rule.name}: ${metricName} is ${triggeredValue.toFixed(2)} (${direction} threshold of ${threshold})`;
  }

  private getThresholdDirection(metricType: MetricType): string {
    const invertedMetrics = [
      MetricType.API_AVAILABILITY,
      MetricType.AI_MODEL_ACCURACY
    ];

    return invertedMetrics.includes(metricType) ? 'below' : 'above';
  }

  private async sendNotifications(alert: AlertInstance, rule: AlertRule): Promise<void> {
    const message = this.formatNotificationMessage(alert);

    // Send to primary notification channels
    for (const channelName of rule.notificationChannels) {
      const channel = this.notificationChannels.get(channelName);
      if (channel) {
        try {
          await channel.send(alert, message);
          this.emit('notification_sent', { alert, channel: channelName, success: true });
        } catch (error) {
          this.emit('notification_failed', { alert, channel: channelName, error });
        }
      }
    }

    // Schedule escalation if configured
    if (rule.escalationRules && rule.escalationRules.length > 0) {
      this.scheduleEscalation(alert, rule);
    }
  }

  private formatNotificationMessage(alert: AlertInstance): string {
    return `
🚨 Alert: ${alert.ruleName}

Severity: ${alert.severity.toUpperCase()}
Metric: ${alert.metricType.replace(/_/g, ' ')}
Current Value: ${alert.triggeredValue.toFixed(2)}
Threshold: ${alert.threshold}
Triggered: ${alert.triggeredAt.toISOString()}

Description: ${alert.description || 'No description provided'}
    `.trim();
  }

  private scheduleEscalation(alert: AlertInstance, rule: AlertRule): void {
    if (!rule.escalationRules) return;

    for (const escalation of rule.escalationRules) {
      setTimeout(async () => {
        // Check if alert is still active
        const currentAlert = await this.storage.getAlert(alert.id);
        if (!currentAlert || currentAlert.status !== AlertStatus.ACTIVE) {
          return;
        }

        // Send escalation notifications
        const escalationMessage = `🔥 ESCALATED: ${this.formatNotificationMessage(alert)}`;
        
        for (const channelName of escalation.channels) {
          const channel = this.notificationChannels.get(channelName);
          if (channel) {
            try {
              await channel.send(alert, escalationMessage);
              this.emit('escalation_sent', { alert, channel: channelName, success: true });
            } catch (error) {
              this.emit('escalation_failed', { alert, channel: channelName, error });
            }
          }
        }
      }, escalation.afterMinutes * 60 * 1000);
    }
  }
}

/**
 * Default notification channels
 */
export class ConsoleNotificationChannel implements INotificationChannel {
  name = 'console';

  async send(alert: AlertInstance, message: string): Promise<void> {
    console.log(`[ALERT] ${message}`);
  }
}

export class EmailNotificationChannel implements INotificationChannel {
  name = 'email';
  private emailService: any; // Would be actual email service

  constructor(emailService: any) {
    this.emailService = emailService;
  }

  async send(alert: AlertInstance, message: string): Promise<void> {
    // Implementation would send actual email
    console.log(`[EMAIL ALERT] ${message}`);
  }
}

export class SlackNotificationChannel implements INotificationChannel {
  name = 'slack';
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async send(alert: AlertInstance, message: string): Promise<void> {
    // Implementation would send to Slack webhook
    console.log(`[SLACK ALERT] ${message}`);
  }
}