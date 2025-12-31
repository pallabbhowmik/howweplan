/**
 * Payment Intent DTO
 * Data transfer object for payment operations
 * 
 * Constitution rules enforced:
 * - Rule 1: Platform is Merchant of Record
 * - Rule 2: Payment processing fees passed to user via booking fee
 */

export interface PaymentIntentDTO {
  readonly bookingId: string;
  readonly paymentMethod: 'card' | 'bank_transfer' | 'wallet';
  
  /** For card payments */
  readonly cardToken: string | null;
  
  /** For wallet payments */
  readonly walletType: string | null;
  
  /** User's billing address */
  readonly billingAddress: {
    readonly line1: string;
    readonly line2: string | null;
    readonly city: string;
    readonly state: string | null;
    readonly postalCode: string;
    readonly country: string;
  } | null;
  
  /** Save payment method for future use */
  readonly savePaymentMethod: boolean;
}

/**
 * Payment Intent Response DTO
 */
export interface PaymentIntentResponseDTO {
  readonly paymentId: string;
  readonly bookingId: string;
  readonly state: string;
  readonly breakdown: {
    /** Itinerary cost */
    readonly itineraryAmount: number;
    /** Platform commission (8-12%) */
    readonly platformCommission: number;
    /** Processing fee passed to user (rule 2) */
    readonly bookingFee: number;
    /** Total to charge */
    readonly totalAmount: number;
    readonly currency: string;
  };
  readonly clientSecret: string | null;
  readonly redirectUrl: string | null;
  readonly requiresAction: boolean;
  readonly createdAt: Date;
}

/**
 * Confirm Payment DTO
 */
export interface ConfirmPaymentDTO {
  readonly paymentId: string;
  readonly paymentIntentId: string;
}

/**
 * Payment Status DTO
 */
export interface PaymentStatusDTO {
  readonly paymentId: string;
  readonly bookingId: string;
  readonly state: string;
  readonly breakdown: {
    readonly itineraryAmount: number;
    readonly platformCommission: number;
    readonly bookingFee: number;
    readonly totalAmount: number;
    readonly currency: string;
  };
  readonly authorizedAt: Date | null;
  readonly capturedAt: Date | null;
  readonly failedAt: Date | null;
  readonly failureReason: string | null;
  readonly refunds: readonly {
    readonly id: string;
    readonly amount: number;
    readonly status: string;
    readonly processedAt: Date | null;
  }[];
  readonly totalRefunded: number;
  readonly netAmount: number;
}

/**
 * Refund Request DTO
 * Used by admins to issue refunds
 */
export interface RefundRequestDTO {
  readonly paymentId: string;
  readonly amount: number;
  readonly reason: string;
  readonly refundType: 'full' | 'partial';
  /** Required for admin actions (rule 8) */
  readonly adminReason: string;
}

/**
 * Refund Response DTO
 */
export interface RefundResponseDTO {
  readonly refundId: string;
  readonly paymentId: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: string;
  readonly reason: string;
  readonly issuedAt: Date;
}
