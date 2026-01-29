/**
 * Brand Context Service
 * Loads brand guidelines, compliance rules, and personas from existing CCC infrastructure
 * Implements caching and refresh mechanisms for brand data
 * Handles brand context unavailability with proper error escalation
 */

import { BrandPlaybook, Persona, BrandContext } from '../types/core';
import { BaseRepository } from '../database/repositories/base';

export interface BrandContextConfig {
  // Cache configuration
  cache: {
    ttlMs: number; // Time to live for cached data
    maxSize: number; // Maximum number of cached brand contexts
    refreshIntervalMs: number; // Background refresh interval
  };
  // Database configuration
  database: {
    connectionString: string;
    timeout: number;
  };
  // Error handling configuration
  errorHandling: {
    maxRetries: number;
    retryDelayMs: number;
    fallbackToCache: boolean;
    escalationThreshold: number; // Number of failures before escalation
  };
}

export interface BrandContextMetrics {
  cacheHits: number;
  cacheMisses: number;
  loadSuccesses: number;
  loadFailures: number;
  averageLoadTime: number;
  lastRefreshTime: Date;
  escalationsTriggered: number;
  brandContextsLoaded: number;
}

export interface CachedBrandContext {
  context: BrandContext;
  loadedAt: Date;
  expiresAt: Date;
  version: string;
}

export class BrandContextService {
  private config: BrandContextConfig;
  private cache: Map<string, CachedBrandContext> = new Map();
  private metrics: BrandContextMetrics;
  private repository: BaseRepository;
  private refreshTimer?: NodeJS.Timeout;

  constructor(config: BrandContextConfig, repository: BaseRepository) {
    this.config = config;
    this.repository = repository;
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      loadSuccesses: 0,
      loadFailures: 0,
      averageLoadTime: 0,
      lastRefreshTime: new Date(),
      escalationsTriggered: 0,
      brandContextsLoaded: 0
    };

    // Start background refresh
    this.startBackgroundRefresh();
  }

  /**
   * Load brand context for a specific brand
   */
  async loadBrandContext(brandId: string): Promise<BrandContext> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cached = this.getCachedContext(brandId);
      if (cached) {
        this.metrics.cacheHits++;
        return cached.context;
      }

      this.metrics.cacheMisses++;

      // Load from database
      const context = await this.loadFromDatabase(brandId);
      
      // Cache the result
      this.cacheContext(brandId, context);
      
      // Update metrics
      this.updateLoadMetrics(Date.now() - startTime, true);
      this.metrics.brandContextsLoaded++;

      return context;

    } catch (error) {
      this.updateLoadMetrics(Date.now() - startTime, false);
      
      // Try fallback to cache if enabled
      if (this.config.errorHandling.fallbackToCache) {
        const staleCache = this.getStaleCache(brandId);
        if (staleCache) {
          console.warn(`Using stale cache for brand ${brandId} due to load error:`, error);
          return staleCache.context;
        }
      }

      // Check if escalation is needed
      if (this.shouldEscalate()) {
        await this.escalateError(brandId, error as Error);
      }

      throw new Error(`Failed to load brand context for ${brandId}: ${error}`);
    }
  }

  /**
   * Load brand playbook from CCC infrastructure
   */
  async loadBrandPlaybook(brandId: string): Promise<BrandPlaybook> {
    try {
      // Query the CCC database for brand playbook
      const query = `
        SELECT 
          bp.*,
          bi.name as brand_name,
          bi.tagline,
          bi.mission,
          bi.values,
          bi.personality,
          vt.primary_tone,
          vt.attributes,
          vt.do_use,
          vt.dont_use,
          cr.forbidden_claims,
          cr.required_disclosures,
          cr.regulatory_compliance,
          cr.content_restrictions,
          vg.logo_usage,
          vg.color_palette,
          vg.typography,
          psr.platform_rules
        FROM brand_playbooks bp
        LEFT JOIN brand_identity bi ON bp.brand_id = bi.brand_id
        LEFT JOIN voice_and_tone vt ON bp.id = vt.playbook_id
        LEFT JOIN compliance_rules cr ON bp.id = cr.playbook_id
        LEFT JOIN visual_guidelines vg ON bp.id = vg.playbook_id
        LEFT JOIN platform_specific_rules psr ON bp.id = psr.playbook_id
        WHERE bp.brand_id = $1 AND bp.active = true
        ORDER BY bp.version DESC
        LIMIT 1
      `;

      const result = await this.repository.query(query, [brandId]);
      
      if (!result.rows || result.rows.length === 0) {
        throw new Error(`No active brand playbook found for brand ${brandId}`);
      }

      const row = result.rows[0];
      
      // Transform database result to BrandPlaybook format
      const playbook: BrandPlaybook = {
        id: row.id,
        brandId: row.brand_id,
        version: row.version,
        lastUpdated: row.last_updated,
        brandIdentity: {
          name: row.brand_name || row.name,
          tagline: row.tagline || '',
          mission: row.mission || '',
          values: this.parseJsonField(row.values, []),
          personality: this.parseJsonField(row.personality, [])
        },
        voiceAndTone: {
          primaryTone: row.primary_tone || 'professional',
          attributes: this.parseJsonField(row.attributes, {
            formality: 'moderate',
            enthusiasm: 'moderate',
            empathy: 'high',
            authority: 'moderate'
          }),
          doUse: this.parseJsonField(row.do_use, []),
          dontUse: this.parseJsonField(row.dont_use, [])
        },
        complianceRules: {
          forbiddenClaims: this.parseJsonField(row.forbidden_claims, []),
          requiredDisclosures: this.parseJsonField(row.required_disclosures, []),
          regulatoryCompliance: this.parseJsonField(row.regulatory_compliance, []),
          contentRestrictions: this.parseJsonField(row.content_restrictions, {})
        },
        visualGuidelines: {
          logoUsage: this.parseJsonField(row.logo_usage, {
            primaryLogo: '',
            variations: [],
            minSize: '24px',
            clearSpace: '1x logo width'
          }),
          colorPalette: this.parseJsonField(row.color_palette, {
            primary: '#000000',
            secondary: '#666666',
            accent: '#0066cc',
            neutral: ['#f5f5f5', '#e0e0e0', '#cccccc']
          }),
          typography: this.parseJsonField(row.typography, {
            primary: 'Arial, sans-serif',
            secondary: 'Georgia, serif',
            headingStyle: 'bold',
            bodyStyle: 'normal'
          })
        },
        platformSpecificRules: this.parseJsonField(row.platform_rules, {})
      };

      return playbook;

    } catch (error) {
      console.error(`Failed to load brand playbook for ${brandId}:`, error);
      throw error;
    }
  }

  /**
   * Load personas for a specific brand
   */
  async loadBrandPersonas(brandId: string): Promise<Persona[]> {
    try {
      const query = `
        SELECT 
          p.*,
          d.age_range,
          d.gender,
          d.income,
          d.education,
          d.location,
          d.occupation,
          ps.interests,
          ps.values as persona_values,
          ps.lifestyle,
          ps.pain_points,
          bp.purchase_drivers,
          bp.decision_making_style,
          bp.brand_loyalty,
          bp.price_sensitivity,
          bp.communication_preference,
          pp.primary_platforms,
          pp.secondary_platforms,
          pp.content_types,
          pp.engagement_style,
          pp.active_hours,
          t.positive_triggers,
          t.negative_triggers,
          rs.content_tone,
          rs.message_length,
          rs.include_data,
          rs.visual_style,
          rs.call_to_action
        FROM personas p
        LEFT JOIN demographics d ON p.id = d.persona_id
        LEFT JOIN psychographics ps ON p.id = ps.persona_id
        LEFT JOIN behavior_patterns bp ON p.id = bp.persona_id
        LEFT JOIN platform_preferences pp ON p.id = pp.persona_id
        LEFT JOIN triggers t ON p.id = t.persona_id
        LEFT JOIN response_strategies rs ON p.id = rs.persona_id
        WHERE p.brand_id = $1 AND p.active = true
        ORDER BY p.priority DESC, p.created_at ASC
      `;

      const result = await this.repository.query(query, [brandId]);
      
      if (!result.rows || result.rows.length === 0) {
        console.warn(`No personas found for brand ${brandId}, using default persona`);
        return [this.createDefaultPersona(brandId)];
      }

      const personas: Persona[] = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        brandId: row.brand_id,
        demographics: {
          ageRange: row.age_range || '25-45',
          gender: row.gender || 'all',
          income: row.income || 'middle',
          education: row.education || 'college',
          location: this.parseJsonField(row.location, ['global']),
          occupation: this.parseJsonField(row.occupation, ['professional'])
        },
        psychographics: {
          interests: this.parseJsonField(row.interests, ['health', 'beauty']),
          values: this.parseJsonField(row.persona_values, ['quality', 'authenticity']),
          lifestyle: this.parseJsonField(row.lifestyle, ['active', 'health-conscious']),
          painPoints: this.parseJsonField(row.pain_points, ['time constraints', 'product effectiveness'])
        },
        behaviorPatterns: {
          purchaseDrivers: this.parseJsonField(row.purchase_drivers, ['quality', 'reviews']),
          decisionMakingStyle: row.decision_making_style || 'research-driven',
          brandLoyalty: row.brand_loyalty || 'moderate',
          pricesensitivity: row.price_sensitivity || 'moderate',
          communicationPreference: row.communication_preference || 'authentic'
        },
        platformPreferences: {
          primary: this.parseJsonField(row.primary_platforms, ['instagram', 'tiktok']),
          secondary: this.parseJsonField(row.secondary_platforms, ['youtube', 'facebook']),
          contentTypes: this.parseJsonField(row.content_types, ['video', 'image']),
          engagementStyle: row.engagement_style || 'interactive',
          activeHours: this.parseJsonField(row.active_hours, ['9-12', '18-21'])
        },
        triggers: {
          positive: this.parseJsonField(row.positive_triggers, ['results', 'transformation']),
          negative: this.parseJsonField(row.negative_triggers, ['false claims', 'pushy sales'])
        },
        responseStrategies: {
          contentTone: row.content_tone || 'friendly',
          messageLength: row.message_length || 'medium',
          includeData: row.include_data || false,
          visualStyle: row.visual_style || 'clean',
          callToAction: row.call_to_action || 'soft'
        }
      }));

      return personas;

    } catch (error) {
      console.error(`Failed to load personas for brand ${brandId}:`, error);
      // Return default persona on error
      return [this.createDefaultPersona(brandId)];
    }
  }

  /**
   * Load complete brand context from database
   */
  private async loadFromDatabase(brandId: string): Promise<BrandContext> {
    const [playbook, personas] = await Promise.all([
      this.loadBrandPlaybook(brandId),
      this.loadBrandPersonas(brandId)
    ]);

    // Load asset intelligence (placeholder for now)
    const assets = []; // TODO: Implement asset loading from CCC

    return {
      brandId,
      playbook,
      personas,
      assets
    };
  }

  /**
   * Get cached context if valid
   */
  private getCachedContext(brandId: string): CachedBrandContext | null {
    const cached = this.cache.get(brandId);
    if (!cached) return null;

    if (cached.expiresAt > new Date()) {
      return cached;
    }

    // Remove expired cache
    this.cache.delete(brandId);
    return null;
  }

  /**
   * Get stale cache (expired but still available)
   */
  private getStaleCache(brandId: string): CachedBrandContext | null {
    return this.cache.get(brandId) || null;
  }

  /**
   * Cache brand context
   */
  private cacheContext(brandId: string, context: BrandContext): void {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.cache.ttlMs);

    const cached: CachedBrandContext = {
      context,
      loadedAt: now,
      expiresAt,
      version: context.playbook.version
    };

    this.cache.set(brandId, cached);

    // Clean up cache if it exceeds max size
    if (this.cache.size > this.config.cache.maxSize) {
      this.cleanupCache();
    }
  }

  /**
   * Clean up old cache entries
   */
  private cleanupCache(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].loadedAt.getTime() - b[1].loadedAt.getTime());

    // Remove oldest entries until we're under the limit
    const toRemove = entries.length - this.config.cache.maxSize + 1;
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Parse JSON field with fallback
   */
  private parseJsonField<T>(field: any, fallback: T): T {
    if (!field) return fallback;
    
    try {
      if (typeof field === 'string') {
        return JSON.parse(field);
      }
      return field;
    } catch {
      return fallback;
    }
  }

  /**
   * Create default persona when none exist
   */
  private createDefaultPersona(brandId: string): Persona {
    return {
      id: `default-${brandId}`,
      name: 'Default Customer',
      brandId,
      demographics: {
        ageRange: '25-45',
        gender: 'all',
        income: 'middle',
        education: 'college',
        location: ['global'],
        occupation: ['professional']
      },
      psychographics: {
        interests: ['health', 'beauty', 'wellness'],
        values: ['quality', 'authenticity', 'results'],
        lifestyle: ['active', 'health-conscious'],
        painPoints: ['time constraints', 'product effectiveness', 'value for money']
      },
      behaviorPatterns: {
        purchaseDrivers: ['quality', 'reviews', 'recommendations'],
        decisionMakingStyle: 'research-driven',
        brandLoyalty: 'moderate',
        pricesensitivity: 'moderate',
        communicationPreference: 'authentic'
      },
      platformPreferences: {
        primary: ['instagram', 'tiktok'],
        secondary: ['youtube', 'facebook'],
        contentTypes: ['video', 'image', 'text'],
        engagementStyle: 'interactive',
        activeHours: ['9-12', '18-21']
      },
      triggers: {
        positive: ['results', 'transformation', 'testimonials'],
        negative: ['false claims', 'pushy sales', 'spam']
      },
      responseStrategies: {
        contentTone: 'friendly',
        messageLength: 'medium',
        includeData: false,
        visualStyle: 'clean',
        callToAction: 'soft'
      }
    };
  }

  /**
   * Update load metrics
   */
  private updateLoadMetrics(loadTime: number, success: boolean): void {
    if (success) {
      this.metrics.loadSuccesses++;
    } else {
      this.metrics.loadFailures++;
    }

    // Update average load time
    const totalLoads = this.metrics.loadSuccesses + this.metrics.loadFailures;
    this.metrics.averageLoadTime = 
      (this.metrics.averageLoadTime * (totalLoads - 1) + loadTime) / totalLoads;
  }

  /**
   * Check if error escalation is needed
   */
  private shouldEscalate(): boolean {
    const totalLoads = this.metrics.loadSuccesses + this.metrics.loadFailures;
    if (totalLoads < 10) return false; // Need minimum sample size

    const errorRate = this.metrics.loadFailures / totalLoads;
    return errorRate > this.config.errorHandling.escalationThreshold;
  }

  /**
   * Escalate error to monitoring system
   */
  private async escalateError(brandId: string, error: Error): Promise<void> {
    this.metrics.escalationsTriggered++;
    
    // Log critical error
    console.error(`ESCALATION: Brand context loading failure for ${brandId}`, {
      error: error.message,
      metrics: this.metrics,
      timestamp: new Date().toISOString()
    });

    // TODO: Integrate with monitoring/alerting system
    // This could send alerts to Slack, PagerDuty, etc.
  }

  /**
   * Start background refresh of cached contexts
   */
  private startBackgroundRefresh(): void {
    this.refreshTimer = setInterval(async () => {
      await this.refreshExpiredContexts();
    }, this.config.cache.refreshIntervalMs);
  }

  /**
   * Refresh expired contexts in background
   */
  private async refreshExpiredContexts(): Promise<void> {
    const now = new Date();
    const toRefresh: string[] = [];

    for (const [brandId, cached] of this.cache.entries()) {
      if (cached.expiresAt <= now) {
        toRefresh.push(brandId);
      }
    }

    // Refresh expired contexts
    for (const brandId of toRefresh) {
      try {
        await this.loadBrandContext(brandId);
      } catch (error) {
        console.warn(`Background refresh failed for brand ${brandId}:`, error);
      }
    }

    this.metrics.lastRefreshTime = now;
  }

  /**
   * Get service metrics
   */
  getMetrics(): BrandContextMetrics {
    return { ...this.metrics };
  }

  /**
   * Refresh specific brand context
   */
  async refreshBrandContext(brandId: string): Promise<BrandContext> {
    // Remove from cache to force reload
    this.cache.delete(brandId);
    return await this.loadBrandContext(brandId);
  }

  /**
   * Preload brand contexts for better performance
   */
  async preloadBrandContexts(brandIds: string[]): Promise<void> {
    const promises = brandIds.map(brandId => 
      this.loadBrandContext(brandId).catch(error => 
        console.warn(`Failed to preload brand context for ${brandId}:`, error)
      )
    );

    await Promise.all(promises);
  }

  /**
   * Shutdown service and cleanup
   */
  shutdown(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
    this.cache.clear();
  }
}