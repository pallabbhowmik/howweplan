import type { Itinerary } from '../models/index.js';
import { DisclosureState, VALID_DISCLOSURE_TRANSITIONS } from '../models/index.js';
import type { ItineraryRepository } from '../repository/index.js';
import { ObfuscationEngine, obfuscateItinerary } from '../obfuscation/index.js';
import { publishEvent } from '../events/index.js';
import { createAuditEvent } from '../utils/index.js';
import { 
  ItineraryNotFoundError,
  InvalidStateTransitionError,
  UnauthorizedError,
} from '../utils/index.js';

/**
 * Service for managing itinerary disclosure (reveal/obfuscate).
 * 
 * BUSINESS RULES:
 * - Pre-payment itineraries MUST be obfuscated and non-executable
 * - No exact hotel names, vendors, or booking references pre-payment
 * - Exact details revealed ONLY after payment
 * - Full contact details released ONLY after payment
 */
export class DisclosureService {
  private readonly obfuscationEngine: ObfuscationEngine;

  constructor(private readonly repository: ItineraryRepository) {
    this.obfuscationEngine = new ObfuscationEngine();
  }

  /**
   * Get obfuscated view of an itinerary.
   * Always returns obfuscated version regardless of current state.
   */
  async getObfuscatedView(id: string): Promise<Itinerary> {
    const itinerary = await this.getItinerary(id);
    return obfuscateItinerary(itinerary);
  }

  /**
   * Get revealed view of an itinerary.
   * Only available if itinerary is in REVEALED state.
   */
  async getRevealedView(
    id: string,
    requesterId: string,
    requesterRole: 'TRAVELER' | 'AGENT' | 'ADMIN'
  ): Promise<Itinerary> {
    const itinerary = await this.getItinerary(id);

    // Agents and admins can always see full details
    if (requesterRole === 'AGENT' || requesterRole === 'ADMIN') {
      return itinerary;
    }

    // Travelers can only see revealed if paid
    if (itinerary.disclosureState !== DisclosureState.REVEALED) {
      throw new UnauthorizedError(
        'Itinerary details are only available after payment confirmation'
      );
    }

    // Verify traveler owns this itinerary
    if (itinerary.travelerId !== requesterId) {
      throw new UnauthorizedError('Not authorized to view this itinerary');
    }

    return itinerary;
  }

  /**
   * Reveal an itinerary (called after payment confirmation).
   * This is triggered by the booking.paid event, not directly.
   */
  async revealItinerary(
    id: string,
    actorId: string,
    actorRole: 'ADMIN' | 'SYSTEM',
    reason: string
  ): Promise<Itinerary> {
    const itinerary = await this.getItinerary(id);
    
    return this.transitionDisclosureState(
      itinerary,
      DisclosureState.REVEALED,
      actorId,
      actorRole,
      reason
    );
  }

  /**
   * Revert an itinerary to obfuscated state (e.g., after cancellation).
   */
  async obfuscateItinerary(
    id: string,
    actorId: string,
    actorRole: 'ADMIN' | 'SYSTEM',
    reason: string
  ): Promise<Itinerary> {
    const itinerary = await this.getItinerary(id);
    
    return this.transitionDisclosureState(
      itinerary,
      DisclosureState.OBFUSCATED,
      actorId,
      actorRole,
      reason
    );
  }

  /**
   * Handle booking paid event - reveal itinerary.
   */
  async handleBookingPaid(
    bookingId: string,
    itineraryId: string,
    correlationId: string
  ): Promise<void> {
    const itinerary = await this.getItinerary(itineraryId);

    // Only reveal if currently obfuscated
    if (itinerary.disclosureState === DisclosureState.OBFUSCATED) {
      await this.transitionDisclosureState(
        itinerary,
        DisclosureState.REVEALED,
        'system',
        'SYSTEM',
        `Payment confirmed for booking ${bookingId}`
      );

      // Emit disclosure event
      await publishEvent({
        type: 'itinerary.disclosed',
        payload: {
          itineraryId,
          bookingId,
          disclosureState: DisclosureState.REVEALED,
          disclosedAt: new Date().toISOString(),
        },
        metadata: {
          timestamp: new Date().toISOString(),
          correlationId,
          source: 'itineraries-service',
        },
      });
    }
  }

  /**
   * Handle booking cancelled event - revert to obfuscated.
   */
  async handleBookingCancelled(
    bookingId: string,
    itineraryId: string,
    correlationId: string
  ): Promise<void> {
    const itinerary = await this.getItinerary(itineraryId);

    // Only obfuscate if currently revealed
    if (itinerary.disclosureState === DisclosureState.REVEALED) {
      await this.transitionDisclosureState(
        itinerary,
        DisclosureState.OBFUSCATED,
        'system',
        'SYSTEM',
        `Booking cancelled: ${bookingId}`
      );
    }
  }

  /**
   * Check if an itinerary is revealed.
   */
  async isRevealed(id: string): Promise<boolean> {
    const itinerary = await this.getItinerary(id);
    return itinerary.disclosureState === DisclosureState.REVEALED;
  }

  /**
   * Get current disclosure state.
   */
  async getDisclosureState(id: string): Promise<DisclosureState> {
    const itinerary = await this.getItinerary(id);
    return itinerary.disclosureState;
  }

  /**
   * Transition disclosure state with validation and audit.
   */
  private async transitionDisclosureState(
    itinerary: Itinerary,
    newState: DisclosureState,
    actorId: string,
    actorRole: 'ADMIN' | 'SYSTEM',
    reason: string
  ): Promise<Itinerary> {
    const currentState = itinerary.disclosureState;

    // Validate transition
    const validTransitions = VALID_DISCLOSURE_TRANSITIONS[currentState];
    if (!validTransitions.includes(newState)) {
      throw new InvalidStateTransitionError(
        `Invalid disclosure transition from ${currentState} to ${newState}`
      );
    }

    const now = new Date().toISOString();
    const updates: Partial<Itinerary> = {
      disclosureState: newState,
      updatedAt: now,
    };

    if (newState === DisclosureState.REVEALED) {
      updates.disclosedAt = now;
    }

    await this.repository.update(itinerary.id, updates);

    // Emit audit event
    await publishEvent(createAuditEvent({
      eventType: 'itinerary.disclosure_changed',
      entityType: 'itinerary',
      entityId: itinerary.id,
      actorId,
      actorRole,
      changes: {
        disclosureState: { from: currentState, to: newState },
      },
      metadata: {
        reason,
      },
    }));

    return { ...itinerary, ...updates };
  }

  /**
   * Get itinerary by ID.
   */
  private async getItinerary(id: string): Promise<Itinerary> {
    const itinerary = await this.repository.findById(id);
    if (!itinerary) {
      throw new ItineraryNotFoundError(`Itinerary not found: ${id}`);
    }
    return itinerary;
  }
}
