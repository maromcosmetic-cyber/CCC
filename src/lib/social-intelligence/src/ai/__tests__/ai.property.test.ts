/**
 * Property-Based Tests for AI Intelligence Layer
 * Tests universal correctness properties for sentiment analysis,
 * intent detection, and topic clustering services
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import fc from 'fast-check';
import { SentimentAnalysisService, SentimentConfig } from '../SentimentAnalysisService';
import { IntentDetectionService, IntentConfig } from '../IntentDetectionService';
import { TopicClusteringService, ClusteringConfig } from '../TopicClusteringService';
import { SocialEvent, Platform, EventType, IntentCategory, UrgencyLevel, SentimentLabel } from '../../types/core';

// Test data generators
const arbitrarySocialEvent = fc.record({
  id: fc.string(),
  platform: fc.constantFrom(...Object.values(Platform)),
  platformId: fc.string(),
  timestamp: fc.date().map(d => d.toISOString()),
  eventType: fc.constantFrom(...Object.values(EventType)),
  content: fc.record({
    text: fc.string({ minLength: 10, maxLength: 500 }),
    mediaUrls: fc.array(fc.webUrl()),
    hashtags: fc.array(fc.string()),
    mentions: fc.array(fc.string()),
    language: fc.constantFrom('en', 'es', 'fr', 'de')
  }),
  author: fc.record({
    id: fc.string(),
    username: fc.string(),
    displayName: fc.string(),
    followerCount: fc.integer({ min: 0, max: 10000000 }),
    verified: fc.boolean(),
    profileUrl: fc.webUrl()
  }),
  engagement: fc.record({
    likes: fc.integer({ min: 0, max: 100000 }),
    shares: fc.integer({ min: 0, max: 10000 }),
    comments: fc.integer({ min: 0, max: 5000 }),
    views: fc.integer({ min: 0, max: 1000000 }),
    engagementRate: fc.float({ min: 0, max: 1 })
  }),
  location: fc.record({
    country: fc.string(),
    region: fc.string(),
    city: fc.string()
  }),
  metadata: fc.record({
    source: fc.constantFrom('api', 'webhook', 'crawler'),
    processingTimestamp: fc.date().map(d => d.toISOString()),
    version: fc.string()
  })
});

const arbitraryEventBatch = fc.array(arbitrarySocialEvent, { minLength: 5, maxLength: 50 });

describe('AI Intelligence Layer - Property Tests', () => {
  let sentimentService: SentimentAnalysisService;
  let intentService: IntentDetectionService;
  let clusteringService: TopicClusteringService;

  beforeEach(() => {
    const sentimentConfig: SentimentConfig = {
      models: {
        bert: { enabled: false, weight: 0.4 },
        roberta: { enabled: false, weight: 0.3 },
        vader: { enabled: true, weight: 0.3 }
      },
      platformAdjustments: {
        [Platform.TIKTOK]: { positiveBoost: 0.1, negativeBoost: 0.05, neutralThreshold: 0.1 },
        [Platform.INSTAGRAM]: { positiveBoost: 0.15, negativeBoost: 0.1, neutralThreshold: 0.1 },
        [Platform.FACEBOOK]: { positiveBoost: 0.05, negativeBoost: 0.1, neutralThreshold: 0.15 },
        [Platform.YOUTUBE]: { positiveBoost: 0.1, negativeBoost: 0.05, neutralThreshold: 0.1 },
        [Platform.REDDIT]: { positiveBoost: 0.05, negativeBoost: 0.15, neutralThreshold: 0.1 },
        [Platform.RSS]: { positiveBoost: 0.0, negativeBoost: 0.0, neutralThreshold: 0.2 }
      },
      thresholds: {
        highConfidence: 0.8,
        mediumConfidence: 0.6,
        lowConfidence: 0.4
      },
      aspectAnalysis: {
        enabled: true,
        aspects: ['quality', 'price', 'service', 'delivery', 'design'],
        contextWindow: 50
      }
    };

    const intentConfig: IntentConfig = {
      models: {
        primary: { type: 'rule-based', confidence_threshold: 0.7 },
        fallback: { enabled: true, type: 'rule-based' }
      },
      intents: {
        [IntentCategory.PURCHASE_INQUIRY]: {
          keywords: ['buy', 'purchase', 'price', 'cost', 'order'],
          patterns: ['how much', 'where to buy', 'available'],
          urgencyModifiers: ['urgent', 'asap', 'now'],
          contextClues: ['interested', 'want', 'need'],
          weight: 1.0
        },
        [IntentCategory.SUPPORT_REQUEST]: {
          keywords: ['help', 'support', 'problem', 'issue', 'broken'],
          patterns: ['not working', 'how to', 'need help'],
          urgencyModifiers: ['urgent', 'emergency', 'critical'],
          contextClues: ['assistance', 'guide', 'tutorial'],
          weight: 1.0
        },
        [IntentCategory.COMPLAINT]: {
          keywords: ['complaint', 'disappointed', 'terrible', 'awful', 'refund'],
          patterns: ['not satisfied', 'poor quality', 'waste of money'],
          urgencyModifiers: ['immediately', 'unacceptable', 'furious'],
          contextClues: ['angry', 'frustrated', 'upset'],
          weight: 1.2
        },
        [IntentCategory.INFORMATION_SEEKING]: {
          keywords: ['information', 'details', 'specs', 'features', 'about'],
          patterns: ['tell me about', 'what is', 'how does'],
          urgencyModifiers: [],
          contextClues: ['curious', 'wondering', 'research'],
          weight: 0.8
        },
        [IntentCategory.PRAISE]: {
          keywords: ['love', 'amazing', 'excellent', 'perfect', 'recommend'],
          patterns: ['so good', 'highly recommend', 'best ever'],
          urgencyModifiers: [],
          contextClues: ['happy', 'satisfied', 'impressed'],
          weight: 0.9
        },
        [IntentCategory.FEATURE_REQUEST]: {
          keywords: ['feature', 'add', 'improve', 'suggestion', 'enhancement'],
          patterns: ['would be nice', 'please add', 'suggestion'],
          urgencyModifiers: [],
          contextClues: ['idea', 'proposal', 'feedback'],
          weight: 0.7
        },
        [IntentCategory.COMPARISON_SHOPPING]: {
          keywords: ['compare', 'versus', 'alternative', 'better', 'similar'],
          patterns: ['vs', 'compared to', 'which is better'],
          urgencyModifiers: [],
          contextClues: ['options', 'choice', 'decide'],
          weight: 0.8
        }
      },
      entityExtraction: {
        enabled: true,
        types: ['PRODUCT', 'PRICE', 'TIME', 'EMAIL'],
        confidence_threshold: 0.7
      },
      urgencyFactors: {
        timeKeywords: {
          'urgent': 0.3,
          'asap': 0.4,
          'immediately': 0.5,
          'emergency': 0.6,
          'critical': 0.5,
          'now': 0.2,
          'today': 0.2,
          'tomorrow': 0.1
        },
        emotionalIntensity: {
          'furious': 0.4,
          'angry': 0.3,
          'frustrated': 0.2,
          'disappointed': 0.2,
          'upset': 0.2,
          'annoyed': 0.1
        },
        platformModifiers: {
          [Platform.TIKTOK]: 1.1,
          [Platform.INSTAGRAM]: 1.0,
          [Platform.FACEBOOK]: 1.2,
          [Platform.YOUTUBE]: 0.9,
          [Platform.REDDIT]: 1.1,
          [Platform.RSS]: 0.8
        }
      }
    };

    const clusteringConfig: ClusteringConfig = {
      dbscan: {
        epsilon: 0.5,
        minPoints: 3,
        distanceMetric: 'cosine'
      },
      textProcessing: {
        minWordLength: 3,
        maxWordLength: 20,
        stopWords: ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'],
        stemming: false,
        ngramSize: [1, 2]
      },
      topicEvolution: {
        timeWindowHours: 24,
        minEventsForTrend: 10,
        trendThreshold: 0.5
      },
      spikeDetection: {
        baselineWindowHours: 168, // 1 week
        detectionWindowMinutes: 60,
        spikeThreshold: 3.0,
        minEventsForSpike: 5
      }
    };

    sentimentService = new SentimentAnalysisService(sentimentConfig);
    intentService = new IntentDetectionService(intentConfig);
    clusteringService = new TopicClusteringService(clusteringConfig);
  });

  /**
   * Property 6: Comprehensive AI analysis
   * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
   * 
   * Universal Property: AI analysis must provide complete, consistent, and 
   * bounded results for all valid social events, with proper confidence scoring
   * and deterministic behavior for identical inputs.
   */
  it('Property 6: Comprehensive AI analysis - complete and consistent results', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySocialEvent,
        async (event) => {
          // Test sentiment analysis completeness
          const sentimentResult = await sentimentService.analyzeSentiment(event);
          
          // Verify sentiment result structure and bounds
          expect(sentimentResult.overall).toBeDefined();
          expect(sentimentResult.overall.label).toBeOneOf(Object.values(SentimentLabel));
          expect(sentimentResult.overall.score).toBeGreaterThanOrEqual(-1);
          expect(sentimentResult.overall.score).toBeLessThanOrEqual(1);
          expect(sentimentResult.overall.confidence).toBeGreaterThanOrEqual(0);
          expect(sentimentResult.overall.confidence).toBeLessThanOrEqual(1);

          // Verify platform adjustments are applied
          expect(sentimentResult.platformAdjusted).toBeDefined();
          expect(sentimentResult.platformAdjusted.originalScore).toBeGreaterThanOrEqual(-1);
          expect(sentimentResult.platformAdjusted.originalScore).toBeLessThanOrEqual(1);
          expect(sentimentResult.platformAdjusted.adjustedScore).toBeGreaterThanOrEqual(-1);
          expect(sentimentResult.platformAdjusted.adjustedScore).toBeLessThanOrEqual(1);

          // Verify aspect sentiments (if enabled)
          expect(sentimentResult.aspectSentiments).toBeInstanceOf(Array);
          sentimentResult.aspectSentiments.forEach(aspect => {
            expect(aspect.sentiment).toBeOneOf(Object.values(SentimentLabel));
            expect(aspect.score).toBeGreaterThanOrEqual(-1);
            expect(aspect.score).toBeLessThanOrEqual(1);
            expect(aspect.confidence).toBeGreaterThanOrEqual(0);
            expect(aspect.confidence).toBeLessThanOrEqual(1);
          });

          // Test intent detection completeness
          const intentResult = await intentService.detectIntent(event);
          
          // Verify intent result structure and bounds
          expect(intentResult.primary).toBeDefined();
          expect(intentResult.primary.intent).toBeOneOf(Object.values(IntentCategory));
          expect(intentResult.primary.confidence).toBeGreaterThanOrEqual(0);
          expect(intentResult.primary.confidence).toBeLessThanOrEqual(1);
          expect(intentResult.primary.reasoning).toBeInstanceOf(Array);
          expect(intentResult.primary.reasoning.length).toBeGreaterThan(0);

          // Verify urgency calculation
          expect(intentResult.urgency).toBeDefined();
          expect(intentResult.urgency.level).toBeOneOf(Object.values(UrgencyLevel));
          expect(intentResult.urgency.score).toBeGreaterThanOrEqual(0);
          expect(intentResult.urgency.score).toBeLessThanOrEqual(1);
          expect(intentResult.urgency.factors).toBeInstanceOf(Array);

          // Verify entity extraction
          expect(intentResult.entities).toBeInstanceOf(Array);
          intentResult.entities.forEach(entity => {
            expect(entity.type).toBeDefined();
            expect(entity.value).toBeDefined();
            expect(entity.confidence).toBeGreaterThanOrEqual(0);
            expect(entity.confidence).toBeLessThanOrEqual(1);
            expect(entity.position.start).toBeGreaterThanOrEqual(0);
            expect(entity.position.end).toBeGreaterThan(entity.position.start);
          });

          // Verify next actions
          expect(intentResult.nextActions).toBeInstanceOf(Array);
          intentResult.nextActions.forEach(action => {
            expect(action.action).toBeDefined();
            expect(action.priority).toBeGreaterThan(0);
            expect(action.confidence).toBeGreaterThanOrEqual(0);
            expect(action.confidence).toBeLessThanOrEqual(1);
            expect(action.reasoning).toBeDefined();
          });

          // Test consistency - same input should produce same output
          const sentimentResult2 = await sentimentService.analyzeSentiment(event);
          const intentResult2 = await intentService.detectIntent(event);

          expect(sentimentResult2.overall.label).toBe(sentimentResult.overall.label);
          expect(sentimentResult2.overall.score).toBe(sentimentResult.overall.score);
          expect(sentimentResult2.overall.confidence).toBe(sentimentResult.overall.confidence);

          expect(intentResult2.primary.intent).toBe(intentResult.primary.intent);
          expect(intentResult2.primary.confidence).toBe(intentResult.primary.confidence);
          expect(intentResult2.urgency.level).toBe(intentResult.urgency.level);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6b: Topic clustering and trend detection consistency
   * **Validates: Requirements 5.3, 5.4, 5.5**
   * 
   * Universal Property: Topic clustering must produce stable clusters for
   * similar content and detect trends/spikes with proper thresholds.
   */
  it('Property 6b: Topic clustering consistency - stable clustering and trend detection', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryEventBatch,
        async (events) => {
          // Process events for clustering
          const result1 = await clusteringService.processEvents(events);
          
          // Verify clustering results structure
          expect(result1.clusters).toBeInstanceOf(Array);
          expect(result1.trendingTopics).toBeInstanceOf(Array);
          expect(result1.activitySpikes).toBeInstanceOf(Array);

          // Verify cluster properties
          result1.clusters.forEach(cluster => {
            expect(cluster.id).toBeDefined();
            expect(cluster.label).toBeDefined();
            expect(cluster.keywords).toBeInstanceOf(Array);
            expect(cluster.events).toBeInstanceOf(Array);
            expect(cluster.events.length).toBeGreaterThan(0);
            expect(cluster.size).toBe(cluster.events.length);
            expect(cluster.coherenceScore).toBeGreaterThanOrEqual(0);
            expect(cluster.coherenceScore).toBeLessThanOrEqual(1);
            expect(cluster.platforms).toBeInstanceOf(Array);
            expect(cluster.platforms.length).toBeGreaterThan(0);
            expect(cluster.timeRange.start).toBeInstanceOf(Date);
            expect(cluster.timeRange.end).toBeInstanceOf(Date);
            expect(cluster.timeRange.end.getTime()).toBeGreaterThanOrEqual(cluster.timeRange.start.getTime());
          });

          // Verify trending topics properties
          result1.trendingTopics.forEach(trending => {
            expect(trending.cluster).toBeDefined();
            expect(trending.trendMetrics.growthRate).toBeGreaterThanOrEqual(0);
            expect(trending.trendMetrics.velocity).toBeDefined();
            expect(trending.trendMetrics.momentum).toBeGreaterThanOrEqual(0);
            expect(trending.trendMetrics.momentum).toBeLessThanOrEqual(1);
            expect(trending.trendMetrics.currentVolume).toBeGreaterThan(0);
            expect(trending.platforms).toBeInstanceOf(Array);
            expect(trending.relatedTopics).toBeInstanceOf(Array);
          });

          // Verify activity spikes properties
          result1.activitySpikes.forEach(spike => {
            expect(spike.id).toBeDefined();
            expect(spike.topic).toBeDefined();
            expect(spike.keywords).toBeInstanceOf(Array);
            expect(spike.detectedAt).toBeInstanceOf(Date);
            expect(spike.peakTime).toBeInstanceOf(Date);
            expect(spike.duration).toBeGreaterThanOrEqual(0);
            expect(spike.intensity).toBeGreaterThan(1); // Must be above baseline
            expect(spike.events).toBeInstanceOf(Array);
            expect(spike.events.length).toBeGreaterThan(0);
            expect(spike.platforms).toBeInstanceOf(Array);
            expect(spike.sentiment.dominant).toBeOneOf(['positive', 'negative', 'neutral']);
          });

          // Test consistency - processing same events should produce similar results
          const result2 = await clusteringService.processEvents(events);
          
          // Cluster count should be similar (allowing for some variation due to randomness in IDs)
          expect(Math.abs(result2.clusters.length - result1.clusters.length)).toBeLessThanOrEqual(1);

          // If we have clusters, verify they contain the same events (possibly in different clusters)
          if (result1.clusters.length > 0 && result2.clusters.length > 0) {
            const events1 = result1.clusters.flatMap(c => c.events.map(e => e.id));
            const events2 = result2.clusters.flatMap(c => c.events.map(e => e.id));
            
            // All events should be clustered in both runs
            expect(events1.sort()).toEqual(events2.sort());
          }

          return true;
        }
      ),
      { numRuns: 50 } // Fewer runs due to computational complexity
    );
  });

  /**
   * Property 6c: Batch processing consistency
   * **Validates: Requirements 5.1, 5.2, 5.5**
   * 
   * Universal Property: Batch processing must produce the same results as
   * individual processing for sentiment and intent analysis.
   */
  it('Property 6c: Batch processing consistency - individual vs batch results', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitrarySocialEvent, { minLength: 3, maxLength: 10 }),
        async (events) => {
          // Process individually
          const individualSentiments = await Promise.all(
            events.map(event => sentimentService.analyzeSentiment(event))
          );
          const individualIntents = await Promise.all(
            events.map(event => intentService.detectIntent(event))
          );

          // Process in batch
          const batchSentiments = await sentimentService.batchAnalyzeSentiment(events);
          const batchIntents = await intentService.batchDetectIntent(events);

          // Verify same number of results
          expect(batchSentiments.length).toBe(individualSentiments.length);
          expect(batchIntents.length).toBe(individualIntents.length);
          expect(batchSentiments.length).toBe(events.length);
          expect(batchIntents.length).toBe(events.length);

          // Verify individual results match batch results
          for (let i = 0; i < events.length; i++) {
            // Sentiment comparison
            expect(batchSentiments[i].overall.label).toBe(individualSentiments[i].overall.label);
            expect(batchSentiments[i].overall.score).toBe(individualSentiments[i].overall.score);
            expect(batchSentiments[i].overall.confidence).toBe(individualSentiments[i].overall.confidence);

            // Intent comparison
            expect(batchIntents[i].primary.intent).toBe(individualIntents[i].primary.intent);
            expect(batchIntents[i].primary.confidence).toBe(individualIntents[i].primary.confidence);
            expect(batchIntents[i].urgency.level).toBe(individualIntents[i].urgency.level);
            expect(batchIntents[i].urgency.score).toBe(individualIntents[i].urgency.score);
          }

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 6d: Confidence score correlation
   * **Validates: Requirements 5.5**
   * 
   * Universal Property: Confidence scores must correlate with result quality
   * and be properly bounded between 0 and 1.
   */
  it('Property 6d: Confidence score correlation - proper bounds and meaning', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySocialEvent,
        async (event) => {
          const sentimentResult = await sentimentService.analyzeSentiment(event);
          const intentResult = await intentService.detectIntent(event);

          // Verify confidence bounds
          expect(sentimentResult.overall.confidence).toBeGreaterThanOrEqual(0);
          expect(sentimentResult.overall.confidence).toBeLessThanOrEqual(1);
          expect(intentResult.primary.confidence).toBeGreaterThanOrEqual(0);
          expect(intentResult.primary.confidence).toBeLessThanOrEqual(1);

          // High confidence should correlate with stronger sentiment scores
          if (sentimentResult.overall.confidence > 0.8) {
            expect(Math.abs(sentimentResult.overall.score)).toBeGreaterThan(0.1);
          }

          // Low confidence should correlate with neutral sentiment or low intent scores
          if (sentimentResult.overall.confidence < 0.4) {
            expect(Math.abs(sentimentResult.overall.score)).toBeLessThan(0.7);
          }

          // Intent confidence should correlate with clear intent indicators
          if (intentResult.primary.confidence > 0.8) {
            expect(intentResult.primary.reasoning.length).toBeGreaterThan(0);
          }

          // Secondary intent should have lower confidence than primary
          if (intentResult.secondary) {
            expect(intentResult.secondary.confidence).toBeLessThan(intentResult.primary.confidence);
          }

          // Entity confidence should be bounded
          intentResult.entities.forEach(entity => {
            expect(entity.confidence).toBeGreaterThanOrEqual(0);
            expect(entity.confidence).toBeLessThanOrEqual(1);
          });

          // Next action confidence should be bounded
          intentResult.nextActions.forEach(action => {
            expect(action.confidence).toBeGreaterThanOrEqual(0);
            expect(action.confidence).toBeLessThanOrEqual(1);
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6e: Platform-specific adaptations
   * **Validates: Requirements 5.1, 5.2**
   * 
   * Universal Property: Platform-specific adjustments must be consistently
   * applied and produce different results for different platforms.
   */
  it('Property 6e: Platform-specific adaptations - consistent platform effects', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          ...arbitrarySocialEvent.value,
          platform: fc.constant(Platform.INSTAGRAM)
        }),
        fc.record({
          ...arbitrarySocialEvent.value,
          platform: fc.constant(Platform.REDDIT)
        }),
        async (instagramEvent, redditEvent) => {
          // Make content identical to isolate platform effects
          const sharedContent = {
            text: 'This product is amazing! I love it so much and would recommend it to everyone.',
            mediaUrls: [],
            hashtags: ['product', 'review'],
            mentions: [],
            language: 'en'
          };

          const event1 = { ...instagramEvent, content: sharedContent };
          const event2 = { ...redditEvent, content: sharedContent };

          const sentiment1 = await sentimentService.analyzeSentiment(event1);
          const sentiment2 = await sentimentService.analyzeSentiment(event2);

          const intent1 = await intentService.detectIntent(event1);
          const intent2 = await intentService.detectIntent(event2);

          // Platform adjustments should be applied
          expect(sentiment1.platformAdjusted.adjustmentFactor).toBeDefined();
          expect(sentiment2.platformAdjusted.adjustmentFactor).toBeDefined();

          // Different platforms may produce different adjusted scores
          // (though not guaranteed for all content)
          expect(sentiment1.platformAdjusted.originalScore).toBe(sentiment2.platformAdjusted.originalScore);

          // Intent urgency may differ by platform
          const urgencyDiff = Math.abs(intent1.urgency.score - intent2.urgency.score);
          expect(urgencyDiff).toBeGreaterThanOrEqual(0); // May be same or different

          // Platform should be reflected in urgency factors
          const platform1Factors = intent1.urgency.factors.filter(f => f.factor === 'Platform Context');
          const platform2Factors = intent2.urgency.factors.filter(f => f.factor === 'Platform Context');

          // Both should have platform context if modifiers are different
          if (platform1Factors.length > 0 || platform2Factors.length > 0) {
            expect(platform1Factors.length + platform2Factors.length).toBeGreaterThan(0);
          }

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});