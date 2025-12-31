/**
 * Refund State Machine
 *
 * Manages refund request lifecycle with strict enforcement.
 * SUBJECTIVE COMPLAINTS ARE NEVER REFUNDABLE.
 */

import { createMachine, assign } from 'xstate';
import {
  RefundReason,
  isRefundableReason,
  requiresAdminApproval,
} from '../types/payment.types.js';

/** Refund request states */
export const RefundState = {
  PENDING: 'PENDING',
  AWAITING_ADMIN: 'AWAITING_ADMIN',
  APPROVED: 'APPROVED',
  DENIED: 'DENIED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type RefundState = (typeof RefundState)[keyof typeof RefundState];

/** Context maintained by the refund machine */
export interface RefundMachineContext {
  readonly refundId: string;
  readonly bookingId: string;
  readonly paymentId: string;
  readonly requestedBy: string;
  readonly reason: RefundReason;
  readonly reasonDetails: string;
  readonly amountCents: number;
  readonly requiresAdminApproval: boolean;
  readonly approvedBy: string | null;
  readonly approvedAt: Date | null;
  readonly deniedBy: string | null;
  readonly deniedAt: Date | null;
  readonly denialReason: string | null;
  readonly processedAt: Date | null;
  readonly stripeRefundId: string | null;
  readonly failureReason: string | null;
  readonly version: number;
}

/** Events that can trigger refund state transitions */
export type RefundMachineEvent =
  | { type: 'SUBMIT' }
  | { type: 'AUTO_APPROVE' }
  | { type: 'ADMIN_APPROVE'; approvedBy: string }
  | { type: 'ADMIN_DENY'; deniedBy: string; reason: string }
  | { type: 'PROCESS' }
  | { type: 'COMPLETE'; stripeRefundId: string }
  | { type: 'FAIL'; reason: string };

/** Refund state machine definition */
export const refundMachine = createMachine({
  id: 'refund',
  initial: 'pending',
  types: {} as {
    context: RefundMachineContext;
    events: RefundMachineEvent;
  },
  context: {
    refundId: '',
    bookingId: '',
    paymentId: '',
    requestedBy: '',
    reason: RefundReason.AGENT_NO_SHOW,
    reasonDetails: '',
    amountCents: 0,
    requiresAdminApproval: false,
    approvedBy: null,
    approvedAt: null,
    deniedBy: null,
    deniedAt: null,
    denialReason: null,
    processedAt: null,
    stripeRefundId: null,
    failureReason: null,
    version: 0,
  },
  states: {
    pending: {
      always: [
        {
          target: 'awaitingAdmin',
          guard: ({ context }) => context.requiresAdminApproval,
        },
      ],
      on: {
        AUTO_APPROVE: {
          target: 'approved',
          guard: ({ context }) => !context.requiresAdminApproval,
          actions: assign({
            approvedBy: () => 'system',
            approvedAt: () => new Date(),
            version: ({ context }) => context.version + 1,
          }),
        },
      },
    },

    awaitingAdmin: {
      on: {
        ADMIN_APPROVE: {
          target: 'approved',
          actions: assign({
            approvedBy: ({ event }) => event.approvedBy,
            approvedAt: () => new Date(),
            version: ({ context }) => context.version + 1,
          }),
        },
        ADMIN_DENY: {
          target: 'denied',
          actions: assign({
            deniedBy: ({ event }) => event.deniedBy,
            deniedAt: () => new Date(),
            denialReason: ({ event }) => event.reason,
            version: ({ context }) => context.version + 1,
          }),
        },
      },
    },

    approved: {
      on: {
        PROCESS: {
          target: 'processing',
          actions: assign({
            version: ({ context }) => context.version + 1,
          }),
        },
      },
    },

    denied: {
      type: 'final',
    },

    processing: {
      on: {
        COMPLETE: {
          target: 'completed',
          actions: assign({
            processedAt: () => new Date(),
            stripeRefundId: ({ event }) => event.stripeRefundId,
            version: ({ context }) => context.version + 1,
          }),
        },
        FAIL: {
          target: 'failed',
          actions: assign({
            failureReason: ({ event }) => event.reason,
            version: ({ context }) => context.version + 1,
          }),
        },
      },
    },

    completed: {
      type: 'final',
    },

    failed: {
      on: {
        PROCESS: {
          target: 'processing',
          actions: assign({
            failureReason: () => null,
            version: ({ context }) => context.version + 1,
          }),
        },
      },
    },
  },
});

/** Initialize refund context with validation */
export function createRefundContext(params: {
  refundId: string;
  bookingId: string;
  paymentId: string;
  requestedBy: string;
  reason: RefundReason;
  reasonDetails: string;
  amountCents: number;
}): RefundMachineContext | { error: string } {
  // ENFORCE: Subjective complaints are NEVER refundable
  if (!isRefundableReason(params.reason)) {
    return {
      error: `Refund reason "${params.reason}" is not eligible for refund. Subjective complaints are not refundable.`,
    };
  }

  return {
    refundId: params.refundId,
    bookingId: params.bookingId,
    paymentId: params.paymentId,
    requestedBy: params.requestedBy,
    reason: params.reason,
    reasonDetails: params.reasonDetails,
    amountCents: params.amountCents,
    requiresAdminApproval: requiresAdminApproval(params.reason),
    approvedBy: null,
    approvedAt: null,
    deniedBy: null,
    deniedAt: null,
    denialReason: null,
    processedAt: null,
    stripeRefundId: null,
    failureReason: null,
    version: 0,
  };
}

/** Map XState state to RefundState enum */
export function mapToRefundState(stateValue: string): RefundState {
  const stateMap: Record<string, RefundState> = {
    pending: RefundState.PENDING,
    awaitingAdmin: RefundState.AWAITING_ADMIN,
    approved: RefundState.APPROVED,
    denied: RefundState.DENIED,
    processing: RefundState.PROCESSING,
    completed: RefundState.COMPLETED,
    failed: RefundState.FAILED,
  };

  const state = stateMap[stateValue];
  if (!state) {
    throw new Error(`Unknown refund state value: ${stateValue}`);
  }
  return state;
}

/** Calculate refund amount based on reason and timing */
export function calculateRefundAmount(params: {
  reason: RefundReason;
  totalAmountCents: number;
  bookingFeeCents: number;
  agentConfirmed: boolean;
}): { amountCents: number; isPartial: boolean } {
  const { reason, totalAmountCents, bookingFeeCents, agentConfirmed } = params;

  switch (reason) {
    // Full refund cases (including booking fee)
    case RefundReason.AGENT_NO_SHOW:
    case RefundReason.SERVICE_NOT_DELIVERED:
    case RefundReason.AGENT_CANCELLED:
    case RefundReason.DUPLICATE_CHARGE:
      return { amountCents: totalAmountCents, isPartial: false };

    // User cancellation before agent confirmation - full refund minus booking fee
    case RefundReason.USER_CANCELLED_BEFORE_CONFIRM:
      return {
        amountCents: totalAmountCents - bookingFeeCents,
        isPartial: true,
      };

    // User cancellation after agent confirmation - partial refund (50%)
    case RefundReason.USER_CANCELLED_AFTER_CONFIRM:
      if (!agentConfirmed) {
        return {
          amountCents: totalAmountCents - bookingFeeCents,
          isPartial: true,
        };
      }
      return {
        amountCents: Math.floor((totalAmountCents - bookingFeeCents) * 0.5),
        isPartial: true,
      };

    // Admin-determined amounts
    case RefundReason.VERIFIED_QUALITY_ISSUE:
    case RefundReason.ADMIN_OVERRIDE:
      // Amount should be specified by admin, default to full
      return { amountCents: totalAmountCents, isPartial: false };

    default:
      // Should never reach here due to validation, but be safe
      return { amountCents: 0, isPartial: false };
  }
}

export type RefundMachine = typeof refundMachine;
