/**
 * Consumer Manager
 * 
 * Manages event consumers:
 * - Consumer registration and subscriptions
 * - Pull-based consumption with offset tracking
 * - Webhook delivery with retries
 * - Consumer acknowledgements
 * 
 * Consumption Models:
 * 1. Pull: Consumer calls /consume endpoint
 * 2. Push (Webhook): Events delivered to consumer endpoints
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Consumer,
  Subscription,
  ConsumerOffset,
  EventEnvelope,
  EventDomain,
} from '../types/event.types';
import { EventStore } from '../store/event-store';
import { DeadLetterQueue } from '../dlq/dead-letter-queue';
import { logger } from '../utils/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface ConsumerConfig {
  /** Batch size for pull consumption */
  defaultBatchSize: number;
  /** Maximum batch size */
  maxBatchSize: number;
  /** Ack timeout before redelivery */
  ackTimeoutMs: number;
  /** Webhook delivery timeout */
  webhookTimeoutMs: number;
  /** Maximum webhook retries */
  webhookMaxRetries: number;
}

const DEFAULT_CONFIG: ConsumerConfig = {
  defaultBatchSize: 10,
  maxBatchSize: 100,
  ackTimeoutMs: 30000,
  webhookTimeoutMs: 10000,
  webhookMaxRetries: 3,
};

// ============================================================================
// CONSUMER STORAGE INTERFACE
// ============================================================================

export interface ConsumerStorageBackend {
  // Consumer operations
  registerConsumer(consumer: Consumer): Promise<void>;
  getConsumer(consumerId: string): Promise<Consumer | null>;
  updateConsumer(consumer: Consumer): Promise<void>;
  removeConsumer(consumerId: string): Promise<void>;
  listConsumers(): Promise<Consumer[]>;
  
  // Subscription operations
  addSubscription(subscription: Subscription): Promise<void>;
  getSubscription(subscriptionId: string): Promise<Subscription | null>;
  getSubscriptionsByConsumer(consumerId: string): Promise<Subscription[]>;
  getSubscriptionsByEventType(eventType: string): Promise<Subscription[]>;
  removeSubscription(subscriptionId: string): Promise<void>;
  
  // Offset operations
  getOffset(consumerId: string, eventType: string): Promise<ConsumerOffset | null>;
  setOffset(offset: ConsumerOffset): Promise<void>;
}

// ============================================================================
// IN-MEMORY CONSUMER STORAGE
// ============================================================================

export class InMemoryConsumerStorage implements ConsumerStorageBackend {
  private consumers: Map<string, Consumer> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private offsets: Map<string, ConsumerOffset> = new Map();
  
  async registerConsumer(consumer: Consumer): Promise<void> {
    this.consumers.set(consumer.consumer_id, consumer);
  }
  
  async getConsumer(consumerId: string): Promise<Consumer | null> {
    return this.consumers.get(consumerId) || null;
  }
  
  async updateConsumer(consumer: Consumer): Promise<void> {
    this.consumers.set(consumer.consumer_id, consumer);
  }
  
  async removeConsumer(consumerId: string): Promise<void> {
    this.consumers.delete(consumerId);
  }
  
  async listConsumers(): Promise<Consumer[]> {
    return Array.from(this.consumers.values());
  }
  
  async addSubscription(subscription: Subscription): Promise<void> {
    this.subscriptions.set(subscription.subscription_id, subscription);
  }
  
  async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    return this.subscriptions.get(subscriptionId) || null;
  }
  
  async getSubscriptionsByConsumer(consumerId: string): Promise<Subscription[]> {
    return Array.from(this.subscriptions.values())
      .filter(s => s.consumer_id === consumerId);
  }
  
  async getSubscriptionsByEventType(eventType: string): Promise<Subscription[]> {
    return Array.from(this.subscriptions.values())
      .filter(s => {
        // Match exact event type or domain wildcard
        if (s.event_types.includes(eventType)) return true;
        // Match domain.* pattern
        const domain = eventType.split('.')[0];
        return s.event_types.includes(`${domain}.*`);
      });
  }
  
  async removeSubscription(subscriptionId: string): Promise<void> {
    this.subscriptions.delete(subscriptionId);
  }
  
  async getOffset(consumerId: string, eventType: string): Promise<ConsumerOffset | null> {
    const key = `${consumerId}:${eventType}`;
    return this.offsets.get(key) || null;
  }
  
  async setOffset(offset: ConsumerOffset): Promise<void> {
    const key = `${offset.consumer_id}:${offset.event_type}`;
    this.offsets.set(key, offset);
  }
  
  // For testing
  clear(): void {
    this.consumers.clear();
    this.subscriptions.clear();
    this.offsets.clear();
  }
}

// ============================================================================
// PENDING DELIVERY TRACKER
// ============================================================================

interface PendingDelivery {
  event: EventEnvelope;
  consumerId: string;
  deliveredAt: Date;
  timeoutId: NodeJS.Timeout;
}

// ============================================================================
// CONSUMER MANAGER
// ============================================================================

export class ConsumerManager {
  private storage: ConsumerStorageBackend;
  private eventStore: EventStore;
  private dlq: DeadLetterQueue;
  private config: ConsumerConfig;
  private pendingDeliveries: Map<string, PendingDelivery> = new Map();
  
  constructor(
    storage: ConsumerStorageBackend,
    eventStore: EventStore,
    dlq: DeadLetterQueue,
    config: Partial<ConsumerConfig> = {}
  ) {
    this.storage = storage;
    this.eventStore = eventStore;
    this.dlq = dlq;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // CONSUMER REGISTRATION
  // ============================================================================

  /**
   * Register a new consumer
   */
  async registerConsumer(
    serviceName: string,
    webhookUrl?: string
  ): Promise<Consumer> {
    const consumer: Consumer = {
      consumer_id: uuidv4(),
      service_name: serviceName,
      webhook_url: webhookUrl,
      created_at: new Date().toISOString(),
      active: true,
    };
    
    await this.storage.registerConsumer(consumer);
    
    logger.info('Consumer registered', {
      consumer_id: consumer.consumer_id,
      service_name: serviceName,
      has_webhook: !!webhookUrl,
    });
    
    return consumer;
  }

  /**
   * Deactivate a consumer
   */
  async deactivateConsumer(consumerId: string): Promise<void> {
    const consumer = await this.storage.getConsumer(consumerId);
    if (!consumer) return;
    
    consumer.active = false;
    await this.storage.updateConsumer(consumer);
    
    logger.info('Consumer deactivated', { consumer_id: consumerId });
  }

  /**
   * Remove a consumer and all subscriptions
   */
  async removeConsumer(consumerId: string): Promise<void> {
    const subscriptions = await this.storage.getSubscriptionsByConsumer(consumerId);
    
    for (const sub of subscriptions) {
      await this.storage.removeSubscription(sub.subscription_id);
    }
    
    await this.storage.removeConsumer(consumerId);
    
    logger.info('Consumer removed', {
      consumer_id: consumerId,
      subscriptions_removed: subscriptions.length,
    });
  }

  // ============================================================================
  // SUBSCRIPTIONS
  // ============================================================================

  /**
   * Subscribe consumer to event types
   */
  async subscribe(
    consumerId: string,
    eventTypes: string[],
    fromOffset?: string
  ): Promise<Subscription> {
    const consumer = await this.storage.getConsumer(consumerId);
    if (!consumer) {
      throw new Error(`Consumer not found: ${consumerId}`);
    }
    
    const subscription: Subscription = {
      subscription_id: uuidv4(),
      consumer_id: consumerId,
      event_types: eventTypes,
      created_at: new Date().toISOString(),
    };
    
    await this.storage.addSubscription(subscription);
    
    // Initialize offsets if starting point specified
    if (fromOffset) {
      for (const eventType of eventTypes) {
        const offset: ConsumerOffset = {
          consumer_id: consumerId,
          event_type: eventType,
          last_event_id: fromOffset,
          last_processed_at: new Date().toISOString(),
        };
        await this.storage.setOffset(offset);
      }
    }
    
    logger.info('Subscription created', {
      subscription_id: subscription.subscription_id,
      consumer_id: consumerId,
      event_types: eventTypes,
    });
    
    return subscription;
  }

  /**
   * Unsubscribe from event types
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    await this.storage.removeSubscription(subscriptionId);
    logger.info('Subscription removed', { subscription_id: subscriptionId });
  }

  // ============================================================================
  // PULL-BASED CONSUMPTION
  // ============================================================================

  /**
   * Pull events for a consumer (pull model)
   */
  async pullEvents(
    consumerId: string,
    eventTypes: string[],
    options: {
      batchSize?: number;
      fromOffset?: string;
    } = {}
  ): Promise<EventEnvelope[]> {
    const consumer = await this.storage.getConsumer(consumerId);
    if (!consumer || !consumer.active) {
      throw new Error(`Consumer not found or inactive: ${consumerId}`);
    }
    
    const batchSize = Math.min(
      options.batchSize || this.config.defaultBatchSize,
      this.config.maxBatchSize
    );
    
    const events: EventEnvelope[] = [];
    
    for (const eventType of eventTypes) {
      // Get last processed offset
      let afterId = options.fromOffset;
      if (!afterId) {
        const offset = await this.storage.getOffset(consumerId, eventType);
        afterId = offset?.last_event_id;
      }
      
      // Determine domain from event type
      const domain = eventType.split('.')[0] as EventDomain;
      
      // Get events after offset
      const typeEvents = await this.eventStore.getEvents({
        domain,
        afterEventId: afterId,
        limit: batchSize,
      });
      
      // Filter to exact event type (or all if wildcard)
      const filtered = eventType.endsWith('.*')
        ? typeEvents
        : typeEvents.filter(e => e.event_type === eventType);
      
      events.push(...filtered);
    }
    
    // Sort by sequence and take batch size
    events.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    const batch = events.slice(0, batchSize);
    
    // Track pending deliveries for ack timeout
    for (const event of batch) {
      this.trackPendingDelivery(event, consumerId);
    }
    
    logger.debug('Events pulled', {
      consumer_id: consumerId,
      count: batch.length,
      event_types: eventTypes,
    });
    
    return batch;
  }

  /**
   * Track a pending delivery for ack timeout
   */
  private trackPendingDelivery(event: EventEnvelope, consumerId: string): void {
    const key = `${consumerId}:${event.event_id}`;
    
    // Clear existing timeout if any
    const existing = this.pendingDeliveries.get(key);
    if (existing) {
      clearTimeout(existing.timeoutId);
    }
    
    // Set ack timeout
    const timeoutId = setTimeout(() => {
      this.handleAckTimeout(event, consumerId);
    }, this.config.ackTimeoutMs);
    
    this.pendingDeliveries.set(key, {
      event,
      consumerId,
      deliveredAt: new Date(),
      timeoutId,
    });
  }

  /**
   * Handle ack timeout - redeliver or send to DLQ
   */
  private async handleAckTimeout(event: EventEnvelope, consumerId: string): Promise<void> {
    const key = `${consumerId}:${event.event_id}`;
    this.pendingDeliveries.delete(key);
    
    logger.warn('Ack timeout', {
      event_id: event.event_id,
      consumer_id: consumerId,
    });
    
    // Record failure and potentially move to DLQ
    await this.dlq.recordFailure(event, consumerId, 'Acknowledgement timeout');
  }

  // ============================================================================
  // ACKNOWLEDGEMENT
  // ============================================================================

  /**
   * Acknowledge successful event processing
   */
  async acknowledge(
    consumerId: string,
    eventId: string,
    eventType: string
  ): Promise<void> {
    const key = `${consumerId}:${eventId}`;
    
    // Clear pending delivery
    const pending = this.pendingDeliveries.get(key);
    if (pending) {
      clearTimeout(pending.timeoutId);
      this.pendingDeliveries.delete(key);
    }
    
    // Update offset
    const offset: ConsumerOffset = {
      consumer_id: consumerId,
      event_type: eventType,
      last_event_id: eventId,
      last_processed_at: new Date().toISOString(),
    };
    await this.storage.setOffset(offset);
    
    logger.debug('Event acknowledged', {
      consumer_id: consumerId,
      event_id: eventId,
      event_type: eventType,
    });
  }

  /**
   * Negative acknowledgement - event processing failed
   */
  async negativeAck(
    consumerId: string,
    eventId: string,
    error: string
  ): Promise<void> {
    const key = `${consumerId}:${eventId}`;
    
    // Get pending delivery
    const pending = this.pendingDeliveries.get(key);
    if (pending) {
      clearTimeout(pending.timeoutId);
      this.pendingDeliveries.delete(key);
      
      // Record failure
      await this.dlq.recordFailure(pending.event, consumerId, error);
    }
    
    logger.warn('Negative ack received', {
      consumer_id: consumerId,
      event_id: eventId,
      error,
    });
  }

  // ============================================================================
  // WEBHOOK DELIVERY (PUSH MODEL)
  // ============================================================================

  /**
   * Deliver event to all subscribed webhooks
   */
  async deliverToWebhooks(event: EventEnvelope): Promise<void> {
    const subscriptions = await this.storage.getSubscriptionsByEventType(event.event_type);
    
    for (const subscription of subscriptions) {
      const consumer = await this.storage.getConsumer(subscription.consumer_id);
      
      if (!consumer || !consumer.active || !consumer.webhook_url) {
        continue;
      }
      
      // Async delivery (don't block)
      this.deliverToWebhook(event, consumer).catch(error => {
        logger.error('Webhook delivery failed', {
          event_id: event.event_id,
          consumer_id: consumer.consumer_id,
          error: error.message,
        });
      });
    }
  }

  /**
   * Deliver event to a specific webhook
   */
  private async deliverToWebhook(
    event: EventEnvelope,
    consumer: Consumer
  ): Promise<void> {
    if (!consumer.webhook_url) return;
    
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.webhookMaxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => {
          controller.abort();
        }, this.config.webhookTimeoutMs);
        
        const response = await fetch(consumer.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Event-Id': event.event_id,
            'X-Event-Type': event.event_type,
            'X-Correlation-Id': event.correlation_id,
          },
          body: JSON.stringify(event),
          signal: controller.signal,
        });
        
        clearTimeout(timeout);
        
        if (response.ok) {
          logger.debug('Webhook delivery successful', {
            event_id: event.event_id,
            consumer_id: consumer.consumer_id,
            attempt,
          });
          return;
        }
        
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < this.config.webhookMaxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    // All retries failed - send to DLQ
    if (lastError) {
      await this.dlq.recordFailure(event, consumer.consumer_id, lastError);
    }
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  /**
   * Get consumer by ID
   */
  async getConsumer(consumerId: string): Promise<Consumer | null> {
    return this.storage.getConsumer(consumerId);
  }

  /**
   * List all consumers
   */
  async listConsumers(): Promise<Consumer[]> {
    return this.storage.listConsumers();
  }

  /**
   * Get subscriptions for a consumer
   */
  async getSubscriptions(consumerId: string): Promise<Subscription[]> {
    return this.storage.getSubscriptionsByConsumer(consumerId);
  }

  /**
   * Get consumer lag (events behind)
   */
  async getConsumerLag(consumerId: string, eventType: string): Promise<number> {
    const offset = await this.storage.getOffset(consumerId, eventType);
    const domain = eventType.split('.')[0] as EventDomain;
    
    const allEvents = await this.eventStore.getEvents({ domain });
    
    if (!offset) {
      // Never consumed - all events are lag
      return allEvents.filter(e => 
        eventType.endsWith('.*') || e.event_type === eventType
      ).length;
    }
    
    // Find position of last processed event
    const lastIndex = allEvents.findIndex(e => e.event_id === offset.last_event_id);
    if (lastIndex === -1) {
      return allEvents.length;
    }
    
    return allEvents.length - lastIndex - 1;
  }

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  /**
   * Shutdown - clear all pending deliveries
   */
  shutdown(): void {
    for (const pending of this.pendingDeliveries.values()) {
      clearTimeout(pending.timeoutId);
    }
    this.pendingDeliveries.clear();
    logger.info('Consumer manager shutdown complete');
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let consumerManagerInstance: ConsumerManager | null = null;

export function createConsumerManager(
  storage: ConsumerStorageBackend,
  eventStore: EventStore,
  dlq: DeadLetterQueue,
  config?: Partial<ConsumerConfig>
): ConsumerManager {
  consumerManagerInstance = new ConsumerManager(storage, eventStore, dlq, config);
  return consumerManagerInstance;
}

export function getConsumerManager(): ConsumerManager {
  if (!consumerManagerInstance) {
    throw new Error('ConsumerManager not initialized. Call createConsumerManager first.');
  }
  return consumerManagerInstance;
}
