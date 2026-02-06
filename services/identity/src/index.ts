/**
 * Identity & Access Service - Main Entry Point
 * 
 * Responsibilities:
 * - Authentication (JWT)
 * - Roles: User, Agent, Admin
 * - Account status (active, suspended)
 * - Agent verification state
 * - RBAC enforcement
 */

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { env } from './env.js';
import { createApiRouter } from './api/index.js';
import { rateLimit, stopRateLimitCleanup } from './middleware/index.js';
import { IdentityError } from './services/errors.js';
import { closeDbConnection } from './services/database.js';
import { shutdownEventEmitter } from './events/index.js';

// Silence console in production AFTER startup to allow seeing startup errors
let consoleEnabled = true;
function silenceConsoleInProduction(): void {
  if (process.env.NODE_ENV === 'production' && consoleEnabled) {
    consoleEnabled = false;
    const noop = () => undefined;
    console.log = noop;
    console.info = noop;
    console.warn = noop;
    console.debug = noop;
    // Keep console.error for critical errors
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPRESS APP SETUP
// ─────────────────────────────────────────────────────────────────────────────

const app = express();

// Security middleware
app.use(helmet());

// Trust proxy for correct IP extraction behind reverse proxy
app.set('trust proxy', 1);

// CORS configuration
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin && env.CORS_ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Correlation-Id, X-Request-Id');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

// Body parsing
app.use(express.json({ limit: '1mb' }));

// Request logging in development
if (env.ENABLE_REQUEST_LOGGING) {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// Global rate limiting
app.use(rateLimit());

// API routes
const apiRouter = createApiRouter();
app.use('/api/v1', apiRouter);
// Back-compat for local dev: some clients call routes without /api/v1
app.use('/', apiRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
    },
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  // Log the error
  console.error('Unhandled error:', {
    error: err.message,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  // Handle known errors
  if (err instanceof IdentityError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.toJSON(),
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle unknown errors
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message,
    },
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SERVER STARTUP
// ─────────────────────────────────────────────────────────────────────────────

const server = app.listen(env.PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  Identity & Access Service                                 ║
╠════════════════════════════════════════════════════════════╣
║  Status:      Running                                      ║
║  Port:        ${String(env.PORT).padEnd(43)}║
║  Environment: ${env.NODE_ENV.padEnd(43)}║
╚════════════════════════════════════════════════════════════╝
  `);
  
  // Silence verbose logging after successful startup in production
  silenceConsoleInProduction();
});

// ─────────────────────────────────────────────────────────────────────────────
// GRACEFUL SHUTDOWN
// ─────────────────────────────────────────────────────────────────────────────

async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

  // Stop rate limit cleanup interval
  stopRateLimitCleanup();
  console.log('Rate limit cleanup stopped');

  // Stop accepting new connections
  server.close(async () => {
    console.log('HTTP server closed');

    try {
      // Flush pending events
      await shutdownEventEmitter();
      console.log('Event emitter shutdown complete');

      // Close database connections
      await closeDbConnection();
      console.log('Database connections closed');

      console.log('Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after timeout
  setTimeout(() => {
    console.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 30000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error('Unhandled rejection:', reason);
  gracefulShutdown('unhandledRejection');
});

export { app };
