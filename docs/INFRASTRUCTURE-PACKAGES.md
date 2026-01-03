# TripComposer Infrastructure Packages

## Overview

This document describes the new infrastructure packages added to support the architectural principles:

1. **@tripcomposer/observability** - Distributed tracing, metrics, and logging
2. **@tripcomposer/idempotency** - Idempotency key handling for safe retries
3. **@tripcomposer/resilience** - Circuit breaker, retry, dead letter queue

---

## @tripcomposer/observability

### Features
- OpenTelemetry distributed tracing
- Request/response metrics collection
- Structured logging with Pino
- Correlation ID propagation
- Express middleware integration

### Usage

```typescript
import { 
  initTracing, 
  initMetrics, 
  createLogger,
  tracingMiddleware,
  metricsMiddleware,
  correlationMiddleware,
} from '@tripcomposer/observability';

// Initialize at service startup (BEFORE other imports)
initTracing({
  serviceName: 'requests-service',
  serviceVersion: '1.0.0',
  environment: 'production',
  exporterEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
});

initMetrics({
  serviceName: 'requests-service',
  exporterEndpoint: process.env.OTEL_EXPORTER_METRICS_ENDPOINT,
});

const logger = createLogger({ serviceName: 'requests-service' });

// Add middleware
app.use(correlationMiddleware());
app.use(tracingMiddleware());
app.use(metricsMiddleware());
```

### Custom Spans

```typescript
import { withSpan, addSpanAttributes } from '@tripcomposer/observability';

async function processRequest(requestId: string) {
  return withSpan('process-request', async (span) => {
    addSpanAttributes({ 'request.id': requestId });
    // ... processing
  });
}
```

---

## @tripcomposer/idempotency

### Features
- Redis-backed idempotency storage (production)
- In-memory storage (development)
- Express middleware
- Configurable TTL
- Request fingerprinting

### Usage

```typescript
import { 
  idempotencyMiddleware,
  RedisIdempotencyStore,
} from '@tripcomposer/idempotency';

// Create store
const store = new RedisIdempotencyStore({
  url: process.env.REDIS_URL,
  keyPrefix: 'idempotency:requests:',
});

// Add middleware
app.use(idempotencyMiddleware(store, {
  headerName: 'Idempotency-Key',
  ttlSeconds: 86400, // 24 hours
  methods: ['POST', 'PUT', 'PATCH'],
}));
```

### Client Usage

```bash
curl -X POST /api/v1/requests \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: unique-request-id-123" \
  -d '{"destination": "Paris"}'
```

### Response Headers

- `X-Idempotent-Replayed: true` - Response was from cache

### Error Responses

```json
// 409 - Request in progress
{
  "error": {
    "code": "DUPLICATE_REQUEST_IN_PROGRESS",
    "message": "A request with this idempotency key is already being processed"
  }
}

// 422 - Key used with different payload
{
  "error": {
    "code": "IDEMPOTENCY_KEY_CONFLICT",
    "message": "Idempotency key was already used with a different request payload"
  }
}
```

---

## @tripcomposer/resilience

### Features
- Circuit breaker pattern
- Retry with exponential backoff
- Dead letter queue for failed events
- Bulkhead pattern for concurrency control
- Combined resilience wrapper

### Circuit Breaker

```typescript
import { CircuitBreaker } from '@tripcomposer/resilience';

const breaker = new CircuitBreaker({
  name: 'payment-gateway',
  failureThreshold: 5,
  successThreshold: 3,
  resetTimeout: 30000, // 30 seconds
  onStateChange: (from, to) => {
    logger.warn(`Circuit ${from} -> ${to}`);
  },
});

try {
  const result = await breaker.execute(() => paymentGateway.charge(amount));
} catch (error) {
  if (error.name === 'CircuitOpenError') {
    // Fast fail - don't even try
  }
}
```

### Retry with Backoff

```typescript
import { retryWithBackoff } from '@tripcomposer/resilience';

const result = await retryWithBackoff(
  () => externalService.call(),
  {
    maxAttempts: 3,
    initialDelayMs: 100,
    backoffMultiplier: 2,
    jitter: true,
    onRetry: (error, attempt, delayMs) => {
      logger.warn(`Retry ${attempt}, waiting ${delayMs}ms`);
    },
  }
);
```

### Dead Letter Queue

```typescript
import { DeadLetterQueue } from '@tripcomposer/resilience';

const dlq = new DeadLetterQueue({
  redisUrl: process.env.REDIS_URL,
  queuePrefix: 'dlq:requests:',
  maxAgeDays: 30,
});

// On failed event processing
try {
  await processEvent(event);
} catch (error) {
  await dlq.enqueue(
    event.eventType,
    event.payload,
    error,
    {
      sourceService: 'requests-service',
      correlationId: event.metadata.correlationId,
    }
  );
}

// Admin: List dead letters
const records = await dlq.list('REQUEST_CREATED');

// Admin: Retry a dead letter
const record = await dlq.dequeue('REQUEST_CREATED', recordId);
await processEvent(record.payload);
await dlq.remove('REQUEST_CREATED', recordId);
```

### Combined Resilience

```typescript
import { createResilientFunction } from '@tripcomposer/resilience';

const resilientCall = createResilientFunction(
  (data: RequestData) => externalService.submit(data),
  {
    circuitBreaker: {
      name: 'external-service',
      failureThreshold: 5,
    },
    retry: {
      maxAttempts: 3,
      initialDelayMs: 100,
    },
    bulkhead: {
      name: 'external-service',
      maxConcurrent: 10,
    },
    timeoutMs: 5000,
  }
);

// Usage
const result = await resilientCall.execute(data);

// Check stats
const stats = resilientCall.getStats();
```

---

## Resilient Event Bus

The event bus now supports circuit breaker and dead letter queue:

```typescript
import { createResilientEventBusWrapper } from '@tripcomposer/event-bus';

const eventBus = createResilientEventBusWrapper(
  'requests-service',
  async (event, error) => {
    // Store in DLQ
    await dlq.enqueue(event.eventType, event.payload, error, {
      sourceService: 'requests-service',
      correlationId: event.metadata.correlationId,
    });
  }
);

// Publishing automatically retries and falls back to DLQ
await eventBus.publish('REQUEST_CREATED', payload, metadata);

// Check circuit breaker stats
const stats = eventBus.getStats();
```

---

## Database Schema Updates

### request_changes Table

```sql
-- Immutable audit trail for request changes
CREATE TABLE request_changes (
    id UUID PRIMARY KEY,
    request_id UUID NOT NULL,
    change_type VARCHAR(50) NOT NULL,
    previous_value JSONB,
    new_value JSONB NOT NULL,
    changed_by_id UUID NOT NULL,
    changed_by_type VARCHAR(20) NOT NULL,
    correlation_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Automatic triggers prevent UPDATE/DELETE
```

Run migration:
```bash
psql $DATABASE_URL -f scripts/request-changes-audit.sql
```

---

## Service Integration Checklist

For each service, ensure:

- [ ] Idempotency middleware added to mutation endpoints
- [ ] Correlation ID middleware added
- [ ] Metrics endpoint exposed at `/metrics`
- [ ] Event bus wrapped with resilience layer
- [ ] Dead letter queue handler configured
- [ ] Tracing initialized at startup

---

## Environment Variables

```bash
# Tracing
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318/v1/traces

# Metrics
OTEL_EXPORTER_METRICS_ENDPOINT=http://prometheus:4318/v1/metrics

# Redis (for idempotency and DLQ)
REDIS_URL=redis://localhost:6379
```

---

## Monitoring Dashboard Queries

### Prometheus Metrics

```promql
# Request rate by service
sum(rate(http_requests_total[5m])) by (service)

# Error rate
sum(rate(http_requests_total{status_code=~"5.."}[5m])) 
/ sum(rate(http_requests_total[5m]))

# P95 latency
histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))

# Circuit breaker state
circuit_breaker_state{service="requests"}
```

### Dead Letter Queue Monitoring

```bash
# Check DLQ counts
redis-cli KEYS "dlq:*" | xargs -I {} redis-cli HLEN {}

# List event types with dead letters
redis-cli SMEMBERS "dlq:index"
```
