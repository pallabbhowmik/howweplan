/**
 * Metrics Collection with OpenTelemetry
 * 
 * Provides:
 * - Request latency histograms
 * - Error counters
 * - Custom business metrics
 */

import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import {
  metrics,
  Counter,
  Histogram,
  ObservableGauge,
  Meter,
  Attributes,
} from '@opentelemetry/api';

export interface MetricsConfig {
  serviceName: string;
  serviceVersion?: string;
  environment?: string;
  exporterEndpoint?: string;
  exportIntervalMs?: number;
  enabled?: boolean;
}

let meterProvider: MeterProvider | null = null;
let defaultMeter: Meter | null = null;

// Pre-configured metrics
let requestCounter: Counter | null = null;
let requestDuration: Histogram | null = null;
let errorCounter: Counter | null = null;

/**
 * Initialize metrics collection.
 */
export function initMetrics(config: MetricsConfig): void {
  if (meterProvider) {
    console.warn('Metrics already initialized');
    return;
  }

  if (config.enabled === false) {
    console.log('Metrics disabled by configuration');
    return;
  }

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: config.serviceName,
    [ATTR_SERVICE_VERSION]: config.serviceVersion || '1.0.0',
    'deployment.environment': config.environment || 'development',
  });

  const metricExporter = config.exporterEndpoint
    ? new OTLPMetricExporter({ url: config.exporterEndpoint })
    : undefined;

  meterProvider = new MeterProvider({ resource });

  if (metricExporter) {
    meterProvider.addMetricReader(
      new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: config.exportIntervalMs || 60000,
      })
    );
  }

  metrics.setGlobalMeterProvider(meterProvider);
  defaultMeter = meterProvider.getMeter(config.serviceName, config.serviceVersion);

  // Create default metrics
  requestCounter = defaultMeter.createCounter('http_requests_total', {
    description: 'Total number of HTTP requests',
  });

  requestDuration = defaultMeter.createHistogram('http_request_duration_ms', {
    description: 'HTTP request duration in milliseconds',
    unit: 'ms',
  });

  errorCounter = defaultMeter.createCounter('errors_total', {
    description: 'Total number of errors',
  });

  console.log(`Metrics initialized for ${config.serviceName}`);
}

/**
 * Get pre-configured metrics for HTTP requests.
 */
export function getMetrics(): {
  requestCounter: Counter;
  requestDuration: Histogram;
  errorCounter: Counter;
} {
  if (!requestCounter || !requestDuration || !errorCounter) {
    // Return no-op metrics if not initialized
    const noopMeter = metrics.getMeter('noop');
    return {
      requestCounter: noopMeter.createCounter('noop_requests'),
      requestDuration: noopMeter.createHistogram('noop_duration'),
      errorCounter: noopMeter.createCounter('noop_errors'),
    };
  }

  return { requestCounter, requestDuration, errorCounter };
}

/**
 * Create a custom counter metric.
 */
export function createCounter(
  name: string,
  options?: { description?: string; unit?: string }
): Counter {
  const meter = defaultMeter || metrics.getMeter('default');
  return meter.createCounter(name, options);
}

/**
 * Create a custom histogram metric.
 */
export function createHistogram(
  name: string,
  options?: { description?: string; unit?: string }
): Histogram {
  const meter = defaultMeter || metrics.getMeter('default');
  return meter.createHistogram(name, options);
}

/**
 * Create a custom gauge metric.
 */
export function createGauge(
  name: string,
  callback: () => number,
  options?: { description?: string; unit?: string }
): ObservableGauge {
  const meter = defaultMeter || metrics.getMeter('default');
  const gauge = meter.createObservableGauge(name, options);
  
  gauge.addCallback((result) => {
    result.observe(callback());
  });

  return gauge;
}
