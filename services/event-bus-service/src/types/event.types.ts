/**
 * Event Bus Core Types
 * 
 * Industry-standard event structure following best practices:
 * - Immutable events (facts that happened)
 * - Schema versioning
 * - Correlation for tracing
 * - Past-tense naming convention
 */

import { z } from 'zod';

// ============================================================================
// CORE EVENT ENVELOPE
// ============================================================================

/**
 * Base event envelope - every event MUST have these fields
 */
export const EventEnvelopeSchema = z.object({
  /** Unique identifier for idempotency - generated server-side */
  event_id: z.string().uuid(),
  
  /** Event type in format: domain.EVENT_NAME (past tense) */
  event_type: z.string(),
  
  /** Schema version for backward compatibility */
  event_version: z.number().int().positive().default(1),
  
  /** When the event occurred (ISO 8601) */
  occurred_at: z.string().datetime(),
  
  /** Service that produced this event */
  producer: z.string().min(1),
  
  /** Correlation ID for distributed tracing */
  correlation_id: z.string().uuid(),
  
  /** Optional: ID of the event that caused this one */
  causation_id: z.string().uuid().optional(),
  
  /** The event payload (validated separately per event type) */
  payload: z.record(z.unknown()),
  
  /** Sequence number for ordering */
  sequence: z.number().optional(),
  
  /** Aggregate ID for partitioning */
  aggregate_id: z.string().optional(),
  
  /** Optional metadata */
  metadata: z.object({
    actor_id: z.string().optional(),
    actor_type: z.enum(['user', 'agent', 'admin', 'system']).optional(),
    ip_address: z.string().optional(),
    user_agent: z.string().optional(),
    request_id: z.string().optional(),
  }).optional(),
});

export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

/**
 * Event as received from producer (before server processing)
 */
export const IncomingEventSchema = z.object({
  event_type: z.string().min(1),
  event_version: z.number().int().positive().optional(),
  payload: z.record(z.unknown()),
  correlation_id: z.string().uuid().optional(),
  causation_id: z.string().uuid().optional(),
  aggregate_id: z.string().optional(),
  metadata: z.object({
    actor_id: z.string().optional(),
    actor_type: z.enum(['user', 'agent', 'admin', 'system']).optional(),
    ip_address: z.string().optional(),
    user_agent: z.string().optional(),
    request_id: z.string().optional(),
  }).optional(),
});

export type IncomingEvent = z.infer<typeof IncomingEventSchema>;

// ============================================================================
// EVENT DOMAINS & TYPES
// ============================================================================

/**
 * All event domains in the system
 */
export const EventDomain = {
  REQUESTS: 'requests',
  ITINERARIES: 'itineraries',
  MATCHING: 'matching',
  BOOKINGS: 'bookings',
  PAYMENTS: 'payments',
  MESSAGING: 'messaging',
  DISPUTES: 'disputes',
  REVIEWS: 'reviews',
  NOTIFICATIONS: 'notifications',
  AUDIT: 'audit',
  IDENTITY: 'identity',
} as const;

export type EventDomain = (typeof EventDomain)[keyof typeof EventDomain];

/**
 * All event types organized by domain
 * Convention: PAST TENSE (facts that happened)
 * Nested structure for easier access: EventTypes.REQUESTS.REQUEST_CREATED
 */
export const EventTypes = {
  // Requests domain
  REQUESTS: {
    REQUEST_CREATED: 'requests.REQUEST_CREATED',
    REQUEST_SUBMITTED: 'requests.REQUEST_SUBMITTED',
    REQUEST_UPDATED: 'requests.REQUEST_UPDATED',
    REQUEST_CANCELLED: 'requests.REQUEST_CANCELLED',
    REQUEST_EXPIRED: 'requests.REQUEST_EXPIRED',
  },
  
  // Itineraries domain
  ITINERARIES: {
    ITINERARY_CREATED: 'itineraries.ITINERARY_CREATED',
    ITINERARY_SUBMITTED: 'itineraries.ITINERARY_SUBMITTED',
    ITINERARY_UPDATED: 'itineraries.ITINERARY_UPDATED',
    ITINERARY_ACCEPTED: 'itineraries.ITINERARY_ACCEPTED',
    ITINERARY_REJECTED: 'itineraries.ITINERARY_REJECTED',
    ITINERARY_REVISION_REQUESTED: 'itineraries.ITINERARY_REVISION_REQUESTED',
    ITINERARY_CANCELLED: 'itineraries.ITINERARY_CANCELLED',
    ITINERARY_EXPIRED: 'itineraries.ITINERARY_EXPIRED',
  },
  
  // Matching domain
  MATCHING: {
    AGENT_MATCHED: 'matching.AGENT_MATCHED',
    AGENT_ASSIGNED: 'matching.AGENT_ASSIGNED',
    AGENT_UNASSIGNED: 'matching.AGENT_UNASSIGNED',
    MATCH_DECLINED: 'matching.MATCH_DECLINED',
  },
  
  // Bookings domain
  BOOKINGS: {
    BOOKING_CREATED: 'bookings.BOOKING_CREATED',
    BOOKING_CONFIRMED: 'bookings.BOOKING_CONFIRMED',
    BOOKING_MODIFIED: 'bookings.BOOKING_MODIFIED',
    BOOKING_CANCELLED: 'bookings.BOOKING_CANCELLED',
    BOOKING_COMPLETED: 'bookings.BOOKING_COMPLETED',
  },
  
  // Payments domain
  PAYMENTS: {
    PAYMENT_INITIATED: 'payments.PAYMENT_INITIATED',
    PAYMENT_COMPLETED: 'payments.PAYMENT_COMPLETED',
    PAYMENT_FAILED: 'payments.PAYMENT_FAILED',
    REFUND_INITIATED: 'payments.REFUND_INITIATED',
    REFUND_COMPLETED: 'payments.REFUND_COMPLETED',
    PAYOUT_INITIATED: 'payments.PAYOUT_INITIATED',
    PAYOUT_COMPLETED: 'payments.PAYOUT_COMPLETED',
  },
  
  // Messaging domain
  MESSAGING: {
    MESSAGE_SENT: 'messaging.MESSAGE_SENT',
    MESSAGE_DELIVERED: 'messaging.MESSAGE_DELIVERED',
    MESSAGE_READ: 'messaging.MESSAGE_READ',
    CONVERSATION_CREATED: 'messaging.CONVERSATION_CREATED',
    CONVERSATION_CLOSED: 'messaging.CONVERSATION_CLOSED',
  },
  
  // Disputes domain
  DISPUTES: {
    DISPUTE_OPENED: 'disputes.DISPUTE_OPENED',
    DISPUTE_ESCALATED: 'disputes.DISPUTE_ESCALATED',
    DISPUTE_RESOLVED: 'disputes.DISPUTE_RESOLVED',
    DISPUTE_CLOSED: 'disputes.DISPUTE_CLOSED',
  },
  
  // Reviews domain
  REVIEWS: {
    REVIEW_SUBMITTED: 'reviews.REVIEW_SUBMITTED',
    REVIEW_PUBLISHED: 'reviews.REVIEW_PUBLISHED',
    REVIEW_FLAGGED: 'reviews.REVIEW_FLAGGED',
    REVIEW_REMOVED: 'reviews.REVIEW_REMOVED',
    RESPONSE_ADDED: 'reviews.RESPONSE_ADDED',
  },
  
  // Identity domain
  IDENTITY: {
    USER_REGISTERED: 'identity.USER_REGISTERED',
    USER_VERIFIED: 'identity.USER_VERIFIED',
    USER_PROFILE_UPDATED: 'identity.USER_PROFILE_UPDATED',
    AGENT_PROFILE_CREATED: 'identity.AGENT_PROFILE_CREATED',
    AGENT_PROFILE_VERIFIED: 'identity.AGENT_PROFILE_VERIFIED',
    AGENT_PROFILE_SUSPENDED: 'identity.AGENT_PROFILE_SUSPENDED',
  },
  
  // Audit domain
  AUDIT: {
    AUDIT_LOG_CREATED: 'audit.AUDIT_LOG_CREATED',
    COMPLIANCE_CHECK_PASSED: 'audit.COMPLIANCE_CHECK_PASSED',
    COMPLIANCE_CHECK_FAILED: 'audit.COMPLIANCE_CHECK_FAILED',
    DATA_EXPORT_REQUESTED: 'audit.DATA_EXPORT_REQUESTED',
    DATA_EXPORT_COMPLETED: 'audit.DATA_EXPORT_COMPLETED',
  },
  
  // Notifications domain (internal)
  NOTIFICATIONS: {
    NOTIFICATION_SENT: 'notifications.NOTIFICATION_SENT',
    NOTIFICATION_DELIVERED: 'notifications.NOTIFICATION_DELIVERED',
    NOTIFICATION_FAILED: 'notifications.NOTIFICATION_FAILED',
    NOTIFICATION_READ: 'notifications.NOTIFICATION_READ',
  },
} as const;

// Type helper to extract all event type strings
type EventTypesMap = typeof EventTypes;
type AllEventTypes = {
  [K in keyof EventTypesMap]: EventTypesMap[K][keyof EventTypesMap[K]];
}[keyof EventTypesMap];

export type EventType = AllEventTypes;

// ============================================================================
// EVENT STATE
// ============================================================================

export const EventState = {
  /** Event persisted, awaiting delivery */
  PENDING: 'PENDING',
  /** Event delivered to at least one consumer */
  DELIVERED: 'DELIVERED',
  /** Event failed delivery, in retry queue */
  RETRYING: 'RETRYING',
  /** Event moved to dead letter queue */
  DEAD_LETTERED: 'DEAD_LETTERED',
} as const;

export type EventState = (typeof EventState)[keyof typeof EventState];

// ============================================================================
// CONSUMER / SUBSCRIPTION TYPES
// ============================================================================

export interface Consumer {
  consumer_id: string;
  service_name: string;
  webhook_url?: string;
  created_at: string;
  active: boolean;
}

export interface Subscription {
  subscription_id: string;
  consumer_id: string;
  event_types: string[];
  created_at: string;
}

export interface ConsumerOffset {
  consumer_id: string;
  event_type: string;
  last_event_id: string;
  last_processed_at: string;
}

// ============================================================================
// DEAD LETTER QUEUE
// ============================================================================

export interface DeadLetterEntry {
  dlq_id: string;
  event_id: string;
  event: EventEnvelope;
  consumer_id: string;
  failure_count: number;
  first_failed_at: string;
  last_failed_at: string;
  last_error: string;
  status: 'pending' | 'retrying' | 'resolved' | 'discarded';
}

// ============================================================================
// PUBLISH RESULT
// ============================================================================

export interface PublishResult {
  success: boolean;
  event_id: string;
  event_type: string;
  persisted_at: string;
  delivery_status: 'queued' | 'delivered' | 'partial';
  consumers_notified: number;
  errors?: string[];
}

// ============================================================================
// METRICS
// ============================================================================

export interface EventBusMetrics {
  events_published: number;
  events_delivered: number;
  events_failed: number;
  events_in_dlq: number;
  average_latency_ms: number;
  consumers_active: number;
  subscriptions_active: number;
  uptime_seconds: number;
}

// ============================================================================
// QUERY OPTIONS
// ============================================================================

export interface EventQueryOptions {
  domain?: EventDomain;
  eventType?: string;
  correlationId?: string;
  aggregateId?: string;
  afterEventId?: string;
  limit?: number;
}
