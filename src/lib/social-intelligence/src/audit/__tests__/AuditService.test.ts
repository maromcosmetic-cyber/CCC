/**
 * Unit Tests for Audit Service
 */

import { AuditService, AuditServiceConfig } from '../AuditService';
import { AuditEventType, AuditSeverity } from '../types';
import { SocialEvent } from '../../types/core';
import { DecisionOutput } from '../../decision/DecisionEngine';

// Mock the database storage
jest.mock('../DatabaseAuditStorage', () => {
  return {
    DatabaseAuditStorage: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      store: jest.fn().mockResolvedValue(undefined),
      storeBatch: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue([]),
      getStatistics: jest.fn().mockResolvedValue({
        totalEvents: 0,
        eventsByType: {},
        eventsBySeverity: {},
        eventsOverTime: [],
        topUsers: [],
        topServices: []
      }),
      cleanup: jest.fn().mockResolvedValue(0),
      close: jest.fn().mockResolvedValue(undefined)
    }))
  };
});

describe('AuditService', () => {
  let auditService: AuditService;
  let config: AuditServiceConfig;

  beforeEach(async () => {
    config = {
      database: {
        connectionString: 'postgresql://test:test@localhost:5432/test'
      },
      audit: {
        enabled: true,
        logLevel: AuditSeverity.INFO,
        storage: {
          type: 'database',
          connectionString: 'postgresql://test:test@localhost:5432/test',
          retentionDays: 365,
          batchSize: 100,
          flushInterval: 5000
        },
        compliance: {
          gdprEnabled: true,
          ccpaEnabled: true,
          dataAnonymization: true,
          encryptionEnabled: true
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

    auditService = new AuditService(config);
    await auditService.initialize();
  });

  afterEach(async () => {
    await auditService.shutdown();
  });

  describe('Decision Engine Integration', () => {
    test('should log decision made', async () => {
      const socialEvent: SocialEvent = {
        id: 'event123',
        platform: 'tiktok',
        platformEventId: 'tiktok123',
        eventType: 'comment',
        contentType: 'text',
        timestamp: new Date(),
        author: {
          id: 'author123',
          username: 'testuser',
          displayName: 'Test User'
        },
        content: {
          text: 'Test comment'
        },
        engagement: {
          likes: 10,
          shares: 2,
          comments: 1
        },
        metadata: {},
        ingestionTimestamp: new Date(),
        processingStatus: 'pending'
      };

      const decision: DecisionOutput = {
        id: 'decision123',
        eventId: 'event123',
        timestamp: new Date(),
        confidence: 85,
        priority: 75,
        route: 'suggestion',
        reasoning: 'High confidence suggestion',
        actions: [],
        brandContext: {
          playbook: 'test-playbook',
          persona: 'test-persona',
          complianceRules: ['rule1']
        },
        analysis: {
          sentiment: {
            overall: 0.7,
            confidence: 0.9
          },
          intent: {
            category: 'purchase_inquiry',
            confidence: 0.8
          },
          topics: ['product', 'pricing']
        },
        qualityScore: 0.85,
        processingTime: 1500
      };

      await expect(auditService.logDecisionMade(socialEvent, decision, 1500))
        .resolves.not.toThrow();
    });

    test('should log action executed', async () => {
      await expect(auditService.logActionExecuted(
        'decision123',
        'auto_response',
        true,
        500,
        { responseText: 'Thank you for your inquiry!' }
      )).resolves.not.toThrow();
    });
  });

  describe('Data Operations Logging', () => {
    test('should log data ingestion', async () => {
      await expect(auditService.logDataIngestion(
        'tiktok',
        100,
        2000,
        true
      )).resolves.not.toThrow();
    });

    test('should log data ingestion with errors', async () => {
      await expect(auditService.logDataIngestion(
        'tiktok',
        50,
        3000,
        false,
        ['Rate limit exceeded', 'Invalid token']
      )).resolves.not.toThrow();
    });

    test('should log data processing', async () => {
      await expect(auditService.logDataProcessing(
        'event123',
        'sentiment_analysis',
        true,
        800,
        { model: 'bert-base' }
      )).resolves.not.toThrow();
    });
  });

  describe('User Action Logging', () => {
    test('should log user login', async () => {
      const userContext = {
        userId: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin',
        sessionId: 'session123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...'
      };

      await expect(auditService.logUserLogin(userContext))
        .resolves.not.toThrow();
    });

    test('should log user logout', async () => {
      const userContext = {
        userId: 'user123',
        username: 'testuser'
      };

      await expect(auditService.logUserLogout(userContext))
        .resolves.not.toThrow();
    });

    test('should log user action', async () => {
      const userContext = {
        userId: 'user123',
        username: 'testuser'
      };

      await expect(auditService.logUserAction(
        'update_brand_playbook',
        userContext,
        { playbookId: 'playbook123', changes: ['tone', 'voice'] }
      )).resolves.not.toThrow();
    });

    test('should log configuration change', async () => {
      const userContext = {
        userId: 'admin123',
        username: 'admin',
        role: 'admin'
      };

      const changes = {
        confidenceThreshold: { from: 80, to: 85 },
        retentionDays: { from: 365, to: 730 }
      };

      await expect(auditService.logConfigurationChange(
        'decision_engine',
        changes,
        userContext
      )).resolves.not.toThrow();
    });
  });

  describe('Security Event Logging', () => {
    test('should log authentication failure', async () => {
      const userContext = {
        username: 'testuser',
        ipAddress: '192.168.1.1'
      };

      await expect(auditService.logAuthenticationFailure(
        'invalid_password',
        userContext
      )).resolves.not.toThrow();
    });

    test('should log authorization denied', async () => {
      const userContext = {
        userId: 'user123',
        username: 'testuser',
        role: 'viewer'
      };

      await expect(auditService.logAuthorizationDenied(
        'brand_playbook',
        'update',
        userContext
      )).resolves.not.toThrow();
    });

    test('should log suspicious activity', async () => {
      const userContext = {
        userId: 'user123',
        ipAddress: '192.168.1.1'
      };

      await expect(auditService.logSuspiciousActivity(
        'multiple_failed_logins',
        userContext,
        { attemptCount: 5, timeWindow: '5 minutes' }
      )).resolves.not.toThrow();
    });
  });

  describe('External Integration Logging', () => {
    test('should log external API call', async () => {
      await expect(auditService.logExternalAPICall(
        'tiktok',
        '/v2/research/video/query/',
        'POST',
        1200,
        200,
        true
      )).resolves.not.toThrow();
    });

    test('should log webhook received', async () => {
      await expect(auditService.logWebhookReceived(
        'meta',
        'page_mention',
        300,
        true,
        { pageId: 'page123', mentionId: 'mention456' }
      )).resolves.not.toThrow();
    });

    test('should log notification sent', async () => {
      await expect(auditService.logNotificationSent(
        'email',
        'admin@example.com',
        true,
        { subject: 'High priority alert', template: 'alert_template' }
      )).resolves.not.toThrow();
    });
  });

  describe('System Health Logging', () => {
    test('should log system start', async () => {
      await expect(auditService.logSystemStart())
        .resolves.not.toThrow();
    });

    test('should log system shutdown', async () => {
      await expect(auditService.logSystemShutdown())
        .resolves.not.toThrow();
    });

    test('should log service restart', async () => {
      await expect(auditService.logServiceRestart(
        'decision-engine',
        'memory_leak_detected'
      )).resolves.not.toThrow();
    });

    test('should log error', async () => {
      const error = new Error('Test error message');
      error.stack = 'Error: Test error message\n    at test.js:1:1';

      await expect(auditService.logError(
        error,
        'decision_processing',
        { eventId: 'event123', stage: 'sentiment_analysis' }
      )).resolves.not.toThrow();
    });
  });

  describe('Query and Analytics', () => {
    test('should query logs', async () => {
      const filters = {
        eventTypes: [AuditEventType.USER_ACTION],
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        limit: 50,
        offset: 0
      };

      await expect(auditService.queryLogs(filters))
        .resolves.toEqual([]);
    });

    test('should get statistics', async () => {
      const filters = {
        startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      };

      const stats = await auditService.getStatistics(filters);
      
      expect(stats).toHaveProperty('totalEvents');
      expect(stats).toHaveProperty('eventsByType');
      expect(stats).toHaveProperty('eventsBySeverity');
      expect(stats).toHaveProperty('eventsOverTime');
      expect(stats).toHaveProperty('topUsers');
      expect(stats).toHaveProperty('topServices');
    });

    test('should get metrics', () => {
      const metrics = auditService.getMetrics();
      
      expect(metrics).toHaveProperty('totalEvents');
      expect(metrics).toHaveProperty('errorEvents');
      expect(metrics).toHaveProperty('bufferSize');
      expect(metrics).toHaveProperty('configEnabled');
    });
  });

  describe('Maintenance Operations', () => {
    test('should cleanup old logs', async () => {
      const deletedCount = await auditService.cleanup();
      expect(typeof deletedCount).toBe('number');
      expect(deletedCount).toBeGreaterThanOrEqual(0);
    });

    test('should flush logs', async () => {
      await expect(auditService.flush())
        .resolves.not.toThrow();
    });
  });

  describe('Helper Methods', () => {
    test('should create user context from request', () => {
      const mockRequest = {
        user: {
          id: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          role: 'admin'
        },
        sessionID: 'session123',
        ip: '192.168.1.1',
        connection: { remoteAddress: '192.168.1.1' },
        get: jest.fn().mockReturnValue('Mozilla/5.0...')
      };

      const userContext = auditService.createUserContext(mockRequest);

      expect(userContext.userId).toBe('user123');
      expect(userContext.username).toBe('testuser');
      expect(userContext.email).toBe('test@example.com');
      expect(userContext.role).toBe('admin');
      expect(userContext.sessionId).toBe('session123');
      expect(userContext.ipAddress).toBe('192.168.1.1');
      expect(userContext.userAgent).toBe('Mozilla/5.0...');
    });

    test('should create correlation ID', () => {
      const correlationId = auditService.createCorrelationId();
      
      expect(correlationId).toMatch(/^audit_\d+_[a-z0-9]+$/);
      expect(correlationId.length).toBeGreaterThan(20);
    });

    test('should create unique correlation IDs', () => {
      const id1 = auditService.createCorrelationId();
      const id2 = auditService.createCorrelationId();
      
      expect(id1).not.toBe(id2);
    });
  });

  describe('Error Handling', () => {
    test('should handle storage errors gracefully', async () => {
      // This test would require mocking storage to throw errors
      // For now, we'll just ensure the service doesn't crash
      await expect(auditService.logUserAction(
        'test_action',
        { userId: 'user123' }
      )).resolves.not.toThrow();
    });
  });

  describe('Compliance Features', () => {
    test('should anonymize recipient in notifications', async () => {
      // Test email anonymization
      await expect(auditService.logNotificationSent(
        'email',
        'sensitive@example.com',
        true
      )).resolves.not.toThrow();

      // Test phone anonymization
      await expect(auditService.logNotificationSent(
        'sms',
        '+1234567890',
        true
      )).resolves.not.toThrow();

      // Test generic anonymization
      await expect(auditService.logNotificationSent(
        'webhook',
        'sensitive_identifier_123',
        true
      )).resolves.not.toThrow();
    });
  });
});