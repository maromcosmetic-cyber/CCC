/**
 * Property-Based Tests for Audit Logging System
 * 
 * Tests Property 10: Comprehensive Audit Logging
 * Validates: Requirements 6.8, 12.4, 13.6
 */

import * as fc from 'fast-check';
import { AuditLogger, AuditEventBuilder, IAuditStorage } from '../AuditLogger';
import { AuditService } from '../AuditService';
import {
  AuditLogEntry,
  AuditEventType,
  AuditSeverity,
  AuditConfig,
  AuditQueryFilters,
  AuditStatistics,
  UserContext,
  SystemContext,
  DecisionContext
} from '../types';
import { SocialEvent } from '../../types/core';
import { DecisionOutput } from '../../decision/DecisionEngine';

// Mock storage for property testing
class PropertyTestAuditStorage implements IAuditStorage {
  private entries: AuditLogEntry[] = [];

  async store(entry: AuditLogEntry): Promise<void> {
    this.entries.push({ ...entry });
  }

  async storeBatch(entries: AuditLogEntry[]): Promise<void> {
    this.entries.push(...entries.map(e => ({ ...e })));
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
    const count = this.entries.length;
    this.entries = [];
    return count;
  }

  getEntries(): AuditLogEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
  }
}

// Fast-check arbitraries for generating test data
const auditEventTypeArb = fc.constantFrom(...Object.values(AuditEventType));
const auditSeverityArb = fc.constantFrom(...Object.values(AuditSeverity));

const userContextArb = fc.record({
  userId: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  username: fc.option(fc.string({ minLength: 1, maxLength: 30 })),
  email: fc.option(fc.emailAddress()),
  role: fc.option(fc.constantFrom('admin', 'user', 'viewer', 'moderator')),
  sessionId: fc.option(fc.uuid()),
  ipAddress: fc.option(fc.ipV4()),
  userAgent: fc.option(fc.string({ minLength: 10, maxLength: 200 }))
});

const systemContextArb = fc.record({
  serviceId: fc.string({ minLength: 1, maxLength: 50 }),
  serviceName: fc.string({ minLength: 1, maxLength: 100 }),
  version: fc.string({ minLength: 1, maxLength: 20 }),
  environment: fc.constantFrom('development', 'staging', 'production'),
  hostname: fc.string({ minLength: 1, maxLength: 50 }),
  processId: fc.integer({ min: 1, max: 65535 }),
  requestId: fc.option(fc.uuid()),
  correlationId: fc.option(fc.uuid())
});

const decisionContextArb = fc.record({
  eventId: fc.string({ minLength: 1, maxLength: 50 }),
  decisionId: fc.string({ minLength: 1, maxLength: 50 }),
  confidence: fc.float({ min: 0, max: 100 }),
  priorityScore: fc.float({ min: 0, max: 100 }),
  routingDecision: fc.constantFrom('auto_response', 'suggestion', 'human_review'),
  brandContext: fc.option(fc.record({
    playbook: fc.string({ minLength: 1, maxLength: 50 }),
    persona: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
    complianceRules: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 5 })
  })),
  aiAnalysis: fc.option(fc.record({
    sentiment: fc.record({
      overall: fc.float({ min: -1, max: 1 }),
      confidence: fc.float({ min: 0, max: 1 })
    }),
    intent: fc.record({
      category: fc.string({ minLength: 1, maxLength: 30 }),
      confidence: fc.float({ min: 0, max: 1 })
    }),
    topics: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 })
  }))
});

const auditLogEntryArb = fc.record({
  id: fc.uuid(),
  timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
  eventType: auditEventTypeArb,
  severity: auditSeverityArb,
  message: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
  userContext: fc.option(userContextArb),
  systemContext: systemContextArb,
  decisionContext: fc.option(decisionContextArb),
  metadata: fc.option(fc.dictionary(fc.string(), fc.anything())),
  tags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 10 })),
  performanceMetrics: fc.option(fc.record({
    duration: fc.float({ min: 0, max: 60000 }),
    memoryUsage: fc.option(fc.integer({ min: 0, max: 1000000000 })),
    cpuUsage: fc.option(fc.float({ min: 0, max: 100 })),
    networkLatency: fc.option(fc.float({ min: 0, max: 5000 })),
    throughput: fc.option(fc.float({ min: 0, max: 10000 })),
    errorRate: fc.option(fc.float({ min: 0, max: 100 }))
  })),
  errorDetails: fc.option(fc.record({
    errorCode: fc.string({ minLength: 1, maxLength: 50 }),
    errorMessage: fc.string({ minLength: 1, maxLength: 200 }),
    stackTrace: fc.option(fc.string({ minLength: 10, maxLength: 1000 })),
    causedBy: fc.option(fc.string({ minLength: 1, maxLength: 50 }))
  })),
  retentionPolicy: fc.string({ minLength: 1, maxLength: 20 }),
  complianceFlags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 })),
  parentEventId: fc.option(fc.uuid()),
  relatedEventIds: fc.option(fc.array(fc.uuid(), { maxLength: 5 }))
});

const socialEventArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 50 }),
  platform: fc.constantFrom('tiktok', 'instagram', 'facebook', 'youtube', 'reddit'),
  platformEventId: fc.string({ minLength: 1, maxLength: 50 }),
  eventType: fc.constantFrom('post', 'comment', 'mention', 'share'),
  contentType: fc.constantFrom('text', 'image', 'video'),
  timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
  author: fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }),
    username: fc.option(fc.string({ minLength: 1, maxLength: 30 })),
    displayName: fc.option(fc.string({ minLength: 1, maxLength: 50 }))
  }),
  content: fc.record({
    text: fc.option(fc.string({ minLength: 1, maxLength: 1000 }))
  }),
  engagement: fc.option(fc.record({
    likes: fc.integer({ min: 0, max: 1000000 }),
    shares: fc.integer({ min: 0, max: 100000 }),
    comments: fc.integer({ min: 0, max: 10000 }),
    views: fc.option(fc.integer({ min: 0, max: 10000000 }))
  })),
  metadata: fc.dictionary(fc.string(), fc.anything()),
  ingestionTimestamp: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
  processingStatus: fc.constantFrom('pending', 'processing', 'completed', 'failed')
});

const decisionOutputArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 50 }),
  eventId: fc.string({ minLength: 1, maxLength: 50 }),
  timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
  confidence: fc.float({ min: 0, max: 100 }),
  priority: fc.float({ min: 0, max: 100 }),
  route: fc.constantFrom('auto_response', 'suggestion', 'human_review'),
  reasoning: fc.string({ minLength: 1, maxLength: 200 }),
  actions: fc.array(fc.record({
    type: fc.string({ minLength: 1, maxLength: 30 }),
    parameters: fc.dictionary(fc.string(), fc.anything())
  }), { maxLength: 3 }),
  brandContext: fc.option(fc.record({
    playbook: fc.string({ minLength: 1, maxLength: 50 }),
    persona: fc.string({ minLength: 1, maxLength: 50 }),
    complianceRules: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 3 })
  })),
  analysis: fc.option(fc.record({
    sentiment: fc.option(fc.record({
      overall: fc.float({ min: -1, max: 1 }),
      confidence: fc.float({ min: 0, max: 1 })
    })),
    intent: fc.option(fc.record({
      category: fc.string({ minLength: 1, maxLength: 30 }),
      confidence: fc.float({ min: 0, max: 1 })
    })),
    topics: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }))
  })),
  qualityScore: fc.float({ min: 0, max: 1 }),
  processingTime: fc.float({ min: 0, max: 10000 })
});

describe('Property 10: Comprehensive Audit Logging', () => {
  let storage: PropertyTestAuditStorage;
  let auditLogger: AuditLogger;
  let auditService: AuditService;
  let config: AuditConfig;

  beforeEach(() => {
    storage = new PropertyTestAuditStorage();
    config = {
      enabled: true,
      logLevel: AuditSeverity.INFO,
      storage: {
        type: 'database',
        connectionString: 'test',
        retentionDays: 365,
        batchSize: 100,
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
    auditLogger = new AuditLogger(config, storage);
    auditService = new AuditService({
      database: { connectionString: 'test' },
      audit: config
    });
  });

  afterEach(async () => {
    await auditLogger.shutdown();
  });

  /**
   * Property 10.1: All automated decisions must be logged with sufficient context
   */
  test('Property 10.1: Decision logging completeness', async () => {
    await fc.assert(fc.asyncProperty(
      socialEventArb,
      decisionOutputArb,
      fc.float({ min: 0, max: 10000 }),
      async (socialEvent, decision, processingTime) => {
        storage.clear();

        // Log a decision using the audit service
        await auditService.logDecisionMade(socialEvent, decision, processingTime);
        await auditLogger.flush();

        const entries = storage.getEntries();
        
        // Must have at least one audit entry
        expect(entries.length).toBeGreaterThan(0);

        // Find decision-related entries
        const decisionEntries = entries.filter(e => 
          e.eventType === AuditEventType.DECISION_MADE ||
          e.decisionContext?.decisionId === decision.id
        );

        expect(decisionEntries.length).toBeGreaterThan(0);

        for (const entry of decisionEntries) {
          // Must have required context
          expect(entry.id).toBeDefined();
          expect(entry.timestamp).toBeInstanceOf(Date);
          expect(entry.eventType).toBeDefined();
          expect(entry.severity).toBeDefined();
          expect(entry.message).toBeDefined();
          expect(entry.systemContext).toBeDefined();

          // Decision context must be present for decision events
          if (entry.eventType === AuditEventType.DECISION_MADE) {
            expect(entry.decisionContext).toBeDefined();
            expect(entry.decisionContext?.eventId).toBe(socialEvent.id);
            expect(entry.decisionContext?.decisionId).toBe(decision.id);
            expect(entry.decisionContext?.confidence).toBe(decision.confidence);
            expect(entry.decisionContext?.priorityScore).toBe(decision.priority);
            expect(entry.decisionContext?.routingDecision).toBe(decision.route);
          }

          // Performance metrics should be included
          if (entry.performanceMetrics) {
            expect(entry.performanceMetrics.duration).toBeGreaterThanOrEqual(0);
          }
        }
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 10.2: All user actions must be logged with user context
   */
  test('Property 10.2: User action logging completeness', async () => {
    await fc.assert(fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 50 }),
      userContextArb,
      fc.dictionary(fc.string(), fc.anything()),
      async (action, userContext, metadata) => {
        storage.clear();

        // Log a user action
        await auditService.logUserAction(action, userContext, metadata);
        await auditLogger.flush();

        const entries = storage.getEntries();
        expect(entries.length).toBeGreaterThan(0);

        const userActionEntry = entries.find(e => e.eventType === AuditEventType.USER_ACTION);
        expect(userActionEntry).toBeDefined();

        // Must have user context
        expect(userActionEntry!.userContext).toBeDefined();
        if (userContext.userId) {
          expect(userActionEntry!.userContext?.userId).toBe(userContext.userId);
        }
        if (userContext.username) {
          expect(userActionEntry!.userContext?.username).toBe(userContext.username);
        }

        // Must have system context
        expect(userActionEntry!.systemContext).toBeDefined();
        expect(userActionEntry!.systemContext.serviceId).toBeDefined();

        // Must have metadata if provided
        if (metadata && Object.keys(metadata).length > 0) {
          expect(userActionEntry!.metadata).toBeDefined();
        }

        // Must have proper message
        expect(userActionEntry!.message).toContain(action);
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 10.3: All system operations must be logged with performance context
   */
  test('Property 10.3: System operation logging completeness', async () => {
    await fc.assert(fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 50 }),
      fc.boolean(),
      fc.option(fc.float({ min: 0, max: 60000 })),
      fc.option(fc.dictionary(fc.string(), fc.anything())),
      async (operation, success, duration, metadata) => {
        storage.clear();

        // Log a system operation
        await auditService.logSystemOperation(operation, success, duration, metadata);
        await auditLogger.flush();

        const entries = storage.getEntries();
        expect(entries.length).toBeGreaterThan(0);

        const systemEntry = entries.find(e => 
          e.eventType === AuditEventType.SYSTEM_START || 
          e.eventType === AuditEventType.ERROR_OCCURRED
        );
        expect(systemEntry).toBeDefined();

        // Must have system context
        expect(systemEntry!.systemContext).toBeDefined();
        expect(systemEntry!.systemContext.serviceId).toBeDefined();
        expect(systemEntry!.systemContext.hostname).toBeDefined();
        expect(systemEntry!.systemContext.processId).toBeGreaterThan(0);

        // Must have appropriate event type based on success
        if (success) {
          expect(systemEntry!.eventType).toBe(AuditEventType.SYSTEM_START);
          expect(systemEntry!.severity).toBe(AuditSeverity.INFO);
        } else {
          expect(systemEntry!.eventType).toBe(AuditEventType.ERROR_OCCURRED);
          expect(systemEntry!.severity).toBe(AuditSeverity.ERROR);
        }

        // Must have performance metrics if duration provided
        if (duration !== undefined && duration !== null) {
          expect(systemEntry!.performanceMetrics).toBeDefined();
          expect(systemEntry!.performanceMetrics?.duration).toBe(duration);
        }

        // Must have metadata if provided
        if (metadata && Object.keys(metadata).length > 0) {
          expect(systemEntry!.metadata).toBeDefined();
        }
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 10.4: Audit entries must be queryable and filterable
   */
  test('Property 10.4: Audit query consistency', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(auditLogEntryArb, { minLength: 1, maxLength: 20 }),
      async (entries) => {
        storage.clear();

        // Store all entries
        for (const entry of entries) {
          await auditLogger.log(entry);
        }
        await auditLogger.flush();

        // Test various query filters
        const allEntries = await auditLogger.query({
          limit: 1000,
          offset: 0
        });

        expect(allEntries.length).toBe(entries.length);

        // Test event type filtering
        const uniqueEventTypes = [...new Set(entries.map(e => e.eventType))];
        for (const eventType of uniqueEventTypes) {
          const filteredEntries = await auditLogger.query({
            eventTypes: [eventType],
            limit: 1000,
            offset: 0
          });

          const expectedCount = entries.filter(e => e.eventType === eventType).length;
          expect(filteredEntries.length).toBe(expectedCount);

          // All returned entries must match the filter
          for (const entry of filteredEntries) {
            expect(entry.eventType).toBe(eventType);
          }
        }

        // Test severity filtering
        const uniqueSeverities = [...new Set(entries.map(e => e.severity))];
        for (const severity of uniqueSeverities) {
          const filteredEntries = await auditLogger.query({
            severities: [severity],
            limit: 1000,
            offset: 0
          });

          const expectedCount = entries.filter(e => e.severity === severity).length;
          expect(filteredEntries.length).toBe(expectedCount);

          // All returned entries must match the filter
          for (const entry of filteredEntries) {
            expect(entry.severity).toBe(severity);
          }
        }

        // Test user ID filtering
        const userIds = entries
          .map(e => e.userContext?.userId)
          .filter(id => id !== undefined && id !== null);
        
        if (userIds.length > 0) {
          const testUserId = userIds[0];
          const filteredEntries = await auditLogger.query({
            userId: testUserId,
            limit: 1000,
            offset: 0
          });

          // All returned entries must match the user ID
          for (const entry of filteredEntries) {
            expect(entry.userContext?.userId).toBe(testUserId);
          }
        }
      }
    ), { numRuns: 50 });
  });

  /**
   * Property 10.5: Audit statistics must be accurate and consistent
   */
  test('Property 10.5: Audit statistics accuracy', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(auditLogEntryArb, { minLength: 1, maxLength: 50 }),
      async (entries) => {
        storage.clear();

        // Store all entries
        for (const entry of entries) {
          await auditLogger.log(entry);
        }
        await auditLogger.flush();

        const statistics = await auditLogger.getStatistics();

        // Total events must match
        expect(statistics.totalEvents).toBe(entries.length);

        // Event type counts must be accurate
        const expectedEventTypeCounts = entries.reduce((acc, entry) => {
          acc[entry.eventType] = (acc[entry.eventType] || 0) + 1;
          return acc;
        }, {} as Record<AuditEventType, number>);

        for (const [eventType, expectedCount] of Object.entries(expectedEventTypeCounts)) {
          expect(statistics.eventsByType[eventType as AuditEventType]).toBe(expectedCount);
        }

        // Severity counts must be accurate
        const expectedSeverityCounts = entries.reduce((acc, entry) => {
          acc[entry.severity] = (acc[entry.severity] || 0) + 1;
          return acc;
        }, {} as Record<AuditSeverity, number>);

        for (const [severity, expectedCount] of Object.entries(expectedSeverityCounts)) {
          expect(statistics.eventsBySeverity[severity as AuditSeverity]).toBe(expectedCount);
        }
      }
    ), { numRuns: 50 });
  });

  /**
   * Property 10.6: Audit entries must preserve data integrity
   */
  test('Property 10.6: Data integrity preservation', async () => {
    await fc.assert(fc.asyncProperty(
      auditLogEntryArb,
      async (originalEntry) => {
        storage.clear();

        // Store the entry
        await auditLogger.log(originalEntry);
        await auditLogger.flush();

        // Retrieve the entry
        const storedEntries = await auditLogger.query({
          limit: 1,
          offset: 0
        });

        expect(storedEntries.length).toBe(1);
        const storedEntry = storedEntries[0];

        // Core fields must be preserved
        expect(storedEntry.id).toBe(originalEntry.id);
        expect(storedEntry.eventType).toBe(originalEntry.eventType);
        expect(storedEntry.severity).toBe(originalEntry.severity);
        expect(storedEntry.message).toBe(originalEntry.message);
        expect(storedEntry.timestamp.getTime()).toBe(originalEntry.timestamp.getTime());

        // System context must be preserved
        expect(storedEntry.systemContext.serviceId).toBe(originalEntry.systemContext.serviceId);
        expect(storedEntry.systemContext.serviceName).toBe(originalEntry.systemContext.serviceName);
        expect(storedEntry.systemContext.environment).toBe(originalEntry.systemContext.environment);

        // User context must be preserved if present
        if (originalEntry.userContext) {
          expect(storedEntry.userContext).toBeDefined();
          if (originalEntry.userContext.userId) {
            // Note: userId might be anonymized based on compliance settings
            expect(storedEntry.userContext?.userId).toBeDefined();
          }
        }

        // Decision context must be preserved if present
        if (originalEntry.decisionContext) {
          expect(storedEntry.decisionContext).toBeDefined();
          expect(storedEntry.decisionContext?.eventId).toBe(originalEntry.decisionContext.eventId);
          expect(storedEntry.decisionContext?.decisionId).toBe(originalEntry.decisionContext.decisionId);
          expect(storedEntry.decisionContext?.confidence).toBe(originalEntry.decisionContext.confidence);
        }

        // Performance metrics must be preserved if present
        if (originalEntry.performanceMetrics) {
          expect(storedEntry.performanceMetrics).toBeDefined();
          expect(storedEntry.performanceMetrics?.duration).toBe(originalEntry.performanceMetrics.duration);
        }
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 10.7: Compliance rules must be applied consistently
   */
  test('Property 10.7: Compliance rule consistency', async () => {
    await fc.assert(fc.asyncProperty(
      auditLogEntryArb,
      async (entry) => {
        storage.clear();

        // Store entry with compliance enabled
        await auditLogger.log(entry);
        await auditLogger.flush();

        const storedEntries = storage.getEntries();
        expect(storedEntries.length).toBe(1);
        const storedEntry = storedEntries[0];

        // If compliance is enabled, sensitive data should be anonymized
        if (config.compliance.dataAnonymization && entry.userContext?.email) {
          // Email should be anonymized (not the original)
          expect(storedEntry.userContext?.email).not.toBe(entry.userContext.email);
          expect(storedEntry.userContext?.email).toContain('@');
        }

        if (config.compliance.dataAnonymization && entry.userContext?.ipAddress) {
          // IP should be anonymized
          expect(storedEntry.userContext?.ipAddress).not.toBe(entry.userContext.ipAddress);
          expect(storedEntry.userContext?.ipAddress).toMatch(/^\d+\.\d+\.xxx\.xxx$/);
        }

        // Compliance flags should be preserved
        if (entry.complianceFlags && entry.complianceFlags.length > 0) {
          expect(storedEntry.complianceFlags).toBeDefined();
          expect(storedEntry.complianceFlags?.length).toBeGreaterThan(0);
        }
      }
    ), { numRuns: 100 });
  });
});

/**
 * Integration property tests for the complete audit system
 */
describe('Property 10: Audit System Integration', () => {
  let storage: PropertyTestAuditStorage;
  let auditService: AuditService;

  beforeEach(() => {
    storage = new PropertyTestAuditStorage();
    const config = {
      database: { connectionString: 'test' },
      audit: {
        enabled: true,
        logLevel: AuditSeverity.INFO,
        storage: {
          type: 'database' as const,
          connectionString: 'test',
          retentionDays: 365,
          batchSize: 100,
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
      }
    };
    
    // Mock the audit service to use our test storage
    auditService = new AuditService(config);
    // Replace the internal logger's storage with our test storage
    (auditService as any).logger.storage = storage;
  });

  /**
   * Property 10.8: End-to-end audit trail completeness
   */
  test('Property 10.8: Complete audit trail for decision workflow', async () => {
    await fc.assert(fc.asyncProperty(
      socialEventArb,
      decisionOutputArb,
      fc.array(fc.record({
        type: fc.string({ minLength: 1, maxLength: 30 }),
        success: fc.boolean(),
        executionTime: fc.float({ min: 0, max: 5000 })
      }), { minLength: 1, maxLength: 3 }),
      async (socialEvent, decision, actions) => {
        storage.clear();

        // Simulate complete decision workflow
        await auditService.logDataIngestion(
          socialEvent.platform,
          1,
          100,
          true
        );

        await auditService.logDataProcessing(
          socialEvent.id,
          'normalization',
          true,
          50
        );

        await auditService.logDecisionMade(
          socialEvent,
          decision,
          decision.processingTime
        );

        for (const action of actions) {
          await auditService.logActionExecuted(
            decision.id,
            action.type,
            action.success,
            action.executionTime
          );
        }

        await auditService.flush();

        const allEntries = storage.getEntries();
        
        // Must have entries for each step
        expect(allEntries.length).toBeGreaterThanOrEqual(3 + actions.length);

        // Must have data ingestion entry
        const ingestionEntry = allEntries.find(e => 
          e.eventType === AuditEventType.DATA_INGESTED
        );
        expect(ingestionEntry).toBeDefined();
        expect(ingestionEntry?.metadata?.platform).toBe(socialEvent.platform);

        // Must have data processing entry
        const processingEntry = allEntries.find(e => 
          e.eventType === AuditEventType.DATA_PROCESSED
        );
        expect(processingEntry).toBeDefined();
        expect(processingEntry?.metadata?.eventId).toBe(socialEvent.id);

        // Must have decision entry
        const decisionEntry = allEntries.find(e => 
          e.eventType === AuditEventType.DECISION_MADE
        );
        expect(decisionEntry).toBeDefined();
        expect(decisionEntry?.decisionContext?.decisionId).toBe(decision.id);

        // Must have action execution entries
        const actionEntries = allEntries.filter(e => 
          e.eventType === AuditEventType.ACTION_EXECUTED
        );
        expect(actionEntries.length).toBe(actions.length);

        // All entries must have proper timestamps (chronological order not required due to async)
        for (const entry of allEntries) {
          expect(entry.timestamp).toBeInstanceOf(Date);
          expect(entry.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
        }

        // All entries must have system context
        for (const entry of allEntries) {
          expect(entry.systemContext).toBeDefined();
          expect(entry.systemContext.serviceId).toBeDefined();
        }
      }
    ), { numRuns: 50 });
  });
});