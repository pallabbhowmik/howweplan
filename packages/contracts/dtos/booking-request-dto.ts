/**
 * Booking Request DTO
 * Data transfer object for creating a booking
 * 
 * Constitution rules enforced:
 * - Rule 12: Platform chat is mandatory before payment
 */

export interface BookingRequestDTO {
  readonly requestId: string;
  readonly itineraryId: string;
  readonly agentId: string;
  
  /** Constitution rule 12: Chat requirement verification */
  readonly chatRequirementAcknowledged: boolean;
  
  /** User's acceptance of terms */
  readonly termsAccepted: boolean;
  readonly cancellationPolicyAccepted: boolean;
  
  /** Optional notes for the booking */
  readonly userNotes: string | null;
}

/**
 * Booking Response DTO
 */
export interface BookingResponseDTO {
  readonly bookingId: string;
  readonly requestId: string;
  readonly itineraryId: string;
  readonly agentId: string;
  readonly state: string;
  readonly financials: {
    readonly subtotal: number;
    readonly platformCommission: number;
    readonly bookingFee: number;
    readonly totalCharged: number;
    readonly currency: string;
  };
  readonly travelStartDate: Date;
  readonly travelEndDate: Date;
  readonly createdAt: Date;
}

/**
 * Booking Summary DTO
 * Used for listing user's bookings
 */
export interface BookingSummaryDTO {
  readonly id: string;
  readonly state: string;
  readonly itineraryTitle: string;
  readonly agentFirstName: string;
  readonly destination: string;
  readonly travelStartDate: Date;
  readonly travelEndDate: Date;
  readonly totalAmount: number;
  readonly currency: string;
  readonly hasDispute: boolean;
  readonly createdAt: Date;
}

/**
 * Booking Detail DTO
 * Full booking details
 */
export interface BookingDetailDTO {
  readonly id: string;
  readonly state: string;
  readonly requestId: string;
  readonly itineraryId: string;
  readonly agentId: string;
  readonly paymentId: string | null;
  readonly disputeId: string | null;
  readonly financials: {
    readonly subtotal: number;
    readonly platformCommission: number;
    readonly bookingFee: number;
    readonly totalCharged: number;
    readonly currency: string;
    readonly refundedAmount: number;
  };
  readonly timeline: {
    readonly createdAt: Date;
    readonly confirmedAt: Date | null;
    readonly paidAt: Date | null;
    readonly completedAt: Date | null;
    readonly cancelledAt: Date | null;
  };
  readonly travelStartDate: Date;
  readonly travelEndDate: Date;
  readonly cancellationReason: string | null;
  readonly refundEligible: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Cancel Booking DTO
 */
export interface CancelBookingDTO {
  readonly bookingId: string;
  readonly reason: string;
}

/**
 * Cancel Booking Response DTO
 */
export interface CancelBookingResponseDTO {
  readonly bookingId: string;
  readonly previousState: string;
  readonly newState: string;
  readonly refundEligible: boolean;
  readonly estimatedRefundAmount: number | null;
  readonly refundPercentage: number | null;
  readonly cancelledAt: Date;
}
