import { z } from 'zod';

/**
 * Environment Configuration Schema
 * 
 * Validates all required environment variables at startup.
 * Fails fast with clear error messages if validation fails.
 * 
 * SECURITY: This is a backend service - secrets are permitted here.
 */

const envSchema = z.object({
  // ===========================================================================
  // APP METADATA
  // ===========================================================================
  NODE_ENV: z
    .enum(['development', 'staging', 'production'])
    .default('development'),
  SERVICE_NAME: z.string().default('notifications'),
  SERVICE_VERSION: z.string().default('1.0.0'),
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),

  // ===========================================================================
  // API CONNECTIVITY
  // ===========================================================================
  PORT: z.coerce.number().int().positive().default(3005),
  
  EVENT_BUS_URL: z
    .string()
    .url()
    .describe('AMQP connection URL for event bus'),
  EVENT_BUS_EXCHANGE: z
    .string()
    .min(1)
    .default('tripcomposer.events'),
  EVENT_BUS_QUEUE: z
    .string()
    .min(1)
    .default('notifications.events'),

  // ===========================================================================
  // DATABASE
  // ===========================================================================
  DATABASE_URL: z
    .string()
    .url()
    .refine(
      (url: string) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
      { message: 'DATABASE_URL must be a valid PostgreSQL connection string' }
    ),
  DATABASE_POOL_MIN: z.coerce.number().int().min(1).default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).default(10),

  // ===========================================================================
  // EMAIL PROVIDER
  // ===========================================================================
  EMAIL_PROVIDER: z
    .enum(['resend', 'sendgrid', 'ses', 'console'])
    .default('resend'),
  RESEND_API_KEY: z
    .string()
    .min(1)
    .optional()
    .describe('Required when EMAIL_PROVIDER=resend'),
  SENDGRID_API_KEY: z
    .string()
    .min(1)
    .optional()
    .describe('Required when EMAIL_PROVIDER=sendgrid'),
  AWS_SES_REGION: z
    .string()
    .optional()
    .describe('Required when EMAIL_PROVIDER=ses'),
  AWS_SES_ACCESS_KEY_ID: z
    .string()
    .optional()
    .describe('Required when EMAIL_PROVIDER=ses'),
  AWS_SES_SECRET_ACCESS_KEY: z
    .string()
    .optional()
    .describe('Required when EMAIL_PROVIDER=ses'),
  EMAIL_FROM_ADDRESS: z
    .string()
    .email()
    .describe('Default sender email address'),
  EMAIL_FROM_NAME: z
    .string()
    .min(1)
    .default('HowWePlan'),
  EMAIL_REPLY_TO: z
    .string()
    .email()
    .optional(),

  // ===========================================================================
  // SMS PROVIDER
  // ===========================================================================
  SMS_PROVIDER: z
    .enum(['twilio', 'vonage', 'console'])
    .default('twilio'),
  SMS_ENABLED: z
    .string()
    .transform((v: string) => v === 'true')
    .default('false'),
  TWILIO_ACCOUNT_SID: z
    .string()
    .optional()
    .describe('Required when SMS_ENABLED=true and SMS_PROVIDER=twilio'),
  TWILIO_AUTH_TOKEN: z
    .string()
    .optional()
    .describe('Required when SMS_ENABLED=true and SMS_PROVIDER=twilio'),
  TWILIO_FROM_NUMBER: z
    .string()
    .optional()
    .describe('Required when SMS_ENABLED=true and SMS_PROVIDER=twilio'),

  // ===========================================================================
  // PUSH NOTIFICATIONS
  // ===========================================================================
  PUSH_PROVIDER: z
    .enum(['firebase', 'onesignal', 'console'])
    .default('firebase'),
  PUSH_ENABLED: z
    .string()
    .transform((v: string) => v === 'true')
    .default('false'),
  FIREBASE_PROJECT_ID: z
    .string()
    .optional()
    .describe('Required when PUSH_ENABLED=true and PUSH_PROVIDER=firebase'),
  FIREBASE_PRIVATE_KEY: z
    .string()
    .optional()
    .describe('Required when PUSH_ENABLED=true and PUSH_PROVIDER=firebase'),
  FIREBASE_CLIENT_EMAIL: z
    .string()
    .email()
    .optional()
    .describe('Required when PUSH_ENABLED=true and PUSH_PROVIDER=firebase'),

  // ===========================================================================
  // OPERATIONAL LIMITS
  // ===========================================================================
  RATE_LIMIT_EMAIL_PER_HOUR: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_SMS_PER_HOUR: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_PUSH_PER_HOUR: z.coerce.number().int().positive().default(50),
  
  MAX_RETRY_ATTEMPTS: z.coerce.number().int().min(0).max(10).default(3),
  RETRY_BACKOFF_MS: z.coerce.number().int().positive().default(1000),
  RETRY_BACKOFF_MULTIPLIER: z.coerce.number().positive().default(2),
  
  BATCH_SIZE: z.coerce.number().int().positive().default(100),
  BATCH_INTERVAL_MS: z.coerce.number().int().positive().default(5000),

  // ===========================================================================
  // FEATURE TOGGLES
  // ===========================================================================
  ENABLE_EMAIL: z
    .string()
    .transform((v: string) => v === 'true')
    .default('true'),
  ENABLE_SMS: z
    .string()
    .transform((v: string) => v === 'true')
    .default('false'),
  ENABLE_PUSH: z
    .string()
    .transform((v: string) => v === 'true')
    .default('false'),
  ENABLE_DELIVERY_TRACKING: z
    .string()
    .transform((v: string) => v === 'true')
    .default('true'),

  // ===========================================================================
  // AUDIT / OBSERVABILITY
  // ===========================================================================
  AUDIT_LOG_ENABLED: z
    .string()
    .transform((v: string) => v === 'true')
    .default('true'),
  AUDIT_EVENT_EXCHANGE: z
    .string()
    .min(1)
    .default('tripcomposer.audit'),
  
  HEALTH_CHECK_PATH: z.string().default('/health'),
  
  METRICS_ENABLED: z
    .string()
    .transform((v: string) => v === 'true')
    .default('true'),
  METRICS_PORT: z.coerce.number().int().positive().default(9105),
});

/**
 * Provider-specific validation
 * Ensures required secrets are present based on enabled providers
 */
function validateProviderConfig(config: z.infer<typeof envSchema>): void {
  const errors: string[] = [];

  // Email provider validation
  if (config.ENABLE_EMAIL) {
    switch (config.EMAIL_PROVIDER) {
      case 'resend':
        if (!config.RESEND_API_KEY) {
          errors.push('RESEND_API_KEY is required when EMAIL_PROVIDER=resend');
        }
        break;
      case 'sendgrid':
        if (!config.SENDGRID_API_KEY) {
          errors.push('SENDGRID_API_KEY is required when EMAIL_PROVIDER=sendgrid');
        }
        break;
      case 'ses':
        if (!config.AWS_SES_REGION || !config.AWS_SES_ACCESS_KEY_ID || !config.AWS_SES_SECRET_ACCESS_KEY) {
          errors.push('AWS_SES_REGION, AWS_SES_ACCESS_KEY_ID, and AWS_SES_SECRET_ACCESS_KEY are required when EMAIL_PROVIDER=ses');
        }
        break;
    }
  }

  // SMS provider validation
  if (config.SMS_ENABLED) {
    switch (config.SMS_PROVIDER) {
      case 'twilio':
        if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN || !config.TWILIO_FROM_NUMBER) {
          errors.push('TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER are required when SMS_ENABLED=true');
        }
        break;
    }
  }

  // Push provider validation
  if (config.PUSH_ENABLED) {
    switch (config.PUSH_PROVIDER) {
      case 'firebase':
        if (!config.FIREBASE_PROJECT_ID || !config.FIREBASE_PRIVATE_KEY || !config.FIREBASE_CLIENT_EMAIL) {
          errors.push('FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL are required when PUSH_ENABLED=true');
        }
        break;
    }
  }

  if (errors.length > 0) {
    throw new Error(`Provider configuration errors:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  }
}

/**
 * Parse and validate environment variables
 * Fails fast with clear error messages
 */
function parseEnv(): z.infer<typeof envSchema> {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue: z.ZodIssue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    console.error('❌ Environment validation failed:');
    console.error(formatted);
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    
    process.exit(1);
  }

  // Additional provider-specific validation
  validateProviderConfig(result.data);

  return result.data;
}

/**
 * Validated environment configuration
 * Exported as a frozen object to prevent runtime modifications
 */
export const env = Object.freeze(parseEnv());

/**
 * Type-safe environment configuration
 */
export type Env = typeof env;

/**
 * Check if running in production
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Check if running in development
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Log configuration summary (redacting secrets)
 */
export function logConfigSummary(): void {
  console.info('📧 Notification Service Configuration:');
  console.info(`  Environment: ${env.NODE_ENV}`);
  console.info(`  Service: ${env.SERVICE_NAME}@${env.SERVICE_VERSION}`);
  console.info(`  Port: ${env.PORT}`);
  console.info(`  Email: ${env.ENABLE_EMAIL ? `enabled (${env.EMAIL_PROVIDER})` : 'disabled'}`);
  console.info(`  SMS: ${env.SMS_ENABLED ? `enabled (${env.SMS_PROVIDER})` : 'disabled'}`);
  console.info(`  Push: ${env.PUSH_ENABLED ? `enabled (${env.PUSH_PROVIDER})` : 'disabled'}`);
  console.info(`  Audit: ${env.AUDIT_LOG_ENABLED ? 'enabled' : 'disabled'}`);
  console.info(`  Metrics: ${env.METRICS_ENABLED ? `enabled (:${env.METRICS_PORT})` : 'disabled'}`);
}
