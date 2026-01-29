/**
 * Decision Routing Service
 * Implements confidence-based decision routing
 * - Automatic response for high confidence (>90%)
 * - Suggestion system for medium confidence (70-90%)
 * - Route low confidence items to human review queue
 */

import { SocialEvent, ActionType, UrgencyLevel, IntentCategory, BrandContext } from '../types/core';
import { SentimentResult } from '../ai/SentimentAnalysisService';
import { IntentResult } from '../ai/IntentDetectionService';
import { PriorityScore } from './PriorityScoringService';

export interface RoutingConfig {
  // Confidence thresholds
  confidenceThresholds: {
    autoResponse: number; // >90% - automatic response
    suggestion: number; // 70-90% - suggest actions
    humanReview: number; // <70% - human review required
  };
  // Routing rules
  routingRules: {
    // Always route to human review regardless of confidence
    alwaysHumanReview: {
      intents: IntentCategory[];
      urgencyLevels: UrgencyLevel[];
      priorityThreshold: number;
    };
    // Never auto-respond regardless of confidence
    neverAutoRespond: {
      intents: IntentCategory[];
      platforms: string[];
      keywords: string[];
    };
    // Override confidence for specific scenarios
    confidenceOverrides: Array<{
      condition: string;
      newConfidence: number;
      reasoning: string;
    }>;
  };
  // Queue configuration
  queues: {
    autoResponse: {
      maxConcurrent: number;
      retryAttempts: number;
      timeoutMs: number;
    };
    humanReview: {
      priorityLevels: number;
      escalationTimeoutMs: number;
      assignmentStrategy: 'round-robin' | 'priority' | 'expertise';
    };
    suggestions: {
      maxSuggestions: number;
      suggestionTimeoutMs: number;
      requireApproval: boolean;
    };
  };
}

export interface RoutingDecision {
  route: 'auto-response' | 'suggestion' | 'human-review';
  confidence: number;
  reasoning: string[];
  actions: Array<{
    type: ActionType;
    priority: number;
    confidence: number;
    automated: boolean;
    requiresApproval: boolean;
    parameters: Record<string, any>;
  }>;
  queue: {
    name: string;
    priority: number;
    estimatedWaitTime?: number;
    assignedTo?: string;
  };
  escalation: {
    required: boolean;
    level: string;
    timeoutMs: number;
    conditions: string[];
  };
  monitoring: {
    trackingId: string;
    kpis: string[];
    followUpRequired: boolean;
    followUpDate?: Date;
  };
  metadata: {
    routedAt: Date;
    routingVersion: string;
    overridesApplied: string[];
    processingTime: number;
  };
}

export interface RoutingMetrics {
  totalRoutings: number;
  routeDistribution: {
    autoResponse: number;
    suggestion: number;
    humanReview: number;
  };
  averageConfidence: number;
  averageProcessingTime: number;
  queueMetrics: {
    autoResponse: {
      processed: number;
      failed: number;
      averageResponseTime: number;
    };
    humanReview: {
      queued: number;
      processed: number;
      averageWaitTime: number;
      escalations: number;
    };
    suggestions: {
      generated: number;
      approved: number;
      rejected: number;
      averageApprovalTime: number;
    };
  };
  overrideStats: {
    confidenceOverrides: number;
    alwaysHumanOverrides: number;
    neverAutoOverrides: number;
  };
  platformBreakdown: Record<string, {
    count: number;
    autoResponseRate: number;
    humanReviewRate: number;
  }>;
}

export class DecisionRoutingService {
  private config: RoutingConfig;
  private metrics: RoutingMetrics;

  constructor(config: RoutingConfig) {
    this.config = config;
    this.metrics = {
      totalRoutings: 0,
      routeDistribution: {
        autoResponse: 0,
        suggestion: 0,
        humanReview: 0
      },
      averageConfidence: 0,
      averageProcessingTime: 0,
      queueMetrics: {
        autoResponse: {
          processed: 0,
          failed: 0,
          averageResponseTime: 0
        },
        humanReview: {
          queued: 0,
          processed: 0,
          averageWaitTime: 0,
          escalations: 0
        },
        suggestions: {
          generated: 0,
          approved: 0,
          rejected: 0,
          averageApprovalTime: 0
        }
      },
      overrideStats: {
        confidenceOverrides: 0,
        alwaysHumanOverrides: 0,
        neverAutoOverrides: 0
      },
      platformBreakdown: {}
    };
  }

  /**
   * Route decision based on confidence and business rules
   */
  async routeDecision(
    event: SocialEvent,
    sentimentResult: SentimentResult,
    intentResult: IntentResult,
    priorityScore: PriorityScore,
    brandContext: BrandContext
  ): Promise<RoutingDecision> {
    const startTime = Date.now();
    this.metrics.totalRoutings++;

    try {
      // Calculate overall confidence
      let overallConfidence = this.calculateOverallConfidence(
        sentimentResult,
        intentResult,
        priorityScore
      );

      const reasoning: string[] = [];
      const overridesApplied: string[] = [];

      // Apply confidence overrides
      const confidenceOverride = this.applyConfidenceOverrides(
        event,
        intentResult,
        priorityScore,
        overallConfidence
      );

      if (confidenceOverride) {
        overallConfidence = confidenceOverride.newConfidence;
        reasoning.push(confidenceOverride.reasoning);
        overridesApplied.push('confidence-override');
        this.metrics.overrideStats.confidenceOverrides++;
      }

      // Check always human review rules
      if (this.shouldAlwaysRouteToHuman(intentResult, priorityScore)) {
        const decision = await this.createHumanReviewDecision(
          event,
          sentimentResult,
          intentResult,
          priorityScore,
          brandContext,
          overallConfidence,
          [...reasoning, 'Always human review rule triggered'],
          overridesApplied,
          startTime
        );
        this.metrics.overrideStats.alwaysHumanOverrides++;
        return decision;
      }

      // Check never auto-respond rules
      if (this.shouldNeverAutoRespond(event, intentResult)) {
        // Force to suggestion or human review
        const route = overallConfidence >= this.config.confidenceThresholds.suggestion 
          ? 'suggestion' 
          : 'human-review';
        
        const decision = route === 'suggestion'
          ? await this.createSuggestionDecision(
              event,
              sentimentResult,
              intentResult,
              priorityScore,
              brandContext,
              overallConfidence,
              [...reasoning, 'Never auto-respond rule - routing to suggestions'],
              overridesApplied,
              startTime
            )
          : await this.createHumanReviewDecision(
              event,
              sentimentResult,
              intentResult,
              priorityScore,
              brandContext,
              overallConfidence,
              [...reasoning, 'Never auto-respond rule - routing to human review'],
              overridesApplied,
              startTime
            );

        this.metrics.overrideStats.neverAutoOverrides++;
        return decision;
      }

      // Route based on confidence thresholds
      if (overallConfidence >= this.config.confidenceThresholds.autoResponse) {
        reasoning.push(`High confidence (${(overallConfidence * 100).toFixed(1)}%) - auto-response`);
        return await this.createAutoResponseDecision(
          event,
          sentimentResult,
          intentResult,
          priorityScore,
          brandContext,
          overallConfidence,
          reasoning,
          overridesApplied,
          startTime
        );
      } else if (overallConfidence >= this.config.confidenceThresholds.suggestion) {
        reasoning.push(`Medium confidence (${(overallConfidence * 100).toFixed(1)}%) - suggestions`);
        return await this.createSuggestionDecision(
          event,
          sentimentResult,
          intentResult,
          priorityScore,
          brandContext,
          overallConfidence,
          reasoning,
          overridesApplied,
          startTime
        );
      } else {
        reasoning.push(`Low confidence (${(overallConfidence * 100).toFixed(1)}%) - human review`);
        return await this.createHumanReviewDecision(
          event,
          sentimentResult,
          intentResult,
          priorityScore,
          brandContext,
          overallConfidence,
          reasoning,
          overridesApplied,
          startTime
        );
      }

    } catch (error) {
      console.error('Decision routing failed:', error);
      throw error;
    }
  }

  /**
   * Calculate overall confidence from multiple sources
   */
  private calculateOverallConfidence(
    sentimentResult: SentimentResult,
    intentResult: IntentResult,
    priorityScore: PriorityScore
  ): number {
    // Weighted average of different confidence scores
    const weights = {
      sentiment: 0.3,
      intent: 0.4,
      priority: 0.3
    };

    const sentimentConfidence = sentimentResult.overall.confidence;
    const intentConfidence = intentResult.primary.confidence;
    const priorityConfidence = priorityScore.metadata.confidence;

    return (
      sentimentConfidence * weights.sentiment +
      intentConfidence * weights.intent +
      priorityConfidence * weights.priority
    );
  }

  /**
   * Apply confidence overrides based on specific conditions
   */
  private applyConfidenceOverrides(
    event: SocialEvent,
    intentResult: IntentResult,
    priorityScore: PriorityScore,
    currentConfidence: number
  ): { newConfidence: number; reasoning: string } | null {
    for (const override of this.config.routingRules.confidenceOverrides) {
      if (this.evaluateOverrideCondition(override.condition, event, intentResult, priorityScore)) {
        return {
          newConfidence: override.newConfidence,
          reasoning: override.reasoning
        };
      }
    }
    return null;
  }

  /**
   * Evaluate override condition
   */
  private evaluateOverrideCondition(
    condition: string,
    event: SocialEvent,
    intentResult: IntentResult,
    priorityScore: PriorityScore
  ): boolean {
    // Simple condition evaluation (could be enhanced with a proper expression parser)
    try {
      // Replace placeholders with actual values
      const evaluationContext = {
        platform: event.platform,
        intent: intentResult.primary.intent,
        urgency: intentResult.urgency.level,
        priority: priorityScore.overall,
        followerCount: event.author.followerCount,
        verified: event.author.verified,
        engagementRate: event.engagement.engagementRate
      };

      // Simple string replacement for basic conditions
      let evaluableCondition = condition;
      for (const [key, value] of Object.entries(evaluationContext)) {
        evaluableCondition = evaluableCondition.replace(
          new RegExp(`\\b${key}\\b`, 'g'),
          typeof value === 'string' ? `"${value}"` : String(value)
        );
      }

      // Use Function constructor for safe evaluation (in production, use a proper expression parser)
      return new Function(`return ${evaluableCondition}`)();
    } catch (error) {
      console.warn(`Failed to evaluate override condition: ${condition}`, error);
      return false;
    }
  }

  /**
   * Check if should always route to human review
   */
  private shouldAlwaysRouteToHuman(
    intentResult: IntentResult,
    priorityScore: PriorityScore
  ): boolean {
    const rules = this.config.routingRules.alwaysHumanReview;

    // Check intent-based rules
    if (rules.intents.includes(intentResult.primary.intent)) {
      return true;
    }

    // Check urgency-based rules
    if (rules.urgencyLevels.includes(intentResult.urgency.level)) {
      return true;
    }

    // Check priority threshold
    if (priorityScore.overall >= rules.priorityThreshold) {
      return true;
    }

    return false;
  }

  /**
   * Check if should never auto-respond
   */
  private shouldNeverAutoRespond(
    event: SocialEvent,
    intentResult: IntentResult
  ): boolean {
    const rules = this.config.routingRules.neverAutoRespond;

    // Check intent-based rules
    if (rules.intents.includes(intentResult.primary.intent)) {
      return true;
    }

    // Check platform-based rules
    if (rules.platforms.includes(event.platform)) {
      return true;
    }

    // Check keyword-based rules
    const text = event.content.text.toLowerCase();
    for (const keyword of rules.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        return true;
      }
    }

    return false;
  }

  /**
   * Create auto-response decision
   */
  private async createAutoResponseDecision(
    event: SocialEvent,
    sentimentResult: SentimentResult,
    intentResult: IntentResult,
    priorityScore: PriorityScore,
    brandContext: BrandContext,
    confidence: number,
    reasoning: string[],
    overridesApplied: string[],
    startTime: number
  ): Promise<RoutingDecision> {
    const actions = this.generateAutomatedActions(
      event,
      intentResult,
      priorityScore,
      brandContext
    );

    const trackingId = this.generateTrackingId('auto', event.id);

    const decision: RoutingDecision = {
      route: 'auto-response',
      confidence,
      reasoning,
      actions,
      queue: {
        name: 'auto-response',
        priority: this.calculateQueuePriority(priorityScore, intentResult.urgency.level)
      },
      escalation: {
        required: priorityScore.businessRules.autoEscalation,
        level: priorityScore.businessRules.autoEscalation ? 'high' : 'none',
        timeoutMs: this.config.queues.autoResponse.timeoutMs,
        conditions: priorityScore.businessRules.autoEscalation 
          ? ['auto-escalation-threshold-exceeded']
          : []
      },
      monitoring: {
        trackingId,
        kpis: ['response_time', 'customer_satisfaction', 'resolution_rate'],
        followUpRequired: intentResult.primary.intent === IntentCategory.COMPLAINT,
        followUpDate: intentResult.primary.intent === IntentCategory.COMPLAINT 
          ? new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
          : undefined
      },
      metadata: {
        routedAt: new Date(),
        routingVersion: '1.0.0',
        overridesApplied,
        processingTime: Date.now() - startTime
      }
    };

    // Update metrics
    this.updateMetrics(decision, event.platform);

    return decision;
  }

  /**
   * Create suggestion decision
   */
  private async createSuggestionDecision(
    event: SocialEvent,
    sentimentResult: SentimentResult,
    intentResult: IntentResult,
    priorityScore: PriorityScore,
    brandContext: BrandContext,
    confidence: number,
    reasoning: string[],
    overridesApplied: string[],
    startTime: number
  ): Promise<RoutingDecision> {
    const actions = this.generateSuggestedActions(
      event,
      intentResult,
      priorityScore,
      brandContext
    );

    const trackingId = this.generateTrackingId('suggestion', event.id);

    const decision: RoutingDecision = {
      route: 'suggestion',
      confidence,
      reasoning,
      actions,
      queue: {
        name: 'suggestions',
        priority: this.calculateQueuePriority(priorityScore, intentResult.urgency.level)
      },
      escalation: {
        required: false,
        level: 'none',
        timeoutMs: this.config.queues.suggestions.suggestionTimeoutMs,
        conditions: []
      },
      monitoring: {
        trackingId,
        kpis: ['suggestion_accuracy', 'approval_rate', 'time_to_approval'],
        followUpRequired: true,
        followUpDate: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours
      },
      metadata: {
        routedAt: new Date(),
        routingVersion: '1.0.0',
        overridesApplied,
        processingTime: Date.now() - startTime
      }
    };

    // Update metrics
    this.updateMetrics(decision, event.platform);

    return decision;
  }

  /**
   * Create human review decision
   */
  private async createHumanReviewDecision(
    event: SocialEvent,
    sentimentResult: SentimentResult,
    intentResult: IntentResult,
    priorityScore: PriorityScore,
    brandContext: BrandContext,
    confidence: number,
    reasoning: string[],
    overridesApplied: string[],
    startTime: number
  ): Promise<RoutingDecision> {
    const actions = this.generateHumanReviewActions(
      event,
      intentResult,
      priorityScore,
      brandContext
    );

    const trackingId = this.generateTrackingId('human', event.id);
    const queuePriority = this.calculateQueuePriority(priorityScore, intentResult.urgency.level);

    const decision: RoutingDecision = {
      route: 'human-review',
      confidence,
      reasoning,
      actions,
      queue: {
        name: 'human-review',
        priority: queuePriority,
        estimatedWaitTime: this.estimateWaitTime(queuePriority),
        assignedTo: this.assignReviewer(intentResult, priorityScore, brandContext)
      },
      escalation: {
        required: queuePriority >= 8 || intentResult.urgency.level === UrgencyLevel.CRITICAL,
        level: queuePriority >= 8 ? 'critical' : 'standard',
        timeoutMs: this.config.queues.humanReview.escalationTimeoutMs,
        conditions: this.getEscalationConditions(intentResult, priorityScore)
      },
      monitoring: {
        trackingId,
        kpis: ['review_time', 'resolution_quality', 'customer_satisfaction'],
        followUpRequired: true,
        followUpDate: new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours
      },
      metadata: {
        routedAt: new Date(),
        routingVersion: '1.0.0',
        overridesApplied,
        processingTime: Date.now() - startTime
      }
    };

    // Update metrics
    this.updateMetrics(decision, event.platform);

    return decision;
  }

  /**
   * Generate automated actions for auto-response
   */
  private generateAutomatedActions(
    event: SocialEvent,
    intentResult: IntentResult,
    priorityScore: PriorityScore,
    brandContext: BrandContext
  ): Array<{
    type: ActionType;
    priority: number;
    confidence: number;
    automated: boolean;
    requiresApproval: boolean;
    parameters: Record<string, any>;
  }> {
    const actions: Array<{
      type: ActionType;
      priority: number;
      confidence: number;
      automated: boolean;
      requiresApproval: boolean;
      parameters: Record<string, any>;
    }> = [];

    // Generate actions based on intent
    switch (intentResult.primary.intent) {
      case IntentCategory.PRAISE:
        actions.push({
          type: ActionType.RESPOND,
          priority: 1,
          confidence: 0.9,
          automated: true,
          requiresApproval: false,
          parameters: {
            template: 'thank_you',
            tone: brandContext.playbook.voiceAndTone.primaryTone,
            personalization: {
              username: event.author.username,
              platform: event.platform
            }
          }
        });
        break;

      case IntentCategory.INFORMATION_SEEKING:
        actions.push({
          type: ActionType.RESPOND,
          priority: 1,
          confidence: 0.8,
          automated: true,
          requiresApproval: false,
          parameters: {
            template: 'information_response',
            includeLinks: true,
            tone: 'helpful',
            maxLength: 280
          }
        });
        break;

      case IntentCategory.PURCHASE_INQUIRY:
        actions.push({
          type: ActionType.RESPOND,
          priority: 1,
          confidence: 0.85,
          automated: true,
          requiresApproval: false,
          parameters: {
            template: 'purchase_assistance',
            includeProductLinks: true,
            offerSupport: true,
            tone: 'friendly'
          }
        });
        break;
    }

    // Add monitoring action
    actions.push({
      type: ActionType.MONITOR,
      priority: 2,
      confidence: 1.0,
      automated: true,
      requiresApproval: false,
      parameters: {
        duration: '24h',
        metrics: ['engagement', 'sentiment', 'follow_up_questions']
      }
    });

    return actions;
  }

  /**
   * Generate suggested actions for human approval
   */
  private generateSuggestedActions(
    event: SocialEvent,
    intentResult: IntentResult,
    priorityScore: PriorityScore,
    brandContext: BrandContext
  ): Array<{
    type: ActionType;
    priority: number;
    confidence: number;
    automated: boolean;
    requiresApproval: boolean;
    parameters: Record<string, any>;
  }> {
    const actions: Array<{
      type: ActionType;
      priority: number;
      confidence: number;
      automated: boolean;
      requiresApproval: boolean;
      parameters: Record<string, any>;
    }> = [];

    // Generate multiple response options
    actions.push({
      type: ActionType.RESPOND,
      priority: 1,
      confidence: 0.7,
      automated: false,
      requiresApproval: true,
      parameters: {
        suggestions: [
          {
            template: 'primary_response',
            tone: brandContext.playbook.voiceAndTone.primaryTone,
            reasoning: 'Matches brand voice and addresses main concern'
          },
          {
            template: 'alternative_response',
            tone: 'empathetic',
            reasoning: 'More empathetic approach for sensitive topic'
          }
        ],
        context: {
          intent: intentResult.primary.intent,
          sentiment: intentResult.primary.confidence,
          urgency: intentResult.urgency.level
        }
      }
    });

    return actions;
  }

  /**
   * Generate actions for human review
   */
  private generateHumanReviewActions(
    event: SocialEvent,
    intentResult: IntentResult,
    priorityScore: PriorityScore,
    brandContext: BrandContext
  ): Array<{
    type: ActionType;
    priority: number;
    confidence: number;
    automated: boolean;
    requiresApproval: boolean;
    parameters: Record<string, any>;
  }> {
    const actions: Array<{
      type: ActionType;
      priority: number;
      confidence: number;
      automated: boolean;
      requiresApproval: boolean;
      parameters: Record<string, any>;
    }> = [];

    // Provide context and recommendations for human reviewer
    actions.push({
      type: ActionType.ESCALATE,
      priority: 1,
      confidence: 1.0,
      automated: false,
      requiresApproval: false,
      parameters: {
        reviewContext: {
          event: {
            platform: event.platform,
            author: event.author,
            content: event.content.text,
            engagement: event.engagement
          },
          analysis: {
            intent: intentResult.primary.intent,
            sentiment: intentResult.primary.confidence,
            urgency: intentResult.urgency.level,
            priority: priorityScore.overall
          },
          brandContext: {
            playbook: brandContext.playbook.id,
            matchedPersona: brandContext.personas[0]?.name,
            complianceNotes: []
          }
        },
        recommendations: this.generateHumanRecommendations(intentResult, priorityScore)
      }
    });

    return actions;
  }

  /**
   * Generate recommendations for human reviewers
   */
  private generateHumanRecommendations(
    intentResult: IntentResult,
    priorityScore: PriorityScore
  ): string[] {
    const recommendations: string[] = [];

    if (intentResult.urgency.level === UrgencyLevel.CRITICAL) {
      recommendations.push('URGENT: Requires immediate attention due to critical urgency level');
    }

    if (priorityScore.overall >= 80) {
      recommendations.push('High priority event - consider escalating to senior team member');
    }

    if (intentResult.primary.intent === IntentCategory.COMPLAINT) {
      recommendations.push('Complaint detected - follow complaint resolution protocol');
    }

    if (intentResult.entities.some(e => e.type === 'EMAIL')) {
      recommendations.push('Customer provided contact information - consider direct outreach');
    }

    return recommendations;
  }

  /**
   * Calculate queue priority (1-10, 10 being highest)
   */
  private calculateQueuePriority(
    priorityScore: PriorityScore,
    urgencyLevel: UrgencyLevel
  ): number {
    let priority = Math.ceil(priorityScore.overall / 10); // 0-100 -> 1-10

    // Urgency modifiers
    switch (urgencyLevel) {
      case UrgencyLevel.CRITICAL:
        priority = Math.max(priority, 9);
        break;
      case UrgencyLevel.HIGH:
        priority = Math.max(priority, 7);
        break;
      case UrgencyLevel.MEDIUM:
        priority = Math.max(priority, 5);
        break;
    }

    return Math.min(10, Math.max(1, priority));
  }

  /**
   * Estimate wait time based on queue priority
   */
  private estimateWaitTime(priority: number): number {
    // Higher priority = lower wait time
    const baseWaitTime = 60 * 60 * 1000; // 1 hour in ms
    const priorityMultiplier = (11 - priority) / 10; // 10->0.1, 1->1.0
    return Math.round(baseWaitTime * priorityMultiplier);
  }

  /**
   * Assign reviewer based on expertise and availability
   */
  private assignReviewer(
    intentResult: IntentResult,
    priorityScore: PriorityScore,
    brandContext: BrandContext
  ): string | undefined {
    // This would integrate with a real assignment system
    // For now, return undefined to indicate no specific assignment
    return undefined;
  }

  /**
   * Get escalation conditions
   */
  private getEscalationConditions(
    intentResult: IntentResult,
    priorityScore: PriorityScore
  ): string[] {
    const conditions: string[] = [];

    if (intentResult.urgency.level === UrgencyLevel.CRITICAL) {
      conditions.push('critical-urgency');
    }

    if (priorityScore.overall >= 90) {
      conditions.push('high-priority-score');
    }

    if (priorityScore.businessRules.autoEscalation) {
      conditions.push('auto-escalation-triggered');
    }

    return conditions;
  }

  /**
   * Generate tracking ID
   */
  private generateTrackingId(prefix: string, eventId: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${random}-${eventId.substring(0, 8)}`;
  }

  /**
   * Update service metrics
   */
  private updateMetrics(decision: RoutingDecision, platform: string): void {
    // Update route distribution
    this.metrics.routeDistribution[decision.route]++;

    // Update average confidence
    this.metrics.averageConfidence = 
      (this.metrics.averageConfidence * (this.metrics.totalRoutings - 1) + decision.confidence) / 
      this.metrics.totalRoutings;

    // Update average processing time
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime * (this.metrics.totalRoutings - 1) + decision.metadata.processingTime) / 
      this.metrics.totalRoutings;

    // Update platform breakdown
    if (!this.metrics.platformBreakdown[platform]) {
      this.metrics.platformBreakdown[platform] = {
        count: 0,
        autoResponseRate: 0,
        humanReviewRate: 0
      };
    }

    const platformStats = this.metrics.platformBreakdown[platform];
    platformStats.count++;
    
    if (decision.route === 'auto-response') {
      platformStats.autoResponseRate = 
        (platformStats.autoResponseRate * (platformStats.count - 1) + 1) / platformStats.count;
    } else if (decision.route === 'human-review') {
      platformStats.humanReviewRate = 
        (platformStats.humanReviewRate * (platformStats.count - 1) + 1) / platformStats.count;
    }

    // Update queue metrics based on route
    switch (decision.route) {
      case 'auto-response':
        // These would be updated when actions are actually executed
        break;
      case 'suggestion':
        this.metrics.queueMetrics.suggestions.generated++;
        break;
      case 'human-review':
        this.metrics.queueMetrics.humanReview.queued++;
        break;
    }
  }

  /**
   * Get service metrics
   */
  getMetrics(): RoutingMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRoutings: 0,
      routeDistribution: {
        autoResponse: 0,
        suggestion: 0,
        humanReview: 0
      },
      averageConfidence: 0,
      averageProcessingTime: 0,
      queueMetrics: {
        autoResponse: {
          processed: 0,
          failed: 0,
          averageResponseTime: 0
        },
        humanReview: {
          queued: 0,
          processed: 0,
          averageWaitTime: 0,
          escalations: 0
        },
        suggestions: {
          generated: 0,
          approved: 0,
          rejected: 0,
          averageApprovalTime: 0
        }
      },
      overrideStats: {
        confidenceOverrides: 0,
        alwaysHumanOverrides: 0,
        neverAutoOverrides: 0
      },
      platformBreakdown: {}
    };
  }
}