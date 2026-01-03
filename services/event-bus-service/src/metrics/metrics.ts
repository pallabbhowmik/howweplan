/**
 * Metrics & Observability
 * 
 * Tracks key event bus metrics:
 * - Events published per second
 * - Delivery latency
 * - Failure rates
 * - Consumer lag
 * - DLQ size
 * - Retry counts
 * 
 * Exposes /metrics endpoint for Prometheus scraping
 */

import { EventDomain, EventState, EventBusMetrics } from '../types/event.types';
import { logger } from '../utils/logger';

// ============================================================================
// METRIC TYPES
// ============================================================================

interface Counter {
  name: string;
  help: string;
  labels: string[];
  values: Map<string, number>;
}

interface Gauge {
  name: string;
  help: string;
  labels: string[];
  values: Map<string, number>;
}

interface Histogram {
  name: string;
  help: string;
  labels: string[];
  buckets: number[];
  values: Map<string, { count: number; sum: number; buckets: number[] }>;
}

// ============================================================================
// METRICS REGISTRY
// ============================================================================

class MetricsRegistry {
  private counters: Map<string, Counter> = new Map();
  private gauges: Map<string, Gauge> = new Map();
  private histograms: Map<string, Histogram> = new Map();

  registerCounter(name: string, help: string, labels: string[] = []): void {
    this.counters.set(name, { name, help, labels, values: new Map() });
  }

  registerGauge(name: string, help: string, labels: string[] = []): void {
    this.gauges.set(name, { name, help, labels, values: new Map() });
  }

  registerHistogram(
    name: string,
    help: string,
    labels: string[] = [],
    buckets: number[] = [0.01, 0.05, 0.1, 0.5, 1, 2.5, 5, 10]
  ): void {
    this.histograms.set(name, { name, help, labels, buckets, values: new Map() });
  }

  incrementCounter(name: string, labels: Record<string, string> = {}, value = 1): void {
    const counter = this.counters.get(name);
    if (!counter) return;
    
    const key = this.labelsToKey(labels);
    const current = counter.values.get(key) || 0;
    counter.values.set(key, current + value);
  }

  setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const gauge = this.gauges.get(name);
    if (!gauge) return;
    
    const key = this.labelsToKey(labels);
    gauge.values.set(key, value);
  }

  observeHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    const histogram = this.histograms.get(name);
    if (!histogram) return;
    
    const key = this.labelsToKey(labels);
    let entry = histogram.values.get(key);
    
    if (!entry) {
      entry = {
        count: 0,
        sum: 0,
        buckets: new Array(histogram.buckets.length).fill(0),
      };
      histogram.values.set(key, entry);
    }
    
    entry.count++;
    entry.sum += value;
    
    for (let i = 0; i < histogram.buckets.length; i++) {
      if (value <= histogram.buckets[i]) {
        entry.buckets[i]++;
      }
    }
  }

  private labelsToKey(labels: Record<string, string>): string {
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
  }

  /**
   * Export metrics in Prometheus format
   */
  toPrometheusFormat(): string {
    const lines: string[] = [];
    
    // Counters
    for (const counter of this.counters.values()) {
      lines.push(`# HELP ${counter.name} ${counter.help}`);
      lines.push(`# TYPE ${counter.name} counter`);
      
      for (const [key, value] of counter.values.entries()) {
        const labels = key ? `{${key}}` : '';
        lines.push(`${counter.name}${labels} ${value}`);
      }
    }
    
    // Gauges
    for (const gauge of this.gauges.values()) {
      lines.push(`# HELP ${gauge.name} ${gauge.help}`);
      lines.push(`# TYPE ${gauge.name} gauge`);
      
      for (const [key, value] of gauge.values.entries()) {
        const labels = key ? `{${key}}` : '';
        lines.push(`${gauge.name}${labels} ${value}`);
      }
    }
    
    // Histograms
    for (const histogram of this.histograms.values()) {
      lines.push(`# HELP ${histogram.name} ${histogram.help}`);
      lines.push(`# TYPE ${histogram.name} histogram`);
      
      for (const [key, entry] of histogram.values.entries()) {
        const baseLabels = key ? `${key},` : '';
        
        for (let i = 0; i < histogram.buckets.length; i++) {
          lines.push(`${histogram.name}_bucket{${baseLabels}le="${histogram.buckets[i]}"} ${entry.buckets[i]}`);
        }
        lines.push(`${histogram.name}_bucket{${baseLabels}le="+Inf"} ${entry.count}`);
        lines.push(`${histogram.name}_sum{${key}} ${entry.sum}`);
        lines.push(`${histogram.name}_count{${key}} ${entry.count}`);
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Get metrics as JSON
   */
  toJSON(): Record<string, any> {
    const result: Record<string, any> = {
      counters: {},
      gauges: {},
      histograms: {},
    };
    
    for (const [name, counter] of this.counters.entries()) {
      result.counters[name] = Object.fromEntries(counter.values);
    }
    
    for (const [name, gauge] of this.gauges.entries()) {
      result.gauges[name] = Object.fromEntries(gauge.values);
    }
    
    for (const [name, histogram] of this.histograms.entries()) {
      result.histograms[name] = {};
      for (const [key, entry] of histogram.values.entries()) {
        result.histograms[name][key] = {
          count: entry.count,
          sum: entry.sum,
          mean: entry.count > 0 ? entry.sum / entry.count : 0,
        };
      }
    }
    
    return result;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    for (const counter of this.counters.values()) {
      counter.values.clear();
    }
    for (const gauge of this.gauges.values()) {
      gauge.values.clear();
    }
    for (const histogram of this.histograms.values()) {
      histogram.values.clear();
    }
  }
}

// ============================================================================
// EVENT BUS METRICS
// ============================================================================

export class EventBusMetricsCollector {
  private registry: MetricsRegistry;
  private startTime: Date;
  
  constructor() {
    this.registry = new MetricsRegistry();
    this.startTime = new Date();
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    // Counters
    this.registry.registerCounter(
      'eventbus_events_published_total',
      'Total number of events published',
      ['event_type', 'domain', 'producer']
    );
    
    this.registry.registerCounter(
      'eventbus_events_delivered_total',
      'Total number of events delivered',
      ['event_type', 'consumer']
    );
    
    this.registry.registerCounter(
      'eventbus_events_failed_total',
      'Total number of failed event deliveries',
      ['event_type', 'consumer', 'error_type']
    );
    
    this.registry.registerCounter(
      'eventbus_events_retried_total',
      'Total number of event retries',
      ['event_type', 'consumer']
    );
    
    this.registry.registerCounter(
      'eventbus_schema_validations_total',
      'Total schema validations',
      ['event_type', 'result']
    );
    
    this.registry.registerCounter(
      'eventbus_authorization_checks_total',
      'Total authorization checks',
      ['service', 'action', 'result']
    );
    
    // Gauges
    this.registry.registerGauge(
      'eventbus_events_stored_total',
      'Total events in store',
      ['domain']
    );
    
    this.registry.registerGauge(
      'eventbus_dlq_size',
      'Number of events in dead letter queue',
      ['status']
    );
    
    this.registry.registerGauge(
      'eventbus_consumers_active',
      'Number of active consumers',
      []
    );
    
    this.registry.registerGauge(
      'eventbus_subscriptions_active',
      'Number of active subscriptions',
      []
    );
    
    this.registry.registerGauge(
      'eventbus_consumer_lag',
      'Events behind for consumer',
      ['consumer', 'event_type']
    );
    
    // Histograms
    this.registry.registerHistogram(
      'eventbus_publish_duration_seconds',
      'Time to publish an event',
      ['event_type'],
      [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1]
    );
    
    this.registry.registerHistogram(
      'eventbus_delivery_latency_seconds',
      'Time from publish to delivery',
      ['event_type', 'consumer'],
      [0.01, 0.05, 0.1, 0.5, 1, 2.5, 5, 10, 30]
    );
    
    this.registry.registerHistogram(
      'eventbus_webhook_duration_seconds',
      'Webhook request duration',
      ['consumer'],
      [0.1, 0.25, 0.5, 1, 2.5, 5, 10]
    );
  }

  // ============================================================================
  // METRIC RECORDING METHODS
  // ============================================================================

  recordEventPublished(eventType: string, producer: string): void {
    const domain = eventType.split('.')[0];
    this.registry.incrementCounter('eventbus_events_published_total', {
      event_type: eventType,
      domain,
      producer,
    });
  }

  recordEventDelivered(eventType: string, consumer: string): void {
    this.registry.incrementCounter('eventbus_events_delivered_total', {
      event_type: eventType,
      consumer,
    });
  }

  recordEventFailed(eventType: string, consumer: string, errorType: string): void {
    this.registry.incrementCounter('eventbus_events_failed_total', {
      event_type: eventType,
      consumer,
      error_type: errorType,
    });
  }

  recordEventRetried(eventType: string, consumer: string): void {
    this.registry.incrementCounter('eventbus_events_retried_total', {
      event_type: eventType,
      consumer,
    });
  }

  recordSchemaValidation(eventType: string, success: boolean): void {
    this.registry.incrementCounter('eventbus_schema_validations_total', {
      event_type: eventType,
      result: success ? 'success' : 'failure',
    });
  }

  recordAuthorizationCheck(service: string, action: string, allowed: boolean): void {
    this.registry.incrementCounter('eventbus_authorization_checks_total', {
      service,
      action,
      result: allowed ? 'allowed' : 'denied',
    });
  }

  setEventsStored(domain: string, count: number): void {
    this.registry.setGauge('eventbus_events_stored_total', count, { domain });
  }

  setDlqSize(status: string, count: number): void {
    this.registry.setGauge('eventbus_dlq_size', count, { status });
  }

  setActiveConsumers(count: number): void {
    this.registry.setGauge('eventbus_consumers_active', count);
  }

  setActiveSubscriptions(count: number): void {
    this.registry.setGauge('eventbus_subscriptions_active', count);
  }

  setConsumerLag(consumer: string, eventType: string, lag: number): void {
    this.registry.setGauge('eventbus_consumer_lag', lag, { consumer, event_type: eventType });
  }

  recordPublishDuration(eventType: string, durationMs: number): void {
    this.registry.observeHistogram('eventbus_publish_duration_seconds', durationMs / 1000, {
      event_type: eventType,
    });
  }

  recordDeliveryLatency(eventType: string, consumer: string, latencyMs: number): void {
    this.registry.observeHistogram('eventbus_delivery_latency_seconds', latencyMs / 1000, {
      event_type: eventType,
      consumer,
    });
  }

  recordWebhookDuration(consumer: string, durationMs: number): void {
    this.registry.observeHistogram('eventbus_webhook_duration_seconds', durationMs / 1000, {
      consumer,
    });
  }

  // ============================================================================
  // EXPORT METHODS
  // ============================================================================

  /**
   * Get metrics in Prometheus format
   */
  getPrometheusMetrics(): string {
    return this.registry.toPrometheusFormat();
  }

  /**
   * Get metrics as JSON
   */
  getJsonMetrics(): Record<string, any> {
    return {
      ...this.registry.toJSON(),
      uptime_seconds: (Date.now() - this.startTime.getTime()) / 1000,
    };
  }

  /**
   * Get summary metrics for API response
   */
  getSummary(): EventBusMetrics {
    const json = this.registry.toJSON();
    
    // Calculate totals from counters
    let totalPublished = 0;
    let totalDelivered = 0;
    let totalFailed = 0;
    
    for (const value of Object.values(json.counters['eventbus_events_published_total'] || {})) {
      totalPublished += value as number;
    }
    for (const value of Object.values(json.counters['eventbus_events_delivered_total'] || {})) {
      totalDelivered += value as number;
    }
    for (const value of Object.values(json.counters['eventbus_events_failed_total'] || {})) {
      totalFailed += value as number;
    }
    
    // Calculate average latency from histogram
    const latencyData = json.histograms['eventbus_delivery_latency_seconds'] || {};
    let totalLatency = 0;
    let latencyCount = 0;
    for (const entry of Object.values(latencyData) as any[]) {
      totalLatency += entry.sum;
      latencyCount += entry.count;
    }
    
    return {
      events_published: totalPublished,
      events_delivered: totalDelivered,
      events_failed: totalFailed,
      events_in_dlq: json.gauges['eventbus_dlq_size']?.['status="pending"'] || 0,
      average_latency_ms: latencyCount > 0 ? (totalLatency / latencyCount) * 1000 : 0,
      consumers_active: json.gauges['eventbus_consumers_active']?.[''] || 0,
      subscriptions_active: json.gauges['eventbus_subscriptions_active']?.[''] || 0,
      uptime_seconds: (Date.now() - this.startTime.getTime()) / 1000,
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.registry.reset();
    this.startTime = new Date();
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let metricsInstance: EventBusMetricsCollector | null = null;

export function getMetrics(): EventBusMetricsCollector {
  if (!metricsInstance) {
    metricsInstance = new EventBusMetricsCollector();
  }
  return metricsInstance;
}

export function resetMetrics(): void {
  if (metricsInstance) {
    metricsInstance.reset();
  }
}

// ============================================================================
// TIMING UTILITIES
// ============================================================================

/**
 * Time a function and record the duration
 */
export async function timeAsync<T>(
  fn: () => Promise<T>,
  recorder: (durationMs: number) => void
): Promise<T> {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    recorder(Date.now() - start);
  }
}

/**
 * Create a timer that can be stopped later
 */
export function startTimer(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}
