import { z } from 'zod';

/**
 * Environment variable schema with strict validation.
 * Fails fast at startup if any required variable is missing or invalid.
 */
const envSchema = z.object({
  // ─────────────────────────────────────────────────────────────
  // APP METADATA
  // ─────────────────────────────────────────────────────────────
  SERVICE_NAME: z.string().min(1).default('identity'),
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  INSTANCE_ID: z.string().optional(),

  // ─────────────────────────────────────────────────────────────
  // API CONNECTIVITY
  // ─────────────────────────────────────────────────────────────
  CORS_ALLOWED_ORIGINS: z
    .string()
    .transform((val) => val.split(',').map((origin) => origin.trim()))
    .default('http://localhost:3000'),

  // ─────────────────────────────────────────────────────────────
  // AUTHENTICATION
  // ─────────────────────────────────────────────────────────────
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters for security'),
  JWT_ACCESS_TOKEN_EXPIRY: z.string().regex(/^\d+[smhd]$/, 'Invalid duration format').default('15m'),
  JWT_REFRESH_TOKEN_EXPIRY: z.string().regex(/^\d+[smhd]$/, 'Invalid duration format').default('7d'),
  JWT_ISSUER: z.string().min(1).default('tripcomposer-identity'),
  JWT_AUDIENCE: z.string().min(1).default('tripcomposer-platform'),

  // ─────────────────────────────────────────────────────────────
  // DATABASE (Supabase)
  // ─────────────────────────────────────────────────────────────
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required for backend operations'),

  // ─────────────────────────────────────────────────────────────
  // FEATURE TOGGLES
  // ─────────────────────────────────────────────────────────────
  ENABLE_REQUEST_LOGGING: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  ENABLE_AGENT_VERIFICATION: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),

  // ─────────────────────────────────────────────────────────────
  // OPERATIONAL LIMITS
  // ─────────────────────────────────────────────────────────────
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60000),
  MAX_LOGIN_ATTEMPTS: z.coerce.number().int().min(1).default(5),
  ACCOUNT_LOCKOUT_DURATION_SECONDS: z.coerce.number().int().min(60).default(900),

  // ─────────────────────────────────────────────────────────────
  // AUDIT / OBSERVABILITY
  // ─────────────────────────────────────────────────────────────
  EVENT_BUS_URL: z.string().url('EVENT_BUS_URL must be a valid URL').optional().default(''),
  EVENT_BUS_API_KEY: z.string().optional().default(''),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates and parses environment variables.
 * Throws with detailed error messages if validation fails.
 */
function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors
      .map((err) => `  • ${err.path.join('.')}: ${err.message}`)
      .join('\n');

    console.error('\n╔════════════════════════════════════════════════════════════╗');
    console.error('║  ENVIRONMENT VALIDATION FAILED                             ║');
    console.error('╠════════════════════════════════════════════════════════════╣');
    console.error('║  The following environment variables are missing or        ║');
    console.error('║  invalid. Please check your .env file.                     ║');
    console.error('╚════════════════════════════════════════════════════════════╝\n');
    console.error(errors);
    console.error('\n');

    process.exit(1);
  }

  return result.data;
}

/**
 * Validated environment configuration.
 * Access this instead of process.env directly.
 */
export const env = validateEnv();

/**
 * Security assertions that run at startup.
 * These catch common misconfigurations before they cause issues.
 */
function assertSecurityInvariants(): void {
  // Ensure JWT secret is not a common weak value
  const weakSecrets = [
    'secret',
    'your-jwt-secret',
    'change-me',
    'your-jwt-secret-min-32-characters-long',
  ];
  if (weakSecrets.some((weak) => env.JWT_SECRET.toLowerCase().includes(weak))) {
    if (env.NODE_ENV === 'production') {
      console.error('FATAL: JWT_SECRET contains a weak or default value in production');
      process.exit(1);
    } else {
      console.warn('WARNING: JWT_SECRET appears to be a default value. Change before production.');
    }
  }

  // Ensure service role key is not exposed accidentally
  if (env.SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ')) {
    // Valid JWT format check (starts with base64 of {"alg":...)
    console.info('✓ SUPABASE_SERVICE_ROLE_KEY appears to be properly formatted');
  }

  // Warn about request logging in production
  if (env.NODE_ENV === 'production' && env.ENABLE_REQUEST_LOGGING) {
    console.warn('WARNING: Request logging is enabled in production. This may impact performance.');
  }
}

assertSecurityInvariants();
