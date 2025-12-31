/**
 * Environment Configuration and Validation
 * 
 * This module validates all required environment variables at startup.
 * If any required variable is missing or invalid, the service fails fast
 * with a clear error message.
 * 
 * SECURITY: This is a backend service, so it MAY contain secrets like
 * SUPABASE_SERVICE_ROLE_KEY and DATABASE_URL.
 */

import { z } from 'zod';

const stringToNumber = z.string().transform((val, ctx) => {
  const parsed = parseInt(val, 10);
  if (isNaN(parsed)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Expected a numeric string',
    });
    return z.NEVER;
  }
  return parsed;
});

const stringToBoolean = z.string().transform((val) => {
  return val.toLowerCase() === 'true' || val === '1';
});

const commaSeparatedList = z.string().transform((val) => {
  return val.split(',').map((s) => s.trim()).filter(Boolean);
});

/**
 * Environment variable schema with strict validation.
 * Every variable used by this service MUST be declared here.
 */
const envSchema = z.object({
  // -------------------------------------------------------------------------
  // APP METADATA
  // -------------------------------------------------------------------------
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  SERVICE_NAME: z.string().default('disputes'),
  SERVICE_VERSION: z.string().default('1.0.0'),
  PORT: stringToNumber.pipe(z.number().min(1).max(65535)).default('3006'),

  // -------------------------------------------------------------------------
  // API CONNECTIVITY
  // -------------------------------------------------------------------------
  EVENT_BUS_URL: z.string().url(),
  BOOKING_SERVICE_URL: z.string().url(),
  PAYMENTS_SERVICE_URL: z.string().url(),
  NOTIFICATION_SERVICE_URL: z.string().url(),
  API_VERSION: z.string().default('v1'),

  // -------------------------------------------------------------------------
  // AUTHENTICATION
  // -------------------------------------------------------------------------
  JWT_ISSUER: z.string().url(),
  JWT_AUDIENCE: z.string().min(1),
  JWKS_URI: z.string().url(),
  INTERNAL_SERVICE_TOKEN: z.string().min(16),

  // -------------------------------------------------------------------------
  // DATABASE
  // -------------------------------------------------------------------------
  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_MIN: stringToNumber.pipe(z.number().min(1).max(100)).default('2'),
  DATABASE_POOL_MAX: stringToNumber.pipe(z.number().min(1).max(100)).default('10'),
  DATABASE_SSL_ENABLED: stringToBoolean.default('false'),

  // -------------------------------------------------------------------------
  // SUPABASE
  // -------------------------------------------------------------------------
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // -------------------------------------------------------------------------
  // FEATURE TOGGLES
  // -------------------------------------------------------------------------
  FEATURE_AUTO_CLOSE_STALE_DISPUTES: stringToBoolean.default('true'),
  FEATURE_EVIDENCE_FILE_UPLOAD: stringToBoolean.default('true'),
  FEATURE_AGENT_RESPONSE_NOTIFICATIONS: stringToBoolean.default('true'),

  // -------------------------------------------------------------------------
  // OPERATIONAL LIMITS
  // -------------------------------------------------------------------------
  DISPUTE_WINDOW_HOURS: stringToNumber.pipe(z.number().min(1)).default('168'),
  AGENT_RESPONSE_DEADLINE_HOURS: stringToNumber.pipe(z.number().min(1)).default('48'),
  ADMIN_ESCALATION_THRESHOLD_HOURS: stringToNumber.pipe(z.number().min(1)).default('72'),
  AUTO_CLOSE_STALE_DISPUTES_DAYS: stringToNumber.pipe(z.number().min(1)).default('30'),
  MAX_EVIDENCE_FILES_PER_DISPUTE: stringToNumber.pipe(z.number().min(1).max(50)).default('10'),
  MAX_EVIDENCE_FILE_SIZE_MB: stringToNumber.pipe(z.number().min(1).max(100)).default('10'),
  ALLOWED_EVIDENCE_MIME_TYPES: commaSeparatedList.default('image/jpeg,image/png,application/pdf'),
  RATE_LIMIT_DISPUTES_PER_USER_PER_DAY: stringToNumber.pipe(z.number().min(1)).default('3'),
  RATE_LIMIT_EVIDENCE_UPLOADS_PER_DISPUTE: stringToNumber.pipe(z.number().min(1)).default('20'),

  // -------------------------------------------------------------------------
  // AUDIT / OBSERVABILITY
  // -------------------------------------------------------------------------
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
  AUDIT_LOG_ENABLED: stringToBoolean.default('true'),
  AUDIT_LOG_DESTINATION: z.enum(['database', 'stdout', 'file']).default('database'),
  OTEL_ENABLED: stringToBoolean.default('false'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  OTEL_SERVICE_NAME: z.string().default('disputes'),
  METRICS_ENABLED: stringToBoolean.default('true'),
  METRICS_PORT: stringToNumber.pipe(z.number().min(1).max(65535)).default('9106'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables and returns typed configuration.
 * Fails fast with descriptive errors if validation fails.
 */
function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors.map((err) => {
      const path = err.path.join('.');
      return `  - ${path}: ${err.message}`;
    });

    console.error('❌ Environment validation failed:\n' + errors.join('\n'));
    console.error('\nPlease check your .env file or environment variables.');
    process.exit(1);
  }

  return result.data;
}

/**
 * Validated environment configuration.
 * Access this object to get type-safe environment variables.
 */
export const env = validateEnv();

/**
 * Helper to check if we're in production mode.
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Helper to check if we're in development mode.
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Computed configuration values derived from environment variables.
 */
export const config = {
  service: {
    name: env.SERVICE_NAME,
    version: env.SERVICE_VERSION,
    port: env.PORT,
  },
  api: {
    version: env.API_VERSION,
    prefix: `/api/${env.API_VERSION}`,
  },
  database: {
    url: env.DATABASE_URL,
    pool: {
      min: env.DATABASE_POOL_MIN,
      max: env.DATABASE_POOL_MAX,
    },
    ssl: env.DATABASE_SSL_ENABLED,
  },
  auth: {
    jwtIssuer: env.JWT_ISSUER,
    jwtAudience: env.JWT_AUDIENCE,
    jwksUri: env.JWKS_URI,
    internalToken: env.INTERNAL_SERVICE_TOKEN,
  },
  services: {
    eventBus: env.EVENT_BUS_URL,
    booking: env.BOOKING_SERVICE_URL,
    payments: env.PAYMENTS_SERVICE_URL,
    notifications: env.NOTIFICATION_SERVICE_URL,
  },
  supabase: {
    url: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  },
  features: {
    autoCloseStaleDisputes: env.FEATURE_AUTO_CLOSE_STALE_DISPUTES,
    evidenceFileUpload: env.FEATURE_EVIDENCE_FILE_UPLOAD,
    agentResponseNotifications: env.FEATURE_AGENT_RESPONSE_NOTIFICATIONS,
  },
  limits: {
    disputeWindowHours: env.DISPUTE_WINDOW_HOURS,
    agentResponseDeadlineHours: env.AGENT_RESPONSE_DEADLINE_HOURS,
    adminEscalationThresholdHours: env.ADMIN_ESCALATION_THRESHOLD_HOURS,
    autoCloseStaleDisputesDays: env.AUTO_CLOSE_STALE_DISPUTES_DAYS,
    maxEvidenceFilesPerDispute: env.MAX_EVIDENCE_FILES_PER_DISPUTE,
    maxEvidenceFileSizeMb: env.MAX_EVIDENCE_FILE_SIZE_MB,
    allowedEvidenceMimeTypes: env.ALLOWED_EVIDENCE_MIME_TYPES,
    rateLimit: {
      disputesPerUserPerDay: env.RATE_LIMIT_DISPUTES_PER_USER_PER_DAY,
      evidenceUploadsPerDispute: env.RATE_LIMIT_EVIDENCE_UPLOADS_PER_DISPUTE,
    },
  },
  logging: {
    level: env.LOG_LEVEL,
    format: env.LOG_FORMAT,
  },
  audit: {
    enabled: env.AUDIT_LOG_ENABLED,
    destination: env.AUDIT_LOG_DESTINATION,
  },
  telemetry: {
    enabled: env.OTEL_ENABLED,
    endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
    serviceName: env.OTEL_SERVICE_NAME,
  },
  metrics: {
    enabled: env.METRICS_ENABLED,
    port: env.METRICS_PORT,
  },
} as const;
