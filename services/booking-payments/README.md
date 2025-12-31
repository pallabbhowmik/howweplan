# Booking & Payments Service

The Merchant of Record service handling all payment processing, booking lifecycle, escrow management, and refund enforcement for the HowWePlan platform.

## Architecture Role

This service is the **only** service authorized to:
- Hold Stripe secret keys
- Process payments
- Issue refunds
- Manage escrow states

## Core Responsibilities

| Responsibility | Description |
|----------------|-------------|
| Merchant of Record | Platform owns the payment relationship with customers |
| Booking Fee Calculation | Pass-through of Stripe fees (2.9% + $0.30) |
| Stripe Checkout | Create and manage payment sessions |
| Escrow State Machine | Hold funds until trip completion |
| Refund Enforcement | Strict rules - no subjective complaint refunds |
| Audit Logging | Every money movement is logged |

## Environment Variables

### App Metadata

| Variable | Purpose | Default |
|----------|---------|---------|
| `NODE_ENV` | Runtime environment | `development` |
| `SERVICE_NAME` | Service identifier for logging/tracing | `booking-payments` |
| `SERVICE_VERSION` | Deployed version | `1.0.0` |
| `PORT` | HTTP server port | `3003` |
| `LOG_LEVEL` | Minimum log level | `info` |

### API Connectivity

| Variable | Purpose | Default |
|----------|---------|---------|
| `EVENT_BUS_URL` | Event bus endpoint for publishing events | `http://localhost:4000/events` |
| `EVENT_BUS_API_KEY` | Authentication for event bus | Development key |

### Authentication

| Variable | Purpose | Default |
|----------|---------|---------|
| `INTERNAL_API_KEY` | Service-to-service auth | Development key |
| `JWT_SECRET` | JWT validation for incoming requests | Development key |

### Database

| Variable | Purpose | Default |
|----------|---------|---------|
| `SUPABASE_URL` | Supabase API endpoint | `http://localhost:54321` |
| `SUPABASE_SERVICE_ROLE_KEY` | Full database access (backend only) | Development key |
| `DATABASE_URL` | Direct PostgreSQL connection | Local postgres |

### Payments (Stripe)

| Variable | Purpose | Default |
|----------|---------|---------|
| `STRIPE_SECRET_KEY` | Stripe API secret key (THIS SERVICE ONLY) | Test key placeholder |
| `STRIPE_WEBHOOK_SECRET` | Validate Stripe webhook signatures | Placeholder |
| `STRIPE_API_VERSION` | Pinned Stripe API version | `2023-10-16` |

### Feature Toggles

| Variable | Purpose | Default |
|----------|---------|---------|
| `ENABLE_LIVE_PAYMENTS` | Enable real payment processing | `false` |
| `ENABLE_AUTOMATIC_REFUNDS` | Allow automated refund processing | `false` |
| `ENABLE_DISPUTE_WEBHOOKS` | Process Stripe dispute events | `true` |

### Operational Limits

| Variable | Purpose | Default |
|----------|---------|---------|
| `MIN_BOOKING_AMOUNT_CENTS` | Minimum booking value (cents) | `1000` ($10) |
| `MAX_BOOKING_AMOUNT_CENTS` | Maximum booking value (cents) | `10000000` ($100k) |
| `PLATFORM_COMMISSION_RATE` | Commission on completed bookings | `0.10` (10%) |
| `BOOKING_FEE_RATE` | Variable fee passed to user | `0.029` (2.9%) |
| `BOOKING_FEE_FIXED_CENTS` | Fixed fee passed to user | `30` ($0.30) |
| `ESCROW_HOLD_DAYS` | Days to hold funds in escrow | `14` |
| `REFUND_WINDOW_DAYS` | Days after completion for refund requests | `30` |
| `IDEMPOTENCY_TTL_SECONDS` | Idempotency key expiration | `86400` (24h) |

### Audit / Observability

| Variable | Purpose | Default |
|----------|---------|---------|
| `AUDIT_LOG_ENABLED` | Enable audit logging | `true` |
| `AUDIT_RETENTION_DAYS` | Audit log retention period | `2555` (7 years) |
| `ENABLE_TRACING` | Enable OpenTelemetry tracing | `false` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP collector endpoint | `http://localhost:4318` |
| `SENTRY_DSN` | Sentry error tracking DSN | Empty (disabled) |

## State Machines

### Booking Lifecycle

```
PENDING_PAYMENT → PAYMENT_PROCESSING → PAYMENT_CONFIRMED → 
  → AGENT_CONFIRMED → IN_PROGRESS → COMPLETED → SETTLED
                   ↘ CANCELLED (before confirmation)
                   ↘ DISPUTED → RESOLVED
```

### Payment States

```
INITIATED → PROCESSING → SUCCEEDED → IN_ESCROW → RELEASED
         ↘ FAILED
                     ↘ REFUND_REQUESTED → REFUND_APPROVED → REFUNDED
                                       ↘ REFUND_DENIED
```

### Refund Rules

| Condition | Refundable | Requires Admin |
|-----------|------------|----------------|
| Agent no-show | ✅ Yes | No |
| Service not delivered | ✅ Yes | No |
| Agent cancelled | ✅ Yes | No |
| Objective quality issue | ✅ Yes | Yes |
| Subjective complaint | ❌ Never | N/A |
| User cancellation (before agent confirm) | ✅ Full | No |
| User cancellation (after agent confirm) | ⚠️ Partial | No |

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/bookings` | Create booking request |
| GET | `/api/v1/bookings/:id` | Get booking details |
| POST | `/api/v1/bookings/:id/checkout` | Create Stripe checkout session |
| POST | `/api/v1/bookings/:id/cancel` | Cancel booking |
| POST | `/api/v1/refunds` | Request refund (admin) |
| POST | `/api/v1/webhooks/stripe` | Stripe webhook handler |

## Security Rules

1. **Stripe secret key exists ONLY in this service**
2. All webhook payloads are signature-verified
3. Idempotency keys prevent duplicate processing
4. All money movements emit audit events
5. Admin actions require reason and are logged

## Running Locally

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start in development mode
npm run dev

# Run tests
npm test
```

## Webhook Testing

Use Stripe CLI to forward webhooks locally:

```bash
stripe listen --forward-to localhost:3003/api/v1/webhooks/stripe
```
