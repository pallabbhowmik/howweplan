/**
 * Booking Completed Event Handler
 * 
 * Handles the BookingCompleted event from the booking-payments service.
 * Creates pending review records for both traveler and agent.
 */

import { BookingCompletedEvent } from '../contracts';
import { reviewService } from '../../services';
import { eventPublisher } from '../publisher';
import { ReviewerType } from '../../models';

/**
 * Handle BookingCompleted event
 * 
 * When a booking is completed (trip has ended):
 * 1. Create pending review for traveler to review agent
 * 2. Create pending review for agent to review traveler
 * 3. Emit review invitation events for notification service
 */
export async function handleBookingCompleted(event: BookingCompletedEvent): Promise<void> {
  const { payload } = event;

  console.log(`[BookingCompletedHandler] Processing booking ${payload.bookingId}`);

  // Validate event data
  if (!payload.bookingId || !payload.travelerId || !payload.agentId) {
    console.error('[BookingCompletedHandler] Invalid event payload - missing required fields');
    throw new Error('Invalid BookingCompleted event: missing required fields');
  }

  // Create pending reviews
  const result = await reviewService.createPendingReviews({
    bookingId: payload.bookingId,
    travelerId: payload.travelerId,
    agentId: payload.agentId,
    tripCompletedAt: new Date(payload.completedAt),
    bookingValue: payload.totalAmount,
  });

  if (!result.success) {
    console.warn(
      `[BookingCompletedHandler] Could not create reviews for booking ${payload.bookingId}:`,
      result.error
    );
    // Don't throw - some bookings may legitimately not qualify for reviews
    return;
  }

  const { travelerReviewId, agentReviewId } = result.data!;

  // Calculate submission deadline
  const submissionDeadline = new Date(payload.completedAt);
  submissionDeadline.setDate(submissionDeadline.getDate() + 30);  // From env config

  // Emit invitation events so notification service can send emails
  await Promise.all([
    eventPublisher.publishReviewInvitationSent(
      travelerReviewId,
      payload.bookingId,
      payload.travelerId,
      ReviewerType.TRAVELER,
      submissionDeadline
    ),
    eventPublisher.publishReviewInvitationSent(
      agentReviewId,
      payload.bookingId,
      payload.agentId,
      ReviewerType.AGENT,
      submissionDeadline
    ),
  ]);

  console.log(
    `[BookingCompletedHandler] Created pending reviews for booking ${payload.bookingId}:`,
    { travelerReviewId, agentReviewId }
  );
}

/**
 * Validate that an event is a valid BookingCompleted event
 */
export function isBookingCompletedEvent(event: unknown): event is BookingCompletedEvent {
  if (!event || typeof event !== 'object') return false;
  
  const e = event as Record<string, unknown>;
  return (
    e.type === 'booking.completed' &&
    e.version === '1.0' &&
    typeof e.timestamp === 'string' &&
    typeof e.payload === 'object' &&
    e.payload !== null
  );
}
