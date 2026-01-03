import dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';
dotenv.config();

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
 * Priority: Secret file > Environment variable
 */
function getJwtPublicKey(): string {
  // Try secret file first
  const fileContent = readSecretFile('jwt-public.pem');
  if (fileContent) return fileContent;
  
  // Fall back to environment variable
  const envKey = process.env['JWT_PUBLIC_KEY'];
  if (envKey) return envKey.replace(/\\n/g, '\n');
  
  return '';
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // JWT Configuration
  jwt: {
    // RS256 public key for verifying tokens (from secret file or env var)
    publicKey: getJwtPublicKey(),
    // Legacy HS256 shared secret (fallback)
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    // Algorithm: RS256 (asymmetric) or HS256 (symmetric)
    algorithm: (process.env.JWT_ALGORITHM || 'RS256') as 'RS256' | 'HS256',
    issuer: process.env.JWT_ISSUER || 'tripcomposer-identity',
    audience: process.env.JWT_AUDIENCE || 'tripcomposer-services',
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
  },

  // CORS Configuration
  cors: {
    allowedOrigins: process.env.CORS_ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'https://howweplan-user.vercel.app',
      'https://howweplan-agent.vercel.app',
      'https://howweplan-admin.vercel.app',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-API-Key'],
  },

  // Proxy timeout
  proxyTimeout: 30000, // 30 seconds

  // Rate Limiting Configuration
  rateLimit: {
    global: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // requests per window
    },
    auth: {
      windowMs: 60 * 1000, // 1 minute
      max: 5, // 5 login attempts per minute
    },
    api: {
      windowMs: 60 * 1000, // 1 minute
      max: 60, // 60 requests per minute per user
    },
    write: {
      windowMs: 60 * 1000, // 1 minute
      max: 10, // 10 write operations per minute
    },
  },

  // Circuit Breaker Configuration
  circuitBreaker: {
    failureThreshold: 5, // Number of failures before opening
    successThreshold: 3, // Number of successes in half-open to close
    resetTimeout: 30000, // 30 seconds before trying again
    timeout: 5000, // 5 second timeout per request
    requestTimeout: 5000, // Alias for compatibility
  },

  // Cache Configuration
  cache: {
    defaultTTL: 300, // 5 minutes
    maxSize: 1000, // Max items in cache
  },

  // Services Configuration
  services: {
    identity: {
      url: process.env.IDENTITY_SERVICE_URL || 'http://localhost:3001',
      timeout: 5000,
    },
    requests: {
      url: process.env.REQUESTS_SERVICE_URL || 'http://localhost:3002',
      timeout: 10000,
    },
    itineraries: {
      url: process.env.ITINERARIES_SERVICE_URL || 'http://localhost:3003',
      timeout: 10000,
    },
    matching: {
      url: process.env.MATCHING_SERVICE_URL || 'http://localhost:3004',
      timeout: 15000,
    },
    'booking-payments': {
      url: process.env.BOOKING_PAYMENTS_SERVICE_URL || 'http://localhost:3005',
      timeout: 30000, // Longer for payment processing
    },
    messaging: {
      url: process.env.MESSAGING_SERVICE_URL || 'http://localhost:3006',
      timeout: 5000,
    },
    notifications: {
      url: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3007',
      timeout: 5000,
    },
    disputes: {
      url: process.env.DISPUTES_SERVICE_URL || 'http://localhost:3008',
      timeout: 10000,
    },
    audit: {
      url: process.env.AUDIT_SERVICE_URL || 'http://localhost:3009',
      timeout: 5000,
    },
    reviews: {
      url: process.env.REVIEWS_SERVICE_URL || 'http://localhost:3010',
      timeout: 5000,
    },
  },

  // Internal Service Auth
  internalAuth: {
    secret: process.env.INTERNAL_SERVICE_SECRET || 'internal-service-secret-change-in-production',
  },

  // Request Size Limits
  requestSizeLimit: 1024 * 1024, // 1MB in bytes
  limits: {
    maxBodySize: '1mb',
    maxQueryLength: 2048,
    maxHeaderSize: 8192,
  },
};

export type ServiceName = keyof typeof config.services;
