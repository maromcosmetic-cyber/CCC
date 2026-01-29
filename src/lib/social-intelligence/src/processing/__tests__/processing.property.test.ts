/**
 * Property-based tests for event processing services
 * Tests universal correctness properties with 100+ iterations
 */

import { describe, beforeEach, test, expect } from '@jest/globals';
import fc from 'fast-check';
import { EventNormalizationService } from '../EventNormalizationService';
import { EventDeduplicationService } from '../EventDeduplicationService';
import { Platform, SocialEventSchema } from '../../types/core';
import { RawPlatformData } from '../../ingestion/types';

describe('Event Processing Property Tests', () => {
  let normalizationService: EventNormalizationService;
  let deduplicationService: EventDeduplicationService;

  beforeEach(() => {
    normalizationService = new EventNormalizationService();
    deduplicationService = new EventDeduplicationService({
      timeWindowMs: 60000,
      maxCacheSize: 1000,
      contentFields: ['text', 'mediaUrls', 'hashtags'],
      platformRules: {
        [Platform.TIKTOK]: { useContentHash: true, useTimestampWindow: true },
        [Platform.INSTAGRAM]: { useContentHash: true, useTimestampWindow: true },
        [Platform.FACEBOOK]: { useContentHash: true, useTimestampWindow: true },
        [Platform.YOUTUBE]: { useContentHash: true, useTimestampWindow: true },
        [Platform.REDDIT]: { useContentHash: true, useTimestampWindow: true },
        [Platform.RSS]: { useContentHash: true, useTimestampWindow: false }
      },
      persistence: {
        enabled: false,
        flushIntervalMs: 60000,
        retentionDays: 7
      }
    });
  });

  // Generators for test data
  const platformArb = fc.constantFrom(...Object.values(Platform));
  
  const rawPlatformDataArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }),
    platform: platformArb,
    timestamp: fc.date().map(d => d.toISOString()),
    type: fc.constantFrom('post', 'comment', 'mention', 'message', 'share', 'reaction'),
    data: fc.record({
      text: fc.string({ maxLength: 500 }),
      author_id: fc.string({ minLength: 1, maxLength: 20 }),
      username: fc.string({ minLength: 1, maxLength: 30 }),
      display_name: fc.string({ minLength: 1, maxLength: 50 }),
      follower_count: fc.integer({ min: 0, max: 10000000 }),
      likes: fc.integer({ min: 0, max: 1000000 }),
      shares: fc.integer({ min: 0, max: 100000 }),
      comments: fc.integer({ min: 0, max: 50000 }),
      views: fc.integer({ min: 0, max: 10000000 })
    }),
    metadata: fc.record({
      source: fc.constantFrom('api', 'webhook', 'crawler'),
      version: fc.constant('1.0')
    })
  }) as fc.Arbitrary<RawPlatformData>;

  /**
   * Property 1: Event normalization preserves and enriches data
   * Validates: Requirements 3.1, 3.2, 3.3, 3.5
   */
  test('Property 1: Event normalization preserves and enriches data', async () => {
    await fc.assert(
      fc.asyncProperty(rawPlatformDataArb, async (rawData) => {
        const normalizedEvent = await normalizationService.normalize(rawData);
        
        // Validate the normalized event conforms to schema
        const validationResult = SocialEventSchema.safeParse(normalizedEvent);
        expect(validationResult.success).toBe(true);
        
        if (!validationResult.success) {
          console.error('Validation errors:', validationResult.error.errors);
          return false;
        }
        
        const event = validationResult.data;
        
        // Property: Original platform and timestamp are preserved
        expect(event.platform).toBe(rawData.platform);
        expect(event.timestamp).toBe(rawData.timestamp);
        expect(event.platformId).toBe(rawData.id);
        
        // Property: Content is extracted and structured
        expect(event.content).toBeDefined();
        expect(typeof event.content.text).toBe('string');
        expect(Array.isArray(event.content.mediaUrls)).toBe(true);
        expect(Array.isArray(event.content.hashtags)).toBe(true);
        expect(Array.isArray(event.content.mentions)).toBe(true);
        
        // Property: Author information is extracted
        expect(event.author).toBeDefined();
        expect(typeof event.author.id).toBe('string');
        expect(typeof event.author.username).toBe('string');
        expect(typeof event.author.displayName).toBe('string');
        expect(typeof event.author.followerCount).toBe('number');
        expect(event.author.followerCount).toBeGreaterThanOrEqual(0);
        
        // Property: Engagement metrics are extracted and valid
        expect(event.engagement).toBeDefined();
        expect(event.engagement.likes).toBeGreaterThanOrEqual(0);
        expect(event.engagement.shares).toBeGreaterThanOrEqual(0);
        expect(event.engagement.comments).toBeGreaterThanOrEqual(0);
        expect(event.engagement.views).toBeGreaterThanOrEqual(0);
        expect(event.engagement.engagementRate).toBeGreaterThanOrEqual(0);
        expect(event.engagement.engagementRate).toBeLessThanOrEqual(1);
        
        // Property: Metadata includes processing information
        expect(event.metadata).toBeDefined();
        expect(event.metadata.source).toBe(rawData.metadata?.source || 'api');
        expect(event.metadata.processingTimestamp).toBeDefined();
        expect(event.metadata.version).toBeDefined();
        
        // Property: Event has unique ID
        expect(event.id).toBeDefined();
        expect(typeof event.id).toBe('string');
        expect(event.id.length).toBeGreaterThan(0);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
  /**
   * Property 2: Event deduplication generates unique IDs and detects duplicates
   * Validates: Requirements 3.4
   */
  test('Property 2: Event deduplication generates unique IDs and detects duplicates', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(rawPlatformDataArb, { minLength: 2, maxLength: 10 }), async (rawDataArray) => {
        const results = [];
        
        // Process all events
        for (const rawData of rawDataArray) {
          const result = await deduplicationService.processEvent(rawData);
          results.push({ rawData, result });
        }
        
        // Property: All events get unique IDs
        const uniqueIds = new Set(results.map(r => r.result.uniqueId));
        expect(uniqueIds.size).toBe(results.length);
        
        // Property: Identical events are detected as duplicates
        const identicalData = rawDataArray[0];
        const duplicateResult = await deduplicationService.processEvent(identicalData);
        
        // Should be detected as duplicate if processed before
        if (results.some(r => r.rawData.id === identicalData.id && r.rawData.platform === identicalData.platform)) {
          expect(duplicateResult.isDuplicate).toBe(true);
          expect(duplicateResult.duplicateOf).toBeDefined();
          expect(duplicateResult.confidence).toBeGreaterThan(0);
        }
        
        // Property: Confidence scores are valid
        for (const { result } of results) {
          expect(result.confidence).toBeGreaterThanOrEqual(0);
          expect(result.confidence).toBeLessThanOrEqual(1);
        }
        
        return true;
      }),
      { numRuns: 50 } // Fewer runs due to complexity
    );
  });

  /**
   * Property 3: Event processing maintains data lineage
   * Validates: Requirements 3.5
   */
  test('Property 3: Event processing maintains data lineage', async () => {
    await fc.assert(
      fc.asyncProperty(rawPlatformDataArb, async (rawData) => {
        const normalizedEvent = await normalizationService.normalize(rawData);
        const deduplicationResult = await deduplicationService.processEvent(rawData);
        
        // Property: Original raw data can be traced back
        expect(normalizedEvent.metadata.rawData).toBeDefined();
        
        // Property: Processing timestamp is recorded
        expect(normalizedEvent.metadata.processingTimestamp).toBeDefined();
        const processingTime = new Date(normalizedEvent.metadata.processingTimestamp);
        expect(processingTime.getTime()).toBeLessThanOrEqual(Date.now());
        
        // Property: Platform and original ID are preserved for lineage
        expect(normalizedEvent.platform).toBe(rawData.platform);
        expect(normalizedEvent.platformId).toBe(rawData.id);
        
        // Property: Deduplication result includes unique ID
        expect(deduplicationResult.uniqueId).toBeDefined();
        expect(typeof deduplicationResult.uniqueId).toBe('string');
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: Content extraction handles all platform variations
   * Validates: Requirements 3.1, 3.2
   */
  test('Property 4: Content extraction handles all platform variations', async () => {
    await fc.assert(
      fc.asyncProperty(platformArb, fc.record({
        text: fc.option(fc.string({ maxLength: 280 })),
        title: fc.option(fc.string({ maxLength: 100 })),
        message: fc.option(fc.string({ maxLength: 500 })),
        caption: fc.option(fc.string({ maxLength: 300 })),
        description: fc.option(fc.string({ maxLength: 1000 })),
        content: fc.option(fc.string({ maxLength: 2000 }))
      }), async (platform, contentData) => {
        const rawData: RawPlatformData = {
          id: 'test-id',
          platform,
          timestamp: new Date().toISOString(),
          type: 'post',
          data: contentData,
          metadata: { source: 'api', version: '1.0' }
        };
        
        const normalizedEvent = await normalizationService.normalize(rawData);
        
        // Property: Content text is always extracted (even if empty)
        expect(typeof normalizedEvent.content.text).toBe('string');
        
        // Property: Content arrays are always initialized
        expect(Array.isArray(normalizedEvent.content.mediaUrls)).toBe(true);
        expect(Array.isArray(normalizedEvent.content.hashtags)).toBe(true);
        expect(Array.isArray(normalizedEvent.content.mentions)).toBe(true);
        
        // Property: Language is detected or defaulted
        expect(typeof normalizedEvent.content.language).toBe('string');
        expect(normalizedEvent.content.language.length).toBeGreaterThan(0);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Engagement metrics are properly calculated
   * Validates: Requirements 3.3
   */
  test('Property 5: Engagement metrics are properly calculated', async () => {
    await fc.assert(
      fc.asyncProperty(fc.record({
        likes: fc.integer({ min: 0, max: 1000000 }),
        shares: fc.integer({ min: 0, max: 100000 }),
        comments: fc.integer({ min: 0, max: 50000 }),
        views: fc.integer({ min: 1, max: 10000000 }) // At least 1 view to avoid division by zero
      }), async (engagementData) => {
        const rawData: RawPlatformData = {
          id: 'test-engagement',
          platform: Platform.INSTAGRAM,
          timestamp: new Date().toISOString(),
          type: 'post',
          data: {
            text: 'Test post',
            ...engagementData
          },
          metadata: { source: 'api', version: '1.0' }
        };
        
        const normalizedEvent = await normalizationService.normalize(rawData);
        
        // Property: All engagement metrics are preserved
        expect(normalizedEvent.engagement.likes).toBe(engagementData.likes);
        expect(normalizedEvent.engagement.shares).toBe(engagementData.shares);
        expect(normalizedEvent.engagement.comments).toBe(engagementData.comments);
        expect(normalizedEvent.engagement.views).toBe(engagementData.views);
        
        // Property: Engagement rate is calculated correctly
        const totalEngagements = engagementData.likes + engagementData.shares + engagementData.comments;
        const expectedRate = totalEngagements / engagementData.views;
        expect(normalizedEvent.engagement.engagementRate).toBeCloseTo(expectedRate, 5);
        
        // Property: Engagement rate is within valid bounds
        expect(normalizedEvent.engagement.engagementRate).toBeGreaterThanOrEqual(0);
        expect(normalizedEvent.engagement.engagementRate).toBeLessThanOrEqual(1);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
});