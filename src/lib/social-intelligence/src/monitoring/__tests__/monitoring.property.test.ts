/**
 * Property-Based Tests for Performance Monitoring System
 * 
 * Tests Property 20: System Performance Monitoring
 * Validates: Requirements 13.1, 13.2, 13.3, 13.4
 */

import * as fc from 'fast-check';
import { PerformanceMonitor, MetricCollector, IMetricStorage, IAlertManager } from '../PerformanceMonitor';
import { AlertManager, AlertRuleEvaluator } from '../AlertManager';
import {
  MetricType,
  MetricUnit,
  MetricDefinition,
  MetricDataPoint,
  TimeSeriesData,
  AlertRule,
  AlertInstance,
  AlertSeverity,
  AlertStatus,
  MonitoringConfig
} from '../types';

// Mock storage for property testing
class PropertyTestMetricStorage implements IMetricStorage {
  private metrics: Array<{ metric: MetricDefinition; dataPoint: MetricDataPoint }> = [];

  async storeMetric(metric: MetricDefinition, dataPoint: MetricDataPoint): Promise<void> {
    this.metrics.push({ metric: { ...metric }, dataPoint: { ...dataPoint } });
  }

  async storeMetrics(metrics: Array<{ metric: MetricDefinition; dataPoint: MetricDataPoint }>): Promise<void> {
    this.metrics.push(...metrics.map(m => ({ 
      metric: { ...m.metric }, 
      dataPoint: { ...m.dataPoint } 
    })));
  }

  async getTimeSeriesData(metricType: MetricType, startTime: Date, endTime: Date): Promise<TimeSeriesData> {
    const relevantMetrics = this.metrics.filter(m => 
      m.metric.type === metricType &&
      m.dataPoint.timestamp >= startTime &&
      m.dataPoint.timestamp <= endTime
    );

    if (relevantMetrics.length === 0) {
      return {
        metric: {
          name: metricType,
          type: metricType,
          unit: MetricUnit.COUNT,
          description: 'Test metric',
          aggregation: 'avg'
        },
        dataPoints: []
      };
    }

    const dataPoints = relevantMetrics
      .map(m => m.dataPoint)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const values = dataPoints.map(dp => dp.value);
    const aggregatedValue = values.reduce((sum, val) => sum + val, 0) / values.length;

    return {
      metric: relevantMetrics[0].metric,
      dataPoints,
      aggregatedValue,
      trend: this.calculateTrend(values)
    };
  }

  async getLatestValue(metricType: MetricType): Promise<MetricDataPoint | null> {
    const relevantMetrics = this.metrics
      .filter(m => m.metric.type === metricType)
      .sort((a, b) => b.dataPoint.timestamp.getTime() - a.dataPoint.timestamp.getTime());

    return relevantMetrics.length > 0 ? relevantMetrics[0].dataPoint : null;
  }

  async cleanup(): Promise<number> {
    const count = this.metrics.length;
    this.metrics = [];
    return count;
  }

  getStoredMetrics() {
    return [...this.metrics];
  }

  clear() {
    this.metrics = [];
  }

  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';
    const first = values[0];
    const last = values[values.length - 1];
    const threshold = Math.abs(first) * 0.05;
    if (last > first + threshold) return 'increasing';
    if (last < first - threshold) return 'decreasing';
    return 'stable';
  }
}

// Mock alert manager for property testing
class PropertyTestAlertManager implements IAlertManager {
  private alerts: AlertInstance[] = [];
  private rules: AlertRule[] = [];

  async evaluateRules(metricsData: TimeSeriesData[]): Promise<AlertInstance[]> {
    const triggeredAlerts: AlertInstance[] = [];

    for (const rule of this.rules) {
      const metricData = metricsData.find(data => data.metric.type === rule.metricType);
      if (!metricData) continue;

      const evaluation = AlertRuleEvaluator.evaluate(rule, metricData);
      if (evaluation.shouldAlert) {
        const alert: AlertInstance = {
          id: `alert_${Date.now()}_${Math.random()}`,
          ruleId: rule.id,
          ruleName: rule.name,
          severity: evaluation.severity,
          status: AlertStatus.ACTIVE,
          message: `Alert triggered for ${rule.name}`,
          triggeredAt: new Date(),
          triggeredValue: evaluation.triggeredValue,
          threshold: evaluation.threshold,
          metricType: rule.metricType
        };
        this.alerts.push(alert);
        triggeredAlerts.push(alert);
      }
    }

    return triggeredAlerts;
  }

  async createAlert(rule: AlertRule, triggeredValue: number, threshold: number): Promise<AlertInstance> {
    const alert: AlertInstance = {
      id: `alert_${Date.now()}_${Math.random()}`,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      status: AlertStatus.ACTIVE,
      message: `Alert created for ${rule.name}`,
      triggeredAt: new Date(),
      triggeredValue,
      threshold,
      metricType: rule.metricType
    };
    this.alerts.push(alert);
    return alert;
  }

  async acknowledgeAlert(): Promise<void> {}
  async resolveAlert(): Promise<void> {}
  async getActiveAlerts(): Promise<AlertInstance[]> { 
    return this.alerts.filter(a => a.status === AlertStatus.ACTIVE); 
  }
  async getAlertHistory(): Promise<AlertInstance[]> { return [...this.alerts]; }

  addRule(rule: AlertRule) {
    this.rules.push(rule);
  }

  clear() {
    this.alerts = [];
    this.rules = [];
  }
}

// Fast-check arbitraries for generating test data
const metricTypeArb = fc.constantFrom(...Object.values(MetricType));
const metricUnitArb = fc.constantFrom(...Object.values(MetricUnit));
const alertSeverityArb = fc.constantFrom(...Object.values(AlertSeverity));

const metricDefinitionArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
  type: metricTypeArb,
  unit: metricUnitArb,
  description: fc.string({ minLength: 1, maxLength: 200 }),
  aggregation: fc.constantFrom('sum', 'avg', 'min', 'max', 'count', 'rate'),
  retentionDays: fc.integer({ min: 1, max: 365 })
});

const metricDataPointArb = fc.record({
  timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
  value: fc.float({ min: 0, max: 10000 }),
  tags: fc.option(fc.dictionary(fc.string(), fc.string())),
  metadata: fc.option(fc.dictionary(fc.string(), fc.anything()))
});

const alertRuleArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 1, maxLength: 200 }),
  metricType: metricTypeArb,
  thresholds: fc.record({
    warning: fc.option(fc.float({ min: 0, max: 1000 })),
    critical: fc.option(fc.float({ min: 0, max: 1000 })),
    emergency: fc.option(fc.float({ min: 0, max: 1000 }))
  }),
  evaluationWindow: fc.integer({ min: 1, max: 60 }),
  evaluationFrequency: fc.integer({ min: 1, max: 60 }),
  minimumDataPoints: fc.integer({ min: 1, max: 10 }),
  severity: alertSeverityArb,
  enabled: fc.boolean(),
  suppressionDuration: fc.integer({ min: 1, max: 120 }),
  notificationChannels: fc.array(fc.string(), { maxLength: 3 }),
  escalationRules: fc.option(fc.array(fc.record({
    afterMinutes: fc.integer({ min: 1, max: 60 }),
    channels: fc.array(fc.string(), { maxLength: 2 })
  }), { maxLength: 2 })),
  tags: fc.option(fc.dictionary(fc.string(), fc.string())),
  createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
  updatedAt: fc.date({ min: new Date('2024-01-01'), max: new Date() })
});

const monitoringConfigArb = fc.record({
  enabled: fc.boolean(),
  collection: fc.record({
    interval: fc.integer({ min: 1, max: 300 }),
    batchSize: fc.integer({ min: 1, max: 1000 }),
    retentionDays: fc.integer({ min: 1, max: 365 })
  }),
  storage: fc.record({
    type: fc.constantFrom('memory', 'database', 'timeseries'),
    compression: fc.boolean(),
    partitioning: fc.boolean()
  }),
  alerting: fc.record({
    enabled: fc.boolean(),
    evaluationInterval: fc.integer({ min: 1, max: 300 }),
    defaultChannels: fc.array(fc.string(), { maxLength: 3 }),
    escalationEnabled: fc.boolean()
  }),
  dashboards: fc.record({
    enabled: fc.boolean(),
    autoRefresh: fc.boolean(),
    defaultTimeRange: fc.constantFrom('1h', '6h', '24h', '7d', '30d')
  }),
  performance: fc.record({
    enableProfiling: fc.boolean(),
    profilingSampleRate: fc.float({ min: 0, max: 1 }),
    enableTracing: fc.boolean(),
    tracingSampleRate: fc.float({ min: 0, max: 1 })
  })
});

describe('Property 20: System Performance Monitoring', () => {
  let storage: PropertyTestMetricStorage;
  let alertManager: PropertyTestAlertManager;
  let monitor: PerformanceMonitor;
  let config: MonitoringConfig;

  beforeEach(() => {
    storage = new PropertyTestMetricStorage();
    alertManager = new PropertyTestAlertManager();
    config = {
      enabled: true,
      collection: {
        interval: 60,
        batchSize: 100,
        retentionDays: 90
      },
      storage: {
        type: 'database',
        compression: true,
        partitioning: true
      },
      alerting: {
        enabled: true,
        evaluationInterval: 60,
        defaultChannels: [],
        escalationEnabled: true
      },
      dashboards: {
        enabled: true,
        autoRefresh: true,
        defaultTimeRange: '24h'
      },
      performance: {
        enableProfiling: false,
        profilingSampleRate: 0.01,
        enableTracing: true,
        tracingSampleRate: 0.1
      }
    };
    monitor = new PerformanceMonitor(config, storage, alertManager);
  });

  afterEach(async () => {
    await monitor.stop();
  });

  /**
   * Property 20.1: API response times must be accurately recorded and retrievable
   */
  test('Property 20.1: API response time monitoring accuracy', async () => {
    await fc.assert(fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 20 }), // platform
      fc.string({ minLength: 1, maxLength: 50 }), // endpoint
      fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'), // method
      fc.float({ min: 0, max: 10000 }), // responseTime
      fc.integer({ min: 200, max: 599 }), // statusCode
      fc.boolean(), // success
      async (platform, endpoint, method, responseTime, statusCode, success) => {
        storage.clear();

        // Record API call
        await monitor.recordAPICall(platform, endpoint, method, responseTime, statusCode, success);

        // Verify metrics were stored
        const storedMetrics = storage.getStoredMetrics();
        expect(storedMetrics.length).toBeGreaterThan(0);

        // Find response time metric
        const responseTimeMetric = storedMetrics.find(m => 
          m.metric.type === MetricType.API_RESPONSE_TIME
        );
        expect(responseTimeMetric).toBeDefined();
        expect(responseTimeMetric!.dataPoint.value).toBe(responseTime);
        expect(responseTimeMetric!.dataPoint.tags?.platform).toBe(platform);
        expect(responseTimeMetric!.dataPoint.tags?.endpoint).toBe(endpoint);
        expect(responseTimeMetric!.dataPoint.tags?.method).toBe(method);

        // Verify retrievability
        const timeSeriesData = await monitor.getTimeSeriesData(
          MetricType.API_RESPONSE_TIME,
          new Date(Date.now() - 60000),
          new Date()
        );
        expect(timeSeriesData.dataPoints.length).toBe(1);
        expect(timeSeriesData.dataPoints[0].value).toBe(responseTime);

        // Verify latest value
        const latestValue = await monitor.getLatestValue(MetricType.API_RESPONSE_TIME);
        expect(latestValue).toBeDefined();
        expect(latestValue!.value).toBe(responseTime);
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 20.2: Processing latency must be tracked across all stages
   */
  test('Property 20.2: Processing latency tracking completeness', async () => {
    await fc.assert(fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 50 }), // eventId
      fc.constantFrom('tiktok', 'instagram', 'facebook', 'youtube', 'reddit'), // platform
      fc.float({ min: 0, max: 10000 }), // processingTime
      fc.string({ minLength: 1, maxLength: 30 }), // stage
      fc.boolean(), // success
      async (eventId, platform, processingTime, stage, success) => {
        storage.clear();

        // Record event processing
        await monitor.recordEventProcessing(eventId, platform, processingTime, stage, success);

        // Verify metric was stored
        const storedMetrics = storage.getStoredMetrics();
        expect(storedMetrics.length).toBe(1);

        const processingMetric = storedMetrics[0];
        expect(processingMetric.metric.type).toBe(MetricType.EVENT_PROCESSING_LATENCY);
        expect(processingMetric.dataPoint.value).toBe(processingTime);
        expect(processingMetric.dataPoint.tags?.platform).toBe(platform);
        expect(processingMetric.dataPoint.tags?.stage).toBe(stage);
        expect(processingMetric.dataPoint.tags?.success).toBe(success.toString());
        expect(processingMetric.dataPoint.metadata?.eventId).toBe(eventId);

        // Verify timestamp is reasonable
        const now = Date.now();
        const metricTime = processingMetric.dataPoint.timestamp.getTime();
        expect(metricTime).toBeLessThanOrEqual(now);
        expect(metricTime).toBeGreaterThan(now - 10000); // Within last 10 seconds
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 20.3: AI model performance metrics must be comprehensive
   */
  test('Property 20.3: AI model performance monitoring completeness', async () => {
    await fc.assert(fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 30 }), // modelName
      fc.constantFrom('sentiment', 'intent', 'topic'), // modelType
      fc.float({ min: 0, max: 5000 }), // latency
      fc.option(fc.float({ min: 0, max: 1 })), // accuracy
      fc.option(fc.float({ min: 0, max: 1 })), // confidence
      async (modelName, modelType, latency, accuracy, confidence) => {
        storage.clear();

        // Record AI model performance
        await monitor.recordAIModelPerformance(modelName, modelType, latency, accuracy, confidence);

        const storedMetrics = storage.getStoredMetrics();
        expect(storedMetrics.length).toBeGreaterThan(0);

        // Must have latency metric
        const latencyMetric = storedMetrics.find(m => 
          m.metric.type === MetricType.AI_MODEL_LATENCY
        );
        expect(latencyMetric).toBeDefined();
        expect(latencyMetric!.dataPoint.value).toBe(latency);
        expect(latencyMetric!.dataPoint.tags?.model).toBe(modelName);
        expect(latencyMetric!.dataPoint.tags?.type).toBe(modelType);

        // Should have accuracy metric if provided
        if (accuracy !== undefined && accuracy !== null) {
          const accuracyMetric = storedMetrics.find(m => 
            m.metric.type === MetricType.AI_MODEL_ACCURACY
          );
          expect(accuracyMetric).toBeDefined();
          expect(accuracyMetric!.dataPoint.value).toBe(accuracy * 100); // Converted to percentage
        }

        // Should have confidence metric if provided
        if (confidence !== undefined && confidence !== null) {
          const confidenceMetric = storedMetrics.find(m => 
            m.metric.type === MetricType.AI_MODEL_CONFIDENCE
          );
          expect(confidenceMetric).toBeDefined();
          expect(confidenceMetric!.dataPoint.value).toBe(confidence * 100); // Converted to percentage
        }
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 20.4: Performance timers must provide accurate measurements
   */
  test('Property 20.4: Performance timer accuracy', async () => {
    await fc.assert(fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 30 }), // timerName
      fc.integer({ min: 1, max: 100 }), // delayMs
      async (timerName, delayMs) => {
        storage.clear();

        // Start timer
        const timer = monitor.startTimer(timerName);
        expect(timer).toBeDefined();

        // Simulate work
        await new Promise(resolve => setTimeout(resolve, delayMs));

        // Stop timer and record metric
        const duration = await monitor.stopTimer(timerName, MetricType.API_RESPONSE_TIME);

        // Duration should be approximately the delay (with some tolerance)
        expect(duration).toBeGreaterThanOrEqual(delayMs * 0.8); // 20% tolerance for timing variations
        expect(duration).toBeLessThan(delayMs * 2); // Should not be more than double

        // Verify metric was stored
        const storedMetrics = storage.getStoredMetrics();
        expect(storedMetrics.length).toBe(1);
        expect(storedMetrics[0].dataPoint.value).toBe(duration);
      }
    ), { numRuns: 50 }); // Reduced runs due to timing sensitivity
  });

  /**
   * Property 20.5: System health status must reflect actual metrics
   */
  test('Property 20.5: System health status accuracy', async () => {
    await fc.assert(fc.asyncProperty(
      fc.float({ min: 0, max: 100 }), // apiAvailability
      fc.float({ min: 0, max: 100 }), // apiErrorRate
      fc.float({ min: 0, max: 10000 }), // processingLatency
      fc.float({ min: 0, max: 100 }), // cpuUsage
      fc.float({ min: 0, max: 100 }), // memoryUsage
      async (apiAvailability, apiErrorRate, processingLatency, cpuUsage, memoryUsage) => {
        storage.clear();

        // Record various metrics
        await monitor.recordMetric(MetricType.API_AVAILABILITY, apiAvailability);
        await monitor.recordMetric(MetricType.API_ERROR_RATE, apiErrorRate);
        await monitor.recordMetric(MetricType.EVENT_PROCESSING_LATENCY, processingLatency);
        await monitor.recordMetric(MetricType.CPU_USAGE, cpuUsage);
        await monitor.recordMetric(MetricType.MEMORY_USAGE, memoryUsage);

        // Get system health
        const health = await monitor.getSystemHealth();

        expect(health.overall).toBeDefined();
        expect(['healthy', 'degraded', 'unhealthy', 'unknown']).toContain(health.overall);

        // Check component health
        expect(health.components.api).toBeDefined();
        expect(health.components.processing).toBeDefined();
        expect(health.components.system).toBeDefined();

        // Health status should reflect metric values
        if (apiAvailability >= 95 && apiErrorRate <= 5) {
          expect(['healthy', 'degraded']).toContain(health.components.api.status);
        }

        if (cpuUsage <= 80 && memoryUsage <= 80) {
          expect(['healthy', 'degraded']).toContain(health.components.system.status);
        }

        // All components should have recent timestamps
        for (const component of Object.values(health.components)) {
          expect(component.lastCheck).toBeInstanceOf(Date);
          expect(component.lastCheck.getTime()).toBeLessThanOrEqual(Date.now());
        }
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 20.6: Time series data must maintain chronological order and completeness
   */
  test('Property 20.6: Time series data integrity', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(fc.record({
        timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
        value: fc.float({ min: 0, max: 1000 })
      }), { minLength: 2, maxLength: 20 }),
      async (dataPoints) => {
        storage.clear();

        // Sort data points by timestamp to ensure proper order
        const sortedDataPoints = dataPoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        // Record metrics with specific timestamps
        for (const point of sortedDataPoints) {
          await monitor.recordMetric(MetricType.CPU_USAGE, point.value, undefined, undefined);
          // Manually set timestamp in storage for testing
          const storedMetrics = storage.getStoredMetrics();
          const lastMetric = storedMetrics[storedMetrics.length - 1];
          lastMetric.dataPoint.timestamp = point.timestamp;
        }

        // Retrieve time series data
        const startTime = new Date(Math.min(...sortedDataPoints.map(p => p.timestamp.getTime())));
        const endTime = new Date(Math.max(...sortedDataPoints.map(p => p.timestamp.getTime())));

        const timeSeriesData = await monitor.getTimeSeriesData(
          MetricType.CPU_USAGE,
          startTime,
          endTime
        );

        // Must have all data points
        expect(timeSeriesData.dataPoints.length).toBe(sortedDataPoints.length);

        // Data points must be in chronological order
        for (let i = 1; i < timeSeriesData.dataPoints.length; i++) {
          const prevTime = timeSeriesData.dataPoints[i - 1].timestamp.getTime();
          const currTime = timeSeriesData.dataPoints[i].timestamp.getTime();
          expect(currTime).toBeGreaterThanOrEqual(prevTime);
        }

        // Values must match
        for (let i = 0; i < timeSeriesData.dataPoints.length; i++) {
          expect(timeSeriesData.dataPoints[i].value).toBe(sortedDataPoints[i].value);
        }

        // Aggregated value should be reasonable
        if (timeSeriesData.aggregatedValue !== undefined) {
          const expectedAvg = sortedDataPoints.reduce((sum, p) => sum + p.value, 0) / sortedDataPoints.length;
          expect(Math.abs(timeSeriesData.aggregatedValue - expectedAvg)).toBeLessThan(0.01);
        }
      }
    ), { numRuns: 50 });
  });

  /**
   * Property 20.7: Alert thresholds must be evaluated correctly
   */
  test('Property 20.7: Alert threshold evaluation accuracy', async () => {
    await fc.assert(fc.asyncProperty(
      alertRuleArb,
      fc.array(fc.float({ min: 0, max: 1000 }), { minLength: 3, maxLength: 10 }),
      async (rule, metricValues) => {
        storage.clear();
        alertManager.clear();

        // Ensure rule is enabled and has at least one threshold
        const testRule = {
          ...rule,
          enabled: true,
          thresholds: {
            warning: rule.thresholds.warning || 500,
            critical: rule.thresholds.critical || 800,
            emergency: rule.thresholds.emergency || 950
          }
        };

        alertManager.addRule(testRule);

        // Record metric values
        const now = new Date();
        for (let i = 0; i < metricValues.length; i++) {
          const timestamp = new Date(now.getTime() - (metricValues.length - i) * 60000);
          await monitor.recordMetric(testRule.metricType, metricValues[i]);
          
          // Manually set timestamp for testing
          const storedMetrics = storage.getStoredMetrics();
          const lastMetric = storedMetrics[storedMetrics.length - 1];
          lastMetric.dataPoint.timestamp = timestamp;
        }

        // Get time series data for evaluation
        const timeSeriesData = await monitor.getTimeSeriesData(
          testRule.metricType,
          new Date(now.getTime() - 60 * 60 * 1000),
          now
        );

        // Evaluate rule
        const evaluation = AlertRuleEvaluator.evaluate(testRule, timeSeriesData);

        // Calculate expected aggregated value
        const windowStart = new Date(now.getTime() - testRule.evaluationWindow * 60 * 1000);
        const relevantValues = metricValues.slice(-testRule.minimumDataPoints);
        const expectedValue = relevantValues.reduce((sum, val) => sum + val, 0) / relevantValues.length;

        // Verify evaluation logic
        if (relevantValues.length >= testRule.minimumDataPoints) {
          expect(evaluation.triggeredValue).toBeCloseTo(expectedValue, 2);

          // Check threshold logic
          const thresholds = testRule.thresholds;
          if (thresholds.emergency && expectedValue > thresholds.emergency) {
            expect(evaluation.shouldAlert).toBe(true);
            expect(evaluation.severity).toBe(AlertSeverity.EMERGENCY);
            expect(evaluation.threshold).toBe(thresholds.emergency);
          } else if (thresholds.critical && expectedValue > thresholds.critical) {
            expect(evaluation.shouldAlert).toBe(true);
            expect(evaluation.severity).toBe(AlertSeverity.CRITICAL);
            expect(evaluation.threshold).toBe(thresholds.critical);
          } else if (thresholds.warning && expectedValue > thresholds.warning) {
            expect(evaluation.shouldAlert).toBe(true);
            expect(evaluation.severity).toBe(AlertSeverity.WARNING);
            expect(evaluation.threshold).toBe(thresholds.warning);
          } else {
            expect(evaluation.shouldAlert).toBe(false);
          }
        } else {
          expect(evaluation.shouldAlert).toBe(false);
        }
      }
    ), { numRuns: 50 });
  });

  /**
   * Property 20.8: Performance metrics must be consistent across collection cycles
   */
  test('Property 20.8: Metric collection consistency', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(fc.record({
        platform: fc.constantFrom('tiktok', 'instagram', 'facebook'),
        responseTime: fc.float({ min: 100, max: 5000 }),
        success: fc.boolean()
      }), { minLength: 5, maxLength: 15 }),
      async (apiCalls) => {
        storage.clear();

        // Record multiple API calls
        for (const call of apiCalls) {
          await monitor.recordAPICall(
            call.platform,
            '/test/endpoint',
            'GET',
            call.responseTime,
            call.success ? 200 : 500,
            call.success
          );
        }

        // Get performance summary
        const summary = monitor.getPerformanceSummary();

        // Verify consistency
        expect(summary.totalRequests).toBe(apiCalls.length);
        
        const expectedErrors = apiCalls.filter(call => !call.success).length;
        expect(summary.totalErrors).toBe(expectedErrors);

        const expectedErrorRate = apiCalls.length > 0 
          ? (expectedErrors / apiCalls.length) * 100 
          : 0;
        expect(Math.abs(summary.errorRate - expectedErrorRate)).toBeLessThan(0.01);

        // Verify stored metrics count
        const storedMetrics = storage.getStoredMetrics();
        // Each API call generates 3 metrics: response_time, availability, error_rate
        expect(storedMetrics.length).toBe(apiCalls.length * 3);

        // Verify metric values are within expected ranges
        const responseTimeMetrics = storedMetrics.filter(m => 
          m.metric.type === MetricType.API_RESPONSE_TIME
        );
        expect(responseTimeMetrics.length).toBe(apiCalls.length);

        for (let i = 0; i < responseTimeMetrics.length; i++) {
          expect(responseTimeMetrics[i].dataPoint.value).toBe(apiCalls[i].responseTime);
        }
      }
    ), { numRuns: 50 });
  });
});

/**
 * Integration property tests for the complete monitoring system
 */
describe('Property 20: Monitoring System Integration', () => {
  let storage: PropertyTestMetricStorage;
  let alertManager: PropertyTestAlertManager;
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    storage = new PropertyTestMetricStorage();
    alertManager = new PropertyTestAlertManager();
    const config: MonitoringConfig = {
      enabled: true,
      collection: { interval: 1, batchSize: 100, retentionDays: 90 },
      storage: { type: 'database', compression: true, partitioning: true },
      alerting: { enabled: true, evaluationInterval: 1, defaultChannels: [], escalationEnabled: true },
      dashboards: { enabled: true, autoRefresh: true, defaultTimeRange: '24h' },
      performance: { enableProfiling: false, profilingSampleRate: 0.01, enableTracing: true, tracingSampleRate: 0.1 }
    };
    monitor = new PerformanceMonitor(config, storage, alertManager);
  });

  afterEach(async () => {
    await monitor.stop();
  });

  /**
   * Property 20.9: End-to-end monitoring workflow completeness
   */
  test('Property 20.9: Complete monitoring workflow', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        apiCalls: fc.array(fc.record({
          platform: fc.constantFrom('tiktok', 'instagram'),
          responseTime: fc.float({ min: 100, max: 2000 }),
          success: fc.boolean()
        }), { minLength: 3, maxLength: 8 }),
        eventProcessing: fc.array(fc.record({
          eventId: fc.string({ minLength: 1, maxLength: 20 }),
          platform: fc.constantFrom('tiktok', 'instagram'),
          processingTime: fc.float({ min: 50, max: 1000 }),
          success: fc.boolean()
        }), { minLength: 2, maxLength: 5 }),
        aiModelCalls: fc.array(fc.record({
          modelName: fc.constantFrom('bert-sentiment', 'roberta-intent'),
          modelType: fc.constantFrom('sentiment', 'intent'),
          latency: fc.float({ min: 200, max: 1500 }),
          accuracy: fc.float({ min: 0.7, max: 0.99 })
        }), { minLength: 1, maxLength: 4 })
      }),
      async (workload) => {
        storage.clear();
        alertManager.clear();

        // Simulate complete monitoring workflow
        
        // 1. Record API calls
        for (const call of workload.apiCalls) {
          await monitor.recordAPICall(
            call.platform,
            '/api/test',
            'POST',
            call.responseTime,
            call.success ? 200 : 500,
            call.success
          );
        }

        // 2. Record event processing
        for (const processing of workload.eventProcessing) {
          await monitor.recordEventProcessing(
            processing.eventId,
            processing.platform,
            processing.processingTime,
            'analysis',
            processing.success
          );
        }

        // 3. Record AI model performance
        for (const aiCall of workload.aiModelCalls) {
          await monitor.recordAIModelPerformance(
            aiCall.modelName,
            aiCall.modelType,
            aiCall.latency,
            aiCall.accuracy
          );
        }

        // Verify comprehensive metric collection
        const storedMetrics = storage.getStoredMetrics();
        
        // Should have metrics for all recorded activities
        const expectedMetricCount = 
          workload.apiCalls.length * 3 + // API calls generate 3 metrics each
          workload.eventProcessing.length + // Event processing generates 1 metric each
          workload.aiModelCalls.length * 2; // AI calls generate 2 metrics each (latency + accuracy)

        expect(storedMetrics.length).toBe(expectedMetricCount);

        // Verify metric types are present
        const metricTypes = new Set(storedMetrics.map(m => m.metric.type));
        expect(metricTypes.has(MetricType.API_RESPONSE_TIME)).toBe(true);
        expect(metricTypes.has(MetricType.API_AVAILABILITY)).toBe(true);
        expect(metricTypes.has(MetricType.API_ERROR_RATE)).toBe(true);
        expect(metricTypes.has(MetricType.EVENT_PROCESSING_LATENCY)).toBe(true);
        expect(metricTypes.has(MetricType.AI_MODEL_LATENCY)).toBe(true);
        expect(metricTypes.has(MetricType.AI_MODEL_ACCURACY)).toBe(true);

        // Verify system health reflects the workload
        const health = await monitor.getSystemHealth();
        expect(health.overall).toBeDefined();
        expect(health.components).toBeDefined();
        expect(Object.keys(health.components).length).toBeGreaterThan(0);

        // Verify performance summary
        const summary = monitor.getPerformanceSummary();
        expect(summary.totalRequests).toBe(workload.apiCalls.length);
        expect(summary.totalEvents).toBe(workload.eventProcessing.length);

        // All timestamps should be recent and reasonable
        for (const metric of storedMetrics) {
          expect(metric.dataPoint.timestamp).toBeInstanceOf(Date);
          expect(metric.dataPoint.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
          expect(metric.dataPoint.timestamp.getTime()).toBeGreaterThan(Date.now() - 60000);
        }
      }
    ), { numRuns: 30 });
  });
});