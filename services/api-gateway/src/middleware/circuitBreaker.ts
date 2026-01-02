import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { logger } from './logger';

/**
 * Circuit Breaker State
 */
enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

/**
 * Service statistics
 */
interface ServiceStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  nextRetryTime: number | null;
}

/**
 * Circuit Breaker implementation per service
 */
class CircuitBreaker {
  private services: Map<string, ServiceStats> = new Map();
  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeout: number;

  constructor() {
    this.failureThreshold = config.circuitBreaker.failureThreshold;
    this.successThreshold = config.circuitBreaker.successThreshold;
    this.timeout = config.circuitBreaker.timeout;
  }

  /**
   * Get or create stats for a service
   */
  private getStats(serviceName: string): ServiceStats {
    if (!this.services.has(serviceName)) {
      this.services.set(serviceName, {
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        lastFailureTime: null,
        lastSuccessTime: null,
        nextRetryTime: null,
      });
    }
    return this.services.get(serviceName)!;
  }

  /**
   * Check if service is available
   */
  isAvailable(serviceName: string): boolean {
    const stats = this.getStats(serviceName);
    const now = Date.now();

    switch (stats.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        // Check if timeout has passed
        if (stats.nextRetryTime && now >= stats.nextRetryTime) {
          // Transition to half-open
          stats.state = CircuitState.HALF_OPEN;
          stats.successes = 0;
          logger.info({
            timestamp: new Date().toISOString(),
            service: serviceName,
            event: 'circuit_breaker_half_open',
            message: `Circuit breaker for ${serviceName} is now HALF_OPEN`,
          });
          return true;
        }
        return false;

      case CircuitState.HALF_OPEN:
        return true;

      default:
        return true;
    }
  }

  /**
   * Record a successful request
   */
  recordSuccess(serviceName: string): void {
    const stats = this.getStats(serviceName);
    stats.lastSuccessTime = Date.now();

    switch (stats.state) {
      case CircuitState.HALF_OPEN:
        stats.successes++;
        if (stats.successes >= this.successThreshold) {
          // Transition to closed
          stats.state = CircuitState.CLOSED;
          stats.failures = 0;
          stats.successes = 0;
          stats.nextRetryTime = null;
          logger.info({
            timestamp: new Date().toISOString(),
            service: serviceName,
            event: 'circuit_breaker_closed',
            message: `Circuit breaker for ${serviceName} is now CLOSED`,
          });
        }
        break;

      case CircuitState.CLOSED:
        // Reset failure count on success
        if (stats.failures > 0) {
          stats.failures = Math.max(0, stats.failures - 1);
        }
        break;
    }
  }

  /**
   * Record a failed request
   */
  recordFailure(serviceName: string, error?: string): void {
    const stats = this.getStats(serviceName);
    const now = Date.now();
    stats.lastFailureTime = now;

    switch (stats.state) {
      case CircuitState.CLOSED:
        stats.failures++;
        if (stats.failures >= this.failureThreshold) {
          // Transition to open
          stats.state = CircuitState.OPEN;
          stats.nextRetryTime = now + this.timeout;
          logger.warn({
            timestamp: new Date().toISOString(),
            service: serviceName,
            event: 'circuit_breaker_open',
            message: `Circuit breaker for ${serviceName} is now OPEN`,
            failures: stats.failures,
            nextRetryTime: new Date(stats.nextRetryTime).toISOString(),
            error,
          });
        }
        break;

      case CircuitState.HALF_OPEN:
        // Any failure in half-open transitions back to open
        stats.state = CircuitState.OPEN;
        stats.nextRetryTime = now + this.timeout;
        stats.successes = 0;
        logger.warn({
          timestamp: new Date().toISOString(),
          service: serviceName,
          event: 'circuit_breaker_reopened',
          message: `Circuit breaker for ${serviceName} reopened after failure in HALF_OPEN`,
          nextRetryTime: new Date(stats.nextRetryTime).toISOString(),
          error,
        });
        break;

      case CircuitState.OPEN:
        // Already open, just update retry time
        stats.nextRetryTime = now + this.timeout;
        break;
    }
  }

  /**
   * Get circuit breaker status for all services
   */
  getStatus(): Record<string, ServiceStats> {
    const status: Record<string, ServiceStats> = {};
    this.services.forEach((stats, name) => {
      status[name] = { ...stats };
    });
    return status;
  }

  /**
   * Manually reset a circuit breaker
   */
  reset(serviceName: string): void {
    this.services.set(serviceName, {
      state: CircuitState.CLOSED,
      failures: 0,
      successes: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      nextRetryTime: null,
    });
    logger.info({
      timestamp: new Date().toISOString(),
      service: serviceName,
      event: 'circuit_breaker_reset',
      message: `Circuit breaker for ${serviceName} was manually reset`,
    });
  }
}

// Singleton instance
export const circuitBreaker = new CircuitBreaker();

/**
 * Extract service name from request path
 */
function getServiceName(path: string): string {
  const parts = path.split('/').filter(Boolean);
  // Assume path format: /api/{service}/...
  if (parts[0] === 'api' && parts[1]) {
    return parts[1];
  }
  return 'unknown';
}

/**
 * Circuit breaker middleware
 */
export function circuitBreakerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const serviceName = getServiceName(req.path);

  // Skip for health checks
  if (req.path === '/health' || req.path === '/ready') {
    return next();
  }

  if (!circuitBreaker.isAvailable(serviceName)) {
    const status = circuitBreaker.getStatus()[serviceName];

    logger.warn({
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      ip: req.ip || 'unknown',
      userId: req.user?.userId,
      warning: 'Circuit breaker open',
      service: serviceName,
      nextRetryTime: status?.nextRetryTime ? new Date(status.nextRetryTime).toISOString() : null,
    });

    res.status(503).json({
      error: 'Service Unavailable',
      message: `The ${serviceName} service is temporarily unavailable. Please try again later.`,
      code: 'CIRCUIT_BREAKER_OPEN',
      retryAfter: status?.nextRetryTime
        ? Math.ceil((status.nextRetryTime - Date.now()) / 1000)
        : config.circuitBreaker.timeout / 1000,
    });
    return;
  }

  // Store service name for response handling
  res.locals.serviceName = serviceName;

  next();
}

/**
 * Response handler to record success/failure
 */
export function circuitBreakerResponseHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const serviceName = res.locals.serviceName || getServiceName(req.path);
  const originalSend = res.send;

  res.send = function (body: any): Response {
    // Record outcome based on status code
    if (res.statusCode >= 500) {
      circuitBreaker.recordFailure(serviceName, `HTTP ${res.statusCode}`);
    } else {
      circuitBreaker.recordSuccess(serviceName);
    }

    return originalSend.call(this, body);
  };

  next();
}

/**
 * Wrapper for async service calls with circuit breaker
 */
export async function withCircuitBreaker<T>(
  serviceName: string,
  operation: () => Promise<T>,
  fallback?: () => T
): Promise<T> {
  if (!circuitBreaker.isAvailable(serviceName)) {
    if (fallback) {
      return fallback();
    }
    throw new Error(`Service ${serviceName} is temporarily unavailable`);
  }

  try {
    const result = await operation();
    circuitBreaker.recordSuccess(serviceName);
    return result;
  } catch (error) {
    circuitBreaker.recordFailure(serviceName, error instanceof Error ? error.message : 'Unknown error');
    if (fallback) {
      return fallback();
    }
    throw error;
  }
}
