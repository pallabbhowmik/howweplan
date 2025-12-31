/**
 * Create Request DTO
 * Data transfer object for creating a new travel request
 * 
 * Constitution rules enforced:
 * - Rule 4: No user planning fee exists
 * - Rule 5: No AI-generated itineraries exist
 */

import type {
  TravelRequestDestination,
  TravelRequestDates,
  TravelRequestBudget,
  TravelRequestTravelers,
  TravelRequestPreferences,
} from '../entities/travel-request';

export interface CreateRequestDTO {
  readonly title: string;
  readonly description: string;
  readonly destinations: readonly TravelRequestDestination[];
  readonly dates: TravelRequestDates;
  readonly budget: TravelRequestBudget;
  readonly travelers: TravelRequestTravelers;
  readonly preferences: TravelRequestPreferences;
}

/**
 * Create Request Response DTO
 */
export interface CreateRequestResponseDTO {
  readonly requestId: string;
  readonly state: string;
  readonly expiresAt: Date;
  readonly createdAt: Date;
}

/**
 * Request Summary DTO
 * Used for listing requests
 */
export interface RequestSummaryDTO {
  readonly id: string;
  readonly title: string;
  readonly state: string;
  readonly primaryDestination: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly budgetRange: string;
  readonly matchedAgentsCount: number;
  readonly hasSelectedItinerary: boolean;
  readonly createdAt: Date;
  readonly expiresAt: Date;
}

/**
 * Request Detail DTO
 * Full request details for viewing
 */
export interface RequestDetailDTO {
  readonly id: string;
  readonly state: string;
  readonly title: string;
  readonly description: string;
  readonly destinations: readonly TravelRequestDestination[];
  readonly dates: TravelRequestDates;
  readonly budget: TravelRequestBudget;
  readonly travelers: TravelRequestTravelers;
  readonly preferences: TravelRequestPreferences;
  readonly matchedAgentIds: readonly string[];
  readonly selectedAgentId: string | null;
  readonly selectedItineraryId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly expiresAt: Date;
}
