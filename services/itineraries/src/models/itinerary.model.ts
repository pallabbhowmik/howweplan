import { z } from 'zod';
import { 
  disclosureStateSchema, 
  itineraryStatusSchema,
  DisclosureState,
  ItineraryStatus,
} from './enums.js';
import { itineraryItemSchema, createItineraryItemSchema } from './itinerary-item.model.js';

/**
 * Trip overview information.
 */
export const tripOverviewSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().max(2000).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  numberOfDays: z.number().int().positive(),
  numberOfNights: z.number().int().nonnegative(),
  destinations: z.array(z.string().max(100)).min(1).max(20),
  travelersCount: z.number().int().positive().default(1),
  tripType: z.enum([
    'ADVENTURE',
    'BEACH',
    'CITY_BREAK',
    'CRUISE',
    'CULTURAL',
    'FAMILY',
    'HONEYMOON',
    'LUXURY',
    'SAFARI',
    'SKI',
    'WELLNESS',
    'OTHER',
  ]).optional(),
}).refine((data: { startDate: string; endDate: string }) => new Date(data.startDate) <= new Date(data.endDate), {
  message: 'Start date must be before or equal to end date',
});

export type TripOverview = z.infer<typeof tripOverviewSchema>;

/**
 * Pricing information (no payment logic - informational only).
 */
export const pricingInfoSchema = z.object({
  currency: z.string().length(3).default('USD'),
  totalPrice: z.number().nonnegative(),
  pricePerPerson: z.number().nonnegative().optional(),
  depositAmount: z.number().nonnegative().optional(),
  inclusions: z.array(z.string().max(200)).max(30).default([]),
  exclusions: z.array(z.string().max(200)).max(30).default([]),
  paymentTerms: z.string().max(1000).optional(),
});

export type PricingInfo = z.infer<typeof pricingInfoSchema>;

/**
 * Day plan schema for simplified itinerary editing.
 */
export const dayPlanSchema = z.object({
  dayNumber: z.number().int().positive(),
  title: z.string().max(200),
  description: z.string().max(2000).optional(),
  activities: z.array(z.string().max(500)).max(20).default([]),
});

export type DayPlan = z.infer<typeof dayPlanSchema>;

/**
 * Main itinerary model.
 */
export const itinerarySchema = z.object({
  id: z.string().uuid(),
  
  /** Associated request ID */
  requestId: z.string().uuid(),
  /** Agent who created this itinerary */
  agentId: z.string().uuid(),
  /** Traveler this itinerary is for */
  travelerId: z.string().uuid(),
  
  /** Current workflow status */
  status: itineraryStatusSchema.default('DRAFT'),
  /** Current disclosure state - controls visibility */
  disclosureState: disclosureStateSchema.default('OBFUSCATED'),
  
  /** Trip overview */
  overview: tripOverviewSchema,
  
  /** Pricing information (no payment logic) */
  pricing: pricingInfoSchema.optional(),
  
  /** All items in this itinerary */
  items: z.array(itineraryItemSchema).default([]),
  
  /** Simplified day-by-day plans (easier to edit than items) */
  dayPlans: z.array(dayPlanSchema).default([]),
  
  /** Current version number */
  version: z.number().int().positive().default(1),
  
  /** Terms and conditions */
  termsAndConditions: z.string().max(10000).optional(),
  /** Cancellation policy */
  cancellationPolicy: z.string().max(5000).optional(),
  
  /** Internal notes (agent only) */
  internalNotes: z.string().max(5000).optional(),
  
  /** Audit timestamps */
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  submittedAt: z.string().datetime().optional(),
  approvedAt: z.string().datetime().optional(),
  disclosedAt: z.string().datetime().optional(),
});

export type Itinerary = z.infer<typeof itinerarySchema>;

/**
 * Schema for creating a new itinerary.
 */
export const createItinerarySchema = z.object({
  requestId: z.string().uuid(),
  agentId: z.string().uuid(),
  travelerId: z.string().uuid(),
  overview: tripOverviewSchema,
  pricing: pricingInfoSchema.optional(),
  items: z.array(createItineraryItemSchema).default([]),
  termsAndConditions: z.string().max(10000).optional(),
  cancellationPolicy: z.string().max(5000).optional(),
  internalNotes: z.string().max(5000).optional(),
});

export type CreateItineraryInput = z.infer<typeof createItinerarySchema>;

/**
 * Schema for updating an itinerary.
 */
export const updateItinerarySchema = z.object({
  overview: z.object({
    title: z.string().min(1).max(200).optional(),
    summary: z.string().max(2000).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    numberOfDays: z.number().int().positive().max(365).optional(),
    numberOfNights: z.number().int().nonnegative().max(365).optional(),
    destinations: z.array(z.string().max(100)).max(50).optional(),
    travelersCount: z.number().int().positive().max(100).optional(),
    tripType: z.enum(['ADVENTURE', 'BEACH', 'CITY_BREAK', 'CRUISE', 'CULTURAL', 'FAMILY', 'HONEYMOON', 'LUXURY', 'SAFARI', 'SKI', 'WELLNESS', 'OTHER']).optional(),
  }).optional(),
  pricing: pricingInfoSchema.partial().optional(),
  /** Simplified day-by-day plans - will be converted to itinerary items */
  dayPlans: z.array(dayPlanSchema).max(365).optional(),
  termsAndConditions: z.string().max(10000).optional(),
  cancellationPolicy: z.string().max(5000).optional(),
  internalNotes: z.string().max(5000).optional(),
});

export type UpdateItineraryInput = z.infer<typeof updateItinerarySchema>;

/**
 * Itinerary with computed fields for API responses.
 */
export interface ItineraryWithMeta extends Itinerary {
  /** Whether full details are visible */
  isRevealed: boolean;
  /** Number of items */
  itemCount: number;
  /** Whether this is the latest version */
  isLatestVersion: boolean;
}

/**
 * Create itinerary with meta from base itinerary.
 */
export function withMeta(
  itinerary: Itinerary, 
  isLatestVersion: boolean = true
): ItineraryWithMeta {
  return {
    ...itinerary,
    isRevealed: itinerary.disclosureState === DisclosureState.REVEALED,
    itemCount: itinerary.items.length,
    isLatestVersion,
  };
}
