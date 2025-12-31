/**
 * Messaging Service - Environment Configuration & Validation
 *
 * Validates all required environment variables at startup.
 * Fails fast with clear error messages if configuration is invalid.
 *
 * @module env
 */

import { z } from 'zod';

// =============================================================================
// SCHEMA DEFINITIONS
// =============================================================================

const envSchema = z.object({
  // ---------------------------------------------------------------------------
  // APP METADATA
  // ---------------------------------------------------------------------------
  SERVICE_NAME: z.string().default('messaging-service'),
  NODE_ENV: z
    .enum(['development', 'staging', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3006),
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),

  // ---------------------------------------------------------------------------
  // DATABASE
  // ---------------------------------------------------------------------------
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine(
      (url: string) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
      { message: 'DATABASE_URL must be a valid PostgreSQL connection string' }
    ),

  // ---------------------------------------------------------------------------
  // EVENT BUS
  // ---------------------------------------------------------------------------
  EVENT_BUS_TYPE: z.enum(['redis', 'rabbitmq', 'kafka']).default('redis'),
  EVENT_BUS_URL: z.string().url().optional(),
  EVENT_BUS_PREFIX: z.string().default('tripcomposer:messaging'),

  // ---------------------------------------------------------------------------
  // AUTHENTICATION
  // ---------------------------------------------------------------------------
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(20, 'SUPABASE_SERVICE_ROLE_KEY appears invalid'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ISSUER: z.string().default('tripcomposer'),

  // ---------------------------------------------------------------------------
  // INTERNAL SERVICE COMMUNICATION
  // ---------------------------------------------------------------------------
  BOOKING_SERVICE_URL: z.string().url(),
  IDENTITY_SERVICE_URL: z.string().url(),
  INTERNAL_API_KEY: z
    .string()
    .min(16, 'INTERNAL_API_KEY must be at least 16 characters'),

  // ---------------------------------------------------------------------------
  // MESSAGE RETENTION & COMPLIANCE
  // ---------------------------------------------------------------------------
  MESSAGE_RETENTION_DAYS: z.coerce
    .number()
    .int()
    .positive()
    .min(365, 'MESSAGE_RETENTION_DAYS must be at least 365 for compliance')
    .default(730),
  EVIDENCE_ENCRYPTION_KEY: z
    .string()
    .default('CHANGE-ME-32-CHAR-ENCRYPTION-KEY!!')
    .transform((val) => val.trim() || 'CHANGE-ME-32-CHAR-ENCRYPTION-KEY!!')
    .refine(
      (val) => val.length === 32,
      { message: 'EVIDENCE_ENCRYPTION_KEY must be exactly 32 characters for AES-256' }
    ),

  // ---------------------------------------------------------------------------
  // CONTACT MASKING
  // ---------------------------------------------------------------------------
  MASK_EMAIL_PATTERN: z
    .string()
    .transform((v: string) => v === 'true')
    .default('true'),
  MASK_PHONE_PATTERN: z
    .string()
    .transform((v: string) => v === 'true')
    .default('true'),
  MASK_URL_PATTERN: z
    .string()
    .transform((v: string) => v === 'true')
    .default('true'),
  MASK_SOCIAL_HANDLES: z
    .string()
    .transform((v: string) => v === 'true')
    .default('true'),

  // ---------------------------------------------------------------------------
  // RATE LIMITING
  // ---------------------------------------------------------------------------
  RATE_LIMIT_MESSAGES_PER_MINUTE: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(30),
  RATE_LIMIT_CONVERSATIONS_PER_HOUR: z.coerce
    .number()
    .int()
    .positive()
    .max(50)
    .default(10),
  RATE_LIMIT_COOLDOWN_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(60),

  // ---------------------------------------------------------------------------
  // OPERATIONAL LIMITS
  // ---------------------------------------------------------------------------
  MAX_MESSAGE_LENGTH: z.coerce
    .number()
    .int()
    .positive()
    .max(10000)
    .default(5000),
  MAX_ATTACHMENTS_PER_MESSAGE: z.coerce
    .number()
    .int()
    .positive()
    .max(10)
    .default(5),
  MAX_ATTACHMENT_SIZE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(5242880),
  ALLOWED_ATTACHMENT_TYPES: z
    .string()
    .transform((v: string) => v.split(',').map((t: string) => t.trim()))
    .default('image/jpeg,image/png,image/webp,application/pdf'),

  // ---------------------------------------------------------------------------
  // STORAGE (CLOUDINARY)
  // ---------------------------------------------------------------------------
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),
  CLOUDINARY_FOLDER: z.string().default('messaging-attachments'),
  CLOUDINARY_UPLOAD_PRESET: z.string().optional(),
  CLOUDINARY_AUTO_DELETE_DAYS: z.coerce.number().int().positive().default(730),

  // ---------------------------------------------------------------------------
  // AUDIT & OBSERVABILITY
  // ---------------------------------------------------------------------------
  AUDIT_LOG_ENABLED: z
    .string()
    .transform((v: string) => v === 'true')
    .default('true'),
  OTEL_ENABLED: z
    .string()
    .transform((v: string) => v === 'true')
    .default('false'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  OTEL_SERVICE_NAME: z.string().default('messaging-service'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),

  // ---------------------------------------------------------------------------
  // FEATURE TOGGLES
  // ---------------------------------------------------------------------------
  WEBSOCKET_ENABLED: z
    .string()
    .transform((v: string) => v === 'true')
    .default('true'),
  WEBSOCKET_PORT: z.coerce.number().int().positive().default(3016),
  TYPING_INDICATORS_ENABLED: z
    .string()
    .transform((v: string) => v === 'true')
    .default('true'),
  READ_RECEIPTS_ENABLED: z
    .string()
    .transform((v: string) => v === 'true')
    .default('true'),
  REACTIONS_ENABLED: z
    .string()
    .transform((v: string) => v === 'true')
    .default('false'),
});

// =============================================================================
// VALIDATION & EXPORT
// =============================================================================

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors.map((err: z.ZodIssue) => {
      const path = err.path.join('.');
      return `  - ${path}: ${err.message}`;
    });

    console.error('╔══════════════════════════════════════════════════════════════╗');
    console.error('║           MESSAGING SERVICE - CONFIGURATION ERROR            ║');
    console.error('╠══════════════════════════════════════════════════════════════╣');
    console.error('║ The following environment variables are missing or invalid:  ║');
    console.error('╚══════════════════════════════════════════════════════════════╝');
    console.error('');
    console.error(errors.join('\n'));
    console.error('');
    console.error('Please check your .env file against .env.example');
    console.error('');

    process.exit(1);
  }

  // Additional security validations for production
  if (result.data.NODE_ENV === 'production') {
    const prodErrors: string[] = [];

    if (result.data.JWT_SECRET.includes('development')) {
      prodErrors.push('JWT_SECRET contains "development" - use a secure random value');
    }

    if (result.data.INTERNAL_API_KEY.includes('dev')) {
      prodErrors.push('INTERNAL_API_KEY contains "dev" - use a secure random value');
    }

    if (result.data.EVIDENCE_ENCRYPTION_KEY.includes('here')) {
      prodErrors.push('EVIDENCE_ENCRYPTION_KEY appears to be a placeholder');
    }

    if (!result.data.OTEL_ENABLED) {
      console.warn('WARNING: OpenTelemetry is disabled in production');
    }

    if (result.data.LOG_FORMAT !== 'json') {
      prodErrors.push('LOG_FORMAT must be "json" in production for log aggregation');
    }

    if (prodErrors.length > 0) {
      console.error('╔══════════════════════════════════════════════════════════════╗');
      console.error('║         PRODUCTION SECURITY CONFIGURATION ERRORS             ║');
      console.error('╚══════════════════════════════════════════════════════════════╝');
      console.error('');
      prodErrors.forEach((err) => console.error(`  - ${err}`));
      console.error('');
      process.exit(1);
    }
  }

  return result.data;
}

/**
 * Validated environment configuration.
 * Access this object for all environment variables.
 * Validated at module load time - fails fast if invalid.
 */
export const env = validateEnv();

// =============================================================================
// DERIVED CONFIGURATION
// =============================================================================

/**
 * Derived configuration values computed from environment variables.
 * Use these for complex configuration that depends on multiple env vars.
 */
export const config = {
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',

  server: {
    port: env.PORT,
    websocketPort: env.WEBSOCKET_PORT,
  },

  database: {
    url: env.DATABASE_URL,
    retentionDays: env.MESSAGE_RETENTION_DAYS,
  },

  eventBus: {
    type: env.EVENT_BUS_TYPE,
    url: env.EVENT_BUS_URL,
    prefix: env.EVENT_BUS_PREFIX,
  },

  auth: {
    supabaseUrl: env.SUPABASE_URL,
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    jwtSecret: env.JWT_SECRET,
    jwtIssuer: env.JWT_ISSUER,
  },

  services: {
    bookingUrl: env.BOOKING_SERVICE_URL,
    identityUrl: env.IDENTITY_SERVICE_URL,
    internalApiKey: env.INTERNAL_API_KEY,
  },

  masking: {
    email: env.MASK_EMAIL_PATTERN,
    phone: env.MASK_PHONE_PATTERN,
    url: env.MASK_URL_PATTERN,
    socialHandles: env.MASK_SOCIAL_HANDLES,
  },

  rateLimits: {
    messagesPerMinute: env.RATE_LIMIT_MESSAGES_PER_MINUTE,
    conversationsPerHour: env.RATE_LIMIT_CONVERSATIONS_PER_HOUR,
    cooldownSeconds: env.RATE_LIMIT_COOLDOWN_SECONDS,
  },

  limits: {
    maxMessageLength: env.MAX_MESSAGE_LENGTH,
    maxAttachments: env.MAX_ATTACHMENTS_PER_MESSAGE,
    maxAttachmentSize: env.MAX_ATTACHMENT_SIZE_BYTES,
    allowedAttachmentTypes: env.ALLOWED_ATTACHMENT_TYPES,
  },

  storage: {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
    folder: env.CLOUDINARY_FOLDER,
    uploadPreset: env.CLOUDINARY_UPLOAD_PRESET,
    autoDeleteDays: env.CLOUDINARY_AUTO_DELETE_DAYS,
  },

  features: {
    websocket: env.WEBSOCKET_ENABLED,
    typingIndicators: env.TYPING_INDICATORS_ENABLED,
    readReceipts: env.READ_RECEIPTS_ENABLED,
    reactions: env.REACTIONS_ENABLED,
  },

  observability: {
    auditEnabled: env.AUDIT_LOG_ENABLED,
    otelEnabled: env.OTEL_ENABLED,
    otelEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
    logFormat: env.LOG_FORMAT,
    logLevel: env.LOG_LEVEL,
  },

  encryption: {
    evidenceKey: env.EVIDENCE_ENCRYPTION_KEY,
  },
} as const;

export default env;
