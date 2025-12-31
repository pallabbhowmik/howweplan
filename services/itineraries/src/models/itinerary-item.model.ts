import { z } from 'zod';
import { itineraryItemTypeSchema } from './enums.js';

/**
 * Location details for an itinerary item.
 */
export const locationSchema = z.object({
  city: z.string().min(1).max(100),
  country: z.string().min(1).max(100),
  region: z.string().max(100).optional(),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
});

export type Location = z.infer<typeof locationSchema>;

/**
 * Time range for an itinerary item.
 */
export const timeRangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  timezone: z.string().default('UTC'),
}).refine((data: { startDate: string; endDate: string }) => new Date(data.startDate) <= new Date(data.endDate), {
  message: 'Start date must be before or equal to end date',
});

export type TimeRange = z.infer<typeof timeRangeSchema>;

/**
 * Vendor information (sensitive - requires obfuscation pre-payment).
 */
export const vendorInfoSchema = z.object({
  /** Exact vendor name - OBFUSCATED pre-payment */
  name: z.string().min(1).max(200),
  /** Vendor category for obfuscation */
  category: z.string().min(1).max(100),
  /** Star rating if applicable */
  starRating: z.number().int().min(1).max(5).optional(),
  /** Vendor contact - OBFUSCATED pre-payment */
  contactEmail: z.string().email().optional(),
  /** Vendor phone - OBFUSCATED pre-payment */
  contactPhone: z.string().max(30).optional(),
  /** Booking reference - OBFUSCATED pre-payment */
  bookingReference: z.string().max(100).optional(),
  /** Confirmation number - OBFUSCATED pre-payment */
  confirmationNumber: z.string().max(100).optional(),
});

export type VendorInfo = z.infer<typeof vendorInfoSchema>;

/**
 * Accommodation-specific details.
 */
export const accommodationDetailsSchema = z.object({
  roomType: z.string().max(100).optional(),
  boardBasis: z.enum(['ROOM_ONLY', 'BED_AND_BREAKFAST', 'HALF_BOARD', 'FULL_BOARD', 'ALL_INCLUSIVE']).optional(),
  amenities: z.array(z.string().max(50)).max(20).default([]),
  checkInTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  checkOutTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  numberOfNights: z.number().int().positive().optional(),
  numberOfRooms: z.number().int().positive().default(1),
});

export type AccommodationDetails = z.infer<typeof accommodationDetailsSchema>;

/**
 * Transport-specific details.
 */
export const transportDetailsSchema = z.object({
  mode: z.enum(['FLIGHT', 'TRAIN', 'BUS', 'FERRY', 'CAR', 'OTHER']),
  carrier: z.string().max(100).optional(),
  flightNumber: z.string().max(20).optional(),
  departureTerminal: z.string().max(50).optional(),
  arrivalTerminal: z.string().max(50).optional(),
  seatClass: z.string().max(50).optional(),
  baggageAllowance: z.string().max(100).optional(),
});

export type TransportDetails = z.infer<typeof transportDetailsSchema>;

/**
 * Activity-specific details.
 */
export const activityDetailsSchema = z.object({
  activityType: z.string().max(100),
  duration: z.string().max(50).optional(),
  difficulty: z.enum(['EASY', 'MODERATE', 'CHALLENGING', 'EXTREME']).optional(),
  groupSize: z.string().max(50).optional(),
  inclusions: z.array(z.string().max(200)).max(20).default([]),
  exclusions: z.array(z.string().max(200)).max(20).default([]),
  requirements: z.array(z.string().max(200)).max(10).default([]),
});

export type ActivityDetails = z.infer<typeof activityDetailsSchema>;

/**
 * Single item within an itinerary.
 */
export const itineraryItemSchema = z.object({
  id: z.string().uuid(),
  itineraryId: z.string().uuid(),
  type: itineraryItemTypeSchema,
  dayNumber: z.number().int().positive(),
  sequence: z.number().int().nonnegative(),
  
  /** Display title (may be generic) */
  title: z.string().min(1).max(200),
  /** Detailed description */
  description: z.string().max(2000).optional(),
  
  location: locationSchema,
  timeRange: timeRangeSchema,
  
  /** Vendor information - sensitive data */
  vendor: vendorInfoSchema.optional(),
  
  /** Type-specific details */
  accommodationDetails: accommodationDetailsSchema.optional(),
  transportDetails: transportDetailsSchema.optional(),
  activityDetails: activityDetailsSchema.optional(),
  
  /** Agent notes (internal) */
  agentNotes: z.string().max(1000).optional(),
  /** Notes visible to traveler */
  travelerNotes: z.string().max(1000).optional(),
  
  /** Metadata */
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ItineraryItem = z.infer<typeof itineraryItemSchema>;

/**
 * Schema for creating a new itinerary item.
 */
export const createItineraryItemSchema = itineraryItemSchema.omit({
  id: true,
  itineraryId: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateItineraryItemInput = z.infer<typeof createItineraryItemSchema>;

/**
 * Schema for updating an itinerary item.
 */
export const updateItineraryItemSchema = createItineraryItemSchema.partial();

export type UpdateItineraryItemInput = z.infer<typeof updateItineraryItemSchema>;
