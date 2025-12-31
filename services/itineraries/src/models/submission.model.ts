import { z } from 'zod';
import { submissionSourceSchema } from './enums.js';
import { createItinerarySchema } from './itinerary.model.js';

/**
 * Submission status tracking.
 */
export const SubmissionStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  PARSED: 'PARSED',
  FAILED: 'FAILED',
  COMPLETED: 'COMPLETED',
} as const;

export type SubmissionStatus = typeof SubmissionStatus[keyof typeof SubmissionStatus];

export const submissionStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'PARSED',
  'FAILED',
  'COMPLETED',
]);

/**
 * PDF submission content.
 */
export const pdfSubmissionSchema = z.object({
  source: z.literal('PDF_UPLOAD'),
  fileUrl: z.string().url(),
  fileName: z.string().max(255),
  fileSizeBytes: z.number().int().positive(),
  mimeType: z.literal('application/pdf'),
  pageCount: z.number().int().positive().optional(),
});

export type PdfSubmission = z.infer<typeof pdfSubmissionSchema>;

/**
 * External link submission content.
 */
export const linkSubmissionSchema = z.object({
  source: z.literal('EXTERNAL_LINK'),
  url: z.string().url(),
  linkTitle: z.string().max(200).optional(),
  linkDescription: z.string().max(1000).optional(),
});

export type LinkSubmission = z.infer<typeof linkSubmissionSchema>;

/**
 * Free text submission content.
 */
export const freeTextSubmissionSchema = z.object({
  source: z.literal('FREE_TEXT'),
  content: z.string().min(1).max(50000),
  format: z.enum(['PLAIN', 'MARKDOWN', 'HTML']).default('PLAIN'),
});

export type FreeTextSubmission = z.infer<typeof freeTextSubmissionSchema>;

/**
 * Structured input submission content.
 */
export const structuredSubmissionSchema = z.object({
  source: z.literal('STRUCTURED_INPUT'),
  data: createItinerarySchema.omit({ agentId: true, travelerId: true, requestId: true }),
});

export type StructuredSubmission = z.infer<typeof structuredSubmissionSchema>;

/**
 * Union of all submission content types.
 */
export const submissionContentSchema = z.discriminatedUnion('source', [
  pdfSubmissionSchema,
  linkSubmissionSchema,
  freeTextSubmissionSchema,
  structuredSubmissionSchema,
]);

export type SubmissionContent = z.infer<typeof submissionContentSchema>;

/**
 * Agent submission model.
 * Captures the original content submitted by an agent.
 */
export const submissionSchema = z.object({
  id: z.string().uuid(),
  
  /** Associated request ID */
  requestId: z.string().uuid(),
  /** Agent who submitted */
  agentId: z.string().uuid(),
  /** Traveler this is for */
  travelerId: z.string().uuid(),
  
  /** Submission source type */
  source: submissionSourceSchema,
  /** Submission content (type varies by source) */
  content: submissionContentSchema,
  
  /** Processing status */
  status: submissionStatusSchema.default('PENDING'),
  /** Processing error message if failed */
  errorMessage: z.string().max(1000).optional(),
  
  /** Resulting itinerary ID if processing succeeded */
  resultingItineraryId: z.string().uuid().optional(),
  
  /** Original raw content preserved for audit */
  originalContent: z.string().max(100000),
  /** Content hash for deduplication */
  contentHash: z.string().length(64),
  
  /** Audit timestamps */
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  processedAt: z.string().datetime().optional(),
});

export type Submission = z.infer<typeof submissionSchema>;

/**
 * DTO for creating a new submission.
 */
export const createSubmissionDtoSchema = z.object({
  requestId: z.string().uuid(),
  agentId: z.string().uuid(),
  travelerId: z.string().uuid(),
  content: submissionContentSchema,
});

export type CreateSubmissionDto = z.infer<typeof createSubmissionDtoSchema>;

/**
 * Submission with computed fields for API responses.
 */
export interface SubmissionWithMeta extends Submission {
  /** Whether processing is complete */
  isProcessed: boolean;
  /** Whether processing succeeded */
  isSuccessful: boolean;
  /** Human-readable status */
  statusLabel: string;
}

/**
 * Get status label for submission.
 */
function getStatusLabel(status: SubmissionStatus): string {
  const labels: Record<SubmissionStatus, string> = {
    PENDING: 'Awaiting Processing',
    PROCESSING: 'Processing Submission',
    PARSED: 'Content Parsed',
    FAILED: 'Processing Failed',
    COMPLETED: 'Itinerary Created',
  };
  return labels[status];
}

/**
 * Create submission with meta from base submission.
 */
export function withSubmissionMeta(submission: Submission): SubmissionWithMeta {
  return {
    ...submission,
    isProcessed: ['PARSED', 'FAILED', 'COMPLETED'].includes(submission.status),
    isSuccessful: submission.status === 'COMPLETED',
    statusLabel: getStatusLabel(submission.status),
  };
}
