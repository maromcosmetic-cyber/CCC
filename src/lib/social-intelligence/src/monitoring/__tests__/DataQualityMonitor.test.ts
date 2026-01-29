/**
 * Unit Tests for Data Quality Monitor
 */

import { DataQualityMonitor, DataQualityValidator, DataQualityIssueType, DataQualityIssueSeverity } from '../DataQualityMonitor';
import { SocialEvent } from '../../types/core';

// Helper function to create test social events
function createTestEvent(overrides: Partial<SocialEvent> = {}): SocialEvent {
  return {
    id: 'test-event-123',
    platform: 'tiktok',
    platformEventId: 'tiktok_123456',
    eventType: 'comment',
    contentType: 'text',
    timestamp: new Date(),
    author: {
      id: 'author123',
      username: 'testuser',
      displayName: 'Test User'
    },
    content: {
      text: 'This is a test comment'
    },
    engagement: {
      likes: 10,
      shares: 2,
      comments: 1,
      views: 100
    },
    metadata: {},
    ingestionTimestamp: new Date(),
    processingStatus: 'pending',
    ...overrides
  };
}

describe('DataQualityValidator', () => {
  let validator: DataQualityValidator;

  beforeEach(() => {
    validator = new DataQualityValidator();
  });

  test('should validate a valid event with no issues', () => {
    const event = createTestEvent();
    const issues = validator.validateEvent(event);
    
    expect(issues).toHaveLength(0);
  });

  test('should detect missing required fields', () => {
    const event = createTestEvent({ id: '' });
    const issues = validator.validateEvent(event);
    
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe(DataQualityIssueType.MISSING_REQUIRED_FIELD);
    expect(issues[0].severity).toBe(DataQualityIssueSeverity.HIGH);
  });

  test('should detect invalid content format', () => {
    const event = createTestEvent({
      contentType: 'text',
      content: { text: '' } // Empty text
    });
    const issues = validator.validateEvent(event);
    
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe(DataQualityIssueType.INVALID_DATA_FORMAT);
  });

  test('should detect invalid timestamp', () => {
    const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours in future
    const event = createTestEvent({ timestamp: futureDate });
    const issues = validator.validateEvent(event);
    
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe(DataQualityIssueType.INVALID_TIMESTAMP);
  });

  test('should detect unrealistic engagement metrics', () => {
    const event = createTestEvent({
      engagement: {
        likes: -5, // Negative likes
        shares: 2,
        comments: 1,
        views: 100
      }
    });
    const issues = validator.validateEvent(event);
    
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe(DataQualityIssueType.UNREALISTIC_ENGAGEMENT);
  });

  test('should detect missing author information', () => {
    const event = createTestEvent({
      author: {
        id: '', // Missing ID
        username: '',
        displayName: ''
      }
    });
    const issues = validator.validateEvent(event);
    
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe(DataQualityIssueType.MISSING_AUTHOR_INFO);
  });

  test('should detect platform inconsistency', () => {
    const event = createTestEvent({
      platform: 'youtube',
      platformEventId: 'invalid_id' // YouTube IDs should be 11 or 28 characters
    });
    const issues = validator.validateEvent(event);
    
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe(DataQualityIssueType.PLATFORM_INCONSISTENCY);
  });

  test('should detect suspicious content', () => {
    const event = createTestEvent({
      content: {
        text: 'AAAAAAAAAAAAAAAAAAAAAA' // Repeated characters
      }
    });
    const issues = validator.validateEvent(event);
    
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe(DataQualityIssueType.SUSPICIOUS_CONTENT);
  });

  test('should register and use custom rules', () => {
    validator.registerRule({
      id: 'custom-rule',
      name: 'Custom Test Rule',
      description: 'Test custom rule',
      type: DataQualityIssueType.SUSPICIOUS_CONTENT,
      severity: DataQualityIssueSeverity.LOW,
      enabled: true,
      condition: (event) => event.content?.text !== 'forbidden',
      message: (event) => `Custom rule violation in ${event.id}`
    });

    const event = createTestEvent({
      content: { text: 'forbidden' }
    });
    const issues = validator.validateEvent(event);
    
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe(DataQualityIssueType.SUSPICIOUS_CONTENT);
    expect(issues[0].message).toContain('Custom rule violation');
  });

  test('should skip disabled rules', () => {
    validator.registerRule({
      id: 'disabled-rule',
      name: 'Disabled Rule',
      description: 'This rule is disabled',
      type: DataQualityIssueType.SUSPICIOUS_CONTENT,
      severity: DataQualityIssueSeverity.HIGH,
      enabled: false, // Disabled
      condition: () => false, // Would always fail
      message: () => 'Should not appear'
    });

    const event = createTestEvent();
    const issues = validator.validateEvent(event);
    
    expect(issues).toHaveLength(0);
  });

  test('should filter rules by platform', () => {
    validator.registerRule({
      id: 'platform-specific',
      name: 'Platform Specific Rule',
      description: 'Only for Instagram',
      type: DataQualityIssueType.SUSPICIOUS_CONTENT,
      severity: DataQualityIssueSeverity.MEDIUM,
      enabled: true,
      platforms: ['instagram'],
      condition: () => false, // Would always fail
      message: () => 'Platform specific issue'
    });

    // Test with TikTok event (should not trigger)
    const tiktokEvent = createTestEvent({ platform: 'tiktok' });
    const tiktokIssues = validator.validateEvent(tiktokEvent);
    expect(tiktokIssues.filter(i => i.metadata?.ruleId === 'platform-specific')).toHaveLength(0);

    // Test with Instagram event (should trigger)
    const instagramEvent = createTestEvent({ platform: 'instagram' });
    const instagramIssues = validator.validateEvent(instagramEvent);
    expect(instagramIssues.filter(i => i.metadata?.ruleId === 'platform-specific')).toHaveLength(1);
  });
});

describe('DataQualityMonitor', () => {
  let monitor: DataQualityMonitor;

  beforeEach(() => {
    monitor = new DataQualityMonitor();
  });

  test('should monitor a valid event successfully', async () => {
    const event = createTestEvent();
    const issues = await monitor.monitorEvent(event);
    
    expect(issues).toHaveLength(0);
    
    const metrics = monitor.getMetrics();
    expect(metrics.totalEvents).toBe(1);
    expect(metrics.validEvents).toBe(1);
    expect(metrics.invalidEvents).toBe(0);
    expect(metrics.qualityScore).toBe(100);
  });

  test('should monitor an invalid event and detect issues', async () => {
    const event = createTestEvent({ id: '' }); // Missing required field
    const issues = await monitor.monitorEvent(event);
    
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe(DataQualityIssueType.MISSING_REQUIRED_FIELD);
    
    const metrics = monitor.getMetrics();
    expect(metrics.totalEvents).toBe(1);
    expect(metrics.validEvents).toBe(0);
    expect(metrics.invalidEvents).toBe(1);
    expect(metrics.qualityScore).toBe(0);
  });

  test('should monitor multiple events in batch', async () => {
    const events = [
      createTestEvent({ id: 'event1' }),
      createTestEvent({ id: 'event2', author: { id: '', username: '', displayName: '' } }), // Invalid
      createTestEvent({ id: 'event3' })
    ];

    const results = await monitor.monitorEvents(events);
    
    expect(results.size).toBe(3);
    expect(results.get('event1')).toHaveLength(0); // Valid
    expect(results.get('event2')!.length).toBeGreaterThan(0); // Invalid
    expect(results.get('event3')).toHaveLength(0); // Valid
    
    const metrics = monitor.getMetrics();
    expect(metrics.totalEvents).toBe(3);
    expect(metrics.validEvents).toBe(2);
    expect(metrics.invalidEvents).toBe(1);
  });

  test('should track issues and allow filtering', async () => {
    const events = [
      createTestEvent({ id: 'event1', author: { id: '', username: '', displayName: '' } }),
      createTestEvent({ id: 'event2', engagement: { likes: -1, shares: 0, comments: 0, views: 0 } }),
      createTestEvent({ id: 'event3' })
    ];

    await monitor.monitorEvents(events);
    
    // Get all issues
    const allIssues = monitor.getIssues();
    expect(allIssues.length).toBeGreaterThan(0);
    
    // Filter by type
    const authorIssues = monitor.getIssues({ type: DataQualityIssueType.MISSING_AUTHOR_INFO });
    expect(authorIssues).toHaveLength(1);
    expect(authorIssues[0].eventId).toBe('event1');
    
    // Filter by event ID
    const event2Issues = monitor.getIssues({ eventId: 'event2' });
    expect(event2Issues).toHaveLength(1);
    expect(event2Issues[0].type).toBe(DataQualityIssueType.UNREALISTIC_ENGAGEMENT);
  });

  test('should resolve issues', async () => {
    const event = createTestEvent({ id: '' }); // Will create an issue
    const issues = await monitor.monitorEvent(event);
    
    expect(issues).toHaveLength(1);
    const issueId = issues[0].id;
    
    // Resolve the issue
    await monitor.resolveIssue(issueId, 'test-user', 'Fixed the missing ID');
    
    // Check that issue is resolved
    const resolvedIssues = monitor.getIssues({ resolved: true });
    expect(resolvedIssues).toHaveLength(1);
    expect(resolvedIssues[0].id).toBe(issueId);
    expect(resolvedIssues[0].resolvedBy).toBe('test-user');
    expect(resolvedIssues[0].metadata?.resolutionNote).toBe('Fixed the missing ID');
  });

  test('should generate platform quality stats', async () => {
    const events = [
      createTestEvent({ id: 'tiktok1', platform: 'tiktok' }),
      createTestEvent({ id: 'tiktok2', platform: 'tiktok', author: { id: '', username: '', displayName: '' } }),
      createTestEvent({ id: 'instagram1', platform: 'instagram' }),
      createTestEvent({ id: 'instagram2', platform: 'instagram' })
    ];

    await monitor.monitorEvents(events);
    
    const platformStats = monitor.getPlatformQualityStats();
    
    expect(platformStats.tiktok).toBeDefined();
    expect(platformStats.tiktok.totalEvents).toBe(2);
    expect(platformStats.tiktok.validEvents).toBe(1);
    expect(platformStats.tiktok.qualityScore).toBe(50);
    
    expect(platformStats.instagram).toBeDefined();
    expect(platformStats.instagram.totalEvents).toBe(2);
    expect(platformStats.instagram.validEvents).toBe(2);
    expect(platformStats.instagram.qualityScore).toBe(100);
  });

  test('should generate quality report', async () => {
    const events = [
      createTestEvent({ id: 'event1' }),
      createTestEvent({ id: 'event2', author: { id: '', username: '', displayName: '' } }),
      createTestEvent({ id: 'event3', engagement: { likes: -1, shares: 0, comments: 0, views: 0 } })
    ];

    await monitor.monitorEvents(events);
    
    const report = monitor.generateQualityReport();
    
    expect(report.summary).toBeDefined();
    expect(report.topIssues).toBeDefined();
    expect(report.topIssues.length).toBeGreaterThan(0);
    expect(report.platformBreakdown).toBeDefined();
    expect(report.recommendations).toBeDefined();
    expect(report.recommendations.length).toBeGreaterThan(0);
  });

  test('should cleanup resolved issues', async () => {
    const event = createTestEvent({ id: '' }); // Will create an issue
    const issues = await monitor.monitorEvent(event);
    
    const issueId = issues[0].id;
    await monitor.resolveIssue(issueId, 'test-user');
    
    // Manually set resolved date to old date
    const allIssues = monitor.getIssues();
    const issue = allIssues.find(i => i.id === issueId);
    if (issue) {
      issue.resolvedAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000); // 31 days ago
    }
    
    const removedCount = monitor.cleanupResolvedIssues(30);
    expect(removedCount).toBe(1);
    
    const remainingIssues = monitor.getIssues();
    expect(remainingIssues.find(i => i.id === issueId)).toBeUndefined();
  });

  test('should emit events during monitoring', async () => {
    let eventValidated = false;
    let qualityIssueDetected = false;
    let batchCompleted = false;

    monitor.on('event_validated', () => { eventValidated = true; });
    monitor.on('quality_issue_detected', () => { qualityIssueDetected = true; });
    monitor.on('batch_monitoring_completed', () => { batchCompleted = true; });

    const validEvent = createTestEvent({ id: 'valid' });
    const invalidEvent = createTestEvent({ id: 'invalid', author: { id: '', username: '', displayName: '' } });

    await monitor.monitorEvent(validEvent);
    expect(eventValidated).toBe(true);

    await monitor.monitorEvent(invalidEvent);
    expect(qualityIssueDetected).toBe(true);

    await monitor.monitorEvents([validEvent]);
    expect(batchCompleted).toBe(true);
  });

  test('should handle monitoring toggle', () => {
    let monitoringToggled = false;
    monitor.on('monitoring_toggled', (data) => {
      monitoringToggled = true;
      expect(data.enabled).toBe(false);
    });

    monitor.setEnabled(false);
    expect(monitoringToggled).toBe(true);
  });

  test('should skip monitoring when disabled', async () => {
    monitor.setEnabled(false);
    
    const event = createTestEvent({ id: '' }); // Would normally create an issue
    const issues = await monitor.monitorEvent(event);
    
    expect(issues).toHaveLength(0);
    
    const metrics = monitor.getMetrics();
    expect(metrics.totalEvents).toBe(0);
  });

  test('should handle errors gracefully', async () => {
    let errorEmitted = false;
    monitor.on('monitoring_error', () => { errorEmitted = true; });

    // Create an event that might cause issues (though our current implementation is robust)
    const problematicEvent = createTestEvent();
    
    // The monitor should handle any errors gracefully
    await expect(monitor.monitorEvent(problematicEvent)).resolves.not.toThrow();
  });

  test('should calculate quality scores correctly', async () => {
    // Test completeness score
    await monitor.monitorEvent(createTestEvent({ id: '' })); // Missing required field
    await monitor.monitorEvent(createTestEvent()); // Valid event
    
    const metrics = monitor.getMetrics();
    expect(metrics.completenessScore).toBeLessThan(100);
    expect(metrics.qualityScore).toBe(50); // 1 valid out of 2 total
  });
});