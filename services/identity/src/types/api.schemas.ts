/**
 * Request/response schemas for the Identity & Access service API.
 * Uses Zod for runtime validation of all inputs.
 */

import { z } from 'zod';
import {
  UserRole,
  AccountStatus,
  AgentVerificationStatus,
  ALL_ROLES,
} from './identity.types.js';

// ─────────────────────────────────────────────────────────────────────────────
// COMMON SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * UUID v4 format validation.
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Email validation with normalization.
 */
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .transform((email) => email.toLowerCase().trim());

/**
 * Password requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Name validation (first/last name).
 */
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[\p{L}\s'-]+$/u, 'Name contains invalid characters');

/**
 * Admin reason validation.
 * Per business rules: all admin actions require a reason.
 */
export const adminReasonSchema = z
  .string()
  .min(10, 'Reason must be at least 10 characters')
  .max(1000, 'Reason must be less than 1000 characters');

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Login request schema.
 */
export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

/**
 * Registration request schema.
 */
export const registerRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  role: z.enum([UserRole.USER, UserRole.AGENT] as const, {
    errorMap: () => ({ message: 'Role must be USER or AGENT' }),
  }),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;

/**
 * Token refresh request schema.
 */
export const refreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenRequest = z.infer<typeof refreshTokenRequestSchema>;

/**
 * Authentication response schema.
 */
export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  tokenType: z.literal('Bearer'),
  user: z.object({
    id: uuidSchema,
    email: emailSchema,
    firstName: nameSchema,
    lastName: nameSchema,
    role: z.enum(ALL_ROLES as unknown as [string, ...string[]]),
    status: z.enum(Object.values(AccountStatus) as [string, ...string[]]),
  }),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// USER MANAGEMENT SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update user profile request schema.
 */
export const updateUserProfileRequestSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  photoUrl: z.string().url('Invalid photo URL').nullable().optional(),
});

export type UpdateUserProfileRequest = z.infer<typeof updateUserProfileRequestSchema>;

/**
 * Change password request schema.
 */
export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// AGENT VERIFICATION SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Agent profile update request schema.
 */
export const updateAgentProfileRequestSchema = z.object({
  businessName: z.string().max(200).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  specialties: z.array(z.string().max(50)).max(20).optional(),
});

export type UpdateAgentProfileRequest = z.infer<typeof updateAgentProfileRequestSchema>;

/**
 * Submit verification request schema.
 */
export const submitVerificationRequestSchema = z.object({
  documentType: z.enum(['PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID', 'BUSINESS_LICENSE']),
  documentUrl: z.string().url('Invalid document URL'),
  additionalNotes: z.string().max(1000).optional(),
});

export type SubmitVerificationRequest = z.infer<typeof submitVerificationRequestSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Admin action base schema with required reason.
 */
const adminActionBaseSchema = z.object({
  reason: adminReasonSchema,
  referenceId: z.string().max(100).optional(),
});

/**
 * Admin update account status request schema.
 */
export const adminUpdateAccountStatusRequestSchema = adminActionBaseSchema.extend({
  status: z.enum(Object.values(AccountStatus) as [string, ...string[]]),
});

export type AdminUpdateAccountStatusRequest = z.infer<typeof adminUpdateAccountStatusRequestSchema>;

/**
 * Admin review verification request schema.
 */
export const adminReviewVerificationRequestSchema = adminActionBaseSchema.extend({
  decision: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().max(500).optional(),
});

export type AdminReviewVerificationRequest = z.infer<typeof adminReviewVerificationRequestSchema>;

/**
 * Admin list users query schema.
 */
export const adminListUsersQuerySchema = z.object({
  role: z.enum(ALL_ROLES as unknown as [string, ...string[]]).optional(),
  status: z.enum(Object.values(AccountStatus) as [string, ...string[]]).optional(),
  verificationStatus: z
    .enum(Object.values(AgentVerificationStatus) as [string, ...string[]])
    .optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'email', 'firstName', 'lastName']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type AdminListUsersQuery = z.infer<typeof adminListUsersQuerySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// ERROR RESPONSE SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Standard error response schema.
 */
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
  requestId: z.string(),
  timestamp: z.string(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

/**
 * Standard success response wrapper.
 */
export const successResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    requestId: z.string(),
    timestamp: z.string(),
  });
