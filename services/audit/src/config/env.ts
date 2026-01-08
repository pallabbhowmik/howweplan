import { z } from 'zod';

/**
 * Environment variable schema for Audit Service
 * Validates all required variables at startup and fails fast with clear errors
 */
const envSchema = z.object({
  // App Metadata
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  SERVICE_NAME: z.string().default('audit-service'),
  SERVICE_VERSION: z.string().default('1.0.0'),
  PORT: z.coerce.number().int().positive().default(3010),

  // Database (Append-Only Audit Store)
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine(
      (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
      'DATABASE_URL must be a valid PostgreSQL connection string'
    ),
  DATABASE_POOL_MIN: z.coerce.number().int().min(1).default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).default(10),
  DATABASE_SSL_ENABLED: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),

  // Event Bus Connectivity (optional in development)
  EVENT_BUS_URL: z
    .string()
    .optional()
    .refine(
      (url) => !url || url.startsWith('amqp://') || url.startsWith('amqps://') || url.startsWith('http://') || url.startsWith('https://'),
      'EVENT_BUS_URL must be a valid AMQP or HTTP(S) connection string if provided'
    ),
  EVENT_BUS_EXCHANGE: z.string().min(1).default('tripcomposer.events'),
  EVENT_BUS_QUEUE: z.string().min(1).default('audit.events'),
  EVENT_BUS_PREFETCH_COUNT: z.coerce.number().int().min(1).max(100).default(10),

  // Authentication / Authorization (optional with defaults for development)
  SUPABASE_URL: z.string().default('https://placeholder.supabase.co'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default('dev-service-role-key-placeholder'),
  INTERNAL_SERVICE_SECRET: z.string().default('dev-internal-secret-16'),

  // API Connectivity
  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((val) => val.split(',').map((origin) => origin.trim())),

  // Operational Limits
  MAX_PAGE_SIZE: z.coerce.number().int().min(1).max(1000).default(100),
  DEFAULT_PAGE_SIZE: z.coerce.number().int().min(1).max(100).default(50),
  RETENTION_PERIOD_DAYS: z.coerce.number().int().min(0).default(0),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).default(100),

  // Audit / Observability
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
  OTEL_ENABLED: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  OTEL_SERVICE_NAME: z.string().default('audit-service'),
  HEALTH_CHECK_PATH: z.string().default('/health'),
  READY_CHECK_PATH: z.string().default('/ready'),
});

/**
 * Validated environment configuration
 * Will throw with detailed errors if validation fails
 */
function validateEnv(): z.infer<typeof envSchema> {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errorMessages = result.error.errors
      .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');

    console.error('❌ Environment validation failed:\n' + errorMessages);
    console.error('\n📋 Check your .env file against .env.example');
    process.exit(1);
  }

  // Additional cross-field validations
  if (result.data.DATABASE_POOL_MIN > result.data.DATABASE_POOL_MAX) {
    console.error('❌ DATABASE_POOL_MIN cannot be greater than DATABASE_POOL_MAX');
    process.exit(1);
  }

  if (result.data.DEFAULT_PAGE_SIZE > result.data.MAX_PAGE_SIZE) {
    console.error('❌ DEFAULT_PAGE_SIZE cannot be greater than MAX_PAGE_SIZE');
    process.exit(1);
  }

  if (result.data.OTEL_ENABLED && !result.data.OTEL_EXPORTER_OTLP_ENDPOINT) {
    console.error('❌ OTEL_EXPORTER_OTLP_ENDPOINT is required when OTEL_ENABLED is true');
    process.exit(1);
  }

  // Production-specific validations (skip for local development)
  if (result.data.NODE_ENV === 'production' && !process.env.LOCAL_DEV_MODE) {
    if (result.data.INTERNAL_SERVICE_SECRET.includes('dev')) {
      console.error('❌ INTERNAL_SERVICE_SECRET appears to contain development values in production');
      process.exit(1);
    }

    if (!result.data.DATABASE_SSL_ENABLED) {
      console.error('❌ DATABASE_SSL_ENABLED must be true in production');
      process.exit(1);
    }

    if (result.data.LOG_FORMAT !== 'json') {
      console.warn('⚠️ LOG_FORMAT should be "json" in production for structured logging');
    }
  }

  return result.data;
}

export const env = validateEnv();

// Type export for use in other modules
export type Env = z.infer<typeof envSchema>;
