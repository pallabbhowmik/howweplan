/**
 * Schema Registry
 * 
 * Central place to:
 * - Store event schemas
 * - Validate events against schemas
 * - Manage schema versions
 * - Prevent breaking changes
 * 
 * Rules:
 * - Never break existing consumers
 * - Only add optional fields
 * - Version schemas explicitly
 */

import { z, ZodSchema } from 'zod';
import { EventType, EventTypes, EventEnvelope } from '../types/event.types';
import { logger } from '../utils/logger';

// ============================================================================
// PAYLOAD SCHEMAS BY EVENT TYPE
// ============================================================================

/**
 * Request domain payload schemas
 */
const RequestPayloadSchemas = {
  'requests.REQUEST_CREATED': z.object({
    request_id: z.string().uuid(),
    user_id: z.string().uuid(),
    destination: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    traveler_count: z.number().int().positive().optional(),
    budget_min: z.number().optional(),
    budget_max: z.number().optional(),
    preferences: z.record(z.unknown()).optional(),
  }),
  
  'requests.REQUEST_SUBMITTED': z.object({
    request_id: z.string().uuid(),
    user_id: z.string().uuid(),
    submitted_at: z.string().datetime(),
  }),
  
  'requests.REQUEST_UPDATED': z.object({
    request_id: z.string().uuid(),
    user_id: z.string().uuid(),
    changes: z.record(z.unknown()),
    previous_values: z.record(z.unknown()).optional(),
  }),
  
  'requests.REQUEST_CANCELLED': z.object({
    request_id: z.string().uuid(),
    user_id: z.string().uuid(),
    reason: z.string().optional(),
    cancelled_at: z.string().datetime(),
  }),
  
  'requests.REQUEST_EXPIRED': z.object({
    request_id: z.string().uuid(),
    expired_at: z.string().datetime(),
  }),
  
  'requests.REQUEST_STATE_CHANGED': z.object({
    request_id: z.string().uuid(),
    previous_state: z.string(),
    new_state: z.string(),
    changed_at: z.string().datetime(),
  }),
};

/**
 * Itinerary domain payload schemas
 */
const ItineraryPayloadSchemas = {
  'itineraries.ITINERARY_CREATED': z.object({
    itinerary_id: z.string().uuid(),
    request_id: z.string().uuid(),
    agent_id: z.string().uuid(),
    created_at: z.string().datetime(),
  }),
  
  'itineraries.ITINERARY_SUBMITTED': z.object({
    itinerary_id: z.string().uuid(),
    request_id: z.string().uuid(),
    agent_id: z.string().uuid(),
    submitted_at: z.string().datetime(),
    price_cents: z.number().int().nonnegative().optional(),
  }),
  
  'itineraries.ITINERARY_UPDATED': z.object({
    itinerary_id: z.string().uuid(),
    agent_id: z.string().uuid(),
    changes: z.record(z.unknown()),
  }),
  
  'itineraries.ITINERARY_ACCEPTED': z.object({
    itinerary_id: z.string().uuid(),
    request_id: z.string().uuid(),
    user_id: z.string().uuid(),
    accepted_at: z.string().datetime(),
  }),
  
  'itineraries.ITINERARY_REJECTED': z.object({
    itinerary_id: z.string().uuid(),
    request_id: z.string().uuid(),
    user_id: z.string().uuid(),
    reason: z.string().optional(),
    rejected_at: z.string().datetime(),
  }),
  
  'itineraries.ITINERARY_FINALIZED': z.object({
    itinerary_id: z.string().uuid(),
    request_id: z.string().uuid(),
    finalized_at: z.string().datetime(),
  }),
};

/**
 * Matching domain payload schemas
 */
const MatchingPayloadSchemas = {
  'matching.AGENTS_MATCHED': z.object({
    request_id: z.string().uuid(),
    agent_ids: z.array(z.string().uuid()),
    matched_at: z.string().datetime(),
  }),
  
  'matching.AGENT_ASSIGNED': z.object({
    request_id: z.string().uuid(),
    agent_id: z.string().uuid(),
    assigned_at: z.string().datetime(),
  }),
  
  'matching.AGENT_UNASSIGNED': z.object({
    request_id: z.string().uuid(),
    agent_id: z.string().uuid(),
    reason: z.string().optional(),
    unassigned_at: z.string().datetime(),
  }),
  
  'matching.MATCH_EXPIRED': z.object({
    request_id: z.string().uuid(),
    expired_at: z.string().datetime(),
  }),
};

/**
 * Booking domain payload schemas
 */
const BookingPayloadSchemas = {
  'bookings.BOOKING_CREATED': z.object({
    booking_id: z.string().uuid(),
    request_id: z.string().uuid(),
    itinerary_id: z.string().uuid(),
    user_id: z.string().uuid(),
    agent_id: z.string().uuid(),
    total_cents: z.number().int().nonnegative(),
    created_at: z.string().datetime(),
  }),
  
  'bookings.BOOKING_CONFIRMED': z.object({
    booking_id: z.string().uuid(),
    confirmed_at: z.string().datetime(),
  }),
  
  'bookings.BOOKING_CANCELLED': z.object({
    booking_id: z.string().uuid(),
    cancelled_by: z.string().uuid(),
    cancelled_by_type: z.enum(['user', 'agent', 'admin', 'system']),
    reason: z.string().optional(),
    cancelled_at: z.string().datetime(),
  }),
  
  'bookings.BOOKING_COMPLETED': z.object({
    booking_id: z.string().uuid(),
    completed_at: z.string().datetime(),
  }),
  
  'bookings.BOOKING_STATE_CHANGED': z.object({
    booking_id: z.string().uuid(),
    previous_state: z.string(),
    new_state: z.string(),
    changed_at: z.string().datetime(),
  }),
};

/**
 * Payment domain payload schemas
 */
const PaymentPayloadSchemas = {
  'payments.PAYMENT_INITIATED': z.object({
    payment_id: z.string().uuid(),
    booking_id: z.string().uuid(),
    amount_cents: z.number().int().positive(),
    currency: z.string().default('INR'),
    initiated_at: z.string().datetime(),
  }),
  
  'payments.PAYMENT_PROCESSING': z.object({
    payment_id: z.string().uuid(),
    booking_id: z.string().uuid(),
    provider_reference: z.string().optional(),
  }),
  
  'payments.PAYMENT_CAPTURED': z.object({
    payment_id: z.string().uuid(),
    booking_id: z.string().uuid(),
    amount_cents: z.number().int().positive(),
    provider_reference: z.string(),
    captured_at: z.string().datetime(),
  }),
  
  'payments.PAYMENT_FAILED': z.object({
    payment_id: z.string().uuid(),
    booking_id: z.string().uuid(),
    error_code: z.string().optional(),
    error_message: z.string().optional(),
    failed_at: z.string().datetime(),
  }),
  
  'payments.PAYMENT_REFUNDED': z.object({
    payment_id: z.string().uuid(),
    booking_id: z.string().uuid(),
    refund_amount_cents: z.number().int().positive(),
    reason: z.string(),
    refunded_at: z.string().datetime(),
  }),
  
  'payments.ESCROW_RELEASED': z.object({
    payment_id: z.string().uuid(),
    booking_id: z.string().uuid(),
    agent_id: z.string().uuid(),
    amount_cents: z.number().int().positive(),
    released_at: z.string().datetime(),
  }),
};

/**
 * Messaging domain payload schemas
 */
const MessagingPayloadSchemas = {
  'messaging.MESSAGE_SENT': z.object({
    message_id: z.string().uuid(),
    conversation_id: z.string().uuid(),
    sender_id: z.string().uuid(),
    sender_type: z.enum(['user', 'agent', 'system']),
    content_preview: z.string().max(100).optional(), // Truncated for privacy
    sent_at: z.string().datetime(),
  }),
  
  'messaging.MESSAGE_READ': z.object({
    message_id: z.string().uuid(),
    conversation_id: z.string().uuid(),
    reader_id: z.string().uuid(),
    read_at: z.string().datetime(),
  }),
  
  'messaging.CONVERSATION_CREATED': z.object({
    conversation_id: z.string().uuid(),
    request_id: z.string().uuid().optional(),
    participants: z.array(z.object({
      user_id: z.string().uuid(),
      role: z.enum(['user', 'agent']),
    })),
    created_at: z.string().datetime(),
  }),
};

/**
 * Dispute domain payload schemas
 */
const DisputePayloadSchemas = {
  'disputes.DISPUTE_OPENED': z.object({
    dispute_id: z.string().uuid(),
    booking_id: z.string().uuid(),
    opened_by: z.string().uuid(),
    opened_by_type: z.enum(['user', 'agent']),
    category: z.string(),
    opened_at: z.string().datetime(),
  }),
  
  'disputes.DISPUTE_ESCALATED': z.object({
    dispute_id: z.string().uuid(),
    escalated_at: z.string().datetime(),
    escalated_to: z.enum(['admin', 'senior_admin']),
  }),
  
  'disputes.DISPUTE_RESOLVED': z.object({
    dispute_id: z.string().uuid(),
    resolution: z.string(),
    resolved_by: z.string().uuid(),
    resolved_by_type: z.enum(['admin', 'system']),
    resolved_at: z.string().datetime(),
  }),
  
  'disputes.EVIDENCE_SUBMITTED': z.object({
    dispute_id: z.string().uuid(),
    evidence_id: z.string().uuid(),
    submitted_by: z.string().uuid(),
    evidence_type: z.string(),
    submitted_at: z.string().datetime(),
  }),
};

/**
 * Review domain payload schemas
 */
const ReviewPayloadSchemas = {
  'reviews.REVIEW_SUBMITTED': z.object({
    review_id: z.string().uuid(),
    booking_id: z.string().uuid(),
    reviewer_id: z.string().uuid(),
    reviewee_id: z.string().uuid(),
    rating: z.number().min(1).max(5),
    submitted_at: z.string().datetime(),
  }),
  
  'reviews.REVIEW_PUBLISHED': z.object({
    review_id: z.string().uuid(),
    published_at: z.string().datetime(),
  }),
  
  'reviews.REVIEW_FLAGGED': z.object({
    review_id: z.string().uuid(),
    flagged_by: z.string().uuid(),
    reason: z.string(),
    flagged_at: z.string().datetime(),
  }),
};

/**
 * Identity domain payload schemas
 */
const IdentityPayloadSchemas = {
  'identity.USER_REGISTERED': z.object({
    user_id: z.string().uuid(),
    email_domain: z.string().optional(), // Only domain, not full email
    registered_at: z.string().datetime(),
  }),
  
  'identity.USER_VERIFIED': z.object({
    user_id: z.string().uuid(),
    verification_type: z.string(),
    verified_at: z.string().datetime(),
  }),
  
  'identity.AGENT_ONBOARDED': z.object({
    agent_id: z.string().uuid(),
    onboarded_at: z.string().datetime(),
  }),
  
  'identity.PROFILE_UPDATED': z.object({
    user_id: z.string().uuid(),
    updated_fields: z.array(z.string()),
    updated_at: z.string().datetime(),
  }),
};

/**
 * Audit domain payload schemas
 */
const AuditPayloadSchemas = {
  'audit.ADMIN_ACTION': z.object({
    admin_id: z.string().uuid(),
    action: z.string(),
    target_type: z.string(),
    target_id: z.string(),
    reason: z.string(),
    performed_at: z.string().datetime(),
  }),
  
  'audit.SECURITY_EVENT': z.object({
    event_type: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    details: z.record(z.unknown()),
    occurred_at: z.string().datetime(),
  }),
};

/**
 * Notification domain payload schemas
 */
const NotificationPayloadSchemas = {
  'notifications.NOTIFICATION_SENT': z.object({
    notification_id: z.string().uuid(),
    user_id: z.string().uuid(),
    channel: z.enum(['email', 'push', 'sms', 'in_app']),
    template: z.string(),
    sent_at: z.string().datetime(),
  }),
  
  'notifications.NOTIFICATION_FAILED': z.object({
    notification_id: z.string().uuid(),
    user_id: z.string().uuid(),
    channel: z.enum(['email', 'push', 'sms', 'in_app']),
    error: z.string(),
    failed_at: z.string().datetime(),
  }),
};

// ============================================================================
// COMBINED SCHEMA REGISTRY
// ============================================================================

type PayloadSchemaMap = {
  [K in EventType]?: ZodSchema;
};

const PayloadSchemas: PayloadSchemaMap = {
  ...RequestPayloadSchemas,
  ...ItineraryPayloadSchemas,
  ...MatchingPayloadSchemas,
  ...BookingPayloadSchemas,
  ...PaymentPayloadSchemas,
  ...MessagingPayloadSchemas,
  ...DisputePayloadSchemas,
  ...ReviewPayloadSchemas,
  ...IdentityPayloadSchemas,
  ...AuditPayloadSchemas,
  ...NotificationPayloadSchemas,
};

// ============================================================================
// SCHEMA REGISTRY CLASS
// ============================================================================

export class SchemaRegistry {
  private schemas: Map<string, { version: number; schema: ZodSchema }[]> = new Map();
  
  constructor() {
    // Register all known schemas
    for (const [eventType, schema] of Object.entries(PayloadSchemas)) {
      this.registerSchema(eventType as EventType, 1, schema);
    }
  }

  /**
   * Register a new schema version
   */
  registerSchema(eventType: EventType, version: number, schema: ZodSchema): void {
    if (!this.schemas.has(eventType)) {
      this.schemas.set(eventType, []);
    }
    
    const versions = this.schemas.get(eventType)!;
    const existing = versions.find(v => v.version === version);
    
    if (existing) {
      logger.warn('Schema version already registered', { eventType, version });
      return;
    }
    
    versions.push({ version, schema });
    versions.sort((a, b) => b.version - a.version); // Latest first
    
    logger.debug('Schema registered', { eventType, version });
  }

  /**
   * Validate an event's payload against its schema
   */
  validate(event: { event_type: string; event_version?: number; payload: unknown }): {
    valid: boolean;
    errors?: string[];
  } {
    const eventType = event.event_type;
    const version = event.event_version || 1;
    
    // Check if event type is known (nested structure)
    const allEventTypes = Object.values(EventTypes).flatMap(
      domain => Object.values(domain)
    ) as string[];
    if (!allEventTypes.includes(eventType)) {
      return {
        valid: false,
        errors: [`Unknown event type: ${eventType}`],
      };
    }
    
    const versions = this.schemas.get(eventType as EventType);
    if (!versions || versions.length === 0) {
      // No schema registered - allow but warn
      logger.warn('No schema registered for event type', { eventType });
      return { valid: true };
    }
    
    // Find matching or latest compatible version
    let schema = versions.find(v => v.version === version)?.schema;
    if (!schema) {
      // Use latest version (forward compatibility)
      schema = versions[0].schema;
    }
    
    const result = schema.safeParse(event.payload);
    
    if (!result.success) {
      const errors = result.error.issues.map(
        issue => `${issue.path.join('.')}: ${issue.message}`
      );
      return { valid: false, errors };
    }
    
    return { valid: true };
  }

  /**
   * Get schema for an event type
   */
  getSchema(eventType: EventType, version?: number): ZodSchema | null {
    const versions = this.schemas.get(eventType);
    if (!versions || versions.length === 0) return null;
    
    if (version) {
      return versions.find(v => v.version === version)?.schema || null;
    }
    
    return versions[0].schema; // Latest
  }

  /**
   * List all registered event types
   */
  listEventTypes(): EventType[] {
    return Array.from(this.schemas.keys()) as EventType[];
  }

  /**
   * Get schema versions for an event type
   */
  getVersions(eventType: EventType): number[] {
    const versions = this.schemas.get(eventType);
    if (!versions) return [];
    return versions.map(v => v.version);
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let schemaRegistryInstance: SchemaRegistry | null = null;

export function getSchemaRegistry(): SchemaRegistry {
  if (!schemaRegistryInstance) {
    schemaRegistryInstance = new SchemaRegistry();
  }
  return schemaRegistryInstance;
}
