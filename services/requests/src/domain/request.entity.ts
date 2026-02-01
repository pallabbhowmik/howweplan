/**
 * Travel Request Entity
 * 
 * Core domain entity representing a user's travel request.
 * Contains all business-critical data and state.
 */

import { RequestState } from './request.state-machine';

export interface TravelRequest {
  readonly id: string;
  readonly userId: string;
  readonly state: RequestState;
  
  // Travel details (what the user wants)
  readonly destination: string;
  readonly departureLocation: string;
  readonly departureDate: Date;
  readonly returnDate: Date;
  readonly travelers: TravelerCount;
  readonly travelStyle: TravelStyle;
  readonly budgetRange: BudgetRange;
  readonly preferences: RequestPreferences | null;
  readonly notes: string | null;
  
  // Metadata
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly expiresAt: Date;
  readonly stateChangedAt: Date;
  
  // Cancellation (if applicable)
  readonly cancelledAt: Date | null;
  readonly cancellationReason: string | null;
  readonly cancelledBy: CancelledBy | null;
}

export interface TravelerCount {
  readonly adults: number;
  readonly children: number;
  readonly infants: number;
}

export type TravelStyle = 
  | 'budget'
  | 'mid-range'
  | 'luxury'
  | 'ultra-luxury';

export interface BudgetRange {
  readonly minAmount: number;
  readonly maxAmount: number;
  readonly currency: string;
}

export interface RequestPreferences {
  readonly dietary_restrictions?: string[];
  readonly special_occasions?: string[];
  readonly accommodation_type?: string;
  readonly interests?: string[];
  [key: string]: unknown;
}

export type CancelledBy = 'user' | 'system' | 'admin';

/**
 * Factory function to create a new TravelRequest
 */
export function createTravelRequest(params: {
  id: string;
  userId: string;
  destination: string;
  departureLocation: string;
  departureDate: Date;
  returnDate: Date;
  travelers: TravelerCount;
  travelStyle: TravelStyle;
  budgetRange: BudgetRange;
  preferences: RequestPreferences | null;
  notes: string | null;
  expiresAt: Date;
}): TravelRequest {
  const now = new Date();
  
  return {
    id: params.id,
    userId: params.userId,
    state: 'submitted',
    destination: params.destination,
    departureLocation: params.departureLocation,
    departureDate: params.departureDate,
    returnDate: params.returnDate,
    travelers: params.travelers,
    travelStyle: params.travelStyle,
    budgetRange: params.budgetRange,
    preferences: params.preferences,
    notes: params.notes,
    createdAt: now,
    updatedAt: now,
    expiresAt: params.expiresAt,
    stateChangedAt: now,
    cancelledAt: null,
    cancellationReason: null,
    cancelledBy: null,
  };
}

/**
 * Apply a state transition to a request
 */
export function applyStateTransition(
  request: TravelRequest,
  newState: RequestState,
  cancellation?: { reason: string; by: CancelledBy }
): TravelRequest {
  const now = new Date();
  
  return {
    ...request,
    state: newState,
    updatedAt: now,
    stateChangedAt: now,
    ...(cancellation && {
      cancelledAt: now,
      cancellationReason: cancellation.reason,
      cancelledBy: cancellation.by,
    }),
  };
}

/**
 * Check if a request is in a terminal state
 */
export function isTerminalState(request: TravelRequest): boolean {
  const terminalStates: RequestState[] = [
    'cancelled',
    'expired',
    'completed',
  ];
  return terminalStates.includes(request.state);
}

/**
 * Check if a request is in an open (non-terminal) state
 */
export function isOpenState(request: TravelRequest): boolean {
  return !isTerminalState(request);
}
