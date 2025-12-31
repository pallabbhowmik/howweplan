/**
 * Environment Configuration and Validation
 * 
 * This module validates all required environment variables at startup.
 * The service will fail fast with clear error messages if configuration is invalid.
 */

import { z } from 'zod';

const envSchema = z.object({
  // App Metadata
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  SERVICE_NAME: z.string().default('requests-service'),
  SERVICE_VERSION: z.string().default('1.0.0'),
  PORT: z.coerce.number().int().positive().default(3001),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Event Bus
  EVENT_BUS_URL: z.string().url('EVENT_BUS_URL must be a valid Redis connection string').optional(),
  EVENT_BUS_CHANNEL_PREFIX: z.string().default('tripcomposer'),

  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ISSUER: z.string().default('tripcomposer'),
  JWT_AUDIENCE: z.string().default('tripcomposer-services'),

  // Operational Limits
  DAILY_REQUEST_CAP: z.coerce.number().int().positive().default(5),
  MAX_OPEN_REQUESTS: z.coerce.number().int().positive().default(3),
  REQUEST_EXPIRY_HOURS: z.coerce.number().int().positive().default(72),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),

  // Audit / Observability
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
  AUDIT_ENABLED: z.coerce.boolean().default(true),
  METRICS_ENABLED: z.coerce.boolean().default(true),
  METRICS_PORT: z.coerce.number().int().positive().default(9091),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors.map((err: { path: (string | number)[]; message: string }) => {
      return `  - ${err.path.join('.')}: ${err.message}`;
    });

    console.error('❌ Environment validation failed:\n' + errors.join('\n'));
    console.error('\nPlease check your .env file against .env.example');
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();

// Type-safe access helpers
export const config = {
  app: {
    nodeEnv: env.NODE_ENV,
    serviceName: env.SERVICE_NAME,
    version: env.SERVICE_VERSION,
    port: env.PORT,
    isProduction: env.NODE_ENV === 'production',
    isDevelopment: env.NODE_ENV === 'development',
  },
  database: {
    url: env.DATABASE_URL,
    supabaseUrl: env.SUPABASE_URL,
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  },
  eventBus: {
    url: env.EVENT_BUS_URL,
    channelPrefix: env.EVENT_BUS_CHANNEL_PREFIX,
  },
  auth: {
    jwtSecret: env.JWT_SECRET,
    jwtIssuer: env.JWT_ISSUER,
    jwtAudience: env.JWT_AUDIENCE,
  },
  limits: {
    dailyRequestCap: env.DAILY_REQUEST_CAP,
    maxOpenRequests: env.MAX_OPEN_REQUESTS,
    requestExpiryHours: env.REQUEST_EXPIRY_HOURS,
  },
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },
  observability: {
    logLevel: env.LOG_LEVEL,
    logFormat: env.LOG_FORMAT,
    auditEnabled: env.AUDIT_ENABLED,
    metricsEnabled: env.METRICS_ENABLED,
    metricsPort: env.METRICS_PORT,
  },
} as const;
