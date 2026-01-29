/**
 * Property-Based Tests for Brand Context Integration
 * Tests universal correctness properties for brand context dependency,
 * compliance validation, and persona matching
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import fc from 'fast-check';
import { BrandContextService, BrandContextConfig } from '../BrandContextService';
import { PersonaMatchingEngine, PersonaMatchConfig } from '../PersonaMatchingEngine';
import { ComplianceValidationService, ComplianceConfig } from '../ComplianceValidationService';
import { BaseRepository } from '../../database/repositories/base';
import { SocialEvent, BrandPlaybook, Persona, Platform, EventType, SentimentLabel } from '../../types/core';

// Mock repository for testing
class MockRepository extends BaseRepository {
  private mockData: Map<string, any> = new Map();

  constructor() {
    super({} as any); // Mock connection
  }

  setMockData(key: string, data: any): void {
    this.mockData.set(key, data);
  }

  async query(sql: string, params: any[]): Promise<{ rows: any[] }> {
    // Mock query responses based on SQL patterns
    if (sql.includes('brand_playbooks')) {
      const brandId = params[0];
      const playbook = this.mockData.get(`playbook_${brandId}`);
      return { rows: playbook ? [playbook] : [] };
    }
    
    if (sql.includes('personas')) {
      const brandId = params[0];
      const personas = this.mockData.get(`personas_${brandId}`);
      return { rows: personas || [] };
    }

    return { rows: [] };
  }
}

// Test data generators
const arbitraryBrandId = fc.string({ minLength: 1, maxLength: 50 });

const arbitraryBrandPlaybook = fc.record({
  id: fc.string(),
  brand_id: fc.string(),
  version: fc.string(),
  last_updated: fc.date().map(d => d.toISOString()),
  name: fc.string(),
  tagline: fc.string(),
  mission: fc.string(),
  values: fc.array(fc.string()).map(arr => JSON.stringify(arr)),
  personality: fc.array(fc.string()).map(arr => JSON.stringify(arr)),
  primary_tone: fc.constantFrom('professional', 'friendly', 'casual', 'authoritative'),
  attributes: fc.record({
    formality: fc.constantFrom('formal', 'moderate', 'informal'),
    enthusiasm: fc.constantFrom('low', 'moderate', 'high'),
    empathy: fc.constantFrom('low', 'moderate', 'high'),
    authority: fc.constantFrom('low', 'moderate', 'high')
  }).map(obj => JSON.stringify(obj)),
  do_use: fc.array(fc.string()).map(arr => JSON.stringify(arr)),
  dont_use: fc.array(fc.string()).map(arr => JSON.stringify(arr)),
  forbidden_claims: fc.array(fc.string()).map(arr => JSON.stringify(arr)),
  required_disclosures: fc.array(fc.record({
    trigger: fc.string(),
    disclosure: fc.string()
  })).map(arr => JSON.stringify(arr)),
  regulatory_compliance: fc.array(fc.string()).map(arr => JSON.stringify(arr)),
  content_restrictions: fc.record({
    noExternalLinks: fc.boolean(),
    noCompetitorMentions: fc.boolean(),
    requireHashtags: fc.boolean()
  }).map(obj => JSON.stringify(obj))
});

const arbitraryPersonaData = fc.record({
  id: fc.string(),
  name: fc.string(),
  brand_id: fc.string(),
  age_range: fc.constantFrom('18-24', '25-34', '35-44', '45-54', '55+'),
  gender: fc.constantFrom('male', 'female', 'all'),
  income: fc.constantFrom('low', 'middle', 'high'),
  education: fc.constantFrom('high_school', 'college', 'graduate'),
  location: fc.array(fc.string()).map(arr => JSON.stringify(arr)),
  occupation: fc.array(fc.string()).map(arr => JSON.stringify(arr)),
  interests: fc.array(fc.string()).map(arr => JSON.stringify(arr)),
  persona_values: fc.array(fc.string()).map(arr => JSON.stringify(arr)),
  lifestyle: fc.array(fc.string()).map(arr => JSON.stringify(arr)),
  pain_points: fc.array(fc.string()).map(arr => JSON.stringify(arr)),
  purchase_drivers: fc.array(fc.string()).map(arr => JSON.stringify(arr)),
  decision_making_style: fc.constantFrom('research-driven', 'impulse-driven', 'social-driven'),
  brand_loyalty: fc.constantFrom('low', 'moderate', 'high'),
  price_sensitivity: fc.constantFrom('low', 'moderate', 'high'),
  communication_preference: fc.constantFrom('formal', 'casual', 'authentic'),
  primary_platforms: fc.array(fc.constantFrom('instagram', 'tiktok', 'facebook', 'youtube')).map(arr => JSON.stringify(arr)),
  secondary_platforms: fc.array(fc.constantFrom('instagram', 'tiktok', 'facebook', 'youtube')).map(arr => JSON.stringify(arr)),
  content_types: fc.array(fc.constantFrom('video', 'image', 'text')).map(arr => JSON.stringify(arr)),
  engagement_style: fc.constantFrom('passive', 'interactive', 'high'),
  active_hours: fc.array(fc.string()).map(arr => JSON.stringify(arr)),
  positive_triggers: fc.array(fc.string()).map(arr => JSON.stringify(arr)),
  negative_triggers: fc.array(fc.string()).map(arr => JSON.stringify(arr)),
  content_tone: fc.constantFrom('friendly', 'professional', 'casual'),
  message_length: fc.constantFrom('short', 'medium', 'long'),
  include_data: fc.boolean(),
  visual_style: fc.constantFrom('clean', 'bold', 'minimal'),
  call_to_action: fc.constantFrom('soft', 'direct', 'urgent')
});

const arbitrarySocialEvent = fc.record({
  id: fc.string(),
  platform: fc.constantFrom(...Object.values(Platform)),
  platformId: fc.string(),
  timestamp: fc.date().map(d => d.toISOString()),
  eventType: fc.constantFrom(...Object.values(EventType)),
  content: fc.record({
    text: fc.string({ minLength: 1, maxLength: 500 }),
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

describe('Brand Context Integration - Property Tests', () => {
  let mockRepository: MockRepository;
  let brandContextService: BrandContextService;
  let personaMatchingEngine: PersonaMatchingEngine;
  let complianceValidationService: ComplianceValidationService;

  beforeEach(() => {
    mockRepository = new MockRepository();
    
    const brandConfig: BrandContextConfig = {
      cache: {
        ttlMs: 300000,
        maxSize: 100,
        refreshIntervalMs: 60000
      },
      database: {
        connectionString: 'mock://connection',
        timeout: 5000
      },
      errorHandling: {
        maxRetries: 3,
        retryDelayMs: 1000,
        fallbackToCache: true,
        escalationThreshold: 0.1
      }
    };

    const personaConfig: PersonaMatchConfig = {
      weights: {
        contentAnalysis: 0.3,
        platformPreference: 0.25,
        demographicSignals: 0.2,
        behaviorPatterns: 0.15,
        temporalPatterns: 0.1
      },
      thresholds: {
        highConfidence: 0.8,
        mediumConfidence: 0.6,
        minimumMatch: 0.3
      },
      contentAnalysis: {
        keywordWeight: 0.4,
        sentimentWeight: 0.3,
        topicWeight: 0.2,
        languageWeight: 0.1
      }
    };

    const complianceConfig: ComplianceConfig = {
      nlp: {
        confidenceThreshold: 0.7,
        contextWindowSize: 50,
        enableSemanticAnalysis: true
      },
      regulations: {
        fda: true,
        ftc: true,
        eu: true,
        custom: []
      },
      toneAnalysis: {
        strictness: 'medium',
        checkEmotionalTone: true,
        checkFormality: true,
        checkAuthority: true
      }
    };

    brandContextService = new BrandContextService(brandConfig, mockRepository);
    personaMatchingEngine = new PersonaMatchingEngine(personaConfig);
    complianceValidationService = new ComplianceValidationService(complianceConfig);
  });

  /**
   * Property 3: Brand context dependency
   * **Validates: Requirements 4.1, 4.2, 4.6**
   * 
   * Universal Property: Brand context must be successfully loaded and cached
   * for any valid brand ID, and subsequent requests should use cached data
   * until expiration.
   */
  it('Property 3: Brand context dependency - context loading and caching consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryBrandId,
        arbitraryBrandPlaybook,
        fc.array(arbitraryPersonaData, { minLength: 1, maxLength: 5 }),
        async (brandId, playbookData, personasData) => {
          // Setup mock data
          mockRepository.setMockData(`playbook_${brandId}`, playbookData);
          mockRepository.setMockData(`personas_${brandId}`, personasData);

          // First load - should fetch from database
          const context1 = await brandContextService.loadBrandContext(brandId);
          
          // Verify context structure
          expect(context1).toBeDefined();
          expect(context1.brandId).toBe(brandId);
          expect(context1.playbook).toBeDefined();
          expect(context1.personas).toBeDefined();
          expect(context1.personas.length).toBeGreaterThan(0);

          // Second load - should use cache
          const context2 = await brandContextService.loadBrandContext(brandId);
          
          // Verify cache consistency
          expect(context2.brandId).toBe(context1.brandId);
          expect(context2.playbook.id).toBe(context1.playbook.id);
          expect(context2.playbook.version).toBe(context1.playbook.version);
          expect(context2.personas.length).toBe(context1.personas.length);

          // Verify metrics show cache hit
          const metrics = brandContextService.getMetrics();
          expect(metrics.cacheHits).toBeGreaterThan(0);
          expect(metrics.brandContextsLoaded).toBeGreaterThan(0);

          // Verify brand context contains all required components
          expect(context1.playbook.brandIdentity).toBeDefined();
          expect(context1.playbook.voiceAndTone).toBeDefined();
          expect(context1.playbook.complianceRules).toBeDefined();
          expect(context1.personas.every(p => p.brandId === brandId)).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: Universal brand compliance
   * **Validates: Requirements 4.3, 4.5, 7.4, 9.5**
   * 
   * Universal Property: Compliance validation must always return consistent
   * results for the same content and brand playbook combination, and must
   * detect all configured violations.
   */
  it('Property 4: Universal brand compliance - consistent violation detection', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySocialEvent,
        arbitraryBrandPlaybook,
        async (event, playbookData) => {
          // Create brand playbook from mock data
          const playbook: BrandPlaybook = {
            id: playbookData.id,
            brandId: playbookData.brand_id,
            version: playbookData.version,
            lastUpdated: playbookData.last_updated,
            brandIdentity: {
              name: playbookData.name,
              tagline: playbookData.tagline,
              mission: playbookData.mission,
              values: JSON.parse(playbookData.values),
              personality: JSON.parse(playbookData.personality)
            },
            voiceAndTone: {
              primaryTone: playbookData.primary_tone,
              attributes: JSON.parse(playbookData.attributes),
              doUse: JSON.parse(playbookData.do_use),
              dontUse: JSON.parse(playbookData.dont_use)
            },
            complianceRules: {
              forbiddenClaims: JSON.parse(playbookData.forbidden_claims),
              requiredDisclosures: JSON.parse(playbookData.required_disclosures),
              regulatoryCompliance: JSON.parse(playbookData.regulatory_compliance),
              contentRestrictions: JSON.parse(playbookData.content_restrictions)
            },
            visualGuidelines: {
              logoUsage: {
                primaryLogo: 'https://example.com/logo.png',
                variations: [],
                minSize: '24px',
                clearSpace: '1x'
              },
              colorPalette: {
                primary: '#000000',
                secondary: '#666666',
                accent: '#0066cc',
                neutral: ['#f5f5f5']
              },
              typography: {
                primary: 'Arial',
                secondary: 'Georgia',
                headingStyle: 'bold',
                bodyStyle: 'normal'
              }
            },
            platformSpecificRules: {}
          };

          // Run compliance validation twice
          const result1 = await complianceValidationService.validateCompliance(event, playbook);
          const result2 = await complianceValidationService.validateCompliance(event, playbook);

          // Verify consistency
          expect(result1.isCompliant).toBe(result2.isCompliant);
          expect(result1.overallScore).toBe(result2.overallScore);
          expect(result1.violations.length).toBe(result2.violations.length);
          expect(result1.warnings.length).toBe(result2.warnings.length);

          // Verify result structure
          expect(result1.overallScore).toBeGreaterThanOrEqual(0);
          expect(result1.overallScore).toBeLessThanOrEqual(1);
          expect(result1.violations).toBeInstanceOf(Array);
          expect(result1.warnings).toBeInstanceOf(Array);
          expect(result1.toneAnalysis).toBeDefined();
          expect(result1.toneAnalysis.score).toBeGreaterThanOrEqual(0);
          expect(result1.toneAnalysis.score).toBeLessThanOrEqual(1);

          // Verify violation detection logic
          if (result1.violations.length > 0) {
            expect(result1.isCompliant).toBe(false);
            // Each violation should have required fields
            result1.violations.forEach(violation => {
              expect(violation.type).toBeDefined();
              expect(violation.severity).toBeDefined();
              expect(violation.description).toBeDefined();
              expect(violation.confidence).toBeGreaterThanOrEqual(0);
              expect(violation.confidence).toBeLessThanOrEqual(1);
            });
          }

          // Verify forbidden claims detection
          const forbiddenClaims = playbook.complianceRules.forbiddenClaims;
          for (const claim of forbiddenClaims) {
            if (event.content.text.toLowerCase().includes(claim.toLowerCase())) {
              const hasViolation = result1.violations.some(v => 
                v.type === 'forbidden_claim' && v.detectedText.toLowerCase().includes(claim.toLowerCase())
              );
              expect(hasViolation).toBe(true);
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Persona matching consistency
   * **Validates: Requirements 4.4**
   * 
   * Universal Property: Persona matching must return consistent confidence
   * scores for identical events and personas, and confidence scores must
   * correlate with matching factors.
   */
  it('Property 5: Persona matching consistency - deterministic confidence scoring', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySocialEvent,
        fc.array(arbitraryPersonaData, { minLength: 1, maxLength: 5 }),
        async (event, personasData) => {
          // Convert mock data to Persona objects
          const personas: Persona[] = personasData.map(data => ({
            id: data.id,
            name: data.name,
            brandId: data.brand_id,
            demographics: {
              ageRange: data.age_range,
              gender: data.gender,
              income: data.income,
              education: data.education,
              location: JSON.parse(data.location),
              occupation: JSON.parse(data.occupation)
            },
            psychographics: {
              interests: JSON.parse(data.interests),
              values: JSON.parse(data.persona_values),
              lifestyle: JSON.parse(data.lifestyle),
              painPoints: JSON.parse(data.pain_points)
            },
            behaviorPatterns: {
              purchaseDrivers: JSON.parse(data.purchase_drivers),
              decisionMakingStyle: data.decision_making_style,
              brandLoyalty: data.brand_loyalty,
              pricesensitivity: data.price_sensitivity,
              communicationPreference: data.communication_preference
            },
            platformPreferences: {
              primary: JSON.parse(data.primary_platforms) as Platform[],
              secondary: JSON.parse(data.secondary_platforms) as Platform[],
              contentTypes: JSON.parse(data.content_types),
              engagementStyle: data.engagement_style,
              activeHours: JSON.parse(data.active_hours)
            },
            triggers: {
              positive: JSON.parse(data.positive_triggers),
              negative: JSON.parse(data.negative_triggers)
            },
            responseStrategies: {
              contentTone: data.content_tone,
              messageLength: data.message_length,
              includeData: data.include_data,
              visualStyle: data.visual_style,
              callToAction: data.call_to_action
            }
          }));

          // Run persona matching twice
          const match1 = await personaMatchingEngine.matchPersona(event, personas);
          const match2 = await personaMatchingEngine.matchPersona(event, personas);

          // Verify consistency
          if (match1 && match2) {
            expect(match1.persona.id).toBe(match2.persona.id);
            expect(match1.confidence).toBe(match2.confidence);
            expect(match1.matchingFactors.contentScore).toBe(match2.matchingFactors.contentScore);
            expect(match1.matchingFactors.platformScore).toBe(match2.matchingFactors.platformScore);
            expect(match1.matchingFactors.demographicScore).toBe(match2.matchingFactors.demographicScore);
            expect(match1.matchingFactors.behaviorScore).toBe(match2.matchingFactors.behaviorScore);
            expect(match1.matchingFactors.temporalScore).toBe(match2.matchingFactors.temporalScore);
          } else {
            expect(match1).toBe(match2); // Both should be null
          }

          // Get all matches for detailed analysis
          const allMatches = await personaMatchingEngine.getAllMatches(event, personas);

          // Verify confidence score properties
          for (const match of allMatches) {
            // Confidence should be between 0 and 1
            expect(match.confidence).toBeGreaterThanOrEqual(0);
            expect(match.confidence).toBeLessThanOrEqual(1);

            // Individual factor scores should be between 0 and 1
            expect(match.matchingFactors.contentScore).toBeGreaterThanOrEqual(0);
            expect(match.matchingFactors.contentScore).toBeLessThanOrEqual(1);
            expect(match.matchingFactors.platformScore).toBeGreaterThanOrEqual(0);
            expect(match.matchingFactors.platformScore).toBeLessThanOrEqual(1);
            expect(match.matchingFactors.demographicScore).toBeGreaterThanOrEqual(0);
            expect(match.matchingFactors.demographicScore).toBeLessThanOrEqual(1);
            expect(match.matchingFactors.behaviorScore).toBeGreaterThanOrEqual(0);
            expect(match.matchingFactors.behaviorScore).toBeLessThanOrEqual(1);
            expect(match.matchingFactors.temporalScore).toBeGreaterThanOrEqual(0);
            expect(match.matchingFactors.temporalScore).toBeLessThanOrEqual(1);

            // Reasoning should be provided
            expect(match.reasoning).toBeInstanceOf(Array);
            expect(match.reasoning.length).toBeGreaterThan(0);

            // Platform preference should affect platform score
            if (match.persona.platformPreferences.primary.includes(event.platform)) {
              expect(match.matchingFactors.platformScore).toBeGreaterThan(0.5);
            }
          }

          // Verify matches are sorted by confidence (descending)
          for (let i = 1; i < allMatches.length; i++) {
            expect(allMatches[i-1].confidence).toBeGreaterThanOrEqual(allMatches[i].confidence);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});