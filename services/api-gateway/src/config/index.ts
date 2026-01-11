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
  
  // Fall back to environment variable - log if found
  const envKey = process.env['JWT_PUBLIC_KEY'];
  if (envKey) {
    // Only log length to avoid leaking key
    console.info(`✓ Loaded PUBLIC KEY from env JWT_PUBLIC_KEY (${envKey.length} chars)`);
    return envKey.replace(/\\n/g, '\n');
  } else {
    console.warn('⚠️  JWT_PUBLIC_KEY not found in env or secrets. RS256 verification will fail unless fetched from Identity Service.');
  }
  
  return '';
}

/**
 * Get and validate JWT algorithm.
 * Must be RS256 or HS256.
 */
function getJwtAlgorithm(): 'RS256' | 'HS256' {
  const alg = process.env['JWT_ALGORITHM'];
  if (alg === 'RS256' || alg === 'HS256') {
    return alg;
  }
  if (alg) {
    console.warn(`[config] Invalid JWT_ALGORITHM="${alg}". Must be "RS256" or "HS256". Defaulting to RS256.`);
  }
  return 'RS256';
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
    algorithm: getJwtAlgorithm(),
    issuer: process.env.JWT_ISSUER || 'tripcomposer-identity',
    // Must match identity service's JWT_AUDIENCE (default: tripcomposer-platform)
    audience: process.env.JWT_AUDIENCE || 'tripcomposer-platform',
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
  },

  // Supabase JWT Configuration (for admin-web Supabase auth)
  supabase: {
    jwtSecret: process.env.SUPABASE_JWT_SECRET || '',
    // Supabase uses 'authenticated' as the role for logged-in users
    // and has issuer like 'https://xxx.supabase.co/auth/v1'
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

  // Proxy timeout - reduced for faster response times
  proxyTimeout: 15000, // 15 seconds (reduced from 30s)

  // Rate Limiting Configuration
  rateLimit: {
    global: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 3000, // requests per window (increased for real-time features)
    },
    auth: {
      windowMs: 60 * 1000, // 1 minute
      max: 30, // 30 auth attempts per minute
    },
    api: {
      windowMs: 60 * 1000, // 1 minute
      max: 200, // 200 requests per minute per user (increased for polling)
    },
    write: {
      windowMs: 60 * 1000, // 1 minute
      max: 60, // 60 write operations per minute (increased)
    },
  },

  // Circuit Breaker Configuration - Optimized for faster response times
  circuitBreaker: {
    failureThreshold: 3, // Reduced from 5 - faster failure detection
    successThreshold: 2, // Reduced from 3 - faster recovery
    resetTimeout: 15000, // Reduced from 30s - try again sooner
    timeout: 3000, // Reduced from 5s - faster timeout per request
    requestTimeout: 3000, // Alias for compatibility
  },

  // Cache Configuration
  cache: {
    defaultTTL: 300, // 5 minutes
    maxSize: 1000, // Max items in cache
  },

  // Services Configuration
  services: {
    identity: {
      url: process.env.IDENTITY_SERVICE_URL || 'http://localhost:3011',
      timeout: 3000, // Reduced for faster response
    },
    requests: {
      url: process.env.REQUESTS_SERVICE_URL || 'http://localhost:3012',
      timeout: 5000, // Reduced from 10s
    },
    itineraries: {
      url: process.env.ITINERARIES_SERVICE_URL || 'http://localhost:3014',
      timeout: 5000, // Reduced from 10s
    },
    matching: {
      url: process.env.MATCHING_SERVICE_URL || 'http://localhost:3013',
      timeout: 8000, // Reduced from 15s
    },
    'booking-payments': {
      url: process.env.BOOKING_PAYMENTS_SERVICE_URL || 'http://localhost:3015',
      timeout: 15000, // Reduced from 30s, still longer for payments
    },
    messaging: {
      url: process.env.MESSAGING_SERVICE_URL || 'http://localhost:3016',
      timeout: 3000, // Reduced from 5s
    },
    notifications: {
      url: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3019',
      timeout: 3000, // Reduced from 5s
    },
    disputes: {
      url: process.env.DISPUTES_SERVICE_URL || 'http://localhost:3017',
      timeout: 5000, // Reduced from 10s
    },
    audit: {
      url: process.env.AUDIT_SERVICE_URL || 'http://localhost:3010',
      timeout: 3000, // Reduced from 5s
    },
    reviews: {
      url: process.env.REVIEWS_SERVICE_URL || 'http://localhost:3018',
      timeout: 3000, // Reduced from 5s
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
