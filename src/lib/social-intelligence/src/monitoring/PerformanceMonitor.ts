/**
 * Performance Monitor Service
 * 
 * Comprehensive system performance monitoring that tracks API response times,
 * processing latency, AI model performance, and system health metrics.
 */

import { EventEmitter } from 'events';
import {
  MetricType,
  MetricUnit,
  MetricDataPoint,
  MetricDefinition,
  TimeSeriesData,
  AlertRule,
  AlertInstance,
  AlertSeverity,
  AlertStatus,
  SystemHealthStatus,
  MonitoringConfig,
  MetricDataPointSchema,
  AlertInstanceSchema
} from './types';

/**
 * Metric Storage Interface
 */
export interface IMetricStorage {
  storeMetric(metric: MetricDefinition, dataPoint: MetricDataPoint): Promise<void>;
  storeMetrics(metrics: Array<{ metric: MetricDefinition; dataPoint: MetricDataPoint }>): Promise<void>;
  getTimeSeriesData(metricType: MetricType, startTime: Date, endTime: Date, tags?: Record<string, string>): Promise<TimeSeriesData>;
  getLatestValue(metricType: MetricType, tags?: Record<string, string>): Promise<MetricDataPoint | null>;
  cleanup(retentionDays: number): Promise<number>;
}

/**
 * Alert Manager Interface
 */
export interface IAlertManager {
  evaluateRules(metrics: TimeSeriesData[]): Promise<AlertInstance[]>;
  createAlert(rule: AlertRule, triggeredValue: number, threshold: number): Promise<AlertInstance>;
  acknowledgeAlert(alertId: string, acknowledgedBy: string, note?: string): Promise<void>;
  resolveAlert(alertId: string, resolvedBy: string, note?: string): Promise<void>;
  getActiveAlerts(): Promise<AlertInstance[]>;
  getAlertHistory(startTime: Date, endTime: Date): Promise<AlertInstance[]>;
}

/**
 * Performance Timer for measuring execution time
 */
export class PerformanceTimer {
  private startTime: number;
  private endTime?: number;

  constructor() {
    this.startTime = performance.now();
  }

  stop(): number {
    this.endTime = performance.now();
    return this.endTime - this.startTime;
  }

  getDuration(): number {
    if (this.endTime) {
      return this.endTime - this.startTime;
    }
    return performance.now() - this.startTime;
  }
}

/**
 * Metric Collector for gathering system metrics
 */
export class MetricCollector {
  private metrics: Map<string, MetricDefinition> = new Map();

  constructor() {
    this.registerDefaultMetrics();
  }

  private registerDefaultMetrics(): void {
    // API Performance Metrics
    this.registerMetric({
      name: 'api_response_time',
      type: MetricType.API_RESPONSE_TIME,
      unit: MetricUnit.MILLISECONDS,
      description: 'API response time in milliseconds',
      aggregation: 'avg'
    });

    this.registerMetric({
      name: 'api_availability',
      type: MetricType.API_AVAILABILITY,
      unit: MetricUnit.PERCENTAGE,
      description: 'API availability percentage',
      aggregation: 'avg'
    });

    this.registerMetric({
      name: 'api_error_rate',
      type: MetricType.API_ERROR_RATE,
      unit: MetricUnit.PERCENTAGE,
      description: 'API error rate percentage',
      aggregation: 'avg'
    });

    // Processing Performance Metrics
    this.registerMetric({
      name: 'event_processing_latency',
      type: MetricType.EVENT_PROCESSING_LATENCY,
      unit: MetricUnit.MILLISECONDS,
      description: 'Event processing latency in milliseconds',
      aggregation: 'avg'
    });

    this.registerMetric({
      name: 'ingestion_throughput',
      type: MetricType.INGESTION_THROUGHPUT,
      unit: MetricUnit.EVENTS_PER_SECOND,
      description: 'Event ingestion throughput',
      aggregation: 'sum'
    });

    // AI Model Performance Metrics
    this.registerMetric({
      name: 'ai_model_accuracy',
      type: MetricType.AI_MODEL_ACCURACY,
      unit: MetricUnit.PERCENTAGE,
      description: 'AI model accuracy percentage',
      aggregation: 'avg'
    });

    this.registerMetric({
      name: 'ai_model_latency',
      type: MetricType.AI_MODEL_LATENCY,
      unit: MetricUnit.MILLISECONDS,
      description: 'AI model inference latency',
      aggregation: 'avg'
    });

    // System Resource Metrics
    this.registerMetric({
      name: 'cpu_usage',
      type: MetricType.CPU_USAGE,
      unit: MetricUnit.PERCENTAGE,
      description: 'CPU usage percentage',
      aggregation: 'avg'
    });

    this.registerMetric({
      name: 'memory_usage',
      type: MetricType.MEMORY_USAGE,
      unit: MetricUnit.PERCENTAGE,
      description: 'Memory usage percentage',
      aggregation: 'avg'
    });
  }

  registerMetric(definition: Omit<MetricDefinition, 'retentionDays'> & { retentionDays?: number }): void {
    const metric: MetricDefinition = {
      ...definition,
      retentionDays: definition.retentionDays || 90
    };
    this.metrics.set(metric.type, metric);
  }

  getMetric(type: MetricType): MetricDefinition | undefined {
    return this.metrics.get(type);
  }

  getAllMetrics(): MetricDefinition[] {
    return Array.from(this.metrics.values());
  }

  createDataPoint(value: number, tags?: Record<string, string>, metadata?: Record<string, any>): MetricDataPoint {
    return MetricDataPointSchema.parse({
      timestamp: new Date(),
      value,
      tags,
      metadata
    });
  }
}

/**
 * Main Performance Monitor Service
 */
export class PerformanceMonitor extends EventEmitter {
  private config: MonitoringConfig;
  private storage: IMetricStorage;
  private alertManager: IAlertManager;
  private collector: MetricCollector;
  private collectionTimer?: NodeJS.Timeout;
  private alertEvaluationTimer?: NodeJS.Timeout;
  private isRunning = false;

  // Performance tracking
  private activeTimers: Map<string, PerformanceTimer> = new Map();
  private systemMetrics = {
    startTime: new Date(),
    totalRequests: 0,
    totalErrors: 0,
    totalEvents: 0,
    totalDecisions: 0
  };

  constructor(config: MonitoringConfig, storage: IMetricStorage, alertManager: IAlertManager) {
    super();
    this.config = config;
    this.storage = storage;
    this.alertManager = alertManager;
    this.collector = new MetricCollector();
  }

  /**
   * Start the performance monitor
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.systemMetrics.startTime = new Date();

    // Start metric collection
    if (this.config.collection.interval > 0) {
      this.collectionTimer = setInterval(
        () => this.collectSystemMetrics(),
        this.config.collection.interval * 1000
      );
    }

    // Start alert evaluation
    if (this.config.alerting.enabled && this.config.alerting.evaluationInterval > 0) {
      this.alertEvaluationTimer = setInterval(
        () => this.evaluateAlerts(),
        this.config.alerting.evaluationInterval * 1000
      );
    }

    this.emit('started');
  }

  /**
   * Stop the performance monitor
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = undefined;
    }

    if (this.alertEvaluationTimer) {
      clearInterval(this.alertEvaluationTimer);
      this.alertEvaluationTimer = undefined;
    }

    this.emit('stopped');
  }

  /**
   * Record API performance metrics
   */
  async recordAPICall(
    platform: string,
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    success: boolean
  ): Promise<void> {
    const tags = { platform, endpoint, method, status: statusCode.toString() };

    // Record response time
    await this.recordMetric(
      MetricType.API_RESPONSE_TIME,
      responseTime,
      tags
    );

    // Record availability
    await this.recordMetric(
      MetricType.API_AVAILABILITY,
      success ? 100 : 0,
      tags
    );

    // Record error rate
    await this.recordMetric(
      MetricType.API_ERROR_RATE,
      success ? 0 : 100,
      tags
    );

    this.systemMetrics.totalRequests++;
    if (!success) {
      this.systemMetrics.totalErrors++;
    }

    this.emit('api_call_recorded', { platform, endpoint, method, responseTime, statusCode, success });
  }

  /**
   * Record event processing metrics
   */
  async recordEventProcessing(
    eventId: string,
    platform: string,
    processingTime: number,
    stage: string,
    success: boolean
  ): Promise<void> {
    const tags = { platform, stage, success: success.toString() };

    await this.recordMetric(
      MetricType.EVENT_PROCESSING_LATENCY,
      processingTime,
      tags,
      { eventId }
    );

    this.systemMetrics.totalEvents++;
    this.emit('event_processing_recorded', { eventId, platform, processingTime, stage, success });
  }

  /**
   * Record AI model performance
   */
  async recordAIModelPerformance(
    modelName: string,
    modelType: 'sentiment' | 'intent' | 'topic',
    latency: number,
    accuracy?: number,
    confidence?: number
  ): Promise<void> {
    const tags = { model: modelName, type: modelType };

    // Record latency
    await this.recordMetric(
      MetricType.AI_MODEL_LATENCY,
      latency,
      tags
    );

    // Record accuracy if provided
    if (accuracy !== undefined) {
      await this.recordMetric(
        MetricType.AI_MODEL_ACCURACY,
        accuracy * 100, // Convert to percentage
        tags
      );
    }

    // Record confidence if provided
    if (confidence !== undefined) {
      await this.recordMetric(
        MetricType.AI_MODEL_CONFIDENCE,
        confidence * 100, // Convert to percentage
        tags
      );
    }

    this.emit('ai_model_performance_recorded', { modelName, modelType, latency, accuracy, confidence });
  }

  /**
   * Record decision engine performance
   */
  async recordDecisionProcessing(
    decisionId: string,
    processingTime: number,
    priorityCalculationTime: number,
    routingTime: number,
    actionExecutionTime: number
  ): Promise<void> {
    const tags = { decisionId };

    await this.recordMetric(MetricType.DECISION_PROCESSING_TIME, processingTime, tags);
    await this.recordMetric(MetricType.PRIORITY_CALCULATION_TIME, priorityCalculationTime, tags);
    await this.recordMetric(MetricType.ROUTING_DECISION_TIME, routingTime, tags);
    await this.recordMetric(MetricType.ACTION_EXECUTION_TIME, actionExecutionTime, tags);

    this.systemMetrics.totalDecisions++;
    this.emit('decision_processing_recorded', {
      decisionId,
      processingTime,
      priorityCalculationTime,
      routingTime,
      actionExecutionTime
    });
  }

  /**
   * Start a performance timer
   */
  startTimer(name: string): PerformanceTimer {
    const timer = new PerformanceTimer();
    this.activeTimers.set(name, timer);
    return timer;
  }

  /**
   * Stop a performance timer and record the metric
   */
  async stopTimer(name: string, metricType: MetricType, tags?: Record<string, string>): Promise<number> {
    const timer = this.activeTimers.get(name);
    if (!timer) {
      throw new Error(`Timer '${name}' not found`);
    }

    const duration = timer.stop();
    this.activeTimers.delete(name);

    await this.recordMetric(metricType, duration, tags);
    return duration;
  }

  /**
   * Record a custom metric
   */
  async recordMetric(
    type: MetricType,
    value: number,
    tags?: Record<string, string>,
    metadata?: Record<string, any>
  ): Promise<void> {
    const metric = this.collector.getMetric(type);
    if (!metric) {
      throw new Error(`Metric type '${type}' not registered`);
    }

    const dataPoint = this.collector.createDataPoint(value, tags, metadata);
    await this.storage.storeMetric(metric, dataPoint);

    this.emit('metric_recorded', { type, value, tags, metadata });
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
    return this.storage.getTimeSeriesData(metricType, startTime, endTime, tags);
  }

  /**
   * Get latest value for a metric
   */
  async getLatestValue(metricType: MetricType, tags?: Record<string, string>): Promise<MetricDataPoint | null> {
    return this.storage.getLatestValue(metricType, tags);
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealthStatus> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Check API availability
    const apiAvailability = await this.getLatestValue(MetricType.API_AVAILABILITY);
    const apiResponseTime = await this.getLatestValue(MetricType.API_RESPONSE_TIME);
    const apiErrorRate = await this.getLatestValue(MetricType.API_ERROR_RATE);

    // Check processing performance
    const processingLatency = await this.getLatestValue(MetricType.EVENT_PROCESSING_LATENCY);
    const aiModelLatency = await this.getLatestValue(MetricType.AI_MODEL_LATENCY);

    // Check system resources
    const cpuUsage = await this.getLatestValue(MetricType.CPU_USAGE);
    const memoryUsage = await this.getLatestValue(MetricType.MEMORY_USAGE);

    const components = {
      api: {
        status: this.determineComponentHealth(apiAvailability?.value, apiErrorRate?.value, [95, 5]),
        lastCheck: apiAvailability?.timestamp || now,
        responseTime: apiResponseTime?.value,
        errorRate: apiErrorRate?.value,
        message: this.getComponentMessage('api', apiAvailability?.value, apiErrorRate?.value)
      },
      processing: {
        status: this.determineComponentHealth(processingLatency?.value, undefined, [5000]),
        lastCheck: processingLatency?.timestamp || now,
        responseTime: processingLatency?.value,
        message: this.getComponentMessage('processing', processingLatency?.value)
      },
      ai_models: {
        status: this.determineComponentHealth(aiModelLatency?.value, undefined, [2000]),
        lastCheck: aiModelLatency?.timestamp || now,
        responseTime: aiModelLatency?.value,
        message: this.getComponentMessage('ai_models', aiModelLatency?.value)
      },
      system: {
        status: this.determineComponentHealth(cpuUsage?.value, memoryUsage?.value, [80, 80]),
        lastCheck: cpuUsage?.timestamp || now,
        message: this.getComponentMessage('system', cpuUsage?.value, memoryUsage?.value)
      }
    };

    // Determine overall health
    const componentStatuses = Object.values(components).map(c => c.status);
    let overall: 'healthy' | 'degraded' | 'unhealthy' | 'unknown' = 'healthy';

    if (componentStatuses.includes('unhealthy')) {
      overall = 'unhealthy';
    } else if (componentStatuses.includes('degraded')) {
      overall = 'degraded';
    } else if (componentStatuses.includes('unknown')) {
      overall = 'unknown';
    }

    return {
      overall,
      components,
      lastUpdated: now
    };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const uptime = Date.now() - this.systemMetrics.startTime.getTime();
    const errorRate = this.systemMetrics.totalRequests > 0 
      ? (this.systemMetrics.totalErrors / this.systemMetrics.totalRequests) * 100 
      : 0;

    return {
      uptime: Math.floor(uptime / 1000), // seconds
      totalRequests: this.systemMetrics.totalRequests,
      totalErrors: this.systemMetrics.totalErrors,
      errorRate,
      totalEvents: this.systemMetrics.totalEvents,
      totalDecisions: this.systemMetrics.totalDecisions,
      activeTimers: this.activeTimers.size
    };
  }

  /**
   * Cleanup old metrics
   */
  async cleanup(): Promise<number> {
    return this.storage.cleanup(this.config.collection.retentionDays);
  }

  /**
   * Private helper methods
   */
  private async collectSystemMetrics(): Promise<void> {
    try {
      // Collect system resource metrics
      const cpuUsage = await this.getSystemCPUUsage();
      const memoryUsage = await this.getSystemMemoryUsage();

      await this.recordMetric(MetricType.CPU_USAGE, cpuUsage);
      await this.recordMetric(MetricType.MEMORY_USAGE, memoryUsage);

      // Collect throughput metrics
      const eventsPerMinute = this.calculateEventsPerMinute();
      const decisionsPerMinute = this.calculateDecisionsPerMinute();

      await this.recordMetric(MetricType.EVENTS_PER_MINUTE, eventsPerMinute);
      await this.recordMetric(MetricType.DECISIONS_PER_MINUTE, decisionsPerMinute);

      this.emit('system_metrics_collected', { cpuUsage, memoryUsage, eventsPerMinute, decisionsPerMinute });
    } catch (error) {
      this.emit('error', error);
    }
  }

  private async evaluateAlerts(): Promise<void> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Get recent metrics for all registered metric types
      const metricsData: TimeSeriesData[] = [];
      
      for (const metric of this.collector.getAllMetrics()) {
        try {
          const data = await this.storage.getTimeSeriesData(metric.type, oneHourAgo, now);
          metricsData.push(data);
        } catch (error) {
          // Continue with other metrics if one fails
          this.emit('error', error);
        }
      }

      // Evaluate alert rules
      const alerts = await this.alertManager.evaluateRules(metricsData);
      
      if (alerts.length > 0) {
        this.emit('alerts_triggered', alerts);
      }
    } catch (error) {
      this.emit('error', error);
    }
  }

  private async getSystemCPUUsage(): Promise<number> {
    // In a real implementation, this would use system APIs
    // For now, return a mock value
    return Math.random() * 100;
  }

  private async getSystemMemoryUsage(): Promise<number> {
    // In a real implementation, this would use system APIs
    const used = process.memoryUsage();
    const total = used.heapTotal + used.external;
    return (used.heapUsed / total) * 100;
  }

  private calculateEventsPerMinute(): number {
    // This would be calculated based on recent event counts
    // For now, return a mock calculation
    return this.systemMetrics.totalEvents / ((Date.now() - this.systemMetrics.startTime.getTime()) / 60000);
  }

  private calculateDecisionsPerMinute(): number {
    // This would be calculated based on recent decision counts
    return this.systemMetrics.totalDecisions / ((Date.now() - this.systemMetrics.startTime.getTime()) / 60000);
  }

  private determineComponentHealth(
    primaryValue?: number,
    secondaryValue?: number,
    thresholds: number[] = []
  ): 'healthy' | 'degraded' | 'unhealthy' | 'unknown' {
    if (primaryValue === undefined) {
      return 'unknown';
    }

    const [warningThreshold, criticalThreshold] = thresholds;

    if (criticalThreshold !== undefined && primaryValue > criticalThreshold) {
      return 'unhealthy';
    }

    if (warningThreshold !== undefined && primaryValue > warningThreshold) {
      return 'degraded';
    }

    if (secondaryValue !== undefined && thresholds.length > 1) {
      const secondaryThreshold = thresholds[1];
      if (secondaryValue > secondaryThreshold) {
        return 'degraded';
      }
    }

    return 'healthy';
  }

  private getComponentMessage(
    component: string,
    primaryValue?: number,
    secondaryValue?: number
  ): string {
    if (primaryValue === undefined) {
      return `${component} status unknown - no recent data`;
    }

    switch (component) {
      case 'api':
        return `Availability: ${primaryValue?.toFixed(1)}%, Error rate: ${secondaryValue?.toFixed(1)}%`;
      case 'processing':
        return `Average latency: ${primaryValue?.toFixed(0)}ms`;
      case 'ai_models':
        return `Average inference time: ${primaryValue?.toFixed(0)}ms`;
      case 'system':
        return `CPU: ${primaryValue?.toFixed(1)}%, Memory: ${secondaryValue?.toFixed(1)}%`;
      default:
        return `Current value: ${primaryValue}`;
    }
  }
}