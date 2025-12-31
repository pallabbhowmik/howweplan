/**
 * Cancel Request DTO
 */

import { z } from 'zod';

export const CancelRequestSchema = z.object({
  reason: z
    .string()
    .min(5, 'Cancellation reason must be at least 5 characters')
    .max(500, 'Cancellation reason too long')
    .trim(),
});

export type CancelRequestDTO = z.infer<typeof CancelRequestSchema>;
