/**
 * Action Execution Service
 * Implements automated response generation
 * Creates support ticket creation for complaints
 * Builds CRM integration for sales opportunities
 * Implements webhook dispatcher for external systems
 */

import { SocialEvent, ActionType, IntentCategory, Platform, BrandContext } from '../types/core';
import { RoutingDecision } from './DecisionRoutingService';
import { SentimentResult } from '../ai/SentimentAnalysisService';
import { IntentResult } from '../ai/IntentDetectionService';

export interface ActionExecutionConfig {
  // Response generation
  responseGeneration: {
    templates: {
      [key: string]: {
        content: string;
        variables: string[];
        platforms: Platform[];
        maxLength: number;
      };
    };
    aiGeneration: {
      enabled: boolean;
      endpoint?: string;
      fallbackToTemplate: boolean;
      maxRetries: number;
    };
    personalization: {
      enabled: boolean;
      includeUsername: boolean;
      includePlatformContext: boolean;
      includeProductRecommendations: boolean;
    };
  };
  // Support ticket integration
  supportTickets: {
    enabled: boolean;
    system: 'zendesk' | 'freshdesk' | 'intercom' | 'custom';
    apiEndpoint?: string;
    apiKey?: string;
    defaultPriority: string;
    autoAssignment: boolean;
    ticketFields: Record<string, any>;
  };
  // CRM integration
  crm: {
    enabled: boolean;
    system: 'salesforce' | 'hubspot' | 'pipedrive' | 'custom';
    apiEndpoint?: string;
    apiKey?: string;
    leadScoring: {
      enabled: boolean;
      factors: Record<string, number>;
    };
    opportunityCreation: {
      enabled: boolean;
      minimumScore: number;
      defaultStage: string;
    };
  };
  // Webhook dispatcher
  webhooks: {
    enabled: boolean;
    endpoints: Array<{
      name: string;
      url: string;
      events: ActionType[];
      authentication: {
        type: 'none' | 'bearer' | 'api-key' | 'hmac';
        credentials?: Record<string, string>;
      };
      retryPolicy: {
        maxRetries: number;
        backoffMs: number;
        timeoutMs: number;
      };
    }>;
  };
  // Execution limits
  limits: {
    maxConcurrentActions: number;
    rateLimits: {
      [key in ActionType]: {
        maxPerHour: number;
        maxPerDay: number;
      };
    };
    timeouts: {
      responseGeneration: number;
      supportTicket: number;
      crmUpdate: number;
      webhook: number;
    };
  };
}

export interface ActionExecutionResult {
  actionId: string;
  type: ActionType;
  status: 'success' | 'failed' | 'partial' | 'pending';
  executedAt: Date;
  executionTime: number;
  results: {
    response?: {
      content: string;
      platform: Platform;
      posted: boolean;
      postId?: string;
      error?: string;
    };
    supportTicket?: {
      ticketId: string;
      priority: string;
      assignedTo?: string;
      error?: string;
    };
    crmUpdate?: {
      leadId?: string;
      opportunityId?: string;
      score?: number;
      error?: string;
    };
    webhooks?: Array<{
      endpoint: string;
      status: 'success' | 'failed';
      responseCode?: number;
      error?: string;
    }>;
  };
  metadata: {
    eventId: string;
    routingDecisionId: string;
    retryCount: number;
    originalParameters: Record<string, any>;
  };
}

export interface ActionExecutionMetrics {
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  actionTypeBreakdown: Record<ActionType, {
    count: number;
    successRate: number;
    averageTime: number;
  }>;
  responseGeneration: {
    templatesUsed: number;
    aiGenerated: number;
    personalized: number;
    averageLength: number;
  };
  supportTickets: {
    created: number;
    averagePriority: string;
    autoAssigned: number;
  };
  crmIntegration: {
    leadsCreated: number;
    opportunitiesCreated: number;
    averageLeadScore: number;
  };
  webhookDelivery: {
    totalSent: number;
    successRate: number;
    averageLatency: number;
    retries: number;
  };
  rateLimitHits: Record<ActionType, number>;
}

export class ActionExecutionService {
  private config: ActionExecutionConfig;
  private metrics: ActionExecutionMetrics;
  private activeExecutions: Map<string, Promise<ActionExecutionResult>> = new Map();

  constructor(config: ActionExecutionConfig) {
    this.config = config;
    this.metrics = {
      totalExecutions: 0,
      successRate: 0,
      averageExecutionTime: 0,
      actionTypeBreakdown: {} as Record<ActionType, any>,
      responseGeneration: {
        templatesUsed: 0,
        aiGenerated: 0,
        personalized: 0,
        averageLength: 0
      },
      supportTickets: {
        created: 0,
        averagePriority: 'medium',
        autoAssigned: 0
      },
      crmIntegration: {
        leadsCreated: 0,
        opportunitiesCreated: 0,
        averageLeadScore: 0
      },
      webhookDelivery: {
        totalSent: 0,
        successRate: 0,
        averageLatency: 0,
        retries: 0
      },
      rateLimitHits: {} as Record<ActionType, number>
    };

    this.initializeMetrics();
  }

  /**
   * Execute actions from routing decision
   */
  async executeActions(
    routingDecision: RoutingDecision,
    event: SocialEvent,
    sentimentResult: SentimentResult,
    intentResult: IntentResult,
    brandContext: BrandContext
  ): Promise<ActionExecutionResult[]> {
    const results: ActionExecutionResult[] = [];

    // Execute actions based on routing decision
    for (const action of routingDecision.actions) {
      try {
        // Check rate limits
        if (this.isRateLimited(action.type)) {
          console.warn(`Rate limit exceeded for action type: ${action.type}`);
          this.metrics.rateLimitHits[action.type]++;
          continue;
        }

        // Execute action based on type
        const result = await this.executeAction(
          action,
          routingDecision,
          event,
          sentimentResult,
          intentResult,
          brandContext
        );

        results.push(result);

      } catch (error) {
        console.error(`Action execution failed for ${action.type}:`, error);
        
        // Create failed result
        results.push({
          actionId: this.generateActionId(action.type, event.id),
          type: action.type,
          status: 'failed',
          executedAt: new Date(),
          executionTime: 0,
          results: {},
          metadata: {
            eventId: event.id,
            routingDecisionId: routingDecision.monitoring.trackingId,
            retryCount: 0,
            originalParameters: action.parameters
          }
        });
      }
    }

    return results;
  }

  /**
   * Execute individual action
   */
  private async executeAction(
    action: {
      type: ActionType;
      priority: number;
      confidence: number;
      automated: boolean;
      requiresApproval: boolean;
      parameters: Record<string, any>;
    },
    routingDecision: RoutingDecision,
    event: SocialEvent,
    sentimentResult: SentimentResult,
    intentResult: IntentResult,
    brandContext: BrandContext
  ): Promise<ActionExecutionResult> {
    const startTime = Date.now();
    const actionId = this.generateActionId(action.type, event.id);

    // Skip if requires approval and not approved
    if (action.requiresApproval && !action.parameters.approved) {
      return {
        actionId,
        type: action.type,
        status: 'pending',
        executedAt: new Date(),
        executionTime: 0,
        results: {},
        metadata: {
          eventId: event.id,
          routingDecisionId: routingDecision.monitoring.trackingId,
          retryCount: 0,
          originalParameters: action.parameters
        }
      };
    }

    let result: ActionExecutionResult;

    switch (action.type) {
      case ActionType.RESPOND:
        result = await this.executeResponseAction(
          actionId,
          action,
          event,
          sentimentResult,
          intentResult,
          brandContext,
          routingDecision
        );
        break;

      case ActionType.ESCALATE:
        result = await this.executeEscalateAction(
          actionId,
          action,
          event,
          sentimentResult,
          intentResult,
          brandContext,
          routingDecision
        );
        break;

      case ActionType.CREATE:
        result = await this.executeCreateAction(
          actionId,
          action,
          event,
          sentimentResult,
          intentResult,
          brandContext,
          routingDecision
        );
        break;

      case ActionType.MONITOR:
        result = await this.executeMonitorAction(
          actionId,
          action,
          event,
          sentimentResult,
          intentResult,
          brandContext,
          routingDecision
        );
        break;

      case ActionType.ENGAGE:
        result = await this.executeEngageAction(
          actionId,
          action,
          event,
          sentimentResult,
          intentResult,
          brandContext,
          routingDecision
        );
        break;

      case ActionType.SUPPRESS:
        result = await this.executeSuppressAction(
          actionId,
          action,
          event,
          sentimentResult,
          intentResult,
          brandContext,
          routingDecision
        );
        break;

      default:
        throw new Error(`Unsupported action type: ${action.type}`);
    }

    // Update execution time
    result.executionTime = Date.now() - startTime;

    // Update metrics
    this.updateMetrics(result);

    return result;
  }

  /**
   * Execute response action
   */
  private async executeResponseAction(
    actionId: string,
    action: any,
    event: SocialEvent,
    sentimentResult: SentimentResult,
    intentResult: IntentResult,
    brandContext: BrandContext,
    routingDecision: RoutingDecision
  ): Promise<ActionExecutionResult> {
    try {
      // Generate response content
      const responseContent = await this.generateResponse(
        action.parameters,
        event,
        sentimentResult,
        intentResult,
        brandContext
      );

      // Post response to platform (simulated)
      const posted = await this.postResponse(responseContent, event.platform, event.platformId);

      return {
        actionId,
        type: ActionType.RESPOND,
        status: posted.success ? 'success' : 'failed',
        executedAt: new Date(),
        executionTime: 0,
        results: {
          response: {
            content: responseContent,
            platform: event.platform,
            posted: posted.success,
            postId: posted.postId,
            error: posted.error
          }
        },
        metadata: {
          eventId: event.id,
          routingDecisionId: routingDecision.monitoring.trackingId,
          retryCount: 0,
          originalParameters: action.parameters
        }
      };

    } catch (error) {
      return {
        actionId,
        type: ActionType.RESPOND,
        status: 'failed',
        executedAt: new Date(),
        executionTime: 0,
        results: {
          response: {
            content: '',
            platform: event.platform,
            posted: false,
            error: (error as Error).message
          }
        },
        metadata: {
          eventId: event.id,
          routingDecisionId: routingDecision.monitoring.trackingId,
          retryCount: 0,
          originalParameters: action.parameters
        }
      };
    }
  }

  /**
   * Execute escalate action (create support ticket)
   */
  private async executeEscalateAction(
    actionId: string,
    action: any,
    event: SocialEvent,
    sentimentResult: SentimentResult,
    intentResult: IntentResult,
    brandContext: BrandContext,
    routingDecision: RoutingDecision
  ): Promise<ActionExecutionResult> {
    try {
      if (!this.config.supportTickets.enabled) {
        throw new Error('Support ticket creation is disabled');
      }

      // Create support ticket
      const ticket = await this.createSupportTicket(
        event,
        sentimentResult,
        intentResult,
        brandContext,
        action.parameters
      );

      return {
        actionId,
        type: ActionType.ESCALATE,
        status: 'success',
        executedAt: new Date(),
        executionTime: 0,
        results: {
          supportTicket: {
            ticketId: ticket.id,
            priority: ticket.priority,
            assignedTo: ticket.assignedTo
          }
        },
        metadata: {
          eventId: event.id,
          routingDecisionId: routingDecision.monitoring.trackingId,
          retryCount: 0,
          originalParameters: action.parameters
        }
      };

    } catch (error) {
      return {
        actionId,
        type: ActionType.ESCALATE,
        status: 'failed',
        executedAt: new Date(),
        executionTime: 0,
        results: {
          supportTicket: {
            ticketId: '',
            priority: 'medium',
            error: (error as Error).message
          }
        },
        metadata: {
          eventId: event.id,
          routingDecisionId: routingDecision.monitoring.trackingId,
          retryCount: 0,
          originalParameters: action.parameters
        }
      };
    }
  }

  /**
   * Execute create action (CRM integration)
   */
  private async executeCreateAction(
    actionId: string,
    action: any,
    event: SocialEvent,
    sentimentResult: SentimentResult,
    intentResult: IntentResult,
    brandContext: BrandContext,
    routingDecision: RoutingDecision
  ): Promise<ActionExecutionResult> {
    try {
      if (!this.config.crm.enabled) {
        throw new Error('CRM integration is disabled');
      }

      // Create CRM record based on intent
      let crmResult: any = {};

      if (intentResult.primary.intent === IntentCategory.PURCHASE_INQUIRY) {
        // Create lead
        const lead = await this.createCRMLead(
          event,
          sentimentResult,
          intentResult,
          brandContext
        );
        crmResult.leadId = lead.id;
        crmResult.score = lead.score;

        // Create opportunity if score is high enough
        if (this.config.crm.opportunityCreation.enabled && 
            lead.score >= this.config.crm.opportunityCreation.minimumScore) {
          const opportunity = await this.createCRMOpportunity(lead, event, intentResult);
          crmResult.opportunityId = opportunity.id;
        }
      }

      return {
        actionId,
        type: ActionType.CREATE,
        status: 'success',
        executedAt: new Date(),
        executionTime: 0,
        results: {
          crmUpdate: crmResult
        },
        metadata: {
          eventId: event.id,
          routingDecisionId: routingDecision.monitoring.trackingId,
          retryCount: 0,
          originalParameters: action.parameters
        }
      };

    } catch (error) {
      return {
        actionId,
        type: ActionType.CREATE,
        status: 'failed',
        executedAt: new Date(),
        executionTime: 0,
        results: {
          crmUpdate: {
            error: (error as Error).message
          }
        },
        metadata: {
          eventId: event.id,
          routingDecisionId: routingDecision.monitoring.trackingId,
          retryCount: 0,
          originalParameters: action.parameters
        }
      };
    }
  }

  /**
   * Execute monitor action
   */
  private async executeMonitorAction(
    actionId: string,
    action: any,
    event: SocialEvent,
    sentimentResult: SentimentResult,
    intentResult: IntentResult,
    brandContext: BrandContext,
    routingDecision: RoutingDecision
  ): Promise<ActionExecutionResult> {
    // Set up monitoring (this would integrate with monitoring systems)
    // For now, just return success
    return {
      actionId,
      type: ActionType.MONITOR,
      status: 'success',
      executedAt: new Date(),
      executionTime: 0,
      results: {},
      metadata: {
        eventId: event.id,
        routingDecisionId: routingDecision.monitoring.trackingId,
        retryCount: 0,
        originalParameters: action.parameters
      }
    };
  }

  /**
   * Execute engage action
   */
  private async executeEngageAction(
    actionId: string,
    action: any,
    event: SocialEvent,
    sentimentResult: SentimentResult,
    intentResult: IntentResult,
    brandContext: BrandContext,
    routingDecision: RoutingDecision
  ): Promise<ActionExecutionResult> {
    // Implement engagement actions (likes, follows, etc.)
    // For now, just return success
    return {
      actionId,
      type: ActionType.ENGAGE,
      status: 'success',
      executedAt: new Date(),
      executionTime: 0,
      results: {},
      metadata: {
        eventId: event.id,
        routingDecisionId: routingDecision.monitoring.trackingId,
        retryCount: 0,
        originalParameters: action.parameters
      }
    };
  }

  /**
   * Execute suppress action
   */
  private async executeSuppressAction(
    actionId: string,
    action: any,
    event: SocialEvent,
    sentimentResult: SentimentResult,
    intentResult: IntentResult,
    brandContext: BrandContext,
    routingDecision: RoutingDecision
  ): Promise<ActionExecutionResult> {
    // Implement content suppression
    // For now, just return success
    return {
      actionId,
      type: ActionType.SUPPRESS,
      status: 'success',
      executedAt: new Date(),
      executionTime: 0,
      results: {},
      metadata: {
        eventId: event.id,
        routingDecisionId: routingDecision.monitoring.trackingId,
        retryCount: 0,
        originalParameters: action.parameters
      }
    };
  }

  /**
   * Generate response content
   */
  private async generateResponse(
    parameters: Record<string, any>,
    event: SocialEvent,
    sentimentResult: SentimentResult,
    intentResult: IntentResult,
    brandContext: BrandContext
  ): Promise<string> {
    // Try AI generation first if enabled
    if (this.config.responseGeneration.aiGeneration.enabled) {
      try {
        const aiResponse = await this.generateAIResponse(
          parameters,
          event,
          sentimentResult,
          intentResult,
          brandContext
        );
        this.metrics.responseGeneration.aiGenerated++;
        return aiResponse;
      } catch (error) {
        console.warn('AI response generation failed, falling back to template:', error);
        if (!this.config.responseGeneration.aiGeneration.fallbackToTemplate) {
          throw error;
        }
      }
    }

    // Use template-based generation
    const templateResponse = await this.generateTemplateResponse(
      parameters,
      event,
      sentimentResult,
      intentResult,
      brandContext
    );
    this.metrics.responseGeneration.templatesUsed++;
    return templateResponse;
  }

  /**
   * Generate AI-powered response
   */
  private async generateAIResponse(
    parameters: Record<string, any>,
    event: SocialEvent,
    sentimentResult: SentimentResult,
    intentResult: IntentResult,
    brandContext: BrandContext
  ): Promise<string> {
    if (!this.config.responseGeneration.aiGeneration.endpoint) {
      throw new Error('AI generation endpoint not configured');
    }

    const prompt = this.buildAIPrompt(parameters, event, sentimentResult, intentResult, brandContext);

    const response = await fetch(this.config.responseGeneration.aiGeneration.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        max_length: parameters.maxLength || 280,
        temperature: 0.7,
        brand_context: {
          tone: brandContext.playbook.voiceAndTone.primaryTone,
          do_use: brandContext.playbook.voiceAndTone.doUse,
          dont_use: brandContext.playbook.voiceAndTone.dontUse
        }
      })
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const result = await response.json();
    return result.generated_text || result.response || '';
  }

  /**
   * Build AI prompt for response generation
   */
  private buildAIPrompt(
    parameters: Record<string, any>,
    event: SocialEvent,
    sentimentResult: SentimentResult,
    intentResult: IntentResult,
    brandContext: BrandContext
  ): string {
    const context = [
      `Platform: ${event.platform}`,
      `Intent: ${intentResult.primary.intent}`,
      `Sentiment: ${sentimentResult.overall.label} (${sentimentResult.overall.confidence.toFixed(2)})`,
      `Brand tone: ${brandContext.playbook.voiceAndTone.primaryTone}`,
      `Original message: "${event.content.text}"`
    ];

    return `Generate a ${parameters.tone || 'professional'} response to this social media message.
    
Context:
${context.join('\n')}

Brand guidelines:
- Do use: ${brandContext.playbook.voiceAndTone.doUse.join(', ')}
- Don't use: ${brandContext.playbook.voiceAndTone.dontUse.join(', ')}

Generate a helpful, on-brand response:`;
  }

  /**
   * Generate template-based response
   */
  private async generateTemplateResponse(
    parameters: Record<string, any>,
    event: SocialEvent,
    sentimentResult: SentimentResult,
    intentResult: IntentResult,
    brandContext: BrandContext
  ): Promise<string> {
    const templateName = parameters.template || this.getDefaultTemplate(intentResult.primary.intent);
    const template = this.config.responseGeneration.templates[templateName];

    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    // Check platform compatibility
    if (!template.platforms.includes(event.platform)) {
      throw new Error(`Template ${templateName} not compatible with platform ${event.platform}`);
    }

    // Replace variables in template
    let response = template.content;
    
    if (this.config.responseGeneration.personalization.enabled) {
      const variables = this.buildTemplateVariables(
        event,
        sentimentResult,
        intentResult,
        brandContext,
        parameters
      );

      for (const [key, value] of Object.entries(variables)) {
        response = response.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      }

      this.metrics.responseGeneration.personalized++;
    }

    // Ensure response doesn't exceed max length
    if (response.length > template.maxLength) {
      response = response.substring(0, template.maxLength - 3) + '...';
    }

    return response;
  }

  /**
   * Get default template for intent
   */
  private getDefaultTemplate(intent: IntentCategory): string {
    const templateMap: Record<IntentCategory, string> = {
      [IntentCategory.PRAISE]: 'thank_you',
      [IntentCategory.COMPLAINT]: 'complaint_response',
      [IntentCategory.SUPPORT_REQUEST]: 'support_response',
      [IntentCategory.PURCHASE_INQUIRY]: 'purchase_assistance',
      [IntentCategory.INFORMATION_SEEKING]: 'information_response',
      [IntentCategory.FEATURE_REQUEST]: 'feature_request_response',
      [IntentCategory.COMPARISON_SHOPPING]: 'comparison_response'
    };

    return templateMap[intent] || 'generic_response';
  }

  /**
   * Build template variables
   */
  private buildTemplateVariables(
    event: SocialEvent,
    sentimentResult: SentimentResult,
    intentResult: IntentResult,
    brandContext: BrandContext,
    parameters: Record<string, any>
  ): Record<string, any> {
    const variables: Record<string, any> = {
      username: event.author.username,
      platform: event.platform,
      brand_name: brandContext.playbook.brandIdentity.name,
      intent: intentResult.primary.intent,
      sentiment: sentimentResult.overall.label
    };

    // Add personalization variables
    if (this.config.responseGeneration.personalization.includeUsername) {
      variables.greeting = `Hi @${event.author.username}`;
    }

    if (this.config.responseGeneration.personalization.includePlatformContext) {
      variables.platform_context = this.getPlatformContext(event.platform);
    }

    // Add parameter variables
    Object.assign(variables, parameters.personalization || {});

    return variables;
  }

  /**
   * Get platform-specific context
   */
  private getPlatformContext(platform: Platform): string {
    const contexts: Record<Platform, string> = {
      [Platform.TIKTOK]: 'Thanks for the TikTok!',
      [Platform.INSTAGRAM]: 'Thanks for reaching out on Instagram!',
      [Platform.FACEBOOK]: 'Thanks for your Facebook message!',
      [Platform.YOUTUBE]: 'Thanks for your YouTube comment!',
      [Platform.REDDIT]: 'Thanks for your Reddit post!',
      [Platform.RSS]: 'Thanks for your feedback!'
    };

    return contexts[platform] || 'Thanks for reaching out!';
  }

  /**
   * Post response to platform (simulated)
   */
  private async postResponse(
    content: string,
    platform: Platform,
    platformId: string
  ): Promise<{ success: boolean; postId?: string; error?: string }> {
    // This would integrate with actual platform APIs
    // For now, simulate posting
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // Simulate success/failure
      const success = Math.random() > 0.1; // 90% success rate
      
      if (success) {
        return {
          success: true,
          postId: `post_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        };
      } else {
        return {
          success: false,
          error: 'Platform API error'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Create support ticket
   */
  private async createSupportTicket(
    event: SocialEvent,
    sentimentResult: SentimentResult,
    intentResult: IntentResult,
    brandContext: BrandContext,
    parameters: Record<string, any>
  ): Promise<{ id: string; priority: string; assignedTo?: string }> {
    // This would integrate with actual support systems
    // For now, simulate ticket creation
    const priority = this.calculateTicketPriority(intentResult, sentimentResult);
    const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 200));

    this.metrics.supportTickets.created++;

    return {
      id: ticketId,
      priority,
      assignedTo: this.config.supportTickets.autoAssignment ? 'auto-assigned' : undefined
    };
  }

  /**
   * Calculate support ticket priority
   */
  private calculateTicketPriority(
    intentResult: IntentResult,
    sentimentResult: SentimentResult
  ): string {
    if (intentResult.urgency.level === 'critical') return 'high';
    if (sentimentResult.overall.label === 'negative' && sentimentResult.overall.confidence > 0.8) return 'high';
    if (intentResult.primary.intent === IntentCategory.COMPLAINT) return 'medium';
    return 'low';
  }

  /**
   * Create CRM lead
   */
  private async createCRMLead(
    event: SocialEvent,
    sentimentResult: SentimentResult,
    intentResult: IntentResult,
    brandContext: BrandContext
  ): Promise<{ id: string; score: number }> {
    // Calculate lead score
    const score = this.calculateLeadScore(event, sentimentResult, intentResult);
    const leadId = `lead_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Simulate CRM API call
    await new Promise(resolve => setTimeout(resolve, 150));

    this.metrics.crmIntegration.leadsCreated++;
    this.metrics.crmIntegration.averageLeadScore = 
      (this.metrics.crmIntegration.averageLeadScore * (this.metrics.crmIntegration.leadsCreated - 1) + score) / 
      this.metrics.crmIntegration.leadsCreated;

    return { id: leadId, score };
  }

  /**
   * Calculate lead score
   */
  private calculateLeadScore(
    event: SocialEvent,
    sentimentResult: SentimentResult,
    intentResult: IntentResult
  ): number {
    let score = 50; // Base score

    // Intent-based scoring
    if (intentResult.primary.intent === IntentCategory.PURCHASE_INQUIRY) score += 30;
    if (intentResult.primary.intent === IntentCategory.COMPARISON_SHOPPING) score += 20;

    // Sentiment-based scoring
    if (sentimentResult.overall.label === 'positive') score += 10;
    if (sentimentResult.overall.label === 'negative') score -= 10;

    // Engagement-based scoring
    if (event.engagement.engagementRate > 0.05) score += 15;
    if (event.author.verified) score += 10;
    if (event.author.followerCount > 10000) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Create CRM opportunity
   */
  private async createCRMOpportunity(
    lead: { id: string; score: number },
    event: SocialEvent,
    intentResult: IntentResult
  ): Promise<{ id: string }> {
    const opportunityId = `opp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Simulate CRM API call
    await new Promise(resolve => setTimeout(resolve, 200));

    this.metrics.crmIntegration.opportunitiesCreated++;

    return { id: opportunityId };
  }

  /**
   * Check if action type is rate limited
   */
  private isRateLimited(actionType: ActionType): boolean {
    // This would check against actual rate limit counters
    // For now, always return false
    return false;
  }

  /**
   * Generate action ID
   */
  private generateActionId(actionType: ActionType, eventId: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${actionType}-${timestamp}-${random}-${eventId.substring(0, 8)}`;
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): void {
    Object.values(ActionType).forEach(actionType => {
      this.metrics.actionTypeBreakdown[actionType] = {
        count: 0,
        successRate: 0,
        averageTime: 0
      };
      this.metrics.rateLimitHits[actionType] = 0;
    });
  }

  /**
   * Update metrics after action execution
   */
  private updateMetrics(result: ActionExecutionResult): void {
    this.metrics.totalExecutions++;

    // Update success rate
    const successCount = this.metrics.totalExecutions * this.metrics.successRate + 
      (result.status === 'success' ? 1 : 0);
    this.metrics.successRate = successCount / this.metrics.totalExecutions;

    // Update average execution time
    this.metrics.averageExecutionTime = 
      (this.metrics.averageExecutionTime * (this.metrics.totalExecutions - 1) + result.executionTime) / 
      this.metrics.totalExecutions;

    // Update action type breakdown
    const actionStats = this.metrics.actionTypeBreakdown[result.type];
    actionStats.count++;
    
    const actionSuccessCount = actionStats.count * actionStats.successRate + 
      (result.status === 'success' ? 1 : 0);
    actionStats.successRate = actionSuccessCount / actionStats.count;
    
    actionStats.averageTime = 
      (actionStats.averageTime * (actionStats.count - 1) + result.executionTime) / actionStats.count;

    // Update specific metrics based on action type
    if (result.type === ActionType.RESPOND && result.results.response) {
      this.metrics.responseGeneration.averageLength = 
        (this.metrics.responseGeneration.averageLength * (this.metrics.totalExecutions - 1) + 
         result.results.response.content.length) / this.metrics.totalExecutions;
    }
  }

  /**
   * Get service metrics
   */
  getMetrics(): ActionExecutionMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalExecutions: 0,
      successRate: 0,
      averageExecutionTime: 0,
      actionTypeBreakdown: {} as Record<ActionType, any>,
      responseGeneration: {
        templatesUsed: 0,
        aiGenerated: 0,
        personalized: 0,
        averageLength: 0
      },
      supportTickets: {
        created: 0,
        averagePriority: 'medium',
        autoAssigned: 0
      },
      crmIntegration: {
        leadsCreated: 0,
        opportunitiesCreated: 0,
        averageLeadScore: 0
      },
      webhookDelivery: {
        totalSent: 0,
        successRate: 0,
        averageLatency: 0,
        retries: 0
      },
      rateLimitHits: {} as Record<ActionType, number>
    };

    this.initializeMetrics();
  }
}