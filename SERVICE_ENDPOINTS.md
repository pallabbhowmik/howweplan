# HowWePlan Service Configuration

## Running Services

All backend services are running as Docker containers:

```bash
# Check running services
docker ps --filter "name=tripcomposer" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

> Note: Docker Compose service/container names still use `tripcomposer` for compatibility.

## Service Endpoints Map

### Single Backend Entry Point (Recommended)

For local Docker Compose, access backend APIs through the API Gateway only:

- **Gateway (HTTP):** http://localhost:8081
- **Gateway Health:** http://localhost:8081/health
- **Gateway WebSocket:** ws://localhost:8081/ws

If port 8081 is in use, override with `GATEWAY_PORT` (example: `GATEWAY_PORT=8090`).

All microservices run on the Docker network and are **not** published to host ports by default.

### Backend Microservices

| Service | Container | Port (internal) | Health Endpoint | API Prefix | Status |
|---------|-----------|------|-----------------|------------|--------|
| **Audit** | tripcomposer-audit | 3010 | `/health` | `/api/v1` | ✅ |
| **Identity** | tripcomposer-identity | 3011 | `/api/v1/health` | `/api/v1` | ✅ |
| **Requests** | tripcomposer-requests | 3012 | `/api/v1/health` | `/api/v1` | ✅ |
| **Matching** | tripcomposer-matching | 3013 | `/health` | N/A | ❌ |
| **Itineraries** | tripcomposer-itineraries | 3014 | `/health` | `/api/v1` | ✅ |
| **Booking-Payments** | tripcomposer-booking-payments | 3015 | `/health` | `/api/v1` | ✅ |
| **Messaging** | tripcomposer-messaging | 3016 | `/health` | `/api/v1` | ✅ |
| **Disputes** | tripcomposer-disputes | 3017 | `/health` | `/api/v1` | ✅ |
| **Reviews** | tripcomposer-reviews | 3018 | `/health` | `/api/v1` | ✅ |
| **Notifications** | tripcomposer-notifications | 3019 | `/health` | `/api/v1` | ✅ |

> **Note:** Identity and Requests services have health at `/api/v1/health`. Most other services have health at `/health`.

### Infrastructure Services

| Service | Container | Port | Access |
|---------|-----------|------|--------|
| **PostgreSQL** | tripcomposer-postgres | 5432 | `postgresql://postgres:postgres@localhost:5432/tripcomposer` |
| **Redis** | tripcomposer-redis | 6379 | `redis://localhost:6379` |
| **RabbitMQ** | tripcomposer-rabbitmq | 5672 | `amqp://tripcomposer:tripcomposer@localhost:5672` |
| **RabbitMQ UI** | tripcomposer-rabbitmq | 15672 | http://localhost:15672 (tripcomposer/tripcomposer) |

### Frontend Apps

| App | Default Port | URL |
|-----|--------------|-----|
| **User Web** | 3000 | http://localhost:3000 |
| **Admin Web** | 3002 | http://localhost:3002 |
| **Agent Web** | 3003 | http://localhost:3003 |

## API Routing

### API Gateway (Port 8080)

All frontend traffic should go through the gateway:

```
GET  http://localhost:8081/health
GET  http://localhost:8081/ready
ANY  http://localhost:8081/api/{service}/*
WS   ws://localhost:8081/ws
```

### Identity Service (Port 3011)
```
POST   /auth/register          - User registration
POST   /auth/login             - User login
POST   /auth/refresh           - Token refresh
POST   /auth/logout            - User logout
GET    /users/me               - Current user profile
PATCH  /users/me               - Update profile
GET    /admin/*                - Admin operations (requires admin role)
GET    /agents/*               - Agent management
```

### Requests Service (Port 3012)
```
GET    /requests               - List travel requests
POST   /requests               - Create travel request
GET    /requests/:id           - Get request details
PATCH  /requests/:id           - Update request
DELETE /requests/:id           - Cancel request
```

### Matching Service (Port 3013)
```
POST   /match                  - Trigger agent matching
GET    /matches/:requestId     - Get matched agents
POST   /matches/:matchId/accept - Accept match
```

### Itineraries Service (Port 3014)
```
GET    /itineraries            - List itineraries
POST   /itineraries            - Create itinerary
GET    /itineraries/:id        - Get itinerary details
PATCH  /itineraries/:id        - Update itinerary
POST   /itineraries/:id/submit - Submit for review
```

### Booking-Payments Service (Port 3015)
```
GET    /bookings               - List bookings
POST   /bookings               - Create booking
GET    /bookings/:id           - Get booking details
POST   /payments/intent        - Create payment intent
POST   /payments/confirm       - Confirm payment
POST   /refunds                - Request refund
```

### Messaging Service (Port 3016)
```
GET    /conversations          - List conversations
GET    /conversations/:id      - Get conversation messages
POST   /conversations/:id/messages - Send message
WS     /ws                     - WebSocket for real-time chat
```

### Disputes Service (Port 3017)
```
GET    /disputes               - List disputes
POST   /disputes               - Create dispute
GET    /disputes/:id           - Get dispute details
PATCH  /disputes/:id           - Update dispute status
POST   /disputes/:id/resolve   - Resolve dispute
```

### Reviews Service (Port 3018)
```
GET    /reviews                - List reviews
POST   /reviews                - Create review
GET    /reviews/:id            - Get review details
GET    /agents/:id/reviews     - Get agent reviews
```

### Notifications Service (Port 3019)
```
GET    /notifications          - List notifications
PATCH  /notifications/:id/read - Mark as read
POST   /notifications/send     - Send notification (internal)
```

### Audit Service (Port 3010)
```
GET    /audit                  - Query audit events
GET    /audit/:id              - Get audit event details
GET    /audit/stats            - Get audit statistics
```

## Environment Variables Summary

### Frontend Apps (NEXT_PUBLIC_*)
```env
# API Base URL now includes /api/v1 prefix
NEXT_PUBLIC_API_BASE_URL=http://localhost:3011/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3016
NEXT_PUBLIC_SUPABASE_URL=http://localhost:3011
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

### Backend Services
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tripcomposer
REDIS_URL=redis://localhost:6379
EVENT_BUS_URL=amqp://tripcomposer:tripcomposer@localhost:5672
JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long
```

## Quick Health Check

```powershell
# PowerShell health check script
@(
    @{port=3010; path="/health"},
    @{port=3011; path="/api/v1/health"},
    @{port=3012; path="/api/v1/health"},
    @{port=3014; path="/health"},
    @{port=3015; path="/health"},
    @{port=3016; path="/health"},
    @{port=3017; path="/health"},
    @{port=3018; path="/health"},
    @{port=3019; path="/health"}
) | ForEach-Object { 
    try { 
        $r = Invoke-RestMethod -Uri "http://localhost:$($_.port)$($_.path)" -TimeoutSec 2
        Write-Host "Port $($_.port): $($r.status)" -ForegroundColor Green
    } catch { 
        Write-Host "Port $($_.port): FAILED" -ForegroundColor Red
    }
}
```

> **Note:** Matching service (port 3013) is event-driven and has no HTTP endpoint.

## Development Login Credentials

### Admin Dashboard (http://localhost:3002)
| Email | Password |
|-------|----------|
| `admin@howweplan.com` | `TripAdmin@2025` |
| `admin@demo.com` | `admin123` |

### User App (http://localhost:3000)
Register a new user or use existing test accounts.

### Agent Portal (http://localhost:3003)
Register a new agent or use existing test accounts.
