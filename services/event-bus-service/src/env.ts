/**
 * Event Bus Service - Environment Configuration
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
  PORT: z.coerce.number().int().positive().default(4000),
  
  // ─────────────────────────────────────────────────────────────────────────
  // AUTHENTICATION
  // ─────────────────────────────────────────────────────────────────────────
  /** Service-to-service authentication secret */
  SERVICE_AUTH_SECRET: z.string().min(20).default('event-bus-service-secret-change-in-prod'),
  
  // ─────────────────────────────────────────────────────────────────────────
  // EVENT STORE CONFIGURATION
  // ─────────────────────────────────────────────────────────────────────────
  /** Maximum events to store in memory (development) */
  MAX_EVENTS_IN_MEMORY: z.coerce.number().int().positive().default(10000),
  
  /** Event TTL in milliseconds */
  EVENT_TTL_MS: z.coerce.number().int().positive().default(86400000), // 24 hours
  
  // ─────────────────────────────────────────────────────────────────────────
  // DEAD LETTER QUEUE
  // ─────────────────────────────────────────────────────────────────────────
  /** Maximum retry attempts before DLQ */
  MAX_RETRY_ATTEMPTS: z.coerce.number().int().positive().default(3),
  
  /** DLQ retention in milliseconds */
  DLQ_RETENTION_MS: z.coerce.number().int().positive().default(604800000), // 7 days
  
  // ─────────────────────────────────────────────────────────────────────────
  // CONSUMER CONFIGURATION
  // ─────────────────────────────────────────────────────────────────────────
  /** Default batch size for consumers */
  DEFAULT_BATCH_SIZE: z.coerce.number().int().positive().default(10),
  
  /** Visibility timeout for claimed events */
  VISIBILITY_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  
  // ─────────────────────────────────────────────────────────────────────────
  // RATE LIMITING
  // ─────────────────────────────────────────────────────────────────────────
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(1000),
  
  // ─────────────────────────────────────────────────────────────────────────
  // OBSERVABILITY
  // ─────────────────────────────────────────────────────────────────────────
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  METRICS_PORT: z.coerce.number().int().positive().default(9100),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  OTEL_SERVICE_NAME: z.string().default('event-bus-service'),
});

// ============================================================================
// SECURITY VALIDATION
// ============================================================================

/**
 * Validates security rules at startup.
 * Event Bus should NEVER have database credentials, payment secrets, or user data.
 */
function validateSecurityRules(envVars: Record<string, unknown>): void {
  const forbiddenPatterns = [
    { pattern: /^STRIPE_/, message: 'Stripe secrets are forbidden in Event Bus' },
    { pattern: /^DATABASE_/, message: 'Database credentials are forbidden in Event Bus' },
    { pattern: /^POSTGRES_/, message: 'PostgreSQL credentials are forbidden in Event Bus' },
    { pattern: /^SUPABASE_/, message: 'Supabase credentials are forbidden in Event Bus' },
    { pattern: /^NEXT_PUBLIC_/, message: 'Frontend variables are forbidden in Event Bus' },
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
