/**
 * Persona Matching Engine
 * Implements algorithm to match Social_Events to appropriate personas
 * Uses content analysis, user behavior patterns, and demographic signals
 * Calculates confidence scores for persona matches
 */

import { SocialEvent, Persona, Platform } from '../types/core';

export interface PersonaMatchConfig {
  // Matching algorithm weights
  weights: {
    contentAnalysis: number;
    platformPreference: number;
    demographicSignals: number;
    behaviorPatterns: number;
    temporalPatterns: number;
  };
  // Confidence thresholds
  thresholds: {
    highConfidence: number; // Above this = high confidence match
    mediumConfidence: number; // Above this = medium confidence match
    minimumMatch: number; // Below this = no match
  };
  // Content analysis settings
  contentAnalysis: {
    keywordWeight: number;
    sentimentWeight: number;
    topicWeight: number;
    languageWeight: number;
  };
}

export interface PersonaMatch {
  persona: Persona;
  confidence: number;
  matchingFactors: {
    contentScore: number;
    platformScore: number;
    demographicScore: number;
    behaviorScore: number;
    temporalScore: number;
  };
  reasoning: string[];
}

export interface MatchingMetrics {
  totalMatches: number;
  highConfidenceMatches: number;
  mediumConfidenceMatches: number;
  lowConfidenceMatches: number;
  noMatches: number;
  averageConfidence: number;
  averageMatchingTime: number;
  personaDistribution: Record<string, number>;
}

export class PersonaMatchingEngine {
  private config: PersonaMatchConfig;
  private metrics: MatchingMetrics;

  constructor(config: PersonaMatchConfig) {
    this.config = config;
    this.metrics = {
      totalMatches: 0,
      highConfidenceMatches: 0,
      mediumConfidenceMatches: 0,
      lowConfidenceMatches: 0,
      noMatches: 0,
      averageConfidence: 0,
      averageMatchingTime: 0,
      personaDistribution: {}
    };
  }

  /**
   * Match event to best persona
   */
  async matchPersona(event: SocialEvent, personas: Persona[]): Promise<PersonaMatch | null> {
    const startTime = Date.now();
    this.metrics.totalMatches++;

    try {
      if (!personas || personas.length === 0) {
        this.metrics.noMatches++;
        return null;
      }

      // Calculate match scores for all personas
      const matches = await Promise.all(
        personas.map(persona => this.calculatePersonaMatch(event, persona))
      );

      // Find best match
      const bestMatch = matches.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );

      // Check if match meets minimum threshold
      if (bestMatch.confidence < this.config.thresholds.minimumMatch) {
        this.metrics.noMatches++;
        return null;
      }

      // Update metrics
      this.updateMatchMetrics(bestMatch);
      this.updateProcessingTime(Date.now() - startTime);

      return bestMatch;

    } catch (error) {
      console.error('Error in persona matching:', error);
      this.metrics.noMatches++;
      return null;
    }
  }

  /**
   * Get all persona matches with scores
   */
  async getAllMatches(event: SocialEvent, personas: Persona[]): Promise<PersonaMatch[]> {
    if (!personas || personas.length === 0) {
      return [];
    }

    const matches = await Promise.all(
      personas.map(persona => this.calculatePersonaMatch(event, persona))
    );

    // Sort by confidence descending
    return matches
      .filter(match => match.confidence >= this.config.thresholds.minimumMatch)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate match score for a specific persona
   */
  private async calculatePersonaMatch(event: SocialEvent, persona: Persona): Promise<PersonaMatch> {
    const reasoning: string[] = [];

    // 1. Content Analysis Score
    const contentScore = this.calculateContentScore(event, persona, reasoning);

    // 2. Platform Preference Score
    const platformScore = this.calculatePlatformScore(event, persona, reasoning);

    // 3. Demographic Signals Score
    const demographicScore = this.calculateDemographicScore(event, persona, reasoning);

    // 4. Behavior Patterns Score
    const behaviorScore = this.calculateBehaviorScore(event, persona, reasoning);

    // 5. Temporal Patterns Score
    const temporalScore = this.calculateTemporalScore(event, persona, reasoning);

    // Calculate weighted confidence score
    const confidence = 
      (contentScore * this.config.weights.contentAnalysis) +
      (platformScore * this.config.weights.platformPreference) +
      (demographicScore * this.config.weights.demographicSignals) +
      (behaviorScore * this.config.weights.behaviorPatterns) +
      (temporalScore * this.config.weights.temporalPatterns);

    return {
      persona,
      confidence: Math.min(confidence, 1.0), // Cap at 1.0
      matchingFactors: {
        contentScore,
        platformScore,
        demographicScore,
        behaviorScore,
        temporalScore
      },
      reasoning
    };
  }

  /**
   * Calculate content analysis score
   */
  private calculateContentScore(event: SocialEvent, persona: Persona, reasoning: string[]): number {
    let score = 0;
    const factors: string[] = [];

    // Check interests alignment
    const interestMatches = this.findKeywordMatches(
      event.content.text.toLowerCase(),
      persona.psychographics.interests
    );
    if (interestMatches.length > 0) {
      score += 0.3 * Math.min(interestMatches.length / 3, 1);
      factors.push(`interests: ${interestMatches.join(', ')}`);
    }

    // Check values alignment
    const valueMatches = this.findKeywordMatches(
      event.content.text.toLowerCase(),
      persona.psychographics.values
    );
    if (valueMatches.length > 0) {
      score += 0.2 * Math.min(valueMatches.length / 2, 1);
      factors.push(`values: ${valueMatches.join(', ')}`);
    }

    // Check pain points mentioned
    const painPointMatches = this.findKeywordMatches(
      event.content.text.toLowerCase(),
      persona.psychographics.painPoints
    );
    if (painPointMatches.length > 0) {
      score += 0.25 * Math.min(painPointMatches.length / 2, 1);
      factors.push(`pain points: ${painPointMatches.join(', ')}`);
    }

    // Check positive triggers
    const positiveMatches = this.findKeywordMatches(
      event.content.text.toLowerCase(),
      persona.triggers.positive
    );
    if (positiveMatches.length > 0) {
      score += 0.15;
      factors.push(`positive triggers: ${positiveMatches.join(', ')}`);
    }

    // Check negative triggers (reduce score)
    const negativeMatches = this.findKeywordMatches(
      event.content.text.toLowerCase(),
      persona.triggers.negative
    );
    if (negativeMatches.length > 0) {
      score -= 0.1 * negativeMatches.length;
      factors.push(`negative triggers: ${negativeMatches.join(', ')}`);
    }

    // Language preference
    if (event.content.language && persona.platformPreferences.primary.length > 0) {
      // Assume language preference based on platform usage
      score += 0.1;
      factors.push('language compatibility');
    }

    if (factors.length > 0) {
      reasoning.push(`Content match (${score.toFixed(2)}): ${factors.join('; ')}`);
    }

    return Math.max(0, Math.min(score, 1));
  }

  /**
   * Calculate platform preference score
   */
  private calculatePlatformScore(event: SocialEvent, persona: Persona, reasoning: string[]): number {
    let score = 0;

    // Primary platform match
    if (persona.platformPreferences.primary.includes(event.platform)) {
      score += 0.7;
      reasoning.push(`Primary platform match: ${event.platform}`);
    }
    // Secondary platform match
    else if (persona.platformPreferences.secondary.includes(event.platform)) {
      score += 0.4;
      reasoning.push(`Secondary platform match: ${event.platform}`);
    }

    // Content type preference (if we can infer from event)
    const eventContentType = this.inferContentType(event);
    if (eventContentType && persona.platformPreferences.contentTypes.includes(eventContentType)) {
      score += 0.3;
      reasoning.push(`Content type match: ${eventContentType}`);
    }

    return Math.min(score, 1);
  }

  /**
   * Calculate demographic signals score
   */
  private calculateDemographicScore(event: SocialEvent, persona: Persona, reasoning: string[]): number {
    let score = 0;
    const factors: string[] = [];

    // Location matching (if available)
    if (event.location?.country || event.location?.region) {
      const eventLocation = (event.location.country || event.location.region || '').toLowerCase();
      const locationMatch = persona.demographics.location.some(loc => 
        eventLocation.includes(loc.toLowerCase()) || loc.toLowerCase() === 'global'
      );
      if (locationMatch) {
        score += 0.3;
        factors.push('location');
      }
    }

    // Follower count as proxy for demographic signals
    if (event.author.followerCount > 0) {
      // Map follower count to demographic assumptions
      const followerTier = this.categorizeFollowerCount(event.author.followerCount);
      if (this.matchesPersonaDemographics(followerTier, persona)) {
        score += 0.2;
        factors.push(`follower tier: ${followerTier}`);
      }
    }

    // Verified status as authority signal
    if (event.author.verified) {
      // Verified accounts might match certain persona types
      if (persona.behaviorPatterns.decisionMakingStyle === 'authority-driven' ||
          persona.psychographics.values.includes('credibility')) {
        score += 0.2;
        factors.push('verified authority');
      }
    }

    // Engagement patterns as demographic proxy
    const engagementLevel = this.categorizeEngagement(event.engagement);
    if (this.matchesPersonaEngagement(engagementLevel, persona)) {
      score += 0.3;
      factors.push(`engagement level: ${engagementLevel}`);
    }

    if (factors.length > 0) {
      reasoning.push(`Demographic signals (${score.toFixed(2)}): ${factors.join(', ')}`);
    }

    return Math.min(score, 1);
  }

  /**
   * Calculate behavior patterns score
   */
  private calculateBehaviorScore(event: SocialEvent, persona: Persona, reasoning: string[]): number {
    let score = 0;
    const factors: string[] = [];

    // Purchase driver mentions
    const purchaseDriverMatches = this.findKeywordMatches(
      event.content.text.toLowerCase(),
      persona.behaviorPatterns.purchaseDrivers
    );
    if (purchaseDriverMatches.length > 0) {
      score += 0.4 * Math.min(purchaseDriverMatches.length / 2, 1);
      factors.push(`purchase drivers: ${purchaseDriverMatches.join(', ')}`);
    }

    // Communication style matching
    const communicationStyle = this.inferCommunicationStyle(event);
    if (communicationStyle === persona.behaviorPatterns.communicationPreference) {
      score += 0.3;
      factors.push(`communication style: ${communicationStyle}`);
    }

    // Decision making style indicators
    const decisionIndicators = this.findDecisionMakingIndicators(event.content.text);
    if (decisionIndicators.includes(persona.behaviorPatterns.decisionMakingStyle)) {
      score += 0.3;
      factors.push(`decision style: ${persona.behaviorPatterns.decisionMakingStyle}`);
    }

    if (factors.length > 0) {
      reasoning.push(`Behavior patterns (${score.toFixed(2)}): ${factors.join(', ')}`);
    }

    return Math.min(score, 1);
  }

  /**
   * Calculate temporal patterns score
   */
  private calculateTemporalScore(event: SocialEvent, persona: Persona, reasoning: string[]): number {
    let score = 0;

    // Check if event time matches persona's active hours
    const eventHour = new Date(event.timestamp).getHours();
    const activeHours = persona.platformPreferences.activeHours;

    for (const timeRange of activeHours) {
      const [start, end] = timeRange.split('-').map(h => parseInt(h));
      if (eventHour >= start && eventHour <= end) {
        score += 0.5;
        reasoning.push(`Active hours match: ${timeRange}`);
        break;
      }
    }

    // Platform-specific timing patterns
    const platformTiming = this.getPlatformTimingScore(event.platform, eventHour);
    score += platformTiming * 0.5;

    if (platformTiming > 0) {
      reasoning.push(`Platform timing: ${event.platform} at ${eventHour}:00`);
    }

    return Math.min(score, 1);
  }

  /**
   * Find keyword matches in text
   */
  private findKeywordMatches(text: string, keywords: string[]): string[] {
    const matches: string[] = [];
    
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      if (text.includes(keywordLower) || 
          text.includes(keywordLower.replace(/\s+/g, '')) ||
          this.findSimilarWords(text, keywordLower)) {
        matches.push(keyword);
      }
    }

    return matches;
  }

  /**
   * Find similar words using simple similarity
   */
  private findSimilarWords(text: string, keyword: string): boolean {
    const words = text.split(/\s+/);
    return words.some(word => {
      if (word.length < 3 || keyword.length < 3) return false;
      return this.calculateSimilarity(word, keyword) > 0.7;
    });
  }

  /**
   * Calculate string similarity (simple Levenshtein-based)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Infer content type from event
   */
  private inferContentType(event: SocialEvent): string | null {
    if (event.content.mediaUrls.length > 0) {
      // Check for video indicators
      if (event.platform === Platform.TIKTOK || 
          event.content.mediaUrls.some(url => url.includes('video'))) {
        return 'video';
      }
      return 'image';
    }
    
    if (event.content.text.length > 0) {
      return 'text';
    }

    return null;
  }

  /**
   * Categorize follower count
   */
  private categorizeFollowerCount(count: number): string {
    if (count < 1000) return 'micro';
    if (count < 10000) return 'small';
    if (count < 100000) return 'medium';
    if (count < 1000000) return 'large';
    return 'mega';
  }

  /**
   * Check if follower tier matches persona demographics
   */
  private matchesPersonaDemographics(followerTier: string, persona: Persona): boolean {
    // Simple heuristic - can be made more sophisticated
    const income = persona.demographics.income.toLowerCase();
    
    if (income.includes('high') && ['large', 'mega'].includes(followerTier)) return true;
    if (income.includes('middle') && ['small', 'medium', 'large'].includes(followerTier)) return true;
    if (income.includes('low') && ['micro', 'small'].includes(followerTier)) return true;
    
    return false;
  }

  /**
   * Categorize engagement level
   */
  private categorizeEngagement(engagement: SocialEvent['engagement']): string {
    const rate = engagement.engagementRate;
    
    if (rate > 0.1) return 'high';
    if (rate > 0.05) return 'medium';
    if (rate > 0.01) return 'low';
    return 'minimal';
  }

  /**
   * Check if engagement level matches persona
   */
  private matchesPersonaEngagement(engagementLevel: string, persona: Persona): boolean {
    const style = persona.platformPreferences.engagementStyle.toLowerCase();
    
    if (style.includes('high') && engagementLevel === 'high') return true;
    if (style.includes('interactive') && ['medium', 'high'].includes(engagementLevel)) return true;
    if (style.includes('passive') && ['low', 'minimal'].includes(engagementLevel)) return true;
    
    return engagementLevel !== 'minimal'; // Default: any engagement is good
  }

  /**
   * Infer communication style from event
   */
  private inferCommunicationStyle(event: SocialEvent): string {
    const text = event.content.text.toLowerCase();
    
    if (text.includes('!') || text.includes('amazing') || text.includes('love')) {
      return 'enthusiastic';
    }
    if (text.includes('?') || text.includes('help') || text.includes('advice')) {
      return 'inquisitive';
    }
    if (text.length > 200) {
      return 'detailed';
    }
    if (event.content.hashtags.length > 5) {
      return 'social';
    }
    
    return 'authentic'; // Default
  }

  /**
   * Find decision making style indicators
   */
  private findDecisionMakingIndicators(text: string): string[] {
    const indicators: string[] = [];
    const textLower = text.toLowerCase();
    
    if (textLower.includes('research') || textLower.includes('review') || textLower.includes('compare')) {
      indicators.push('research-driven');
    }
    if (textLower.includes('recommend') || textLower.includes('expert') || textLower.includes('professional')) {
      indicators.push('authority-driven');
    }
    if (textLower.includes('quick') || textLower.includes('instant') || textLower.includes('now')) {
      indicators.push('impulse-driven');
    }
    if (textLower.includes('friend') || textLower.includes('family') || textLower.includes('told me')) {
      indicators.push('social-driven');
    }
    
    return indicators;
  }

  /**
   * Get platform-specific timing score
   */
  private getPlatformTimingScore(platform: Platform, hour: number): number {
    // Platform-specific optimal posting times (simplified)
    const optimalTimes: Record<Platform, number[]> = {
      [Platform.INSTAGRAM]: [9, 10, 11, 19, 20, 21],
      [Platform.TIKTOK]: [6, 7, 8, 19, 20, 21, 22],
      [Platform.FACEBOOK]: [9, 10, 15, 20, 21],
      [Platform.YOUTUBE]: [14, 15, 16, 20, 21, 22],
      [Platform.REDDIT]: [7, 8, 9, 12, 20, 21, 22],
      [Platform.RSS]: [6, 7, 8, 9, 17, 18, 19] // Morning and evening
    };

    const optimal = optimalTimes[platform] || [];
    return optimal.includes(hour) ? 1 : 0;
  }

  /**
   * Update matching metrics
   */
  private updateMatchMetrics(match: PersonaMatch): void {
    const confidence = match.confidence;
    
    if (confidence >= this.config.thresholds.highConfidence) {
      this.metrics.highConfidenceMatches++;
    } else if (confidence >= this.config.thresholds.mediumConfidence) {
      this.metrics.mediumConfidenceMatches++;
    } else {
      this.metrics.lowConfidenceMatches++;
    }

    // Update persona distribution
    const personaId = match.persona.id;
    this.metrics.personaDistribution[personaId] = 
      (this.metrics.personaDistribution[personaId] || 0) + 1;

    // Update average confidence
    const totalMatches = this.metrics.highConfidenceMatches + 
                        this.metrics.mediumConfidenceMatches + 
                        this.metrics.lowConfidenceMatches;
    
    this.metrics.averageConfidence = 
      (this.metrics.averageConfidence * (totalMatches - 1) + confidence) / totalMatches;
  }

  /**
   * Update processing time metrics
   */
  private updateProcessingTime(processingTime: number): void {
    this.metrics.averageMatchingTime = 
      (this.metrics.averageMatchingTime * (this.metrics.totalMatches - 1) + processingTime) / 
      this.metrics.totalMatches;
  }

  /**
   * Get matching metrics
   */
  getMetrics(): MatchingMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalMatches: 0,
      highConfidenceMatches: 0,
      mediumConfidenceMatches: 0,
      lowConfidenceMatches: 0,
      noMatches: 0,
      averageConfidence: 0,
      averageMatchingTime: 0,
      personaDistribution: {}
    };
  }
}