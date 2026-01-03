/**
 * Distributed Tracing with OpenTelemetry
 * 
 * Provides automatic instrumentation for:
 * - HTTP requests
 * - Database queries
 * - Event bus operations
 * - External service calls
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import {
  trace,
  context,
  SpanStatusCode,
  Span,
  Tracer,
  SpanKind,
  Attributes,
} from '@opentelemetry/api';

export interface TracingConfig {
  serviceName: string;
  serviceVersion?: string;
  environment?: string;
  exporterEndpoint?: string;
  enabled?: boolean;
  sampleRate?: number;
}

let sdk: NodeSDK | null = null;
let defaultTracer: Tracer | null = null;

/**
 * Initialize OpenTelemetry tracing for the service.
 * Call this BEFORE importing other modules that should be traced.
 */
export function initTracing(config: TracingConfig): void {
  if (sdk) {
    console.warn('Tracing already initialized');
    return;
  }

  if (config.enabled === false) {
    console.log('Tracing disabled by configuration');
    return;
  }

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: config.serviceName,
    [ATTR_SERVICE_VERSION]: config.serviceVersion || '1.0.0',
    'deployment.environment': config.environment || 'development',
  });

  const traceExporter = config.exporterEndpoint
    ? new OTLPTraceExporter({ url: config.exporterEndpoint })
    : undefined;

  sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-http': {
          ignoreIncomingPaths: [/\/health/, /\/ready/, /\/metrics/],
        },
      }),
    ],
  });

  sdk.start();

  defaultTracer = trace.getTracer(config.serviceName, config.serviceVersion);

  process.on('SIGTERM', () => {
    sdk?.shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error: unknown) => console.log('Error terminating tracing', error));
  });

  console.log(`Tracing initialized for ${config.serviceName}`);
}

/**
 * Get the default tracer instance.
 */
export function getTracer(): Tracer {
  if (!defaultTracer) {
    // Return a no-op tracer if not initialized
    return trace.getTracer('noop');
  }
  return defaultTracer;
}

/**
 * Execute a function within a new span.
 */
export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  options?: {
    kind?: SpanKind;
    attributes?: Attributes;
  }
): Promise<T> {
  const tracer = getTracer();
  
  return tracer.startActiveSpan(
    name,
    { kind: options?.kind || SpanKind.INTERNAL },
    async (span) => {
      try {
        if (options?.attributes) {
          span.setAttributes(options.attributes);
        }
        
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        recordException(error, span);
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

/**
 * Add attributes to the current active span.
 */
export function addSpanAttributes(attributes: Attributes): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttributes(attributes);
  }
}

/**
 * Record an exception on the current or provided span.
 */
export function recordException(error: unknown, span?: Span): void {
  const targetSpan = span || trace.getActiveSpan();
  if (targetSpan && error instanceof Error) {
    targetSpan.recordException(error);
  }
}

/**
 * Get the current trace context for propagation.
 */
export function getCurrentTraceContext(): { traceId: string; spanId: string } | null {
  const span = trace.getActiveSpan();
  if (!span) return null;
  
  const spanContext = span.spanContext();
  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
  };
}
