# HowWePlan Event Flow Architecture

This document maps all events in the system with their producers (publishers) and consumers (subscribers).

> Note: Event channel/exchange identifiers may still use `tripcomposer` for compatibility.

## Event Bus Infrastructure

- **Technology**: Redis Pub/Sub (production-ready) / InMemoryEventBus (development)
- **Pattern**: Event-driven architecture with typed contracts
- **Audit Compliance**: Every state change emits an audit event (Constitution Rule 18)

---

## Complete Event Catalog

### 1. Request Events

| Event Type | Producer Service | Consumer Services | Description |
|------------|------------------|-------------------|-------------|
| `request.created` | `requests` | `matching`, `audit` | User submits a new travel request |
| `request.updated` | `requests` | `matching`, `audit` | User updates request details |
| `request.cancelled` | `requests` | `matching`, `itineraries`, `audit` | User cancels request |
| `request.expired` | `requests` | `matching`, `notifications`, `audit` | Request TTL expired |

### 2. Agent Matching Events

| Event Type | Producer Service | Consumer Services | Description |
|------------|------------------|-------------------|-------------|
| `agents.matched` | `matching` | `requests`, `notifications`, `audit` | Agents matched to request (star + bench) |
| `agent.confirmed` | `matching` | `requests`, `itineraries`, `notifications`, `audit` | Agent accepts request (reveals identity) |
| `agent.declined` | `matching` | `requests`, `notifications`, `audit` | Agent declines request |
| `agent.revealed` | `matching` | `identity`, `audit` | Full agent identity revealed to user |

### 3. Itinerary Events

| Event Type | Producer Service | Consumer Services | Description |
|------------|------------------|-------------------|-------------|
| `itinerary.submitted` | `itineraries` | `requests`, `notifications`, `audit` | Agent submits itinerary (obfuscated) |
| `itinerary.selected` | `itineraries` | `requests`, `booking-payments`, `notifications`, `audit` | User selects an itinerary |

### 4. Booking Events

| Event Type | Producer Service | Consumer Services | Description |
|------------|------------------|-------------------|-------------|
| `booking.created` | `booking-payments` | `messaging`, `notifications`, `audit` | Booking record created |
| `booking.confirmed` | `booking-payments` | `messaging`, `notifications`, `audit` | Booking confirmed after payment |
| `booking.cancelled` | `booking-payments` | `disputes`, `notifications`, `audit` | Booking cancelled (triggers refund) |
| `booking.completed` | `booking-payments` | `reviews`, `notifications`, `audit` | Travel completed (commission earned) |

### 5. Payment Events

| Event Type | Producer Service | Consumer Services | Description |
|------------|------------------|-------------------|-------------|
| `payment.initiated` | `booking-payments` | `audit` | Payment process started |
| `payment.authorized` | `booking-payments` | `notifications`, `audit` | Funds held but not captured |
| `payment.captured` | `booking-payments` | `itineraries`, `messaging`, `notifications`, `audit` | Funds captured - reveals details |
| `payment.failed` | `booking-payments` | `notifications`, `audit` | Payment failed |
| `refund.issued` | `booking-payments` | `disputes`, `notifications`, `audit` | Refund processed |

### 6. Dispute Events

| Event Type | Producer Service | Consumer Services | Description |
|------------|------------------|-------------------|-------------|
| `dispute.opened` | `disputes` | `booking-payments`, `messaging`, `notifications`, `audit` | User opens dispute |
| `dispute.escalated` | `disputes` | `notifications`, `audit` | Escalated to admin arbitration |
| `dispute.resolved` | `disputes` | `booking-payments`, `reviews`, `notifications`, `audit` | Dispute resolved (may trigger refund) |

### 7. Audit Events

| Event Type | Producer Service | Consumer Services | Description |
|------------|------------------|-------------------|-------------|
| `audit.logged` | `audit` | (append-only storage) | Immutable audit record |

---

## Event Flow Diagrams

### Flow 1: Request → Agent Matching → Confirmation

```
┌─────────┐     request.created     ┌──────────┐     agents.matched     ┌──────────────┐
│ requests│ ──────────────────────► │ matching │ ───────────────────────► │ notifications│
└─────────┘                         └──────────┘                         └──────────────┘
                                         │
                                         │ agent.confirmed
                                         ▼
                                    ┌──────────┐
                                    │ identity │ (reveal agent details)
                                    └──────────┘
```

### Flow 2: Itinerary → Selection → Booking

```
┌────────────┐   itinerary.submitted    ┌──────────┐   itinerary.selected   ┌─────────────────┐
│ itineraries│ ─────────────────────────► │ requests │ ─────────────────────► │ booking-payments│
└────────────┘                           └──────────┘                        └─────────────────┘
                                                                                     │
                                                                          booking.created
                                                                                     ▼
                                                                             ┌───────────┐
                                                                             │ messaging │
                                                                             └───────────┘
```

### Flow 3: Payment → Reveal → Completion

```
┌─────────────────┐   payment.captured    ┌────────────┐
│ booking-payments│ ─────────────────────► │ itineraries│ (reveal vendor details)
└─────────────────┘                        └────────────┘
        │                                        │
        │                                        │
        │ booking.completed                      │
        ▼                                        ▼
┌─────────┐                              ┌───────────┐
│ reviews │                              │ messaging │ (enable direct contact)
└─────────┘                              └───────────┘
```

### Flow 4: Dispute Resolution

```
┌──────────┐    dispute.opened     ┌─────────────────┐    dispute.escalated    ┌─────────────┐
│ disputes │ ────────────────────► │ booking-payments│ ───────────────────────► │ admin-web   │
└──────────┘                       └─────────────────┘                          └─────────────┘
     │                                                                                │
     │                                                                                │
     │ dispute.resolved                                                               │
     ▼                                                                                │
┌─────────────────┐   refund.issued                                                   │
│ booking-payments│ ◄─────────────────────────────────────────────────────────────────┘
└─────────────────┘
```

---

## Service-to-Event Subscription Matrix

| Service | Publishes | Subscribes To |
|---------|-----------|---------------|
| `requests` | request.* | agents.matched, agent.confirmed, itinerary.submitted |
| `matching` | agents.*, agent.* | request.created, request.updated, request.cancelled |
| `itineraries` | itinerary.* | agent.confirmed, payment.captured |
| `booking-payments` | booking.*, payment.*, refund.* | itinerary.selected, dispute.opened, dispute.resolved |
| `messaging` | (message events) | booking.created, booking.confirmed, payment.captured |
| `disputes` | dispute.* | booking.cancelled |
| `reviews` | review.* | booking.completed, dispute.resolved |
| `notifications` | (none - consumer only) | ALL events (for user notifications) |
| `audit` | audit.logged | ALL events (append-only logging) |
| `identity` | (none) | agent.revealed |

---

## Constitution Rules Enforced by Events

| Rule | Event(s) | Enforcement |
|------|----------|-------------|
| Rule 3: Commission on completion | `booking.completed` | `commissionEarned` field calculated |
| Rule 8: Vendor details revealed | `payment.captured` | `triggeredReleases.vendorDetailsRevealed` |
| Rule 10: Agent identity revealed | `agent.confirmed` | Triggers `agent.revealed` |
| Rule 11: Contact details released | `payment.captured` | `triggeredReleases.agentContactRevealed` |
| Rule 13: Subjective complaints | `dispute.opened`, `dispute.resolved` | `isSubjectiveComplaint` flag |
| Rule 14: Refund state machine | `refund.issued` | `refundType`, `initiatedBy` fields |
| Rule 18: Audit all state changes | ALL events | `audit` service subscribes to all |

---

## Docker Compose Event Bus Configuration

```yaml
# In docker-compose.yml
services:
  redis:
    ports:
      - "6379:6379"
    # Event bus channels:
    # - tripcomposer:events (main channel)
    # - tripcomposer:audit (audit-specific channel)

# Service environment:
REDIS_URL=redis://redis:6379
EVENT_BUS_CHANNEL=tripcomposer:events
AUDIT_CHANNEL=tripcomposer:audit
```

---

## Testing Event Flows

To verify event flows are working:

1. **Publish test event**: Use Redis CLI
   ```bash
   docker exec -it tripcomposer-redis redis-cli
   PUBLISH tripcomposer:events '{"eventType":"request.created","payload":{}}'
   ```

2. **Monitor all events**: 
   ```bash
   docker exec -it tripcomposer-redis redis-cli
   PSUBSCRIBE tripcomposer:*
   ```

3. **Check audit logs**:
   ```sql
   SELECT * FROM audit_events ORDER BY occurred_at DESC LIMIT 10;
   ```
