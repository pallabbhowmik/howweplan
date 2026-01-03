/**
 * Observability Middleware for Requests Service
 * 
 * Provides:
 * - Request/response logging
 * - Metrics collection
 * - Trace context propagation
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

// Metrics storage (in-memory for development)
interface MetricsData {
  requestCount: number;
  errorCount: number;
  latencies: number[];
  statusCodes: Record<string, number>;
}

const metrics: MetricsData = {
  requestCount: 0,
  errorCount: 0,
  latencies: [],
  statusCodes: {},
};

// Keep only last 1000 latencies
const MAX_LATENCIES = 1000;

/**
 * Correlation ID middleware.
 * Extracts or generates correlation ID for request tracing.
 */
export function correlationMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = 
      (req.headers['x-correlation-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      generateId();

    const causationId = req.headers['x-causation-id'] as string;

    // Attach to request
    (req as Request & { correlationId?: string; causationId?: string }).correlationId = correlationId;
    (req as Request & { correlationId?: string; causationId?: string }).causationId = causationId;

    // Set response header
    res.setHeader('X-Correlation-ID', correlationId);

    next();
  };
}

/**
 * Metrics middleware.
 * Collects request counts, latencies, and status codes.
 */
export function metricsMiddleware(): RequestHandler {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const startTime = process.hrtime.bigint();

    // Increment request count
    metrics.requestCount++;

    const originalEnd = res.end.bind(res);
    res.end = function(this: Response, ...args: Parameters<Response['end']>) {
      // Calculate latency
      const endTime = process.hrtime.bigint();
      const latencyMs = Number(endTime - startTime) / 1_000_000;

      // Store latency
      metrics.latencies.push(latencyMs);
      if (metrics.latencies.length > MAX_LATENCIES) {
        metrics.latencies.shift();
      }

      // Track status codes
      const statusCode = res.statusCode.toString();
      metrics.statusCodes[statusCode] = (metrics.statusCodes[statusCode] || 0) + 1;

      // Track errors
      if (res.statusCode >= 400) {
        metrics.errorCount++;
      }

      return originalEnd.apply(this, args);
    } as typeof res.end;

    next();
  };
}

/**
 * Get current metrics.
 */
export function getMetrics(): {
  requestCount: number;
  errorCount: number;
  errorRate: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  statusCodes: Record<string, number>;
} {
  const sortedLatencies = [...metrics.latencies].sort((a, b) => a - b);
  const len = sortedLatencies.length;

  return {
    requestCount: metrics.requestCount,
    errorCount: metrics.errorCount,
    errorRate: metrics.requestCount > 0 ? metrics.errorCount / metrics.requestCount : 0,
    avgLatencyMs: len > 0 ? sortedLatencies.reduce((a, b) => a + b, 0) / len : 0,
    p50LatencyMs: len > 0 ? sortedLatencies[Math.floor(len * 0.5)] : 0,
    p95LatencyMs: len > 0 ? sortedLatencies[Math.floor(len * 0.95)] : 0,
    p99LatencyMs: len > 0 ? sortedLatencies[Math.floor(len * 0.99)] : 0,
    statusCodes: { ...metrics.statusCodes },
  };
}

/**
 * Reset metrics (for testing).
 */
export function resetMetrics(): void {
  metrics.requestCount = 0;
  metrics.errorCount = 0;
  metrics.latencies = [];
  metrics.statusCodes = {};
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
