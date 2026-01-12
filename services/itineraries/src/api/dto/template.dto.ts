import { z } from 'zod';

// ============================================================================
// Template Types
// ============================================================================

export const templateTypeSchema = z.enum(['full', 'day', 'activity', 'accommodation', 'transport', 'meal']);
export const budgetTierSchema = z.enum(['budget', 'mid-range', 'luxury', 'ultra-luxury']);

// ============================================================================
// Template Content Schemas
// ============================================================================

export const activityContentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  location: z.string().max(500).optional(),
  start_time: z.string().optional(),
  duration_minutes: z.number().int().positive().optional(),
  price: z.object({
    amount: z.number().nonnegative(),
    currency: z.string().length(3),
  }).optional(),
  type: z.enum(['activity', 'accommodation', 'transport', 'meal']).optional(),
}).passthrough();

export const dayContentSchema = z.object({
  day: z.number().int().positive(),
  title: z.string().min(1).max(200),
  activities: z.array(activityContentSchema).default([]),
  notes: z.string().max(2000).optional(),
});

export const templateContentSchema = z.object({
  // For 'full' templates
  days: z.array(dayContentSchema).optional(),
  inclusions: z.array(z.string().max(500)).optional(),
  exclusions: z.array(z.string().max(500)).optional(),
  notes: z.string().max(5000).optional(),
  
  // For 'day' templates
  title: z.string().max(200).optional(),
  activities: z.array(activityContentSchema).optional(),
  
  // For individual component templates
  name: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  location: z.string().max(500).optional(),
  price: z.object({
    amount: z.number().nonnegative(),
    currency: z.string().length(3),
  }).optional(),
  duration_minutes: z.number().int().positive().optional(),
  start_time: z.string().optional(),
}).passthrough();

// ============================================================================
// Request Schemas
// ============================================================================

export const createTemplateRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  description: z.string().max(2000).nullable().optional(),
  templateType: templateTypeSchema,
  content: templateContentSchema,
  destinations: z.array(z.string().max(100)).max(20).default([]),
  travelStyles: z.array(z.string().max(50)).max(10).default([]),
  durationDays: z.number().int().positive().max(365).nullable().optional(),
  budgetTier: budgetTierSchema.nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  isFavorite: z.boolean().default(false),
});

export const updateTemplateRequestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  content: templateContentSchema.optional(),
  destinations: z.array(z.string().max(100)).max(20).optional(),
  travelStyles: z.array(z.string().max(50)).max(10).optional(),
  durationDays: z.number().int().positive().max(365).nullable().optional(),
  budgetTier: budgetTierSchema.nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  isFavorite: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export const listTemplatesQuerySchema = z.object({
  templateType: templateTypeSchema.optional(),
  destination: z.string().max(100).optional(),
  travelStyle: z.string().max(50).optional(),
  budgetTier: budgetTierSchema.optional(),
  tag: z.string().max(50).optional(),
  isFavorite: z.coerce.boolean().optional(),
  isArchived: z.coerce.boolean().optional(),
  search: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const suggestionsQuerySchema = z.object({
  destination: z.string().max(100).optional(),
  travelStyle: z.string().max(50).optional(),
  duration: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const duplicateTemplateRequestSchema = z.object({
  newName: z.string().min(1).max(200).optional(),
});

export const recordUsageRequestSchema = z.object({
  itineraryId: z.string().uuid().optional(),
  destination: z.string().max(100).optional(),
  travelStyle: z.string().max(50).optional(),
});

// ============================================================================
// Response Types
// ============================================================================

export type CreateTemplateRequest = z.infer<typeof createTemplateRequestSchema>;
export type UpdateTemplateRequest = z.infer<typeof updateTemplateRequestSchema>;
export type ListTemplatesQuery = z.infer<typeof listTemplatesQuerySchema>;
export type SuggestionsQuery = z.infer<typeof suggestionsQuerySchema>;
export type DuplicateTemplateRequest = z.infer<typeof duplicateTemplateRequestSchema>;
export type RecordUsageRequest = z.infer<typeof recordUsageRequestSchema>;
