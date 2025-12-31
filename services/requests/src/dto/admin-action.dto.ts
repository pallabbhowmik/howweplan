/**
 * Admin Action DTOs
 */

import { z } from 'zod';

export const AdminCancelRequestSchema = z.object({
  reason: z
    .string()
    .min(10, 'Admin cancellation reason must be at least 10 characters')
    .max(1000, 'Reason too long')
    .trim(),
});

export type AdminCancelRequestDTO = z.infer<typeof AdminCancelRequestSchema>;

export const AdminExpireRequestSchema = z.object({
  reason: z
    .string()
    .min(10, 'Admin expiration reason must be at least 10 characters')
    .max(1000, 'Reason too long')
    .trim(),
});

export type AdminExpireRequestDTO = z.infer<typeof AdminExpireRequestSchema>;

export const AdminTransitionRequestSchema = z.object({
  toState: z.enum(['submitted', 'matching', 'matched', 'expired', 'cancelled', 'completed']),
  reason: z
    .string()
    .min(10, 'Admin action reason must be at least 10 characters')
    .max(1000, 'Reason too long')
    .trim(),
});

export type AdminTransitionRequestDTO = z.infer<typeof AdminTransitionRequestSchema>;
