# HowWePlan Local Development Guide

This guide covers setting up and running HowWePlan locally using Docker.

> Note: The repo folder and Docker Compose identifiers may still use `TripComposer`/`tripcomposer` for compatibility.

## Prerequisites

- **Docker Desktop** (v4.0+) with Docker Compose v2
- **Node.js 20+** (for running scripts outside containers)
- **Make** (optional, for convenience commands)

## Quick Start

```bash
# 1. Clone and enter directory
git clone <repository-url>
cd TripComposer

# 2. Copy environment template
cp .env.local.example .env.local

# 3. Start infrastructure
docker compose up -d postgres redis

# 4. Start all services
docker compose up -d

# 5. Verify health
make health  # or manually curl each service
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HOWWEPLAN                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                         │
│  │  user-web   │  │  agent-web  │  │  admin-web  │     Frontend Apps       │
│  │   :3000     │  │   :3001     │  │   :3002     │     (Next.js 14)        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                         │
│         │                │                │                                 │
│         └────────────────┼────────────────┘                                 │
│                          │                                                  │
│  ┌───────────────────────┴────────────────────────────────────────────────┐│
│  │                        API Gateway (future)                            ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                          │                                                  │
│  ┌──────┬──────┬──────┬──┴───┬──────┬──────┬──────┬──────┬──────┬───────┐ │
│  │audit │iden- │ req- │match-│ itin-│book- │ msg  │dispu-│ rev- │notif- │ │
│  │:3010 │tity  │uests │ ing  │erar- │ ing- │:3016 │ tes  │ iews │icat-  │ │
│  │      │:3011 │:3012 │:3013 │ies   │paym- │      │:3017 │:3018 │ions   │ │
│  │      │      │      │      │:3014 │ents  │      │      │      │:3019  │ │
│  │      │      │      │      │      │:3015 │      │      │      │       │ │
│  └──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴───────┘ │
│                          │                                                  │
│  ┌───────────────────────┴────────────────────────────────────────────────┐│
│  │                         Event Bus (Redis)                              ││
│  │                            :6379                                       ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                          │                                                  │
│  ┌───────────────────────┴────────────────────────────────────────────────┐│
│  │                       PostgreSQL Database                              ││
│  │                            :5432                                       ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Service Ports

| Service | Port | Description |
|---------|------|-------------|
| postgres | 5432 | PostgreSQL database |
| redis | 6379 | Event bus & caching |
| audit | 3010 | Audit logging service |
| identity | 3011 | User authentication |
| requests | 3012 | Travel requests |
| matching | 3013 | Agent matching |
| itineraries | 3014 | Itinerary management |
| booking-payments | 3015 | Bookings & payments |
| messaging | 3016 | Chat messaging |
| disputes | 3017 | Dispute resolution |
| reviews | 3018 | User reviews |
| notifications | 3019 | Push notifications |
| user-web | 3000 | User frontend |
| agent-web | 3001 | Agent frontend |
| admin-web | 3002 | Admin frontend |

## Environment Configuration

Create `.env.local` from the template:

```bash
cp .env.local.example .env.local
```

Key variables to configure:

```env
# Database
DATABASE_URL=postgresql://tripcomposer:tripcomposer@postgres:5432/tripcomposer

# Redis
REDIS_URL=redis://redis:6379

# JWT (generate your own secret)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Stripe (use test keys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Common Commands

### Using Make (Recommended)

```bash
make setup          # First time setup
make up             # Start all services
make down           # Stop all services
make logs           # View all logs
make logs-identity  # View specific service logs
make health         # Check service health
make e2e            # Run E2E simulation
make db-shell       # Open PostgreSQL shell
make clean          # Remove containers and volumes
```

### Using Docker Compose Directly

```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Rebuild images
docker compose build --no-cache

# View running containers
docker compose ps
```

## Database Management

### Connect to PostgreSQL

```bash
# Via Make
make db-shell

# Direct
docker exec -it tripcomposer-postgres psql -U tripcomposer -d tripcomposer
```

### Useful SQL Commands

```sql
-- List all tables
\dt

-- View users
SELECT * FROM users;

-- View agents
SELECT * FROM agents;

-- View audit events
SELECT * FROM audit_events ORDER BY occurred_at DESC LIMIT 10;

-- Check seed data counts
SELECT 'Users' as entity, COUNT(*) FROM users
UNION ALL
SELECT 'Agents', COUNT(*) FROM agents
UNION ALL
SELECT 'Requests', COUNT(*) FROM travel_requests;
```

### Reset Database

```bash
# WARNING: Destroys all data
make db-reset

# Re-apply seed data only
make db-seed
```

## Testing

### E2E Flow Simulation

The E2E simulation validates the complete 15-step user journey:

```bash
# Run full simulation
make e2e

# Run with verbose output
make e2e-verbose

# Run up to specific step
node scripts/e2e-simulation.js --step=5
```

### Service Health Checks

```bash
# Check all services
make health

# Individual service
curl http://localhost:3011/health
```

## Debugging

### View Container Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f identity

# Last 100 lines
docker compose logs --tail=100 identity
```

### Enter Container Shell

```bash
docker exec -it tripcomposer-identity sh
```

### Check Environment Variables

```bash
docker exec tripcomposer-identity printenv | grep -i database
```

### Redis CLI

```bash
# Connect to Redis
docker exec -it tripcomposer-redis redis-cli

# Subscribe to events
PSUBSCRIBE tripcomposer:*

# Check keys
KEYS *
```

## Troubleshooting

### Services won't start

1. Check Docker is running: `docker info`
2. Check port conflicts: `netstat -an | findstr :3011`
3. View error logs: `docker compose logs identity`

### Database connection errors

1. Ensure postgres is healthy: `docker compose ps postgres`
2. Check DATABASE_URL in .env.local
3. Try restarting: `docker compose restart postgres`

### Build failures

1. Clear Docker cache: `docker compose build --no-cache`
2. Remove volumes: `docker compose down -v`
3. Prune unused: `docker system prune -f`

### Port already in use

```bash
# Find process using port
netstat -ano | findstr :3011

# Kill process (Windows)
taskkill /PID <PID> /F
```

## Development Workflow

### Making Code Changes

1. Edit code in your IDE
2. For backend services:
   ```bash
   docker compose restart <service-name>
   # Or rebuild if dependencies changed:
   docker compose up -d --build <service-name>
   ```
3. For frontend apps (with hot reload):
   - Changes should auto-reload in development mode

### Adding New Dependencies

```bash
# Install in container
docker exec -it tripcomposer-identity npm install <package>

# Rebuild image
docker compose up -d --build identity
```

### Running Migrations

```bash
# Enter service container
docker exec -it tripcomposer-requests sh

# Run migrations
npm run migrate
```

## Production Notes

This Docker setup is for **development only**. For production:

1. Remove debug port exposures (5432, 6379)
2. Use Docker secrets instead of env files
3. Add resource limits
4. Enable TLS/SSL
5. Use separate database users per service
6. Configure proper logging and monitoring

See [SECURITY-VERIFICATION.md](./docs/SECURITY-VERIFICATION.md) for details.
