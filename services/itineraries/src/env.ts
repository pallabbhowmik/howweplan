import { z } from 'zod';

/**
 * Environment variable schema with strict validation.
 * Fails fast at startup if required variables are missing or invalid.
 * 
 * SECURITY: This service is a backend service and may contain secrets.
 * SECURITY: NO Stripe keys - payments are handled by booking-payments service.
 */

const envSchema = z.object({
  // ============================================================
  // APP METADATA
  // ============================================================
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  SERVICE_NAME: z.string().default('itineraries-service'),
  SERVICE_VERSION: z.string().default('1.0.0'),
  PORT: z.coerce.number().int().positive().default(3003),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // ============================================================
  // API CONNECTIVITY
  // ============================================================
  API_BASE_URL: z.string().url().default('http://localhost:3003'),
  INTERNAL_API_KEY: z.string().min(16, 'INTERNAL_API_KEY must be at least 16 characters'),

  // ============================================================
  // AUTHENTICATION
  // ============================================================
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ISSUER: z.string().default('tripcomposer-auth'),
  JWT_AUDIENCE: z.string().default('tripcomposer-services'),

  // ============================================================
  // DATABASE
  // ============================================================
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // ============================================================
  // EVENT BUS
  // ============================================================
  EVENT_BUS_URL: z.string().min(1).optional(),
  EVENT_BUS_EXCHANGE: z.string().default('tripcomposer.events'),
  EVENT_BUS_QUEUE_PREFIX: z.string().default('itineraries'),

  // ============================================================
  // FEATURE TOGGLES
  // ============================================================
  ENABLE_VERSION_HISTORY: z.coerce.boolean().default(true),
  ENABLE_AUDIT_LOGGING: z.coerce.boolean().default(true),
  ENABLE_METRICS: z.coerce.boolean().default(true),

  // ============================================================
  // OPERATIONAL LIMITS
  // ============================================================
  MAX_ITINERARY_ITEMS: z.coerce.number().int().positive().default(50),
  MAX_SUBMISSION_SIZE_MB: z.coerce.number().positive().default(10),
  MAX_VERSIONS_PER_ITINERARY: z.coerce.number().int().positive().default(100),
  OBFUSCATION_CACHE_TTL_SECONDS: z.coerce.number().int().nonnegative().default(300),

  // ============================================================
  // AUDIT / OBSERVABILITY
  // ============================================================
  AUDIT_LOG_ENABLED: z.coerce.boolean().default(true),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  OTEL_SERVICE_NAME: z.string().default('itineraries-service'),
  METRICS_PORT: z.coerce.number().int().positive().default(9093),
});

/**
 * Security validation rules that are enforced at startup.
 * These ensure architectural boundaries are not violated.
 */
function validateSecurityRules(env: Record<string, unknown>): void {
  // SECURITY: This service must NEVER have Stripe keys
  const forbiddenKeys = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_API_KEY',
  ];

  for (const key of forbiddenKeys) {
    if (key in env && env[key]) {
      throw new Error(
        `SECURITY VIOLATION: ${key} is forbidden in itineraries service. ` +
        `Payment secrets belong ONLY in booking-payments service.`
      );
    }
  }

  // SECURITY: Warn if any NEXT_PUBLIC_ variables are present (indicates config leak)
  const publicVars = Object.keys(env).filter(k => k.startsWith('NEXT_PUBLIC_'));
  if (publicVars.length > 0) {
    throw new Error(
      `SECURITY VIOLATION: Frontend variables detected in backend service: ${publicVars.join(', ')}. ` +
      `This service is a backend service and should not have NEXT_PUBLIC_ variables.`
    );
  }
}

/**
 * Parse and validate environment variables.
 * Fails fast with descriptive errors if validation fails.
 */
function parseEnv(): z.infer<typeof envSchema> {
  // First, run security validations
  validateSecurityRules(process.env);

  // Then parse with schema
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors
      .map((err: { path: (string | number)[]; message: string }) => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');

    console.error('═══════════════════════════════════════════════════════════');
    console.error('FATAL: Environment validation failed');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('The following environment variables are missing or invalid:\n');
    console.error(errors);
    console.error('\nPlease check your .env file and ensure all required');
    console.error('variables are set correctly. See .env.example for reference.');
    console.error('═══════════════════════════════════════════════════════════');

    process.exit(1);
  }

  return result.data;
}

/**
 * Validated environment configuration.
 * Import this throughout the service - never access process.env directly.
 */
export const env = parseEnv();

/**
 * Type-safe environment configuration.
 */
export type Env = typeof env;

/**
 * Environment helpers for common checks.
 */
export const isDevelopment = env.NODE_ENV === 'development';
export const isStaging = env.NODE_ENV === 'staging';
export const isProduction = env.NODE_ENV === 'production';
