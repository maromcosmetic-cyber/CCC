/**
 * Unit Tests for Performance Monitor
 */

import { PerformanceMonitor, PerformanceTimer, MetricCollector, IMetricStorage, IAlertManager } from '../PerformanceMonitor';
import {
  MetricType,
  MetricUnit,
  MetricDefinition,
  MetricDataPoint,
  TimeSeriesData,
  AlertInstance,
  MonitoringConfig,
  AlertSeverity
} from '../types';

// Mock storage implementation
class MockMetricStorage implements IMetricStorage {
  private metrics: Array<{ metric: MetricDefinition; dataPoint: MetricDataPoint }> = [];

  async storeMetric(metric: MetricDefinition, dataPoint: MetricDataPoint): Promise<void> {
    this.metrics.push({ metric, dataPoint });
  }

  async storeMetrics(metrics: Array<{ metric: MetricDefinition; dataPoint: MetricDataPoint }>): Promise<void> {
    this.metrics.push(...metrics);
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

    return {
      metric: relevantMetrics[0].metric,
      dataPoints: relevantMetrics.map(m => m.dataPoint),
      aggregatedValue: relevantMetrics.reduce((sum, m) => sum + m.dataPoint.value, 0) / relevantMetrics.length
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
}

// Mock alert manager
class MockAlertManager implements IAlertManager {
  private alerts: AlertInstance[] = [];

  async evaluateRules(): Promise<AlertInstance[]> {
    return [];
  }

  async createAlert(): Promise<AlertInstance> {
    const alert: AlertInstance = {
      id: 'test-alert',
      ruleId: 'test-rule',
      ruleName: 'Test Rule',
      severity: AlertSeverity.WARNING,
      status: 'active' as any,
      message: 'Test alert',
      triggeredAt: new Date(),
      triggeredValue: 100,
      threshold: 80,
      metricType: MetricType.API_RESPONSE_TIME
    };
    this.alerts.push(alert);
    return alert;
  }

  async acknowledgeAlert(): Promise<void> {}
  async resolveAlert(): Promise<void> {}
  async getActiveAlerts(): Promise<AlertInstance[]> { return this.alerts; }
  async getAlertHistory(): Promise<AlertInstance[]> { return this.alerts; }
}

describe('PerformanceTimer', () => {
  test('should measure execution time', async () => {
    const timer = new PerformanceTimer();
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const duration = timer.stop();
    expect(duration).toBeGreaterThan(0);
    expect(duration).toBeLessThan(100); // Should be around 10ms
  });

  test('should get current duration without stopping', () => {
    const timer = new PerformanceTimer();
    const duration1 = timer.getDuration();
    const duration2 = timer.getDuration();
    
    expect(duration1).toBeGreaterThanOrEqual(0);
    expect(duration2).toBeGreaterThanOrEqual(duration1);
  });
});

describe('MetricCollector', () => {
  let collector: MetricCollector;

  beforeEach(() => {
    collector = new MetricCollector();
  });

  test('should register default metrics', () => {
    const metrics = collector.getAllMetrics();
    expect(metrics.length).toBeGreaterThan(0);
    
    const apiResponseTime = collector.getMetric(MetricType.API_RESPONSE_TIME);
    expect(apiResponseTime).toBeDefined();
    expect(apiResponseTime?.type).toBe(MetricType.API_RESPONSE_TIME);
    expect(apiResponseTime?.unit).toBe(MetricUnit.MILLISECONDS);
  });

  test('should register custom metric', () => {
    const customMetric = {
      name: 'custom_metric',
      type: MetricType.EVENTS_PER_MINUTE,
      unit: MetricUnit.COUNT,
      description: 'Custom test metric',
      aggregation: 'sum' as const
    };

    collector.registerMetric(customMetric);
    
    const retrieved = collector.getMetric(MetricType.EVENTS_PER_MINUTE);
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('custom_metric');
    expect(retrieved?.aggregation).toBe('sum');
  });

  test('should create data point', () => {
    const dataPoint = collector.createDataPoint(
      100,
      { platform: 'tiktok' },
      { requestId: 'req123' }
    );

    expect(dataPoint.value).toBe(100);
    expect(dataPoint.tags?.platform).toBe('tiktok');
    expect(dataPoint.metadata?.requestId).toBe('req123');
    expect(dataPoint.timestamp).toBeInstanceOf(Date);
  });
});

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;
  let mockStorage: MockMetricStorage;
  let mockAlertManager: MockAlertManager;
  let config: MonitoringConfig;

  beforeEach(() => {
    mockStorage = new MockMetricStorage();
    mockAlertManager = new MockAlertManager();
    config = {
      enabled: true,
      collection: {
        interval: 1, // 1 second for testing
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
        evaluationInterval: 1, // 1 second for testing
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

    monitor = new PerformanceMonitor(config, mockStorage, mockAlertManager);
  });

  afterEach(async () => {
    await monitor.stop();
  });

  test('should start and stop monitoring', async () => {
    let startedEmitted = false;
    let stoppedEmitted = false;

    monitor.on('started', () => { startedEmitted = true; });
    monitor.on('stopped', () => { stoppedEmitted = true; });

    await monitor.start();
    expect(startedEmitted).toBe(true);

    await monitor.stop();
    expect(stoppedEmitted).toBe(true);
  });

  test('should record API call metrics', async () => {
    await monitor.recordAPICall(
      'tiktok',
      '/v2/research/video/query/',
      'POST',
      1200,
      200,
      true
    );

    const storedMetrics = mockStorage.getStoredMetrics();
    expect(storedMetrics.length).toBe(3); // response_time, availability, error_rate

    const responseTimeMetric = storedMetrics.find(m => m.metric.type === MetricType.API_RESPONSE_TIME);
    expect(responseTimeMetric).toBeDefined();
    expect(responseTimeMetric?.dataPoint.value).toBe(1200);
    expect(responseTimeMetric?.dataPoint.tags?.platform).toBe('tiktok');
  });

  test('should record event processing metrics', async () => {
    await monitor.recordEventProcessing(
      'event123',
      'tiktok',
      500,
      'sentiment_analysis',
      true
    );

    const storedMetrics = mockStorage.getStoredMetrics();
    expect(storedMetrics.length).toBe(1);

    const processingMetric = storedMetrics[0];
    expect(processingMetric.metric.type).toBe(MetricType.EVENT_PROCESSING_LATENCY);
    expect(processingMetric.dataPoint.value).toBe(500);
    expect(processingMetric.dataPoint.tags?.platform).toBe('tiktok');
    expect(processingMetric.dataPoint.metadata?.eventId).toBe('event123');
  });

  test('should record AI model performance', async () => {
    await monitor.recordAIModelPerformance(
      'bert-sentiment',
      'sentiment',
      800,
      0.92,
      0.85
    );

    const storedMetrics = mockStorage.getStoredMetrics();
    expect(storedMetrics.length).toBe(3); // latency, accuracy, confidence

    const latencyMetric = storedMetrics.find(m => m.metric.type === MetricType.AI_MODEL_LATENCY);
    expect(latencyMetric?.dataPoint.value).toBe(800);

    const accuracyMetric = storedMetrics.find(m => m.metric.type === MetricType.AI_MODEL_ACCURACY);
    expect(accuracyMetric?.dataPoint.value).toBe(92); // Converted to percentage
  });

  test('should record decision processing metrics', async () => {
    await monitor.recordDecisionProcessing(
      'decision123',
      2000,
      500,
      300,
      1200
    );

    const storedMetrics = mockStorage.getStoredMetrics();
    expect(storedMetrics.length).toBe(4); // All decision timing metrics

    const totalTimeMetric = storedMetrics.find(m => m.metric.type === MetricType.DECISION_PROCESSING_TIME);
    expect(totalTimeMetric?.dataPoint.value).toBe(2000);
  });

  test('should manage performance timers', async () => {
    const timer = monitor.startTimer('test_operation');
    expect(timer).toBeInstanceOf(PerformanceTimer);

    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 10));

    const duration = await monitor.stopTimer('test_operation', MetricType.API_RESPONSE_TIME);
    expect(duration).toBeGreaterThan(0);

    const storedMetrics = mockStorage.getStoredMetrics();
    expect(storedMetrics.length).toBe(1);
    expect(storedMetrics[0].dataPoint.value).toBe(duration);
  });

  test('should throw error for non-existent timer', async () => {
    await expect(monitor.stopTimer('non_existent', MetricType.API_RESPONSE_TIME))
      .rejects.toThrow("Timer 'non_existent' not found");
  });

  test('should record custom metrics', async () => {
    await monitor.recordMetric(
      MetricType.CPU_USAGE,
      75.5,
      { host: 'server1' },
      { process: 'node' }
    );

    const storedMetrics = mockStorage.getStoredMetrics();
    expect(storedMetrics.length).toBe(1);
    expect(storedMetrics[0].dataPoint.value).toBe(75.5);
    expect(storedMetrics[0].dataPoint.tags?.host).toBe('server1');
  });

  test('should get time series data', async () => {
    // Store some test data
    await monitor.recordMetric(MetricType.API_RESPONSE_TIME, 100);
    await monitor.recordMetric(MetricType.API_RESPONSE_TIME, 200);
    await monitor.recordMetric(MetricType.API_RESPONSE_TIME, 150);

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const timeSeriesData = await monitor.getTimeSeriesData(
      MetricType.API_RESPONSE_TIME,
      oneHourAgo,
      now
    );

    expect(timeSeriesData.dataPoints.length).toBe(3);
    expect(timeSeriesData.aggregatedValue).toBe(150); // Average of 100, 200, 150
  });

  test('should get latest value', async () => {
    await monitor.recordMetric(MetricType.CPU_USAGE, 60);
    await monitor.recordMetric(MetricType.CPU_USAGE, 75);

    const latestValue = await monitor.getLatestValue(MetricType.CPU_USAGE);
    expect(latestValue?.value).toBe(75);
  });

  test('should get system health status', async () => {
    // Record some metrics to simulate system state
    await monitor.recordMetric(MetricType.API_AVAILABILITY, 98);
    await monitor.recordMetric(MetricType.API_ERROR_RATE, 2);
    await monitor.recordMetric(MetricType.EVENT_PROCESSING_LATENCY, 300);
    await monitor.recordMetric(MetricType.CPU_USAGE, 45);
    await monitor.recordMetric(MetricType.MEMORY_USAGE, 60);

    const health = await monitor.getSystemHealth();

    expect(health.overall).toBeDefined();
    expect(health.components).toHaveProperty('api');
    expect(health.components).toHaveProperty('processing');
    expect(health.components).toHaveProperty('ai_models');
    expect(health.components).toHaveProperty('system');
    expect(health.lastUpdated).toBeInstanceOf(Date);
  });

  test('should get performance summary', () => {
    const summary = monitor.getPerformanceSummary();

    expect(summary).toHaveProperty('uptime');
    expect(summary).toHaveProperty('totalRequests');
    expect(summary).toHaveProperty('totalErrors');
    expect(summary).toHaveProperty('errorRate');
    expect(summary).toHaveProperty('totalEvents');
    expect(summary).toHaveProperty('totalDecisions');
    expect(summary).toHaveProperty('activeTimers');

    expect(typeof summary.uptime).toBe('number');
    expect(summary.uptime).toBeGreaterThanOrEqual(0);
  });

  test('should cleanup old metrics', async () => {
    // Store some test metrics
    await monitor.recordMetric(MetricType.API_RESPONSE_TIME, 100);
    await monitor.recordMetric(MetricType.CPU_USAGE, 50);

    const deletedCount = await monitor.cleanup();
    expect(typeof deletedCount).toBe('number');
  });

  test('should emit events for recorded metrics', async () => {
    let apiCallRecorded = false;
    let eventProcessingRecorded = false;
    let metricRecorded = false;

    monitor.on('api_call_recorded', () => { apiCallRecorded = true; });
    monitor.on('event_processing_recorded', () => { eventProcessingRecorded = true; });
    monitor.on('metric_recorded', () => { metricRecorded = true; });

    await monitor.recordAPICall('tiktok', '/test', 'GET', 100, 200, true);
    await monitor.recordEventProcessing('event1', 'tiktok', 200, 'test', true);
    await monitor.recordMetric(MetricType.CPU_USAGE, 50);

    expect(apiCallRecorded).toBe(true);
    expect(eventProcessingRecorded).toBe(true);
    expect(metricRecorded).toBe(true);
  });

  test('should handle errors gracefully', async () => {
    let errorEmitted = false;
    monitor.on('error', () => { errorEmitted = true; });

    // This should not throw but might emit an error event
    await monitor.recordMetric('invalid_metric_type' as any, 100);

    // The test passes if no exception is thrown
    expect(true).toBe(true);
  });

  test('should start and stop collection timers', async () => {
    await monitor.start();
    
    // Wait a bit to ensure timers are running
    await new Promise(resolve => setTimeout(resolve, 50));
    
    await monitor.stop();
    
    // Test passes if no errors are thrown
    expect(true).toBe(true);
  });
});