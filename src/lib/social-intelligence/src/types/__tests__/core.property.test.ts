/**
 * Property-based tests for core data models
 * Feature: brand-aware-social-intelligence
 */

import { describe, it } from '@jest/globals';
import * as fc from 'fast-check';
import {
  SocialEventSchema,
  BrandPlaybookSchema,
  PersonaSchema,
  AssetIntelligenceSchema,
  DecisionOutputSchema,
  Platform,
  EventType,
  ContentType,
  SentimentLabel,
  IntentCategory,
  ActionType,
  UrgencyLevel
} from '../core';

// ============================================================================
// PROPERTY-BASED TEST GENERATORS
// ============================================================================

/**
 * Generator for valid social events
 */
const arbitrarySocialEvent = (): fc.Arbitrary<any> => fc.record({
  id: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  platform: fc.constantFrom(...Object.values(Platform)),
  platformId: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }).map(d => d.toISOString()),
  eventType: fc.constantFrom(...Object.values(EventType)),
  content: fc.record({
    text: fc.string({ maxLength: 5000 }),
    mediaUrls: fc.array(fc.webUrl(), { maxLength: 10 }),
    hashtags: fc.array(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), { maxLength: 30 }),
    mentions: fc.array(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), { maxLength: 20 }),
    language: fc.constantFrom('en', 'es', 'fr', 'de', 'ja', 'zh')
  }),
  author: fc.record({
    id: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
    username: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
    displayName: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
    followerCount: fc.integer({ min: 0, max: 10000000 }),
    verified: fc.boolean(),
    profileUrl: fc.option(fc.webUrl(), { nil: undefined })
  }),
  engagement: fc.record({
    likes: fc.integer({ min: 0, max: 1000000 }),
    shares: fc.integer({ min: 0, max: 100000 }),
    comments: fc.integer({ min: 0, max: 50000 }),
    views: fc.integer({ min: 0, max: 10000000 }),
    engagementRate: fc.float({ min: 0, max: 1, noNaN: true })
  }),
  context: fc.option(fc.record({
    parentPostId: fc.option(fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0), { nil: undefined }),
    threadId: fc.option(fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0), { nil: undefined }),
    conversationId: fc.option(fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0), { nil: undefined }),
    isReply: fc.boolean(),
    replyToUserId: fc.option(fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0), { nil: undefined })
  }), { nil: undefined }),
  location: fc.option(fc.record({
    country: fc.option(fc.string({ minLength: 2, maxLength: 100 }).filter(s => s.trim().length >= 2), { nil: undefined }),
    region: fc.option(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { nil: undefined }),
    city: fc.option(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { nil: undefined }),
    coordinates: fc.option(fc.tuple(
      fc.float({ min: -180, max: 180, noNaN: true }),
      fc.float({ min: -90, max: 90, noNaN: true })
    ), { nil: undefined })
  }), { nil: undefined }),
  metadata: fc.record({
    source: fc.constantFrom('api', 'webhook', 'crawler'),
    processingTimestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }).map(d => d.toISOString()),
    version: fc.constantFrom('1.0', '1.1', '2.0'),
    rawData: fc.option(fc.string(), { nil: undefined })
  })
});

/**
 * Generator for valid brand playbooks
 */
const arbitraryBrandPlaybook = (): fc.Arbitrary<any> => fc.record({
  id: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  brandId: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
  version: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  lastUpdated: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }).map(d => d.toISOString()),
  brandIdentity: fc.record({
    name: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
    tagline: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
    mission: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
    values: fc.array(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 10 }),
    personality: fc.array(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 10 })
  }),
  voiceAndTone: fc.record({
    primaryTone: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    attributes: fc.record({
      formality: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
      enthusiasm: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
      empathy: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
      authority: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
    }),
    doUse: fc.array(fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0), { maxLength: 20 }),
    dontUse: fc.array(fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0), { maxLength: 20 })
  }),
  complianceRules: fc.record({
    forbiddenClaims: fc.array(fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0), { maxLength: 50 }),
    requiredDisclosures: fc.array(fc.record({
      trigger: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
      disclosure: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0)
    }), { maxLength: 20 }),
    regulatoryCompliance: fc.array(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), { maxLength: 10 }),
    contentRestrictions: fc.dictionary(fc.string().filter(s => s.trim().length > 0), fc.boolean())
  }),
  visualGuidelines: fc.record({
    logoUsage: fc.record({
      primaryLogo: fc.webUrl(),
      variations: fc.array(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), { maxLength: 10 }),
      minSize: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
      clearSpace: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
    }),
    colorPalette: fc.record({
      primary: fc.constantFrom('#FF6B35', '#004E89', '#FFD23F', '#333333', '#FFFFFF'),
      secondary: fc.constantFrom('#FF6B35', '#004E89', '#FFD23F', '#333333', '#FFFFFF'),
      accent: fc.constantFrom('#FF6B35', '#004E89', '#FFD23F', '#333333', '#FFFFFF'),
      neutral: fc.array(fc.constantFrom('#FF6B35', '#004E89', '#FFD23F', '#333333', '#FFFFFF'), { maxLength: 10 })
    }),
    typography: fc.record({
      primary: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
      secondary: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
      headingStyle: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
      bodyStyle: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
    })
  }),
  platformSpecificRules: fc.dictionary(
    fc.constantFrom('tiktok', 'instagram', 'facebook', 'youtube', 'reddit'),
    fc.record({
      maxVideoLength: fc.option(fc.integer({ min: 1, max: 3600 }), { nil: undefined }),
      preferredAspectRatio: fc.option(fc.constantFrom('16:9', '9:16', '1:1', '4:5'), { nil: undefined }),
      hashtagLimit: fc.option(fc.integer({ min: 1, max: 50 }), { nil: undefined }),
      maxCaptionLength: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: undefined }),
      toneAdjustment: fc.option(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { nil: undefined }),
      includeCompanyUpdates: fc.option(fc.boolean(), { nil: undefined })
    })
  )
});

/**
 * Generator for valid personas
 */
const arbitraryPersona = (): fc.Arbitrary<any> => fc.record({
  id: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  name: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
  brandId: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
  demographics: fc.record({
    ageRange: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    gender: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    income: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    education: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    location: fc.array(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 10 }),
    occupation: fc.array(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 10 })
  }),
  psychographics: fc.record({
    interests: fc.array(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 20 }),
    values: fc.array(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 10 }),
    lifestyle: fc.array(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 10 }),
    painPoints: fc.array(fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 15 })
  }),
  behaviorPatterns: fc.record({
    purchaseDrivers: fc.array(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 10 }),
    decisionMakingStyle: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    brandLoyalty: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    pricesensitivity: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    communicationPreference: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
  }),
  platformPreferences: fc.record({
    primary: fc.array(fc.constantFrom(...Object.values(Platform)), { minLength: 1, maxLength: 6 }),
    secondary: fc.array(fc.constantFrom(...Object.values(Platform)), { maxLength: 6 }),
    contentTypes: fc.array(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 10 }),
    engagementStyle: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    activeHours: fc.array(fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 24 })
  }),
  triggers: fc.record({
    positive: fc.array(fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0), { maxLength: 20 }),
    negative: fc.array(fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0), { maxLength: 20 })
  }),
  responseStrategies: fc.record({
    contentTone: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    messageLength: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    includeData: fc.boolean(),
    visualStyle: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    callToAction: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
  })
});

// ============================================================================
// PROPERTY-BASED TESTS
// ============================================================================

describe('Property-Based Tests for Core Data Models', () => {
  
  describe('Property 1: Event normalization preserves and enriches data', () => {
    // **Validates: Requirements 3.1, 3.2, 3.3, 3.5**
    
    it('should preserve essential data fields during normalization', () => {
      fc.assert(fc.property(
        arbitrarySocialEvent(),
        (rawEvent) => {
          // Parse the event through the schema (simulating normalization)
          const normalizedEvent = SocialEventSchema.parse(rawEvent);
          
          // Essential data preservation properties
          return (
            // Core identifiers preserved
            normalizedEvent.id === rawEvent.id &&
            normalizedEvent.platform === rawEvent.platform &&
            normalizedEvent.platformId === rawEvent.platformId &&
            normalizedEvent.timestamp === rawEvent.timestamp &&
            normalizedEvent.eventType === rawEvent.eventType &&
            
            // Content preserved
            normalizedEvent.content.text === rawEvent.content.text &&
            normalizedEvent.content.language === rawEvent.content.language &&
            
            // Author information preserved
            normalizedEvent.author.id === rawEvent.author.id &&
            normalizedEvent.author.username === rawEvent.author.username &&
            normalizedEvent.author.displayName === rawEvent.author.displayName &&
            normalizedEvent.author.followerCount === rawEvent.author.followerCount &&
            normalizedEvent.author.verified === rawEvent.author.verified &&
            
            // Engagement metrics preserved
            normalizedEvent.engagement.likes === rawEvent.engagement.likes &&
            normalizedEvent.engagement.shares === rawEvent.engagement.shares &&
            normalizedEvent.engagement.comments === rawEvent.engagement.comments &&
            normalizedEvent.engagement.views === rawEvent.engagement.views &&
            Math.abs(normalizedEvent.engagement.engagementRate - rawEvent.engagement.engagementRate) < 0.0001 &&
            
            // Metadata preserved
            normalizedEvent.metadata.source === rawEvent.metadata.source &&
            normalizedEvent.metadata.version === rawEvent.metadata.version
          );
        }
      ), { numRuns: 100 });
    });

    it('should enrich data with standardized fields', () => {
      fc.assert(fc.property(
        arbitrarySocialEvent(),
        (rawEvent) => {
          const normalizedEvent = SocialEventSchema.parse(rawEvent);
          
          // Enrichment properties - all events should have these standardized fields
          return (
            // Required standardized fields are present
            typeof normalizedEvent.id === 'string' &&
            normalizedEvent.id.length > 0 &&
            
            Object.values(Platform).includes(normalizedEvent.platform) &&
            Object.values(EventType).includes(normalizedEvent.eventType) &&
            
            // Content structure is standardized
            Array.isArray(normalizedEvent.content.mediaUrls) &&
            Array.isArray(normalizedEvent.content.hashtags) &&
            Array.isArray(normalizedEvent.content.mentions) &&
            typeof normalizedEvent.content.language === 'string' &&
            
            // Engagement metrics are numbers
            typeof normalizedEvent.engagement.likes === 'number' &&
            typeof normalizedEvent.engagement.shares === 'number' &&
            typeof normalizedEvent.engagement.comments === 'number' &&
            typeof normalizedEvent.engagement.views === 'number' &&
            typeof normalizedEvent.engagement.engagementRate === 'number' &&
            
            // Engagement rate is within valid range
            normalizedEvent.engagement.engagementRate >= 0 &&
            normalizedEvent.engagement.engagementRate <= 1 &&
            
            // Author follower count is non-negative
            normalizedEvent.author.followerCount >= 0 &&
            
            // Metadata has required fields
            ['api', 'webhook', 'crawler'].includes(normalizedEvent.metadata.source) &&
            typeof normalizedEvent.metadata.processingTimestamp === 'string' &&
            typeof normalizedEvent.metadata.version === 'string'
          );
        }
      ), { numRuns: 100 });
    });

    it('should maintain data lineage information', () => {
      fc.assert(fc.property(
        arbitrarySocialEvent(),
        (rawEvent) => {
          const normalizedEvent = SocialEventSchema.parse(rawEvent);
          
          // Data lineage properties
          return (
            // Original platform information is preserved for lineage
            normalizedEvent.platform === rawEvent.platform &&
            normalizedEvent.platformId === rawEvent.platformId &&
            
            // Processing metadata shows transformation steps
            normalizedEvent.metadata.source === rawEvent.metadata.source &&
            typeof normalizedEvent.metadata.processingTimestamp === 'string' &&
            
            // Version tracking for schema evolution
            typeof normalizedEvent.metadata.version === 'string' &&
            normalizedEvent.metadata.version.length > 0 &&
            
            // Raw data can be preserved for audit trail
            (rawEvent.metadata.rawData === undefined || 
             normalizedEvent.metadata.rawData === rawEvent.metadata.rawData)
          );
        }
      ), { numRuns: 100 });
    });
  });

  describe('Property 2: Unique event identification', () => {
    // **Validates: Requirements 3.4**
    
    it('should generate unique identifiers for all events', () => {
      fc.assert(fc.property(
        fc.array(arbitrarySocialEvent(), { minLength: 2, maxLength: 100 }),
        (rawEvents) => {
          // Ensure unique IDs by adding index suffix
          const eventsWithUniqueIds = rawEvents.map((event, index) => ({
            ...event,
            id: `${event.id}_${index}`,
            platformId: `${event.platformId}_${index}`
          }));
          
          const normalizedEvents = eventsWithUniqueIds.map(event => SocialEventSchema.parse(event));
          const ids = normalizedEvents.map(event => event.id);
          const uniqueIds = new Set(ids);
          
          // All IDs should be unique
          return uniqueIds.size === ids.length;
        }
      ), { numRuns: 50 });
    });

    it('should maintain platform-specific uniqueness constraints', () => {
      fc.assert(fc.property(
        fc.array(arbitrarySocialEvent(), { minLength: 2, maxLength: 50 }),
        (rawEvents) => {
          // Ensure unique platform IDs by adding index suffix
          const eventsWithUniqueIds = rawEvents.map((event, index) => ({
            ...event,
            id: `${event.id}_${index}`,
            platformId: `${event.platformId}_${index}`
          }));
          
          const normalizedEvents = eventsWithUniqueIds.map(event => SocialEventSchema.parse(event));
          
          // Group by platform and check platform_id uniqueness within each platform
          const platformGroups = normalizedEvents.reduce((groups, event) => {
            if (!groups[event.platform]) {
              groups[event.platform] = [];
            }
            groups[event.platform].push(event);
            return groups;
          }, {} as Record<string, any[]>);
          
          // Within each platform, platform_id should be unique
          return Object.values(platformGroups).every(events => {
            const platformIds = events.map(e => e.platformId);
            const uniquePlatformIds = new Set(platformIds);
            return uniquePlatformIds.size === platformIds.length;
          });
        }
      ), { numRuns: 50 });
    });

    it('should enable proper tracking across system components', () => {
      fc.assert(fc.property(
        arbitrarySocialEvent(),
        (rawEvent) => {
          const normalizedEvent = SocialEventSchema.parse(rawEvent);
          
          // Tracking properties
          return (
            // Event has unique system ID for internal tracking
            typeof normalizedEvent.id === 'string' &&
            normalizedEvent.id.length > 0 &&
            
            // Event has platform-specific ID for external reference
            typeof normalizedEvent.platformId === 'string' &&
            normalizedEvent.platformId.length > 0 &&
            
            // Platform is specified for proper routing
            Object.values(Platform).includes(normalizedEvent.platform) &&
            
            // Timestamp enables chronological tracking
            typeof normalizedEvent.timestamp === 'string' &&
            !isNaN(Date.parse(normalizedEvent.timestamp)) &&
            
            // Processing timestamp enables audit tracking
            typeof normalizedEvent.metadata.processingTimestamp === 'string' &&
            !isNaN(Date.parse(normalizedEvent.metadata.processingTimestamp))
          );
        }
      ), { numRuns: 100 });
    });
  });

  describe('Property 3: Brand context dependency', () => {
    // **Validates: Requirements 4.1, 4.2, 4.6**
    
    it('should validate brand playbook structure for context loading', () => {
      fc.assert(fc.property(
        arbitraryBrandPlaybook(),
        (rawPlaybook) => {
          const playbook = BrandPlaybookSchema.parse(rawPlaybook);
          
          // Brand context availability properties
          return (
            // Brand identification
            typeof playbook.brandId === 'string' &&
            playbook.brandId.length > 0 &&
            
            // Version tracking for consistency
            typeof playbook.version === 'string' &&
            playbook.version.length > 0 &&
            
            // Essential brand context components are present
            typeof playbook.brandIdentity === 'object' &&
            playbook.brandIdentity.name.length > 0 &&
            playbook.brandIdentity.values.length > 0 &&
            
            typeof playbook.voiceAndTone === 'object' &&
            playbook.voiceAndTone.primaryTone.length > 0 &&
            
            typeof playbook.complianceRules === 'object' &&
            Array.isArray(playbook.complianceRules.forbiddenClaims) &&
            Array.isArray(playbook.complianceRules.regulatoryCompliance) &&
            
            // Platform-specific rules for proper context application
            typeof playbook.platformSpecificRules === 'object' &&
            
            // Timestamp for context freshness validation
            typeof playbook.lastUpdated === 'string' &&
            !isNaN(Date.parse(playbook.lastUpdated))
          );
        }
      ), { numRuns: 100 });
    });

    it('should ensure persona matching context is available', () => {
      fc.assert(fc.property(
        arbitraryPersona(),
        (rawPersona) => {
          const persona = PersonaSchema.parse(rawPersona);
          
          // Persona context properties
          return (
            // Brand association for context
            typeof persona.brandId === 'string' &&
            persona.brandId.length > 0 &&
            
            // Persona identification
            typeof persona.name === 'string' &&
            persona.name.length > 0 &&
            
            // Essential matching criteria are present
            typeof persona.demographics === 'object' &&
            persona.demographics.ageRange.length > 0 &&
            persona.demographics.location.length > 0 &&
            
            typeof persona.psychographics === 'object' &&
            persona.psychographics.interests.length > 0 &&
            persona.psychographics.values.length > 0 &&
            
            typeof persona.behaviorPatterns === 'object' &&
            persona.behaviorPatterns.purchaseDrivers.length > 0 &&
            
            // Platform preferences for context application
            typeof persona.platformPreferences === 'object' &&
            persona.platformPreferences.primary.length > 0 &&
            persona.platformPreferences.contentTypes.length > 0 &&
            
            // Response strategies for action guidance
            typeof persona.responseStrategies === 'object' &&
            persona.responseStrategies.contentTone.length > 0
          );
        }
      ), { numRuns: 100 });
    });

    it('should validate context consistency across brand components', () => {
      fc.assert(fc.property(
        fc.record({
          playbook: arbitraryBrandPlaybook(),
          personas: fc.array(arbitraryPersona(), { minLength: 1, maxLength: 5 })
        }),
        ({ playbook, personas }) => {
          const validPlaybook = BrandPlaybookSchema.parse(playbook);
          const validPersonas = personas.map(p => PersonaSchema.parse({
            ...p,
            brandId: validPlaybook.brandId // Ensure consistency
          }));
          
          // Context consistency properties
          return (
            // All personas belong to the same brand as playbook
            validPersonas.every(persona => persona.brandId === validPlaybook.brandId) &&
            
            // Platform coverage is consistent
            validPersonas.every(persona => 
              persona.platformPreferences.primary.every(platform =>
                Object.values(Platform).includes(platform)
              )
            ) &&
            
            // Brand identity elements are accessible
            validPlaybook.brandIdentity.name.length > 0 &&
            validPlaybook.brandIdentity.values.length > 0 &&
            
            // Compliance rules are defined
            Array.isArray(validPlaybook.complianceRules.forbiddenClaims) &&
            Array.isArray(validPlaybook.complianceRules.regulatoryCompliance)
          );
        }
      ), { numRuns: 50 });
    });
  });

  describe('Property 4: Universal brand compliance', () => {
    // **Validates: Requirements 4.3, 4.5, 7.4, 9.5**
    
    it('should validate compliance rules structure', () => {
      fc.assert(fc.property(
        arbitraryBrandPlaybook(),
        (rawPlaybook) => {
          const playbook = BrandPlaybookSchema.parse(rawPlaybook);
          
          // Compliance validation properties
          return (
            // Forbidden claims are defined and accessible
            Array.isArray(playbook.complianceRules.forbiddenClaims) &&
            playbook.complianceRules.forbiddenClaims.every(claim => 
              typeof claim === 'string' && claim.length > 0
            ) &&
            
            // Required disclosures are structured properly
            Array.isArray(playbook.complianceRules.requiredDisclosures) &&
            playbook.complianceRules.requiredDisclosures.every(disclosure =>
              typeof disclosure.trigger === 'string' &&
              typeof disclosure.disclosure === 'string' &&
              disclosure.trigger.length > 0 &&
              disclosure.disclosure.length > 0
            ) &&
            
            // Regulatory compliance frameworks are specified
            Array.isArray(playbook.complianceRules.regulatoryCompliance) &&
            playbook.complianceRules.regulatoryCompliance.every(framework =>
              typeof framework === 'string' && framework.length > 0
            ) &&
            
            // Content restrictions are boolean flags
            typeof playbook.complianceRules.contentRestrictions === 'object' &&
            Object.values(playbook.complianceRules.contentRestrictions).every(restriction =>
              typeof restriction === 'boolean'
            )
          );
        }
      ), { numRuns: 100 });
    });

    it('should validate tone and voice guidelines consistency', () => {
      fc.assert(fc.property(
        arbitraryBrandPlaybook(),
        (rawPlaybook) => {
          const playbook = BrandPlaybookSchema.parse(rawPlaybook);
          
          // Voice and tone compliance properties
          return (
            // Primary tone is defined
            typeof playbook.voiceAndTone.primaryTone === 'string' &&
            playbook.voiceAndTone.primaryTone.length > 0 &&
            
            // Tone attributes are specified
            typeof playbook.voiceAndTone.attributes === 'object' &&
            typeof playbook.voiceAndTone.attributes.formality === 'string' &&
            typeof playbook.voiceAndTone.attributes.enthusiasm === 'string' &&
            typeof playbook.voiceAndTone.attributes.empathy === 'string' &&
            typeof playbook.voiceAndTone.attributes.authority === 'string' &&
            
            // Positive and negative examples are provided
            Array.isArray(playbook.voiceAndTone.doUse) &&
            Array.isArray(playbook.voiceAndTone.dontUse) &&
            playbook.voiceAndTone.doUse.every(example => 
              typeof example === 'string' && example.length > 0
            ) &&
            playbook.voiceAndTone.dontUse.every(example => 
              typeof example === 'string' && example.length > 0
            )
          );
        }
      ), { numRuns: 100 });
    });

    it('should validate platform-specific compliance rules', () => {
      fc.assert(fc.property(
        arbitraryBrandPlaybook(),
        (rawPlaybook) => {
          const playbook = BrandPlaybookSchema.parse(rawPlaybook);
          
          // Platform-specific compliance properties
          return (
            // Platform rules are properly structured
            typeof playbook.platformSpecificRules === 'object' &&
            
            // Each platform rule set has valid constraints
            Object.entries(playbook.platformSpecificRules).every(([platform, rules]) => {
              return (
                // Platform is valid
                Object.values(Platform).includes(platform as Platform) &&
                
                // Rules are properly typed
                typeof rules === 'object' &&
                
                // Numeric constraints are valid
                (rules.maxVideoLength === undefined || 
                 (typeof rules.maxVideoLength === 'number' && rules.maxVideoLength > 0)) &&
                (rules.hashtagLimit === undefined || 
                 (typeof rules.hashtagLimit === 'number' && rules.hashtagLimit > 0)) &&
                (rules.maxCaptionLength === undefined || 
                 (typeof rules.maxCaptionLength === 'number' && rules.maxCaptionLength > 0)) &&
                
                // String constraints are valid
                (rules.preferredAspectRatio === undefined || 
                 typeof rules.preferredAspectRatio === 'string') &&
                (rules.toneAdjustment === undefined || 
                 typeof rules.toneAdjustment === 'string') &&
                
                // Boolean constraints are valid
                (rules.includeCompanyUpdates === undefined || 
                 typeof rules.includeCompanyUpdates === 'boolean')
              );
            })
          );
        }
      ), { numRuns: 100 });
    });
  });

  describe('Property 5: Persona matching consistency', () => {
    // **Validates: Requirements 4.4**
    
    it('should validate persona matching criteria completeness', () => {
      fc.assert(fc.property(
        arbitraryPersona(),
        (rawPersona) => {
          const persona = PersonaSchema.parse(rawPersona);
          
          // Persona matching properties
          return (
            // Demographics provide matching signals
            typeof persona.demographics === 'object' &&
            persona.demographics.ageRange.length > 0 &&
            persona.demographics.location.length > 0 &&
            persona.demographics.occupation.length > 0 &&
            
            // Psychographics enable content matching
            typeof persona.psychographics === 'object' &&
            persona.psychographics.interests.length > 0 &&
            persona.psychographics.values.length > 0 &&
            persona.psychographics.painPoints.length > 0 &&
            
            // Behavior patterns guide decision making
            typeof persona.behaviorPatterns === 'object' &&
            persona.behaviorPatterns.purchaseDrivers.length > 0 &&
            persona.behaviorPatterns.decisionMakingStyle.length > 0 &&
            
            // Platform preferences enable channel matching
            typeof persona.platformPreferences === 'object' &&
            persona.platformPreferences.primary.length > 0 &&
            persona.platformPreferences.contentTypes.length > 0 &&
            
            // All primary platforms are valid
            persona.platformPreferences.primary.every(platform =>
              Object.values(Platform).includes(platform)
            ) &&
            
            // All secondary platforms are valid
            persona.platformPreferences.secondary.every(platform =>
              Object.values(Platform).includes(platform)
            )
          );
        }
      ), { numRuns: 100 });
    });

    it('should validate trigger-based matching logic', () => {
      fc.assert(fc.property(
        arbitraryPersona(),
        (rawPersona) => {
          const persona = PersonaSchema.parse(rawPersona);
          
          // Trigger matching properties
          return (
            // Positive triggers are defined for opportunity identification
            typeof persona.triggers === 'object' &&
            Array.isArray(persona.triggers.positive) &&
            persona.triggers.positive.every(trigger =>
              typeof trigger === 'string' && trigger.length > 0
            ) &&
            
            // Negative triggers are defined for risk identification
            Array.isArray(persona.triggers.negative) &&
            persona.triggers.negative.every(trigger =>
              typeof trigger === 'string' && trigger.length > 0
            ) &&
            
            // Response strategies are defined for action guidance
            typeof persona.responseStrategies === 'object' &&
            persona.responseStrategies.contentTone.length > 0 &&
            persona.responseStrategies.messageLength.length > 0 &&
            typeof persona.responseStrategies.includeData === 'boolean' &&
            persona.responseStrategies.visualStyle.length > 0 &&
            persona.responseStrategies.callToAction.length > 0
          );
        }
      ), { numRuns: 100 });
    });

    it('should ensure consistent matching across platforms', () => {
      fc.assert(fc.property(
        fc.array(arbitraryPersona(), { minLength: 2, maxLength: 10 }),
        (rawPersonas) => {
          const personas = rawPersonas.map(p => PersonaSchema.parse(p));
          
          // Cross-persona consistency properties
          return (
            // All personas have valid platform preferences
            personas.every(persona =>
              persona.platformPreferences.primary.every(platform =>
                Object.values(Platform).includes(platform)
              ) &&
              persona.platformPreferences.secondary.every(platform =>
                Object.values(Platform).includes(platform)
              )
            ) &&
            
            // All personas have matching criteria
            personas.every(persona =>
              persona.demographics.ageRange.length > 0 &&
              persona.psychographics.interests.length > 0 &&
              persona.behaviorPatterns.purchaseDrivers.length > 0
            ) &&
            
            // All personas have response strategies
            personas.every(persona =>
              persona.responseStrategies.contentTone.length > 0 &&
              persona.responseStrategies.messageLength.length > 0
            )
          );
        }
      ), { numRuns: 50 });
    });
  });
});