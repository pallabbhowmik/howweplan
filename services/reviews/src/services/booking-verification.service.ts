/**
 * Booking Verification Service
 * 
 * Verifies booking status before allowing review submission.
 * Ensures reviews can ONLY be submitted for COMPLETED bookings.
 */

import { databaseConfig } from '../config/env';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// DATABASE CLIENT
// =============================================================================

let supabaseClient: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(
      databaseConfig.supabaseUrl,
      databaseConfig.supabaseServiceRoleKey
    );
  }
  return supabaseClient;
}

// =============================================================================
// TYPES
// =============================================================================

export interface BookingDetails {
  id: string;
  userId: string;
  agentId: string;
  state: string;
  timeline: {
    createdAt: Date;
    confirmedAt: Date | null;
    paidAt: Date | null;
    completedAt: Date | null;
    cancelledAt: Date | null;
  };
}

export interface BookingVerificationResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// =============================================================================
// SERVICE IMPLEMENTATION
// =============================================================================

export const bookingVerificationService = {
  /**
   * Get a completed booking for review eligibility check.
   * Only returns booking if it exists; caller must check state.
   */
  async getCompletedBooking(
    bookingId: string
  ): Promise<BookingVerificationResult<BookingDetails>> {
    const client = getClient();

    const { data, error } = await client
      .from('bookings')
      .select(`
        id,
        user_id,
        agent_id,
        state,
        created_at,
        confirmed_at,
        paid_at,
        completed_at,
        cancelled_at
      `)
      .eq('id', bookingId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: {
            code: 'BOOKING_NOT_FOUND',
            message: 'Booking not found',
          },
        };
      }
      console.error('[BookingVerificationService] Error:', error);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch booking',
        },
      };
    }

    return {
      success: true,
      data: {
        id: data.id,
        userId: data.user_id,
        agentId: data.agent_id,
        state: data.state,
        timeline: {
          createdAt: new Date(data.created_at),
          confirmedAt: data.confirmed_at ? new Date(data.confirmed_at) : null,
          paidAt: data.paid_at ? new Date(data.paid_at) : null,
          completedAt: data.completed_at ? new Date(data.completed_at) : null,
          cancelledAt: data.cancelled_at ? new Date(data.cancelled_at) : null,
        },
      },
    };
  },

  /**
   * Verify that a booking is in COMPLETED state.
   * This is the core check that prevents pre-completion reviews.
   */
  async isBookingCompleted(bookingId: string): Promise<boolean> {
    const result = await this.getCompletedBooking(bookingId);
    return result.success && result.data?.state === 'COMPLETED';
  },
};
