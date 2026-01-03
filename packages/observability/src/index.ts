/**
 * @tripcomposer/observability
 * 
 * Unified observability package for all TripComposer services.
 * Provides:
 * - Distributed tracing (OpenTelemetry)
 * - Structured logging (Pino)
 * - Metrics collection
 * - Express middleware integration
 */

// Tracing
export {
  initTracing,
  getTracer,
  withSpan,
  addSpanAttributes,
  recordException,
  type TracingConfig,
} from './tracing';

// Metrics
export {
  initMetrics,
  getMetrics,
  createCounter,
  createHistogram,
  createGauge,
  type MetricsConfig,
} from './metrics';

// Logging
export {
  createLogger,
  type Logger,
  type LoggerConfig,
} from './logger';

// Express middleware
export {
  tracingMiddleware,
  metricsMiddleware,
  requestLoggingMiddleware,
  correlationMiddleware,
} from './middleware';

// Utilities
export {
  getCorrelationId,
  setCorrelationId,
  withCorrelation,
} from './correlation';
