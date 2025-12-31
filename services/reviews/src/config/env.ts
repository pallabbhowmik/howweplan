/**
 * Environment Configuration with Runtime Validation
 * 
 * This module validates all required environment variables at startup.
 * The service will fail fast with clear errors if configuration is invalid.
 */

import { z } from 'zod';

// =============================================================================
// SCHEMA DEFINITION
// =============================================================================

const envSchema = z.object({
  // ---------------------------------------------------------------------------
  // APP METADATA
  // ---------------------------------------------------------------------------
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  SERVICE_NAME: z.string().default('reviews-service'),
  SERVICE_VERSION: z.string().default('1.0.0'),
  PORT: z.coerce.number().int().positive().default(3006),

  // ---------------------------------------------------------------------------
  // DATABASE
  // ---------------------------------------------------------------------------
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // ---------------------------------------------------------------------------
  // EVENT BUS
  // ---------------------------------------------------------------------------
  EVENT_BUS_URL: z.string().min(1, 'EVENT_BUS_URL is required'),
  EVENT_BUS_EXCHANGE: z.string().default('tripcomposer.events'),
  EVENT_BUS_REVIEWS_QUEUE: z.string().default('reviews.events'),

  // ---------------------------------------------------------------------------
  // API CONNECTIVITY
  // ---------------------------------------------------------------------------
  INTERNAL_API_BASE_URL: z.string().url().default('http://localhost:3000/internal'),

  // ---------------------------------------------------------------------------
  // AUTHENTICATION
  // ---------------------------------------------------------------------------
  JWT_PUBLIC_KEY: z.string().min(1, 'JWT_PUBLIC_KEY is required'),
  JWT_ISSUER: z.string().default('tripcomposer'),
  JWT_AUDIENCE: z.string().default('reviews-service'),

  // ---------------------------------------------------------------------------
  // OPERATIONAL LIMITS
  // ---------------------------------------------------------------------------
  REVIEW_SUBMISSION_WINDOW_DAYS: z.coerce.number().int().positive().default(30),
  MIN_BOOKING_VALUE_FOR_REVIEW: z.coerce.number().nonnegative().default(50),
  RATE_LIMIT_REVIEWS_PER_USER_PER_DAY: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(86400000),
  GAMING_DETECTION_MIN_REVIEWS_FOR_ANALYSIS: z.coerce.number().int().positive().default(5),
  GAMING_DETECTION_SUSPICIOUS_VELOCITY_THRESHOLD: z.coerce.number().int().positive().default(3),
  GAMING_DETECTION_SENTIMENT_VARIANCE_THRESHOLD: z.coerce.number().positive().default(0.3),
  SCORE_DECAY_FACTOR_DAYS: z.coerce.number().int().positive().default(180),
  SCORE_MIN_REVIEWS_FOR_PUBLIC: z.coerce.number().int().positive().default(3),

  // ---------------------------------------------------------------------------
  // FEATURE TOGGLES
  // ---------------------------------------------------------------------------
  FEATURE_GAMING_DETECTION_ENABLED: z.coerce.boolean().default(true),
  FEATURE_SENTIMENT_ANALYSIS_ENABLED: z.coerce.boolean().default(false),
  FEATURE_PHOTO_REVIEWS_ENABLED: z.coerce.boolean().default(false),

  // ---------------------------------------------------------------------------
  // AUDIT / OBSERVABILITY
  // ---------------------------------------------------------------------------
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
  AUDIT_EVENTS_ENABLED: z.coerce.boolean().default(true),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  OTEL_SERVICE_NAME: z.string().default('reviews-service'),
  METRICS_ENABLED: z.coerce.boolean().default(true),
});

// =============================================================================
// VALIDATION AND EXPORT
// =============================================================================

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors.map((err: z.ZodIssue) => {
      return `  - ${err.path.join('.')}: ${err.message}`;
    });

    console.error('❌ Environment validation failed:\n');
    console.error(errors.join('\n'));
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();

// =============================================================================
// DERIVED CONFIGURATION OBJECTS
// =============================================================================

export const appConfig = {
  name: env.SERVICE_NAME,
  version: env.SERVICE_VERSION,
  port: env.PORT,
  environment: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
} as const;

export const databaseConfig = {
  supabaseUrl: env.SUPABASE_URL,
  supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  connectionString: env.DATABASE_URL,
} as const;

export const eventBusConfig = {
  url: env.EVENT_BUS_URL,
  exchange: env.EVENT_BUS_EXCHANGE,
  queue: env.EVENT_BUS_REVIEWS_QUEUE,
} as const;

export const authConfig = {
  jwtPublicKey: env.JWT_PUBLIC_KEY,
  jwtIssuer: env.JWT_ISSUER,
  jwtAudience: env.JWT_AUDIENCE,
} as const;

export const operationalLimits = {
  reviewSubmissionWindowDays: env.REVIEW_SUBMISSION_WINDOW_DAYS,
  minBookingValueForReview: env.MIN_BOOKING_VALUE_FOR_REVIEW,
  rateLimitReviewsPerUserPerDay: env.RATE_LIMIT_REVIEWS_PER_USER_PER_DAY,
  rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
  gamingDetection: {
    minReviewsForAnalysis: env.GAMING_DETECTION_MIN_REVIEWS_FOR_ANALYSIS,
    suspiciousVelocityThreshold: env.GAMING_DETECTION_SUSPICIOUS_VELOCITY_THRESHOLD,
    sentimentVarianceThreshold: env.GAMING_DETECTION_SENTIMENT_VARIANCE_THRESHOLD,
  },
  scoring: {
    decayFactorDays: env.SCORE_DECAY_FACTOR_DAYS,
    minReviewsForPublic: env.SCORE_MIN_REVIEWS_FOR_PUBLIC,
  },
} as const;

export const featureFlags = {
  gamingDetectionEnabled: env.FEATURE_GAMING_DETECTION_ENABLED,
  sentimentAnalysisEnabled: env.FEATURE_SENTIMENT_ANALYSIS_ENABLED,
  photoReviewsEnabled: env.FEATURE_PHOTO_REVIEWS_ENABLED,
} as const;

export const observabilityConfig = {
  logLevel: env.LOG_LEVEL,
  logFormat: env.LOG_FORMAT,
  auditEventsEnabled: env.AUDIT_EVENTS_ENABLED,
  otelEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
  otelServiceName: env.OTEL_SERVICE_NAME,
  metricsEnabled: env.METRICS_ENABLED,
} as const;
