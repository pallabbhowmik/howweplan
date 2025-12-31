/**
 * Payment Entity
 * Represents a payment transaction
 * 
 * Constitution rules enforced:
 * - Rule 1: Platform is Merchant of Record
 * - Rule 2: Payment processing fees passed to user via booking fee
 * - Rule 14: Refunds follow strict lifecycle state machines
 */

import type { PaymentState } from '../states/payment-state';

export type PaymentMethod = 'card' | 'bank_transfer' | 'wallet';

export interface PaymentBreakdown {
  readonly itineraryAmount: number;
  readonly platformCommission: number;
  readonly bookingFee: number; // Processing fee passed to user (rule 2)
  readonly processingFee: number; // Actual processing fee
  readonly totalAmount: number;
  readonly currency: string;
}

export interface PaymentRefund {
  readonly id: string;
  readonly amount: number;
  readonly reason: string;
  readonly initiatedBy: 'user' | 'agent' | 'platform' | 'dispute';
  readonly processedAt: Date | null;
  readonly status: 'pending' | 'processed' | 'failed';
  readonly failureReason: string | null;
}

export interface Payment {
  readonly id: string;
  readonly bookingId: string;
  readonly userId: string;
  readonly state: PaymentState;
  readonly method: PaymentMethod;
  readonly breakdown: PaymentBreakdown;
  readonly externalPaymentId: string | null; // Payment processor reference
  readonly externalPaymentIntentId: string | null;
  readonly authorizedAt: Date | null;
  readonly capturedAt: Date | null;
  readonly failedAt: Date | null;
  readonly failureReason: string | null;
  readonly refunds: readonly PaymentRefund[];
  readonly totalRefunded: number;
  readonly netAmount: number;
  readonly metadata: Record<string, string>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Agent payout record
 */
export interface AgentPayout {
  readonly id: string;
  readonly agentId: string;
  readonly bookingId: string;
  readonly paymentId: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: 'pending' | 'processing' | 'completed' | 'failed';
  readonly scheduledFor: Date;
  readonly processedAt: Date | null;
  readonly externalTransferId: string | null;
  readonly failureReason: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
