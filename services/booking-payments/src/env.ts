/**
 * Environment Configuration and Validation
 *
 * This module validates ALL required environment variables at startup.
 * The service will FAIL FAST with clear error messages if configuration is invalid.
 *
 * SECURITY: Stripe secret keys exist ONLY in this service.
 */

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
  const envKey = process.env.JWT_PUBLIC_KEY;
  return envKey ? envKey.replace(/\\n/g, '\n') : '';
}

const envSchema = z.object({
  // App Metadata
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  SERVICE_NAME: z.string().default('booking-payments'),
  SERVICE_VERSION: z.string().default('1.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3003),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // API Connectivity
  EVENT_BUS_URL: z.string().url(),
  EVENT_BUS_API_KEY: z.string().min(16),

  // Authentication (RS256 with secret files or HS256 fallback)
  INTERNAL_API_KEY: z.string().min(16),
  JWT_PUBLIC_KEY: z.string().optional().transform((val) => val?.replace(/\\n/g, '\n') || ''),
  JWT_SECRET: z.string().optional(),
  JWT_ALGORITHM: z.enum(['RS256', 'HS256']).default('RS256'),
  JWT_ISSUER: z.string().default('tripcomposer-identity'),
  JWT_AUDIENCE: z.string().default('tripcomposer-platform'),

  // Database
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  DATABASE_URL: z.string().min(10),

  // Payments (Razorpay) - ONLY IN THIS SERVICE
  RAZORPAY_KEY_ID: z.string().min(10, 'RAZORPAY_KEY_ID is required'),
  RAZORPAY_KEY_SECRET: z.string().min(10, 'RAZORPAY_KEY_SECRET is required'),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(10, 'RAZORPAY_WEBHOOK_SECRET is required'),

  // Feature Toggles
  ENABLE_LIVE_PAYMENTS: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  ENABLE_AUTOMATIC_REFUNDS: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  ENABLE_DISPUTE_WEBHOOKS: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),

  // Operational Limits
  MIN_BOOKING_AMOUNT_CENTS: z.coerce.number().int().min(100).default(1000),
  MAX_BOOKING_AMOUNT_CENTS: z.coerce.number().int().max(100000000).default(10000000),
  PLATFORM_COMMISSION_RATE: z.coerce.number().min(0.08).max(0.12).default(0.1),
  BOOKING_FEE_RATE: z.coerce.number().min(0).max(0.05).default(0.029),
  BOOKING_FEE_FIXED_CENTS: z.coerce.number().int().min(0).max(100).default(30),
  ESCROW_HOLD_DAYS: z.coerce.number().int().min(1).max(90).default(14),
  REFUND_WINDOW_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  IDEMPOTENCY_TTL_SECONDS: z.coerce.number().int().min(3600).max(604800).default(86400),

  // Audit / Observability
  AUDIT_LOG_ENABLED: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
  AUDIT_RETENTION_DAYS: z.coerce.number().int().min(365).default(2555),
  ENABLE_TRACING: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional().or(z.literal('')),
});

type EnvConfig = z.infer<typeof envSchema>;

function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors.map((err) => {
      const path = err.path.join('.');
      return `  - ${path}: ${err.message}`;
    });

    console.error('\n❌ ENVIRONMENT VALIDATION FAILED\n');
    console.error('The following environment variables are missing or invalid:\n');
    console.error(errors.join('\n'));
    console.error('\nPlease check your .env file against .env.example\n');

    process.exit(1);
  }

  // Additional cross-field validations
  const config = result.data;

  // Ensure live payments only work with live keys (Razorpay test keys start with rzp_test_)
  if (config.ENABLE_LIVE_PAYMENTS && config.RAZORPAY_KEY_ID.startsWith('rzp_test_')) {
    console.error('\n❌ CONFIGURATION ERROR\n');
    console.error('ENABLE_LIVE_PAYMENTS is true but RAZORPAY_KEY_ID is a test key.');
    console.error('Use a live key (rzp_live_*) for production payments.\n');
    process.exit(1);
  }

  // Warn about test mode in production
  if (config.NODE_ENV === 'production' && config.RAZORPAY_KEY_ID.startsWith('rzp_test_')) {
    console.warn('\n⚠️  WARNING: Running in production with Razorpay test keys!\n');
  }

  return config;
}

export const env = validateEnv();

// Type-safe config object for use throughout the service
export const config = {
  app: {
    env: env.NODE_ENV,
    name: env.SERVICE_NAME,
    version: env.SERVICE_VERSION,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
  },
  api: {
    eventBusUrl: env.EVENT_BUS_URL,
    eventBusApiKey: env.EVENT_BUS_API_KEY,
  },
  auth: {
    internalApiKey: env.INTERNAL_API_KEY,
    jwtSecret: env.JWT_SECRET,
  },
  database: {
    supabaseUrl: env.SUPABASE_URL,
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    databaseUrl: env.DATABASE_URL,
  },
  razorpay: {
    keyId: env.RAZORPAY_KEY_ID,
    keySecret: env.RAZORPAY_KEY_SECRET,
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
  },
  features: {
    livePayments: env.ENABLE_LIVE_PAYMENTS,
    automaticRefunds: env.ENABLE_AUTOMATIC_REFUNDS,
    disputeWebhooks: env.ENABLE_DISPUTE_WEBHOOKS,
  },
  limits: {
    minBookingAmountCents: env.MIN_BOOKING_AMOUNT_CENTS,
    maxBookingAmountCents: env.MAX_BOOKING_AMOUNT_CENTS,
    platformCommissionRate: env.PLATFORM_COMMISSION_RATE,
    bookingFeeRate: env.BOOKING_FEE_RATE,
    bookingFeeFixedCents: env.BOOKING_FEE_FIXED_CENTS,
    escrowHoldDays: env.ESCROW_HOLD_DAYS,
    refundWindowDays: env.REFUND_WINDOW_DAYS,
    idempotencyTtlSeconds: env.IDEMPOTENCY_TTL_SECONDS,
  },
  audit: {
    enabled: env.AUDIT_LOG_ENABLED,
    retentionDays: env.AUDIT_RETENTION_DAYS,
    tracingEnabled: env.ENABLE_TRACING,
    otelEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
    sentryDsn: env.SENTRY_DSN,
  },
} as const;

export type Config = typeof config;
