/**
 * =============================================================================
 * AGENT WEB APP - Environment Validation
 * =============================================================================
 * 
 * This module validates all required environment variables at BUILD TIME.
 * The application will fail to build if required variables are missing.
 * 
 * SECURITY ENFORCEMENT:
 * - Only NEXT_PUBLIC_* variables are permitted in this frontend app
 * - No secrets, database credentials, or service role keys
 * - No payment processing keys (agents do not handle payments)
 * - No user contact information access pre-payment
 * 
 * =============================================================================
 */

import { z } from 'zod';

// =============================================================================
// SCHEMA DEFINITION
// =============================================================================

const envSchema = z.object({
  // ---------------------------------------------------------------------------
  // APP METADATA
  // ---------------------------------------------------------------------------
  NEXT_PUBLIC_APP_NAME: z
    .string()
    .min(1, 'App name is required')
    .default('HowWePlan Agent Portal'),
  
  NEXT_PUBLIC_APP_VERSION: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, 'Version must be semver format (x.y.z)')
    .default('1.0.0'),
  
  NEXT_PUBLIC_APP_ENV: z
    .enum(['development', 'staging', 'production'])
    .default('development'),

  // ---------------------------------------------------------------------------
  // API CONNECTIVITY
  // ---------------------------------------------------------------------------
  NEXT_PUBLIC_API_BASE_URL: z
    .string()
    .url('API base URL must be a valid URL')
    .refine(
      (url: string) => url.startsWith('http://') || url.startsWith('https://'),
      'API URL must use http or https protocol'
    ),
  
  NEXT_PUBLIC_WS_URL: z
    .string()
    .refine(
      (url: string) => url.startsWith('ws://') || url.startsWith('wss://'),
      'WebSocket URL must use ws or wss protocol'
    ),

  // ---------------------------------------------------------------------------
  // AUTHENTICATION (Supabase Public Only)
  // ---------------------------------------------------------------------------
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('Supabase URL must be a valid URL'),
  
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'Supabase anon key is required')
    .refine(
      (key: string) => !key.includes('service_role'),
      'SECURITY VIOLATION: Service role key detected. Only anon key is permitted in frontend.'
    ),

  // ---------------------------------------------------------------------------
  // FILE UPLOADS
  // ---------------------------------------------------------------------------
  NEXT_PUBLIC_STORAGE_URL: z
    .string()
    .url('Storage URL must be a valid URL'),
  
  NEXT_PUBLIC_MAX_UPLOAD_SIZE_BYTES: z
    .string()
    .transform((val: string) => parseInt(val, 10))
    .pipe(z.number().min(1024).max(52428800)) // 1KB to 50MB
    .default('10485760'),
  
  NEXT_PUBLIC_ALLOWED_UPLOAD_TYPES: z
    .string()
    .default('application/pdf,text/plain,text/markdown'),

  // ---------------------------------------------------------------------------
  // FEATURE TOGGLES
  // ---------------------------------------------------------------------------
  NEXT_PUBLIC_FEATURE_REALTIME_NOTIFICATIONS: z
    .string()
    .transform((val: string) => val === 'true')
    .default('true'),
  
  NEXT_PUBLIC_FEATURE_PLATFORM_CHAT: z
    .string()
    .transform((val: string) => val === 'true')
    .refine(
      (val: boolean) => val === true,
      'CONSTITUTION VIOLATION: Platform chat MUST be enabled. Chat is mandatory before payment.'
    )
    .default('true'),
  
  NEXT_PUBLIC_FEATURE_LINK_ITINERARIES: z
    .string()
    .transform((val: string) => val === 'true')
    .default('true'),
  
  NEXT_PUBLIC_FEATURE_TEXT_ITINERARIES: z
    .string()
    .transform((val: string) => val === 'true')
    .default('true'),

  // ---------------------------------------------------------------------------
  // OPERATIONAL LIMITS
  // ---------------------------------------------------------------------------
  NEXT_PUBLIC_MAX_ACTIVE_REQUESTS: z
    .string()
    .transform((val: string) => parseInt(val, 10))
    .pipe(z.number().min(1).max(100))
    .default('10'),
  
  NEXT_PUBLIC_REQUEST_RESPONSE_TIMEOUT_HOURS: z
    .string()
    .transform((val: string) => parseInt(val, 10))
    .pipe(z.number().min(1).max(168)) // 1 hour to 1 week
    .default('24'),
  
  NEXT_PUBLIC_MAX_ITINERARY_REVISIONS: z
    .string()
    .transform((val: string) => parseInt(val, 10))
    .pipe(z.number().min(1).max(10))
    .default('3'),

  // ---------------------------------------------------------------------------
  // UI CONFIGURATION
  // ---------------------------------------------------------------------------
  NEXT_PUBLIC_REQUESTS_PER_PAGE: z
    .string()
    .transform((val: string) => parseInt(val, 10))
    .pipe(z.number().min(5).max(100))
    .default('20'),
  
  NEXT_PUBLIC_INBOX_REFRESH_INTERVAL_MS: z
    .string()
    .transform((val: string) => parseInt(val, 10))
    .pipe(z.number().min(5000).max(300000)) // 5 seconds to 5 minutes
    .default('30000'),

  // ---------------------------------------------------------------------------
  // OBSERVABILITY (Frontend)
  // ---------------------------------------------------------------------------
  NEXT_PUBLIC_ENABLE_ERROR_TRACKING: z
    .string()
    .transform((val: string) => val === 'true')
    .default('true'),
  
  NEXT_PUBLIC_SENTRY_DSN: z
    .string()
    .optional()
    .refine(
      (val: string | undefined) => !val || val.startsWith('https://'),
      'Sentry DSN must be a valid https URL'
    ),
  
  NEXT_PUBLIC_ENABLE_ANALYTICS: z
    .string()
    .transform((val: string) => val === 'true')
    .default('false'),
  
  NEXT_PUBLIC_ANALYTICS_KEY: z
    .string()
    .optional(),
});

// =============================================================================
// SECURITY ENFORCEMENT
// =============================================================================

/**
 * Validates that no forbidden variables are present in the environment.
 * This is a defense-in-depth measure to prevent accidental secret exposure.
 */
function enforceSecurityRules(): void {
  const forbiddenPatterns: Array<{ pattern: RegExp; message: string }> = [
    // Database credentials
    { pattern: /^DATABASE_/, message: 'Database credentials are forbidden in frontend apps' },
    { pattern: /^POSTGRES_/, message: 'PostgreSQL credentials are forbidden in frontend apps' },
    { pattern: /^MONGO/, message: 'MongoDB credentials are forbidden in frontend apps' },
    
    // Service role keys
    { pattern: /SERVICE_ROLE/, message: 'Service role keys are forbidden in frontend apps' },
    { pattern: /^SUPABASE_SERVICE/, message: 'Supabase service keys are forbidden in frontend apps' },
    
    // Payment secrets (agents don't handle payments)
    { pattern: /^STRIPE_SECRET/, message: 'Stripe secret keys are forbidden in agent-web (agents do not handle payments)' },
    { pattern: /^STRIPE_WEBHOOK/, message: 'Stripe webhook secrets are forbidden in frontend apps' },
    { pattern: /^PAYMENT_/, message: 'Payment secrets are forbidden in agent-web' },
    
    // User contact information (forbidden pre-payment)
    { pattern: /^USER_CONTACT/, message: 'User contact access is forbidden pre-payment per constitution' },
    { pattern: /^REVEAL_CONTACT/, message: 'Contact reveal config is forbidden in frontend' },
    
    // Generic secrets
    { pattern: /^AWS_SECRET/, message: 'AWS secrets are forbidden in frontend apps' },
    { pattern: /^PRIVATE_KEY/, message: 'Private keys are forbidden in frontend apps' },
    { pattern: /^API_SECRET/, message: 'API secrets are forbidden in frontend apps' },
  ];

  const envKeys = Object.keys(process.env);
  
  for (const key of envKeys) {
    // Allow NEXT_PUBLIC_* variables
    if (key.startsWith('NEXT_PUBLIC_')) {
      continue;
    }
    
    // Check against forbidden patterns for any non-NEXT_PUBLIC vars that might leak
    for (const { pattern, message } of forbiddenPatterns) {
      if (pattern.test(key)) {
        throw new Error(`SECURITY VIOLATION: ${message}. Found: ${key}`);
      }
    }
  }
}

// =============================================================================
// VALIDATION & EXPORT
// =============================================================================

/**
 * Validates environment variables and returns typed configuration.
 * Fails fast with clear error messages if validation fails.
 */
function validateEnv() {
  // First, enforce security rules
  enforceSecurityRules();

  // Then, validate schema
  const result = envSchema.safeParse({
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_STORAGE_URL: process.env.NEXT_PUBLIC_STORAGE_URL,
    NEXT_PUBLIC_MAX_UPLOAD_SIZE_BYTES: process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE_BYTES,
    NEXT_PUBLIC_ALLOWED_UPLOAD_TYPES: process.env.NEXT_PUBLIC_ALLOWED_UPLOAD_TYPES,
    NEXT_PUBLIC_FEATURE_REALTIME_NOTIFICATIONS: process.env.NEXT_PUBLIC_FEATURE_REALTIME_NOTIFICATIONS,
    NEXT_PUBLIC_FEATURE_PLATFORM_CHAT: process.env.NEXT_PUBLIC_FEATURE_PLATFORM_CHAT,
    NEXT_PUBLIC_FEATURE_LINK_ITINERARIES: process.env.NEXT_PUBLIC_FEATURE_LINK_ITINERARIES,
    NEXT_PUBLIC_FEATURE_TEXT_ITINERARIES: process.env.NEXT_PUBLIC_FEATURE_TEXT_ITINERARIES,
    NEXT_PUBLIC_MAX_ACTIVE_REQUESTS: process.env.NEXT_PUBLIC_MAX_ACTIVE_REQUESTS,
    NEXT_PUBLIC_REQUEST_RESPONSE_TIMEOUT_HOURS: process.env.NEXT_PUBLIC_REQUEST_RESPONSE_TIMEOUT_HOURS,
    NEXT_PUBLIC_MAX_ITINERARY_REVISIONS: process.env.NEXT_PUBLIC_MAX_ITINERARY_REVISIONS,
    NEXT_PUBLIC_REQUESTS_PER_PAGE: process.env.NEXT_PUBLIC_REQUESTS_PER_PAGE,
    NEXT_PUBLIC_INBOX_REFRESH_INTERVAL_MS: process.env.NEXT_PUBLIC_INBOX_REFRESH_INTERVAL_MS,
    NEXT_PUBLIC_ENABLE_ERROR_TRACKING: process.env.NEXT_PUBLIC_ENABLE_ERROR_TRACKING,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS,
    NEXT_PUBLIC_ANALYTICS_KEY: process.env.NEXT_PUBLIC_ANALYTICS_KEY,
  });

  if (!result.success) {
    const errors = result.error.issues.map((issue: z.ZodIssue) => {
      return `  - ${issue.path.join('.')}: ${issue.message}`;
    });
    
    throw new Error(
      `\n❌ Environment validation failed for agent-web:\n${errors.join('\n')}\n\n` +
      `Please check your .env file and ensure all required variables are set.\n`
    );
  }

  return result.data;
}

// Validate at module load (build time for Next.js)
export const env = validateEnv();

// =============================================================================
// TYPED CONFIGURATION EXPORTS
// =============================================================================

/**
 * Application metadata configuration
 */
export const appConfig = {
  name: env.NEXT_PUBLIC_APP_NAME,
  version: env.NEXT_PUBLIC_APP_VERSION,
  environment: env.NEXT_PUBLIC_APP_ENV,
  isDevelopment: env.NEXT_PUBLIC_APP_ENV === 'development',
  isProduction: env.NEXT_PUBLIC_APP_ENV === 'production',
} as const;

/**
 * API connectivity configuration
 */
export const apiConfig = {
  baseUrl: env.NEXT_PUBLIC_API_BASE_URL,
  wsUrl: env.NEXT_PUBLIC_WS_URL,
} as const;

/**
 * Authentication configuration (Supabase public only)
 */
export const authConfig = {
  supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
} as const;

/**
 * File upload configuration
 */
export const uploadConfig = {
  storageUrl: env.NEXT_PUBLIC_STORAGE_URL,
  maxSizeBytes: env.NEXT_PUBLIC_MAX_UPLOAD_SIZE_BYTES,
  allowedTypes: env.NEXT_PUBLIC_ALLOWED_UPLOAD_TYPES.split(','),
} as const;

/**
 * Feature toggle configuration
 */
export const featureConfig = {
  realtimeNotifications: env.NEXT_PUBLIC_FEATURE_REALTIME_NOTIFICATIONS,
  platformChat: env.NEXT_PUBLIC_FEATURE_PLATFORM_CHAT, // Always true per constitution
  linkItineraries: env.NEXT_PUBLIC_FEATURE_LINK_ITINERARIES,
  textItineraries: env.NEXT_PUBLIC_FEATURE_TEXT_ITINERARIES,
} as const;

/**
 * Operational limits configuration
 */
export const limitsConfig = {
  maxActiveRequests: env.NEXT_PUBLIC_MAX_ACTIVE_REQUESTS,
  requestResponseTimeoutHours: env.NEXT_PUBLIC_REQUEST_RESPONSE_TIMEOUT_HOURS,
  maxItineraryRevisions: env.NEXT_PUBLIC_MAX_ITINERARY_REVISIONS,
} as const;

/**
 * UI configuration
 */
export const uiConfig = {
  requestsPerPage: env.NEXT_PUBLIC_REQUESTS_PER_PAGE,
  inboxRefreshIntervalMs: env.NEXT_PUBLIC_INBOX_REFRESH_INTERVAL_MS,
} as const;

/**
 * Observability configuration
 */
export const observabilityConfig = {
  errorTrackingEnabled: env.NEXT_PUBLIC_ENABLE_ERROR_TRACKING,
  sentryDsn: env.NEXT_PUBLIC_SENTRY_DSN,
  analyticsEnabled: env.NEXT_PUBLIC_ENABLE_ANALYTICS,
  analyticsKey: env.NEXT_PUBLIC_ANALYTICS_KEY,
} as const;
