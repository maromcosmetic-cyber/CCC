/**
 * Priority Scoring Service
 * Creates scoring system based on urgency, impact, sentiment, reach, and brand risk
 * Implements priority modifiers and business rule evaluation
 */

import { SocialEvent, Platform, UrgencyLevel, SentimentLabel, IntentCategory } from '../types/core';
import { SentimentResult } from '../ai/SentimentAnalysisService';
import { IntentResult } from '../ai/IntentDetectionService';
import { BrandContext } from '../types/core';

export interface PriorityConfig {
  // Scoring weights (must sum to 1.0)
  weights: {
    urgency: number;
    impact: number;
    sentiment: number;
    reach: number;
    brandRisk: number;
  };
  // Urgency scoring
  urgencyScoring: {
    [key in UrgencyLevel]: number;
  };
  // Impact factors
  impactFactors: {
    intentMultipliers: {
      [key in IntentCategory]: number;
    };
    platformMultipliers: {
      [key in Platform]: number;
    };
    verifiedAccountBonus: number;
    highEngagementThreshold: number;
    highEngagementBonus: number;
  };
  // Sentiment impact
  sentimentImpact: {
    positiveBonus: number;
    negativeMultiplier: number;
    neutralBase: number;
    confidenceThreshold: number;
  };
  // Reach calculation
  reachFactors: {
    followerCountWeight: number;
    engagementRateWeight: number;
    viralityThreshold: number;
    viralityBonus: number;
    platformReachModifiers: {
      [key in Platform]: number;
    };
  };
  // Brand risk assessment
  brandRisk: {
    complianceViolationMultiplier: number;
    negativeViralityRisk: number;
    competitorMentionRisk: number;
    crisisKeywords: string[];
    crisisMultiplier: number;
  };
  // Business rules
  businessRules: {
    minimumScore: number;
    maximumScore: number;
    autoEscalationThreshold: number;
    timeDecayFactor: number; // How much priority decreases over time
    timeDecayHours: number;
  };
}

export interface PriorityScore {
  overall: number; // 0-100
  components: {
    urgency: number;
    impact: number;
    sentiment: number;
    reach: number;
    brandRisk: number;
  };
  factors: Array<{
    factor: string;
    value: number;
    weight: number;
    contribution: number;
    reasoning: string;
  }>;
  businessRules: {
    autoEscalation: boolean;
    timeDecay: number;
    appliedModifiers: string[];
  };
  metadata: {
    calculatedAt: Date;
    eventAge: number; // Hours since event
    confidence: number;
    version: string;
  };
}

export interface PriorityMetrics {
  totalScores: number;
  averageScore: number;
  scoreDistribution: {
    critical: number; // 80-100
    high: number; // 60-80
    medium: number; // 40-60
    low: number; // 20-40
    minimal: number; // 0-20
  };
  componentAverages: {
    urgency: number;
    impact: number;
    sentiment: number;
    reach: number;
    brandRisk: number;
  };
  autoEscalations: number;
  processingTime: number;
  platformBreakdown: Record<Platform, {
    count: number;
    averageScore: number;
    highPriorityCount: number;
  }>;
}

export class PriorityScoringService {
  private config: PriorityConfig;
  private metrics: PriorityMetrics;

  constructor(config: PriorityConfig) {
    this.config = config;
    this.metrics = {
      totalScores: 0,
      averageScore: 0,
      scoreDistribution: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        minimal: 0
      },
      componentAverages: {
        urgency: 0,
        impact: 0,
        sentiment: 0,
        reach: 0,
        brandRisk: 0
      },
      autoEscalations: 0,
      processingTime: 0,
      platformBreakdown: {} as Record<Platform, any>
    };

    this.initializePlatformMetrics();
  }

  /**
   * Calculate priority score for an event
   */
  async calculatePriority(
    event: SocialEvent,
    sentimentResult: SentimentResult,
    intentResult: IntentResult,
    brandContext: BrandContext
  ): Promise<PriorityScore> {
    const startTime = Date.now();
    this.metrics.totalScores++;

    try {
      const eventAge = this.calculateEventAge(event.timestamp);
      const factors: Array<{
        factor: string;
        value: number;
        weight: number;
        contribution: number;
        reasoning: string;
      }> = [];

      // 1. Calculate urgency score
      const urgencyScore = this.calculateUrgencyScore(intentResult, factors);

      // 2. Calculate impact score
      const impactScore = this.calculateImpactScore(event, intentResult, factors);

      // 3. Calculate sentiment score
      const sentimentScore = this.calculateSentimentScore(sentimentResult, factors);

      // 4. Calculate reach score
      const reachScore = this.calculateReachScore(event, factors);

      // 5. Calculate brand risk score
      const brandRiskScore = this.calculateBrandRiskScore(
        event, 
        sentimentResult, 
        intentResult, 
        brandContext, 
        factors
      );

      // Calculate weighted overall score
      const components = {
        urgency: urgencyScore,
        impact: impactScore,
        sentiment: sentimentScore,
        reach: reachScore,
        brandRisk: brandRiskScore
      };

      let overallScore = 
        (urgencyScore * this.config.weights.urgency) +
        (impactScore * this.config.weights.impact) +
        (sentimentScore * this.config.weights.sentiment) +
        (reachScore * this.config.weights.reach) +
        (brandRiskScore * this.config.weights.brandRisk);

      // Apply time decay
      const timeDecay = this.calculateTimeDecay(eventAge);
      overallScore *= timeDecay;

      // Apply business rules
      const businessRules = this.applyBusinessRules(overallScore, eventAge);
      overallScore = Math.max(
        this.config.businessRules.minimumScore,
        Math.min(this.config.businessRules.maximumScore, overallScore)
      );

      // Calculate confidence based on data quality
      const confidence = this.calculateConfidence(event, sentimentResult, intentResult);

      const priorityScore: PriorityScore = {
        overall: Math.round(overallScore * 100) / 100,
        components,
        factors,
        businessRules: {
          ...businessRules,
          timeDecay
        },
        metadata: {
          calculatedAt: new Date(),
          eventAge,
          confidence,
          version: '1.0.0'
        }
      };

      // Update metrics
      this.updateMetrics(priorityScore, event.platform, Date.now() - startTime);

      return priorityScore;

    } catch (error) {
      console.error('Priority scoring failed:', error);
      throw error;
    }
  }

  /**
   * Batch calculate priorities for multiple events
   */
  async batchCalculatePriority(
    events: Array<{
      event: SocialEvent;
      sentimentResult: SentimentResult;
      intentResult: IntentResult;
      brandContext: BrandContext;
    }>
  ): Promise<PriorityScore[]> {
    const promises = events.map(({ event, sentimentResult, intentResult, brandContext }) =>
      this.calculatePriority(event, sentimentResult, intentResult, brandContext)
    );

    return await Promise.all(promises);
  }

  /**
   * Calculate urgency score component
   */
  private calculateUrgencyScore(
    intentResult: IntentResult,
    factors: Array<{
      factor: string;
      value: number;
      weight: number;
      contribution: number;
      reasoning: string;
    }>
  ): number {
    const baseScore = this.config.urgencyScoring[intentResult.urgency.level];
    const weight = this.config.weights.urgency;
    const contribution = baseScore * weight;

    factors.push({
      factor: 'Urgency Level',
      value: baseScore,
      weight,
      contribution,
      reasoning: `${intentResult.urgency.level} urgency with score ${intentResult.urgency.score.toFixed(2)}`
    });

    // Add urgency factors as additional context
    for (const factor of intentResult.urgency.factors) {
      if (factor.impact > 0.1) {
        factors.push({
          factor: `Urgency: ${factor.factor}`,
          value: factor.impact,
          weight: weight * 0.1, // Sub-factor weight
          contribution: factor.impact * weight * 0.1,
          reasoning: factor.reasoning
        });
      }
    }

    return baseScore;
  }

  /**
   * Calculate impact score component
   */
  private calculateImpactScore(
    event: SocialEvent,
    intentResult: IntentResult,
    factors: Array<{
      factor: string;
      value: number;
      weight: number;
      contribution: number;
      reasoning: string;
    }>
  ): number {
    let impactScore = 0;
    const weight = this.config.weights.impact;

    // Intent-based impact
    const intentMultiplier = this.config.impactFactors.intentMultipliers[intentResult.primary.intent];
    const intentImpact = intentResult.primary.confidence * intentMultiplier;
    impactScore += intentImpact * 0.4;

    factors.push({
      factor: 'Intent Impact',
      value: intentImpact,
      weight: weight * 0.4,
      contribution: intentImpact * weight * 0.4,
      reasoning: `${intentResult.primary.intent} with confidence ${intentResult.primary.confidence.toFixed(2)}`
    });

    // Platform-based impact
    const platformMultiplier = this.config.impactFactors.platformMultipliers[event.platform];
    impactScore += platformMultiplier * 0.2;

    factors.push({
      factor: 'Platform Impact',
      value: platformMultiplier,
      weight: weight * 0.2,
      contribution: platformMultiplier * weight * 0.2,
      reasoning: `${event.platform} platform multiplier`
    });

    // Verified account bonus
    if (event.author.verified) {
      const verifiedBonus = this.config.impactFactors.verifiedAccountBonus;
      impactScore += verifiedBonus;

      factors.push({
        factor: 'Verified Account',
        value: verifiedBonus,
        weight: weight * 0.1,
        contribution: verifiedBonus * weight * 0.1,
        reasoning: 'Verified account increases visibility and credibility'
      });
    }

    // High engagement bonus
    if (event.engagement.engagementRate >= this.config.impactFactors.highEngagementThreshold) {
      const engagementBonus = this.config.impactFactors.highEngagementBonus;
      impactScore += engagementBonus;

      factors.push({
        factor: 'High Engagement',
        value: engagementBonus,
        weight: weight * 0.2,
        contribution: engagementBonus * weight * 0.2,
        reasoning: `Engagement rate ${(event.engagement.engagementRate * 100).toFixed(1)}% exceeds threshold`
      });
    }

    // Entity-based impact (from intent detection)
    const entityImpact = this.calculateEntityImpact(intentResult);
    impactScore += entityImpact * 0.1;

    if (entityImpact > 0) {
      factors.push({
        factor: 'Entity Impact',
        value: entityImpact,
        weight: weight * 0.1,
        contribution: entityImpact * weight * 0.1,
        reasoning: `${intentResult.entities.length} entities detected`
      });
    }

    return Math.min(1, impactScore);
  }

  /**
   * Calculate sentiment score component
   */
  private calculateSentimentScore(
    sentimentResult: SentimentResult,
    factors: Array<{
      factor: string;
      value: number;
      weight: number;
      contribution: number;
      reasoning: string;
    }>
  ): number {
    let sentimentScore = this.config.sentimentImpact.neutralBase;
    const weight = this.config.weights.sentiment;

    // Only apply sentiment impact if confidence is high enough
    if (sentimentResult.overall.confidence >= this.config.sentimentImpact.confidenceThreshold) {
      switch (sentimentResult.overall.label) {
        case SentimentLabel.POSITIVE:
          sentimentScore += this.config.sentimentImpact.positiveBonus;
          break;
        case SentimentLabel.NEGATIVE:
          sentimentScore *= this.config.sentimentImpact.negativeMultiplier;
          break;
        case SentimentLabel.NEUTRAL:
          // Keep base score
          break;
      }

      factors.push({
        factor: 'Sentiment Impact',
        value: sentimentResult.overall.score,
        weight,
        contribution: (sentimentScore - this.config.sentimentImpact.neutralBase) * weight,
        reasoning: `${sentimentResult.overall.label} sentiment (${sentimentResult.overall.score.toFixed(2)}) with ${(sentimentResult.overall.confidence * 100).toFixed(1)}% confidence`
      });
    } else {
      factors.push({
        factor: 'Sentiment Impact',
        value: 0,
        weight,
        contribution: 0,
        reasoning: `Low confidence sentiment (${(sentimentResult.overall.confidence * 100).toFixed(1)}%) - using neutral base`
      });
    }

    // Aspect sentiment impact
    const aspectImpact = this.calculateAspectSentimentImpact(sentimentResult);
    sentimentScore += aspectImpact * 0.2;

    if (aspectImpact !== 0) {
      factors.push({
        factor: 'Aspect Sentiment',
        value: aspectImpact,
        weight: weight * 0.2,
        contribution: aspectImpact * weight * 0.2,
        reasoning: `${sentimentResult.aspectSentiments.length} aspects analyzed`
      });
    }

    return Math.min(1, sentimentScore);
  }

  /**
   * Calculate reach score component
   */
  private calculateReachScore(
    event: SocialEvent,
    factors: Array<{
      factor: string;
      value: number;
      weight: number;
      contribution: number;
      reasoning: string;
    }>
  ): number {
    const weight = this.config.weights.reach;

    // Follower count impact (logarithmic scale)
    const followerScore = Math.min(1, Math.log10(event.author.followerCount + 1) / 7); // Max at 10M followers
    const followerImpact = followerScore * this.config.reachFactors.followerCountWeight;

    factors.push({
      factor: 'Follower Reach',
      value: followerScore,
      weight: weight * this.config.reachFactors.followerCountWeight,
      contribution: followerImpact * weight,
      reasoning: `${event.author.followerCount.toLocaleString()} followers`
    });

    // Engagement rate impact
    const engagementImpact = event.engagement.engagementRate * this.config.reachFactors.engagementRateWeight;

    factors.push({
      factor: 'Engagement Reach',
      value: event.engagement.engagementRate,
      weight: weight * this.config.reachFactors.engagementRateWeight,
      contribution: engagementImpact * weight,
      reasoning: `${(event.engagement.engagementRate * 100).toFixed(1)}% engagement rate`
    });

    // Platform reach modifier
    const platformModifier = this.config.reachFactors.platformReachModifiers[event.platform];
    const platformImpact = platformModifier - 1; // Modifier is multiplicative, convert to additive

    factors.push({
      factor: 'Platform Reach',
      value: platformModifier,
      weight: weight * 0.2,
      contribution: platformImpact * weight * 0.2,
      reasoning: `${event.platform} reach modifier: ${platformModifier}`
    });

    // Virality bonus
    const totalEngagement = event.engagement.likes + event.engagement.shares + event.engagement.comments;
    const viralityRatio = totalEngagement / Math.max(event.author.followerCount, 1);
    
    let viralityBonus = 0;
    if (viralityRatio >= this.config.reachFactors.viralityThreshold) {
      viralityBonus = this.config.reachFactors.viralityBonus;
      
      factors.push({
        factor: 'Virality Bonus',
        value: viralityRatio,
        weight: weight * 0.2,
        contribution: viralityBonus * weight * 0.2,
        reasoning: `Viral content: ${(viralityRatio * 100).toFixed(1)}% engagement-to-follower ratio`
      });
    }

    const reachScore = (followerImpact + engagementImpact) * platformModifier + viralityBonus;
    return Math.min(1, reachScore);
  }

  /**
   * Calculate brand risk score component
   */
  private calculateBrandRiskScore(
    event: SocialEvent,
    sentimentResult: SentimentResult,
    intentResult: IntentResult,
    brandContext: BrandContext,
    factors: Array<{
      factor: string;
      value: number;
      weight: number;
      contribution: number;
      reasoning: string;
    }>
  ): number {
    let riskScore = 0;
    const weight = this.config.weights.brandRisk;

    // Compliance violation risk
    // Note: This would integrate with ComplianceValidationService
    const complianceRisk = 0; // Placeholder - would check for violations
    if (complianceRisk > 0) {
      const complianceImpact = complianceRisk * this.config.brandRisk.complianceViolationMultiplier;
      riskScore += complianceImpact;

      factors.push({
        factor: 'Compliance Risk',
        value: complianceRisk,
        weight: weight * 0.4,
        contribution: complianceImpact * weight * 0.4,
        reasoning: 'Potential compliance violations detected'
      });
    }

    // Negative virality risk
    if (sentimentResult.overall.label === SentimentLabel.NEGATIVE) {
      const totalEngagement = event.engagement.likes + event.engagement.shares + event.engagement.comments;
      const viralityRatio = totalEngagement / Math.max(event.author.followerCount, 1);
      
      if (viralityRatio >= this.config.reachFactors.viralityThreshold) {
        const negativeViralRisk = this.config.brandRisk.negativeViralityRisk;
        riskScore += negativeViralRisk;

        factors.push({
          factor: 'Negative Virality Risk',
          value: viralityRatio,
          weight: weight * 0.3,
          contribution: negativeViralRisk * weight * 0.3,
          reasoning: 'Negative content going viral poses brand risk'
        });
      }
    }

    // Competitor mention risk
    const competitorMentions = this.detectCompetitorMentions(event.content.text);
    if (competitorMentions.length > 0) {
      const competitorRisk = this.config.brandRisk.competitorMentionRisk;
      riskScore += competitorRisk;

      factors.push({
        factor: 'Competitor Mention Risk',
        value: competitorMentions.length,
        weight: weight * 0.2,
        contribution: competitorRisk * weight * 0.2,
        reasoning: `Mentions competitors: ${competitorMentions.join(', ')}`
      });
    }

    // Crisis keyword detection
    const crisisKeywords = this.detectCrisisKeywords(event.content.text);
    if (crisisKeywords.length > 0) {
      const crisisRisk = this.config.brandRisk.crisisMultiplier;
      riskScore += crisisRisk;

      factors.push({
        factor: 'Crisis Keywords',
        value: crisisKeywords.length,
        weight: weight * 0.3,
        contribution: crisisRisk * weight * 0.3,
        reasoning: `Crisis keywords detected: ${crisisKeywords.join(', ')}`
      });
    }

    // Intent-based risk
    if (intentResult.primary.intent === IntentCategory.COMPLAINT && 
        intentResult.urgency.level === UrgencyLevel.CRITICAL) {
      const intentRisk = 0.3;
      riskScore += intentRisk;

      factors.push({
        factor: 'Critical Complaint Risk',
        value: intentRisk,
        weight: weight * 0.2,
        contribution: intentRisk * weight * 0.2,
        reasoning: 'Critical complaint poses immediate brand risk'
      });
    }

    return Math.min(1, riskScore);
  }

  /**
   * Calculate entity impact from intent result
   */
  private calculateEntityImpact(intentResult: IntentResult): number {
    let impact = 0;

    // Price mentions increase impact for purchase inquiries
    const priceEntities = intentResult.entities.filter(e => e.type === 'PRICE');
    if (priceEntities.length > 0 && intentResult.primary.intent === IntentCategory.PURCHASE_INQUIRY) {
      impact += 0.2;
    }

    // Time entities increase urgency impact
    const timeEntities = intentResult.entities.filter(e => e.type === 'TIME');
    if (timeEntities.length > 0) {
      impact += 0.1 * timeEntities.length;
    }

    // Contact entities suggest direct engagement need
    const contactEntities = intentResult.entities.filter(e => e.type === 'EMAIL');
    if (contactEntities.length > 0) {
      impact += 0.15;
    }

    return Math.min(0.5, impact);
  }

  /**
   * Calculate aspect sentiment impact
   */
  private calculateAspectSentimentImpact(sentimentResult: SentimentResult): number {
    if (sentimentResult.aspectSentiments.length === 0) return 0;

    let impact = 0;
    
    for (const aspect of sentimentResult.aspectSentiments) {
      if (aspect.confidence >= 0.7) {
        switch (aspect.sentiment) {
          case SentimentLabel.NEGATIVE:
            impact -= 0.1; // Negative aspects increase priority
            break;
          case SentimentLabel.POSITIVE:
            impact += 0.05; // Positive aspects slightly increase priority
            break;
        }
      }
    }

    return Math.max(-0.3, Math.min(0.2, impact));
  }

  /**
   * Detect competitor mentions in text
   */
  private detectCompetitorMentions(text: string): string[] {
    // This would be configured with actual competitor names
    const competitors = ['competitor1', 'competitor2', 'rival brand'];
    const textLower = text.toLowerCase();
    
    return competitors.filter(competitor => 
      textLower.includes(competitor.toLowerCase())
    );
  }

  /**
   * Detect crisis keywords in text
   */
  private detectCrisisKeywords(text: string): string[] {
    const textLower = text.toLowerCase();
    
    return this.config.brandRisk.crisisKeywords.filter(keyword =>
      textLower.includes(keyword.toLowerCase())
    );
  }

  /**
   * Calculate event age in hours
   */
  private calculateEventAge(timestamp: string): number {
    const eventTime = new Date(timestamp).getTime();
    const now = Date.now();
    return (now - eventTime) / (1000 * 60 * 60); // Hours
  }

  /**
   * Calculate time decay factor
   */
  private calculateTimeDecay(eventAgeHours: number): number {
    if (eventAgeHours <= 0) return 1;
    
    const decayRate = this.config.businessRules.timeDecayFactor;
    const decayPeriod = this.config.businessRules.timeDecayHours;
    
    // Exponential decay: factor^(age/period)
    return Math.pow(decayRate, eventAgeHours / decayPeriod);
  }

  /**
   * Apply business rules
   */
  private applyBusinessRules(score: number, eventAge: number): {
    autoEscalation: boolean;
    appliedModifiers: string[];
  } {
    const appliedModifiers: string[] = [];
    let autoEscalation = false;

    // Auto-escalation threshold
    if (score >= this.config.businessRules.autoEscalationThreshold) {
      autoEscalation = true;
      appliedModifiers.push('auto-escalation');
      this.metrics.autoEscalations++;
    }

    // Time-based modifiers
    if (eventAge > 24) {
      appliedModifiers.push('aged-content');
    } else if (eventAge < 1) {
      appliedModifiers.push('fresh-content');
    }

    return {
      autoEscalation,
      appliedModifiers
    };
  }

  /**
   * Calculate confidence based on data quality
   */
  private calculateConfidence(
    event: SocialEvent,
    sentimentResult: SentimentResult,
    intentResult: IntentResult
  ): number {
    let confidence = 1.0;

    // Reduce confidence for low-quality data
    if (event.content.text.length < 10) {
      confidence -= 0.2;
    }

    if (event.author.followerCount === 0) {
      confidence -= 0.1;
    }

    // Factor in AI model confidence
    confidence *= (sentimentResult.overall.confidence * 0.5 + intentResult.primary.confidence * 0.5);

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Initialize platform metrics
   */
  private initializePlatformMetrics(): void {
    Object.values(Platform).forEach(platform => {
      this.metrics.platformBreakdown[platform] = {
        count: 0,
        averageScore: 0,
        highPriorityCount: 0
      };
    });
  }

  /**
   * Update metrics after scoring
   */
  private updateMetrics(score: PriorityScore, platform: Platform, processingTime: number): void {
    // Update overall metrics
    this.metrics.averageScore = 
      (this.metrics.averageScore * (this.metrics.totalScores - 1) + score.overall) / 
      this.metrics.totalScores;

    this.metrics.processingTime = 
      (this.metrics.processingTime * (this.metrics.totalScores - 1) + processingTime) / 
      this.metrics.totalScores;

    // Update score distribution
    if (score.overall >= 80) {
      this.metrics.scoreDistribution.critical++;
    } else if (score.overall >= 60) {
      this.metrics.scoreDistribution.high++;
    } else if (score.overall >= 40) {
      this.metrics.scoreDistribution.medium++;
    } else if (score.overall >= 20) {
      this.metrics.scoreDistribution.low++;
    } else {
      this.metrics.scoreDistribution.minimal++;
    }

    // Update component averages
    Object.keys(score.components).forEach(component => {
      const key = component as keyof typeof score.components;
      this.metrics.componentAverages[key] = 
        (this.metrics.componentAverages[key] * (this.metrics.totalScores - 1) + score.components[key]) / 
        this.metrics.totalScores;
    });

    // Update platform breakdown
    const platformStats = this.metrics.platformBreakdown[platform];
    platformStats.count++;
    platformStats.averageScore = 
      (platformStats.averageScore * (platformStats.count - 1) + score.overall) / 
      platformStats.count;
    
    if (score.overall >= 60) {
      platformStats.highPriorityCount++;
    }
  }

  /**
   * Get service metrics
   */
  getMetrics(): PriorityMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalScores: 0,
      averageScore: 0,
      scoreDistribution: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        minimal: 0
      },
      componentAverages: {
        urgency: 0,
        impact: 0,
        sentiment: 0,
        reach: 0,
        brandRisk: 0
      },
      autoEscalations: 0,
      processingTime: 0,
      platformBreakdown: {} as Record<Platform, any>
    };

    this.initializePlatformMetrics();
  }
}