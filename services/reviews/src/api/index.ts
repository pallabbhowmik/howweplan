/**
 * API Index
 * 
 * Combines all API routes into a single application.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { timing } from 'hono/timing';
import { secureHeaders } from 'hono/secure-headers';

import { reviewsApi } from './reviews.api';
import { ratingsApi } from './ratings.api';
import { healthApi } from './health.api';
import { responseTimeRoutes } from './response-time.api';
import { appConfig } from '../config/env';

// =============================================================================
// CREATE APPLICATION
// =============================================================================

const app = new Hono();

// =============================================================================
// GLOBAL MIDDLEWARE
// =============================================================================

// Security headers
app.use('*', secureHeaders());

// CORS configuration
app.use('*', cors({
  origin: appConfig.isProduction 
    ? [
        'https://howweplan.com',
        'https://admin.howweplan.com',
        'https://tripcomposer.com',
        'https://admin.tripcomposer.com',
      ]
    : '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-User-Type', 'X-Request-Id'],
  exposeHeaders: ['X-Request-Id', 'X-Response-Time'],
  maxAge: 86400,
  credentials: true,
}));

// Request logging
app.use('*', logger());

// Response timing
app.use('*', timing());

// Request ID middleware
app.use('*', async (c, next) => {
  const requestId = c.req.header('x-request-id') ?? crypto.randomUUID();
  c.res.headers.set('x-request-id', requestId);
  await next();
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

app.onError((err, c) => {
  console.error('[API Error]', err);

  // Don't expose internal errors in production
  const message = appConfig.isProduction 
    ? 'Internal server error' 
    : err.message;

  return c.json(
    {
      error: {
        message,
        code: 'INTERNAL_ERROR',
      },
    },
    500
  );
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: {
        message: 'Not found',
        code: 'NOT_FOUND',
      },
    },
    404
  );
});

// =============================================================================
// MOUNT ROUTES
// =============================================================================

// Root endpoint - redirect to health for Render health checks
app.get('/', (c) => c.redirect('/health'));

// Health checks (no auth required)
app.route('/health', healthApi);

// API v1 routes
app.route('/api/v1/reviews', reviewsApi);
app.route('/api/v1/ratings', ratingsApi);
app.route('/api/v1/response-time', responseTimeRoutes);

// =============================================================================
// EXPORT
// =============================================================================

export { app };
export { reviewsApi } from './reviews.api';
export { ratingsApi } from './ratings.api';
export { healthApi } from './health.api';
export { responseTimeRoutes } from './response-time.api';
