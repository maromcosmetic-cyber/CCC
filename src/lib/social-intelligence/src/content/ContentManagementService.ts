/**
 * Content Management Service
 * Handles content upload, metadata management, tagging, and performance tracking
 */

import { 
  ManagedContent, 
  ContentUploadRequest, 
  ContentSearchFilters, 
  ContentAnalytics,
  ContentStatus,
  ContentMetadata,
  ContentFile,
  ContentPerformance,
  ContentUsageHistory
} from './types';
import { Platform, ContentType } from '../types/core';
import { BrandContextService } from '../brand/BrandContextService';
import { ComplianceValidationService } from '../brand/ComplianceValidationService';

interface FileStorageService {
  uploadFile(file: File, path: string): Promise<string>;
  generateThumbnail(fileUrl: string): Promise<string>;
  getFileMetadata(fileUrl: string): Promise<{
    size: number;
    mimeType: string;
    dimensions?: { width: number; height: number };
    duration?: number;
  }>;
}

interface MetadataExtractionService {
  extractMetadata(file: File): Promise<{
    title?: string;
    description?: string;
    tags: string[];
    category?: string;
  }>;
  analyzeContent(content: string): Promise<{
    topics: string[];
    sentiment: string;
    keyPhrases: string[];
  }>;
}

interface PerformanceTrackingService {
  trackContentPerformance(contentId: string, platform: Platform): Promise<ContentPerformance>;
  getContentUsageHistory(contentId: string): Promise<ContentUsageHistory[]>;
}

export class ContentManagementService {
  private brandContextService: BrandContextService;
  private complianceValidationService: ComplianceValidationService;
  private fileStorageService: FileStorageService;
  private metadataExtractionService: MetadataExtractionService;
  private performanceTrackingService: PerformanceTrackingService;
  private contentDatabase: Map<string, ManagedContent> = new Map();

  constructor(
    brandContextService: BrandContextService,
    complianceValidationService: ComplianceValidationService,
    fileStorageService: FileStorageService,
    metadataExtractionService: MetadataExtractionService,
    performanceTrackingService: PerformanceTrackingService
  ) {
    this.brandContextService = brandContextService;
    this.complianceValidationService = complianceValidationService;
    this.fileStorageService = fileStorageService;
    this.metadataExtractionService = metadataExtractionService;
    this.performanceTrackingService = performanceTrackingService;
  }

  /**
   * Upload and process content files
   */
  async uploadContent(request: ContentUploadRequest): Promise<ManagedContent[]> {
    try {
      const uploadedContent: ManagedContent[] = [];

      for (const file of request.files) {
        const content = await this.processUploadedFile(file, request);
        uploadedContent.push(content);
      }

      return uploadedContent;
    } catch (error) {
      throw new Error(`Failed to upload content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process individual uploaded file
   */
  private async processUploadedFile(
    file: File, 
    request: ContentUploadRequest
  ): Promise<ManagedContent> {
    try {
      // Generate unique content ID
      const contentId = `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Upload file to storage
      const storagePath = `brands/${request.brandId}/content/${contentId}/${file.name}`;
      const fileUrl = await this.fileStorageService.uploadFile(file, storagePath);
      
      // Get file metadata
      const fileMetadata = await this.fileStorageService.getFileMetadata(fileUrl);
      
      // Generate thumbnail if needed
      let thumbnailUrl: string | undefined;
      if (this.isImageOrVideo(file.type)) {
        try {
          thumbnailUrl = await this.fileStorageService.generateThumbnail(fileUrl);
        } catch (error) {
          console.warn('Failed to generate thumbnail:', error);
        }
      }
      
      // Extract content metadata
      const extractedMetadata = request.autoTag 
        ? await this.metadataExtractionService.extractMetadata(file)
        : { tags: [] };
      
      // Merge provided and extracted metadata
      const metadata: ContentMetadata = {
        title: request.metadata.title || extractedMetadata.title || file.name,
        description: request.metadata.description || extractedMetadata.description || '',
        tags: [...(request.metadata.tags || []), ...extractedMetadata.tags],
        category: request.metadata.category || extractedMetadata.category || 'uncategorized',
        subcategory: request.metadata.subcategory,
        brand: request.metadata.brand || 'default',
        campaign: request.metadata.campaign,
        creator: request.metadata.creator || {
          id: 'system',
          name: 'System Upload',
          type: 'internal'
        }
      };
      
      // Create content file record
      const contentFile: ContentFile = {
        url: fileUrl,
        thumbnailUrl,
        filename: file.name,
        fileSize: fileMetadata.size,
        mimeType: fileMetadata.mimeType,
        dimensions: fileMetadata.dimensions ? {
          width: fileMetadata.dimensions.width,
          height: fileMetadata.dimensions.height,
          aspectRatio: this.calculateAspectRatio(fileMetadata.dimensions.width, fileMetadata.dimensions.height)
        } : undefined,
        duration: fileMetadata.duration,
        quality: this.determineQuality(fileMetadata)
      };
      
      // Determine content type and format
      const contentType = this.determineContentType(file.type);
      const contentFormat = this.determineContentFormat(contentType, file.type);
      
      // Initialize performance data
      const performanceData: ContentPerformance = {
        totalViews: 0,
        totalLikes: 0,
        totalShares: 0,
        totalComments: 0,
        averageEngagementRate: 0,
        platformBreakdown: {},
        lastUpdated: new Date().toISOString()
      };
      
      // Create managed content record
      const managedContent: ManagedContent = {
        id: contentId,
        brandId: request.brandId,
        type: contentType,
        format: contentFormat,
        status: ContentStatus.DRAFT,
        metadata,
        files: [contentFile],
        targetPlatforms: request.targetPlatforms,
        performance: performanceData,
        usageHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Validate against brand guidelines
      await this.validateContentCompliance(managedContent);
      
      // Store in database
      this.contentDatabase.set(contentId, managedContent);
      
      return managedContent;
    } catch (error) {
      throw new Error(`Failed to process file ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update content metadata and tags
   */
  async updateContentMetadata(
    contentId: string, 
    updates: Partial<ContentMetadata>
  ): Promise<ManagedContent> {
    const content = this.contentDatabase.get(contentId);
    if (!content) {
      throw new Error(`Content not found: ${contentId}`);
    }

    // Update metadata
    content.metadata = {
      ...content.metadata,
      ...updates
    };
    
    content.updatedAt = new Date().toISOString();
    
    // Re-validate compliance if content changed
    if (updates.title || updates.description || updates.tags) {
      await this.validateContentCompliance(content);
    }
    
    this.contentDatabase.set(contentId, content);
    return content;
  }

  /**
   * Update content status
   */
  async updateContentStatus(contentId: string, status: ContentStatus): Promise<ManagedContent> {
    const content = this.contentDatabase.get(contentId);
    if (!content) {
      throw new Error(`Content not found: ${contentId}`);
    }

    content.status = status;
    content.updatedAt = new Date().toISOString();
    
    if (status === ContentStatus.PUBLISHED) {
      content.publishedAt = new Date().toISOString();
    } else if (status === ContentStatus.ARCHIVED) {
      content.archivedAt = new Date().toISOString();
    }
    
    this.contentDatabase.set(contentId, content);
    return content;
  }

  /**
   * Search and filter content
   */
  async searchContent(filters: ContentSearchFilters): Promise<ManagedContent[]> {
    let results = Array.from(this.contentDatabase.values());

    // Apply filters
    if (filters.brandId) {
      results = results.filter(content => content.brandId === filters.brandId);
    }
    
    if (filters.type) {
      results = results.filter(content => content.type === filters.type);
    }
    
    if (filters.format) {
      results = results.filter(content => content.format === filters.format);
    }
    
    if (filters.status) {
      results = results.filter(content => content.status === filters.status);
    }
    
    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(content => 
        filters.tags!.some(tag => content.metadata.tags.includes(tag))
      );
    }
    
    if (filters.platforms && filters.platforms.length > 0) {
      results = results.filter(content => 
        filters.platforms!.some(platform => content.targetPlatforms.includes(platform))
      );
    }
    
    if (filters.dateRange) {
      const startDate = filters.dateRange.start.toISOString();
      const endDate = filters.dateRange.end.toISOString();
      results = results.filter(content => 
        content.createdAt >= startDate && content.createdAt <= endDate
      );
    }
    
    if (filters.performanceThreshold) {
      results = results.filter(content => 
        content.performance.averageEngagementRate >= filters.performanceThreshold!
      );
    }

    return results;
  }

  /**
   * Get content analytics
   */
  async getContentAnalytics(brandId: string): Promise<ContentAnalytics> {
    const brandContent = Array.from(this.contentDatabase.values())
      .filter(content => content.brandId === brandId);

    // Calculate basic metrics
    const totalContent = brandContent.length;
    
    const contentByType = brandContent.reduce((acc, content) => {
      acc[content.type] = (acc[content.type] || 0) + 1;
      return acc;
    }, {} as Record<ContentType, number>);
    
    const contentByStatus = brandContent.reduce((acc, content) => {
      acc[content.status] = (acc[content.status] || 0) + 1;
      return acc;
    }, {} as Record<ContentStatus, number>);
    
    // Calculate average performance
    const totalViews = brandContent.reduce((sum, content) => sum + content.performance.totalViews, 0);
    const totalEngagement = brandContent.reduce((sum, content) => sum + content.performance.averageEngagementRate, 0);
    
    const averagePerformance = {
      views: totalContent > 0 ? totalViews / totalContent : 0,
      engagementRate: totalContent > 0 ? totalEngagement / totalContent : 0
    };
    
    // Get top performing content
    const topPerformingContent = brandContent
      .sort((a, b) => b.performance.averageEngagementRate - a.performance.averageEngagementRate)
      .slice(0, 10);
    
    // Calculate trending tags
    const tagCounts = new Map<string, { count: number; totalPerformance: number }>();
    
    brandContent.forEach(content => {
      content.metadata.tags.forEach(tag => {
        const current = tagCounts.get(tag) || { count: 0, totalPerformance: 0 };
        tagCounts.set(tag, {
          count: current.count + 1,
          totalPerformance: current.totalPerformance + content.performance.averageEngagementRate
        });
      });
    });
    
    const trendingTags = Array.from(tagCounts.entries())
      .map(([tag, data]) => ({
        tag,
        count: data.count,
        avgPerformance: data.count > 0 ? data.totalPerformance / data.count : 0
      }))
      .sort((a, b) => b.avgPerformance - a.avgPerformance)
      .slice(0, 20);

    return {
      totalContent,
      contentByType,
      contentByStatus,
      averagePerformance,
      topPerformingContent,
      trendingTags
    };
  }

  /**
   * Track content usage and performance
   */
  async trackContentUsage(
    contentId: string, 
    platform: Platform, 
    campaignId?: string
  ): Promise<void> {
    const content = this.contentDatabase.get(contentId);
    if (!content) {
      throw new Error(`Content not found: ${contentId}`);
    }

    try {
      // Get current performance data
      const performanceData = await this.performanceTrackingService.trackContentPerformance(contentId, platform);
      
      // Update content performance
      content.performance = performanceData;
      
      // Add usage history entry
      const usageEntry: ContentUsageHistory = {
        usageId: `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        platform,
        publishedAt: new Date().toISOString(),
        campaignId,
        performance: {
          views: performanceData.platformBreakdown[platform]?.views || 0,
          likes: performanceData.platformBreakdown[platform]?.likes || 0,
          shares: performanceData.platformBreakdown[platform]?.shares || 0,
          comments: performanceData.platformBreakdown[platform]?.comments || 0,
          engagementRate: performanceData.platformBreakdown[platform]?.engagementRate || 0
        }
      };
      
      content.usageHistory.push(usageEntry);
      content.updatedAt = new Date().toISOString();
      
      this.contentDatabase.set(contentId, content);
    } catch (error) {
      console.error('Failed to track content usage:', error);
    }
  }

  /**
   * Get content by ID
   */
  async getContent(contentId: string): Promise<ManagedContent | null> {
    return this.contentDatabase.get(contentId) || null;
  }

  /**
   * Delete content
   */
  async deleteContent(contentId: string): Promise<boolean> {
    const content = this.contentDatabase.get(contentId);
    if (!content) {
      return false;
    }

    // Update status to archived instead of hard delete
    content.status = ContentStatus.ARCHIVED;
    content.archivedAt = new Date().toISOString();
    content.updatedAt = new Date().toISOString();
    
    this.contentDatabase.set(contentId, content);
    return true;
  }

  /**
   * Validate content against brand guidelines
   */
  private async validateContentCompliance(content: ManagedContent): Promise<void> {
    try {
      const brandContext = await this.brandContextService.getBrandContext(content.brandId);
      if (!brandContext) {
        console.warn(`Brand context not found for brand: ${content.brandId}`);
        return;
      }

      // Validate text content if present
      if (content.textContent) {
        const validation = await this.complianceValidationService.validateContent(
          content.textContent,
          brandContext.playbook
        );
        
        if (validation.hasViolations) {
          content.status = ContentStatus.PENDING_REVIEW;
          content.metadata.tags.push('compliance-violation');
        }
      }
      
      // Validate metadata
      const metadataText = `${content.metadata.title} ${content.metadata.description}`;
      if (metadataText.trim()) {
        const validation = await this.complianceValidationService.validateContent(
          metadataText,
          brandContext.playbook
        );
        
        if (validation.hasViolations) {
          content.status = ContentStatus.PENDING_REVIEW;
          content.metadata.tags.push('metadata-compliance-issue');
        }
      }
    } catch (error) {
      console.error('Content compliance validation failed:', error);
      content.status = ContentStatus.PENDING_REVIEW;
      content.metadata.tags.push('validation-error');
    }
  }

  /**
   * Determine content type from MIME type
   */
  private determineContentType(mimeType: string): ContentType {
    if (mimeType.startsWith('image/')) {
      return ContentType.IMAGE;
    } else if (mimeType.startsWith('video/')) {
      return ContentType.VIDEO;
    } else if (mimeType.startsWith('text/')) {
      return ContentType.TEXT;
    } else {
      return ContentType.IMAGE; // Default fallback
    }
  }

  /**
   * Determine content format from type and MIME type
   */
  private determineContentFormat(contentType: ContentType, mimeType: string): any {
    // This would be expanded based on actual format detection logic
    if (contentType === ContentType.VIDEO) {
      return 'video';
    } else if (contentType === ContentType.IMAGE) {
      return 'post';
    } else {
      return 'post';
    }
  }

  /**
   * Calculate aspect ratio from dimensions
   */
  private calculateAspectRatio(width: number, height: number): string {
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(width, height);
    return `${width / divisor}:${height / divisor}`;
  }

  /**
   * Determine quality based on file metadata
   */
  private determineQuality(metadata: any): 'low' | 'medium' | 'high' | 'ultra' {
    if (metadata.dimensions) {
      const pixels = metadata.dimensions.width * metadata.dimensions.height;
      if (pixels >= 3840 * 2160) return 'ultra'; // 4K+
      if (pixels >= 1920 * 1080) return 'high';  // 1080p+
      if (pixels >= 1280 * 720) return 'medium'; // 720p+
      return 'low';
    }
    
    // For non-image files, use file size as indicator
    const sizeMB = metadata.size / (1024 * 1024);
    if (sizeMB >= 100) return 'ultra';
    if (sizeMB >= 50) return 'high';
    if (sizeMB >= 10) return 'medium';
    return 'low';
  }

  /**
   * Check if file type is image or video
   */
  private isImageOrVideo(mimeType: string): boolean {
    return mimeType.startsWith('image/') || mimeType.startsWith('video/');
  }
}