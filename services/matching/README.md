# Matching & Routing Service

Production-grade agent matching and routing service for the HowWePlan travel orchestration platform.

## Overview

The Matching Service is responsible for:
- Selecting 2–3 optimal agents per travel request
- Managing Star vs Bench agent separation
- Handling peak-season scarcity gracefully
- Processing admin overrides via events
- Emitting audit logs for all state changes

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     MATCHING SERVICE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Event      │    │   Matching   │    │    Agent     │       │
│  │   Handlers   │───▶│   Engine     │───▶│  Repository  │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                   │                                    │
│         │            ┌──────┴──────┐                            │
│         │            │             │                            │
│         ▼            ▼             ▼                            │
│  ┌──────────────┐ ┌──────────┐ ┌──────────┐                    │
│  │    Event     │ │ Scoring  │ │Selection │                    │
│  │   Publisher  │ │ Engine   │ │ Engine   │                    │
│  └──────────────┘ └──────────┘ └──────────┘                    │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────┐                                               │
│  │    Audit     │                                               │
│  │   Logger     │                                               │
│  └──────────────┘                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Redis Event    │
                    │      Bus         │
                    └──────────────────┘
```

## Events

### Inbound Events (Consumed)

| Event | Source | Description |
|-------|--------|-------------|
| `REQUEST_CREATED` | Request Service | New travel request submitted |
| `AGENT_AVAILABILITY_CHANGED` | Agent Service | Agent availability updated |
| `AGENT_RESPONDED_TO_MATCH` | Agent Service | Agent accepted/declined match |
| `ADMIN_OVERRIDE_REQUESTED` | Admin Service | Admin override request |
| `MATCHING_TIMEOUT_EXPIRED` | Scheduler Service | Agent response timeout |

### Outbound Events (Produced)

| Event | Destination | Description |
|-------|-------------|-------------|
| `AGENTS_MATCHED` | Request Service, Notification Service | Agents selected for request |
| `AGENT_DECLINED` | Request Service, Audit Service | Agent declined/timed out |
| `MATCHING_FAILED` | Request Service, Notification Service | No agents available |
| `MATCHING_STATUS_CHANGED` | Request Service | Status lifecycle change |
| `REMATCH_INITIATED` | Internal, Audit Service | Rematch started |
| `ADMIN_OVERRIDE_APPLIED` | Audit Service, Admin Service | Override completed |
| `MATCHING_AUDIT_LOG` | Audit Service | All state changes |

## Matching Algorithm

### Scoring Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| Tier | 20% | Star agents score higher |
| Rating | 25% | Historical customer ratings (0-5) |
| Response Time | 15% | Average response time |
| Specialization | 20% | Match with trip type |
| Region | 15% | Destination expertise |
| Workload | 5% | Current capacity |

### Selection Strategy

1. **Star First**: Prioritize star-tier agents
2. **Bench Fallback**: Use bench agents if stars unavailable
3. **Peak Season**: Reduce minimum requirements during scarcity
4. **Score Ranking**: Select top-scoring candidates

## Environment Variables

### App Metadata

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVICE_NAME` | Service identifier | `matching-service` |
| `NODE_ENV` | Environment | `development` |
| `PORT` | Service port | `3003` |
| `LOG_LEVEL` | Log verbosity | `info` |

### Event Bus (Redis)

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis password | _(empty)_ |
| `REDIS_DB` | Database index | `0` |
| `REDIS_CONNECT_TIMEOUT` | Connection timeout (ms) | `10000` |

### Database

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `DATABASE_POOL_MIN` | Min connections | `2` |
| `DATABASE_POOL_MAX` | Max connections | `10` |

### Authentication

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | ✅ |
| `INTERNAL_JWT_SECRET` | Internal JWT secret (min 32 chars) | ✅ |

### Matching Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `MATCHING_MIN_AGENTS` | Minimum agents per request | `2` |
| `MATCHING_MAX_AGENTS` | Maximum agents per request | `3` |
| `AGENT_RESPONSE_TIMEOUT_HOURS` | Response timeout | `24` |
| `STAR_AGENT_MIN_RATING` | Star tier threshold | `4.5` |
| `STAR_AGENT_MIN_BOOKINGS` | Star booking minimum | `10` |

### Peak Season

| Variable | Description | Default |
|----------|-------------|---------|
| `PEAK_SEASON_MODE_ENABLED` | Enable peak handling | `false` |
| `PEAK_SEASON_ALLOW_SINGLE_AGENT` | Allow 1 agent minimum | `false` |
| `PEAK_SEASON_TIMEOUT_HOURS` | Extended timeout | `48` |

### Feature Toggles

| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_BENCH_FALLBACK` | Allow bench agents as fallback | `true` |
| `ENABLE_GEO_MATCHING` | Geographic preference matching | `true` |
| `ENABLE_SPECIALIZATION_MATCHING` | Specialization matching | `true` |

### Operational Limits

| Variable | Description | Default |
|----------|-------------|---------|
| `MAX_MATCHING_ATTEMPTS` | Max retry attempts | `3` |
| `MATCHING_RETRY_COOLDOWN_SECONDS` | Retry delay | `300` |
| `MAX_CONCURRENT_MATCHES` | Concurrency limit | `100` |

### Audit & Observability

| Variable | Description | Default |
|----------|-------------|---------|
| `AUDIT_LOG_ENABLED` | Enable audit logging | `true` |
| `AUDIT_LOG_RETENTION_DAYS` | Log retention | `90` |
| `METRICS_ENABLED` | Enable metrics | `true` |
| `METRICS_PORT` | Metrics endpoint port | `9103` |

## Security Rules Enforced

✅ **Secrets only in backend** - Service role keys stay server-side  
✅ **Agent identity protected** - Only first name and photo exposed pre-payment  
✅ **All inputs validated** - Zod schemas for all event payloads  
✅ **Admin actions audited** - Reason required, all overrides logged  
✅ **State changes tracked** - Every status change emits audit event  

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your values

# Run in development
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Run production build
npm start
```

## Project Structure

```
src/
├── config/           # Environment configuration & validation
│   ├── env.ts        # Zod schema validation
│   └── index.ts
├── types/            # Type definitions & contracts
│   ├── index.ts      # Core types
│   └── events.ts     # Event definitions
├── events/           # Event bus implementation
│   ├── event-bus.ts  # Redis pub/sub
│   ├── event-publisher.ts
│   └── index.ts
├── engine/           # Matching logic
│   ├── scoring.ts    # Agent scoring algorithm
│   ├── selection.ts  # Agent selection strategy
│   ├── matching-engine.ts
│   └── index.ts
├── handlers/         # Event handlers
│   ├── event-handlers.ts
│   └── index.ts
├── repositories/     # Data access
│   ├── agent-repository.ts
│   └── index.ts
├── lib/              # Utilities
│   ├── logger.ts     # Pino logger
│   ├── audit-logger.ts
│   ├── peak-season.ts
│   └── index.ts
└── index.ts          # Service entry point
```

## Business Rules Implemented

1. **Select 2-3 agents per request** - Configurable via env
2. **Star vs Bench separation** - Stars prioritized, bench as fallback
3. **Peak-season scarcity** - Reduced requirements, extended timeouts
4. **Never expose agent identity** - Only firstName + photo pre-payment
5. **Matching is advisory** - Scores inform, don't guarantee
6. **Admin override via event only** - No direct API manipulation
7. **Every state change audited** - Full event trail
8. **All inputs validated** - Even from internal services

## Admin Override Actions

| Action | Description |
|--------|-------------|
| `FORCE_MATCH` | Force specific agents to match |
| `FORCE_REMATCH` | Clear exclusions, restart matching |
| `CANCEL_MATCHING` | Cancel request matching |
| `EXTEND_TIMEOUT` | Extend agent response deadline |
| `OVERRIDE_TIER_REQUIREMENT` | Allow bench-only matching |

All admin actions require a reason (min 10 characters) and are logged.

## Development

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Watch mode
npm run dev
```

## License

Proprietary - HowWePlan Platform
