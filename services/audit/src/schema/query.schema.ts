import { z } from 'zod';
import { EventCategorySchema, SeveritySchema, ActorTypeSchema } from './audit-event.schema';

/**
 * Pagination parameters
 */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export type Pagination = z.infer<typeof PaginationSchema>;

/**
 * Date range filter
 */
export const DateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.from && data.to) {
      return new Date(data.from) <= new Date(data.to);
    }
    return true;
  },
  { message: 'from date must be before or equal to date' }
);

export type DateRange = z.infer<typeof DateRangeSchema>;

/**
 * Query filters for audit events
 */
export const AuditQueryFiltersSchema = z.object({
  // Event filters
  eventTypes: z.array(z.string()).optional(),
  categories: z.array(EventCategorySchema).optional(),
  severities: z.array(SeveritySchema).optional(),
  
  // Actor filters
  actorTypes: z.array(ActorTypeSchema).optional(),
  actorIds: z.array(z.string().uuid()).optional(),
  
  // Resource filters
  resourceTypes: z.array(z.string()).optional(),
  resourceIds: z.array(z.string()).optional(),
  
  // Correlation
  correlationId: z.string().uuid().optional(),
  causationId: z.string().uuid().optional(),
  
  // Date range
  dateRange: DateRangeSchema.optional(),
  
  // Compliance filters
  gdprRelevant: z.boolean().optional(),
  piiContained: z.boolean().optional(),
  retentionCategories: z.array(z.enum(['standard', 'legal', 'financial', 'extended'])).optional(),
  
  // Source filters
  services: z.array(z.string()).optional(),
  
  // Text search (searches in reason and metadata)
  searchText: z.string().max(500).optional(),
});

export type AuditQueryFilters = z.infer<typeof AuditQueryFiltersSchema>;

/**
 * Sort options for query results
 */
export const SortOptionsSchema = z.object({
  field: z.enum(['timestamp', 'sequenceNumber', 'eventType', 'severity']).default('timestamp'),
  direction: z.enum(['asc', 'desc']).default('desc'),
});

export type SortOptions = z.infer<typeof SortOptionsSchema>;

/**
 * Complete query request
 */
export const AuditQueryRequestSchema = z.object({
  filters: AuditQueryFiltersSchema.optional(),
  pagination: PaginationSchema.optional(),
  sort: SortOptionsSchema.optional(),
});

export type AuditQueryRequest = z.infer<typeof AuditQueryRequestSchema>;

/**
 * Query response with pagination metadata
 */
export const AuditQueryResponseSchema = z.object({
  data: z.array(z.any()), // StoredAuditEvent[]
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  }),
  query: z.object({
    executedAt: z.string().datetime(),
    durationMs: z.number(),
  }),
});

export type AuditQueryResponse = z.infer<typeof AuditQueryResponseSchema>;

/**
 * Get single event by ID request
 */
export const GetEventByIdRequestSchema = z.object({
  id: z.string().uuid(),
});

export type GetEventByIdRequest = z.infer<typeof GetEventByIdRequestSchema>;

/**
 * Get events by correlation ID request
 */
export const GetEventsByCorrelationIdRequestSchema = z.object({
  correlationId: z.string().uuid(),
  pagination: PaginationSchema.optional(),
});

export type GetEventsByCorrelationIdRequest = z.infer<typeof GetEventsByCorrelationIdRequestSchema>;

/**
 * Get resource history request
 */
export const GetResourceHistoryRequestSchema = z.object({
  resourceType: z.string().min(1),
  resourceId: z.string().min(1),
  pagination: PaginationSchema.optional(),
});

export type GetResourceHistoryRequest = z.infer<typeof GetResourceHistoryRequestSchema>;

/**
 * Get actor activity request
 */
export const GetActorActivityRequestSchema = z.object({
  actorId: z.string().uuid(),
  dateRange: DateRangeSchema.optional(),
  pagination: PaginationSchema.optional(),
});

export type GetActorActivityRequest = z.infer<typeof GetActorActivityRequestSchema>;

/**
 * Audit statistics response
 */
export const AuditStatisticsResponseSchema = z.object({
  totalEvents: z.number(),
  eventsByCategory: z.record(z.number()),
  eventsBySeverity: z.record(z.number()),
  eventsPerDay: z.array(z.object({
    date: z.string(),
    count: z.number(),
  })),
  topEventTypes: z.array(z.object({
    eventType: z.string(),
    count: z.number(),
  })),
  topActors: z.array(z.object({
    actorId: z.string(),
    actorType: z.string(),
    count: z.number(),
  })),
  dateRange: z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  }),
  generatedAt: z.string().datetime(),
});

export type AuditStatisticsResponse = z.infer<typeof AuditStatisticsResponseSchema>;
