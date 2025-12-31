import { z } from 'zod';
import { createSubmissionDtoSchema, submissionSourceSchema } from '../../models/index.js';

/**
 * Request DTO for creating a submission.
 */
export const createSubmissionRequestSchema = createSubmissionDtoSchema;
export type CreateSubmissionRequest = z.infer<typeof createSubmissionRequestSchema>;

/**
 * Response DTO for submission.
 */
export const submissionResponseSchema = z.object({
  id: z.string().uuid(),
  requestId: z.string().uuid(),
  agentId: z.string().uuid(),
  travelerId: z.string().uuid(),
  source: submissionSourceSchema,
  status: z.string(),
  statusLabel: z.string(),
  isProcessed: z.boolean(),
  isSuccessful: z.boolean(),
  resultingItineraryId: z.string().uuid().optional(),
  errorMessage: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  processedAt: z.string().datetime().optional(),
});

export type SubmissionResponse = z.infer<typeof submissionResponseSchema>;

/**
 * Query params for listing submissions.
 */
export const listSubmissionsQuerySchema = z.object({
  requestId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListSubmissionsQuery = z.infer<typeof listSubmissionsQuerySchema>;

/**
 * Paginated response wrapper.
 */
export const paginatedSubmissionsSchema = z.object({
  items: z.array(submissionResponseSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
});

export type PaginatedSubmissions = z.infer<typeof paginatedSubmissionsSchema>;
