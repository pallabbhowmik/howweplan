/**
 * Payment State Machine
 *
 * Manages payment lifecycle including escrow and refund states.
 * All money movements are tracked and audited.
 */

import { createMachine, assign } from 'xstate';
import { PaymentState, isValidPaymentTransition } from '../types/payment.types.js';

/** Context maintained by the payment machine */
export interface PaymentMachineContext {
  readonly paymentId: string;
  readonly bookingId: string;
  readonly amountCents: number;
  readonly bookingFeeCents: number;
  readonly platformCommissionCents: number;
  readonly stripeFeesCents: number;
  readonly refundedAmountCents: number;
  readonly stripePaymentIntentId: string | null;
  readonly stripeCheckoutSessionId: string | null;
  readonly stripeChargeId: string | null;
  readonly stripeRefundId: string | null;
  readonly escrowStartedAt: Date | null;
  readonly escrowReleaseAt: Date | null;
  readonly escrowReleasedAt: Date | null;
  readonly failureCode: string | null;
  readonly failureMessage: string | null;
  readonly idempotencyKey: string;
  readonly version: number;
}

/** Events that can trigger payment state transitions */
export type PaymentMachineEvent =
  | { type: 'CREATE_CHECKOUT'; sessionId: string }
  | { type: 'CHECKOUT_COMPLETED'; paymentIntentId: string }
  | { type: 'PAYMENT_SUCCEEDED'; chargeId: string }
  | { type: 'PAYMENT_FAILED'; failureCode: string; failureMessage: string }
  | { type: 'START_ESCROW'; releaseDate: Date }
  | { type: 'RELEASE_ESCROW' }
  | { type: 'REQUEST_REFUND' }
  | { type: 'APPROVE_REFUND' }
  | { type: 'DENY_REFUND' }
  | { type: 'PROCESS_FULL_REFUND'; refundId: string }
  | { type: 'PROCESS_PARTIAL_REFUND'; refundId: string; amountCents: number }
  | { type: 'RETRY_PAYMENT' };

/** Payment state machine definition */
export const paymentMachine = createMachine({
  id: 'payment',
  initial: 'notStarted',
  types: {} as {
    context: PaymentMachineContext;
    events: PaymentMachineEvent;
  },
  context: {
    paymentId: '',
    bookingId: '',
    amountCents: 0,
    bookingFeeCents: 0,
    platformCommissionCents: 0,
    stripeFeesCents: 0,
    refundedAmountCents: 0,
    stripePaymentIntentId: null,
    stripeCheckoutSessionId: null,
    stripeChargeId: null,
    stripeRefundId: null,
    escrowStartedAt: null,
    escrowReleaseAt: null,
    escrowReleasedAt: null,
    failureCode: null,
    failureMessage: null,
    idempotencyKey: '',
    version: 0,
  },
  states: {
    notStarted: {
      on: {
        CREATE_CHECKOUT: {
          target: 'initiated',
          actions: assign({
            stripeCheckoutSessionId: ({ event }) => event.sessionId,
            version: ({ context }) => context.version + 1,
          }),
        },
      },
    },

    initiated: {
      on: {
        CHECKOUT_COMPLETED: {
          target: 'processing',
          actions: assign({
            stripePaymentIntentId: ({ event }) => event.paymentIntentId,
            version: ({ context }) => context.version + 1,
          }),
        },
        PAYMENT_FAILED: {
          target: 'failed',
          actions: assign({
            failureCode: ({ event }) => event.failureCode,
            failureMessage: ({ event }) => event.failureMessage,
            version: ({ context }) => context.version + 1,
          }),
        },
      },
    },

    processing: {
      on: {
        PAYMENT_SUCCEEDED: {
          target: 'succeeded',
          actions: assign({
            stripeChargeId: ({ event }) => event.chargeId,
            version: ({ context }) => context.version + 1,
          }),
        },
        PAYMENT_FAILED: {
          target: 'failed',
          actions: assign({
            failureCode: ({ event }) => event.failureCode,
            failureMessage: ({ event }) => event.failureMessage,
            version: ({ context }) => context.version + 1,
          }),
        },
      },
    },

    succeeded: {
      on: {
        START_ESCROW: {
          target: 'inEscrow',
          actions: assign({
            escrowStartedAt: () => new Date(),
            escrowReleaseAt: ({ event }) => event.releaseDate,
            version: ({ context }) => context.version + 1,
          }),
        },
        REQUEST_REFUND: {
          target: 'refundRequested',
          actions: assign({
            version: ({ context }) => context.version + 1,
          }),
        },
      },
    },

    failed: {
      on: {
        RETRY_PAYMENT: {
          target: 'initiated',
          actions: assign({
            failureCode: () => null,
            failureMessage: () => null,
            version: ({ context }) => context.version + 1,
          }),
        },
      },
    },

    inEscrow: {
      on: {
        RELEASE_ESCROW: {
          target: 'released',
          actions: assign({
            escrowReleasedAt: () => new Date(),
            version: ({ context }) => context.version + 1,
          }),
        },
        REQUEST_REFUND: {
          target: 'refundRequested',
          actions: assign({
            version: ({ context }) => context.version + 1,
          }),
        },
      },
    },

    released: {
      on: {
        REQUEST_REFUND: {
          target: 'refundRequested',
          actions: assign({
            version: ({ context }) => context.version + 1,
          }),
        },
      },
    },

    refundRequested: {
      on: {
        APPROVE_REFUND: {
          target: 'refundApproved',
          actions: assign({
            version: ({ context }) => context.version + 1,
          }),
        },
        DENY_REFUND: {
          target: 'refundDenied',
          actions: assign({
            version: ({ context }) => context.version + 1,
          }),
        },
      },
    },

    refundApproved: {
      on: {
        PROCESS_FULL_REFUND: {
          target: 'refunded',
          actions: assign({
            stripeRefundId: ({ event }) => event.refundId,
            refundedAmountCents: ({ context }) => context.amountCents,
            version: ({ context }) => context.version + 1,
          }),
        },
        PROCESS_PARTIAL_REFUND: {
          target: 'partiallyRefunded',
          actions: assign({
            stripeRefundId: ({ event }) => event.refundId,
            refundedAmountCents: ({ context, event }) =>
              context.refundedAmountCents + event.amountCents,
            version: ({ context }) => context.version + 1,
          }),
        },
      },
    },

    refundDenied: {
      type: 'final',
    },

    refunded: {
      type: 'final',
    },

    partiallyRefunded: {
      on: {
        REQUEST_REFUND: {
          target: 'refundRequested',
          actions: assign({
            version: ({ context }) => context.version + 1,
          }),
        },
      },
    },
  },
});

/** Map XState state to PaymentState enum */
export function mapToPaymentState(stateValue: string): PaymentState {
  const stateMap: Record<string, PaymentState> = {
    notStarted: PaymentState.NOT_STARTED,
    initiated: PaymentState.INITIATED,
    processing: PaymentState.PROCESSING,
    succeeded: PaymentState.SUCCEEDED,
    failed: PaymentState.FAILED,
    inEscrow: PaymentState.IN_ESCROW,
    released: PaymentState.RELEASED,
    refundRequested: PaymentState.REFUND_REQUESTED,
    refundApproved: PaymentState.REFUND_APPROVED,
    refundDenied: PaymentState.REFUND_DENIED,
    refunded: PaymentState.REFUNDED,
    partiallyRefunded: PaymentState.PARTIALLY_REFUNDED,
  };

  const state = stateMap[stateValue];
  if (!state) {
    throw new Error(`Unknown payment state value: ${stateValue}`);
  }
  return state;
}

/** Validate that a payment transition is allowed */
export function validatePaymentTransition(
  currentState: PaymentState,
  targetState: PaymentState
): { valid: boolean; error?: string } {
  if (!isValidPaymentTransition(currentState, targetState)) {
    return {
      valid: false,
      error: `Invalid payment transition from ${currentState} to ${targetState}`,
    };
  }
  return { valid: true };
}

export type PaymentMachine = typeof paymentMachine;
