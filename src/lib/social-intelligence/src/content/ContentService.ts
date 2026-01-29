/**
 * Content Service
 * Main orchestrator for all content creation and management operations
 */

import { AIContentGenerationService } from './AIContentGenerationService';
import { ContentManagementService } from './ContentManagementService';
import { ContentOptimizationService } from './ContentOptimizationService';
import { 
  ContentPlan, 
  ContentGenerationRequest, 
  ContentUploadRequest, 
  ContentSearchFilters, 
  ContentAnalytics,
  ContentOptimization,
  ManagedContent,
  ContentStatus
} from './types';
import { Platform } from '../types/core';

export class ContentService {
  private aiContentGenerationService: AIContentGenerationService;
  private contentManagementService: ContentManagementService;
  private contentOptimizationService: ContentOptimizationService;

  constructor(
    aiContentGenerationService: AIContentGenerationService,
    contentManagementService: ContentManagementService,
    contentOptimizationService: ContentOptimizationService
  ) {
    this.aiContentGenerationService = aiContentGenerationService;
    this.contentManagementService = contentManagementService;
    this.contentOptimizationService = contentOptimizationService;
  }

  // ============================================================================
  // AI CONTENT GENERATION
  // ============================================================================

  /**
   * Generate weekly content plan using AI
   */
  async generateWeeklyContentPlan(request: ContentGenerationRequest): Promise<ContentPlan> {
    return this.aiContentGenerationService.generateWeeklyContentPlan(request);
  }

  /**
   * Generate content for specific platform and format
   */
  async generatePlatformContent(
    platform: Platform,
    format: any,
    brandId: string,
    customPrompt?: string
  ): Promise<any> {
    // This would need to be implemented with proper type handling
    // For now, delegating to the AI service with minimal wrapper
    throw new Error('Method not implemented - requires brand context loading');
  }

  // ============================================================================
  // CONTENT MANAGEMENT
  // ============================================================================

  /**
   * Upload and process content files
   */
  async uploadContent(request: ContentUploadRequest): Promise<ManagedContent[]> {
    return this.contentManagementService.uploadContent(request);
  }

  /**
   * Update content metadata
   */
  async updateContentMetadata(
    contentId: string, 
    updates: any
  ): Promise<ManagedContent> {
    return this.contentManagementService.updateContentMetadata(contentId, updates);
  }

  /**
   * Update content status
   */
  async updateContentStatus(
    contentId: string, 
    status: ContentStatus
  ): Promise<ManagedContent> {
    return this.contentManagementService.updateContentStatus(contentId, status);
  }

  /**
   * Search and filter content
   */
  async searchContent(filters: ContentSearchFilters): Promise<ManagedContent[]> {
    return this.contentManagementService.searchContent(filters);
  }

  /**
   * Get content by ID
   */
  async getContent(contentId: string): Promise<ManagedContent | null> {
    return this.contentManagementService.getContent(contentId);
  }

  /**
   * Delete content (archive)
   */
  async deleteContent(contentId: string): Promise<boolean> {
    return this.contentManagementService.deleteContent(contentId);
  }

  /**
   * Track content usage and performance
   */
  async trackContentUsage(
    contentId: string, 
    platform: Platform, 
    campaignId?: string
  ): Promise<void> {
    return this.contentManagementService.trackContentUsage(contentId, platform, campaignId);
  }

  /**
   * Get content analytics for brand
   */
  async getContentAnalytics(brandId: string): Promise<ContentAnalytics> {
    return this.contentManagementService.getContentAnalytics(brandId);
  }

  // ============================================================================
  // CONTENT OPTIMIZATION
  // ============================================================================

  /**
   * Get optimization recommendations for content
   */
  async optimizeContent(contentId: string): Promise<ContentOptimization> {
    const content = await this.contentManagementService.getContent(contentId);
    if (!content) {
      throw new Error(`Content not found: ${contentId}`);
    }

    return this.contentOptimizationService.optimizeContent(content);
  }

  /**
   * Get optimal posting times for content
   */
  async getOptimalPostingTimes(contentId: string): Promise<any[]> {
    const content = await this.contentManagementService.getContent(contentId);
    if (!content) {
      throw new Error(`Content not found: ${contentId}`);
    }

    const optimization = await this.contentOptimizationService.optimizeContent(content);
    return optimization.optimalTiming;
  }

  /**
   * Get content reuse opportunities
   */
  async getContentReuseOpportunities(contentId: string): Promise<any[]> {
    const content = await this.contentManagementService.getContent(contentId);
    if (!content) {
      throw new Error(`Content not found: ${contentId}`);
    }

    const optimization = await this.contentOptimizationService.optimizeContent(content);
    return optimization.reuseOpportunities;
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  /**
   * Batch update content status
   */
  async batchUpdateContentStatus(
    contentIds: string[], 
    status: ContentStatus
  ): Promise<ManagedContent[]> {
    const results: ManagedContent[] = [];
    
    for (const contentId of contentIds) {
      try {
        const updated = await this.contentManagementService.updateContentStatus(contentId, status);
        results.push(updated);
      } catch (error) {
        console.error(`Failed to update content ${contentId}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Batch optimize content
   */
  async batchOptimizeContent(contentIds: string[]): Promise<ContentOptimization[]> {
    const optimizations: ContentOptimization[] = [];
    
    for (const contentId of contentIds) {
      try {
        const optimization = await this.optimizeContent(contentId);
        optimizations.push(optimization);
      } catch (error) {
        console.error(`Failed to optimize content ${contentId}:`, error);
      }
    }
    
    return optimizations;
  }

  // ============================================================================
  // ANALYTICS AND INSIGHTS
  // ============================================================================

  /**
   * Get top performing content for brand
   */
  async getTopPerformingContent(
    brandId: string, 
    limit: number = 10
  ): Promise<ManagedContent[]> {
    const filters: ContentSearchFilters = {
      brandId,
      status: ContentStatus.PUBLISHED
    };
    
    const content = await this.contentManagementService.searchContent(filters);
    
    return content
      .sort((a, b) => b.performance.averageEngagementRate - a.performance.averageEngagementRate)
      .slice(0, limit);
  }

  /**
   * Get content performance trends
   */
  async getContentPerformanceTrends(
    brandId: string, 
    dateRange: { start: Date; end: Date }
  ): Promise<{
    totalContent: number;
    averageEngagement: number;
    topTags: string[];
    platformBreakdown: Record<Platform, number>;
  }> {
    const filters: ContentSearchFilters = {
      brandId,
      dateRange,
      status: ContentStatus.PUBLISHED
    };
    
    const content = await this.contentManagementService.searchContent(filters);
    
    const totalContent = content.length;
    const averageEngagement = content.length > 0 
      ? content.reduce((sum, c) => sum + c.performance.averageEngagementRate, 0) / content.length
      : 0;
    
    // Calculate top tags
    const tagCounts = new Map<string, number>();
    content.forEach(c => {
      c.metadata.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });
    
    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
    
    // Calculate platform breakdown
    const platformBreakdown: Record<Platform, number> = {} as Record<Platform, number>;
    content.forEach(c => {
      c.targetPlatforms.forEach(platform => {
        platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1;
      });
    });
    
    return {
      totalContent,
      averageEngagement,
      topTags,
      platformBreakdown
    };
  }

  /**
   * Get content recommendations based on performance
   */
  async getContentRecommendations(brandId: string): Promise<{
    topPerformingFormats: string[];
    recommendedPostingTimes: any[];
    suggestedTags: string[];
    contentGaps: string[];
  }> {
    const analytics = await this.contentManagementService.getContentAnalytics(brandId);
    
    // Analyze top performing content to extract patterns
    const topContent = analytics.topPerformingContent.slice(0, 5);
    
    const formatCounts = new Map<string, number>();
    const allTags = new Set<string>();
    
    topContent.forEach(content => {
      formatCounts.set(content.format, (formatCounts.get(content.format) || 0) + 1);
      content.metadata.tags.forEach(tag => allTags.add(tag));
    });
    
    const topPerformingFormats = Array.from(formatCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([format]) => format);
    
    const suggestedTags = Array.from(allTags).slice(0, 10);
    
    // This would be enhanced with more sophisticated analysis
    const contentGaps = [
      'Video content opportunity identified',
      'User-generated content could be increased',
      'Behind-the-scenes content showing low volume'
    ];
    
    return {
      topPerformingFormats,
      recommendedPostingTimes: [], // Would be populated from optimization service
      suggestedTags,
      contentGaps
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Validate content against brand guidelines
   */
  async validateContentCompliance(contentId: string): Promise<{
    isCompliant: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const content = await this.contentManagementService.getContent(contentId);
    if (!content) {
      throw new Error(`Content not found: ${contentId}`);
    }

    const optimization = await this.contentOptimizationService.optimizeContent(content);
    
    return {
      isCompliant: content.status !== ContentStatus.PENDING_REVIEW,
      issues: content.metadata.tags.filter(tag => tag.includes('compliance')),
      recommendations: optimization.recommendations
    };
  }

  /**
   * Get content creation statistics
   */
  async getContentCreationStats(brandId: string): Promise<{
    totalContent: number;
    contentThisWeek: number;
    contentThisMonth: number;
    averagePerformance: number;
    topCreator: string;
  }> {
    const analytics = await this.contentManagementService.getContentAnalytics(brandId);
    
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const allContent = await this.contentManagementService.searchContent({ brandId });
    
    const contentThisWeek = allContent.filter(c => 
      new Date(c.createdAt) >= weekAgo
    ).length;
    
    const contentThisMonth = allContent.filter(c => 
      new Date(c.createdAt) >= monthAgo
    ).length;
    
    // Find top creator
    const creatorCounts = new Map<string, number>();
    allContent.forEach(content => {
      const creatorId = content.metadata.creator.id;
      creatorCounts.set(creatorId, (creatorCounts.get(creatorId) || 0) + 1);
    });
    
    const topCreator = Array.from(creatorCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
    
    return {
      totalContent: analytics.totalContent,
      contentThisWeek,
      contentThisMonth,
      averagePerformance: analytics.averagePerformance.engagementRate,
      topCreator
    };
  }
}