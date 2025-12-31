/**
 * Fee Calculator Service
 *
 * Calculates all fees for bookings:
 * - Booking fee (payment processing fee passed to user)
 * - Platform commission (8-12% on completed bookings)
 * - Agent payout amounts
 *
 * All calculations use cents to avoid floating-point errors.
 */

import { config } from '../env.js';
import type { FeeCalculation } from '../types/payment.types.js';

/** Fee calculation service */
class FeeCalculatorService {
  private readonly bookingFeeRate: number;
  private readonly bookingFeeFixedCents: number;
  private readonly commissionRate: number;
  private readonly minBookingCents: number;
  private readonly maxBookingCents: number;

  constructor() {
    this.bookingFeeRate = config.limits.bookingFeeRate;
    this.bookingFeeFixedCents = config.limits.bookingFeeFixedCents;
    this.commissionRate = config.limits.platformCommissionRate;
    this.minBookingCents = config.limits.minBookingAmountCents;
    this.maxBookingCents = config.limits.maxBookingAmountCents;
  }

  /**
   * Calculate all fees for a booking.
   *
   * Fee structure:
   * - User pays: basePriceCents + bookingFeeCents = totalAmountCents
   * - Platform keeps: platformCommissionCents (8-12% of base)
   * - Agent receives: agentPayoutCents (base - commission)
   *
   * @param basePriceCents - The base price set by the agent (in cents)
   * @returns Full fee breakdown
   */
  calculate(basePriceCents: number): FeeCalculation {
    // Validate input
    if (!Number.isInteger(basePriceCents)) {
      throw new Error('Base price must be an integer (cents)');
    }

    if (basePriceCents < this.minBookingCents) {
      throw new Error(
        `Booking amount ${basePriceCents} cents is below minimum ${this.minBookingCents} cents`
      );
    }

    if (basePriceCents > this.maxBookingCents) {
      throw new Error(
        `Booking amount ${basePriceCents} cents exceeds maximum ${this.maxBookingCents} cents`
      );
    }

    // Calculate booking fee (payment processing fee passed to user)
    // Formula: (basePriceCents * rate) + fixed fee
    const variableFee = Math.ceil(basePriceCents * this.bookingFeeRate);
    const bookingFeeCents = variableFee + this.bookingFeeFixedCents;

    // Total amount user pays
    const totalAmountCents = basePriceCents + bookingFeeCents;

    // Platform commission (percentage of base price)
    const platformCommissionCents = Math.floor(basePriceCents * this.commissionRate);

    // Agent payout (base price minus commission)
    const agentPayoutCents = basePriceCents - platformCommissionCents;

    // Estimate Stripe fees on total amount
    // Stripe charges 2.9% + $0.30 on the total
    const stripeFeeEstimateCents =
      Math.ceil(totalAmountCents * 0.029) + 30;

    return {
      basePriceCents,
      bookingFeeCents,
      totalAmountCents,
      platformCommissionCents,
      agentPayoutCents,
      stripeFeeEstimateCents,
    };
  }

  /**
   * Calculate refund amount based on cancellation timing.
   *
   * @param totalAmountCents - Total amount originally charged
   * @param bookingFeeCents - Booking fee portion
   * @param userCancelledBeforeConfirm - Whether cancelled before agent confirmation
   * @returns Refund amount in cents
   */
  calculateRefundAmount(params: {
    totalAmountCents: number;
    bookingFeeCents: number;
    userCancelledBeforeConfirm: boolean;
    isAgentFault: boolean;
  }): number {
    const { totalAmountCents, bookingFeeCents, userCancelledBeforeConfirm, isAgentFault } =
      params;

    // Agent fault = full refund including booking fee
    if (isAgentFault) {
      return totalAmountCents;
    }

    // User cancelled before agent confirmation = full minus booking fee
    if (userCancelledBeforeConfirm) {
      return totalAmountCents - bookingFeeCents;
    }

    // User cancelled after agent confirmation = 50% of base price
    const basePrice = totalAmountCents - bookingFeeCents;
    return Math.floor(basePrice * 0.5);
  }

  /**
   * Validate that a price is within allowed limits.
   */
  validatePrice(amountCents: number): { valid: boolean; error?: string } {
    if (!Number.isInteger(amountCents)) {
      return { valid: false, error: 'Amount must be an integer (cents)' };
    }

    if (amountCents < this.minBookingCents) {
      return {
        valid: false,
        error: `Amount ${amountCents} cents below minimum ${this.minBookingCents} cents`,
      };
    }

    if (amountCents > this.maxBookingCents) {
      return {
        valid: false,
        error: `Amount ${amountCents} cents exceeds maximum ${this.maxBookingCents} cents`,
      };
    }

    return { valid: true };
  }

  /**
   * Get fee breakdown for display purposes.
   */
  getDisplayBreakdown(basePriceCents: number): {
    basePrice: string;
    bookingFee: string;
    total: string;
  } {
    const fees = this.calculate(basePriceCents);

    return {
      basePrice: this.formatCurrency(fees.basePriceCents),
      bookingFee: this.formatCurrency(fees.bookingFeeCents),
      total: this.formatCurrency(fees.totalAmountCents),
    };
  }

  /**
   * Format cents as currency string (USD).
   */
  private formatCurrency(cents: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  }
}

export const feeCalculator = new FeeCalculatorService();
