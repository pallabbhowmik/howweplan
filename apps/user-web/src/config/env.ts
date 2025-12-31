/**
 * Environment Variable Validation for User Web App
 * =================================================
 * 
 * This module validates all required NEXT_PUBLIC_* environment variables
 * at build time. The application will fail to build if required variables
 * are missing or invalid.
 * 
 * SECURITY: This file must NEVER import or validate secret keys.
 * Only NEXT_PUBLIC_* prefixed variables are permitted in frontend apps.
 */

import { z } from 'zod';

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

/**
 * Environment enumeration for runtime checks
 */
const AppEnvironment = z.enum(['development', 'staging', 'production']);

/**
 * URL validation that accepts both http and https
 */
const urlSchema = z.string().url('Must be a valid URL');

/**
 * WebSocket URL validation
 */
const wsUrlSchema = z.string().refine(
  (val) => val.startsWith('ws://') || val.startsWith('wss://'),
  { message: 'Must be a valid WebSocket URL (ws:// or wss://)' }
);

/**
 * Stripe publishable key validation
 * Must start with pk_test_ or pk_live_
 */
const stripePublishableKeySchema = z.string().refine(
  (val) => val.startsWith('pk_test_') || val.startsWith('pk_live_'),
  { message: 'Stripe publishable key must start with pk_test_ or pk_live_' }
);

/**
 * Currency code validation (ISO 4217)
 */
const currencyCode = z
  .string()
  .optional()
  .transform((val) => (val ? val.toUpperCase() : 'USD'))
  .pipe(z.string().length(3));

/**
 * Locale validation (BCP 47)
 */
const localeSchema = z
  .string()
  .optional()
  .transform((val) => val || 'en-US')
  .pipe(z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Must be a valid locale (e.g., en-US)'));

// ============================================================================
// MAIN ENVIRONMENT SCHEMA
// ============================================================================

const clientEnvSchema = z.object({
  // App Metadata
  NEXT_PUBLIC_APP_NAME: z.string().optional().default('HowWePlan'),
  NEXT_PUBLIC_APP_VERSION: z.string().optional().default('1.0.0'),
  NEXT_PUBLIC_APP_ENV: z.string().optional().default('development').pipe(AppEnvironment),

  // API Connectivity
  NEXT_PUBLIC_API_BASE_URL: urlSchema,
  NEXT_PUBLIC_WS_URL: wsUrlSchema,
  NEXT_PUBLIC_API_TIMEOUT_MS: z.string().optional().default('30000').transform((val) => parseInt(val, 10)),

  // Authentication (Supabase)
  NEXT_PUBLIC_SUPABASE_URL: urlSchema,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),

  // Payments (Stripe)
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: stripePublishableKeySchema,

  // Feature Toggles
  NEXT_PUBLIC_FEATURE_DISPUTES_ENABLED: z.string().optional().default('true').transform((val) => val === 'true'),
  NEXT_PUBLIC_FEATURE_CHAT_ENABLED: z.string().optional().default('true').transform((val) => val === 'true'),
  NEXT_PUBLIC_FEATURE_REVIEWS_ENABLED: z.string().optional().default('true').transform((val) => val === 'true'),
  NEXT_PUBLIC_FEATURE_MULTI_CURRENCY: z.string().optional().default('false').transform((val) => val === 'true'),

  // Operational Limits
  NEXT_PUBLIC_MAX_UPLOAD_SIZE_BYTES: z.string().optional().default('5242880').transform((val) => parseInt(val, 10)),
  NEXT_PUBLIC_MAX_TRAVELERS_PER_REQUEST: z.string().optional().default('20').transform((val) => parseInt(val, 10)),
  NEXT_PUBLIC_MAX_OPTIONS_DISPLAY: z.string().optional().default('10').transform((val) => parseInt(val, 10)),
  NEXT_PUBLIC_CHAT_MESSAGE_MAX_LENGTH: z.string().optional().default('2000').transform((val) => parseInt(val, 10)),

  // Observability (optional)
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional().default(''),
  NEXT_PUBLIC_ANALYTICS_ENABLED: z.string().optional().default('false').transform((val) => val === 'true'),
  NEXT_PUBLIC_ANALYTICS_ID: z.string().optional().default(''),

  // UI Configuration
  NEXT_PUBLIC_DEFAULT_CURRENCY: currencyCode,
  NEXT_PUBLIC_DEFAULT_LOCALE: localeSchema,
  NEXT_PUBLIC_SUPPORT_EMAIL: z.string().email('Must be a valid email'),
  NEXT_PUBLIC_TERMS_URL: z.string().optional().default('/legal/terms'),
  NEXT_PUBLIC_PRIVACY_URL: z.string().optional().default('/legal/privacy'),
});

// ============================================================================
// VALIDATION & EXPORT
// ============================================================================

/**
 * Validates environment variables and returns typed config.
 * Throws with detailed error messages if validation fails.
 */
function validateEnv() {
  const rawEnv = {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_API_TIMEOUT_MS: process.env.NEXT_PUBLIC_API_TIMEOUT_MS,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_FEATURE_DISPUTES_ENABLED: process.env.NEXT_PUBLIC_FEATURE_DISPUTES_ENABLED,
    NEXT_PUBLIC_FEATURE_CHAT_ENABLED: process.env.NEXT_PUBLIC_FEATURE_CHAT_ENABLED,
    NEXT_PUBLIC_FEATURE_REVIEWS_ENABLED: process.env.NEXT_PUBLIC_FEATURE_REVIEWS_ENABLED,
    NEXT_PUBLIC_FEATURE_MULTI_CURRENCY: process.env.NEXT_PUBLIC_FEATURE_MULTI_CURRENCY,
    NEXT_PUBLIC_MAX_UPLOAD_SIZE_BYTES: process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE_BYTES,
    NEXT_PUBLIC_MAX_TRAVELERS_PER_REQUEST: process.env.NEXT_PUBLIC_MAX_TRAVELERS_PER_REQUEST,
    NEXT_PUBLIC_MAX_OPTIONS_DISPLAY: process.env.NEXT_PUBLIC_MAX_OPTIONS_DISPLAY,
    NEXT_PUBLIC_CHAT_MESSAGE_MAX_LENGTH: process.env.NEXT_PUBLIC_CHAT_MESSAGE_MAX_LENGTH,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_ANALYTICS_ENABLED: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED,
    NEXT_PUBLIC_ANALYTICS_ID: process.env.NEXT_PUBLIC_ANALYTICS_ID,
    NEXT_PUBLIC_DEFAULT_CURRENCY: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY,
    NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
    NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
    NEXT_PUBLIC_TERMS_URL: process.env.NEXT_PUBLIC_TERMS_URL,
    NEXT_PUBLIC_PRIVACY_URL: process.env.NEXT_PUBLIC_PRIVACY_URL,
  };

  const result = clientEnvSchema.safeParse(rawEnv);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([key, messages]) => `  ${key}: ${messages?.join(', ')}`)
      .join('\n');

    throw new Error(
      `\n❌ Environment validation failed:\n${errorMessages}\n\n` +
      `Please check your .env.local file against .env.example\n`
    );
  }

  return result.data;
}

/**
 * Validated environment configuration.
 * This is evaluated at module load time (build time for Next.js).
 */
export const env = validateEnv();

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type AppEnvironment = z.infer<typeof AppEnvironment>;
