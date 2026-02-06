/**
 * API Gateway - Environment Configuration
 * 
 * Validates all required environment variables at startup.
 * Fails fast with clear errors if configuration is invalid.
 * 
 * Constitution Compliance:
 * - Architecture Rule 9: Validate all inputs, even from internal services
 */

import { z } from 'zod';

// ============================================================================
// SCHEMA DEFINITION
// ============================================================================

const envSchema = z.object({
  // ─────────────────────────────────────────────────────────────────────────
  // APP METADATA
  // ─────────────────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  
  // ─────────────────────────────────────────────────────────────────────────
  // SERVICE ENDPOINTS
  // ─────────────────────────────────────────────────────────────────────────
  IDENTITY_SERVICE_URL: z.string().url().default('http://localhost:3002'),
  REQUESTS_SERVICE_URL: z.string().url().default('http://localhost:3003'),
  MATCHING_SERVICE_URL: z.string().url().default('http://localhost:3004'),
  ITINERARIES_SERVICE_URL: z.string().url().default('http://localhost:3005'),
  BOOKING_PAYMENTS_SERVICE_URL: z.string().url().default('http://localhost:3006'),
  MESSAGING_SERVICE_URL: z.string().url().default('http://localhost:3007'),
  NOTIFICATIONS_SERVICE_URL: z.string().url().default('http://localhost:3008'),
  DISPUTES_SERVICE_URL: z.string().url().default('http://localhost:3009'),
  REVIEWS_SERVICE_URL: z.string().url().default('http://localhost:3010'),
  AUDIT_SERVICE_URL: z.string().url().default('http://localhost:3011'),
  EVENT_BUS_URL: z.string().url().optional().or(z.literal('')).default(''),
  
  // ─────────────────────────────────────────────────────────────────────────
  // AUTHENTICATION
  // ─────────────────────────────────────────────────────────────────────────
  JWT_PUBLIC_KEY: z.string().optional(),
  JWT_PUBLIC_KEY_FILE: z.string().optional(),
  INTERNAL_SERVICE_SECRET: z.string().min(20).default('internal-service-secret-change-in-production'),
  
  // ─────────────────────────────────────────────────────────────────────────
  // CORS & SECURITY
  // ─────────────────────────────────────────────────────────────────────────
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),
  
  // ─────────────────────────────────────────────────────────────────────────
  // RATE LIMITING
  // ─────────────────────────────────────────────────────────────────────────
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
  
  // ─────────────────────────────────────────────────────────────────────────
  // TIMEOUTS
  // ─────────────────────────────────────────────────────────────────────────
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  
  // ─────────────────────────────────────────────────────────────────────────
  // OBSERVABILITY
  // ─────────────────────────────────────────────────────────────────────────
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  OTEL_SERVICE_NAME: z.string().default('api-gateway'),
});

// ============================================================================
// SECURITY VALIDATION
// ============================================================================

/**
 * Validates security rules at startup.
 * API Gateway should NEVER have database credentials or payment secrets.
 */
function validateSecurityRules(envVars: Record<string, unknown>): void {
  const forbiddenPatterns = [
    { pattern: /^STRIPE_SECRET/, message: 'Stripe secrets are forbidden in API Gateway' },
    { pattern: /^DATABASE_/, message: 'Database credentials are forbidden in API Gateway' },
    { pattern: /^POSTGRES_/, message: 'PostgreSQL credentials are forbidden in API Gateway' },
    { pattern: /^SUPABASE_SERVICE_ROLE/, message: 'Supabase service role key is forbidden in API Gateway' },
  ];

  for (const key of Object.keys(envVars)) {
    for (const { pattern, message } of forbiddenPatterns) {
      if (pattern.test(key) && envVars[key]) {
        throw new Error(`SECURITY VIOLATION: ${message}. Found: ${key}`);
      }
    }
  }
}

// ============================================================================
// PARSE AND EXPORT
// ============================================================================

function parseEnv() {
  // Run security validation first
  validateSecurityRules(process.env);
  
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    const errors = result.error.errors.map(
      (e) => `  - ${e.path.join('.')}: ${e.message}`
    ).join('\n');
    
    console.error('❌ Environment validation failed:\n' + errors);
    process.exit(1);
  }
  
  return result.data;
}

export const env = parseEnv();

export type Env = z.infer<typeof envSchema>;
