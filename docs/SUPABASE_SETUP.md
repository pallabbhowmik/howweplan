# HowWePlan - Local Development Setup

## Quick Start

### 1. Start Development Stack

```bash
# From project root - start infrastructure
docker-compose -f docker-compose.dev.yml up -d

# Or start all services including backend
docker-compose up -d
```

### 2. Verify Services Are Running

```bash
docker ps --filter "name=tripcomposer"
```

> Note: The Docker Compose project/container names still use `tripcomposer` for compatibility.

## Service Endpoints

### Infrastructure Services
| Service | URL | Description |
|---------|-----|-------------|
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Cache & Sessions |
| RabbitMQ | localhost:5672 | Message Queue |
| RabbitMQ UI | http://localhost:15672 | Queue Management (tripcomposer/tripcomposer) |
| Mailhog | http://localhost:8025 | Email Testing UI |
| pgAdmin | http://localhost:5050 | Database Admin (admin@howweplan.com/admin123) |

### Backend Microservices
| Service | Port | Description |
|---------|------|-------------|
| Identity | 3011 | Authentication & Users |
| Requests | 3012 | Travel Requests |
| Matching | 3013 | Agent Matching |
| Itineraries | 3014 | Itinerary Management |
| Booking-Payments | 3015 | Bookings & Payments |
| Messaging | 3016 | Real-time Chat |
| Disputes | 3017 | Dispute Resolution |
| Reviews | 3018 | Agent Reviews |
| Notifications | 3019 | Email/Push Notifications |
| Audit | 3010 | Audit Logging |

### Frontend Apps
| App | URL | Description |
|-----|-----|-------------|
| User Web | http://localhost:3000 | Customer Portal |
| Admin Web | http://localhost:3002 | Admin Dashboard |
| Agent Web | http://localhost:3003 | Agent Portal |

---

## Admin & Demo Credentials

> **Note:** Default credentials are configured via seed data in `docker/init-db/`. For production, change all passwords and use proper secrets management.

See `docker/init-db/` seed scripts or `.env.example` files for default development credentials.

---

## Supabase Keys

> **Note:** All keys and secrets should be stored in `.env` files (see `.env.example` for templates). Never commit actual secrets to version control.

### Anonymous Key (Frontend/Public)
```
# See .env.example - set SUPABASE_ANON_KEY
```

### Service Role Key (Backend Only - NEVER expose to frontend)
```
# See .env.example - set SUPABASE_SERVICE_ROLE_KEY
```

### JWT Secret
```
# See .env.example - set JWT_SECRET
```

### Database Connection
```
# See .env.example - set DATABASE_URL
```

---

## Environment Files Created

### Frontend Apps (.env.local)
- `apps/user-web/.env.local`
- `apps/admin-web/.env.local`
- `apps/agent-web/.env.local`

### Backend Services (.env)
- `services/identity/.env`
- `services/requests/.env`
- `services/matching/.env`
- `services/itineraries/.env`
- `services/booking-payments/.env`
- `services/notifications/.env`
- `services/messaging/.env`
- `services/disputes/.env`
- `services/reviews/.env`
- `services/audit/.env`

---

## Admin Dashboard Settings

Access the admin dashboard to configure rules and regulations:

1. Navigate to: http://localhost:3000/dashboard (or your admin-web port)
2. Login with admin credentials
3. Go to **Settings** in the sidebar
4. Configure:
   - **Booking Rules**: Cancellation policy, modification policy, payment policy
   - **Agent Rules**: Commission rates, verification requirements, response times
   - **User Rules**: Account settings, request limits
   - **Dispute Rules**: Filing rules, resolution policy
   - **Platform Rules**: Service fees, communication settings
   - **Review Rules**: Submission rules, moderation settings
   - **Insurance Rules**: Travel insurance settings

---

## Database Schema

The following tables are automatically created:

| Table | Description |
|-------|-------------|
| `users` | All user accounts |
| `admins` | Admin profiles |
| `agents` | Agent profiles |
| `travel_requests` | User travel requests |
| `itinerary_options` | Agent proposals |
| `bookings` | Confirmed bookings |
| `payments` | Payment records |
| `disputes` | Dispute records |
| `messages` | Chat messages |
| `reviews` | Agent reviews |
| `notifications` | User notifications |
| `audit_logs` | System audit trail |
| `app_settings` | Configurable rules & regulations |

---

## Docker Commands

```bash
# Start all services
docker-compose -f docker-compose.supabase.yml up -d

# View logs
docker-compose -f docker-compose.supabase.yml logs -f

# Stop all services
docker-compose -f docker-compose.supabase.yml down

# Stop and remove volumes (clean slate)
docker-compose -f docker-compose.supabase.yml down -v

# Restart a specific service
docker-compose -f docker-compose.supabase.yml restart supabase-db
```

---

## Troubleshooting

### Database not initializing
```bash
# Reset and recreate
docker-compose -f docker-compose.supabase.yml down -v
docker-compose -f docker-compose.supabase.yml up -d
```

### Port conflicts
Check if these ports are available:
- 5432 (PostgreSQL)
- 8000 (Kong)
- 3100 (Studio)
- 4000 (Realtime)
- 9000 (Inbucket)

### Connection refused
Wait 30-60 seconds after starting for all services to initialize.

---

## Security Notes

⚠️ **Important**: These credentials are for **development only**.

For production:
1. Generate new JWT secrets
2. Change all passwords
3. Use proper secrets management (e.g., AWS Secrets Manager, Vault)
4. Never commit `.env` files to version control
