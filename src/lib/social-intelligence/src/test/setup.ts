/**
 * Test setup and configuration for Social Intelligence Engine
 */

import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { initializeDatabase, getDatabase } from '../database/connection';

// Test database configuration
const TEST_DB_CONFIG = {
  url: process.env.TEST_SUPABASE_URL || 'http://localhost:54321',
  anonKey: process.env.TEST_SUPABASE_ANON_KEY || 'test-anon-key',
  serviceRoleKey: process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || 'test-service-key',
  schema: 'public'
};

// Global test setup
beforeAll(async () => {
  // Initialize test database
  try {
    initializeDatabase(TEST_DB_CONFIG);
    const db = getDatabase();
    
    // Test connection
    const isConnected = await db.testConnection();
    if (!isConnected) {
      console.warn('Test database connection failed - some tests may be skipped');
    }
  } catch (error) {
    console.warn('Test database setup failed:', error);
  }
});

// Global test teardown
afterAll(async () => {
  // Cleanup test data if needed
  try {
    // TODO: Add cleanup logic for test data
  } catch (error) {
    console.warn('Test cleanup failed:', error);
  }
});

// Per-test setup
beforeEach(async () => {
  // Reset any test state
});

// Per-test teardown
afterEach(async () => {
  // Clean up test data
});

// Test utilities
export const testUtils = {
  /**
   * Create a test social event
   */
  createTestSocialEvent: (overrides = {}) => ({
    id: 'test-event-' + Math.random().toString(36).substr(2, 9),
    platform: 'tiktok',
    platformId: 'test-platform-id',
    timestamp: new Date().toISOString(),
    eventType: 'post',
    content: {
      text: 'Test social media post content',
      mediaUrls: [],
      hashtags: ['#test'],
      mentions: [],
      language: 'en'
    },
    author: {
      id: 'test-author-id',
      username: 'testuser',
      displayName: 'Test User',
      followerCount: 1000,
      verified: false
    },
    engagement: {
      likes: 10,
      shares: 2,
      comments: 5,
      views: 100,
      engagementRate: 0.17
    },
    metadata: {
      source: 'api',
      processingTimestamp: new Date().toISOString(),
      version: '1.0'
    },
    ...overrides
  }),

  /**
   * Create a test brand playbook
   */
  createTestBrandPlaybook: (overrides = {}) => ({
    id: 'test-playbook-' + Math.random().toString(36).substr(2, 9),
    brandId: 'test-brand-id',
    version: '1.0',
    lastUpdated: new Date().toISOString(),
    brandIdentity: {
      name: 'Test Brand',
      tagline: 'Test tagline',
      mission: 'Test mission',
      values: ['innovation', 'quality'],
      personality: ['friendly', 'professional']
    },
    voiceAndTone: {
      primaryTone: 'friendly_professional',
      attributes: {
        formality: 'casual_professional',
        enthusiasm: 'moderate',
        empathy: 'high',
        authority: 'confident_humble'
      },
      doUse: ['We\'re excited to help'],
      dontUse: ['That\'s not our problem']
    },
    complianceRules: {
      forbiddenClaims: ['guaranteed results'],
      requiredDisclosures: [],
      regulatoryCompliance: ['FTC'],
      contentRestrictions: {}
    },
    visualGuidelines: {
      logoUsage: {
        primaryLogo: 'https://example.com/logo.svg',
        variations: ['dark', 'light'],
        minSize: '24px',
        clearSpace: '2x logo height'
      },
      colorPalette: {
        primary: '#FF6B35',
        secondary: '#004E89',
        accent: '#FFD23F',
        neutral: ['#FFFFFF', '#333333']
      },
      typography: {
        primary: 'Inter',
        secondary: 'Roboto',
        headingStyle: 'bold',
        bodyStyle: 'regular'
      }
    },
    platformSpecificRules: {
      tiktok: {
        maxVideoLength: 180,
        hashtagLimit: 5,
        toneAdjustment: 'more_casual'
      }
    },
    ...overrides
  }),

  /**
   * Create a test persona
   */
  createTestPersona: (overrides = {}) => ({
    id: 'test-persona-' + Math.random().toString(36).substr(2, 9),
    name: 'Test Persona',
    brandId: 'test-brand-id',
    demographics: {
      ageRange: '25-35',
      gender: 'any',
      income: '$50k-$100k',
      education: 'college_graduate',
      location: ['urban'],
      occupation: ['software_engineer']
    },
    psychographics: {
      interests: ['technology'],
      values: ['efficiency'],
      lifestyle: ['early_adopter'],
      painPoints: ['too many options']
    },
    behaviorPatterns: {
      purchaseDrivers: ['product_reviews'],
      decisionMakingStyle: 'research_heavy',
      brandLoyalty: 'moderate',
      pricesensitivity: 'medium',
      communicationPreference: 'direct_honest'
    },
    platformPreferences: {
      primary: ['instagram'],
      secondary: ['tiktok'],
      contentTypes: ['how_to_videos'],
      engagementStyle: 'comments_and_shares',
      activeHours: ['9am-11am']
    },
    triggers: {
      positive: ['new_product_launch'],
      negative: ['poor_customer_service']
    },
    responseStrategies: {
      contentTone: 'informative_friendly',
      messageLength: 'medium_detailed',
      includeData: true,
      visualStyle: 'clean_modern',
      callToAction: 'soft_educational'
    },
    ...overrides
  }),

  /**
   * Wait for a specified amount of time
   */
  wait: (ms: number): Promise<void> => 
    new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Generate random test data
   */
  randomString: (length = 10): string => 
    Math.random().toString(36).substring(2, length + 2),

  randomNumber: (min = 0, max = 100): number => 
    Math.floor(Math.random() * (max - min + 1)) + min,

  randomDate: (daysBack = 30): Date => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - (Math.random() * daysBack * 24 * 60 * 60 * 1000));
    return pastDate;
  }
};