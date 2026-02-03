/**
 * Booking & Payments Service Entry Point
 *
 * Merchant of Record service for the HowWePlan platform.
 *
 * SECURITY: This is the ONLY service with access to payment provider secret keys.
 * Uses Razorpay as the primary payment gateway.
 */

import express from 'express';
import helmet from 'helmet';
import { config } from './env.js';
import { logger } from './services/logger.service.js';
import { router } from './api/routes.js';
import { idempotencyMiddleware } from './middleware/idempotency.middleware.js';

if (process.env.NODE_ENV === 'production') {
  const noop = () => undefined;
  console.log = noop;
  console.info = noop;
  console.warn = noop;
  console.error = noop;
  console.debug = noop;
}

const app = express();

// CORS middleware - must be before other middleware
app.use((req, res, next) => {
  const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'];
  const origin = req.headers.origin;
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Correlation-ID');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  
  next();
});

// Security headers
app.use(helmet());

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Parse JSON bodies for most routes
app.use((req, res, next) => {
  // Skip JSON parsing for Stripe webhooks (need raw body)
  if (req.path === '/api/v1/webhooks/stripe') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Raw body parsing for Stripe webhooks
app.use(
  '/api/v1/webhooks/stripe',
  express.raw({ type: 'application/json' })
);

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(
      {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        correlationId: req.headers['x-correlation-id'],
      },
      'Request completed'
    );
  });
  next();
});

// Idempotency middleware - CRITICAL for payment operations
app.use(idempotencyMiddleware());

// Mount routes
app.use(router);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
  });
});

// Error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(
    {
      error: err.message,
      stack: err.stack,
      path: req.path,
    },
    'Unhandled error'
  );

  res.status(500).json({
    error: 'Internal Server Error',
    message: config.app.env === 'development' ? err.message : undefined,
  });
});

// Start server
const server = app.listen(config.app.port, () => {
  logger.info(
    {
      port: config.app.port,
      env: config.app.env,
      version: config.app.version,
      livePayments: config.features.livePayments,
    },
    `${config.app.name} service started`
  );
});

// Graceful shutdown
const shutdown = (signal: string) => {
  logger.info({ signal }, 'Shutdown signal received');

  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app };
