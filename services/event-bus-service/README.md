# Event Bus Service v2.0

Industry-standard event bus implementation following best practices for microservices communication.

## Architecture Principles

### Core Tenets
- **Append-only, immutable events** - Events are facts that happened; never update or delete them
- **Schema-first validation** - Every event is validated against a registered Zod schema
- **At-least-once delivery** - Consumers must be idempotent
- **Pull-based consumption** - Consumers request events at their pace
- **Dead Letter Queue** - Failed events are quarantined for analysis

### Event Contract

Every event has this structure:

```typescript
interface EventEnvelope {
  event_id: string;        // Server-generated UUID (idempotency key)
  event_type: string;      // e.g., "requests.REQUEST_CREATED"
  event_version: number;   // Schema version for backward compatibility
  occurred_at: string;     // ISO 8601 timestamp
  producer: string;        // Service that created the event
  correlation_id: string;  // For distributed tracing
  causation_id?: string;   // Event that caused this one
  aggregate_id?: string;   // For partitioning/ordering
  payload: object;         // Event-specific data (schema-validated)
  metadata?: object;       // Actor info, request context
}
```

### Event Naming Convention

Events use **past tense** (facts that happened):
- ✅ `REQUEST_CREATED`, `PAYMENT_COMPLETED`, `USER_REGISTERED`
- ❌ `CREATE_REQUEST`, `COMPLETE_PAYMENT`, `REGISTER_USER`

Format: `{domain}.{EVENT_NAME}`

## API Endpoints

### Publishing

```bash
# Publish single event
POST /publish
Authorization: Bearer <api-key>
X-Service-Name: requests-service  # Development only
{
  "event_type": "requests.REQUEST_CREATED",
  "event_version": 1,
  "correlation_id": "uuid",  # optional, generated if missing
  "aggregate_id": "request-123",  # optional
  "payload": { "request_id": "...", "user_id": "..." }
}

# Publish batch (max 100)
POST /publish/batch
{
  "events": [{ ... }, { ... }]
}
```

### Consuming

```bash
# Register consumer
POST /consumers
{ "webhook_url": "https://my-service/webhook" }  # optional

# Subscribe to events
POST /subscribe
{
  "consumer_id": "uuid",
  "event_types": ["requests.*", "itineraries.ITINERARY_CREATED"]
}

# Pull events (poll model)
POST /consume
{
  "consumer_id": "uuid",
  "event_types": ["requests.REQUEST_CREATED"],
  "batch_size": 10
}

# Acknowledge processing
POST /ack
{
  "consumer_id": "uuid",
  "event_id": "uuid",
  "event_type": "requests.REQUEST_CREATED"
}

# Negative ack (processing failed)
POST /nack
{
  "consumer_id": "uuid",
  "event_id": "uuid",
  "error": "Validation failed"
}
```

### Queries

```bash
# Get events by criteria
GET /events?domain=requests&limit=50

# Get event by ID
GET /events/:eventId

# Get event trace (all events in a correlation)
GET /events/trace/:correlationId

# Replay aggregate events
GET /events/replay/:aggregateId
```

### Dead Letter Queue

```bash
# List DLQ entries
GET /dlq?status=pending

# Retry entry
POST /dlq/:dlqId/retry

# Discard poison message
POST /dlq/:dlqId/discard
{ "reason": "Invalid schema, cannot fix" }
```

### Metrics

```bash
# Prometheus format
GET /metrics

# JSON format
GET /metrics
Accept: application/json
```

## Event Domains

| Domain | Events |
|--------|--------|
| `requests` | REQUEST_CREATED, REQUEST_SUBMITTED, REQUEST_UPDATED, REQUEST_CANCELLED, REQUEST_EXPIRED |
| `itineraries` | ITINERARY_CREATED, ITINERARY_SUBMITTED, ITINERARY_UPDATED, ITINERARY_ACCEPTED, ITINERARY_REJECTED, ITINERARY_REVISION_REQUESTED, ITINERARY_CANCELLED, ITINERARY_EXPIRED |
| `matching` | AGENT_MATCHED, AGENT_ASSIGNED, AGENT_UNASSIGNED, MATCH_DECLINED |
| `bookings` | BOOKING_CREATED, BOOKING_CONFIRMED, BOOKING_MODIFIED, BOOKING_CANCELLED, BOOKING_COMPLETED |
| `payments` | PAYMENT_INITIATED, PAYMENT_COMPLETED, PAYMENT_FAILED, REFUND_INITIATED, REFUND_COMPLETED, PAYOUT_INITIATED, PAYOUT_COMPLETED |
| `messaging` | MESSAGE_SENT, MESSAGE_DELIVERED, MESSAGE_READ, CONVERSATION_CREATED, CONVERSATION_CLOSED |
| `disputes` | DISPUTE_OPENED, DISPUTE_ESCALATED, DISPUTE_RESOLVED, DISPUTE_CLOSED |
| `reviews` | REVIEW_SUBMITTED, REVIEW_PUBLISHED, REVIEW_FLAGGED, REVIEW_REMOVED, RESPONSE_ADDED |
| `identity` | USER_REGISTERED, USER_VERIFIED, USER_PROFILE_UPDATED, AGENT_PROFILE_CREATED, AGENT_PROFILE_VERIFIED, AGENT_PROFILE_SUSPENDED |
| `audit` | AUDIT_LOG_CREATED, COMPLIANCE_CHECK_PASSED, COMPLIANCE_CHECK_FAILED, DATA_EXPORT_REQUESTED, DATA_EXPORT_COMPLETED |
| `notifications` | NOTIFICATION_SENT, NOTIFICATION_DELIVERED, NOTIFICATION_FAILED, NOTIFICATION_READ |

## Authorization

Services are authorized to publish/subscribe based on their identity:

```typescript
// Example: requests-service can publish
EventTypes.REQUESTS.*

// Example: notifications-service can subscribe to
EventDomain.REQUESTS.*, ITINERARIES.*, BOOKINGS.*, etc.
```

Authentication methods:
1. **API Key** - `X-Api-Key` header
2. **JWT** - `Authorization: Bearer <token>`
3. **mTLS** - Client certificate (production)
4. **Service Name Header** - Development only

## Configuration

```bash
PORT=4000
NODE_ENV=development

# API Keys (one per service)
REQUESTS_SERVICE_API_KEY=...
ITINERARIES_SERVICE_API_KEY=...
# etc.

# Webhook URLs
NOTIFICATIONS_WEBHOOK_URL=http://notifications:4009/events

# CORS
CORS_ALLOWED_ORIGINS=https://howweplan-user.vercel.app,...
```

## Development

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build
npm run build

# Run production
npm start
```

## Directory Structure

```
src/
├── index.ts              # Main entry point & Express app
├── types/
│   └── event.types.ts    # Core type definitions
├── store/
│   └── event-store.ts    # Durable event persistence
├── schema/
│   └── schema-registry.ts # Zod schemas for validation
├── dlq/
│   └── dead-letter-queue.ts # Failed event handling
├── consumers/
│   └── consumer-manager.ts # Subscription & delivery
├── auth/
│   └── authorization.ts  # Service authentication/authorization
├── metrics/
│   └── metrics.ts        # Prometheus metrics
└── utils/
    └── logger.ts         # Structured logging with Pino
```

## Best Practices

### For Producers
1. Always include a correlation_id for traceability
2. Use aggregate_id for related events
3. Don't include sensitive data in payloads
4. Version your schemas explicitly

### For Consumers
1. Implement idempotency (handle duplicates)
2. Process events in order per aggregate
3. Acknowledge quickly, process asynchronously
4. Handle failures gracefully (nack with error)

### Schema Evolution Rules
- ✅ Add new optional fields
- ✅ Deprecate fields (don't remove)
- ✅ Add new event types
- ❌ Remove required fields
- ❌ Change field types
- ❌ Rename fields
