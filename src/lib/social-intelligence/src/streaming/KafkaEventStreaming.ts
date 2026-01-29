/**
 * Apache Kafka Event Streaming Infrastructure
 * Configures Kafka topics for different event types
 * Implements event routing and dead letter queue handling
 * Creates event replay capabilities for system recovery
 */

import { SocialEvent, Platform, EventType } from '../types/core';

// Kafka client interface (would be implemented with actual Kafka client like kafkajs)
export interface KafkaClient {
  producer(): KafkaProducer;
  consumer(config: ConsumerConfig): KafkaConsumer;
  admin(): KafkaAdmin;
}

export interface KafkaProducer {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(record: ProducerRecord): Promise<RecordMetadata[]>;
}

export interface KafkaConsumer {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(topics: string[]): Promise<void>;
  run(config: ConsumerRunConfig): Promise<void>;
}

export interface KafkaAdmin {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  createTopics(topics: TopicConfig[]): Promise<void>;
  deleteTopics(topics: string[]): Promise<void>;
  listTopics(): Promise<string[]>;
}

export interface ProducerRecord {
  topic: string;
  partition?: number;
  key?: string;
  value: string;
  headers?: Record<string, string>;
  timestamp?: string;
}

export interface ConsumerRecord {
  topic: string;
  partition: number;
  offset: string;
  key?: string;
  value: string;
  headers?: Record<string, string>;
  timestamp: string;
}

export interface RecordMetadata {
  topic: string;
  partition: number;
  offset: string;
}

export interface TopicConfig {
  topic: string;
  numPartitions?: number;
  replicationFactor?: number;
  configEntries?: Array<{ name: string; value: string }>;
}

export interface ConsumerConfig {
  groupId: string;
  sessionTimeout?: number;
  heartbeatInterval?: number;
  maxBytesPerPartition?: number;
  minBytes?: number;
  maxBytes?: number;
  maxWaitTimeInMs?: number;
  retry?: {
    maxRetryTime?: number;
    initialRetryTime?: number;
    factor?: number;
    multiplier?: number;
    retries?: number;
  };
}

export interface ConsumerRunConfig {
  eachMessage?: (payload: {
    topic: string;
    partition: number;
    message: ConsumerRecord;
  }) => Promise<void>;
  eachBatch?: (payload: {
    batch: {
      topic: string;
      partition: number;
      messages: ConsumerRecord[];
    };
  }) => Promise<void>;
}

export interface EventStreamingConfig {
  brokers: string[];
  clientId: string;
  topics: {
    rawEvents: string;
    normalizedEvents: string;
    processedEvents: string;
    deadLetterQueue: string;
    replayEvents: string;
  };
  partitions: {
    byPlatform: boolean;
    byEventType: boolean;
    count: number;
  };
  retention: {
    rawEvents: string; // e.g., '7d'
    normalizedEvents: string; // e.g., '30d'
    processedEvents: string; // e.g., '90d'
    deadLetterQueue: string; // e.g., '365d'
    replayEvents: string; // e.g., '30d'
  };
  replication: {
    factor: number;
    minInSyncReplicas: number;
  };
}

export interface StreamingMetrics {
  messagesProduced: number;
  messagesConsumed: number;
  deadLetterMessages: number;
  replayMessages: number;
  averageLatency: number;
  errorRate: number;
  throughputPerSecond: number;
  topicBreakdown: Record<string, {
    produced: number;
    consumed: number;
    errors: number;
  }>;
}

export class KafkaEventStreaming {
  private client: KafkaClient;
  private config: EventStreamingConfig;
  private producer?: KafkaProducer;
  private consumers: Map<string, KafkaConsumer> = new Map();
  private admin?: KafkaAdmin;
  private metrics: StreamingMetrics;
  private isInitialized = false;

  constructor(client: KafkaClient, config: EventStreamingConfig) {
    this.client = client;
    this.config = config;
    this.metrics = {
      messagesProduced: 0,
      messagesConsumed: 0,
      deadLetterMessages: 0,
      replayMessages: 0,
      averageLatency: 0,
      errorRate: 0,
      throughputPerSecond: 0,
      topicBreakdown: {}
    };
  }

  /**
   * Initialize Kafka infrastructure
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize admin client
      this.admin = this.client.admin();
      await this.admin.connect();

      // Create topics
      await this.createTopics();

      // Initialize producer
      this.producer = this.client.producer();
      await this.producer.connect();

      this.isInitialized = true;
      console.log('Kafka event streaming initialized successfully');

    } catch (error) {
      console.error('Failed to initialize Kafka event streaming:', error);
      throw error;
    }
  }

  /**
   * Create Kafka topics with proper configuration
   */
  private async createTopics(): Promise<void> {
    if (!this.admin) {
      throw new Error('Admin client not initialized');
    }

    const topics: TopicConfig[] = [
      {
        topic: this.config.topics.rawEvents,
        numPartitions: this.config.partitions.count,
        replicationFactor: this.config.replication.factor,
        configEntries: [
          { name: 'retention.ms', value: this.parseRetention(this.config.retention.rawEvents) },
          { name: 'min.insync.replicas', value: this.config.replication.minInSyncReplicas.toString() },
          { name: 'cleanup.policy', value: 'delete' }
        ]
      },
      {
        topic: this.config.topics.normalizedEvents,
        numPartitions: this.config.partitions.count,
        replicationFactor: this.config.replication.factor,
        configEntries: [
          { name: 'retention.ms', value: this.parseRetention(this.config.retention.normalizedEvents) },
          { name: 'min.insync.replicas', value: this.config.replication.minInSyncReplicas.toString() },
          { name: 'cleanup.policy', value: 'delete' }
        ]
      },
      {
        topic: this.config.topics.processedEvents,
        numPartitions: this.config.partitions.count,
        replicationFactor: this.config.replication.factor,
        configEntries: [
          { name: 'retention.ms', value: this.parseRetention(this.config.retention.processedEvents) },
          { name: 'min.insync.replicas', value: this.config.replication.minInSyncReplicas.toString() },
          { name: 'cleanup.policy', value: 'delete' }
        ]
      },
      {
        topic: this.config.topics.deadLetterQueue,
        numPartitions: this.config.partitions.count,
        replicationFactor: this.config.replication.factor,
        configEntries: [
          { name: 'retention.ms', value: this.parseRetention(this.config.retention.deadLetterQueue) },
          { name: 'min.insync.replicas', value: this.config.replication.minInSyncReplicas.toString() },
          { name: 'cleanup.policy', value: 'delete' }
        ]
      },
      {
        topic: this.config.topics.replayEvents,
        numPartitions: this.config.partitions.count,
        replicationFactor: this.config.replication.factor,
        configEntries: [
          { name: 'retention.ms', value: this.parseRetention(this.config.retention.replayEvents) },
          { name: 'min.insync.replicas', value: this.config.replication.minInSyncReplicas.toString() },
          { name: 'cleanup.policy', value: 'delete' }
        ]
      }
    ];

    try {
      await this.admin.createTopics(topics);
      console.log('Kafka topics created successfully');
    } catch (error) {
      // Topics might already exist, which is fine
      console.log('Topics creation completed (some may already exist)');
    }
  }

  /**
   * Parse retention string to milliseconds
   */
  private parseRetention(retention: string): string {
    const units: Record<string, number> = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000,
      'w': 7 * 24 * 60 * 60 * 1000
    };

    const match = retention.match(/^(\d+)([smhdw])$/);
    if (!match) {
      throw new Error(`Invalid retention format: ${retention}`);
    }

    const [, value, unit] = match;
    return (parseInt(value) * units[unit]).toString();
  }

  /**
   * Publish raw event to Kafka
   */
  async publishRawEvent(event: any, platform: Platform): Promise<void> {
    await this.publishEvent(this.config.topics.rawEvents, event, platform);
  }

  /**
   * Publish normalized event to Kafka
   */
  async publishNormalizedEvent(event: SocialEvent): Promise<void> {
    await this.publishEvent(this.config.topics.normalizedEvents, event, event.platform, event.eventType);
  }

  /**
   * Publish processed event to Kafka
   */
  async publishProcessedEvent(event: SocialEvent): Promise<void> {
    await this.publishEvent(this.config.topics.processedEvents, event, event.platform, event.eventType);
  }

  /**
   * Publish event to dead letter queue
   */
  async publishToDeadLetterQueue(event: any, error: Error, originalTopic: string): Promise<void> {
    const deadLetterEvent = {
      originalEvent: event,
      error: {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      },
      originalTopic,
      deadLetterTimestamp: new Date().toISOString()
    };

    await this.publishEvent(this.config.topics.deadLetterQueue, deadLetterEvent);
    this.metrics.deadLetterMessages++;
  }

  /**
   * Publish event for replay
   */
  async publishForReplay(event: SocialEvent, replayReason: string): Promise<void> {
    const replayEvent = {
      originalEvent: event,
      replayReason,
      replayTimestamp: new Date().toISOString(),
      originalTimestamp: event.timestamp
    };

    await this.publishEvent(this.config.topics.replayEvents, replayEvent, event.platform);
    this.metrics.replayMessages++;
  }

  /**
   * Generic event publishing method
   */
  private async publishEvent(
    topic: string, 
    event: any, 
    platform?: Platform, 
    eventType?: EventType
  ): Promise<void> {
    if (!this.producer) {
      throw new Error('Producer not initialized');
    }

    const startTime = Date.now();

    try {
      const key = this.generatePartitionKey(platform, eventType);
      const partition = this.calculatePartition(key);

      const record: ProducerRecord = {
        topic,
        partition,
        key,
        value: JSON.stringify(event),
        headers: {
          'content-type': 'application/json',
          'producer': 'social-intelligence-engine',
          'timestamp': new Date().toISOString(),
          ...(platform && { 'platform': platform }),
          ...(eventType && { 'event-type': eventType })
        }
      };

      await this.producer.send(record);

      // Update metrics
      this.updateMetrics(topic, Date.now() - startTime, true);
      this.metrics.messagesProduced++;

    } catch (error) {
      this.updateMetrics(topic, Date.now() - startTime, false);
      console.error(`Failed to publish event to topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Generate partition key for event routing
   */
  private generatePartitionKey(platform?: Platform, eventType?: EventType): string {
    const parts: string[] = [];

    if (this.config.partitions.byPlatform && platform) {
      parts.push(platform);
    }

    if (this.config.partitions.byEventType && eventType) {
      parts.push(eventType);
    }

    return parts.length > 0 ? parts.join('_') : 'default';
  }

  /**
   * Calculate partition number from key
   */
  private calculatePartition(key: string): number {
    // Simple hash-based partitioning
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % this.config.partitions.count;
  }

  /**
   * Subscribe to raw events
   */
  async subscribeToRawEvents(
    groupId: string,
    handler: (event: any, platform: Platform) => Promise<void>
  ): Promise<void> {
    await this.subscribeToTopic(
      this.config.topics.rawEvents,
      groupId,
      async (message) => {
        const event = JSON.parse(message.value);
        const platform = message.headers?.platform as Platform;
        await handler(event, platform);
      }
    );
  }

  /**
   * Subscribe to normalized events
   */
  async subscribeToNormalizedEvents(
    groupId: string,
    handler: (event: SocialEvent) => Promise<void>
  ): Promise<void> {
    await this.subscribeToTopic(
      this.config.topics.normalizedEvents,
      groupId,
      async (message) => {
        const event = JSON.parse(message.value) as SocialEvent;
        await handler(event);
      }
    );
  }

  /**
   * Subscribe to processed events
   */
  async subscribeToProcessedEvents(
    groupId: string,
    handler: (event: SocialEvent) => Promise<void>
  ): Promise<void> {
    await this.subscribeToTopic(
      this.config.topics.processedEvents,
      groupId,
      async (message) => {
        const event = JSON.parse(message.value) as SocialEvent;
        await handler(event);
      }
    );
  }

  /**
   * Subscribe to dead letter queue
   */
  async subscribeToDeadLetterQueue(
    groupId: string,
    handler: (deadLetterEvent: any) => Promise<void>
  ): Promise<void> {
    await this.subscribeToTopic(
      this.config.topics.deadLetterQueue,
      groupId,
      async (message) => {
        const deadLetterEvent = JSON.parse(message.value);
        await handler(deadLetterEvent);
      }
    );
  }

  /**
   * Subscribe to replay events
   */
  async subscribeToReplayEvents(
    groupId: string,
    handler: (replayEvent: any) => Promise<void>
  ): Promise<void> {
    await this.subscribeToTopic(
      this.config.topics.replayEvents,
      groupId,
      async (message) => {
        const replayEvent = JSON.parse(message.value);
        await handler(replayEvent);
      }
    );
  }

  /**
   * Generic topic subscription method
   */
  private async subscribeToTopic(
    topic: string,
    groupId: string,
    messageHandler: (message: ConsumerRecord) => Promise<void>
  ): Promise<void> {
    const consumer = this.client.consumer({
      groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxBytesPerPartition: 1048576, // 1MB
      retry: {
        maxRetryTime: 30000,
        initialRetryTime: 300,
        factor: 0.2,
        multiplier: 2,
        retries: 5
      }
    });

    await consumer.connect();
    await consumer.subscribe([topic]);

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const startTime = Date.now();
        
        try {
          await messageHandler(message);
          
          // Update metrics
          this.updateMetrics(topic, Date.now() - startTime, true);
          this.metrics.messagesConsumed++;

        } catch (error) {
          this.updateMetrics(topic, Date.now() - startTime, false);
          console.error(`Error processing message from topic ${topic}:`, error);
          
          // Send to dead letter queue if not already there
          if (topic !== this.config.topics.deadLetterQueue) {
            try {
              const originalEvent = JSON.parse(message.value);
              await this.publishToDeadLetterQueue(originalEvent, error as Error, topic);
            } catch (dlqError) {
              console.error('Failed to send message to dead letter queue:', dlqError);
            }
          }
        }
      }
    });

    this.consumers.set(`${topic}_${groupId}`, consumer);
  }

  /**
   * Replay events from a specific time range
   */
  async replayEvents(
    fromTimestamp: Date,
    toTimestamp: Date,
    platforms?: Platform[],
    eventTypes?: EventType[]
  ): Promise<void> {
    // This would typically involve:
    // 1. Querying Kafka for messages in the time range
    // 2. Filtering by platform/event type if specified
    // 3. Re-publishing to replay topic
    // 4. Processing through the pipeline again

    console.log(`Replaying events from ${fromTimestamp.toISOString()} to ${toTimestamp.toISOString()}`);
    
    // Implementation would depend on specific Kafka client capabilities
    // This is a placeholder for the replay logic
  }

  /**
   * Update metrics
   */
  private updateMetrics(topic: string, latency: number, success: boolean): void {
    // Initialize topic breakdown if needed
    if (!this.metrics.topicBreakdown[topic]) {
      this.metrics.topicBreakdown[topic] = {
        produced: 0,
        consumed: 0,
        errors: 0
      };
    }

    // Update topic-specific metrics
    if (success) {
      if (topic === this.config.topics.rawEvents || 
          topic === this.config.topics.normalizedEvents || 
          topic === this.config.topics.processedEvents) {
        this.metrics.topicBreakdown[topic].produced++;
      } else {
        this.metrics.topicBreakdown[topic].consumed++;
      }
    } else {
      this.metrics.topicBreakdown[topic].errors++;
    }

    // Update average latency
    const totalMessages = this.metrics.messagesProduced + this.metrics.messagesConsumed;
    if (totalMessages > 0) {
      this.metrics.averageLatency = 
        (this.metrics.averageLatency * (totalMessages - 1) + latency) / totalMessages;
    }

    // Update error rate
    const totalErrors = Object.values(this.metrics.topicBreakdown)
      .reduce((sum, breakdown) => sum + breakdown.errors, 0);
    this.metrics.errorRate = totalMessages > 0 ? totalErrors / totalMessages : 0;
  }

  /**
   * Get streaming metrics
   */
  getMetrics(): StreamingMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      messagesProduced: 0,
      messagesConsumed: 0,
      deadLetterMessages: 0,
      replayMessages: 0,
      averageLatency: 0,
      errorRate: 0,
      throughputPerSecond: 0,
      topicBreakdown: {}
    };
  }

  /**
   * Get topic list
   */
  async getTopics(): Promise<string[]> {
    if (!this.admin) {
      throw new Error('Admin client not initialized');
    }
    return await this.admin.listTopics();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: {
      producer: boolean;
      consumers: number;
      topics: string[];
      lastError?: string;
    };
  }> {
    try {
      const topics = await this.getTopics();
      
      return {
        status: 'healthy',
        details: {
          producer: !!this.producer,
          consumers: this.consumers.size,
          topics,
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          producer: false,
          consumers: 0,
          topics: [],
          lastError: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down Kafka event streaming...');

    // Disconnect producer
    if (this.producer) {
      await this.producer.disconnect();
      this.producer = undefined;
    }

    // Disconnect all consumers
    for (const [key, consumer] of this.consumers) {
      try {
        await consumer.disconnect();
        console.log(`Disconnected consumer: ${key}`);
      } catch (error) {
        console.error(`Error disconnecting consumer ${key}:`, error);
      }
    }
    this.consumers.clear();

    // Disconnect admin client
    if (this.admin) {
      await this.admin.disconnect();
      this.admin = undefined;
    }

    this.isInitialized = false;
    console.log('Kafka event streaming shut down successfully');
  }
}