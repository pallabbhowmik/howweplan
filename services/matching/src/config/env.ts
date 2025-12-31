/**
 * Environment Configuration with Runtime Validation
 * 
 * This module validates all required environment variables at startup.
 * If any required variable is missing or invalid, the service will fail fast
 * with a clear error message.
 * 
 * SECURITY: This is a backend service - secrets are permitted here.
 * Never import this module in frontend code.
 */

import { z } from 'zod';

/**
 * Environment variable schema with strict validation
 */
const envSchema = z.object({
  // App Metadata
  SERVICE_NAME: z.string().min(1).default('matching-service'),
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3003),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // Event Bus (Redis)
  REDIS_HOST: z.string().min(1).default('localhost'),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
  REDIS_PASSWORD: z.string().default(''),
  REDIS_DB: z.coerce.number().int().min(0).max(15).default(0),
  REDIS_CONNECT_TIMEOUT: z.coerce.number().int().min(1000).default(10000),

  // Database
  DATABASE_URL: z.string().url().startsWith('postgresql://'),
  DATABASE_POOL_MIN: z.coerce.number().int().min(1).default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).default(10),

  // Authentication
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  INTERNAL_JWT_SECRET: z.string().min(32),

  // Matching Configuration
  MATCHING_MIN_AGENTS: z.coerce.number().int().min(1).max(5).default(2),
  MATCHING_MAX_AGENTS: z.coerce.number().int().min(1).max(10).default(3),
  AGENT_RESPONSE_TIMEOUT_HOURS: z.coerce.number().int().min(1).max(168).default(24),
  STAR_AGENT_MIN_RATING: z.coerce.number().min(0).max(5).default(4.5),
  STAR_AGENT_MIN_BOOKINGS: z.coerce.number().int().min(0).default(10),

  // Peak Season Handling
  PEAK_SEASON_MODE_ENABLED: z.coerce.boolean().default(false),
  PEAK_SEASON_ALLOW_SINGLE_AGENT: z.coerce.boolean().default(false),
  PEAK_SEASON_TIMEOUT_HOURS: z.coerce.number().int().min(1).max(168).default(48),

  // Feature Toggles
  ENABLE_BENCH_FALLBACK: z.coerce.boolean().default(true),
  ENABLE_GEO_MATCHING: z.coerce.boolean().default(true),
  ENABLE_SPECIALIZATION_MATCHING: z.coerce.boolean().default(true),

  // Operational Limits
  MAX_MATCHING_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  MATCHING_RETRY_COOLDOWN_SECONDS: z.coerce.number().int().min(0).default(300),
  MAX_CONCURRENT_MATCHES: z.coerce.number().int().min(1).default(100),

  // Audit & Observability
  AUDIT_LOG_ENABLED: z.coerce.boolean().default(true),
  AUDIT_LOG_RETENTION_DAYS: z.coerce.number().int().min(1).default(90),
  METRICS_ENABLED: z.coerce.boolean().default(true),
  METRICS_PORT: z.coerce.number().int().min(0).max(65535).default(9103),
});

/**
 * Coerces string values to boolean
 */
function coerceBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined || value === '') return undefined;
  return value === 'true' || value === '1';
}

/**
 * Pre-process environment variables before validation
 */
function preprocessEnv(env: NodeJS.ProcessEnv): Record<string, unknown> {
  return {
    ...env,
    PEAK_SEASON_MODE_ENABLED: coerceBoolean(env['PEAK_SEASON_MODE_ENABLED']),
    PEAK_SEASON_ALLOW_SINGLE_AGENT: coerceBoolean(env['PEAK_SEASON_ALLOW_SINGLE_AGENT']),
    ENABLE_BENCH_FALLBACK: coerceBoolean(env['ENABLE_BENCH_FALLBACK']),
    ENABLE_GEO_MATCHING: coerceBoolean(env['ENABLE_GEO_MATCHING']),
    ENABLE_SPECIALIZATION_MATCHING: coerceBoolean(env['ENABLE_SPECIALIZATION_MATCHING']),
    AUDIT_LOG_ENABLED: coerceBoolean(env['AUDIT_LOG_ENABLED']),
    METRICS_ENABLED: coerceBoolean(env['METRICS_ENABLED']),
  };
}

/**
 * Validate environment variables and fail fast on errors
 */
function validateEnv(): z.infer<typeof envSchema> {
  const preprocessed = preprocessEnv(process.env);
  const result = envSchema.safeParse(preprocessed);

  if (!result.success) {
    const errors = result.error.errors.map((err) => {
      const path = err.path.join('.');
      return `  - ${path}: ${err.message}`;
    });

    console.error('\n❌ Environment validation failed:\n');
    console.error(errors.join('\n'));
    console.error('\nPlease check your .env file and ensure all required variables are set.\n');
    
    process.exit(1);
  }

  // Additional validation rules
  if (result.data.DATABASE_POOL_MIN > result.data.DATABASE_POOL_MAX) {
    console.error('\n❌ DATABASE_POOL_MIN cannot be greater than DATABASE_POOL_MAX\n');
    process.exit(1);
  }

  if (result.data.MATCHING_MIN_AGENTS > result.data.MATCHING_MAX_AGENTS) {
    console.error('\n❌ MATCHING_MIN_AGENTS cannot be greater than MATCHING_MAX_AGENTS\n');
    process.exit(1);
  }

  return result.data;
}

/**
 * Validated environment configuration
 * Access this object for type-safe environment variables
 */
export const env = validateEnv();

/**
 * Environment type for external use
 */
export type Env = typeof env;

/**
 * Check if running in production
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Check if running in development
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Redis configuration object
 */
export const redisConfig = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  ...(env.REDIS_PASSWORD ? { password: env.REDIS_PASSWORD } : {}),
  db: env.REDIS_DB,
  connectTimeout: env.REDIS_CONNECT_TIMEOUT,
  lazyConnect: true,
  maxRetriesPerRequest: 3,
};

/**
 * Matching engine configuration object
 */
export const matchingConfig = {
  minAgents: env.MATCHING_MIN_AGENTS,
  maxAgents: env.MATCHING_MAX_AGENTS,
  responseTimeoutHours: env.AGENT_RESPONSE_TIMEOUT_HOURS,
  starAgentMinRating: env.STAR_AGENT_MIN_RATING,
  starAgentMinBookings: env.STAR_AGENT_MIN_BOOKINGS,
  maxAttempts: env.MAX_MATCHING_ATTEMPTS,
  retryCooldownSeconds: env.MATCHING_RETRY_COOLDOWN_SECONDS,
  maxConcurrent: env.MAX_CONCURRENT_MATCHES,
} as const;

/**
 * Peak season configuration object
 */
export const peakSeasonConfig = {
  enabled: env.PEAK_SEASON_MODE_ENABLED,
  allowSingleAgent: env.PEAK_SEASON_ALLOW_SINGLE_AGENT,
  timeoutHours: env.PEAK_SEASON_TIMEOUT_HOURS,
} as const;

/**
 * Feature flags configuration object
 */
export const featureFlags = {
  benchFallback: env.ENABLE_BENCH_FALLBACK,
  geoMatching: env.ENABLE_GEO_MATCHING,
  specializationMatching: env.ENABLE_SPECIALIZATION_MATCHING,
} as const;
