# Dispute & Resolution Service

Production-grade dispute management and arbitration service for the HowWePlan travel orchestration platform.

## Overview

This service handles the complete dispute lifecycle:
- Accept disputes from travelers
- Collect evidence from travelers and agents
- Allow agent responses
- Require admin arbitration
- Execute refunds if approved

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Dispute Service                               │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │   API Layer  │  │State Machine │  │     Event Publisher      │  │
│  │  (Express)   │  │  (Lifecycle) │  │     (Event Bus)          │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
│         │                 │                        │                │
│  ┌──────┴─────────────────┴────────────────────────┴───────────┐   │
│  │                     Service Layer                            │   │
│  │  ┌─────────────┐ ┌───────────────┐ ┌─────────────────────┐  │   │
│  │  │  Dispute    │ │   Evidence    │ │    Arbitration      │  │   │
│  │  │  Service    │ │   Service     │ │    Service          │  │   │
│  │  └─────────────┘ └───────────────┘ └─────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Audit Logger                               │   │
│  │              (All state changes logged)                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## State Machine

```
                        ┌──────────────────┐
                        │ pending_evidence │
                        └────────┬─────────┘
                                 │ submit_evidence
                                 ▼
                        ┌──────────────────┐
     ┌─────────────────►│evidence_submitted│◄──────────────┐
     │                  └────────┬─────────┘               │
     │                           │ agent_respond           │
     │                           ▼                         │
     │                  ┌──────────────────┐               │
     │                  │ agent_responded  │               │
     │                  └────────┬─────────┘               │
     │                           │ admin_review            │
     │                           ▼                         │
     │                  ┌──────────────────┐               │
     │   ┌──────────────│under_admin_review│───────────────┤
     │   │              └────────┬─────────┘               │
     │   │ escalate              │ resolve                 │
     │   ▼                       ▼                         │
     │ ┌─────────┐    ┌─────────────────────┐              │
     │ │escalated│───►│resolved_refund/     │              │
     │ └─────────┘    │partial/denied       │              │
     │                └─────────────────────┘              │
     │                                                     │
     │  withdraw (from any active state)                   │
     │  ─────────────────────────────────►closed_withdrawn │
     │                                                     │
     │  expire (from pending/evidence_submitted)           │
     └──────────────────────────────────────►closed_expired│
```

## Business Rules Enforced

| Rule | Implementation |
|------|----------------|
| Subjective complaints ≠ refund | `isSubjectiveComplaint` flag prevents refund resolution |
| Admin reason mandatory | All admin actions require reason parameter |
| All state changes audited | `createAuditLog()` called on every transition |
| Platform requires admin arbitration | State machine enforces admin review before resolution |
| Dispute window enforced | `DISPUTE_WINDOW_HOURS` config validated on creation |
| Agent response deadline | `AGENT_RESPONSE_DEADLINE_HOURS` tracked per dispute |

## Environment Variables

### App Metadata

| Variable | Purpose | Default |
|----------|---------|---------|
| `NODE_ENV` | Environment (development/staging/production) | `development` |
| `SERVICE_NAME` | Service identifier for logging | `disputes` |
| `SERVICE_VERSION` | Version for health checks | `1.0.0` |
| `PORT` | HTTP server port | `3006` |

### API Connectivity

| Variable | Purpose | Default |
|----------|---------|---------|
| `EVENT_BUS_URL` | Event bus endpoint for publishing events | Required |
| `BOOKING_SERVICE_URL` | Booking service for fetching booking details | Required |
| `PAYMENTS_SERVICE_URL` | Payments service for refund processing | Required |
| `NOTIFICATION_SERVICE_URL` | Notification service for alerts | Required |
| `API_VERSION` | API version prefix | `v1` |

### Authentication

| Variable | Purpose | Default |
|----------|---------|---------|
| `JWT_ISSUER` | Expected JWT issuer | Required |
| `JWT_AUDIENCE` | Expected JWT audience | Required |
| `JWKS_URI` | JWKS endpoint for key verification | Required |
| `INTERNAL_SERVICE_TOKEN` | Service-to-service auth token | Required |

### Database

| Variable | Purpose | Default |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `DATABASE_POOL_MIN` | Minimum pool connections | `2` |
| `DATABASE_POOL_MAX` | Maximum pool connections | `10` |
| `DATABASE_SSL_ENABLED` | Enable SSL for database | `false` |

### Supabase

| Variable | Purpose | Default |
|----------|---------|---------|
| `SUPABASE_URL` | Supabase project URL | Required |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (backend only) | Required |

### Feature Toggles

| Variable | Purpose | Default |
|----------|---------|---------|
| `FEATURE_AUTO_CLOSE_STALE_DISPUTES` | Auto-close inactive disputes | `true` |
| `FEATURE_EVIDENCE_FILE_UPLOAD` | Enable evidence uploads | `true` |
| `FEATURE_AGENT_RESPONSE_NOTIFICATIONS` | Notify agents of disputes | `true` |

### Operational Limits

| Variable | Purpose | Default |
|----------|---------|---------|
| `DISPUTE_WINDOW_HOURS` | Hours after booking end to file dispute | `168` (7 days) |
| `AGENT_RESPONSE_DEADLINE_HOURS` | Hours for agent to respond | `48` |
| `ADMIN_ESCALATION_THRESHOLD_HOURS` | Hours before auto-escalation | `72` |
| `AUTO_CLOSE_STALE_DISPUTES_DAYS` | Days of inactivity before closure | `30` |
| `MAX_EVIDENCE_FILES_PER_DISPUTE` | Maximum evidence files | `10` |
| `MAX_EVIDENCE_FILE_SIZE_MB` | Maximum file size in MB | `10` |
| `ALLOWED_EVIDENCE_MIME_TYPES` | Allowed file types | `image/jpeg,image/png,application/pdf` |
| `RATE_LIMIT_DISPUTES_PER_USER_PER_DAY` | Rate limit disputes | `3` |
| `RATE_LIMIT_EVIDENCE_UPLOADS_PER_DISPUTE` | Rate limit uploads | `20` |

### Audit / Observability

| Variable | Purpose | Default |
|----------|---------|---------|
| `LOG_LEVEL` | Logging level | `debug` |
| `LOG_FORMAT` | Log format (json/pretty) | `pretty` |
| `AUDIT_LOG_ENABLED` | Enable audit logging | `true` |
| `AUDIT_LOG_DESTINATION` | Where to store audit logs | `database` |
| `OTEL_ENABLED` | Enable OpenTelemetry | `false` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP endpoint | Optional |
| `OTEL_SERVICE_NAME` | Service name for traces | `disputes` |
| `METRICS_ENABLED` | Enable Prometheus metrics | `true` |
| `METRICS_PORT` | Metrics server port | `9106` |

## API Endpoints

### Traveler Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/disputes` | Create a new dispute |
| `GET` | `/api/v1/disputes` | List traveler's disputes |
| `GET` | `/api/v1/disputes/:id` | Get dispute details |
| `POST` | `/api/v1/disputes/:id/evidence` | Submit evidence |
| `GET` | `/api/v1/disputes/:id/evidence` | Get dispute evidence |
| `POST` | `/api/v1/disputes/:id/withdraw` | Withdraw dispute |

### Agent Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/agent/disputes` | List agent's disputes |
| `GET` | `/api/v1/agent/disputes/:id` | Get dispute details |
| `POST` | `/api/v1/agent/disputes/:id/response` | Submit response |
| `POST` | `/api/v1/agent/disputes/:id/evidence` | Submit evidence |
| `GET` | `/api/v1/agent/disputes/:id/evidence` | Get dispute evidence |

### Admin Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/admin/disputes` | Get admin queue |
| `GET` | `/api/v1/admin/statistics` | Get statistics |
| `GET` | `/api/v1/admin/disputes/:id` | Get full details |
| `POST` | `/api/v1/admin/disputes/:id/review` | Start review |
| `POST` | `/api/v1/admin/disputes/:id/resolve` | Resolve dispute |
| `POST` | `/api/v1/admin/disputes/:id/escalate` | Escalate dispute |
| `POST` | `/api/v1/admin/disputes/:id/assign` | Assign to admin |
| `POST` | `/api/v1/admin/disputes/:id/notes` | Add note |
| `GET` | `/api/v1/admin/disputes/:id/notes` | Get notes |
| `GET` | `/api/v1/admin/disputes/:id/history` | Get history |
| `GET` | `/api/v1/admin/disputes/:id/audit` | Get audit logs |
| `GET` | `/api/v1/admin/disputes/:id/evidence` | Get evidence |
| `POST` | `/api/v1/admin/evidence/:id/verify` | Verify evidence |

## Events

### Outgoing Events

| Event Type | Description | Trigger |
|------------|-------------|---------|
| `dispute.created` | New dispute filed | Dispute creation |
| `dispute.evidence_submitted` | Evidence added | Evidence submission |
| `dispute.agent_responded` | Agent response received | Agent response |
| `dispute.state_changed` | State transition | Any state change |
| `dispute.assigned` | Admin assigned | Admin assignment |
| `dispute.escalated` | Dispute escalated | Escalation |
| `dispute.resolved` | Dispute resolved | Resolution |
| `dispute.refund_approved` | Refund approved | Refund resolution |
| `dispute.withdrawn` | Dispute withdrawn | Traveler withdrawal |
| `dispute.expired` | Dispute expired | Inactivity timeout |

### Incoming Events

| Event Type | Description | Source |
|------------|-------------|--------|
| `payment.refund_issued` | Refund processed | booking-payments |
| `booking.details_requested` | Booking info response | bookings |

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Type checking
npm run typecheck
```

## Security Notes

- This is a **backend service** and may contain secrets
- `SUPABASE_SERVICE_ROLE_KEY` is allowed here (not in frontend)
- `DATABASE_URL` with credentials is allowed here
- All inputs are validated, including internal service requests
- Admin actions are audit-logged with mandatory reasons
- JWT tokens are verified against JWKS endpoint

## Module Independence

Per architecture rules:
- This module does NOT import from other modules
- Communication is ONLY via events and shared contracts
- All dependencies are explicitly declared
