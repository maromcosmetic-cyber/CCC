/**
 * Unit Tests for Audit Logger
 */

import { AuditLogger, AuditEventBuilder, IAuditStorage } from '../AuditLogger';
import {
  AuditLogEntry,
  AuditEventType,
  AuditSeverity,
  AuditConfig,
  AuditQueryFilters,
  AuditStatistics
} from '../types';

// Mock storage implementation for testing
class MockAuditStorage implements IAuditStorage {
  private entries: AuditLogEntry[] = [];
  
  async store(entry: AuditLogEntry): Promise<void> {
    this.entries.push(entry);
  }

  async storeBatch(entries: AuditLogEntry[]): Promise<void> {
    this.entries.push(...entries);
  }

  async query(filters: AuditQueryFilters): Promise<AuditLogEntry[]> {
    let filtered = [...this.entries];

    if (filters.eventTypes) {
      filtered = filtered.filter(e => filters.eventTypes!.includes(e.eventType));
    }

    if (filters.severities) {
      filtered = filtered.filter(e => filters.severities!.includes(e.severity));
    }

    if (filters.userId) {
      filtered = filtered.filter(e => e.userContext?.userId === filters.userId);
    }

    if (filters.startTime) {
      filtered = filtered.filter(e => e.timestamp >= filters.startTime!);
    }

    if (filters.endTime) {
      filtered = filtered.filter(e => e.timestamp <= filters.endTime!);
    }

    return filtered
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(filters.offset, filters.offset + filters.limit);
  }

  async getStatistics(): Promise<AuditStatistics> {
    const eventsByType = this.entries.reduce((acc, entry) => {
      acc[entry.eventType] = (acc[entry.eventType] || 0) + 1;
      return acc;
    }, {} as Record<AuditEventType, number>);

    const eventsBySeverity = this.entries.reduce((acc, entry) => {
      acc[entry.severity] = (acc[entry.severity] || 0) + 1;
      return acc;
    }, {} as Record<AuditSeverity, number>);

    return {
      totalEvents: this.entries.length,
      eventsByType,
      eventsBySeverity,
      eventsOverTime: [],
      topUsers: [],
      topServices: []
    };
  }

  async cleanup(): Promise<number> {
    const beforeCount = this.entries.length;
    this.entries = [];
    return beforeCount;
  }

  getEntries(): AuditLogEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
  }
}

describe('AuditEventBuilder', () => {
  test('should build basic audit event', () => {
    const builder = new AuditEventBuilder(AuditEventType.USER_ACTION, 'Test message');
    const entry = builder.build();

    expect(entry.eventType).toBe(AuditEventType.USER_ACTION);
    expect(entry.message).toBe('Test message');
    expect(entry.severity).toBe(AuditSeverity.INFO);
    expect(entry.id).toBeDefined();
    expect(entry.timestamp).toBeInstanceOf(Date);
    expect(entry.systemContext).toBeDefined();
  });

  test('should build event with all optional fields', () => {
    const builder = new AuditEventBuilder(AuditEventType.DECISION_MADE, 'Decision made');
    const entry = builder
      .severity(AuditSeverity.WARN)
      .description('Detailed description')
      .userContext({
        userId: 'user123',
        username: 'testuser',
        email: 'test@example.com'
      })
      .decisionContext({
        eventId: 'event123',
        decisionId: 'decision123',
        confidence: 85,
        priorityScore: 75,
        routingDecision: 'suggestion'
      })
      .metadata({ key: 'value' })
      .tags(['test', 'decision'])
      .performance({ duration: 1000 })
      .error('TEST_ERROR', 'Test error message')
      .compliance(['gdpr'])
      .build();

    expect(entry.severity).toBe(AuditSeverity.WARN);
    expect(entry.description).toBe('Detailed description');
    expect(entry.userContext?.userId).toBe('user123');
    expect(entry.decisionContext?.confidence).toBe(85);
    expect(entry.metadata?.key).toBe('value');
    expect(entry.tags).toContain('test');
    expect(entry.performanceMetrics?.duration).toBe(1000);
    expect(entry.errorDetails?.errorCode).toBe('TEST_ERROR');
    expect(entry.complianceFlags).toContain('gdpr');
  });
});

describe('AuditLogger', () => {
  let mockStorage: MockAuditStorage;
  let auditLogger: AuditLogger;
  let config: AuditConfig;

  beforeEach(() => {
    mockStorage = new MockAuditStorage();
    config = {
      enabled: true,
      logLevel: AuditSeverity.INFO,
      storage: {
        type: 'database',
        connectionString: 'test',
        retentionDays: 365,
        batchSize: 10,
        flushInterval: 1000
      },
      compliance: {
        gdprEnabled: true,
        ccpaEnabled: true,
        dataAnonymization: true,
        encryptionEnabled: false
      },
      performance: {
        enableMetrics: true,
        metricsRetentionDays: 90,
        alertThresholds: {
          errorRate: 5,
          responseTime: 5000,
          memoryUsage: 80
        }
      }
    };
    auditLogger = new AuditLogger(config, mockStorage);
  });

  afterEach(async () => {
    await auditLogger.shutdown();
  });

  test('should log audit event', async () => {
    const entry = auditLogger.event(AuditEventType.USER_LOGIN, 'User logged in')
      .userContext({ userId: 'user123' })
      .build();

    await auditLogger.log(entry);
    await auditLogger.flush();

    const entries = mockStorage.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].eventType).toBe(AuditEventType.USER_LOGIN);
    expect(entries[0].userContext?.userId).toBe('user123');
  });

  test('should respect log level filtering', async () => {
    // Set log level to WARN
    config.logLevel = AuditSeverity.WARN;
    const logger = new AuditLogger(config, mockStorage);

    // Log INFO event (should be filtered out)
    const infoEntry = logger.event(AuditEventType.USER_ACTION, 'Info message')
      .severity(AuditSeverity.INFO)
      .build();
    await logger.log(infoEntry);

    // Log WARN event (should be logged)
    const warnEntry = logger.event(AuditEventType.ERROR_OCCURRED, 'Warning message')
      .severity(AuditSeverity.WARN)
      .build();
    await logger.log(warnEntry);

    await logger.flush();

    const entries = mockStorage.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].severity).toBe(AuditSeverity.WARN);

    await logger.shutdown();
  });

  test('should flush immediately for critical events', async () => {
    const entry = auditLogger.event(AuditEventType.ERROR_OCCURRED, 'Critical error')
      .severity(AuditSeverity.CRITICAL)
      .build();

    await auditLogger.log(entry);

    // Should be flushed immediately without calling flush()
    const entries = mockStorage.getEntries();
    expect(entries).toHaveLength(1);
  });

  test('should batch events when buffer is full', async () => {
    // Set small batch size
    config.storage.batchSize = 2;
    const logger = new AuditLogger(config, mockStorage);

    // Log 3 events
    for (let i = 0; i < 3; i++) {
      const entry = logger.event(AuditEventType.USER_ACTION, `Action ${i}`)
        .build();
      await logger.log(entry);
    }

    // First 2 should be flushed automatically
    const entries = mockStorage.getEntries();
    expect(entries.length).toBeGreaterThanOrEqual(2);

    await logger.shutdown();
  });

  test('should log decision events', async () => {
    await auditLogger.logDecision(
      'event123',
      'decision123',
      85,
      75,
      'suggestion',
      {
        brandContext: {
          playbook: 'test-playbook',
          persona: 'test-persona',
          complianceRules: ['rule1']
        }
      }
    );

    await auditLogger.flush();

    const entries = mockStorage.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].eventType).toBe(AuditEventType.DECISION_MADE);
    expect(entries[0].decisionContext?.confidence).toBe(85);
    expect(entries[0].decisionContext?.brandContext?.playbook).toBe('test-playbook');
  });

  test('should log user actions', async () => {
    const userContext = {
      userId: 'user123',
      username: 'testuser',
      email: 'test@example.com'
    };

    await auditLogger.logUserAction('login', userContext, { source: 'web' });
    await auditLogger.flush();

    const entries = mockStorage.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].eventType).toBe(AuditEventType.USER_ACTION);
    expect(entries[0].userContext?.userId).toBe('user123');
    expect(entries[0].metadata?.source).toBe('web');
  });

  test('should log system operations', async () => {
    await auditLogger.logSystemOperation('test_operation', true, 1500, { component: 'test' });
    await auditLogger.flush();

    const entries = mockStorage.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].eventType).toBe(AuditEventType.SYSTEM_START);
    expect(entries[0].performanceMetrics?.duration).toBe(1500);
    expect(entries[0].metadata?.component).toBe('test');
  });

  test('should log data operations', async () => {
    await auditLogger.logDataOperation('ingested', 100, 'social_events', { platform: 'tiktok' });
    await auditLogger.flush();

    const entries = mockStorage.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].eventType).toBe(AuditEventType.DATA_INGESTED);
    expect(entries[0].metadata?.recordCount).toBe(100);
    expect(entries[0].metadata?.platform).toBe('tiktok');
  });

  test('should log security events', async () => {
    const userContext = { userId: 'user123', ipAddress: '192.168.1.1' };
    
    await auditLogger.logSecurityEvent(
      AuditEventType.AUTHENTICATION_FAILED,
      'Invalid password',
      userContext,
      AuditSeverity.WARN
    );
    await auditLogger.flush();

    const entries = mockStorage.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].eventType).toBe(AuditEventType.AUTHENTICATION_FAILED);
    expect(entries[0].severity).toBe(AuditSeverity.WARN);
    expect(entries[0].tags).toContain('security');
  });

  test('should query audit logs', async () => {
    // Log multiple events
    await auditLogger.logUserAction('action1', { userId: 'user1' });
    await auditLogger.logUserAction('action2', { userId: 'user2' });
    await auditLogger.logSystemOperation('operation1', true);
    await auditLogger.flush();

    // Query by event type
    const userActions = await auditLogger.query({
      eventTypes: [AuditEventType.USER_ACTION],
      limit: 10,
      offset: 0
    });

    expect(userActions).toHaveLength(2);
    expect(userActions.every(e => e.eventType === AuditEventType.USER_ACTION)).toBe(true);

    // Query by user
    const user1Actions = await auditLogger.query({
      userId: 'user1',
      limit: 10,
      offset: 0
    });

    expect(user1Actions).toHaveLength(1);
    expect(user1Actions[0].userContext?.userId).toBe('user1');
  });

  test('should get statistics', async () => {
    // Log various events
    await auditLogger.logUserAction('action1', { userId: 'user1' });
    await auditLogger.logUserAction('action2', { userId: 'user1' });
    await auditLogger.logSystemOperation('operation1', true);
    await auditLogger.flush();

    const stats = await auditLogger.getStatistics();

    expect(stats.totalEvents).toBe(3);
    expect(stats.eventsByType[AuditEventType.USER_ACTION]).toBe(2);
    expect(stats.eventsByType[AuditEventType.SYSTEM_START]).toBe(1);
  });

  test('should get metrics', () => {
    const metrics = auditLogger.getMetrics();

    expect(metrics).toHaveProperty('totalEvents');
    expect(metrics).toHaveProperty('errorEvents');
    expect(metrics).toHaveProperty('bufferSize');
    expect(metrics).toHaveProperty('configEnabled');
    expect(metrics).toHaveProperty('lastFlush');
  });

  test('should handle disabled logging', async () => {
    config.enabled = false;
    const logger = new AuditLogger(config, mockStorage);

    const entry = logger.event(AuditEventType.USER_ACTION, 'Test message').build();
    await logger.log(entry);
    await logger.flush();

    const entries = mockStorage.getEntries();
    expect(entries).toHaveLength(0);

    await logger.shutdown();
  });

  test('should anonymize personal data when compliance is enabled', async () => {
    const entry = auditLogger.event(AuditEventType.USER_LOGIN, 'User logged in')
      .userContext({
        userId: 'user123',
        email: 'test@example.com',
        ipAddress: '192.168.1.100'
      })
      .build();

    await auditLogger.log(entry);
    await auditLogger.flush();

    const entries = mockStorage.getEntries();
    expect(entries).toHaveLength(1);
    
    // Email should be anonymized
    expect(entries[0].userContext?.email).not.toBe('test@example.com');
    expect(entries[0].userContext?.email).toContain('@example.com');
    
    // IP should be anonymized
    expect(entries[0].userContext?.ipAddress).toBe('192.168.xxx.xxx');
  });

  test('should cleanup old logs', async () => {
    // Log some events
    await auditLogger.logUserAction('action1', { userId: 'user1' });
    await auditLogger.logUserAction('action2', { userId: 'user2' });
    await auditLogger.flush();

    expect(mockStorage.getEntries()).toHaveLength(2);

    const deletedCount = await auditLogger.cleanup();
    expect(deletedCount).toBe(2);
    expect(mockStorage.getEntries()).toHaveLength(0);
  });
});