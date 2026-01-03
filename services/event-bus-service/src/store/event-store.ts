/**
 * Event Store - Durable Persistence Layer
 * 
 * Core responsibilities:
 * - Append-only event storage (NO updates, NO deletes)
 * - Partition by aggregate ID for ordering
 * - Support replay from any point
 * - Persist BEFORE acknowledging
 * 
 * This is the "source of truth" for what happened.
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEnvelope, EventState, EventDomain, IncomingEvent } from '../types/event.types';
import { logger } from '../utils/logger';

// ============================================================================
// STORAGE INTERFACE (for swapping implementations)
// ============================================================================

export interface EventStorageBackend {
  /** Persist event - MUST be durable before returning */
  persist(event: EventEnvelope): Promise<void>;
  
  /** Get events by domain (for consumers) */
  getByDomain(domain: EventDomain, afterEventId?: string, limit?: number): Promise<EventEnvelope[]>;
  
  /** Get events by correlation ID (for tracing) */
  getByCorrelationId(correlationId: string): Promise<EventEnvelope[]>;
  
  /** Get single event by ID */
  getById(eventId: string): Promise<EventEnvelope | null>;
  
  /** Get events by aggregate ID (for replay) */
  getByAggregateId(aggregateId: string, aggregateType: string): Promise<EventEnvelope[]>;
  
  /** Get event count by domain */
  getCountByDomain(): Promise<Record<EventDomain, number>>;
  
  /** Get oldest undelivered event timestamp */
  getOldestUndeliveredAge(): Promise<number>;
}

// ============================================================================
// IN-MEMORY IMPLEMENTATION (for development/testing)
// ============================================================================

export class InMemoryEventStore implements EventStorageBackend {
  private events: Map<string, EventEnvelope> = new Map();
  private eventsByDomain: Map<EventDomain, string[]> = new Map();
  private eventsByCorrelation: Map<string, string[]> = new Map();
  private eventsByAggregate: Map<string, string[]> = new Map();
  private eventOrder: string[] = [];
  
  private readonly maxEvents: number;
  
  constructor(maxEvents = 100000) {
    this.maxEvents = maxEvents;
  }

  async persist(event: EventEnvelope): Promise<void> {
    // Simulate write latency
    await new Promise(resolve => setTimeout(resolve, 1));
    
    // Store event
    this.events.set(event.event_id, event);
    this.eventOrder.push(event.event_id);
    
    // Index by domain
    const domain = event.event_type.split('.')[0] as EventDomain;
    if (!this.eventsByDomain.has(domain)) {
      this.eventsByDomain.set(domain, []);
    }
    this.eventsByDomain.get(domain)!.push(event.event_id);
    
    // Index by correlation
    if (!this.eventsByCorrelation.has(event.correlation_id)) {
      this.eventsByCorrelation.set(event.correlation_id, []);
    }
    this.eventsByCorrelation.get(event.correlation_id)!.push(event.event_id);
    
    // Index by aggregate (if present in payload)
    const aggregateId = this.extractAggregateId(event);
    if (aggregateId) {
      if (!this.eventsByAggregate.has(aggregateId)) {
        this.eventsByAggregate.set(aggregateId, []);
      }
      this.eventsByAggregate.get(aggregateId)!.push(event.event_id);
    }
    
    // Eviction (only for in-memory)
    if (this.eventOrder.length > this.maxEvents) {
      const oldestId = this.eventOrder.shift()!;
      this.events.delete(oldestId);
    }
    
    logger.debug('Event persisted', { event_id: event.event_id, event_type: event.event_type });
  }

  async getByDomain(domain: EventDomain, afterEventId?: string, limit = 100): Promise<EventEnvelope[]> {
    const eventIds = this.eventsByDomain.get(domain) || [];
    
    let startIndex = 0;
    if (afterEventId) {
      const afterIndex = eventIds.indexOf(afterEventId);
      if (afterIndex !== -1) {
        startIndex = afterIndex + 1;
      }
    }
    
    const slice = eventIds.slice(startIndex, startIndex + limit);
    return slice.map(id => this.events.get(id)!).filter(Boolean);
  }

  async getByCorrelationId(correlationId: string): Promise<EventEnvelope[]> {
    const eventIds = this.eventsByCorrelation.get(correlationId) || [];
    return eventIds.map(id => this.events.get(id)!).filter(Boolean);
  }

  async getById(eventId: string): Promise<EventEnvelope | null> {
    return this.events.get(eventId) || null;
  }

  async getByAggregateId(aggregateId: string, _aggregateType: string): Promise<EventEnvelope[]> {
    const eventIds = this.eventsByAggregate.get(aggregateId) || [];
    return eventIds.map(id => this.events.get(id)!).filter(Boolean);
  }

  async getCountByDomain(): Promise<Record<EventDomain, number>> {
    const counts: Record<string, number> = {};
    for (const [domain, events] of this.eventsByDomain.entries()) {
      counts[domain] = events.length;
    }
    return counts as Record<EventDomain, number>;
  }

  async getOldestUndeliveredAge(): Promise<number> {
    if (this.eventOrder.length === 0) return 0;
    const oldest = this.events.get(this.eventOrder[0]);
    if (!oldest) return 0;
    return Date.now() - new Date(oldest.occurred_at).getTime();
  }

  private extractAggregateId(event: EventEnvelope): string | null {
    const payload = event.payload as Record<string, unknown>;
    // Common aggregate ID patterns
    return (
      payload.request_id ||
      payload.booking_id ||
      payload.itinerary_id ||
      payload.payment_id ||
      payload.user_id ||
      payload.dispute_id
    ) as string | null;
  }
  
  // For testing
  clear(): void {
    this.events.clear();
    this.eventsByDomain.clear();
    this.eventsByCorrelation.clear();
    this.eventsByAggregate.clear();
    this.eventOrder = [];
  }
  
  getStats() {
    return {
      total_events: this.events.size,
      domains: Object.fromEntries(this.eventsByDomain),
      correlations: this.eventsByCorrelation.size,
      aggregates: this.eventsByAggregate.size,
    };
  }
}

// ============================================================================
// EVENT STORE SERVICE
// ============================================================================

export class EventStore {
  private backend: EventStorageBackend;
  
  constructor(backend: EventStorageBackend) {
    this.backend = backend;
  }

  /**
   * Create and persist a new event from incoming data.
   * Event ID is ALWAYS generated server-side for idempotency.
   */
  async append(incoming: {
    event_type: string;
    event_version?: number;
    correlation_id?: string;
    causation_id?: string;
    aggregate_id?: string;
    producer: string;
    payload: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): Promise<EventEnvelope> {
    const event: EventEnvelope = {
      event_id: uuidv4(),
      event_type: incoming.event_type,
      event_version: incoming.event_version || 1,
      occurred_at: new Date().toISOString(),
      producer: incoming.producer,
      correlation_id: incoming.correlation_id || uuidv4(),
      causation_id: incoming.causation_id,
      aggregate_id: incoming.aggregate_id,
      payload: incoming.payload,
      sequence: Date.now(), // Simple sequence for ordering
      metadata: incoming.metadata as EventEnvelope['metadata'],
    };

    // CRITICAL: Persist BEFORE acknowledging
    await this.backend.persist(event);
    
    logger.info('Event appended', {
      event_id: event.event_id,
      event_type: event.event_type,
      producer: incoming.producer,
      correlation_id: event.correlation_id,
    });

    return event;
  }

  /**
   * Get events for a consumer by domain (pull-based consumption)
   */
  async getEvents(options: {
    domain?: EventDomain;
    afterEventId?: string;
    limit?: number;
  } = {}): Promise<EventEnvelope[]> {
    const { domain, afterEventId, limit = 100 } = options;
    if (!domain) {
      // Return events from all domains
      const allEvents: EventEnvelope[] = [];
      for (const d of Object.values(EventDomain) as EventDomain[]) {
        const events = await this.backend.getByDomain(d, afterEventId, limit);
        allEvents.push(...events);
      }
      return allEvents.slice(0, limit);
    }
    return this.backend.getByDomain(domain, afterEventId, limit);
  }

  /**
   * Get all events for a correlation ID (for debugging/tracing)
   */
  async getEventTrace(correlationId: string): Promise<EventEnvelope[]> {
    return this.backend.getByCorrelationId(correlationId);
  }

  /**
   * Get event by ID
   */
  async getEvent(eventId: string): Promise<EventEnvelope | null> {
    return this.backend.getById(eventId);
  }

  /**
   * Replay events for an aggregate (for rebuilding state)
   */
  async replayAggregate(aggregateId: string, aggregateType = 'unknown'): Promise<EventEnvelope[]> {
    return this.backend.getByAggregateId(aggregateId, aggregateType);
  }

  /**
   * Get domain counts for metrics
   */
  async getDomainCounts(): Promise<Record<EventDomain, number>> {
    return this.backend.getCountByDomain();
  }

  /**
   * Get oldest undelivered event age for alerting
   */
  async getOldestUndeliveredAge(): Promise<number> {
    return this.backend.getOldestUndeliveredAge();
  }
}

// ============================================================================
// SINGLETON FACTORY
// ============================================================================

let eventStoreInstance: EventStore | null = null;

export function getEventStore(): EventStore {
  if (!eventStoreInstance) {
    // Use in-memory for now, can swap to PostgreSQL/Redis later
    const backend = new InMemoryEventStore();
    eventStoreInstance = new EventStore(backend);
  }
  return eventStoreInstance;
}

export function createEventStore(backend: EventStorageBackend): EventStore {
  eventStoreInstance = new EventStore(backend);
  return eventStoreInstance;
}
