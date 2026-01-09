/**
 * Environment Configuration and Validation
 * 
 * This module validates all required environment variables at startup.
 * The service will fail fast with clear error messages if configuration is invalid.
 */

import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';

/**
 * Read a secret file from Render's secret files location or local path.
 * Render stores secret files at /etc/secrets/<filename>
 */
function readSecretFile(filename: string): string | undefined {
  const paths = [
    `/etc/secrets/${filename}`,           // Render secret files location
    `./secrets/${filename}`,              // Local development
    `./${filename}`,                      // Current directory
  ];

  for (const path of paths) {
    if (existsSync(path)) {
      try {
        const content = readFileSync(path, 'utf-8').trim();
        console.info(`✓ Loaded ${filename} from secret file: ${path}`);
        return content;
      } catch {
        // Continue to next path
      }
    }
  }
  return undefined;
}

/**
 * Get JWT public key from secret file or environment variable.
 */
function getJwtPublicKey(): string {
  const fileContent = readSecretFile('jwt-public.pem');
  if (fileContent) return fileContent;
  
  const envKey = process.env['JWT_PUBLIC_KEY'];
  if (envKey) return envKey.replace(/\\n/g, '\n');
  
  return '';
}

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

  // Matching Service (for triggering agent matching)
  MATCHING_SERVICE_URL: z.string().url().default('http://localhost:3013'),
  INTERNAL_SERVICE_SECRET: z.string().default('dev-internal-secret-32'),

  // Authentication
  // For RS256 (recommended), services only need the PUBLIC key to verify tokens
  // The public key is safe to distribute to all services
  JWT_PUBLIC_KEY: z
    .string()
    .transform((val) => val?.replace(/\\n/g, '\n') || '')
    .optional(),
  // Legacy HS256 fallback
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').optional(),
  JWT_ALGORITHM: z.enum(['RS256', 'HS256']).default('RS256'),
  JWT_ISSUER: z.string().default('tripcomposer-identity'),
  JWT_AUDIENCE: z.string().default('tripcomposer-platform'),

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
  matching: {
    serviceUrl: env.MATCHING_SERVICE_URL,
    internalSecret: env.INTERNAL_SERVICE_SECRET,
  },
  auth: {
    // Load from secret file first, then fall back to env var
    jwtPublicKey: getJwtPublicKey() || env.JWT_PUBLIC_KEY || '',
    jwtSecret: env.JWT_SECRET || '',
    jwtAlgorithm: env.JWT_ALGORITHM,
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
