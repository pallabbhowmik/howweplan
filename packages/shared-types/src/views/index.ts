/**
 * View Models - UI-safe data transfer objects
 * These types represent data shapes for frontend consumption.
 * They contain no sensitive information and are safe to expose publicly.
 */

import type {
  UUID,
  ISODateString,
  Money,
  Percentage,
  URLString,
} from '../primitives';

/**
 * Obfuscated agent profile for public display
 * Contains only information safe to show to non-authenticated users
 */
export interface ObfuscatedAgentProfile {
  /** Public agent identifier */
  readonly id: UUID;
  /** Display name (may be partially masked) */
  readonly displayName: string;
  /** Optional avatar URL */
  readonly avatarUrl?: URLString;
  /** Agent's primary specialization */
  readonly specialization?: string;
  /** Years of experience (rounded) */
  readonly yearsOfExperience?: number;
  /** Whether the agent is currently accepting new clients */
  readonly isAcceptingClients: boolean;
  /** Agent's response time category */
  readonly responseTimeCategory: 'fast' | 'moderate' | 'relaxed';
  /** Verification badge status */
  readonly verificationStatus: 'verified' | 'pending' | 'unverified';
}

/**
 * Public statistics for an agent
 * Aggregated metrics safe for public display
 */
export interface PublicAgentStats {
  /** Agent identifier */
  readonly agentId: UUID;
  /** Total number of completed trips */
  readonly completedTripsCount: number;
  /** Average rating (1-5 scale) */
  readonly averageRating: number;
  /** Total number of reviews */
  readonly reviewCount: number;
  /** Percentage of repeat customers */
  readonly repeatCustomerRate: Percentage;
  /** Top destination categories */
  readonly topDestinations: readonly string[];
  /** Price range category */
  readonly priceRangeCategory: 'budget' | 'mid-range' | 'luxury' | 'ultra-luxury';
  /** Stats last updated timestamp */
  readonly lastUpdatedAt: ISODateString;
}

/**
 * Obfuscated itinerary summary for browse/search results
 * Contains preview information without revealing full details
 */
export interface ObfuscatedItinerarySummary {
  /** Itinerary identifier */
  readonly id: UUID;
  /** Display title */
  readonly title: string;
  /** Short description/teaser */
  readonly description: string;
  /** Cover image URL */
  readonly coverImageUrl?: URLString;
  /** Primary destination (city/region level) */
  readonly primaryDestination: string;
  /** Trip duration in days */
  readonly durationDays: number;
  /** Starting price (may be approximate) */
  readonly startingPrice: Money;
  /** Number of activities included */
  readonly activityCount: number;
  /** Trip style tags */
  readonly tags: readonly string[];
  /** Average rating for this itinerary */
  readonly averageRating?: number;
  /** Number of times this itinerary was booked */
  readonly bookingCount: number;
  /** Agent who created this itinerary */
  readonly agent: ObfuscatedAgentProfile;
  /** Creation timestamp */
  readonly createdAt: ISODateString;
}

/**
 * Full itinerary details revealed after purchase/unlock
 */
export interface RevealedItineraryDetails {
  /** Itinerary identifier */
  readonly id: UUID;
  /** Full title */
  readonly title: string;
  /** Comprehensive description */
  readonly description: string;
  /** All associated images */
  readonly images: readonly ItineraryImage[];
  /** Detailed destination information */
  readonly destination: DestinationDetails;
  /** Trip duration in days */
  readonly durationDays: number;
  /** Day-by-day breakdown */
  readonly dayByDayPlan: readonly DayPlan[];
  /** All included activities with full details */
  readonly activities: readonly ActivityDetails[];
  /** Accommodation recommendations */
  readonly accommodations: readonly AccommodationDetails[];
  /** Transportation details */
  readonly transportation: readonly TransportationDetails[];
  /** Practical tips and notes */
  readonly tips: readonly string[];
  /** Best time to visit */
  readonly bestTimeToVisit: SeasonalRecommendation;
  /** Packing suggestions */
  readonly packingSuggestions: readonly string[];
  /** Agent contact information */
  readonly agentContact: AgentContactInfo;
  /** Last updated timestamp */
  readonly updatedAt: ISODateString;
}

/**
 * Image associated with an itinerary
 */
export interface ItineraryImage {
  readonly url: URLString;
  readonly alt: string;
  readonly caption?: string;
  readonly order: number;
}

/**
 * Destination details
 */
export interface DestinationDetails {
  readonly country: string;
  readonly region?: string;
  readonly city?: string;
  readonly coordinates?: GeoCoordinates;
  readonly timezone: string;
  readonly language: string;
  readonly currency: string;
}

/**
 * Geographic coordinates
 */
export interface GeoCoordinates {
  readonly latitude: number;
  readonly longitude: number;
}

/**
 * Day plan within an itinerary
 */
export interface DayPlan {
  readonly dayNumber: number;
  readonly title: string;
  readonly description: string;
  readonly activities: readonly UUID[];
  readonly meals?: MealPlan;
  readonly notes?: string;
}

/**
 * Meal plan for a day
 */
export interface MealPlan {
  readonly breakfast?: string;
  readonly lunch?: string;
  readonly dinner?: string;
}

/**
 * Activity details
 */
export interface ActivityDetails {
  readonly id: UUID;
  readonly name: string;
  readonly description: string;
  readonly location: string;
  readonly durationMinutes: number;
  readonly estimatedCost?: Money;
  readonly category: string;
  readonly bookingRequired: boolean;
  readonly bookingUrl?: URLString;
  readonly tips?: string;
}

/**
 * Accommodation details
 */
export interface AccommodationDetails {
  readonly name: string;
  readonly type: 'hotel' | 'hostel' | 'apartment' | 'resort' | 'villa' | 'other';
  readonly location: string;
  readonly priceRange: 'budget' | 'mid-range' | 'luxury';
  readonly amenities: readonly string[];
  readonly bookingUrl?: URLString;
  readonly notes?: string;
}

/**
 * Transportation details
 */
export interface TransportationDetails {
  readonly type: 'flight' | 'train' | 'bus' | 'car' | 'ferry' | 'other';
  readonly from: string;
  readonly to: string;
  readonly estimatedDuration?: string;
  readonly estimatedCost?: Money;
  readonly provider?: string;
  readonly bookingUrl?: URLString;
  readonly notes?: string;
}

/**
 * Seasonal travel recommendation
 */
export interface SeasonalRecommendation {
  readonly recommendedMonths: readonly number[];
  readonly peakSeason: readonly number[];
  readonly offSeason: readonly number[];
  readonly weatherNotes: string;
}

/**
 * Agent contact information (revealed after purchase)
 */
export interface AgentContactInfo {
  readonly agentId: UUID;
  readonly displayName: string;
  readonly email?: string;
  readonly responseTime: string;
  readonly availableHours?: string;
}

/**
 * Detailed price breakdown for a booking
 */
export interface BookingPriceBreakdown {
  /** Booking identifier */
  readonly bookingId: UUID;
  /** Base itinerary price */
  readonly basePrice: Money;
  /** Individual line items */
  readonly lineItems: readonly PriceLineItem[];
  /** Subtotal before discounts */
  readonly subtotal: Money;
  /** Applied discounts */
  readonly discounts: readonly DiscountItem[];
  /** Total discount amount */
  readonly totalDiscount: Money;
  /** Taxes and fees */
  readonly taxes: readonly TaxItem[];
  /** Total tax amount */
  readonly totalTax: Money;
  /** Service/platform fee */
  readonly serviceFee: Money;
  /** Final total */
  readonly grandTotal: Money;
  /** Currency used for all amounts */
  readonly currency: string;
  /** Price calculated at timestamp */
  readonly calculatedAt: ISODateString;
  /** Price valid until timestamp */
  readonly validUntil: ISODateString;
}

/**
 * Individual price line item
 */
export interface PriceLineItem {
  readonly id: string;
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: Money;
  readonly totalPrice: Money;
  readonly category: 'accommodation' | 'activity' | 'transportation' | 'addon' | 'other';
}

/**
 * Discount applied to booking
 */
export interface DiscountItem {
  readonly code?: string;
  readonly description: string;
  readonly type: 'percentage' | 'fixed';
  readonly value: number;
  readonly amount: Money;
}

/**
 * Tax line item
 */
export interface TaxItem {
  readonly name: string;
  readonly rate: Percentage;
  readonly amount: Money;
  readonly jurisdiction?: string;
}
