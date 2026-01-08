import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';

/**
 * Read a secret file from Render's secret files location.
 */
function readSecretFile(filename: string): string | undefined {
  const paths = [
    `/etc/secrets/${filename}`,
    `./secrets/${filename}`,
    `./${filename}`,
  ];
  for (const path of paths) {
    if (existsSync(path)) {
      try {
        const content = readFileSync(path, 'utf-8').trim();
        console.info(`✓ Loaded ${filename} from: ${path}`);
        return content;
      } catch { /* continue */ }
    }
  }
  return undefined;
}

/**
 * Get JWT public key from secret file or env var.
 */
function getJwtPublicKey(): string {
  const fileContent = readSecretFile('jwt-public.pem');
  if (fileContent) return fileContent;
  const envKey = process.env['JWT_PUBLIC_KEY'];
  return envKey ? envKey.replace(/\\n/g, '\n') : '';
}

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
  INTERNAL_API_KEY: z.string().default('dev-internal-api-key'),

  // ============================================================
  // AUTHENTICATION (RS256 with secret files or HS256 fallback)
  // ============================================================
  JWT_PUBLIC_KEY: z.string().optional().transform((val) => val?.replace(/\\n/g, '\n') || ''),
  JWT_SECRET: z.string().optional(),
  JWT_ALGORITHM: z.enum(['RS256', 'HS256']).default('RS256'),
  JWT_ISSUER: z.string().default('tripcomposer-identity'),
  JWT_AUDIENCE: z.string().default('tripcomposer-platform'),

  // ============================================================
  // DATABASE (optional with defaults for dev)
  // ============================================================
  SUPABASE_URL: z.string().url().default('https://placeholder.supabase.co'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default('dev-service-role-key'),
  DATABASE_URL: z.string().default('postgresql://localhost:5432/tripcomposer'),

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
  
  /** Hours before a SUBMITTED itinerary expires if not selected */
  ITINERARY_EXPIRY_HOURS: z.coerce.number().int().positive().default(168), // 7 days
  
  /** Interval in minutes for checking expired itineraries */
  EXPIRY_CHECK_INTERVAL_MINUTES: z.coerce.number().int().positive().default(15),

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
