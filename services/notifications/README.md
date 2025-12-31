# Notification Service

Event-driven notification delivery service for HowWePlan platform.

## Responsibilities

- **Email notifications** via Resend (production) or console (development)
- **SMS notifications** placeholder via Twilio
- **Push notifications** placeholder via Firebase Cloud Messaging
- **Delivery logging** for idempotency and audit trails
- **Audit event emission** for all state changes

## Architecture

```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────┐
│  Domain Events  │────▶│  Notification Svc   │────▶│  Providers   │
│  (Event Bus)    │     │  (Event Handlers)   │     │  (Resend,    │
└─────────────────┘     │                     │     │   Twilio,    │
                        │  ┌───────────────┐  │     │   Firebase)  │
                        │  │ Rate Limiter  │  │     └──────────────┘
                        │  └───────────────┘  │
                        │  ┌───────────────┐  │     ┌──────────────┐
                        │  │ Delivery Log  │◀─┼────▶│  PostgreSQL  │
                        │  └───────────────┘  │     └──────────────┘
                        │  ┌───────────────┐  │     ┌──────────────┐
                        │  │ Audit Service │──┼────▶│  Audit Bus   │
                        │  └───────────────┘  │     └──────────────┘
                        └─────────────────────┘
```

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

## Environment Variables

### App Metadata

| Variable | Purpose | Default |
|----------|---------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `SERVICE_NAME` | Service identifier for logging | `notifications` |
| `SERVICE_VERSION` | Service version for observability | `1.0.0` |
| `LOG_LEVEL` | Logging verbosity (error, warn, info, debug, trace) | `info` |

### API Connectivity

| Variable | Purpose | Default |
|----------|---------|---------|
| `PORT` | HTTP server port | `3005` |
| `EVENT_BUS_URL` | AMQP connection URL for event bus | `amqp://localhost:5672` |
| `EVENT_BUS_EXCHANGE` | Exchange for domain events | `tripcomposer.events` |
| `EVENT_BUS_QUEUE` | Queue for notification events | `notifications.events` |

### Database

| Variable | Purpose | Default |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `DATABASE_POOL_MIN` | Minimum pool connections | `2` |
| `DATABASE_POOL_MAX` | Maximum pool connections | `10` |

### Email Provider

| Variable | Purpose | Default |
|----------|---------|---------|
| `EMAIL_PROVIDER` | Email provider (resend, sendgrid, ses, console) | `resend` |
| `RESEND_API_KEY` | Resend API key (required for resend provider) | - |
| `EMAIL_FROM_ADDRESS` | Default sender email address | - |
| `EMAIL_FROM_NAME` | Default sender name | `HowWePlan` |
| `EMAIL_REPLY_TO` | Reply-to address | - |

### SMS Provider (Placeholder)

| Variable | Purpose | Default |
|----------|---------|---------|
| `SMS_PROVIDER` | SMS provider (twilio, vonage, console) | `twilio` |
| `SMS_ENABLED` | Enable SMS notifications | `false` |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | - |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | - |
| `TWILIO_FROM_NUMBER` | Twilio sender phone number | - |

### Push Notifications (Placeholder)

| Variable | Purpose | Default |
|----------|---------|---------|
| `PUSH_PROVIDER` | Push provider (firebase, onesignal, console) | `firebase` |
| `PUSH_ENABLED` | Enable push notifications | `false` |
| `FIREBASE_PROJECT_ID` | Firebase project ID | - |
| `FIREBASE_PRIVATE_KEY` | Firebase service account private key | - |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email | - |

### Operational Limits

| Variable | Purpose | Default |
|----------|---------|---------|
| `RATE_LIMIT_EMAIL_PER_HOUR` | Max emails per recipient per hour | `20` |
| `RATE_LIMIT_SMS_PER_HOUR` | Max SMS per recipient per hour | `10` |
| `RATE_LIMIT_PUSH_PER_HOUR` | Max push notifications per device per hour | `50` |
| `MAX_RETRY_ATTEMPTS` | Maximum retry attempts for failed sends | `3` |
| `RETRY_BACKOFF_MS` | Initial retry backoff in milliseconds | `1000` |
| `RETRY_BACKOFF_MULTIPLIER` | Exponential backoff multiplier | `2` |
| `BATCH_SIZE` | Batch processing size | `100` |
| `BATCH_INTERVAL_MS` | Batch processing interval | `5000` |

### Feature Toggles

| Variable | Purpose | Default |
|----------|---------|---------|
| `ENABLE_EMAIL` | Enable email channel | `true` |
| `ENABLE_SMS` | Enable SMS channel | `false` |
| `ENABLE_PUSH` | Enable push channel | `false` |
| `ENABLE_DELIVERY_TRACKING` | Enable delivery status tracking | `true` |

### Audit / Observability

| Variable | Purpose | Default |
|----------|---------|---------|
| `AUDIT_LOG_ENABLED` | Enable audit event emission | `true` |
| `AUDIT_EVENT_EXCHANGE` | Exchange for audit events | `tripcomposer.audit` |
| `HEALTH_CHECK_PATH` | Health check endpoint path | `/health` |
| `METRICS_ENABLED` | Enable Prometheus metrics | `true` |
| `METRICS_PORT` | Metrics server port | `9105` |

## Handled Events

The service consumes the following domain events:

### Booking Events
- `booking.created` → Email to user
- `booking.confirmed` → Email to user and agent
- `booking.cancelled` → Email to user and agent
- `payment.received` → Email to user
- `payment.failed` → Email to user

### Agent Events
- `agent.assigned` → Email to agent (semi-blind, no user details)
- `agent.confirmed` → Email to user (first name + photo only)
- `itinerary.submitted` → Email to user (obfuscated summary)
- `itinerary.revision_requested` → Email to agent

### Chat Events
- `chat.message_received` → Email to recipient

### Refund Events
- `refund.requested` → Email to user and agent
- `refund.approved` → Email to user
- `refund.rejected` → Email to user

### Dispute Events
- `dispute.opened` → Email to user, agent, and admin (for arbitration)
- `dispute.resolved` → Email to user and agent

### User Events
- `user.registered` → Welcome email with verification
- `user.password_reset_requested` → Password reset email
- `user.email_verified` → Confirmation email

## Key Features

### Idempotent Sends

Every notification includes an idempotency key. Duplicate requests return the cached result:

```typescript
// Event handlers generate deterministic keys
const idempotencyKey = `${event.eventId}-booking-created-user`;
```

### Rate Limiting

Per-recipient rate limiting prevents notification spam:

```typescript
// Configurable per channel
RATE_LIMIT_EMAIL_PER_HOUR=20
RATE_LIMIT_SMS_PER_HOUR=10
```

### Audit Trail

Every notification state change emits an audit event:

```typescript
// Example audit event
{
  eventType: 'audit.notification.delivered',
  entityType: 'notification',
  entityId: 'idempotency-key',
  action: 'email_delivery_attempt',
  metadata: { channel: 'email', status: 'sent', providerMessageId: '...' }
}
```

### No Business Logic

This service contains **zero business logic**. It:
- Reacts to domain events
- Sends notifications via configured providers
- Logs delivery status
- Emits audit events

All business rules are enforced by the services that emit domain events.

## API Endpoints

### Health Check

```
GET /health
```

Returns basic liveness status.

```
GET /health/ready
```

Returns detailed readiness check including provider health.

## Development

```bash
# Run in development mode
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Run tests
npm test
npm run test:watch
npm run test:coverage

# Build for production
npm run build
npm start
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure real provider credentials (never commit secrets)
3. Use managed PostgreSQL and RabbitMQ
4. Enable metrics collection
5. Configure alerting on delivery failures

## Security Considerations

- Provider API keys are **secrets** (backend only)
- No database credentials in frontend apps
- Audit logs track all notification attempts
- Rate limiting prevents abuse
- Idempotency prevents duplicate sends
