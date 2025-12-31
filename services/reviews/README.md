# Reviews Service

The Review & Reputation service for the HowWePlan travel orchestration platform.

## Responsibilities

- **Collect post-trip reviews** - Manages the full lifecycle of reviews from invitation to publication
- **Maintain internal reliability scores** - Calculates and tracks agent reputation metrics
- **Prevent gaming** - Detects and blocks review manipulation attempts

## Architecture

```
src/
├── api/                    # HTTP endpoints (Hono)
│   ├── reviews.api.ts      # Review CRUD operations
│   ├── ratings.api.ts      # Rating queries and admin operations
│   └── health.api.ts       # Health checks
├── config/
│   └── env.ts              # Environment validation (Zod)
├── events/
│   ├── contracts.ts        # Event type definitions
│   ├── publisher.ts        # Outbound event publishing
│   ├── consumer.ts         # Inbound event handling
│   └── handlers/           # Event handlers
├── models/
│   ├── review.model.ts     # Review domain model
│   ├── agent-score.model.ts # Score/rating models
│   └── audit-event.model.ts # Audit trail model
├── repositories/           # Data access layer
├── schemas/                # API validation schemas
└── services/
    ├── review.service.ts           # Review business logic
    ├── score-calculator.service.ts # Score calculation
    └── gaming-detection.service.ts # Gaming prevention
```

## Events

### Consumed Events

| Event | Source | Description |
|-------|--------|-------------|
| `booking.completed` | booking-payments | Triggers review invitation creation |
| `booking.cancelled` | booking-payments | Updates completion metrics |
| `dispute.resolved` | disputes | Updates agent dispute rate |

### Published Events

| Event | Description |
|-------|-------------|
| `review.published` | Review passed moderation and is public |
| `review.invitation.sent` | Review invitation created |
| `agent.score.updated` | Agent score recalculated |
| `agent.tier.changed` | Agent tier promoted/demoted |
| `review.gaming.alert` | Gaming detection triggered |

## API Endpoints

### Public (No Auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/reviews/public/:subjectId` | Get published reviews |
| GET | `/api/v1/ratings/public/agent/:agentId` | Get agent public rating |
| GET | `/api/v1/ratings/public/top-agents` | Get top-rated agents |
| GET | `/api/v1/ratings/public/tiers` | Get tier information |

### User (Auth Required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/reviews/user/my` | Get user's reviews |
| GET | `/api/v1/reviews/user/pending` | Get pending review invitations |
| GET | `/api/v1/reviews/user/:reviewId` | Get specific review |
| POST | `/api/v1/reviews/user/:reviewId/draft` | Save review draft |
| POST | `/api/v1/reviews/user/:reviewId/submit` | Submit review |
| GET | `/api/v1/reviews/user/eligibility/:bookingId` | Check review eligibility |

### Admin (Admin Auth Required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/reviews/admin/moderation-queue` | Get reviews pending moderation |
| GET | `/api/v1/reviews/admin/:reviewId` | Get full review details |
| POST | `/api/v1/reviews/admin/:reviewId/moderate` | Moderate a review |
| POST | `/api/v1/reviews/admin/:reviewId/hide` | Hide a published review |
| POST | `/api/v1/reviews/admin/:reviewId/unhide` | Unhide a hidden review |
| GET | `/api/v1/reviews/admin/search` | Search reviews |
| GET | `/api/v1/ratings/admin/agent/:agentId` | Get full agent metrics |
| POST | `/api/v1/ratings/admin/agent/:agentId/adjust` | Adjust agent score |
| POST | `/api/v1/ratings/admin/agent/:agentId/tier-override` | Override agent tier |
| POST | `/api/v1/ratings/admin/agent/:agentId/investigate` | Start investigation |

## Environment Variables

See [.env.example](.env.example) for all configuration options.

### Required Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `DATABASE_URL` | PostgreSQL connection string |
| `EVENT_BUS_URL` | Message broker URL |
| `JWT_PUBLIC_KEY` | JWT verification key |

### Key Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `REVIEW_SUBMISSION_WINDOW_DAYS` | 30 | Days after trip to submit review |
| `MIN_BOOKING_VALUE_FOR_REVIEW` | 50 | Minimum booking value for review |
| `SCORE_MIN_REVIEWS_FOR_PUBLIC` | 3 | Reviews needed for public display |
| `FEATURE_GAMING_DETECTION_ENABLED` | true | Enable gaming detection |

## Business Rules

### Review Lifecycle

1. **BookingCompleted** → Creates PENDING_SUBMISSION reviews for both parties
2. User can save **DRAFT** before deadline
3. User **SUBMIT**s → Gaming detection runs
4. If gaming score low → Auto **PUBLISHED**
5. If gaming score high → **UNDER_MODERATION**
6. Admin moderates → **PUBLISHED** or **REJECTED**
7. After deadline → **EXPIRED**

### Gaming Detection

Signals analyzed:
- **Velocity spike** - Too many reviews in short period
- **Reciprocal reviews** - Mutual high ratings
- **Rating deviation** - Significantly above/below average
- **Timing patterns** - Unusual submission times

### Score Calculation

Agent scores are weighted composites:
- Review ratings: 40%
- Booking completion rate: 25%
- Response rate & time: 20%
- Dispute rate (inverted): 15%

### Reliability Tiers

| Tier | Requirements |
|------|--------------|
| NEW | < 3 completed bookings |
| BRONZE | 3+ bookings, score ≥ 3.0 |
| SILVER | 11+ bookings, score ≥ 3.5 |
| GOLD | 51+ bookings, score ≥ 4.0 |
| PLATINUM | 200+ bookings, score ≥ 4.5 |

## Important Notes

1. **Reviews do NOT affect refunds** - Per platform rules
2. **All admin actions require a reason** - Audit logged
3. **Every state change emits an audit event** - Full traceability
4. **No cross-module imports** - Communication via events only

## Development

```bash
# Install dependencies
npm install

# Start in development mode
npm run dev

# Run tests
npm test

# Type check
npm run typecheck

# Build for production
npm run build
npm start
```

## Health Checks

- `GET /health` - Basic health status
- `GET /health/ready` - Readiness (dependencies available)
- `GET /health/live` - Liveness (process running)
