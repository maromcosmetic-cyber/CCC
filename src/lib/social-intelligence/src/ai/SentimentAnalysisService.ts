/**
 * Sentiment Analysis Service
 * Implements multi-model ensemble (BERT, RoBERTa, VADER)
 * Adds platform-specific sentiment adaptations
 * Generates confidence scores and aspect-based sentiment
 */

import { SocialEvent, Platform, SentimentLabel } from '../types/core';

export interface SentimentConfig {
  // Model ensemble configuration
  models: {
    bert: {
      enabled: boolean;
      weight: number;
      endpoint?: string;
    };
    roberta: {
      enabled: boolean;
      weight: number;
      endpoint?: string;
    };
    vader: {
      enabled: boolean;
      weight: number;
    };
  };
  // Platform-specific adjustments
  platformAdjustments: {
    [key in Platform]: {
      positiveBoost: number;
      negativeBoost: number;
      neutralThreshold: number;
    };
  };
  // Confidence thresholds
  thresholds: {
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  };
  // Aspect-based sentiment
  aspectAnalysis: {
    enabled: boolean;
    aspects: string[];
    contextWindow: number;
  };
}

export interface SentimentResult {
  overall: {
    label: SentimentLabel;
    score: number; // -1 to 1
    confidence: number; // 0 to 1
  };
  modelScores: {
    bert?: number;
    roberta?: number;
    vader?: number;
  };
  aspectSentiments: Array<{
    aspect: string;
    sentiment: SentimentLabel;
    score: number;
    confidence: number;
    mentions: string[];
  }>;
  platformAdjusted: {
    originalScore: number;
    adjustedScore: number;
    adjustmentFactor: number;
  };
  metadata: {
    processingTime: number;
    textLength: number;
    language: string;
    modelVersions: Record<string, string>;
  };
}

export interface SentimentMetrics {
  totalAnalyses: number;
  averageProcessingTime: number;
  confidenceDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  platformBreakdown: Record<Platform, {
    count: number;
    averageScore: number;
    averageConfidence: number;
  }>;
  modelPerformance: {
    bert: { available: boolean; averageLatency: number; errorRate: number };
    roberta: { available: boolean; averageLatency: number; errorRate: number };
    vader: { available: boolean; averageLatency: number; errorRate: number };
  };
}

export class SentimentAnalysisService {
  private config: SentimentConfig;
  private metrics: SentimentMetrics;
  private vaderLexicon: Map<string, number>;

  constructor(config: SentimentConfig) {
    this.config = config;
    this.metrics = {
      totalAnalyses: 0,
      averageProcessingTime: 0,
      confidenceDistribution: { high: 0, medium: 0, low: 0 },
      sentimentDistribution: { positive: 0, negative: 0, neutral: 0 },
      platformBreakdown: {} as Record<Platform, any>,
      modelPerformance: {
        bert: { available: false, averageLatency: 0, errorRate: 0 },
        roberta: { available: false, averageLatency: 0, errorRate: 0 },
        vader: { available: true, averageLatency: 0, errorRate: 0 }
      }
    };

    // Initialize platform breakdown
    Object.values(Platform).forEach(platform => {
      this.metrics.platformBreakdown[platform] = {
        count: 0,
        averageScore: 0,
        averageConfidence: 0
      };
    });

    this.initializeVaderLexicon();
  }

  /**
   * Analyze sentiment of social event content
   */
  async analyzeSentiment(event: SocialEvent): Promise<SentimentResult> {
    const startTime = Date.now();
    this.metrics.totalAnalyses++;

    try {
      const text = this.preprocessText(event.content.text);
      const modelScores: Record<string, number> = {};

      // Run ensemble models
      const modelPromises: Promise<void>[] = [];

      if (this.config.models.bert.enabled) {
        modelPromises.push(
          this.runBertAnalysis(text).then(score => {
            modelScores.bert = score;
          }).catch(error => {
            console.warn('BERT analysis failed:', error);
            this.updateModelError('bert');
          })
        );
      }

      if (this.config.models.roberta.enabled) {
        modelPromises.push(
          this.runRobertaAnalysis(text).then(score => {
            modelScores.roberta = score;
          }).catch(error => {
            console.warn('RoBERTa analysis failed:', error);
            this.updateModelError('roberta');
          })
        );
      }

      if (this.config.models.vader.enabled) {
        modelPromises.push(
          this.runVaderAnalysis(text).then(score => {
            modelScores.vader = score;
          }).catch(error => {
            console.warn('VADER analysis failed:', error);
            this.updateModelError('vader');
          })
        );
      }

      // Wait for all models to complete
      await Promise.all(modelPromises);

      // Calculate ensemble score
      const ensembleScore = this.calculateEnsembleScore(modelScores);
      
      // Apply platform-specific adjustments
      const platformAdjusted = this.applyPlatformAdjustments(
        ensembleScore, 
        event.platform
      );

      // Determine sentiment label and confidence
      const { label, confidence } = this.determineSentimentLabel(
        platformAdjusted.adjustedScore
      );

      // Perform aspect-based sentiment analysis
      const aspectSentiments = this.config.aspectAnalysis.enabled
        ? await this.analyzeAspectSentiments(text, event.platform)
        : [];

      const processingTime = Date.now() - startTime;

      const result: SentimentResult = {
        overall: {
          label,
          score: platformAdjusted.adjustedScore,
          confidence
        },
        modelScores,
        aspectSentiments,
        platformAdjusted,
        metadata: {
          processingTime,
          textLength: text.length,
          language: event.content.language || 'en',
          modelVersions: {
            bert: '1.0.0',
            roberta: '1.0.0',
            vader: '1.0.0'
          }
        }
      };

      // Update metrics
      this.updateMetrics(result, event.platform);

      return result;

    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      throw error;
    }
  }

  /**
   * Batch analyze multiple events
   */
  async batchAnalyzeSentiment(events: SocialEvent[]): Promise<SentimentResult[]> {
    const batchSize = 10; // Process in batches to avoid overwhelming APIs
    const results: SentimentResult[] = [];

    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      const batchPromises = batch.map(event => this.analyzeSentiment(event));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Preprocess text for sentiment analysis
   */
  private preprocessText(text: string): string {
    // Remove URLs
    let processed = text.replace(/https?:\/\/[^\s]+/g, '');
    
    // Remove mentions but keep the context
    processed = processed.replace(/@\w+/g, '');
    
    // Remove hashtags but keep the text
    processed = processed.replace(/#(\w+)/g, '$1');
    
    // Normalize whitespace
    processed = processed.replace(/\s+/g, ' ').trim();
    
    // Handle emojis (convert to text representation)
    processed = this.convertEmojisToText(processed);
    
    return processed;
  }

  /**
   * Convert emojis to text representation for better sentiment analysis
   */
  private convertEmojisToText(text: string): string {
    const emojiMap: Record<string, string> = {
      '😊': ' happy ',
      '😍': ' love ',
      '😢': ' sad ',
      '😡': ' angry ',
      '👍': ' good ',
      '👎': ' bad ',
      '❤️': ' love ',
      '💔': ' heartbreak ',
      '🔥': ' fire amazing ',
      '💯': ' perfect ',
      '😭': ' crying sad ',
      '😤': ' frustrated ',
      '🙄': ' annoyed ',
      '😴': ' bored tired '
    };

    let processed = text;
    for (const [emoji, replacement] of Object.entries(emojiMap)) {
      processed = processed.replace(new RegExp(emoji, 'g'), replacement);
    }

    return processed;
  }

  /**
   * Run BERT sentiment analysis
   */
  private async runBertAnalysis(text: string): Promise<number> {
    const startTime = Date.now();
    
    try {
      if (this.config.models.bert.endpoint) {
        // Call external BERT API
        const response = await fetch(this.config.models.bert.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });
        
        if (!response.ok) {
          throw new Error(`BERT API error: ${response.status}`);
        }
        
        const result = await response.json();
        this.updateModelLatency('bert', Date.now() - startTime);
        return result.sentiment_score || 0;
      } else {
        // Fallback to simple rule-based analysis
        return this.simpleSentimentAnalysis(text);
      }
    } catch (error) {
      this.updateModelError('bert');
      throw error;
    }
  }

  /**
   * Run RoBERTa sentiment analysis
   */
  private async runRobertaAnalysis(text: string): Promise<number> {
    const startTime = Date.now();
    
    try {
      if (this.config.models.roberta.endpoint) {
        // Call external RoBERTa API
        const response = await fetch(this.config.models.roberta.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });
        
        if (!response.ok) {
          throw new Error(`RoBERTa API error: ${response.status}`);
        }
        
        const result = await response.json();
        this.updateModelLatency('roberta', Date.now() - startTime);
        return result.sentiment_score || 0;
      } else {
        // Fallback to simple rule-based analysis
        return this.simpleSentimentAnalysis(text);
      }
    } catch (error) {
      this.updateModelError('roberta');
      throw error;
    }
  }

  /**
   * Run VADER sentiment analysis
   */
  private async runVaderAnalysis(text: string): Promise<number> {
    const startTime = Date.now();
    
    try {
      const score = this.vaderSentimentAnalysis(text);
      this.updateModelLatency('vader', Date.now() - startTime);
      return score;
    } catch (error) {
      this.updateModelError('vader');
      throw error;
    }
  }

  /**
   * VADER sentiment analysis implementation
   */
  private vaderSentimentAnalysis(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    let wordCount = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[^\w]/g, '');
      const baseScore = this.vaderLexicon.get(word) || 0;
      
      if (baseScore !== 0) {
        let adjustedScore = baseScore;
        
        // Check for intensifiers
        if (i > 0) {
          const prevWord = words[i - 1];
          if (['very', 'really', 'extremely', 'incredibly'].includes(prevWord)) {
            adjustedScore *= 1.3;
          } else if (['quite', 'rather', 'somewhat'].includes(prevWord)) {
            adjustedScore *= 1.1;
          }
        }
        
        // Check for negation
        const negationWindow = Math.max(0, i - 3);
        for (let j = negationWindow; j < i; j++) {
          if (['not', 'no', 'never', 'none', 'nobody', 'nothing'].includes(words[j])) {
            adjustedScore *= -0.74;
            break;
          }
        }
        
        score += adjustedScore;
        wordCount++;
      }
    }

    // Normalize score
    if (wordCount === 0) return 0;
    
    let normalizedScore = score / wordCount;
    
    // Apply punctuation emphasis
    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount > 0) {
      normalizedScore *= (1 + 0.292 * exclamationCount);
    }
    
    const questionCount = (text.match(/\?/g) || []).length;
    if (questionCount > 0) {
      normalizedScore *= (1 + 0.18 * questionCount);
    }
    
    // Clamp to [-1, 1]
    return Math.max(-1, Math.min(1, normalizedScore));
  }

  /**
   * Simple rule-based sentiment analysis fallback
   */
  private simpleSentimentAnalysis(text: string): number {
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
      'love', 'like', 'enjoy', 'happy', 'pleased', 'satisfied', 'perfect',
      'awesome', 'brilliant', 'outstanding', 'superb', 'magnificent'
    ];
    
    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'angry',
      'frustrated', 'disappointed', 'sad', 'upset', 'annoyed', 'furious',
      'disgusted', 'appalled', 'outraged', 'devastated', 'miserable'
    ];
    
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    
    for (const word of words) {
      if (positiveWords.includes(word)) score += 1;
      if (negativeWords.includes(word)) score -= 1;
    }
    
    // Normalize by text length
    return Math.max(-1, Math.min(1, score / Math.max(words.length / 10, 1)));
  }

  /**
   * Calculate ensemble score from multiple models
   */
  private calculateEnsembleScore(modelScores: Record<string, number>): number {
    let weightedSum = 0;
    let totalWeight = 0;

    if (modelScores.bert !== undefined && this.config.models.bert.enabled) {
      weightedSum += modelScores.bert * this.config.models.bert.weight;
      totalWeight += this.config.models.bert.weight;
    }

    if (modelScores.roberta !== undefined && this.config.models.roberta.enabled) {
      weightedSum += modelScores.roberta * this.config.models.roberta.weight;
      totalWeight += this.config.models.roberta.weight;
    }

    if (modelScores.vader !== undefined && this.config.models.vader.enabled) {
      weightedSum += modelScores.vader * this.config.models.vader.weight;
      totalWeight += this.config.models.vader.weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Apply platform-specific adjustments
   */
  private applyPlatformAdjustments(score: number, platform: Platform): {
    originalScore: number;
    adjustedScore: number;
    adjustmentFactor: number;
  } {
    const adjustments = this.config.platformAdjustments[platform];
    let adjustedScore = score;
    let adjustmentFactor = 1;

    if (score > 0) {
      adjustmentFactor = 1 + adjustments.positiveBoost;
    } else if (score < 0) {
      adjustmentFactor = 1 + adjustments.negativeBoost;
    }

    adjustedScore = score * adjustmentFactor;

    // Apply neutral threshold
    if (Math.abs(adjustedScore) < adjustments.neutralThreshold) {
      adjustedScore = 0;
    }

    return {
      originalScore: score,
      adjustedScore: Math.max(-1, Math.min(1, adjustedScore)),
      adjustmentFactor
    };
  }

  /**
   * Determine sentiment label and confidence
   */
  private determineSentimentLabel(score: number): { label: SentimentLabel; confidence: number } {
    const absScore = Math.abs(score);
    
    let confidence: number;
    if (absScore >= this.config.thresholds.highConfidence) {
      confidence = 0.9;
    } else if (absScore >= this.config.thresholds.mediumConfidence) {
      confidence = 0.7;
    } else if (absScore >= this.config.thresholds.lowConfidence) {
      confidence = 0.5;
    } else {
      confidence = 0.3;
    }

    let label: SentimentLabel;
    if (score > 0.1) {
      label = SentimentLabel.POSITIVE;
    } else if (score < -0.1) {
      label = SentimentLabel.NEGATIVE;
    } else {
      label = SentimentLabel.NEUTRAL;
    }

    return { label, confidence };
  }

  /**
   * Analyze aspect-based sentiments
   */
  private async analyzeAspectSentiments(text: string, platform: Platform): Promise<Array<{
    aspect: string;
    sentiment: SentimentLabel;
    score: number;
    confidence: number;
    mentions: string[];
  }>> {
    const results: Array<{
      aspect: string;
      sentiment: SentimentLabel;
      score: number;
      confidence: number;
      mentions: string[];
    }> = [];

    for (const aspect of this.config.aspectAnalysis.aspects) {
      const mentions = this.findAspectMentions(text, aspect);
      
      if (mentions.length > 0) {
        // Extract context around mentions
        const contexts = mentions.map(mention => 
          this.extractContext(text, mention, this.config.aspectAnalysis.contextWindow)
        );
        
        // Analyze sentiment for each context
        const contextScores = await Promise.all(
          contexts.map(context => this.vaderSentimentAnalysis(context))
        );
        
        // Average the scores
        const avgScore = contextScores.reduce((sum, score) => sum + score, 0) / contextScores.length;
        const { label, confidence } = this.determineSentimentLabel(avgScore);
        
        results.push({
          aspect,
          sentiment: label,
          score: avgScore,
          confidence,
          mentions
        });
      }
    }

    return results;
  }

  /**
   * Find mentions of an aspect in text
   */
  private findAspectMentions(text: string, aspect: string): string[] {
    const mentions: string[] = [];
    const aspectLower = aspect.toLowerCase();
    const textLower = text.toLowerCase();
    
    // Direct mentions
    if (textLower.includes(aspectLower)) {
      mentions.push(aspect);
    }
    
    // Synonym matching (simplified)
    const synonyms = this.getAspectSynonyms(aspect);
    for (const synonym of synonyms) {
      if (textLower.includes(synonym.toLowerCase())) {
        mentions.push(synonym);
      }
    }
    
    return mentions;
  }

  /**
   * Get synonyms for an aspect
   */
  private getAspectSynonyms(aspect: string): string[] {
    const synonymMap: Record<string, string[]> = {
      'quality': ['build', 'construction', 'craftsmanship', 'durability'],
      'price': ['cost', 'expensive', 'cheap', 'affordable', 'value'],
      'service': ['support', 'help', 'assistance', 'customer service'],
      'delivery': ['shipping', 'arrival', 'packaging', 'speed'],
      'design': ['look', 'appearance', 'style', 'aesthetic', 'beautiful']
    };
    
    return synonymMap[aspect.toLowerCase()] || [];
  }

  /**
   * Extract context around a mention
   */
  private extractContext(text: string, mention: string, windowSize: number): string {
    const index = text.toLowerCase().indexOf(mention.toLowerCase());
    if (index === -1) return mention;
    
    const start = Math.max(0, index - windowSize);
    const end = Math.min(text.length, index + mention.length + windowSize);
    
    return text.substring(start, end);
  }

  /**
   * Initialize VADER lexicon (simplified version)
   */
  private initializeVaderLexicon(): void {
    this.vaderLexicon = new Map([
      // Positive words
      ['amazing', 1.6], ['awesome', 1.3], ['excellent', 1.5], ['fantastic', 1.6],
      ['good', 1.9], ['great', 1.8], ['happy', 2.7], ['love', 3.2], ['perfect', 2.3],
      ['wonderful', 2.5], ['brilliant', 2.0], ['outstanding', 2.5], ['superb', 2.5],
      ['magnificent', 2.3], ['marvelous', 2.3], ['terrific', 2.0], ['fabulous', 2.0],
      
      // Negative words
      ['awful', -1.9], ['bad', -2.5], ['hate', -2.7], ['horrible', -2.5],
      ['terrible', -2.1], ['disgusting', -2.4], ['annoying', -2.0], ['frustrated', -2.2],
      ['angry', -2.7], ['furious', -2.5], ['outraged', -2.8], ['devastated', -2.6],
      ['miserable', -2.4], ['pathetic', -2.2], ['useless', -2.0], ['worthless', -2.1],
      
      // Neutral/mild words
      ['okay', 0.9], ['fine', 1.0], ['decent', 1.4], ['average', 0.0],
      ['normal', 0.0], ['regular', 0.0], ['standard', 0.0], ['typical', 0.0]
    ]);
  }

  /**
   * Update model performance metrics
   */
  private updateModelLatency(model: 'bert' | 'roberta' | 'vader', latency: number): void {
    const current = this.metrics.modelPerformance[model];
    current.averageLatency = (current.averageLatency + latency) / 2;
    current.available = true;
  }

  /**
   * Update model error metrics
   */
  private updateModelError(model: 'bert' | 'roberta' | 'vader'): void {
    this.metrics.modelPerformance[model].errorRate += 0.01;
  }

  /**
   * Update overall metrics
   */
  private updateMetrics(result: SentimentResult, platform: Platform): void {
    // Update processing time
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime * (this.metrics.totalAnalyses - 1) + 
       result.metadata.processingTime) / this.metrics.totalAnalyses;

    // Update confidence distribution
    if (result.overall.confidence >= this.config.thresholds.highConfidence) {
      this.metrics.confidenceDistribution.high++;
    } else if (result.overall.confidence >= this.config.thresholds.mediumConfidence) {
      this.metrics.confidenceDistribution.medium++;
    } else {
      this.metrics.confidenceDistribution.low++;
    }

    // Update sentiment distribution
    this.metrics.sentimentDistribution[result.overall.label]++;

    // Update platform breakdown
    const platformStats = this.metrics.platformBreakdown[platform];
    platformStats.count++;
    platformStats.averageScore = 
      (platformStats.averageScore * (platformStats.count - 1) + result.overall.score) / 
      platformStats.count;
    platformStats.averageConfidence = 
      (platformStats.averageConfidence * (platformStats.count - 1) + result.overall.confidence) / 
      platformStats.count;
  }

  /**
   * Get service metrics
   */
  getMetrics(): SentimentMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalAnalyses: 0,
      averageProcessingTime: 0,
      confidenceDistribution: { high: 0, medium: 0, low: 0 },
      sentimentDistribution: { positive: 0, negative: 0, neutral: 0 },
      platformBreakdown: {} as Record<Platform, any>,
      modelPerformance: {
        bert: { available: false, averageLatency: 0, errorRate: 0 },
        roberta: { available: false, averageLatency: 0, errorRate: 0 },
        vader: { available: true, averageLatency: 0, errorRate: 0 }
      }
    };

    // Reinitialize platform breakdown
    Object.values(Platform).forEach(platform => {
      this.metrics.platformBreakdown[platform] = {
        count: 0,
        averageScore: 0,
        averageConfidence: 0
      };
    });
  }
}