/**
 * Request Response DTOs
 * 
 * Output schemas for API responses.
 * Ensures consistent response format across all endpoints.
 */

import { z } from 'zod';
import { TravelRequest } from '../domain/request.entity';
import { RequestState, STATE_LABELS } from '../domain/request.state-machine';

// Response schema for a single request
export const RequestResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  state: z.string(),
  stateLabel: z.string(),
  
  destination: z.string(),
  departureLocation: z.string(),
  departureDate: z.string(),
  returnDate: z.string(),
  
  travelers: z.object({
    adults: z.number(),
    children: z.number(),
    infants: z.number(),
    total: z.number(),
  }),
  
  travelStyle: z.string(),
  
  budgetRange: z.object({
    minAmount: z.number(),
    maxAmount: z.number(),
    currency: z.string(),
    formatted: z.string(),
  }),
  
  notes: z.string().nullable(),
  
  createdAt: z.string(),
  updatedAt: z.string(),
  expiresAt: z.string(),
  
  isExpired: z.boolean(),
  isOpen: z.boolean(),
  isCancelled: z.boolean(),
  
  cancellation: z.object({
    cancelledAt: z.string(),
    reason: z.string(),
    cancelledBy: z.string(),
  }).nullable(),
});

export type RequestResponse = z.infer<typeof RequestResponseSchema>;

// List response with pagination
export const RequestListResponseSchema = z.object({
  requests: z.array(RequestResponseSchema),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    hasMore: z.boolean(),
  }),
});

export type RequestListResponse = z.infer<typeof RequestListResponseSchema>;

// Caps info response
export const CapsInfoResponseSchema = z.object({
  dailyCap: z.object({
    limit: z.number(),
    used: z.number(),
    remaining: z.number(),
  }),
  openRequests: z.object({
    limit: z.number(),
    count: z.number(),
    remaining: z.number(),
  }),
  canCreateRequest: z.boolean(),
});

export type CapsInfoResponse = z.infer<typeof CapsInfoResponseSchema>;

/**
 * Transform domain entity to API response
 */
export function toRequestResponse(request: TravelRequest): RequestResponse {
  const now = new Date();
  const isExpired = request.expiresAt < now && request.state !== 'expired';
  const totalTravelers = request.travelers.adults + request.travelers.children + request.travelers.infants;
  
  return {
    id: request.id,
    userId: request.userId,
    state: request.state,
    stateLabel: STATE_LABELS[request.state],
    
    destination: request.destination,
    departureLocation: request.departureLocation,
    departureDate: request.departureDate.toISOString(),
    returnDate: request.returnDate.toISOString(),
    
    travelers: {
      adults: request.travelers.adults,
      children: request.travelers.children,
      infants: request.travelers.infants,
      total: totalTravelers,
    },
    
    travelStyle: request.travelStyle,
    
    budgetRange: {
      minAmount: request.budgetRange.minAmount,
      maxAmount: request.budgetRange.maxAmount,
      currency: request.budgetRange.currency,
      formatted: formatBudgetRange(
        request.budgetRange.minAmount,
        request.budgetRange.maxAmount,
        request.budgetRange.currency
      ),
    },
    
    notes: request.notes,
    
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    expiresAt: request.expiresAt.toISOString(),
    
    isExpired,
    isOpen: !isTerminalState(request.state),
    isCancelled: request.state === 'cancelled',
    
    cancellation: request.cancelledAt ? {
      cancelledAt: request.cancelledAt.toISOString(),
      reason: request.cancellationReason ?? 'No reason provided',
      cancelledBy: request.cancelledBy ?? 'unknown',
    } : null,
  };
}

function isTerminalState(state: RequestState): boolean {
  return ['cancelled', 'expired', 'completed'].includes(state);
}

function formatBudgetRange(min: number, max: number, currency: string): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  
  return `${formatter.format(min)} - ${formatter.format(max)}`;
}
