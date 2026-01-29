/**
 * Intent Detection Service
 * Implements intent classification for purchase, support, complaints, etc.
 * Extracts entities and predicts next actions
 * Calculates urgency levels and confidence scores
 */

import { SocialEvent, IntentCategory, UrgencyLevel, Platform } from '../types/core';

export interface IntentConfig {
  // Classification models
  models: {
    primary: {
      type: 'rule-based' | 'ml' | 'hybrid';
      endpoint?: string;
      confidence_threshold: number;
    };
    fallback: {
      enabled: boolean;
      type: 'rule-based';
    };
  };
  // Intent-specific configurations
  intents: {
    [key in IntentCategory]: {
      keywords: string[];
      patterns: string[];
      urgencyModifiers: string[];
      contextClues: string[];
      weight: number;
    };
  };
  // Entity extraction
  entityExtraction: {
    enabled: boolean;
    types: string[];
    confidence_threshold: number;
  };
  // Urgency calculation
  urgencyFactors: {
    timeKeywords: { [key: string]: number };
    emotionalIntensity: { [key: string]: number };
    platformModifiers: { [key in Platform]: number };
  };
}

export interface IntentResult {
  primary: {
    intent: IntentCategory;
    confidence: number;
    reasoning: string[];
  };
  secondary?: {
    intent: IntentCategory;
    confidence: number;
    reasoning: string[];
  };
  entities: Array<{
    type: string;
    value: string;
    confidence: number;
    position: { start: number; end: number };
  }>;
  urgency: {
    level: UrgencyLevel;
    score: number; // 0-1
    factors: Array<{
      factor: string;
      impact: number;
      reasoning: string;
    }>;
  };
  nextActions: Array<{
    action: string;
    priority: number;
    confidence: number;
    reasoning: string;
  }>;
  metadata: {
    processingTime: number;
    modelVersion: string;
    fallbackUsed: boolean;
    textLength: number;
  };
}

export interface IntentMetrics {
  totalClassifications: number;
  averageProcessingTime: number;
  intentDistribution: Record<IntentCategory, number>;
  urgencyDistribution: Record<UrgencyLevel, number>;
  confidenceDistribution: {
    high: number; // >0.8
    medium: number; // 0.6-0.8
    low: number; // <0.6
  };
  entityExtractionStats: {
    totalEntities: number;
    averageEntitiesPerEvent: number;
    entityTypeDistribution: Record<string, number>;
  };
  platformPerformance: Record<Platform, {
    count: number;
    averageConfidence: number;
    mostCommonIntent: IntentCategory;
  }>;
  modelPerformance: {
    primaryModelSuccess: number;
    fallbackUsage: number;
    averageLatency: number;
  };
}

export class IntentDetectionService {
  private config: IntentConfig;
  private metrics: IntentMetrics;

  constructor(config: IntentConfig) {
    this.config = config;
    this.metrics = {
      totalClassifications: 0,
      averageProcessingTime: 0,
      intentDistribution: {} as Record<IntentCategory, number>,
      urgencyDistribution: {} as Record<UrgencyLevel, number>,
      confidenceDistribution: { high: 0, medium: 0, low: 0 },
      entityExtractionStats: {
        totalEntities: 0,
        averageEntitiesPerEvent: 0,
        entityTypeDistribution: {}
      },
      platformPerformance: {} as Record<Platform, any>,
      modelPerformance: {
        primaryModelSuccess: 0,
        fallbackUsage: 0,
        averageLatency: 0
      }
    };

    this.initializeMetrics();
  }

  /**
   * Detect intent from social event
   */
  async detectIntent(event: SocialEvent): Promise<IntentResult> {
    const startTime = Date.now();
    this.metrics.totalClassifications++;

    try {
      const text = this.preprocessText(event.content.text);
      let fallbackUsed = false;

      // Try primary model first
      let intentScores: Record<IntentCategory, number>;
      
      try {
        if (this.config.models.primary.type === 'ml' && this.config.models.primary.endpoint) {
          intentScores = await this.runMLClassification(text);
        } else {
          intentScores = await this.runRuleBasedClassification(text, event.platform);
        }
      } catch (error) {
        console.warn('Primary intent model failed, using fallback:', error);
        intentScores = await this.runRuleBasedClassification(text, event.platform);
        fallbackUsed = true;
        this.metrics.modelPerformance.fallbackUsage++;
      }

      // Determine primary and secondary intents
      const sortedIntents = Object.entries(intentScores)
        .sort(([, a], [, b]) => b - a)
        .map(([intent, confidence]) => ({ intent: intent as IntentCategory, confidence }));

      const primary = {
        intent: sortedIntents[0].intent,
        confidence: sortedIntents[0].confidence,
        reasoning: this.generateIntentReasoning(sortedIntents[0].intent, text, event.platform)
      };

      const secondary = sortedIntents[1] && sortedIntents[1].confidence > 0.3 ? {
        intent: sortedIntents[1].intent,
        confidence: sortedIntents[1].confidence,
        reasoning: this.generateIntentReasoning(sortedIntents[1].intent, text, event.platform)
      } : undefined;

      // Extract entities
      const entities = this.config.entityExtraction.enabled 
        ? await this.extractEntities(text)
        : [];

      // Calculate urgency
      const urgency = this.calculateUrgency(text, primary.intent, event.platform, entities);

      // Predict next actions
      const nextActions = this.predictNextActions(primary.intent, urgency.level, entities, event.platform);

      const processingTime = Date.now() - startTime;

      const result: IntentResult = {
        primary,
        secondary,
        entities,
        urgency,
        nextActions,
        metadata: {
          processingTime,
          modelVersion: '1.0.0',
          fallbackUsed,
          textLength: text.length
        }
      };

      // Update metrics
      this.updateMetrics(result, event.platform);

      return result;

    } catch (error) {
      console.error('Intent detection failed:', error);
      throw error;
    }
  }

  /**
   * Batch detect intents for multiple events
   */
  async batchDetectIntent(events: SocialEvent[]): Promise<IntentResult[]> {
    const batchSize = 20;
    const results: IntentResult[] = [];

    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      const batchPromises = batch.map(event => this.detectIntent(event));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Preprocess text for intent detection
   */
  private preprocessText(text: string): string {
    // Remove URLs but keep context
    let processed = text.replace(/https?:\/\/[^\s]+/g, ' [URL] ');
    
    // Normalize mentions
    processed = processed.replace(/@\w+/g, ' [MENTION] ');
    
    // Keep hashtags as they can indicate intent
    processed = processed.replace(/#(\w+)/g, ' hashtag_$1 ');
    
    // Normalize whitespace
    processed = processed.replace(/\s+/g, ' ').trim();
    
    return processed.toLowerCase();
  }

  /**
   * Run ML-based intent classification
   */
  private async runMLClassification(text: string): Promise<Record<IntentCategory, number>> {
    if (!this.config.models.primary.endpoint) {
      throw new Error('ML endpoint not configured');
    }

    const response = await fetch(this.config.models.primary.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      throw new Error(`ML API error: ${response.status}`);
    }

    const result = await response.json();
    return result.intent_scores || {};
  }

  /**
   * Run rule-based intent classification
   */
  private async runRuleBasedClassification(
    text: string, 
    platform: Platform
  ): Promise<Record<IntentCategory, number>> {
    const scores: Record<IntentCategory, number> = {} as Record<IntentCategory, number>;

    // Initialize all intents with 0 score
    Object.values(IntentCategory).forEach(intent => {
      scores[intent] = 0;
    });

    // Score each intent based on keywords and patterns
    for (const [intent, config] of Object.entries(this.config.intents)) {
      const intentCategory = intent as IntentCategory;
      let score = 0;

      // Keyword matching
      for (const keyword of config.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          score += 0.3;
        }
      }

      // Pattern matching
      for (const pattern of config.patterns) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(text)) {
          score += 0.4;
        }
      }

      // Context clues
      for (const clue of config.contextClues) {
        if (text.includes(clue.toLowerCase())) {
          score += 0.2;
        }
      }

      // Apply intent weight
      score *= config.weight;

      // Platform-specific adjustments
      score *= this.getPlatformIntentModifier(platform, intentCategory);

      scores[intentCategory] = Math.min(1, score);
    }

    return scores;
  }

  /**
   * Get platform-specific intent modifier
   */
  private getPlatformIntentModifier(platform: Platform, intent: IntentCategory): number {
    const modifiers: Record<Platform, Partial<Record<IntentCategory, number>>> = {
      [Platform.TIKTOK]: {
        [IntentCategory.PRAISE]: 1.2,
        [IntentCategory.INFORMATION_SEEKING]: 0.8
      },
      [Platform.INSTAGRAM]: {
        [IntentCategory.PURCHASE_INQUIRY]: 1.3,
        [IntentCategory.PRAISE]: 1.1
      },
      [Platform.FACEBOOK]: {
        [IntentCategory.SUPPORT_REQUEST]: 1.2,
        [IntentCategory.COMPLAINT]: 1.1
      },
      [Platform.YOUTUBE]: {
        [IntentCategory.INFORMATION_SEEKING]: 1.2,
        [IntentCategory.FEATURE_REQUEST]: 1.1
      },
      [Platform.REDDIT]: {
        [IntentCategory.COMPARISON_SHOPPING]: 1.3,
        [IntentCategory.INFORMATION_SEEKING]: 1.2
      },
      [Platform.RSS]: {
        [IntentCategory.INFORMATION_SEEKING]: 1.1
      }
    };

    return modifiers[platform]?.[intent] || 1.0;
  }

  /**
   * Generate reasoning for intent classification
   */
  private generateIntentReasoning(
    intent: IntentCategory, 
    text: string, 
    platform: Platform
  ): string[] {
    const reasoning: string[] = [];
    const intentConfig = this.config.intents[intent];

    // Check for keyword matches
    const matchedKeywords = intentConfig.keywords.filter(keyword => 
      text.includes(keyword.toLowerCase())
    );
    if (matchedKeywords.length > 0) {
      reasoning.push(`Keywords: ${matchedKeywords.join(', ')}`);
    }

    // Check for pattern matches
    const matchedPatterns = intentConfig.patterns.filter(pattern => 
      new RegExp(pattern, 'i').test(text)
    );
    if (matchedPatterns.length > 0) {
      reasoning.push(`Patterns: ${matchedPatterns.length} matched`);
    }

    // Platform context
    const modifier = this.getPlatformIntentModifier(platform, intent);
    if (modifier !== 1.0) {
      reasoning.push(`Platform adjustment: ${modifier > 1 ? 'boosted' : 'reduced'} for ${platform}`);
    }

    return reasoning;
  }

  /**
   * Extract entities from text
   */
  private async extractEntities(text: string): Promise<Array<{
    type: string;
    value: string;
    confidence: number;
    position: { start: number; end: number };
  }>> {
    const entities: Array<{
      type: string;
      value: string;
      confidence: number;
      position: { start: number; end: number };
    }> = [];

    // Product names (simple pattern matching)
    const productPatterns = [
      /\b(serum|cream|lotion|oil|shampoo|conditioner|mask|cleanser)\b/gi,
      /\b(moisturizer|toner|exfoliant|sunscreen|foundation|concealer)\b/gi
    ];

    for (const pattern of productPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          type: 'PRODUCT',
          value: match[0],
          confidence: 0.8,
          position: { start: match.index, end: match.index + match[0].length }
        });
      }
    }

    // Price mentions
    const pricePattern = /\$\d+(?:\.\d{2})?|\d+\s*(?:dollars?|usd|€|euros?|£|pounds?)/gi;
    let priceMatch;
    while ((priceMatch = pricePattern.exec(text)) !== null) {
      entities.push({
        type: 'PRICE',
        value: priceMatch[0],
        confidence: 0.9,
        position: { start: priceMatch.index, end: priceMatch.index + priceMatch[0].length }
      });
    }

    // Time expressions
    const timePattern = /\b(today|tomorrow|yesterday|next week|last week|asap|urgent|immediately)\b/gi;
    let timeMatch;
    while ((timeMatch = timePattern.exec(text)) !== null) {
      entities.push({
        type: 'TIME',
        value: timeMatch[0],
        confidence: 0.7,
        position: { start: timeMatch.index, end: timeMatch.index + timeMatch[0].length }
      });
    }

    // Contact information
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    let emailMatch;
    while ((emailMatch = emailPattern.exec(text)) !== null) {
      entities.push({
        type: 'EMAIL',
        value: emailMatch[0],
        confidence: 0.95,
        position: { start: emailMatch.index, end: emailMatch.index + emailMatch[0].length }
      });
    }

    return entities.filter(entity => entity.confidence >= this.config.entityExtraction.confidence_threshold);
  }

  /**
   * Calculate urgency level and score
   */
  private calculateUrgency(
    text: string,
    intent: IntentCategory,
    platform: Platform,
    entities: Array<{ type: string; value: string; confidence: number }>
  ): {
    level: UrgencyLevel;
    score: number;
    factors: Array<{ factor: string; impact: number; reasoning: string }>;
  } {
    let urgencyScore = 0;
    const factors: Array<{ factor: string; impact: number; reasoning: string }> = [];

    // Base urgency by intent
    const intentUrgency: Record<IntentCategory, number> = {
      [IntentCategory.COMPLAINT]: 0.7,
      [IntentCategory.SUPPORT_REQUEST]: 0.6,
      [IntentCategory.PURCHASE_INQUIRY]: 0.4,
      [IntentCategory.FEATURE_REQUEST]: 0.3,
      [IntentCategory.INFORMATION_SEEKING]: 0.2,
      [IntentCategory.COMPARISON_SHOPPING]: 0.2,
      [IntentCategory.PRAISE]: 0.1
    };

    urgencyScore += intentUrgency[intent];
    factors.push({
      factor: 'Intent Type',
      impact: intentUrgency[intent],
      reasoning: `${intent} has base urgency of ${intentUrgency[intent]}`
    });

    // Time-based keywords
    for (const [keyword, impact] of Object.entries(this.config.urgencyFactors.timeKeywords)) {
      if (text.includes(keyword.toLowerCase())) {
        urgencyScore += impact;
        factors.push({
          factor: 'Time Sensitivity',
          impact,
          reasoning: `Contains time-sensitive keyword: "${keyword}"`
        });
      }
    }

    // Emotional intensity
    for (const [keyword, impact] of Object.entries(this.config.urgencyFactors.emotionalIntensity)) {
      if (text.includes(keyword.toLowerCase())) {
        urgencyScore += impact;
        factors.push({
          factor: 'Emotional Intensity',
          impact,
          reasoning: `Contains emotional keyword: "${keyword}"`
        });
      }
    }

    // Platform modifier
    const platformModifier = this.config.urgencyFactors.platformModifiers[platform];
    urgencyScore *= platformModifier;
    if (platformModifier !== 1.0) {
      factors.push({
        factor: 'Platform Context',
        impact: platformModifier - 1,
        reasoning: `${platform} has urgency modifier of ${platformModifier}`
      });
    }

    // Entity-based urgency
    const timeEntities = entities.filter(e => e.type === 'TIME');
    if (timeEntities.length > 0) {
      urgencyScore += 0.2;
      factors.push({
        factor: 'Time Entities',
        impact: 0.2,
        reasoning: `Contains time-related entities: ${timeEntities.map(e => e.value).join(', ')}`
      });
    }

    // Clamp score to [0, 1]
    urgencyScore = Math.max(0, Math.min(1, urgencyScore));

    // Determine urgency level
    let level: UrgencyLevel;
    if (urgencyScore >= 0.8) {
      level = UrgencyLevel.CRITICAL;
    } else if (urgencyScore >= 0.6) {
      level = UrgencyLevel.HIGH;
    } else if (urgencyScore >= 0.4) {
      level = UrgencyLevel.MEDIUM;
    } else if (urgencyScore >= 0.2) {
      level = UrgencyLevel.LOW;
    } else {
      level = UrgencyLevel.MINIMAL;
    }

    return { level, score: urgencyScore, factors };
  }

  /**
   * Predict next actions based on intent and context
   */
  private predictNextActions(
    intent: IntentCategory,
    urgency: UrgencyLevel,
    entities: Array<{ type: string; value: string; confidence: number }>,
    platform: Platform
  ): Array<{
    action: string;
    priority: number;
    confidence: number;
    reasoning: string;
  }> {
    const actions: Array<{
      action: string;
      priority: number;
      confidence: number;
      reasoning: string;
    }> = [];

    // Intent-specific actions
    switch (intent) {
      case IntentCategory.COMPLAINT:
        actions.push({
          action: 'escalate_to_support',
          priority: urgency === UrgencyLevel.CRITICAL ? 1 : 2,
          confidence: 0.9,
          reasoning: 'Complaint requires immediate support attention'
        });
        actions.push({
          action: 'acknowledge_issue',
          priority: 1,
          confidence: 0.8,
          reasoning: 'Quick acknowledgment shows we care'
        });
        break;

      case IntentCategory.PURCHASE_INQUIRY:
        actions.push({
          action: 'provide_product_info',
          priority: 1,
          confidence: 0.8,
          reasoning: 'Customer is interested in purchasing'
        });
        if (entities.some(e => e.type === 'PRICE')) {
          actions.push({
            action: 'send_pricing_details',
            priority: 1,
            confidence: 0.9,
            reasoning: 'Customer mentioned price concerns'
          });
        }
        break;

      case IntentCategory.SUPPORT_REQUEST:
        actions.push({
          action: 'route_to_support',
          priority: urgency === UrgencyLevel.HIGH ? 1 : 2,
          confidence: 0.85,
          reasoning: 'Support request needs expert assistance'
        });
        break;

      case IntentCategory.INFORMATION_SEEKING:
        actions.push({
          action: 'provide_information',
          priority: 2,
          confidence: 0.7,
          reasoning: 'Customer needs information'
        });
        break;

      case IntentCategory.PRAISE:
        actions.push({
          action: 'thank_customer',
          priority: 3,
          confidence: 0.6,
          reasoning: 'Acknowledge positive feedback'
        });
        actions.push({
          action: 'encourage_review',
          priority: 4,
          confidence: 0.5,
          reasoning: 'Happy customers might leave reviews'
        });
        break;

      case IntentCategory.FEATURE_REQUEST:
        actions.push({
          action: 'log_feature_request',
          priority: 3,
          confidence: 0.7,
          reasoning: 'Feature requests should be tracked'
        });
        break;

      case IntentCategory.COMPARISON_SHOPPING:
        actions.push({
          action: 'highlight_differentiators',
          priority: 2,
          confidence: 0.8,
          reasoning: 'Customer is comparing options'
        });
        break;
    }

    // Platform-specific actions
    if (platform === Platform.INSTAGRAM || platform === Platform.TIKTOK) {
      actions.push({
        action: 'engage_visually',
        priority: 2,
        confidence: 0.6,
        reasoning: 'Visual platforms benefit from visual engagement'
      });
    }

    // Urgency-based prioritization
    actions.forEach(action => {
      if (urgency === UrgencyLevel.CRITICAL) {
        action.priority = Math.max(1, action.priority - 1);
      } else if (urgency === UrgencyLevel.MINIMAL) {
        action.priority = Math.min(5, action.priority + 1);
      }
    });

    return actions.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): void {
    // Initialize intent distribution
    Object.values(IntentCategory).forEach(intent => {
      this.metrics.intentDistribution[intent] = 0;
    });

    // Initialize urgency distribution
    Object.values(UrgencyLevel).forEach(level => {
      this.metrics.urgencyDistribution[level] = 0;
    });

    // Initialize platform performance
    Object.values(Platform).forEach(platform => {
      this.metrics.platformPerformance[platform] = {
        count: 0,
        averageConfidence: 0,
        mostCommonIntent: IntentCategory.INFORMATION_SEEKING
      };
    });
  }

  /**
   * Update metrics after classification
   */
  private updateMetrics(result: IntentResult, platform: Platform): void {
    // Update processing time
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime * (this.metrics.totalClassifications - 1) + 
       result.metadata.processingTime) / this.metrics.totalClassifications;

    // Update intent distribution
    this.metrics.intentDistribution[result.primary.intent]++;

    // Update urgency distribution
    this.metrics.urgencyDistribution[result.urgency.level]++;

    // Update confidence distribution
    if (result.primary.confidence >= 0.8) {
      this.metrics.confidenceDistribution.high++;
    } else if (result.primary.confidence >= 0.6) {
      this.metrics.confidenceDistribution.medium++;
    } else {
      this.metrics.confidenceDistribution.low++;
    }

    // Update entity extraction stats
    this.metrics.entityExtractionStats.totalEntities += result.entities.length;
    this.metrics.entityExtractionStats.averageEntitiesPerEvent = 
      this.metrics.entityExtractionStats.totalEntities / this.metrics.totalClassifications;

    result.entities.forEach(entity => {
      this.metrics.entityExtractionStats.entityTypeDistribution[entity.type] = 
        (this.metrics.entityExtractionStats.entityTypeDistribution[entity.type] || 0) + 1;
    });

    // Update platform performance
    const platformStats = this.metrics.platformPerformance[platform];
    platformStats.count++;
    platformStats.averageConfidence = 
      (platformStats.averageConfidence * (platformStats.count - 1) + result.primary.confidence) / 
      platformStats.count;

    // Update most common intent for platform
    const platformIntents = Object.entries(this.metrics.intentDistribution)
      .sort(([, a], [, b]) => b - a);
    platformStats.mostCommonIntent = platformIntents[0][0] as IntentCategory;

    // Update model performance
    if (!result.metadata.fallbackUsed) {
      this.metrics.modelPerformance.primaryModelSuccess++;
    }
    this.metrics.modelPerformance.averageLatency = 
      (this.metrics.modelPerformance.averageLatency * (this.metrics.totalClassifications - 1) + 
       result.metadata.processingTime) / this.metrics.totalClassifications;
  }

  /**
   * Get service metrics
   */
  getMetrics(): IntentMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalClassifications: 0,
      averageProcessingTime: 0,
      intentDistribution: {} as Record<IntentCategory, number>,
      urgencyDistribution: {} as Record<UrgencyLevel, number>,
      confidenceDistribution: { high: 0, medium: 0, low: 0 },
      entityExtractionStats: {
        totalEntities: 0,
        averageEntitiesPerEvent: 0,
        entityTypeDistribution: {}
      },
      platformPerformance: {} as Record<Platform, any>,
      modelPerformance: {
        primaryModelSuccess: 0,
        fallbackUsage: 0,
        averageLatency: 0
      }
    };

    this.initializeMetrics();
  }
}