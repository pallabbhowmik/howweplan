import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Import configuration and middleware
import { config } from './config';
import { logger, requestIdMiddleware, requestLoggerMiddleware, responseLoggerMiddleware } from './middleware/logger';
import { authMiddleware, optionalAuthMiddleware } from './middleware/auth';
import { rbacMiddleware } from './middleware/rbac';
import { adaptiveRateLimiter, authRateLimiter, globalRateLimiter } from './middleware/rateLimiter';
import { sanitizeInput, requestSizeLimiter, requireJson } from './middleware/validation';
import { circuitBreaker, circuitBreakerMiddleware, circuitBreakerResponseHandler } from './middleware/circuitBreaker';
import { cacheMiddleware, getCacheStats, clearCache, invalidateCachePattern } from './middleware/cache';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

const app = express();
const PORT = config.port;

// =============================================================================
// STARTUP INITIALIZATION
// =============================================================================

async function initializeJwtPublicKey(): Promise<void> {
  if (config.jwt.publicKey) {
    logger.info({
      timestamp: new Date().toISOString(),
      event: 'jwt_public_key_already_configured',
      source: 'environment',
    });
    return;
  }

  const identityUrl = config.services.identity?.url;
  if (!identityUrl) {
    logger.warn({
      timestamp: new Date().toISOString(),
      event: 'jwt_public_key_fetch_skipped',
      reason: 'no_identity_url_configured',
    });
    return;
  }

  // Node 18+ has global fetch.
  if (typeof (globalThis as any).fetch !== 'function') {
    logger.warn({
      timestamp: new Date().toISOString(),
      event: 'jwt_public_key_fetch_skipped',
      reason: 'fetch_not_available',
    });
    return;
  }

  // Retry up to 3 times with exponential backoff
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const url = `${identityUrl.replace(/\/+$/, '')}/api/v1/auth/public-key`;
      logger.info({
        timestamp: new Date().toISOString(),
        event: 'jwt_public_key_fetch_attempt',
        url,
        attempt,
      });

      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });

      if (!res.ok) {
        logger.warn({
          timestamp: new Date().toISOString(),
          event: 'jwt_public_key_fetch_failed',
          url,
          status: res.status,
          attempt,
        });
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, attempt * 2000)); // 2s, 4s backoff
          continue;
        }
        return;
      }

      const body = (await res.json().catch(() => null)) as any;
      const publicKey = body?.data?.publicKey || body?.publicKey;

      if (typeof publicKey === 'string' && publicKey.includes('PUBLIC KEY')) {
        config.jwt.publicKey = publicKey;
        logger.info({
          timestamp: new Date().toISOString(),
          event: 'jwt_public_key_loaded',
          source: 'identity_service',
          attempt,
        });
        return;
      } else {
        logger.warn({
          timestamp: new Date().toISOString(),
          event: 'jwt_public_key_fetch_invalid_response',
          url,
          attempt,
        });
      }
    } catch (err) {
      logger.warn({
        timestamp: new Date().toISOString(),
        event: 'jwt_public_key_fetch_error',
        error: err instanceof Error ? err.message : String(err),
        attempt,
      });
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, attempt * 2000));
        continue;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  logger.error({
    timestamp: new Date().toISOString(),
    event: 'jwt_public_key_fetch_exhausted',
    message: 'All attempts to fetch JWT public key failed. Token verification will not work.',
  });
}

// =============================================================================
// CORS MIDDLEWARE (MUST BE FIRST - before Helmet and everything else)
// =============================================================================

// Handle preflight OPTIONS requests immediately - before ANY other middleware
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (origin && config.cors.allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', config.cors.methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', config.cors.allowedHeaders.join(', '));
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  res.status(204).end();
});

// CORS configuration for all other requests
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        callback(null, true);
        return;
      }
      if (config.cors.allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn({
          timestamp: new Date().toISOString(),
          event: 'cors_rejected',
          origin,
        });
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: config.cors.methods,
    allowedHeaders: config.cors.allowedHeaders,
    exposedHeaders: ['X-Request-Id', 'X-Cache', 'ETag', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================

// Security headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", ...config.cors.allowedOrigins],
        fontSrc: ["'self'", 'https:', 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// =============================================================================
// BODY PARSING & REQUEST PROCESSING
// =============================================================================

// Request ID generation (must be first)
app.use(requestIdMiddleware);

// Request logging
app.use(requestLoggerMiddleware);

// Body parsing with size limits
app.use(express.json({ limit: `${config.requestSizeLimit / 1024}kb` }));
app.use(express.urlencoded({ extended: true, limit: `${config.requestSizeLimit / 1024}kb` }));

// Request size limiter
app.use(requestSizeLimiter);

// Input sanitization
app.use(sanitizeInput);

// Content-Type validation for mutations
app.use(requireJson);

// =============================================================================
// HEALTH & STATUS ENDPOINTS
// =============================================================================

// Health check (no auth, no rate limiting)
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.nodeEnv,
  });
});

// Readiness check with service status
app.get('/ready', (req: Request, res: Response) => {
  const circuitStatus = circuitBreaker.getStatus();
  const servicesHealthy = Object.values(circuitStatus).every(
    (s) => s.state === 'CLOSED' || s.state === 'HALF_OPEN'
  );

  res.status(servicesHealthy ? 200 : 503).json({
    status: servicesHealthy ? 'ready' : 'degraded',
    timestamp: new Date().toISOString(),
    services: Object.entries(circuitStatus).map(([name, status]) => ({
      name,
      state: status.state,
      failures: status.failures,
    })),
  });
});

// Circuit breaker status (admin only)
app.get('/admin/circuit-status', authMiddleware, rbacMiddleware, (req: Request, res: Response) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'system') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  res.json(circuitBreaker.getStatus());
});

// Cache management (admin only)
app.get('/admin/cache/stats', authMiddleware, rbacMiddleware, getCacheStats);
app.post('/admin/cache/clear', authMiddleware, rbacMiddleware, clearCache);
app.post('/admin/cache/invalidate', authMiddleware, rbacMiddleware, invalidateCachePattern);

// JWT configuration status (public diagnostic - no secrets exposed)
app.get('/debug/jwt-status', (_req: Request, res: Response) => {
  res.json({
    timestamp: new Date().toISOString(),
    algorithm: config.jwt.algorithm,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    hasPublicKey: !!config.jwt.publicKey,
    publicKeyPrefix: config.jwt.publicKey
      ? config.jwt.publicKey.substring(0, 40) + '...'
      : null,
    hasSecret: !!config.jwt.secret,
  });
});

// =============================================================================
// RATE LIMITING
// =============================================================================

// Apply global rate limiting to all /api routes
app.use('/api/', globalRateLimiter);

// =============================================================================
// AUTHENTICATION & AUTHORIZATION
// =============================================================================

// Auth routes use stricter rate limiting but no auth required
app.use('/api/identity/auth', authRateLimiter);

// Apply optional auth to all API routes (extracts user if token present)
app.use('/api/', optionalAuthMiddleware);

// Apply RBAC middleware (checks permissions based on route)
app.use('/api/', rbacMiddleware);

// =============================================================================
// CIRCUIT BREAKER & CACHING
// =============================================================================

// Circuit breaker check before proxying
app.use('/api/', circuitBreakerMiddleware);

// Response caching for GET requests
app.use('/api/', cacheMiddleware);

// Circuit breaker response handler
app.use('/api/', circuitBreakerResponseHandler);

// =============================================================================
// SERVICE PROXY CONFIGURATION
// =============================================================================

// Proxy options generator
function createProxyOptions(serviceName: string, serviceUrl: string): Options {
  return {
    target: serviceUrl,
    changeOrigin: true,
    pathRewrite: {
      [`^/api/${serviceName}`]: '',
    },
    timeout: config.proxyTimeout,
    proxyTimeout: config.proxyTimeout,
    // Handle body that was already parsed by express.json()
    onProxyReq: (proxyReq, req: Request) => {
      // Forward request ID
      if (req.requestId) {
        proxyReq.setHeader('X-Request-Id', req.requestId);
      }

      // Forward user info if authenticated
      if (req.user) {
        proxyReq.setHeader('X-User-Id', req.user.userId);
        proxyReq.setHeader('X-User-Role', req.user.role);
        proxyReq.setHeader('X-User-Email', req.user.email);
      }

      // Forward original IP
      const clientIp = req.ip || req.socket?.remoteAddress;
      if (clientIp) {
        proxyReq.setHeader('X-Forwarded-For', clientIp);
      }

      // Re-stream body if it was parsed by express.json()
      if (req.body && Object.keys(req.body).length > 0) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }

      logger.debug({
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
        event: 'proxy_request',
        method: req.method,
        path: req.path,
        target: `${serviceUrl}${req.path.replace(`/api/${serviceName}`, '')}`,
        userId: req.user?.userId,
      });
    },
    onProxyRes: (proxyRes, req: Request) => {
      // Add request ID to response
      if (req.requestId) {
        proxyRes.headers['x-request-id'] = req.requestId;
      }

      logger.debug({
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
        event: 'proxy_response',
        method: req.method,
        path: req.path,
        statusCode: proxyRes.statusCode,
      });
    },
    onError: (err, req: Request, res: Response) => {
      const requestId = req.requestId || 'unknown';

      logger.error({
        timestamp: new Date().toISOString(),
        requestId,
        event: 'proxy_error',
        method: req.method,
        path: req.path,
        service: serviceName,
        error: err.message,
      });

      // Record failure for circuit breaker
      circuitBreaker.recordFailure(serviceName, err.message);

      if (!res.headersSent) {
        // Add CORS headers to error response
        const origin = req.headers.origin;
        if (origin && config.cors.allowedOrigins.includes(origin)) {
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
        
        res.status(502).json({
          error: 'Bad Gateway',
          message: `Service ${serviceName} is unavailable`,
          code: 'SERVICE_UNAVAILABLE',
          requestId,
          timestamp: new Date().toISOString(),
        });
      }
    },
  };
}

// Configure proxies for each service
Object.entries(config.services).forEach(([serviceName, serviceConfig]) => {
  app.use(
    `/api/${serviceName}`,
    createProxyMiddleware(createProxyOptions(serviceName, serviceConfig.url))
  );
});

// =============================================================================
// RESPONSE LOGGING
// =============================================================================

app.use(responseLoggerMiddleware);

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use('*', (req: Request, res: Response) => {
  logger.warn({
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    event: 'not_found',
    method: req.method,
    path: req.originalUrl,
    ip: req.ip || 'unknown',
  });

  // Add CORS headers to 404 responses
  const origin = req.headers.origin;
  if (origin && config.cors.allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    code: 'ENDPOINT_NOT_FOUND',
    path: req.originalUrl,
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const requestId = req.requestId || 'unknown';

  logger.error({
    timestamp: new Date().toISOString(),
    requestId,
    event: 'unhandled_error',
    method: req.method,
    path: req.path,
    error: err.message,
    stack: config.nodeEnv === 'development' ? err.stack : undefined,
  });

  // Always add CORS headers to error responses
  const origin = req.headers.origin;
  if (origin && config.cors.allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Handle specific error types
  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({
      error: 'Forbidden',
      message: 'CORS policy does not allow this origin',
      code: 'CORS_ERROR',
      requestId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.status(500).json({
    error: 'Internal Server Error',
    message: config.nodeEnv === 'production' ? 'An unexpected error occurred' : err.message,
    code: 'INTERNAL_ERROR',
    requestId,
    timestamp: new Date().toISOString(),
  });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

async function start(): Promise<void> {
  await initializeJwtPublicKey();

  app.listen(PORT, () => {
  logger.info({
    timestamp: new Date().toISOString(),
    event: 'server_started',
    port: PORT,
    environment: config.nodeEnv,
    services: Object.keys(config.services),
  });

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                   🚀 HowWePlan API Gateway                      ║
╠════════════════════════════════════════════════════════════════╣
║  Port:        ${String(PORT).padEnd(48)}║
║  Environment: ${config.nodeEnv.padEnd(48)}║
║  Services:    ${String(Object.keys(config.services).length).padEnd(48)}║
╠════════════════════════════════════════════════════════════════╣
║  Endpoints:                                                    ║
║    Health:    /health                                          ║
║    Ready:     /ready                                           ║
║    API:       /api/{service}/*                                 ║
╠════════════════════════════════════════════════════════════════╣
║  Features:                                                     ║
║    ✅ JWT Authentication                                       ║
║    ✅ RBAC Authorization                                       ║
║    ✅ Rate Limiting (adaptive)                                 ║
║    ✅ Input Validation & Sanitization                          ║
║    ✅ Circuit Breaker                                          ║
║    ✅ Response Caching                                         ║
║    ✅ Request Correlation IDs                                  ║
║    ✅ Structured Logging                                       ║
║    ✅ Service Keep-Alive (prevents cold starts)                ║
╚════════════════════════════════════════════════════════════════╝
  `);

  console.log('\n📋 Service Routes:');
  Object.entries(config.services).forEach(([name, url]) => {
    console.log(`   /api/${name} → ${url}`);
  });

  // Start keep-alive pings to prevent Render cold starts
  startServiceKeepAlive();
  });
}

// =============================================================================
// SERVICE KEEP-ALIVE (Prevents Render Cold Starts)
// =============================================================================

/**
 * Ping all backend services periodically to keep them warm.
 * This prevents Render's 15-minute idle spindown.
 */
function startServiceKeepAlive(): void {
  const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes (before Render's 15-min timeout)
  
  const pingServices = async () => {
    const services = Object.entries(config.services);
    
    for (const [name, serviceConfig] of services) {
      try {
        const url = `${serviceConfig.url}/health`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
        });
        
        clearTimeout(timeout);
        
        if (response.ok) {
          logger.debug({
            timestamp: new Date().toISOString(),
            event: 'service_keepalive_success',
            service: name,
            status: response.status,
          });
        } else {
          logger.warn({
            timestamp: new Date().toISOString(),
            event: 'service_keepalive_unhealthy',
            service: name,
            status: response.status,
          });
        }
      } catch (error) {
        logger.debug({
          timestamp: new Date().toISOString(),
          event: 'service_keepalive_failed',
          service: name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  };

  // Initial ping after 30 seconds (let services start up first)
  setTimeout(() => {
    pingServices().catch(console.error);
    
    // Then ping every 10 minutes
    setInterval(() => {
      pingServices().catch(console.error);
    }, PING_INTERVAL_MS);
  }, 30000);

  logger.info({
    timestamp: new Date().toISOString(),
    event: 'service_keepalive_started',
    intervalMs: PING_INTERVAL_MS,
    services: Object.keys(config.services),
  });
}

start().catch((err) => {
  logger.error({
    timestamp: new Date().toISOString(),
    event: 'startup_failed',
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
