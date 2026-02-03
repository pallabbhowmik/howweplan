import { z } from 'zod';
import { 
  createItinerarySchema, 
  updateItinerarySchema,
  createItineraryItemSchema,
  updateItineraryItemSchema,
  itineraryStatusSchema,
  disclosureStateSchema,
  itineraryItemTypeSchema,
  dayPlanSchema,
} from '../../models/index.js';

/**
 * Request DTO for creating an itinerary.
 */
export const createItineraryRequestSchema = createItinerarySchema;
export type CreateItineraryRequest = z.infer<typeof createItineraryRequestSchema>;

/**
 * Request DTO for updating an itinerary.
 */
export const updateItineraryRequestSchema = updateItinerarySchema.extend({
  changeReason: z.string().max(500).optional(),
});
export type UpdateItineraryRequest = z.infer<typeof updateItineraryRequestSchema>;

/**
 * Request DTO for adding an item.
 */
export const addItemRequestSchema = createItineraryItemSchema;
export type AddItemRequest = z.infer<typeof addItemRequestSchema>;

/**
 * Request DTO for updating an item.
 */
export const updateItemRequestSchema = updateItineraryItemSchema;
export type UpdateItemRequest = z.infer<typeof updateItemRequestSchema>;

/**
 * Request DTO for status change.
 */
export const changeStatusRequestSchema = z.object({
  status: itineraryStatusSchema,
  reason: z.string().max(500).optional(),
});
export type ChangeStatusRequest = z.infer<typeof changeStatusRequestSchema>;

/**
 * Item response DTO.
 */
export const itineraryItemResponseSchema = z.object({
  id: z.string().uuid(),
  type: itineraryItemTypeSchema,
  dayNumber: z.number().int().positive(),
  sequence: z.number().int().nonnegative(),
  title: z.string(),
  description: z.string().optional(),
  location: z.object({
    city: z.string(),
    country: z.string(),
    region: z.string().optional(),
  }),
  timeRange: z.object({
    startDate: z.string(),
    endDate: z.string(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
  }),
  vendor: z.object({
    name: z.string(),
    category: z.string(),
    starRating: z.number().optional(),
  }).optional(),
  travelerNotes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ItineraryItemResponse = z.infer<typeof itineraryItemResponseSchema>;

/**
 * Itinerary response DTO.
 */
export const itineraryResponseSchema = z.object({
  id: z.string().uuid(),
  requestId: z.string().uuid(),
  agentId: z.string().uuid(),
  travelerId: z.string().uuid(),
  status: itineraryStatusSchema,
  disclosureState: disclosureStateSchema,
  isRevealed: z.boolean(),
  overview: z.object({
    title: z.string(),
    summary: z.string().optional(),
    startDate: z.string(),
    endDate: z.string(),
    numberOfDays: z.number(),
    numberOfNights: z.number(),
    destinations: z.array(z.string()),
    travelersCount: z.number(),
    tripType: z.string().optional(),
  }),
  pricing: z.object({
    currency: z.string(),
    totalPrice: z.number(),
    pricePerPerson: z.number().optional(),
    depositAmount: z.number().optional(),
    inclusions: z.array(z.string()),
    exclusions: z.array(z.string()),
  }).optional(),
  dayPlans: z.array(dayPlanSchema).optional(),
  items: z.array(itineraryItemResponseSchema),
  itemCount: z.number(),
  version: z.number(),
  isLatestVersion: z.boolean(),
  termsAndConditions: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  submittedAt: z.string().optional(),
  approvedAt: z.string().optional(),
  disclosedAt: z.string().optional(),
});

export type ItineraryResponse = z.infer<typeof itineraryResponseSchema>;

/**
 * Query params for listing itineraries.
 */
export const listItinerariesQuerySchema = z.object({
  requestId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  travelerId: z.string().uuid().optional(),
  status: itineraryStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListItinerariesQuery = z.infer<typeof listItinerariesQuerySchema>;

/**
 * Paginated itineraries response.
 */
export const paginatedItinerariesSchema = z.object({
  items: z.array(itineraryResponseSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
});

export type PaginatedItineraries = z.infer<typeof paginatedItinerariesSchema>;
