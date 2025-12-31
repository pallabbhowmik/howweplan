/**
 * Environment Configuration & Validation
 * 
 * This module validates all required environment variables at BUILD TIME.
 * If any required variable is missing, the build will fail with a clear error.
 * 
 * SECURITY: Only NEXT_PUBLIC_* variables are allowed in frontend apps.
 */

import { z } from 'zod';

// ============================================================================
// SCHEMA DEFINITION
// ============================================================================

const envSchema = z.object({
  // App Metadata
  NEXT_PUBLIC_APP_NAME: z
    .string()
    .min(1, 'App name is required')
    .default('HowWePlan Admin'),
  NEXT_PUBLIC_APP_VERSION: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, 'Version must be semver format')
    .default('1.0.0'),
  NEXT_PUBLIC_ENVIRONMENT: z
    .enum(['development', 'staging', 'production'])
    .default('development'),

  // API Connectivity
  NEXT_PUBLIC_API_BASE_URL: z
    .string()
    .url('API base URL must be a valid URL')
    .min(1, 'API base URL is required'),
  NEXT_PUBLIC_API_TIMEOUT_MS: z
    .string()
    .transform((val: string) => parseInt(val, 10))
    .pipe(z.number().min(1000).max(120000))
    .default('30000'),
  NEXT_PUBLIC_WS_URL: z
    .string()
    .min(1, 'WebSocket URL is required')
    .refine(
      (val: string) => val.startsWith('ws://') || val.startsWith('wss://'),
      'WebSocket URL must start with ws:// or wss://'
    ),

  // Authentication (Supabase Public Keys Only)
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('Supabase URL must be a valid URL')
    .min(1, 'Supabase URL is required'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(20, 'Supabase anon key appears invalid')
    .refine(
      (val: string) => !val.includes('service_role'),
      'SECURITY VIOLATION: Service role key detected in frontend. Only anon key is allowed.'
    ),

  // Feature Toggles
  NEXT_PUBLIC_FEATURE_BULK_ACTIONS: z
    .string()
    .transform((val: string) => val === 'true')
    .default('true'),
  NEXT_PUBLIC_FEATURE_ADVANCED_FILTERS: z
    .string()
    .transform((val: string) => val === 'true')
    .default('true'),
  NEXT_PUBLIC_FEATURE_EXPORT_CSV: z
    .string()
    .transform((val: string) => val === 'true')
    .default('true'),
  NEXT_PUBLIC_FEATURE_REAL_TIME_AUDIT: z
    .string()
    .transform((val: string) => val === 'true')
    .default('true'),

  // Service URLs
  NEXT_PUBLIC_SERVICE_DISPUTES_URL: z
    .string()
    .url('Disputes service URL must be a valid URL')
    .optional(),
  NEXT_PUBLIC_SERVICE_AUDIT_URL: z
    .string()
    .url('Audit service URL must be a valid URL')
    .optional(),
  NEXT_PUBLIC_SERVICE_BOOKING_PAYMENTS_URL: z
    .string()
    .url('Booking payments service URL must be a valid URL')
    .optional(),

  // Operational Limits
  NEXT_PUBLIC_DEFAULT_PAGE_SIZE: z
    .string()
    .transform((val: string) => parseInt(val, 10))
    .pipe(z.number().min(10).max(100))
    .default('25'),
  NEXT_PUBLIC_MAX_PAGE_SIZE: z
    .string()
    .transform((val: string) => parseInt(val, 10))
    .pipe(z.number().min(25).max(500))
    .default('100'),
  NEXT_PUBLIC_AUDIT_LOG_RETENTION_DAYS: z
    .string()
    .transform((val: string) => parseInt(val, 10))
    .pipe(z.number().min(30).max(365))
    .default('90'),
  NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES: z
    .string()
    .transform((val: string) => parseInt(val, 10))
    .pipe(z.number().min(5).max(480))
    .default('30'),

  // Observability (Optional)
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_ANALYTICS_ID: z.string().optional(),
});

// ============================================================================
// VALIDATION & EXPORT
// ============================================================================

type EnvInput = {
  [K in keyof z.infer<typeof envSchema>]?: string;
};

function validateEnv(): z.infer<typeof envSchema> {
  const envInput: EnvInput = {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
    NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_API_TIMEOUT_MS: process.env.NEXT_PUBLIC_API_TIMEOUT_MS,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_FEATURE_BULK_ACTIONS: process.env.NEXT_PUBLIC_FEATURE_BULK_ACTIONS,
    NEXT_PUBLIC_FEATURE_ADVANCED_FILTERS: process.env.NEXT_PUBLIC_FEATURE_ADVANCED_FILTERS,
    NEXT_PUBLIC_FEATURE_EXPORT_CSV: process.env.NEXT_PUBLIC_FEATURE_EXPORT_CSV,
    NEXT_PUBLIC_FEATURE_REAL_TIME_AUDIT: process.env.NEXT_PUBLIC_FEATURE_REAL_TIME_AUDIT,
    NEXT_PUBLIC_SERVICE_DISPUTES_URL: process.env.NEXT_PUBLIC_SERVICE_DISPUTES_URL,
    NEXT_PUBLIC_SERVICE_AUDIT_URL: process.env.NEXT_PUBLIC_SERVICE_AUDIT_URL,
    NEXT_PUBLIC_SERVICE_BOOKING_PAYMENTS_URL: process.env.NEXT_PUBLIC_SERVICE_BOOKING_PAYMENTS_URL,
    NEXT_PUBLIC_DEFAULT_PAGE_SIZE: process.env.NEXT_PUBLIC_DEFAULT_PAGE_SIZE,
    NEXT_PUBLIC_MAX_PAGE_SIZE: process.env.NEXT_PUBLIC_MAX_PAGE_SIZE,
    NEXT_PUBLIC_AUDIT_LOG_RETENTION_DAYS: process.env.NEXT_PUBLIC_AUDIT_LOG_RETENTION_DAYS,
    NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES: process.env.NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_ANALYTICS_ID: process.env.NEXT_PUBLIC_ANALYTICS_ID,
  };

  const result = envSchema.safeParse(envInput);

  if (!result.success) {
    const errors = result.error.issues.map((issue: z.ZodIssue) => {
      return `  - ${issue.path.join('.')}: ${issue.message}`;
    });

    console.error('\n❌ ENVIRONMENT VALIDATION FAILED\n');
    console.error('The following environment variables have issues:\n');
    console.error(errors.join('\n'));
    console.error('\nPlease check your .env.local file and ensure all required variables are set correctly.\n');
    
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }

  return result.data;
}

// Validate at module load time (build time for Next.js)
export const env = validateEnv();

// Type-safe environment access
export type Env = z.infer<typeof envSchema>;

// ============================================================================
// SECURITY ASSERTIONS
// ============================================================================

// These checks run at build time to prevent security violations

if (typeof window === 'undefined') {
  // Server-side checks during build
  const forbiddenPatterns = [
    /DATABASE_URL/i,
    /SUPABASE_SERVICE_ROLE/i,
    /STRIPE_SECRET/i,
    /PRIVATE_KEY/i,
    /API_SECRET/i,
  ];

  const publicEnvKeys = Object.keys(process.env).filter((key) =>
    key.startsWith('NEXT_PUBLIC_')
  );

  for (const key of publicEnvKeys) {
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(key)) {
        throw new Error(
          `SECURITY VIOLATION: Forbidden variable pattern "${key}" detected in NEXT_PUBLIC_* namespace. ` +
          `Secrets must NEVER be exposed to the frontend.`
        );
      }
    }
  }
}
