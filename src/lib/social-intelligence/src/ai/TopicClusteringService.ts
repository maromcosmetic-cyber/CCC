/**
 * Topic Clustering and Trend Detection Service
 * Implements hierarchical clustering with DBSCAN
 * Builds real-time topic evolution tracking
 * Creates spike detection for unusual activity patterns
 */

import { SocialEvent, Platform } from '../types/core';

export interface ClusteringConfig {
  // DBSCAN parameters
  dbscan: {
    epsilon: number; // Maximum distance between points in a cluster
    minPoints: number; // Minimum points required to form a cluster
    distanceMetric: 'cosine' | 'euclidean' | 'jaccard';
  };
  // Text processing
  textProcessing: {
    minWordLength: number;
    maxWordLength: number;
    stopWords: string[];
    stemming: boolean;
    ngramSize: number[];
  };
  // Topic evolution
  topicEvolution: {
    timeWindowHours: number;
    minEventsForTrend: number;
    trendThreshold: number; // Minimum growth rate to be considered trending
  };
  // Spike detection
  spikeDetection: {
    baselineWindowHours: number;
    detectionWindowMinutes: number;
    spikeThreshold: number; // Multiplier above baseline
    minEventsForSpike: number;
  };
}

export interface TopicCluster {
  id: string;
  label: string;
  keywords: string[];
  events: SocialEvent[];
  centroid: number[];
  size: number;
  coherenceScore: number;
  platforms: Platform[];
  timeRange: {
    start: Date;
    end: Date;
  };
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
    averageScore: number;
  };
}

export interface TrendingTopic {
  cluster: TopicCluster;
  trendMetrics: {
    growthRate: number; // Events per hour growth
    velocity: number; // Rate of acceleration
    momentum: number; // Sustained growth indicator
    peakTime: Date;
    currentVolume: number;
    baselineVolume: number;
  };
  platforms: Array<{
    platform: Platform;
    volume: number;
    growthRate: number;
    share: number; // Percentage of total volume
  }>;
  relatedTopics: Array<{
    cluster: TopicCluster;
    similarity: number;
    relationship: 'parent' | 'child' | 'sibling';
  }>;
}

export interface ActivitySpike {
  id: string;
  topic: string;
  keywords: string[];
  detectedAt: Date;
  peakTime: Date;
  duration: number; // Minutes
  intensity: number; // Multiplier above baseline
  events: SocialEvent[];
  platforms: Platform[];
  triggerEvent?: SocialEvent; // Event that likely triggered the spike
  sentiment: {
    dominant: 'positive' | 'negative' | 'neutral';
    distribution: { positive: number; negative: number; neutral: number };
  };
}

export interface ClusteringMetrics {
  totalClusters: number;
  averageClusterSize: number;
  clusterCoherence: number;
  processingTime: number;
  topicEvolution: {
    newTopics: number;
    evolvingTopics: number;
    decliningTopics: number;
  };
  spikeDetection: {
    spikesDetected: number;
    averageSpikeIntensity: number;
    averageSpikeDuration: number;
  };
  platformDistribution: Record<Platform, {
    clusters: number;
    events: number;
    dominantTopics: string[];
  }>;
}

export class TopicClusteringService {
  private config: ClusteringConfig;
  private metrics: ClusteringMetrics;
  private clusters: Map<string, TopicCluster> = new Map();
  private trendingTopics: TrendingTopic[] = [];
  private activitySpikes: ActivitySpike[] = [];
  private eventHistory: SocialEvent[] = [];

  constructor(config: ClusteringConfig) {
    this.config = config;
    this.metrics = {
      totalClusters: 0,
      averageClusterSize: 0,
      clusterCoherence: 0,
      processingTime: 0,
      topicEvolution: {
        newTopics: 0,
        evolvingTopics: 0,
        decliningTopics: 0
      },
      spikeDetection: {
        spikesDetected: 0,
        averageSpikeIntensity: 0,
        averageSpikeDuration: 0
      },
      platformDistribution: {} as Record<Platform, any>
    };

    this.initializePlatformMetrics();
  }

  /**
   * Process batch of events for clustering and trend detection
   */
  async processEvents(events: SocialEvent[]): Promise<{
    clusters: TopicCluster[];
    trendingTopics: TrendingTopic[];
    activitySpikes: ActivitySpike[];
  }> {
    const startTime = Date.now();

    // Add events to history
    this.eventHistory.push(...events);
    this.cleanupOldEvents();

    // Extract features from events
    const features = await this.extractFeatures(events);

    // Perform clustering
    const newClusters = await this.performClustering(events, features);

    // Update existing clusters
    this.updateClusters(newClusters);

    // Detect trending topics
    const trending = await this.detectTrendingTopics();

    // Detect activity spikes
    const spikes = await this.detectActivitySpikes(events);

    // Update metrics
    this.updateMetrics(Date.now() - startTime);

    return {
      clusters: Array.from(this.clusters.values()),
      trendingTopics: trending,
      activitySpikes: spikes
    };
  }

  /**
   * Extract features from events for clustering
   */
  private async extractFeatures(events: SocialEvent[]): Promise<number[][]> {
    const features: number[][] = [];

    for (const event of events) {
      const textFeatures = this.extractTextFeatures(event.content.text);
      const platformFeatures = this.extractPlatformFeatures(event.platform);
      const temporalFeatures = this.extractTemporalFeatures(event.timestamp);
      const engagementFeatures = this.extractEngagementFeatures(event.engagement);

      // Combine all features
      const combinedFeatures = [
        ...textFeatures,
        ...platformFeatures,
        ...temporalFeatures,
        ...engagementFeatures
      ];

      features.push(combinedFeatures);
    }

    return features;
  }

  /**
   * Extract text features using TF-IDF and n-grams
   */
  private extractTextFeatures(text: string): number[] {
    // Preprocess text
    const processed = this.preprocessText(text);
    const words = processed.split(/\s+/).filter(word => 
      word.length >= this.config.textProcessing.minWordLength &&
      word.length <= this.config.textProcessing.maxWordLength &&
      !this.config.textProcessing.stopWords.includes(word)
    );

    // Generate n-grams
    const ngrams: string[] = [];
    for (const n of this.config.textProcessing.ngramSize) {
      for (let i = 0; i <= words.length - n; i++) {
        ngrams.push(words.slice(i, i + n).join(' '));
      }
    }

    // Create feature vector (simplified TF-IDF)
    const vocabulary = this.getVocabulary();
    const features = new Array(vocabulary.length).fill(0);

    for (const ngram of ngrams) {
      const index = vocabulary.indexOf(ngram);
      if (index !== -1) {
        features[index]++;
      }
    }

    // Normalize features
    const magnitude = Math.sqrt(features.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? features.map(val => val / magnitude) : features;
  }

  /**
   * Extract platform-specific features
   */
  private extractPlatformFeatures(platform: Platform): number[] {
    const platformVector = new Array(Object.values(Platform).length).fill(0);
    const platformIndex = Object.values(Platform).indexOf(platform);
    if (platformIndex !== -1) {
      platformVector[platformIndex] = 1;
    }
    return platformVector;
  }

  /**
   * Extract temporal features
   */
  private extractTemporalFeatures(timestamp: string): number[] {
    const date = new Date(timestamp);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    
    // Encode time as cyclical features
    const hourSin = Math.sin(2 * Math.PI * hour / 24);
    const hourCos = Math.cos(2 * Math.PI * hour / 24);
    const daySin = Math.sin(2 * Math.PI * dayOfWeek / 7);
    const dayCos = Math.cos(2 * Math.PI * dayOfWeek / 7);

    return [hourSin, hourCos, daySin, dayCos];
  }

  /**
   * Extract engagement features
   */
  private extractEngagementFeatures(engagement: SocialEvent['engagement']): number[] {
    const { likes, shares, comments, views, engagementRate } = engagement;
    
    // Normalize engagement metrics (log scale to handle wide ranges)
    const logLikes = Math.log(likes + 1);
    const logShares = Math.log(shares + 1);
    const logComments = Math.log(comments + 1);
    const logViews = Math.log(views + 1);

    return [logLikes, logShares, logComments, logViews, engagementRate];
  }

  /**
   * Perform DBSCAN clustering
   */
  private async performClustering(events: SocialEvent[], features: number[][]): Promise<TopicCluster[]> {
    if (features.length === 0) return [];

    const clusters: TopicCluster[] = [];
    const visited = new Set<number>();
    const clustered = new Set<number>();

    for (let i = 0; i < features.length; i++) {
      if (visited.has(i)) continue;

      visited.add(i);
      const neighbors = this.findNeighbors(i, features);

      if (neighbors.length >= this.config.dbscan.minPoints) {
        // Create new cluster
        const cluster = this.createCluster(i, neighbors, events, features);
        clusters.push(cluster);

        // Mark all points in cluster
        for (const neighborIndex of neighbors) {
          clustered.add(neighborIndex);
        }

        // Expand cluster
        let j = 0;
        while (j < neighbors.length) {
          const neighborIndex = neighbors[j];
          
          if (!visited.has(neighborIndex)) {
            visited.add(neighborIndex);
            const neighborNeighbors = this.findNeighbors(neighborIndex, features);
            
            if (neighborNeighbors.length >= this.config.dbscan.minPoints) {
              neighbors.push(...neighborNeighbors.filter(n => !neighbors.includes(n)));
            }
          }

          if (!clustered.has(neighborIndex)) {
            clustered.add(neighborIndex);
            cluster.events.push(events[neighborIndex]);
            cluster.size++;
          }

          j++;
        }

        // Update cluster properties
        this.updateClusterProperties(cluster);
      }
    }

    return clusters;
  }

  /**
   * Find neighbors within epsilon distance
   */
  private findNeighbors(pointIndex: number, features: number[][]): number[] {
    const neighbors: number[] = [];
    const point = features[pointIndex];

    for (let i = 0; i < features.length; i++) {
      if (i === pointIndex) continue;

      const distance = this.calculateDistance(point, features[i]);
      if (distance <= this.config.dbscan.epsilon) {
        neighbors.push(i);
      }
    }

    return neighbors;
  }

  /**
   * Calculate distance between two feature vectors
   */
  private calculateDistance(point1: number[], point2: number[]): number {
    switch (this.config.dbscan.distanceMetric) {
      case 'cosine':
        return this.cosineDistance(point1, point2);
      case 'euclidean':
        return this.euclideanDistance(point1, point2);
      case 'jaccard':
        return this.jaccardDistance(point1, point2);
      default:
        return this.cosineDistance(point1, point2);
    }
  }

  /**
   * Calculate cosine distance
   */
  private cosineDistance(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return 1 - similarity;
  }

  /**
   * Calculate Euclidean distance
   */
  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }

  /**
   * Calculate Jaccard distance
   */
  private jaccardDistance(a: number[], b: number[]): number {
    let intersection = 0;
    let union = 0;

    for (let i = 0; i < a.length; i++) {
      if (a[i] > 0 || b[i] > 0) {
        union++;
        if (a[i] > 0 && b[i] > 0) {
          intersection++;
        }
      }
    }

    return union === 0 ? 1 : 1 - (intersection / union);
  }

  /**
   * Create a new cluster
   */
  private createCluster(
    seedIndex: number, 
    neighborIndices: number[], 
    events: SocialEvent[], 
    features: number[][]
  ): TopicCluster {
    const clusterEvents = [events[seedIndex], ...neighborIndices.map(i => events[i])];
    const clusterFeatures = [features[seedIndex], ...neighborIndices.map(i => features[i])];

    // Calculate centroid
    const centroid = this.calculateCentroid(clusterFeatures);

    // Extract keywords
    const keywords = this.extractClusterKeywords(clusterEvents);

    // Generate cluster ID and label
    const id = `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const label = this.generateClusterLabel(keywords);

    return {
      id,
      label,
      keywords,
      events: clusterEvents,
      centroid,
      size: clusterEvents.length,
      coherenceScore: 0, // Will be calculated later
      platforms: [...new Set(clusterEvents.map(e => e.platform))],
      timeRange: {
        start: new Date(Math.min(...clusterEvents.map(e => new Date(e.timestamp).getTime()))),
        end: new Date(Math.max(...clusterEvents.map(e => new Date(e.timestamp).getTime())))
      },
      sentiment: {
        positive: 0,
        negative: 0,
        neutral: 0,
        averageScore: 0
      }
    };
  }

  /**
   * Calculate centroid of feature vectors
   */
  private calculateCentroid(features: number[][]): number[] {
    if (features.length === 0) return [];

    const centroid = new Array(features[0].length).fill(0);
    
    for (const feature of features) {
      for (let i = 0; i < feature.length; i++) {
        centroid[i] += feature[i];
      }
    }

    return centroid.map(val => val / features.length);
  }

  /**
   * Extract keywords from cluster events
   */
  private extractClusterKeywords(events: SocialEvent[]): string[] {
    const wordFreq = new Map<string, number>();

    for (const event of events) {
      const words = this.preprocessText(event.content.text)
        .split(/\s+/)
        .filter(word => 
          word.length >= this.config.textProcessing.minWordLength &&
          !this.config.textProcessing.stopWords.includes(word)
        );

      for (const word of words) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }

    // Return top keywords
    return Array.from(wordFreq.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Generate cluster label from keywords
   */
  private generateClusterLabel(keywords: string[]): string {
    if (keywords.length === 0) return 'Unlabeled Topic';
    
    // Use top 3 keywords for label
    const topKeywords = keywords.slice(0, 3);
    return topKeywords.map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' & ');
  }

  /**
   * Update cluster properties after creation
   */
  private updateClusterProperties(cluster: TopicCluster): void {
    // Calculate coherence score
    cluster.coherenceScore = this.calculateClusterCoherence(cluster);

    // Calculate sentiment distribution (placeholder - would integrate with sentiment service)
    const sentiments = cluster.events.map(() => Math.random() - 0.5); // Mock sentiment scores
    cluster.sentiment = {
      positive: sentiments.filter(s => s > 0.1).length,
      negative: sentiments.filter(s => s < -0.1).length,
      neutral: sentiments.filter(s => Math.abs(s) <= 0.1).length,
      averageScore: sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length
    };
  }

  /**
   * Calculate cluster coherence score
   */
  private calculateClusterCoherence(cluster: TopicCluster): number {
    if (cluster.events.length < 2) return 1;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < cluster.events.length; i++) {
      for (let j = i + 1; j < cluster.events.length; j++) {
        const similarity = this.calculateTextSimilarity(
          cluster.events[i].content.text,
          cluster.events[j].content.text
        );
        totalSimilarity += similarity;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  /**
   * Calculate text similarity between two texts
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(this.preprocessText(text1).split(/\s+/));
    const words2 = new Set(this.preprocessText(text2).split(/\s+/));

    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Update existing clusters with new ones
   */
  private updateClusters(newClusters: TopicCluster[]): void {
    // Merge similar clusters and add new ones
    for (const newCluster of newClusters) {
      let merged = false;

      for (const [id, existingCluster] of this.clusters.entries()) {
        const similarity = this.calculateClusterSimilarity(newCluster, existingCluster);
        
        if (similarity > 0.7) { // Merge threshold
          this.mergeClusters(existingCluster, newCluster);
          merged = true;
          break;
        }
      }

      if (!merged) {
        this.clusters.set(newCluster.id, newCluster);
      }
    }

    // Clean up old clusters
    this.cleanupOldClusters();
  }

  /**
   * Calculate similarity between two clusters
   */
  private calculateClusterSimilarity(cluster1: TopicCluster, cluster2: TopicCluster): number {
    // Keyword overlap
    const keywords1 = new Set(cluster1.keywords);
    const keywords2 = new Set(cluster2.keywords);
    const keywordIntersection = new Set([...keywords1].filter(k => keywords2.has(k)));
    const keywordUnion = new Set([...keywords1, ...keywords2]);
    const keywordSimilarity = keywordUnion.size > 0 ? keywordIntersection.size / keywordUnion.size : 0;

    // Centroid similarity
    const centroidSimilarity = 1 - this.cosineDistance(cluster1.centroid, cluster2.centroid);

    // Platform overlap
    const platforms1 = new Set(cluster1.platforms);
    const platforms2 = new Set(cluster2.platforms);
    const platformIntersection = new Set([...platforms1].filter(p => platforms2.has(p)));
    const platformUnion = new Set([...platforms1, ...platforms2]);
    const platformSimilarity = platformUnion.size > 0 ? platformIntersection.size / platformUnion.size : 0;

    // Weighted average
    return (keywordSimilarity * 0.5) + (centroidSimilarity * 0.3) + (platformSimilarity * 0.2);
  }

  /**
   * Merge two clusters
   */
  private mergeClusters(existingCluster: TopicCluster, newCluster: TopicCluster): void {
    // Merge events
    existingCluster.events.push(...newCluster.events);
    existingCluster.size = existingCluster.events.length;

    // Update time range
    const allTimestamps = existingCluster.events.map(e => new Date(e.timestamp).getTime());
    existingCluster.timeRange = {
      start: new Date(Math.min(...allTimestamps)),
      end: new Date(Math.max(...allTimestamps))
    };

    // Merge keywords (keep top 10)
    const allKeywords = [...existingCluster.keywords, ...newCluster.keywords];
    const keywordFreq = new Map<string, number>();
    allKeywords.forEach(keyword => {
      keywordFreq.set(keyword, (keywordFreq.get(keyword) || 0) + 1);
    });
    existingCluster.keywords = Array.from(keywordFreq.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([keyword]) => keyword);

    // Update platforms
    existingCluster.platforms = [...new Set([...existingCluster.platforms, ...newCluster.platforms])];

    // Recalculate properties
    this.updateClusterProperties(existingCluster);
  }

  /**
   * Detect trending topics
   */
  private async detectTrendingTopics(): Promise<TrendingTopic[]> {
    const trending: TrendingTopic[] = [];
    const timeWindow = this.config.topicEvolution.timeWindowHours * 60 * 60 * 1000;
    const now = Date.now();

    for (const cluster of this.clusters.values()) {
      // Get recent events
      const recentEvents = cluster.events.filter(event => 
        now - new Date(event.timestamp).getTime() <= timeWindow
      );

      if (recentEvents.length < this.config.topicEvolution.minEventsForTrend) {
        continue;
      }

      // Calculate growth rate
      const growthRate = this.calculateGrowthRate(recentEvents, timeWindow);
      
      if (growthRate >= this.config.topicEvolution.trendThreshold) {
        const trendingTopic: TrendingTopic = {
          cluster,
          trendMetrics: {
            growthRate,
            velocity: this.calculateVelocity(recentEvents),
            momentum: this.calculateMomentum(recentEvents),
            peakTime: this.findPeakTime(recentEvents),
            currentVolume: recentEvents.length,
            baselineVolume: this.calculateBaseline(cluster)
          },
          platforms: this.calculatePlatformBreakdown(recentEvents),
          relatedTopics: this.findRelatedTopics(cluster)
        };

        trending.push(trendingTopic);
      }
    }

    // Sort by growth rate
    trending.sort((a, b) => b.trendMetrics.growthRate - a.trendMetrics.growthRate);

    this.trendingTopics = trending;
    return trending;
  }

  /**
   * Calculate growth rate for events
   */
  private calculateGrowthRate(events: SocialEvent[], timeWindow: number): number {
    if (events.length === 0) return 0;

    const now = Date.now();
    const halfWindow = timeWindow / 2;
    
    const recentEvents = events.filter(event => 
      now - new Date(event.timestamp).getTime() <= halfWindow
    );
    const olderEvents = events.filter(event => {
      const age = now - new Date(event.timestamp).getTime();
      return age > halfWindow && age <= timeWindow;
    });

    const recentRate = recentEvents.length / (halfWindow / (60 * 60 * 1000)); // Events per hour
    const olderRate = olderEvents.length / (halfWindow / (60 * 60 * 1000));

    return olderRate > 0 ? (recentRate - olderRate) / olderRate : recentRate;
  }

  /**
   * Calculate velocity (acceleration of growth)
   */
  private calculateVelocity(events: SocialEvent[]): number {
    // Simplified velocity calculation
    const timeSlots = 6; // Divide time window into slots
    const slotDuration = (this.config.topicEvolution.timeWindowHours * 60 * 60 * 1000) / timeSlots;
    const now = Date.now();

    const slotCounts = new Array(timeSlots).fill(0);
    
    for (const event of events) {
      const age = now - new Date(event.timestamp).getTime();
      const slotIndex = Math.floor(age / slotDuration);
      if (slotIndex < timeSlots) {
        slotCounts[timeSlots - 1 - slotIndex]++; // Reverse order (oldest to newest)
      }
    }

    // Calculate acceleration
    let acceleration = 0;
    for (let i = 1; i < slotCounts.length; i++) {
      acceleration += slotCounts[i] - slotCounts[i - 1];
    }

    return acceleration / (timeSlots - 1);
  }

  /**
   * Calculate momentum (sustained growth)
   */
  private calculateMomentum(events: SocialEvent[]): number {
    // Count consecutive time periods with growth
    const timeSlots = 4;
    const slotDuration = (this.config.topicEvolution.timeWindowHours * 60 * 60 * 1000) / timeSlots;
    const now = Date.now();

    const slotCounts = new Array(timeSlots).fill(0);
    
    for (const event of events) {
      const age = now - new Date(event.timestamp).getTime();
      const slotIndex = Math.floor(age / slotDuration);
      if (slotIndex < timeSlots) {
        slotCounts[timeSlots - 1 - slotIndex]++;
      }
    }

    // Count consecutive increases
    let consecutiveGrowth = 0;
    for (let i = 1; i < slotCounts.length; i++) {
      if (slotCounts[i] > slotCounts[i - 1]) {
        consecutiveGrowth++;
      } else {
        break;
      }
    }

    return consecutiveGrowth / (timeSlots - 1);
  }

  /**
   * Find peak time for events
   */
  private findPeakTime(events: SocialEvent[]): Date {
    const hourCounts = new Map<number, number>();
    
    for (const event of events) {
      const hour = Math.floor(new Date(event.timestamp).getTime() / (60 * 60 * 1000));
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }

    const peakHour = Array.from(hourCounts.entries())
      .sort(([, a], [, b]) => b - a)[0]?.[0];

    return new Date(peakHour * 60 * 60 * 1000);
  }

  /**
   * Calculate baseline volume for cluster
   */
  private calculateBaseline(cluster: TopicCluster): number {
    const baselineWindow = this.config.spikeDetection.baselineWindowHours * 60 * 60 * 1000;
    const trendWindow = this.config.topicEvolution.timeWindowHours * 60 * 60 * 1000;
    const now = Date.now();

    const baselineEvents = cluster.events.filter(event => {
      const age = now - new Date(event.timestamp).getTime();
      return age > trendWindow && age <= trendWindow + baselineWindow;
    });

    return baselineEvents.length;
  }

  /**
   * Calculate platform breakdown for events
   */
  private calculatePlatformBreakdown(events: SocialEvent[]): Array<{
    platform: Platform;
    volume: number;
    growthRate: number;
    share: number;
  }> {
    const platformCounts = new Map<Platform, number>();
    
    for (const event of events) {
      platformCounts.set(event.platform, (platformCounts.get(event.platform) || 0) + 1);
    }

    const totalEvents = events.length;
    
    return Array.from(platformCounts.entries()).map(([platform, volume]) => ({
      platform,
      volume,
      growthRate: 0, // Would calculate based on historical data
      share: volume / totalEvents
    }));
  }

  /**
   * Find related topics for a cluster
   */
  private findRelatedTopics(cluster: TopicCluster): Array<{
    cluster: TopicCluster;
    similarity: number;
    relationship: 'parent' | 'child' | 'sibling';
  }> {
    const related: Array<{
      cluster: TopicCluster;
      similarity: number;
      relationship: 'parent' | 'child' | 'sibling';
    }> = [];

    for (const otherCluster of this.clusters.values()) {
      if (otherCluster.id === cluster.id) continue;

      const similarity = this.calculateClusterSimilarity(cluster, otherCluster);
      
      if (similarity > 0.3) {
        let relationship: 'parent' | 'child' | 'sibling';
        
        if (otherCluster.size > cluster.size * 2) {
          relationship = 'parent';
        } else if (cluster.size > otherCluster.size * 2) {
          relationship = 'child';
        } else {
          relationship = 'sibling';
        }

        related.push({
          cluster: otherCluster,
          similarity,
          relationship
        });
      }
    }

    return related.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  }

  /**
   * Detect activity spikes
   */
  private async detectActivitySpikes(newEvents: SocialEvent[]): Promise<ActivitySpike[]> {
    const spikes: ActivitySpike[] = [];
    const detectionWindow = this.config.spikeDetection.detectionWindowMinutes * 60 * 1000;
    const now = Date.now();

    // Group events by topic keywords
    const topicGroups = this.groupEventsByTopic(newEvents);

    for (const [topic, events] of topicGroups.entries()) {
      if (events.length < this.config.spikeDetection.minEventsForSpike) {
        continue;
      }

      // Calculate baseline
      const baseline = this.calculateTopicBaseline(topic);
      const currentVolume = events.length;
      const intensity = baseline > 0 ? currentVolume / baseline : currentVolume;

      if (intensity >= this.config.spikeDetection.spikeThreshold) {
        const spike: ActivitySpike = {
          id: `spike_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          topic,
          keywords: this.extractTopicKeywords(events),
          detectedAt: new Date(),
          peakTime: this.findPeakTime(events),
          duration: this.calculateSpikeDuration(events),
          intensity,
          events,
          platforms: [...new Set(events.map(e => e.platform))],
          triggerEvent: this.findTriggerEvent(events),
          sentiment: this.calculateSpikeSentiment(events)
        };

        spikes.push(spike);
        this.activitySpikes.push(spike);
      }
    }

    // Clean up old spikes
    this.cleanupOldSpikes();

    return spikes;
  }

  /**
   * Group events by topic using simple keyword matching
   */
  private groupEventsByTopic(events: SocialEvent[]): Map<string, SocialEvent[]> {
    const groups = new Map<string, SocialEvent[]>();

    for (const event of events) {
      const keywords = this.extractTopicKeywords([event]);
      const topic = keywords.slice(0, 3).join(' ') || 'general';
      
      if (!groups.has(topic)) {
        groups.set(topic, []);
      }
      groups.get(topic)!.push(event);
    }

    return groups;
  }

  /**
   * Calculate baseline for a topic
   */
  private calculateTopicBaseline(topic: string): number {
    const baselineWindow = this.config.spikeDetection.baselineWindowHours * 60 * 60 * 1000;
    const detectionWindow = this.config.spikeDetection.detectionWindowMinutes * 60 * 1000;
    const now = Date.now();

    const baselineEvents = this.eventHistory.filter(event => {
      const age = now - new Date(event.timestamp).getTime();
      const eventKeywords = this.extractTopicKeywords([event]);
      const eventTopic = eventKeywords.slice(0, 3).join(' ') || 'general';
      
      return eventTopic === topic && 
             age > detectionWindow && 
             age <= detectionWindow + baselineWindow;
    });

    return baselineEvents.length;
  }

  /**
   * Extract topic keywords from events
   */
  private extractTopicKeywords(events: SocialEvent[]): string[] {
    const wordFreq = new Map<string, number>();

    for (const event of events) {
      const words = this.preprocessText(event.content.text)
        .split(/\s+/)
        .filter(word => 
          word.length >= this.config.textProcessing.minWordLength &&
          !this.config.textProcessing.stopWords.includes(word)
        );

      for (const word of words) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }

    return Array.from(wordFreq.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * Calculate spike duration
   */
  private calculateSpikeDuration(events: SocialEvent[]): number {
    if (events.length === 0) return 0;

    const timestamps = events.map(e => new Date(e.timestamp).getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);

    return (maxTime - minTime) / (60 * 1000); // Duration in minutes
  }

  /**
   * Find trigger event (first event in spike)
   */
  private findTriggerEvent(events: SocialEvent[]): SocialEvent | undefined {
    if (events.length === 0) return undefined;

    return events.reduce((earliest, event) => 
      new Date(event.timestamp) < new Date(earliest.timestamp) ? event : earliest
    );
  }

  /**
   * Calculate spike sentiment
   */
  private calculateSpikeSentiment(events: SocialEvent[]): {
    dominant: 'positive' | 'negative' | 'neutral';
    distribution: { positive: number; negative: number; neutral: number };
  } {
    // Mock sentiment calculation - would integrate with sentiment service
    const sentiments = events.map(() => {
      const rand = Math.random();
      if (rand < 0.4) return 'positive';
      if (rand < 0.7) return 'neutral';
      return 'negative';
    });

    const distribution = {
      positive: sentiments.filter(s => s === 'positive').length,
      negative: sentiments.filter(s => s === 'negative').length,
      neutral: sentiments.filter(s => s === 'neutral').length
    };

    const dominant = Object.entries(distribution)
      .sort(([, a], [, b]) => b - a)[0][0] as 'positive' | 'negative' | 'neutral';

    return { dominant, distribution };
  }

  /**
   * Preprocess text for analysis
   */
  private preprocessText(text: string): string {
    return text
      .toLowerCase()
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/@\w+/g, '') // Remove mentions
      .replace(/#(\w+)/g, '$1') // Remove hashtag symbols but keep text
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Get vocabulary for feature extraction
   */
  private getVocabulary(): string[] {
    // This would be built from training data or predefined
    // For now, return a simple vocabulary
    return [
      'product', 'quality', 'price', 'service', 'delivery', 'support',
      'good', 'bad', 'excellent', 'terrible', 'love', 'hate',
      'buy', 'purchase', 'order', 'shipping', 'return', 'refund',
      'recommend', 'review', 'rating', 'feedback', 'complaint'
    ];
  }

  /**
   * Clean up old events from history
   */
  private cleanupOldEvents(): void {
    const maxAge = Math.max(
      this.config.topicEvolution.timeWindowHours,
      this.config.spikeDetection.baselineWindowHours
    ) * 2 * 60 * 60 * 1000; // Keep 2x the longest window

    const cutoff = Date.now() - maxAge;
    this.eventHistory = this.eventHistory.filter(event => 
      new Date(event.timestamp).getTime() > cutoff
    );
  }

  /**
   * Clean up old clusters
   */
  private cleanupOldClusters(): void {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const cutoff = Date.now() - maxAge;

    for (const [id, cluster] of this.clusters.entries()) {
      if (cluster.timeRange.end.getTime() < cutoff) {
        this.clusters.delete(id);
      }
    }
  }

  /**
   * Clean up old spikes
   */
  private cleanupOldSpikes(): void {
    const maxAge = 6 * 60 * 60 * 1000; // 6 hours
    const cutoff = Date.now() - maxAge;

    this.activitySpikes = this.activitySpikes.filter(spike => 
      spike.detectedAt.getTime() > cutoff
    );
  }

  /**
   * Initialize platform metrics
   */
  private initializePlatformMetrics(): void {
    Object.values(Platform).forEach(platform => {
      this.metrics.platformDistribution[platform] = {
        clusters: 0,
        events: 0,
        dominantTopics: []
      };
    });
  }

  /**
   * Update metrics after processing
   */
  private updateMetrics(processingTime: number): void {
    this.metrics.totalClusters = this.clusters.size;
    this.metrics.processingTime = processingTime;
    
    if (this.clusters.size > 0) {
      this.metrics.averageClusterSize = 
        Array.from(this.clusters.values()).reduce((sum, cluster) => sum + cluster.size, 0) / 
        this.clusters.size;
      
      this.metrics.clusterCoherence = 
        Array.from(this.clusters.values()).reduce((sum, cluster) => sum + cluster.coherenceScore, 0) / 
        this.clusters.size;
    }

    // Update spike metrics
    if (this.activitySpikes.length > 0) {
      this.metrics.spikeDetection.spikesDetected = this.activitySpikes.length;
      this.metrics.spikeDetection.averageSpikeIntensity = 
        this.activitySpikes.reduce((sum, spike) => sum + spike.intensity, 0) / 
        this.activitySpikes.length;
      this.metrics.spikeDetection.averageSpikeDuration = 
        this.activitySpikes.reduce((sum, spike) => sum + spike.duration, 0) / 
        this.activitySpikes.length;
    }
  }

  /**
   * Get service metrics
   */
  getMetrics(): ClusteringMetrics {
    return { ...this.metrics };
  }

  /**
   * Get current clusters
   */
  getClusters(): TopicCluster[] {
    return Array.from(this.clusters.values());
  }

  /**
   * Get trending topics
   */
  getTrendingTopics(): TrendingTopic[] {
    return [...this.trendingTopics];
  }

  /**
   * Get activity spikes
   */
  getActivitySpikes(): ActivitySpike[] {
    return [...this.activitySpikes];
  }

  /**
   * Reset service state
   */
  reset(): void {
    this.clusters.clear();
    this.trendingTopics = [];
    this.activitySpikes = [];
    this.eventHistory = [];
    this.initializePlatformMetrics();
  }
}