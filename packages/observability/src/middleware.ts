/**
 * Express Middleware for Observability
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { getMetrics } from './metrics';
import { addSpanAttributes, getTracer } from './tracing';
import { 
  withCorrelation, 
  extractCorrelationFromHeaders,
  generateCorrelationId,
} from './correlation';
import { SpanKind, SpanStatusCode } from '@opentelemetry/api';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      causationId?: string;
      startTime?: number;
    }
  }
}

/**
 * Correlation ID middleware.
 * Extracts or generates correlation ID and attaches to request.
 */
export function correlationMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { correlationId, causationId } = extractCorrelationFromHeaders(
      req.headers as Record<string, string | undefined>
    );

    req.correlationId = correlationId;
    req.causationId = causationId;

    // Set response headers for tracing
    res.setHeader('X-Correlation-ID', correlationId);
    
    // Run the rest of the request with correlation context
    withCorrelation(correlationId, () => next(), causationId);
  };
}

/**
 * Tracing middleware.
 * Creates a span for each incoming request.
 */
export function tracingMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const tracer = getTracer();
    
    const span = tracer.startSpan(`${req.method} ${req.path}`, {
      kind: SpanKind.SERVER,
      attributes: {
        'http.method': req.method,
        'http.url': req.url,
        'http.route': req.route?.path || req.path,
        'http.user_agent': req.get('user-agent'),
        'correlation.id': req.correlationId,
      },
    });

    // Store original end to capture response status
    const originalEnd = res.end.bind(res);
    
    res.end = function(this: Response, ...args: Parameters<Response['end']>) {
      span.setAttributes({
        'http.status_code': res.statusCode,
      });

      if (res.statusCode >= 400) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${res.statusCode}`,
        });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }

      span.end();
      return originalEnd.apply(this, args);
    } as typeof res.end;

    next();
  };
}

/**
 * Metrics middleware.
 * Records request count, duration, and errors.
 */
export function metricsMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = process.hrtime.bigint();
    req.startTime = Number(startTime);

    const { requestCounter, requestDuration, errorCounter } = getMetrics();

    // Store original end to capture metrics
    const originalEnd = res.end.bind(res);

    res.end = function(this: Response, ...args: Parameters<Response['end']>) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1_000_000; // Convert to ms

      const labels = {
        method: req.method,
        route: req.route?.path || req.path,
        status_code: String(res.statusCode),
      };

      requestCounter.add(1, labels);
      requestDuration.record(duration, labels);

      if (res.statusCode >= 400) {
        errorCounter.add(1, {
          ...labels,
          error_type: res.statusCode >= 500 ? 'server_error' : 'client_error',
        });
      }

      return originalEnd.apply(this, args);
    } as typeof res.end;

    next();
  };
}

/**
 * Request logging middleware.
 * Logs all incoming requests with relevant details.
 */
export function requestLoggingMiddleware(
  logger: { info: (obj: object, msg: string) => void; error: (obj: object, msg: string) => void }
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    logger.info(
      {
        type: 'request_start',
        method: req.method,
        url: req.url,
        correlationId: req.correlationId,
        userAgent: req.get('user-agent'),
        ip: req.ip,
      },
      `→ ${req.method} ${req.url}`
    );

    const originalEnd = res.end.bind(res);

    res.end = function(this: Response, ...args: Parameters<Response['end']>) {
      const duration = Date.now() - startTime;

      const logFn = res.statusCode >= 400 ? logger.error : logger.info;
      
      logFn(
        {
          type: 'request_end',
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          correlationId: req.correlationId,
        },
        `← ${req.method} ${req.url} ${res.statusCode} ${duration}ms`
      );

      return originalEnd.apply(this, args);
    } as typeof res.end;

    next();
  };
}
