/**
 * Input Validators
 * 
 * Centralized input validation using Zod schemas.
 * Validate all inputs, even from internal services per architecture rules.
 */

import { z } from 'zod';
import {
  DisputeCreateDTOSchema,
  EvidenceSubmitDTOSchema,
  AgentResponseDTOSchema,
  AdminDecisionDTOSchema,
  AdminEscalateDTOSchema,
  AdminNoteDTOSchema,
  DisputeWithdrawDTOSchema,
  DisputeListQuerySchema,
  AdminQueueQuerySchema,
} from '../types/dto.js';

/**
 * Validation result type.
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: string[] };

/**
 * Generic validation function.
 */
function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.errors.map((err) => {
    const path = err.path.join('.');
    return path ? `${path}: ${err.message}` : err.message;
  });

  return { success: false, errors };
}

/**
 * Validate dispute creation input.
 */
export function validateDisputeCreate(data: unknown) {
  return validate(DisputeCreateDTOSchema, data);
}

/**
 * Validate evidence submission input.
 */
export function validateEvidenceSubmit(data: unknown) {
  return validate(EvidenceSubmitDTOSchema, data);
}

/**
 * Validate agent response input.
 */
export function validateAgentResponse(data: unknown) {
  return validate(AgentResponseDTOSchema, data);
}

/**
 * Validate admin decision input.
 */
export function validateAdminDecision(data: unknown) {
  return validate(AdminDecisionDTOSchema, data);
}

/**
 * Validate admin escalation input.
 */
export function validateAdminEscalate(data: unknown) {
  return validate(AdminEscalateDTOSchema, data);
}

/**
 * Validate admin note input.
 */
export function validateAdminNote(data: unknown) {
  return validate(AdminNoteDTOSchema, data);
}

/**
 * Validate dispute withdrawal input.
 */
export function validateDisputeWithdraw(data: unknown) {
  return validate(DisputeWithdrawDTOSchema, data);
}

/**
 * Validate dispute list query parameters.
 */
export function validateDisputeListQuery(data: unknown) {
  return validate(DisputeListQuerySchema, data);
}

/**
 * Validate admin queue query parameters.
 */
export function validateAdminQueueQuery(data: unknown) {
  return validate(AdminQueueQuerySchema, data);
}

/**
 * UUID validation schema.
 */
const UUIDSchema = z.string().uuid();

/**
 * Validate UUID format.
 */
export function validateUUID(value: string): boolean {
  return UUIDSchema.safeParse(value).success;
}

/**
 * Validate and parse UUID, throwing on invalid.
 */
export function parseUUID(value: string): string {
  const result = UUIDSchema.safeParse(value);
  if (!result.success) {
    throw new Error('Invalid UUID format');
  }
  return result.data;
}

/**
 * Internal service request validation.
 * Even internal services must have their inputs validated per architecture rules.
 */
export const InternalRequestSchema = z.object({
  serviceToken: z.string().min(1),
  correlationId: z.string().uuid(),
  timestamp: z.string().datetime(),
});

export function validateInternalRequest(data: unknown) {
  return validate(InternalRequestSchema, data);
}

/**
 * Booking details validation for dispute creation.
 */
export const BookingDetailsSchema = z.object({
  bookingId: z.string().uuid(),
  travelerId: z.string().uuid(),
  agentId: z.string().uuid(),
  status: z.string(),
  totalAmount: z.number().positive(),
  currency: z.string().length(3),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  destination: z.string().min(1),
  itineraryId: z.string().uuid(),
  chatThreadId: z.string().uuid(),
  completedAt: z.coerce.date().nullable(),
});

export function validateBookingDetails(data: unknown) {
  return validate(BookingDetailsSchema, data);
}
