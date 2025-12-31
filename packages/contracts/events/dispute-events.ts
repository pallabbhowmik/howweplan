/**
 * Dispute Events
 * Events related to dispute lifecycle
 * 
 * Constitution rules enforced:
 * - Rule 13: Subjective complaints are NOT refundable
 * - Rule 15: Disputes require admin arbitration
 */

import type { BaseEvent } from './base-event';
import type { DisputeState } from '../states/dispute-state';
import type { DisputeCategory, DisputeResolution } from '../entities/dispute';

/**
 * DisputeOpened Event Payload
 */
export interface DisputeOpenedPayload {
  readonly disputeId: string;
  readonly bookingId: string;
  readonly userId: string;
  readonly agentId: string;
  readonly category: DisputeCategory;
  /** Constitution rule 13: Flag subjective complaints early */
  readonly isSubjectiveComplaint: boolean;
  readonly title: string;
  readonly description: string;
  readonly requestedRefundAmount: number;
  readonly currency: string;
  readonly previousState: DisputeState | null;
  readonly newState: DisputeState;
  readonly openedAt: Date;
  readonly deadlineAt: Date;
}

export type DisputeOpenedEvent = BaseEvent<DisputeOpenedPayload>;

/**
 * DisputeEscalated Event Payload
 * Constitution rule 15: Escalated to admin arbitration
 */
export interface DisputeEscalatedPayload {
  readonly disputeId: string;
  readonly bookingId: string;
  readonly userId: string;
  readonly agentId: string;
  readonly assignedAdminId: string;
  readonly escalationReason: string;
  readonly previousState: DisputeState;
  readonly newState: DisputeState;
  readonly escalatedAt: Date;
}

export type DisputeEscalatedEvent = BaseEvent<DisputeEscalatedPayload>;

/**
 * DisputeResolved Event Payload
 * Constitution rule 13 & 15: Resolution by admin, subjective = no refund
 */
export interface DisputeResolvedPayload {
  readonly disputeId: string;
  readonly bookingId: string;
  readonly userId: string;
  readonly agentId: string;
  readonly resolution: DisputeResolution;
  readonly previousState: DisputeState;
  readonly newState: DisputeState;
  readonly resolvedAt: Date;
  /** Constitution rule 13: If subjective, no refund issued */
  readonly subjectiveComplaintDismissed: boolean;
  /** Refund amount (0 if subjective complaint) */
  readonly refundAmount: number;
}

export type DisputeResolvedEvent = BaseEvent<DisputeResolvedPayload>;
