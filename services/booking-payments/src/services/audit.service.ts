/**
 * Audit Service
 *
 * Records all money movements and state changes.
 * EVERY state change MUST emit an audit event.
 * Audit logs are retained for 7 years (compliance).
 */

import { v4 as uuid } from 'uuid';
import { config } from '../env.js';
import { logger } from './logger.service.js';
import { eventPublisher } from '../events/publisher.js';
import type { AuditEvent, EventMetadata } from '../types/events.types.js';

/** Types of money movements tracked */
export type MoneyMovementType =
  | 'charge'
  | 'escrow_hold'
  | 'escrow_release'
  | 'refund'
  | 'commission'
  | 'payout';

/** Audit entry for database storage */
export interface AuditEntry {
  readonly id: string;
  readonly timestamp: Date;
  readonly eventType: string;
  readonly bookingId: string;
  readonly paymentId: string | null;
  readonly userId: string | null;
  readonly agentId: string | null;
  readonly actorId: string;
  readonly actorType: 'user' | 'agent' | 'admin' | 'system';
  readonly action: string;
  readonly previousState: string | null;
  readonly newState: string | null;
  readonly amountCents: number | null;
  readonly metadata: Record<string, unknown>;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly reason: string | null;
}

/** Audit service for recording all significant events */
class AuditService {
  private readonly enabled: boolean;

  constructor() {
    this.enabled = config.audit.enabled;
  }

  /**
   * Record a money movement audit event.
   * This is called for ALL financial transactions.
   */
  async recordMoneyMovement(params: {
    bookingId: string;
    paymentId: string;
    movementType: MoneyMovementType;
    amountCents: number;
    fromAccount: string;
    toAccount: string;
    stripeTransactionId: string;
    metadata: EventMetadata;
  }): Promise<void> {
    if (!this.enabled) {
      logger.debug('Audit logging disabled, skipping money movement record');
      return;
    }

    const event: AuditEvent = {
      eventId: uuid(),
      eventType: 'audit.money_movement',
      timestamp: new Date().toISOString(),
      version: '1.0',
      source: 'booking-payments',
      correlationId: uuid(),
      payload: {
        bookingId: params.bookingId,
        paymentId: params.paymentId,
        movementType: params.movementType,
        amountCents: params.amountCents,
        fromAccount: params.fromAccount,
        toAccount: params.toAccount,
        stripeTransactionId: params.stripeTransactionId,
      },
      metadata: params.metadata,
    };

    // Log locally
    logger.info(
      {
        auditEvent: event.eventType,
        bookingId: params.bookingId,
        paymentId: params.paymentId,
        movementType: params.movementType,
        amountCents: params.amountCents,
      },
      'Money movement recorded'
    );

    // Publish to event bus
    await eventPublisher.publish(event);
  }

  /**
   * Record a state change audit entry.
   * Called whenever booking, payment, or refund state changes.
   */
  async recordStateChange(params: {
    bookingId: string;
    paymentId?: string;
    entityType: 'booking' | 'payment' | 'refund';
    previousState: string;
    newState: string;
    metadata: EventMetadata;
  }): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const entry: AuditEntry = {
      id: uuid(),
      timestamp: new Date(),
      eventType: `${params.entityType}.state_changed`,
      bookingId: params.bookingId,
      paymentId: params.paymentId ?? null,
      userId: null,
      agentId: null,
      actorId: params.metadata.actorId,
      actorType: params.metadata.actorType,
      action: 'state_change',
      previousState: params.previousState,
      newState: params.newState,
      amountCents: null,
      metadata: {},
      ipAddress: params.metadata.ipAddress ?? null,
      userAgent: params.metadata.userAgent ?? null,
      reason: params.metadata.reason ?? null,
    };

    logger.info(
      {
        auditEntry: entry.eventType,
        bookingId: params.bookingId,
        entityType: params.entityType,
        previousState: params.previousState,
        newState: params.newState,
        actorId: params.metadata.actorId,
      },
      'State change recorded'
    );

    // In production, this would persist to database
    // For now, just emit the event
    await eventPublisher.publish({
      eventId: entry.id,
      eventType: `${params.entityType}.state_changed` as 'booking.state_changed',
      timestamp: entry.timestamp.toISOString(),
      version: '1.0',
      source: 'booking-payments',
      correlationId: uuid(),
      payload: {
        bookingId: params.bookingId,
        previousState: params.previousState as never,
        newState: params.newState as never,
      },
      metadata: params.metadata,
    });
  }

  /**
   * Record an admin action.
   * ALL admin actions require a reason and are logged.
   */
  async recordAdminAction(params: {
    adminId: string;
    action: string;
    bookingId: string;
    reason: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    if (!this.enabled) {
      return;
    }

    // Admin actions MUST have a reason
    if (!params.reason || params.reason.trim().length === 0) {
      throw new Error('Admin actions require a reason');
    }

    const entry: AuditEntry = {
      id: uuid(),
      timestamp: new Date(),
      eventType: 'admin.action',
      bookingId: params.bookingId,
      paymentId: null,
      userId: null,
      agentId: null,
      actorId: params.adminId,
      actorType: 'admin',
      action: params.action,
      previousState: null,
      newState: null,
      amountCents: null,
      metadata: params.metadata ?? {},
      ipAddress: null,
      userAgent: null,
      reason: params.reason,
    };

    logger.info(
      {
        auditEntry: entry.eventType,
        adminId: params.adminId,
        action: params.action,
        bookingId: params.bookingId,
        reason: params.reason,
      },
      'Admin action recorded'
    );
  }

  /**
   * Record a refund decision.
   */
  async recordRefundDecision(params: {
    refundId: string;
    bookingId: string;
    decision: 'approved' | 'denied';
    decidedBy: string;
    reason: string;
    amountCents?: number;
    metadata: EventMetadata;
  }): Promise<void> {
    if (!this.enabled) {
      return;
    }

    logger.info(
      {
        auditEntry: 'refund.decision',
        refundId: params.refundId,
        bookingId: params.bookingId,
        decision: params.decision,
        decidedBy: params.decidedBy,
        amountCents: params.amountCents,
      },
      `Refund ${params.decision}`
    );
  }
}

export const auditService = new AuditService();
