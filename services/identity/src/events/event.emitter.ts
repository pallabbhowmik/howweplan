/**
 * Event emitter for publishing identity events to the event bus.
 * Per business rules: every state change MUST emit an audit event.
 */

import { nanoid } from 'nanoid';
import { env } from '../env.js';
import type { UserRole } from '../types/identity.types.js';
import type { IdentityEvent, IdentityEventBase } from './event.types.js';

// ─────────────────────────────────────────────────────────────────────────────
// EVENT CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Context for creating events.
 */
export interface EventContext {
  /** Correlation ID for distributed tracing */
  correlationId: string;
  /** Actor who triggered the event */
  actorId: string | null;
  /** Role of the actor */
  actorRole: UserRole | 'SYSTEM';
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT EMITTER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates the base event structure.
 */
function createEventBase(
  _eventType: string,
  context: EventContext
): Omit<IdentityEventBase, 'eventType'> {
  return {
    eventId: nanoid(),
    eventVersion: 1,
    occurredAt: new Date().toISOString(),
    source: 'identity',
    correlationId: context.correlationId,
    actorId: context.actorId,
    actorRole: context.actorRole,
  };
}

/**
 * In-memory event buffer for batch publishing.
 */
let eventBuffer: IdentityEvent[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

const FLUSH_INTERVAL_MS = 100;
const MAX_BUFFER_SIZE = 50;

/**
 * Publishes events to the event bus.
 */
async function publishEvents(events: IdentityEvent[]): Promise<void> {
  if (events.length === 0) return;

  try {
    const response = await fetch(env.EVENT_BUS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.EVENT_BUS_API_KEY}`,
        'X-Source-Service': env.SERVICE_NAME,
      },
      body: JSON.stringify({ events }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to publish events to event bus:', {
        status: response.status,
        error: errorText,
        eventCount: events.length,
      });
    }
  } catch (error) {
    // Log but don't throw - event publishing should not break the main flow
    console.error('Error publishing events to event bus:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      eventCount: events.length,
      eventTypes: events.map((e) => e.eventType),
    });
  }
}

/**
 * Flushes the event buffer.
 */
async function flushBuffer(): Promise<void> {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  const eventsToPublish = [...eventBuffer];
  eventBuffer = [];

  await publishEvents(eventsToPublish);
}

/**
 * Schedules a buffer flush.
 */
function scheduleFlush(): void {
  if (flushTimeout) return;

  flushTimeout = setTimeout(() => {
    flushBuffer().catch(console.error);
  }, FLUSH_INTERVAL_MS);
}

/**
 * Emits an event to the event bus.
 * Events are buffered and published in batches for efficiency.
 */
export async function emitEvent<T extends IdentityEvent>(
  eventType: T['eventType'],
  payload: T['payload'],
  context: EventContext
): Promise<void> {
  const event = {
    ...createEventBase(eventType, context),
    eventType,
    payload,
  } as T;

  // Log event in development
  if (env.NODE_ENV === 'development' && env.ENABLE_REQUEST_LOGGING) {
    console.log('Event emitted:', JSON.stringify(event, null, 2));
  }

  eventBuffer.push(event);

  // Flush immediately if buffer is full
  if (eventBuffer.length >= MAX_BUFFER_SIZE) {
    await flushBuffer();
  } else {
    scheduleFlush();
  }
}

/**
 * Immediately emits a single event without buffering.
 * Use for critical events that must be published immediately.
 */
export async function emitEventImmediate<T extends IdentityEvent>(
  eventType: T['eventType'],
  payload: T['payload'],
  context: EventContext
): Promise<void> {
  const event = {
    ...createEventBase(eventType, context),
    eventType,
    payload,
  } as T;

  // Log event in development
  if (env.NODE_ENV === 'development' && env.ENABLE_REQUEST_LOGGING) {
    console.log('Event emitted (immediate):', JSON.stringify(event, null, 2));
  }

  await publishEvents([event]);
}

/**
 * Flushes any pending events and shuts down the emitter.
 * Call this during graceful shutdown.
 */
export async function shutdownEventEmitter(): Promise<void> {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }
  await flushBuffer();
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT FACTORY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Factory functions for creating typed events.
 * These provide type safety and ensure correct event structure.
 */
export const EventFactory = {
  userRegistered: (
    payload: {
      userId: string;
      email: string;
      role: UserRole;
      firstName: string;
    },
    context: EventContext
  ) => emitEvent('identity.user.registered', payload, context),

  userLoggedIn: (
    payload: {
      userId: string;
      ipAddress: string;
      userAgent: string;
    },
    context: EventContext
  ) => emitEvent('identity.user.logged_in', payload, context),

  userLoggedOut: (payload: { userId: string }, context: EventContext) =>
    emitEvent('identity.user.logged_out', payload, context),

  loginFailed: (
    payload: {
      email: string;
      reason: 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' | 'ACCOUNT_SUSPENDED';
      ipAddress: string;
      attemptCount: number;
    },
    context: EventContext
  ) => emitEventImmediate('identity.user.login_failed', payload, context),

  passwordChanged: (
    payload: {
      userId: string;
      initiatedBy: 'USER' | 'ADMIN' | 'SYSTEM';
    },
    context: EventContext
  ) => emitEventImmediate('identity.user.password_changed', payload, context),

  tokenRefreshed: (payload: { userId: string }, context: EventContext) =>
    emitEvent('identity.user.token_refreshed', payload, context),

  accountStatusChanged: (
    payload: {
      userId: string;
      previousStatus: string;
      newStatus: string;
      reason: string;
      changedBy: { adminId: string; referenceId?: string } | null;
    },
    context: EventContext
  ) => emitEventImmediate('identity.account.status_changed', payload, context),

  accountSuspended: (
    payload: {
      userId: string;
      reason: string;
      suspendedBy: { adminId: string; referenceId?: string };
    },
    context: EventContext
  ) => emitEventImmediate('identity.account.suspended', payload, context),

  accountReactivated: (
    payload: {
      userId: string;
      reason: string;
      reactivatedBy: { adminId: string; referenceId?: string };
    },
    context: EventContext
  ) => emitEventImmediate('identity.account.reactivated', payload, context),

  accountDeactivated: (
    payload: {
      userId: string;
      reason: string;
      deactivatedBy: 'USER' | 'ADMIN';
      adminContext?: { adminId: string; referenceId?: string };
    },
    context: EventContext
  ) => emitEventImmediate('identity.account.deactivated', payload, context),

  accountLocked: (
    payload: {
      userId: string;
      reason: 'MAX_LOGIN_ATTEMPTS_EXCEEDED';
      lockExpiresAt: string;
    },
    context: EventContext
  ) => emitEventImmediate('identity.account.locked', payload, context),

  accountUnlocked: (
    payload: {
      userId: string;
      unlockedBy: 'SYSTEM' | 'ADMIN';
      adminContext?: { adminId: string; reason: string };
    },
    context: EventContext
  ) => emitEventImmediate('identity.account.unlocked', payload, context),

  profileUpdated: (
    payload: {
      userId: string;
      updatedFields: readonly string[];
    },
    context: EventContext
  ) => emitEvent('identity.profile.updated', payload, context),

  emailVerified: (
    payload: {
      userId: string;
      email: string;
    },
    context: EventContext
  ) => emitEvent('identity.email.verified', payload, context),

  agentVerificationSubmitted: (
    payload: {
      userId: string;
      documentType: string;
    },
    context: EventContext
  ) => emitEvent('identity.agent.verification_submitted', payload, context),

  agentVerificationApproved: (
    payload: {
      userId: string;
      approvedBy: { adminId: string; reason: string; referenceId?: string };
    },
    context: EventContext
  ) => emitEventImmediate('identity.agent.verification_approved', payload, context),

  agentVerificationRejected: (
    payload: {
      userId: string;
      rejectedBy: {
        adminId: string;
        reason: string;
        rejectionReason: string;
        referenceId?: string;
      };
    },
    context: EventContext
  ) => emitEventImmediate('identity.agent.verification_rejected', payload, context),

  agentVerificationRevoked: (
    payload: {
      userId: string;
      previousStatus: string;
      revokedBy: { adminId: string; reason: string; referenceId?: string };
    },
    context: EventContext
  ) => emitEventImmediate('identity.agent.verification_revoked', payload, context),

  adminActionPerformed: (
    payload: {
      adminId: string;
      action: string;
      targetUserId: string | null;
      reason: string;
      referenceId?: string;
      details: Record<string, unknown>;
    },
    context: EventContext
  ) => emitEventImmediate('identity.admin.action_performed', payload, context),
};
