/**
 * Booking State Machine
 *
 * Defines the complete booking lifecycle with enforced transitions.
 * Every state change emits an audit event.
 */

import { createMachine, assign } from 'xstate';
import {
  BookingState,
  CancellationReason,
  isValidBookingTransition,
} from '../types/booking.types.js';
import { PaymentState } from '../types/payment.types.js';

/** Context maintained by the booking machine */
export interface BookingMachineContext {
  readonly bookingId: string;
  readonly userId: string;
  readonly agentId: string;
  readonly itineraryId: string;
  readonly paymentState: PaymentState;
  readonly cancellationReason: CancellationReason | null;
  readonly cancelledBy: string | null;
  readonly agentConfirmedAt: Date | null;
  readonly tripStartedAt: Date | null;
  readonly tripCompletedAt: Date | null;
  readonly settledAt: Date | null;
  readonly disputeId: string | null;
  readonly errorMessage: string | null;
  readonly version: number;
}

/** Events that can trigger state transitions */
export type BookingMachineEvent =
  | { type: 'INITIATE_PAYMENT' }
  | { type: 'PAYMENT_PROCESSING' }
  | { type: 'PAYMENT_CONFIRMED'; paymentIntentId: string }
  | { type: 'PAYMENT_FAILED'; error: string }
  | { type: 'AGENT_CONFIRM' }
  | { type: 'AGENT_DECLINE'; reason: string }
  | { type: 'START_TRIP' }
  | { type: 'COMPLETE_TRIP' }
  | { type: 'SETTLE' }
  | { type: 'CANCEL'; reason: CancellationReason; cancelledBy: string }
  | { type: 'OPEN_DISPUTE'; disputeId: string }
  | { type: 'RESOLVE_DISPUTE'; outcome: 'won' | 'lost' }
  | { type: 'EXPIRE' };

/** State machine definition */
export const bookingMachine = createMachine({
  id: 'booking',
  initial: 'pendingPayment',
  types: {} as {
    context: BookingMachineContext;
    events: BookingMachineEvent;
  },
  context: {
    bookingId: '',
    userId: '',
    agentId: '',
    itineraryId: '',
    paymentState: PaymentState.NOT_STARTED,
    cancellationReason: null,
    cancelledBy: null,
    agentConfirmedAt: null,
    tripStartedAt: null,
    tripCompletedAt: null,
    settledAt: null,
    disputeId: null,
    errorMessage: null,
    version: 0,
  },
  states: {
    pendingPayment: {
      on: {
        INITIATE_PAYMENT: {
          target: 'paymentProcessing',
          actions: assign({
            paymentState: () => PaymentState.INITIATED,
            version: ({ context }) => context.version + 1,
          }),
        },
        CANCEL: {
          target: 'cancelled',
          actions: assign({
            cancellationReason: ({ event }) => event.reason,
            cancelledBy: ({ event }) => event.cancelledBy,
            version: ({ context }) => context.version + 1,
          }),
        },
        EXPIRE: {
          target: 'cancelled',
          actions: assign({
            cancellationReason: () => CancellationReason.EXPIRED,
            cancelledBy: () => 'system',
            version: ({ context }) => context.version + 1,
          }),
        },
      },
    },

    paymentProcessing: {
      on: {
        PAYMENT_CONFIRMED: {
          target: 'paymentConfirmed',
          actions: assign({
            paymentState: () => PaymentState.SUCCEEDED,
            version: ({ context }) => context.version + 1,
          }),
        },
        PAYMENT_FAILED: {
          target: 'pendingPayment',
          actions: assign({
            paymentState: () => PaymentState.FAILED,
            errorMessage: ({ event }) => event.error,
            version: ({ context }) => context.version + 1,
          }),
        },
        CANCEL: {
          target: 'cancelled',
          actions: assign({
            cancellationReason: ({ event }) => event.reason,
            cancelledBy: ({ event }) => event.cancelledBy,
            version: ({ context }) => context.version + 1,
          }),
        },
      },
    },

    paymentConfirmed: {
      on: {
        AGENT_CONFIRM: {
          target: 'agentConfirmed',
          actions: assign({
            agentConfirmedAt: () => new Date(),
            paymentState: () => PaymentState.IN_ESCROW,
            version: ({ context }) => context.version + 1,
          }),
        },
        AGENT_DECLINE: {
          target: 'cancelled',
          actions: assign({
            cancellationReason: () => CancellationReason.AGENT_DECLINED,
            cancelledBy: ({ context }) => context.agentId,
            paymentState: () => PaymentState.REFUND_REQUESTED,
            version: ({ context }) => context.version + 1,
          }),
        },
        CANCEL: {
          target: 'cancelled',
          actions: assign({
            cancellationReason: ({ event }) => event.reason,
            cancelledBy: ({ event }) => event.cancelledBy,
            paymentState: () => PaymentState.REFUND_REQUESTED,
            version: ({ context }) => context.version + 1,
          }),
        },
      },
    },

    agentConfirmed: {
      on: {
        START_TRIP: {
          target: 'inProgress',
          actions: assign({
            tripStartedAt: () => new Date(),
            version: ({ context }) => context.version + 1,
          }),
        },
        CANCEL: {
          target: 'cancelled',
          actions: assign({
            cancellationReason: ({ event }) => event.reason,
            cancelledBy: ({ event }) => event.cancelledBy,
            version: ({ context }) => context.version + 1,
          }),
        },
        OPEN_DISPUTE: {
          target: 'disputed',
          actions: assign({
            disputeId: ({ event }) => event.disputeId,
            version: ({ context }) => context.version + 1,
          }),
        },
      },
    },

    inProgress: {
      on: {
        COMPLETE_TRIP: {
          target: 'completed',
          actions: assign({
            tripCompletedAt: () => new Date(),
            version: ({ context }) => context.version + 1,
          }),
        },
        OPEN_DISPUTE: {
          target: 'disputed',
          actions: assign({
            disputeId: ({ event }) => event.disputeId,
            version: ({ context }) => context.version + 1,
          }),
        },
      },
    },

    completed: {
      on: {
        SETTLE: {
          target: 'settled',
          actions: assign({
            settledAt: () => new Date(),
            paymentState: () => PaymentState.RELEASED,
            version: ({ context }) => context.version + 1,
          }),
        },
        OPEN_DISPUTE: {
          target: 'disputed',
          actions: assign({
            disputeId: ({ event }) => event.disputeId,
            version: ({ context }) => context.version + 1,
          }),
        },
      },
    },

    settled: {
      type: 'final',
      on: {
        OPEN_DISPUTE: {
          target: 'disputed',
          actions: assign({
            disputeId: ({ event }) => event.disputeId,
            version: ({ context }) => context.version + 1,
          }),
        },
      },
    },

    cancelled: {
      type: 'final',
    },

    disputed: {
      on: {
        RESOLVE_DISPUTE: {
          target: 'disputeResolved',
          actions: assign({
            version: ({ context }) => context.version + 1,
          }),
        },
      },
    },

    disputeResolved: {
      on: {
        SETTLE: {
          target: 'settled',
          actions: assign({
            settledAt: () => new Date(),
            paymentState: () => 'RELEASED' as PaymentState,
            version: ({ context }) => context.version + 1,
          }),
        },
      },
    },
  },
});

/** Map XState state to BookingState enum */
export function mapToBookingState(stateValue: string): BookingState {
  const stateMap: Record<string, BookingState> = {
    pendingPayment: BookingState.PENDING_PAYMENT,
    paymentProcessing: BookingState.PAYMENT_PROCESSING,
    paymentConfirmed: BookingState.PAYMENT_CONFIRMED,
    agentConfirmed: BookingState.AGENT_CONFIRMED,
    inProgress: BookingState.IN_PROGRESS,
    completed: BookingState.COMPLETED,
    settled: BookingState.SETTLED,
    cancelled: BookingState.CANCELLED,
    disputed: BookingState.DISPUTED,
    disputeResolved: BookingState.DISPUTE_RESOLVED,
  };

  const state = stateMap[stateValue];
  if (!state) {
    throw new Error(`Unknown state value: ${stateValue}`);
  }
  return state;
}

/** Validate that a transition is allowed */
export function validateBookingTransition(
  currentState: BookingState,
  targetState: BookingState
): { valid: boolean; error?: string } {
  if (!isValidBookingTransition(currentState, targetState)) {
    return {
      valid: false,
      error: `Invalid transition from ${currentState} to ${targetState}`,
    };
  }
  return { valid: true };
}

export type BookingMachine = typeof bookingMachine;
