/**
 * Request Events
 * 
 * Event definitions for the request domain.
 * These events are emitted on state changes for other services to consume.
 */

import { TravelRequest } from '../domain/request.entity';
import { RequestState, TransitionTrigger } from '../domain/request.state-machine';

/**
 * Base event interface
 */
export interface DomainEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly aggregateType: 'TravelRequest';
  readonly aggregateId: string;
  readonly occurredAt: string;
  readonly version: number;
  readonly metadata: EventMetadata;
}

export interface EventMetadata {
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly userId: string | null;
  readonly source: string;
}

/**
 * Request Created Event
 * Emitted when a new travel request is created
 */
export interface RequestCreatedEvent extends DomainEvent {
  readonly eventType: 'REQUEST_CREATED';
  readonly payload: {
    readonly request: RequestSnapshot;
  };
}

/**
 * Request State Changed Event
 * Emitted on every state transition
 */
export interface RequestStateChangedEvent extends DomainEvent {
  readonly eventType: 'REQUEST_STATE_CHANGED';
  readonly payload: {
    readonly requestId: string;
    readonly userId: string;
    readonly fromState: RequestState;
    readonly toState: RequestState;
    readonly trigger: TransitionTrigger;
    readonly triggeredBy: string;
    readonly reason: string;
  };
}

/**
 * Request Submitted Event
 * Emitted when a draft request is submitted for matching
 */
export interface RequestSubmittedEvent extends DomainEvent {
  readonly eventType: 'REQUEST_SUBMITTED';
  readonly payload: {
    readonly request: RequestSnapshot;
  };
}

/**
 * Request Cancelled Event
 * Emitted when a request is cancelled
 */
export interface RequestCancelledEvent extends DomainEvent {
  readonly eventType: 'REQUEST_CANCELLED';
  readonly payload: {
    readonly requestId: string;
    readonly userId: string;
    readonly cancelledBy: 'user' | 'system' | 'admin';
    readonly reason: string;
    readonly previousState: RequestState;
  };
}

/**
 * Request Expired Event
 * Emitted when a request expires
 */
export interface RequestExpiredEvent extends DomainEvent {
  readonly eventType: 'REQUEST_EXPIRED';
  readonly payload: {
    readonly requestId: string;
    readonly userId: string;
    readonly expiredAt: string;
    readonly previousState: RequestState;
  };
}

/**
 * Snapshot of request data for events
 */
export interface RequestSnapshot {
  readonly id: string;
  readonly userId: string;
  readonly state: RequestState;
  readonly destination: string;
  readonly departureLocation: string;
  readonly departureDate: string;
  readonly returnDate: string;
  readonly travelers: {
    readonly adults: number;
    readonly children: number;
    readonly infants: number;
  };
  readonly travelStyle: string;
  readonly budgetRange: {
    readonly minAmount: number;
    readonly maxAmount: number;
    readonly currency: string;
  };
  readonly createdAt: string;
  readonly expiresAt: string;
}

/**
 * Convert domain entity to snapshot
 */
export function toRequestSnapshot(request: TravelRequest): RequestSnapshot {
  return {
    id: request.id,
    userId: request.userId,
    state: request.state,
    destination: request.destination,
    departureLocation: request.departureLocation,
    departureDate: request.departureDate.toISOString(),
    returnDate: request.returnDate.toISOString(),
    travelers: {
      adults: request.travelers.adults,
      children: request.travelers.children,
      infants: request.travelers.infants,
    },
    travelStyle: request.travelStyle,
    budgetRange: {
      minAmount: request.budgetRange.minAmount,
      maxAmount: request.budgetRange.maxAmount,
      currency: request.budgetRange.currency,
    },
    createdAt: request.createdAt.toISOString(),
    expiresAt: request.expiresAt.toISOString(),
  };
}

/**
 * Union type of all request events
 */
export type RequestEvent =
  | RequestCreatedEvent
  | RequestStateChangedEvent
  | RequestSubmittedEvent
  | RequestCancelledEvent
  | RequestExpiredEvent;
