/**
 * Travel Request Entity
 * Represents a user's travel planning request
 */

import type { RequestState } from '../states/request-state';

export interface TravelRequestDestination {
  readonly country: string;
  readonly city: string | null;
  readonly region: string | null;
  readonly flexibility: 'exact' | 'flexible' | 'anywhere_in_country';
}

export interface TravelRequestDates {
  readonly startDate: Date;
  readonly endDate: Date;
  readonly flexibility: 'exact' | 'flexible_1_3_days' | 'flexible_week' | 'flexible_month';
}

export interface TravelRequestBudget {
  readonly minAmount: number;
  readonly maxAmount: number;
  readonly currency: string;
  readonly includesFlights: boolean;
  readonly includesAccommodation: boolean;
  readonly includesActivities: boolean;
}

export interface TravelRequestTravelers {
  readonly adults: number;
  readonly children: number;
  readonly childrenAges: readonly number[];
  readonly infants: number;
}

export interface TravelRequestPreferences {
  readonly accommodationType: readonly ('hotel' | 'resort' | 'villa' | 'apartment' | 'hostel' | 'boutique')[];
  readonly accommodationStars: readonly (3 | 4 | 5)[];
  readonly interests: readonly string[];
  readonly dietaryRestrictions: readonly string[];
  readonly accessibilityNeeds: readonly string[];
  readonly travelStyle: 'budget' | 'mid_range' | 'luxury' | 'ultra_luxury';
  readonly pacePreference: 'relaxed' | 'moderate' | 'fast_paced';
}

export interface TravelRequest {
  readonly id: string;
  readonly userId: string;
  readonly state: RequestState;
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
  readonly expiresAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
