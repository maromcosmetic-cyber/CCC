/**
 * Event Deduplication Service
 * Creates unique identifier generation for all Social_Events
 * Implements deduplication logic to prevent duplicate processing
 */

import { Platform } from '../types/core';
import { RawPlatformData } from '../ingestion/types';

export interface DeduplicationConfig {
  // Time window for considering events as duplicates
  timeWindowMs: number;
  // Maximum number of events to keep in memory for deduplication
  maxCacheSize: number;
  // Fields to use for content-based deduplication
  contentFields: string[];
  // Platform-specific deduplication rules
  platformRules: Record<Platform, {
    useContentHash: boolean;
    useTimestampWindow: boolean;
    customFields?: string[];
  }>;
  // Persistence settings
  persistence: {
    enabled: boolean;
    flushIntervalMs: number;
    retentionDays: number;
  };
}

export interface DuplicateEvent {
  originalEventId: string;
  duplicateEventId: string;
  platform: Platform;
  detectionMethod: 'exact_match' | 'content_hash' | 'timestamp_window' | 'platform_specific';
  confidence: number;
  timestamp: string;
}

export interface DeduplicationMetrics {
  totalProcessed: number;
  duplicatesDetected: number;
  uniqueEvents: number;
  deduplicationRate: number;
  averageProcessingTime: number;
  cacheHitRate: number;
  platformBreakdown: Record<Platform, {
    processed: number;
    duplicates: number;
    unique: number;
  }>;
  detectionMethodBreakdown: Record<string, number>;
}

export interface EventFingerprint {
  id: string;
  platform: Platform;
  platformId: string;
  contentHash: string;
  timestamp: string;
  createdAt: string;
  metadata: {
    authorId?: string;
    textLength: number;
    mediaCount: number;
    hashtagCount: number;
  };
}

export class EventDeduplicationService {
  private config: DeduplicationConfig;
  private eventCache: Map<string, EventFingerprint> = new Map();
  private contentHashCache: Map<string, string[]> = new Map(); // hash -> event IDs
  private timestampIndex: Map<string, string[]> = new Map(); // timestamp bucket -> event IDs
  private metrics: DeduplicationMetrics;
  private lastFlush: number = Date.now();

  constructor(config: DeduplicationConfig) {
    this.config = config;
    this.metrics = {
      totalProcessed: 0,
      duplicatesDetected: 0,
      uniqueEvents: 0,
      deduplicationRate: 0,
      averageProcessingTime: 0,
      cacheHitRate: 0,
      platformBreakdown: {} as Record<Platform, any>,
      detectionMethodBreakdown: {}
    };

    // Start periodic cache cleanup
    this.startCacheCleanup();
  }

  /**
   * Process event for deduplication and generate unique ID
   */
  async processEvent(rawData: RawPlatformData): Promise<{
    uniqueId: string;
    isDuplicate: boolean;
    duplicateOf?: string;
    confidence: number;
  }> {
    const startTime = Date.now();
    this.metrics.totalProcessed++;

    try {
      // Generate unique ID
      const uniqueId = this.generateUniqueId(rawData);
      
      // Create event fingerprint
      const fingerprint = this.createFingerprint(rawData, uniqueId);
      
      // Check for duplicates
      const duplicateCheck = await this.checkForDuplicates(fingerprint);
      
      if (duplicateCheck.isDuplicate) {
        this.metrics.duplicatesDetected++;
        this.updatePlatformMetrics(rawData.platform, false);
        this.updateDetectionMethodMetrics(duplicateCheck.method);
        
        return {
          uniqueId,
          isDuplicate: true,
          duplicateOf: duplicateCheck.originalEventId,
          confidence: duplicateCheck.confidence
        };
      } else {
        // Store fingerprint for future deduplication
        await this.storeFingerprint(fingerprint);
        
        this.metrics.uniqueEvents++;
        this.updatePlatformMetrics(rawData.platform, true);
        
        return {
          uniqueId,
          isDuplicate: false,
          confidence: 1.0
        };
      }
    } finally {
      // Update processing time metrics
      const processingTime = Date.now() - startTime;
      this.updateProcessingTimeMetrics(processingTime);
      
      // Update deduplication rate
      this.metrics.deduplicationRate = this.metrics.totalProcessed > 0 
        ? this.metrics.duplicatesDetected / this.metrics.totalProcessed 
        : 0;
    }
  }

  /**
   * Generate unique identifier for event
   */
  private generateUniqueId(rawData: RawPlatformData): string {
    const timestamp = Date.now();
    const platformPrefix = rawData.platform.toUpperCase().substring(0, 3);
    const platformIdHash = this.simpleHash(rawData.id);
    const dataHash = this.simpleHash(JSON.stringify(rawData.data));
    
    // Format: PLATFORM_TIMESTAMP_PLATFORMID_DATAHASH
    return `${platformPrefix}_${timestamp}_${platformIdHash}_${dataHash}`;
  }

  /**
   * Create fingerprint for event
   */
  private createFingerprint(rawData: RawPlatformData, uniqueId: string): EventFingerprint {
    const data = rawData.data;
    const text = this.extractText(data, rawData.platform);
    const mediaUrls = this.extractMediaUrls(data, rawData.platform);
    const hashtags = this.extractHashtags(text);
    
    return {
      id: uniqueId,
      platform: rawData.platform,
      platformId: rawData.id,
      contentHash: this.generateContentHash(text, mediaUrls, hashtags),
      timestamp: rawData.timestamp,
      createdAt: new Date().toISOString(),
      metadata: {
        authorId: this.extractAuthorId(data, rawData.platform),
        textLength: text.length,
        mediaCount: mediaUrls.length,
        hashtagCount: hashtags.length
      }
    };
  }

  /**
   * Check for duplicate events
   */
  private async checkForDuplicates(fingerprint: EventFingerprint): Promise<{
    isDuplicate: boolean;
    originalEventId?: string;
    method: string;
    confidence: number;
  }> {
    // 1. Exact platform ID match
    const exactMatch = this.findExactMatch(fingerprint);
    if (exactMatch) {
      return {
        isDuplicate: true,
        originalEventId: exactMatch,
        method: 'exact_match',
        confidence: 1.0
      };
    }

    // 2. Content hash match
    const contentMatch = this.findContentHashMatch(fingerprint);
    if (contentMatch) {
      return {
        isDuplicate: true,
        originalEventId: contentMatch,
        method: 'content_hash',
        confidence: 0.95
      };
    }

    // 3. Timestamp window match (for similar content)
    const timestampMatch = this.findTimestampWindowMatch(fingerprint);
    if (timestampMatch) {
      return {
        isDuplicate: true,
        originalEventId: timestampMatch.eventId,
        method: 'timestamp_window',
        confidence: timestampMatch.confidence
      };
    }

    // 4. Platform-specific rules
    const platformMatch = this.findPlatformSpecificMatch(fingerprint);
    if (platformMatch) {
      return {
        isDuplicate: true,
        originalEventId: platformMatch.eventId,
        method: 'platform_specific',
        confidence: platformMatch.confidence
      };
    }

    return {
      isDuplicate: false,
      method: 'none',
      confidence: 0
    };
  }

  /**
   * Find exact platform ID match
   */
  private findExactMatch(fingerprint: EventFingerprint): string | null {
    for (const [eventId, cachedFingerprint] of this.eventCache) {
      if (cachedFingerprint.platform === fingerprint.platform &&
          cachedFingerprint.platformId === fingerprint.platformId) {
        return eventId;
      }
    }
    return null;
  }

  /**
   * Find content hash match
   */
  private findContentHashMatch(fingerprint: EventFingerprint): string | null {
    const eventIds = this.contentHashCache.get(fingerprint.contentHash);
    if (eventIds && eventIds.length > 0) {
      // Return the first (oldest) event with this content hash
      return eventIds[0];
    }
    return null;
  }

  /**
   * Find timestamp window match
   */
  private findTimestampWindowMatch(fingerprint: EventFingerprint): {
    eventId: string;
    confidence: number;
  } | null {
    const eventTimestamp = new Date(fingerprint.timestamp).getTime();
    const windowStart = eventTimestamp - this.config.timeWindowMs;
    const windowEnd = eventTimestamp + this.config.timeWindowMs;

    for (const [eventId, cachedFingerprint] of this.eventCache) {
      if (cachedFingerprint.platform !== fingerprint.platform) continue;

      const cachedTimestamp = new Date(cachedFingerprint.timestamp).getTime();
      
      if (cachedTimestamp >= windowStart && cachedTimestamp <= windowEnd) {
        // Check content similarity
        const similarity = this.calculateContentSimilarity(fingerprint, cachedFingerprint);
        
        if (similarity > 0.8) {
          return {
            eventId,
            confidence: similarity
          };
        }
      }
    }

    return null;
  }

  /**
   * Find platform-specific match
   */
  private findPlatformSpecificMatch(fingerprint: EventFingerprint): {
    eventId: string;
    confidence: number;
  } | null {
    const platformRule = this.config.platformRules[fingerprint.platform];
    if (!platformRule) return null;

    // Platform-specific deduplication logic
    switch (fingerprint.platform) {
      case Platform.REDDIT:
        // Reddit-specific: check for cross-posts in different subreddits
        return this.findRedditDuplicate(fingerprint);
      
      case Platform.RSS:
        // RSS-specific: check for same article from different feeds
        return this.findRSSDuplicate(fingerprint);
      
      default:
        return null;
    }
  }

  /**
   * Platform-specific duplicate detection for Reddit
   */
  private findRedditDuplicate(fingerprint: EventFingerprint): {
    eventId: string;
    confidence: number;
  } | null {
    // Implementation for Reddit-specific deduplication
    // This would check for cross-posts, same URL posts, etc.
    return null;
  }

  /**
   * Platform-specific duplicate detection for RSS
   */
  private findRSSDuplicate(fingerprint: EventFingerprint): {
    eventId: string;
    confidence: number;
  } | null {
    // Implementation for RSS-specific deduplication
    // This would check for same article from different feeds
    return null;
  }

  /**
   * Calculate content similarity between two fingerprints
   */
  private calculateContentSimilarity(fp1: EventFingerprint, fp2: EventFingerprint): number {
    let similarity = 0;
    let factors = 0;

    // Content hash similarity (exact match = 1.0)
    if (fp1.contentHash === fp2.contentHash) {
      similarity += 1.0;
    }
    factors++;

    // Text length similarity
    const lengthDiff = Math.abs(fp1.metadata.textLength - fp2.metadata.textLength);
    const maxLength = Math.max(fp1.metadata.textLength, fp2.metadata.textLength);
    const lengthSimilarity = maxLength > 0 ? 1 - (lengthDiff / maxLength) : 1;
    similarity += lengthSimilarity;
    factors++;

    // Media count similarity
    const mediaDiff = Math.abs(fp1.metadata.mediaCount - fp2.metadata.mediaCount);
    const maxMedia = Math.max(fp1.metadata.mediaCount, fp2.metadata.mediaCount);
    const mediaSimilarity = maxMedia > 0 ? 1 - (mediaDiff / maxMedia) : 1;
    similarity += mediaSimilarity;
    factors++;

    // Author similarity (if available)
    if (fp1.metadata.authorId && fp2.metadata.authorId) {
      const authorSimilarity = fp1.metadata.authorId === fp2.metadata.authorId ? 1 : 0;
      similarity += authorSimilarity;
      factors++;
    }

    return factors > 0 ? similarity / factors : 0;
  }

  /**
   * Store fingerprint for future deduplication
   */
  private async storeFingerprint(fingerprint: EventFingerprint): Promise<void> {
    // Store in main cache
    this.eventCache.set(fingerprint.id, fingerprint);

    // Store in content hash index
    const contentHashEvents = this.contentHashCache.get(fingerprint.contentHash) || [];
    contentHashEvents.push(fingerprint.id);
    this.contentHashCache.set(fingerprint.contentHash, contentHashEvents);

    // Store in timestamp index
    const timestampBucket = this.getTimestampBucket(fingerprint.timestamp);
    const timestampEvents = this.timestampIndex.get(timestampBucket) || [];
    timestampEvents.push(fingerprint.id);
    this.timestampIndex.set(timestampBucket, timestampEvents);

    // Check if cache cleanup is needed
    if (this.eventCache.size > this.config.maxCacheSize) {
      await this.cleanupCache();
    }

    // Periodic flush to persistence
    if (this.config.persistence.enabled && 
        Date.now() - this.lastFlush > this.config.persistence.flushIntervalMs) {
      await this.flushToPersistence();
    }
  }

  /**
   * Generate content hash from event content
   */
  private generateContentHash(text: string, mediaUrls: string[], hashtags: string[]): string {
    const content = {
      text: text.toLowerCase().replace(/\s+/g, ' ').trim(),
      mediaUrls: mediaUrls.sort(),
      hashtags: hashtags.sort()
    };
    
    return this.simpleHash(JSON.stringify(content));
  }

  /**
   * Extract text content from platform data
   */
  private extractText(data: any, platform: Platform): string {
    switch (platform) {
      case Platform.TIKTOK:
        return data.title || data.text || '';
      case Platform.INSTAGRAM:
      case Platform.FACEBOOK:
        return data.message || data.caption || data.story || '';
      case Platform.YOUTUBE:
        return data.snippet ? `${data.snippet.title} ${data.snippet.description || ''}` : '';
      case Platform.REDDIT:
        return `${data.title || ''} ${data.selftext || ''}`.trim();
      case Platform.RSS:
        return `${data.title || ''} ${data.content || data.description || ''}`.trim();
      default:
        return '';
    }
  }

  /**
   * Extract media URLs from platform data
   */
  private extractMediaUrls(data: any, platform: Platform): string[] {
    const urls: string[] = [];

    switch (platform) {
      case Platform.TIKTOK:
        if (data.cover_image_url) urls.push(data.cover_image_url);
        break;
      case Platform.INSTAGRAM:
      case Platform.FACEBOOK:
        if (data.media_url) urls.push(data.media_url);
        if (data.thumbnail_url) urls.push(data.thumbnail_url);
        if (data.picture) urls.push(data.picture);
        if (data.full_picture) urls.push(data.full_picture);
        break;
      case Platform.YOUTUBE:
        if (data.snippet?.thumbnails) {
          Object.values(data.snippet.thumbnails).forEach((thumb: any) => {
            if (thumb.url) urls.push(thumb.url);
          });
        }
        break;
      case Platform.REDDIT:
        if (data.url) urls.push(data.url);
        if (data.thumbnail && !['self', 'default'].includes(data.thumbnail)) {
          urls.push(data.thumbnail);
        }
        break;
      case Platform.RSS:
        // Extract from content
        const imgMatches = (data.content || data.description || '').match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi) || [];
        imgMatches.forEach((match: string) => {
          const srcMatch = match.match(/src=["']([^"']+)["']/i);
          if (srcMatch && srcMatch[1]) urls.push(srcMatch[1]);
        });
        break;
    }

    return urls;
  }

  /**
   * Extract hashtags from text
   */
  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
    return text.match(hashtagRegex) || [];
  }

  /**
   * Extract author ID from platform data
   */
  private extractAuthorId(data: any, platform: Platform): string | undefined {
    switch (platform) {
      case Platform.TIKTOK:
        return data.author_id || data.user_id;
      case Platform.INSTAGRAM:
      case Platform.FACEBOOK:
        return data.from?.id || data.user_id;
      case Platform.YOUTUBE:
        return data.snippet?.channelId;
      case Platform.REDDIT:
        return data.author;
      case Platform.RSS:
        return data.author;
      default:
        return undefined;
    }
  }

  /**
   * Get timestamp bucket for indexing
   */
  private getTimestampBucket(timestamp: string): string {
    const date = new Date(timestamp);
    const bucketSize = 60 * 60 * 1000; // 1 hour buckets
    const bucket = Math.floor(date.getTime() / bucketSize) * bucketSize;
    return new Date(bucket).toISOString();
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Update platform metrics
   */
  private updatePlatformMetrics(platform: Platform, isUnique: boolean): void {
    if (!this.metrics.platformBreakdown[platform]) {
      this.metrics.platformBreakdown[platform] = {
        processed: 0,
        duplicates: 0,
        unique: 0
      };
    }

    this.metrics.platformBreakdown[platform].processed++;
    if (isUnique) {
      this.metrics.platformBreakdown[platform].unique++;
    } else {
      this.metrics.platformBreakdown[platform].duplicates++;
    }
  }

  /**
   * Update detection method metrics
   */
  private updateDetectionMethodMetrics(method: string): void {
    this.metrics.detectionMethodBreakdown[method] = 
      (this.metrics.detectionMethodBreakdown[method] || 0) + 1;
  }

  /**
   * Update processing time metrics
   */
  private updateProcessingTimeMetrics(processingTime: number): void {
    const totalProcessed = this.metrics.totalProcessed;
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime * (totalProcessed - 1) + processingTime) / totalProcessed;
  }

  /**
   * Start periodic cache cleanup
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      this.cleanupCache();
    }, 60000); // Cleanup every minute
  }

  /**
   * Cleanup old entries from cache
   */
  private async cleanupCache(): Promise<void> {
    const now = Date.now();
    const cutoffTime = now - this.config.timeWindowMs;
    const entriesToRemove: string[] = [];

    // Find old entries
    for (const [eventId, fingerprint] of this.eventCache) {
      const eventTime = new Date(fingerprint.createdAt).getTime();
      if (eventTime < cutoffTime) {
        entriesToRemove.push(eventId);
      }
    }

    // Remove old entries
    for (const eventId of entriesToRemove) {
      const fingerprint = this.eventCache.get(eventId);
      if (fingerprint) {
        // Remove from main cache
        this.eventCache.delete(eventId);

        // Remove from content hash index
        const contentHashEvents = this.contentHashCache.get(fingerprint.contentHash);
        if (contentHashEvents) {
          const index = contentHashEvents.indexOf(eventId);
          if (index > -1) {
            contentHashEvents.splice(index, 1);
            if (contentHashEvents.length === 0) {
              this.contentHashCache.delete(fingerprint.contentHash);
            }
          }
        }

        // Remove from timestamp index
        const timestampBucket = this.getTimestampBucket(fingerprint.timestamp);
        const timestampEvents = this.timestampIndex.get(timestampBucket);
        if (timestampEvents) {
          const index = timestampEvents.indexOf(eventId);
          if (index > -1) {
            timestampEvents.splice(index, 1);
            if (timestampEvents.length === 0) {
              this.timestampIndex.delete(timestampBucket);
            }
          }
        }
      }
    }

    console.log(`Cleaned up ${entriesToRemove.length} old cache entries`);
  }

  /**
   * Flush cache to persistence (placeholder)
   */
  private async flushToPersistence(): Promise<void> {
    if (!this.config.persistence.enabled) return;

    // This would typically write to a database or file system
    // For now, just update the last flush time
    this.lastFlush = Date.now();
    
    console.log(`Flushed ${this.eventCache.size} fingerprints to persistence`);
  }

  /**
   * Get deduplication metrics
   */
  getMetrics(): DeduplicationMetrics {
    // Update cache hit rate
    this.metrics.cacheHitRate = this.metrics.totalProcessed > 0 
      ? this.metrics.duplicatesDetected / this.metrics.totalProcessed 
      : 0;

    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalProcessed: 0,
      duplicatesDetected: 0,
      uniqueEvents: 0,
      deduplicationRate: 0,
      averageProcessingTime: 0,
      cacheHitRate: 0,
      platformBreakdown: {} as Record<Platform, any>,
      detectionMethodBreakdown: {}
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    eventCacheSize: number;
    contentHashCacheSize: number;
    timestampIndexSize: number;
    memoryUsageEstimate: string;
  } {
    const eventCacheSize = this.eventCache.size;
    const contentHashCacheSize = this.contentHashCache.size;
    const timestampIndexSize = this.timestampIndex.size;
    
    // Rough memory usage estimate
    const avgFingerprintSize = 500; // bytes
    const memoryUsageBytes = eventCacheSize * avgFingerprintSize;
    const memoryUsageMB = (memoryUsageBytes / (1024 * 1024)).toFixed(2);

    return {
      eventCacheSize,
      contentHashCacheSize,
      timestampIndexSize,
      memoryUsageEstimate: `${memoryUsageMB} MB`
    };
  }
}