/**
 * Messaging Service - Environment Configuration & Validation
 *
 * Validates all required environment variables at startup.
 * Fails fast with clear error messages if configuration is invalid.
 *
 * @module env
 */

import { createHash } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { z } from 'zod';

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
    .default('postgresql://localhost:5432/tripcomposer')
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
  // AUTHENTICATION (RS256 with secret files or HS256 fallback) - optional with defaults
  // ---------------------------------------------------------------------------
  SUPABASE_URL: z.string().url().default('https://placeholder.supabase.co'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default('dev-service-role-key-20-chars'),
  JWT_PUBLIC_KEY: z.string().optional().transform((val) => val?.replace(/\\n/g, '\n') || ''),
  JWT_SECRET: z.string().optional(),
  JWT_ALGORITHM: z.enum(['RS256', 'HS256']).default('RS256'),
  JWT_ISSUER: z.string().default('tripcomposer-identity'),

  // ---------------------------------------------------------------------------
  // INTERNAL SERVICE COMMUNICATION - optional with defaults
  // ---------------------------------------------------------------------------
  BOOKING_SERVICE_URL: z.string().url().default('http://localhost:3815'),
  IDENTITY_SERVICE_URL: z.string().url().default('http://localhost:3811'),
  INTERNAL_API_KEY: z.string().default('dev-internal-api-key'),

  // ---------------------------------------------------------------------------
  // MESSAGE RETENTION & COMPLIANCE
  // ---------------------------------------------------------------------------
  MESSAGE_RETENTION_DAYS: z.coerce
    .number()
    .int()
    .positive()
    .min(365, 'MESSAGE_RETENTION_DAYS must be at least 365 for compliance')
    .default(730),
  /**
   * A user-provided secret used to derive a 32-byte AES-256 key.
   *
   * Render (and other platforms) sometimes provide empty strings or wrap values
   * with quotes; we normalize and then derive a fixed-size key via SHA-256.
   */
  EVIDENCE_ENCRYPTION_KEY: z
    .string()
    .default('CHANGE-ME-IN-PROD')
    .transform((raw) => {
      const trimmed = raw.trim();
      const unquoted =
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
          ? trimmed.slice(1, -1)
          : trimmed;
      const normalized = unquoted.trim() || 'CHANGE-ME-IN-PROD';

      // Derive a 32-byte key suitable for AES-256.
      return createHash('sha256').update(normalized, 'utf8').digest();
    }),

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

    if (result.data.JWT_SECRET?.includes('development')) {
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

  // ---------------------------------------------------------------------------
  // Staging/production safety checks
  // ---------------------------------------------------------------------------
  const isProdLike = result.data.NODE_ENV === 'production' || result.data.NODE_ENV === 'staging';
  if (isProdLike) {
    const rawDatabaseUrl = (process.env['DATABASE_URL'] ?? '').trim();
    const configuredDatabaseUrl = rawDatabaseUrl || result.data.DATABASE_URL;
    const isLocalhost = /(^|\/\/)(localhost|127\.0\.0\.1)(:|\/|$)/i.test(configuredDatabaseUrl);
    if (!rawDatabaseUrl) {
      console.error('\n❌ DATABASE_URL is required in staging/production (was not set).\n');
      process.exit(1);
    }
    if (isLocalhost) {
      console.error('\n❌ DATABASE_URL points to localhost in staging/production.\n');
      process.exit(1);
    }

    const algorithm = result.data.JWT_ALGORITHM;
    const jwtPublicKey = getJwtPublicKey() || result.data.JWT_PUBLIC_KEY || '';
    const jwtSecret = result.data.JWT_SECRET || '';

    if (algorithm === 'RS256' && !jwtPublicKey.trim()) {
      console.error('\n❌ JWT_PUBLIC_KEY (or secret file jwt-public.pem) is required for RS256 in staging/production.\n');
      process.exit(1);
    }
    if (algorithm === 'HS256' && !jwtSecret.trim()) {
      console.error('\n❌ JWT_SECRET is required for HS256 in staging/production.\n');
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
    jwtPublicKey: getJwtPublicKey() || env.JWT_PUBLIC_KEY || '',
    jwtSecret: env.JWT_SECRET || '',
    jwtAlgorithm: env.JWT_ALGORITHM,
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
