/**
 * Decision Engine
 * Unified decision engine that integrates all decision components:
 * - Priority scoring
 * - Confidence-based routing
 * - Action execution
 * 
 * Orchestrates the complete decision-making process from event analysis to action execution
 */

import { SocialEvent, BrandContext, DecisionOutput } from '../types/core';
import { SentimentResult } from '../ai/SentimentAnalysisService';
import { IntentResult } from '../ai/IntentDetectionService';
import { PriorityScoringService, PriorityScore, PriorityConfig } from './PriorityScoringService';
import { DecisionRoutingService, RoutingDecision, RoutingConfig } from './DecisionRoutingService';
import { ActionExecutionService, ActionExecutionResult, ActionExecutionConfig } from './ActionExecutionService';

export interface DecisionEngineConfig {
  priority: PriorityConfig;
  routing: RoutingConfig;
  execution: ActionExecutionConfig;
  // Engine-level configuration
  engine: {
    enableParallelProcessing: boolean;
    maxConcurrentDecisions: number;
    decisionTimeoutMs: number;
    enableDecisionCaching: boolean;
    cacheExpirationMs: number;
  };
  // Quality assurance
  qualityAssurance: {
    enableValidation: boolean;
    requireMinimumConfidence: number;
    enableAuditLogging: boolean;
    enablePerformanceMonitoring: boolean;
  };
}

export interface DecisionEngineResult {
  decisionId: string;
  eventId: string;
  timestamp: Date;
  
  // Analysis results
  priorityScore: PriorityScore;
  routingDecision: RoutingDecision;
  executionResults: ActionExecutionResult[];
  
  // Decision output for external systems
  decisionOutput: DecisionOutput;
  
  // Performance metrics
  performance: {
    totalProcessingTime: number;
    priorityCalculationTime: number;
    routingDecisionTime: number;
    actionExecutionTime: number;
  };
  
  // Quality metrics
  quality: {
    overallConfidence: number;
    validationPassed: boolean;
    auditTrail: Array<{
      stage: string;
      timestamp: Date;
      details: Record<string, any>;
    }>;
  };
}

export interface DecisionEngineMetrics {
  totalDecisions: number;
  averageProcessingTime: number;
  successRate: number;
  
  // Stage-specific metrics
  stageMetrics: {
    priorityScoring: {
      averageTime: number;
      successRate: number;
    };
    routing: {
      averageTime: number;
      successRate: number;
      routeDistribution: Record<string, number>;
    };
    execution: {
      averageTime: number;
      successRate: number;
      actionDistribution: Record<string, number>;
    };
  };
  
  // Quality metrics
  qualityMetrics: {
    averageConfidence: number;
    validationFailures: number;
    auditLogEntries: number;
  };
  
  // Performance metrics
  performanceMetrics: {
    cacheHitRate: number;
    timeoutOccurrences: number;
    concurrencyUtilization: number;
  };
}

export class DecisionEngine {
  private config: DecisionEngineConfig;
  private priorityService: PriorityScoringService;
  private routingService: DecisionRoutingService;
  private executionService: ActionExecutionService;
  private metrics: DecisionEngineMetrics;
  private decisionCache: Map<string, { result: DecisionEngineResult; expiresAt: Date }> = new Map();
  private activeDecisions: Map<string, Promise<DecisionEngineResult>> = new Map();

  constructor(config: DecisionEngineConfig) {
    this.config = config;
    
    // Initialize services
    this.priorityService = new PriorityScoringService(config.priority);
    this.routingService = new DecisionRoutingService(config.routing);
    this.executionService = new ActionExecutionService(config.execution);
    
    // Initialize metrics
    this.metrics = {
      totalDecisions: 0,
      averageProcessingTime: 0,
      successRate: 0,
      stageMetrics: {
        priorityScoring: {
          averageTime: 0,
          successRate: 0
        },
        routing: {
          averageTime: 0,
          successRate: 0,
          routeDistribution: {}
        },
        execution: {
          averageTime: 0,
          successRate: 0,
          actionDistribution: {}
        }
      },
      qualityMetrics: {
        averageConfidence: 0,
        validationFailures: 0,
        auditLogEntries: 0
      },
      performanceMetrics: {
        cacheHitRate: 0,
        timeoutOccurrences: 0,
        concurrencyUtilization: 0
      }
    };
  }

  /**
   * Process a social event through the complete decision pipeline
   */
  async processEvent(
    event: SocialEvent,
    sentimentResult: SentimentResult,
    intentResult: IntentResult,
    brandContext: BrandContext
  ): Promise<DecisionEngineResult> {
    const startTime = Date.now();
    const decisionId = this.generateDecisionId(event.id);

    // Check cache first
    if (this.config.engine.enableDecisionCaching) {
      const cached = this.getCachedDecision(event.id);
      if (cached) {
        this.metrics.performanceMetrics.cacheHitRate++;
        return cached;
      }
    }

    // Check concurrency limits
    if (this.activeDecisions.size >= this.config.engine.maxConcurrentDecisions) {
      throw new Error('Maximum concurrent decisions exceeded');
    }

    // Create decision promise
    const decisionPromise = this.executeDecisionPipeline(
      decisionId,
      event,
      sentimentResult,
      intentResult,
      brandContext,
      startTime
    );

    // Track active decision
    this.activeDecisions.set(decisionId, decisionPromise);

    try {
      // Execute with timeout
      const result = await Promise.race([
        decisionPromise,
        this.createTimeoutPromise(this.config.engine.decisionTimeoutMs)
      ]);

      // Cache result if enabled
      if (this.config.engine.enableDecisionCaching) {
        this.cacheDecision(event.id, result);
      }

      // Update metrics
      this.updateMetrics(result, true);

      return result;

    } catch (error) {
      console.error(`Decision processing failed for event ${event.id}:`, error);
      
      // Update metrics for failure
      this.updateMetrics(null, false);
      
      if (error instanceof Error && error.message === 'Decision timeout') {
        this.metrics.performanceMetrics.timeoutOccurrences++;
      }
      
      throw error;
    } finally {
      // Clean up active decision tracking
      this.activeDecisions.delete(decisionId);
    }
  }

  /**
   * Execute the complete decision pipeline
   */
  private async executeDecisionPipeline(
    decisionId: string,
    event: SocialEvent,
    sentimentResult: SentimentResult,
    intentResult: IntentResult,
    brandContext: BrandContext,
    startTime: number
  ): Promise<DecisionEngineResult> {
    const auditTrail: Array<{
      stage: string;
      timestamp: Date;
      details: Record<string, any>;
    }> = [];

    // Stage 1: Priority Scoring
    const priorityStartTime = Date.now();
    auditTrail.push({
      stage: 'priority_scoring_start',
      timestamp: new Date(),
      details: { eventId: event.id, decisionId }
    });

    const priorityScore = await this.priorityService.calculatePriority(
      event,
      sentimentResult,
      intentResult,
      brandContext
    );

    const priorityTime = Date.now() - priorityStartTime;
    auditTrail.push({
      stage: 'priority_scoring_complete',
      timestamp: new Date(),
      details: { 
        score: priorityScore.overall,
        processingTime: priorityTime,
        confidence: priorityScore.metadata.confidence
      }
    });

    // Stage 2: Decision Routing
    const routingStartTime = Date.now();
    auditTrail.push({
      stage: 'routing_start',
      timestamp: new Date(),
      details: { priorityScore: priorityScore.overall }
    });

    const routingDecision = await this.routingService.routeDecision(
      event,
      sentimentResult,
      intentResult,
      priorityScore,
      brandContext
    );

    const routingTime = Date.now() - routingStartTime;
    auditTrail.push({
      stage: 'routing_complete',
      timestamp: new Date(),
      details: {
        route: routingDecision.route,
        confidence: routingDecision.confidence,
        processingTime: routingTime,
        actionsCount: routingDecision.actions.length
      }
    });

    // Stage 3: Action Execution (only for auto-response and approved suggestions)
    const executionStartTime = Date.now();
    let executionResults: ActionExecutionResult[] = [];

    if (routingDecision.route === 'auto-response' || 
        (routingDecision.route === 'suggestion' && this.shouldExecuteActions(routingDecision))) {
      
      auditTrail.push({
        stage: 'execution_start',
        timestamp: new Date(),
        details: { route: routingDecision.route }
      });

      executionResults = await this.executionService.executeActions(
        routingDecision,
        event,
        sentimentResult,
        intentResult,
        brandContext
      );

      auditTrail.push({
        stage: 'execution_complete',
        timestamp: new Date(),
        details: {
          executedActions: executionResults.length,
          successfulActions: executionResults.filter(r => r.status === 'success').length,
          processingTime: Date.now() - executionStartTime
        }
      });
    }

    const executionTime = Date.now() - executionStartTime;

    // Calculate overall confidence and validate
    const overallConfidence = this.calculateOverallConfidence(
      priorityScore,
      routingDecision,
      executionResults
    );

    const validationPassed = this.validateDecision(
      priorityScore,
      routingDecision,
      executionResults,
      overallConfidence
    );

    if (!validationPassed) {
      this.metrics.qualityMetrics.validationFailures++;
      auditTrail.push({
        stage: 'validation_failed',
        timestamp: new Date(),
        details: { confidence: overallConfidence }
      });
    }

    // Create decision output for external systems
    const decisionOutput = this.createDecisionOutput(
      decisionId,
      event,
      sentimentResult,
      intentResult,
      priorityScore,
      routingDecision,
      executionResults,
      brandContext
    );

    const totalProcessingTime = Date.now() - startTime;

    const result: DecisionEngineResult = {
      decisionId,
      eventId: event.id,
      timestamp: new Date(),
      priorityScore,
      routingDecision,
      executionResults,
      decisionOutput,
      performance: {
        totalProcessingTime,
        priorityCalculationTime: priorityTime,
        routingDecisionTime: routingTime,
        actionExecutionTime: executionTime
      },
      quality: {
        overallConfidence,
        validationPassed,
        auditTrail
      }
    };

    // Log audit trail if enabled
    if (this.config.qualityAssurance.enableAuditLogging) {
      this.logAuditTrail(result);
    }

    return result;
  }

  /**
   * Calculate overall confidence from all stages
   */
  private calculateOverallConfidence(
    priorityScore: PriorityScore,
    routingDecision: RoutingDecision,
    executionResults: ActionExecutionResult[]
  ): number {
    const weights = {
      priority: 0.3,
      routing: 0.4,
      execution: 0.3
    };

    const priorityConfidence = priorityScore.metadata.confidence;
    const routingConfidence = routingDecision.confidence;
    
    // Calculate execution confidence based on success rate
    const executionConfidence = executionResults.length > 0
      ? executionResults.filter(r => r.status === 'success').length / executionResults.length
      : 1.0; // No execution needed = full confidence

    return (
      priorityConfidence * weights.priority +
      routingConfidence * weights.routing +
      executionConfidence * weights.execution
    );
  }

  /**
   * Validate decision quality
   */
  private validateDecision(
    priorityScore: PriorityScore,
    routingDecision: RoutingDecision,
    executionResults: ActionExecutionResult[],
    overallConfidence: number
  ): boolean {
    if (!this.config.qualityAssurance.enableValidation) {
      return true;
    }

    // Check minimum confidence requirement
    if (overallConfidence < this.config.qualityAssurance.requireMinimumConfidence) {
      return false;
    }

    // Check for critical failures in execution
    const criticalFailures = executionResults.filter(r => 
      r.status === 'failed' && r.type === 'escalate'
    );
    
    if (criticalFailures.length > 0) {
      return false;
    }

    // Check routing consistency
    if (routingDecision.route === 'auto-response' && routingDecision.confidence < 0.8) {
      return false;
    }

    return true;
  }

  /**
   * Create decision output for external systems
   */
  private createDecisionOutput(
    decisionId: string,
    event: SocialEvent,
    sentimentResult: SentimentResult,
    intentResult: IntentResult,
    priorityScore: PriorityScore,
    routingDecision: RoutingDecision,
    executionResults: ActionExecutionResult[],
    brandContext: BrandContext
  ): DecisionOutput {
    return {
      id: decisionId,
      eventId: event.id,
      timestamp: new Date().toISOString(),
      brandContext: {
        brandId: brandContext.brandId,
        playbookVersion: brandContext.playbook.version,
        matchedPersona: brandContext.personas[0]?.id,
        complianceStatus: 'validated' // This would come from compliance validation
      },
      analysis: {
        sentiment: {
          score: sentimentResult.overall.score,
          label: sentimentResult.overall.label,
          confidence: sentimentResult.overall.confidence
        },
        intent: {
          primary: intentResult.primary.intent,
          secondary: intentResult.secondary?.intent,
          confidence: intentResult.primary.confidence
        },
        topics: [], // This would come from topic clustering
        urgency: intentResult.urgency.level,
        brandImpact: this.calculateBrandImpact(priorityScore, sentimentResult)
      },
      decision: {
        primaryAction: routingDecision.actions[0]?.type || 'monitor',
        secondaryActions: routingDecision.actions.slice(1).map(a => a.type),
        confidence: routingDecision.confidence,
        reasoning: routingDecision.reasoning.join('; '),
        humanReviewRequired: routingDecision.route === 'human-review',
        escalationLevel: routingDecision.escalation.level
      },
      recommendedActions: routingDecision.actions.map((action, index) => ({
        type: action.type,
        priority: action.priority,
        action: action.parameters,
        timing: 'immediate', // This could be more sophisticated
        approvalRequired: action.requiresApproval
      })),
      webhooks: [], // This would be populated based on webhook configuration
      monitoring: {
        trackingId: routingDecision.monitoring.trackingId,
        kpis: routingDecision.monitoring.kpis,
        followUpRequired: routingDecision.monitoring.followUpRequired,
        followUpDate: routingDecision.monitoring.followUpDate?.toISOString()
      }
    };
  }

  /**
   * Calculate brand impact assessment
   */
  private calculateBrandImpact(
    priorityScore: PriorityScore,
    sentimentResult: SentimentResult
  ): string {
    if (priorityScore.overall >= 80) {
      return 'high';
    } else if (priorityScore.overall >= 60) {
      return 'medium';
    } else if (sentimentResult.overall.label === 'negative' && sentimentResult.overall.confidence > 0.8) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Check if actions should be executed for suggestions
   */
  private shouldExecuteActions(routingDecision: RoutingDecision): boolean {
    // Check if any actions are pre-approved
    return routingDecision.actions.some(action => 
      action.parameters.approved === true
    );
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Decision timeout')), timeoutMs);
    });
  }

  /**
   * Get cached decision
   */
  private getCachedDecision(eventId: string): DecisionEngineResult | null {
    const cached = this.decisionCache.get(eventId);
    if (!cached) return null;

    if (cached.expiresAt > new Date()) {
      return cached.result;
    }

    // Remove expired cache
    this.decisionCache.delete(eventId);
    return null;
  }

  /**
   * Cache decision result
   */
  private cacheDecision(eventId: string, result: DecisionEngineResult): void {
    const expiresAt = new Date(Date.now() + this.config.engine.cacheExpirationMs);
    this.decisionCache.set(eventId, { result, expiresAt });

    // Clean up expired cache entries
    this.cleanupExpiredCache();
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = new Date();
    for (const [key, cached] of this.decisionCache.entries()) {
      if (cached.expiresAt <= now) {
        this.decisionCache.delete(key);
      }
    }
  }

  /**
   * Log audit trail
   */
  private logAuditTrail(result: DecisionEngineResult): void {
    this.metrics.qualityMetrics.auditLogEntries += result.quality.auditTrail.length;
    
    // In a real implementation, this would send to a logging service
    console.log(`Decision ${result.decisionId} audit trail:`, {
      eventId: result.eventId,
      stages: result.quality.auditTrail.length,
      totalTime: result.performance.totalProcessingTime,
      confidence: result.quality.overallConfidence,
      validated: result.quality.validationPassed
    });
  }

  /**
   * Generate decision ID
   */
  private generateDecisionId(eventId: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `decision-${timestamp}-${random}-${eventId.substring(0, 8)}`;
  }

  /**
   * Update service metrics
   */
  private updateMetrics(result: DecisionEngineResult | null, success: boolean): void {
    this.metrics.totalDecisions++;

    // Update success rate
    const successCount = this.metrics.totalDecisions * this.metrics.successRate + (success ? 1 : 0);
    this.metrics.successRate = successCount / this.metrics.totalDecisions;

    if (result) {
      // Update processing time
      this.metrics.averageProcessingTime = 
        (this.metrics.averageProcessingTime * (this.metrics.totalDecisions - 1) + 
         result.performance.totalProcessingTime) / this.metrics.totalDecisions;

      // Update stage metrics
      this.updateStageMetrics(result);

      // Update quality metrics
      this.metrics.qualityMetrics.averageConfidence = 
        (this.metrics.qualityMetrics.averageConfidence * (this.metrics.totalDecisions - 1) + 
         result.quality.overallConfidence) / this.metrics.totalDecisions;
    }

    // Update concurrency utilization
    this.metrics.performanceMetrics.concurrencyUtilization = 
      this.activeDecisions.size / this.config.engine.maxConcurrentDecisions;
  }

  /**
   * Update stage-specific metrics
   */
  private updateStageMetrics(result: DecisionEngineResult): void {
    // Priority scoring metrics
    const priorityMetrics = this.metrics.stageMetrics.priorityScoring;
    priorityMetrics.averageTime = 
      (priorityMetrics.averageTime * (this.metrics.totalDecisions - 1) + 
       result.performance.priorityCalculationTime) / this.metrics.totalDecisions;
    priorityMetrics.successRate = 1.0; // Priority scoring always succeeds if we get here

    // Routing metrics
    const routingMetrics = this.metrics.stageMetrics.routing;
    routingMetrics.averageTime = 
      (routingMetrics.averageTime * (this.metrics.totalDecisions - 1) + 
       result.performance.routingDecisionTime) / this.metrics.totalDecisions;
    routingMetrics.successRate = 1.0; // Routing always succeeds if we get here
    
    // Update route distribution
    const route = result.routingDecision.route;
    routingMetrics.routeDistribution[route] = (routingMetrics.routeDistribution[route] || 0) + 1;

    // Execution metrics
    const executionMetrics = this.metrics.stageMetrics.execution;
    executionMetrics.averageTime = 
      (executionMetrics.averageTime * (this.metrics.totalDecisions - 1) + 
       result.performance.actionExecutionTime) / this.metrics.totalDecisions;
    
    const successfulExecutions = result.executionResults.filter(r => r.status === 'success').length;
    const totalExecutions = result.executionResults.length;
    const executionSuccessRate = totalExecutions > 0 ? successfulExecutions / totalExecutions : 1.0;
    
    executionMetrics.successRate = 
      (executionMetrics.successRate * (this.metrics.totalDecisions - 1) + executionSuccessRate) / 
      this.metrics.totalDecisions;

    // Update action distribution
    for (const executionResult of result.executionResults) {
      const actionType = executionResult.type;
      executionMetrics.actionDistribution[actionType] = 
        (executionMetrics.actionDistribution[actionType] || 0) + 1;
    }
  }

  /**
   * Get comprehensive metrics from all services
   */
  getMetrics(): {
    engine: DecisionEngineMetrics;
    priority: any;
    routing: any;
    execution: any;
  } {
    return {
      engine: { ...this.metrics },
      priority: this.priorityService.getMetrics(),
      routing: this.routingService.getMetrics(),
      execution: this.executionService.getMetrics()
    };
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalDecisions: 0,
      averageProcessingTime: 0,
      successRate: 0,
      stageMetrics: {
        priorityScoring: {
          averageTime: 0,
          successRate: 0
        },
        routing: {
          averageTime: 0,
          successRate: 0,
          routeDistribution: {}
        },
        execution: {
          averageTime: 0,
          successRate: 0,
          actionDistribution: {}
        }
      },
      qualityMetrics: {
        averageConfidence: 0,
        validationFailures: 0,
        auditLogEntries: 0
      },
      performanceMetrics: {
        cacheHitRate: 0,
        timeoutOccurrences: 0,
        concurrencyUtilization: 0
      }
    };

    // Reset service metrics
    this.priorityService.resetMetrics();
    this.routingService.resetMetrics();
    this.executionService.resetMetrics();
  }

  /**
   * Shutdown engine and cleanup resources
   */
  shutdown(): void {
    // Clear caches
    this.decisionCache.clear();
    this.activeDecisions.clear();
    
    // Reset metrics
    this.resetMetrics();
  }
}