# Frontend → Backend Data Flow

## Current Architecture (CORRECT Pattern)

```
┌──────────────────────────────────────────────────────────────────────┐
│                         FRONTEND APPS                                 │
│  (user-web, agent-web, admin-web)                                    │
└────────┬────────────────────────────────────┬──────────────────┬─────┘
         │                                    │                  │
         │ ✅ ALLOWED                        │ ✅ ALLOWED      │ ❌ FORBIDDEN
         │ Authentication                     │ Public Data      │ Direct Service
         │ Session Management                 │ (Read-Only)      │ Calls
         ▼                                    ▼                  │
┌─────────────────┐                  ┌─────────────────┐        │
│  Supabase Auth  │                  │  Supabase DB    │        │
│   .auth.xxx()   │                  │  (destinations, │        │
│                 │                  │   countries)    │        │
└─────────────────┘                  └─────────────────┘        │
                                                                 │
         │ ✅ CORRECT                                           │
         │ All Other Operations                                  │
         ▼                                                       │
┌──────────────────────────────────────────────────────────────┐│
│              API GATEWAY                                      ││
│  https://howweplan-gateway.onrender.com                      ││
│                                                               ││
│  Routes:                                                      ││
│    /api/identity/*   → Identity Service                      ││
│    /api/requests/*   → Requests Service                      ││
│    /api/bookings/*   → Booking-Payments Service              ││
│    /api/messaging/*  → Messaging Service                     ││
│    /api/matching/*   → Matching Service                      ││
│    ... and more                                               ││
└────────┬─────────────────────────────────────────────────────┘│
         │                                                       │
         │ Gateway routes to                                     │
         │ microservices                                         │
         ▼                                                       │
┌──────────────────────────────────────────────────────────────┐│
│                    BACKEND MICROSERVICES                      ││
│  (Identity, Requests, Matching, Messaging, etc.)             ││
└────────┬──────────────────────────────────────────────────────┘│
         │                                                       │
         │ Services have                                         │
         │ full DB access                                        │
         ▼                                                       │
┌──────────────────────────────────────────────────────────────┐│
│                     SUPABASE DATABASE                         ││
│  (users, travel_requests, bookings, messages, etc.)          ││
└───────────────────────────────────────────────────────────────┘
                                                                 │
     ❌ These paths are NOT allowed ─────────────────────────────┘
     (Direct service calls, Direct DB access)
```

---

## ✅ CORRECT Data Flow Examples

### Example 1: User Profile Update
```
Frontend (user-web)
    │
    │ PUT https://howweplan-gateway.onrender.com/api/identity/profile
    │ { firstName: "John" }
    │ Authorization: Bearer <token>
    ▼
API Gateway
    │ Validates token
    │ Routes to Identity Service
    ▼
Identity Service
    │ Checks permissions
    │ Applies business logic
    │ Emits ProfileUpdated event
    ▼
Supabase DB
    │ UPDATE users SET first_name = 'John'
    ▼
Event Bus
    │ ProfileUpdated event
    │ → Audit Service (logs change)
    │ → Notifications Service (notifies user)
```

### Example 2: Create Travel Request
```
Frontend (user-web)
    │
    │ POST https://howweplan-gateway.onrender.com/api/requests
    │ { destination: "Goa", dates: [...] }
    │ Authorization: Bearer <token>
    ▼
API Gateway
    │ Validates token
    │ Routes to Requests Service
    ▼
Requests Service
    │ Validates input
    │ Checks user permissions
    │ Creates request
    │ Emits RequestCreated event
    ▼
Supabase DB
    │ INSERT INTO travel_requests
    ▼
Event Bus
    │ RequestCreated event
    │ → Matching Service (finds agents)
    │ → Notifications Service (notifies user)
    │ → Audit Service (logs creation)
```

### Example 3: Send Message
```
Frontend (user-web or agent-web)
    │
    │ POST https://howweplan-gateway.onrender.com/api/messaging/messages
    │ { conversationId: "...", content: "Hello" }
    │ Authorization: Bearer <token>
    ▼
API Gateway
    │ Validates token
    │ Routes to Messaging Service
    ▼
Messaging Service
    │ Validates permissions
    │ Checks conversation access
    │ Saves message
    │ Emits MessageSent event
    ▼
Supabase DB
    │ INSERT INTO messages
    ▼
Event Bus
    │ MessageSent event
    │ → WebSocket (real-time delivery)
    │ → Notifications Service (push notification)
    │ → Audit Service (logs message)
```

---

## ❌ WRONG Data Flow (Current Violations)

### Anti-Pattern: Direct Database Access
```
Frontend (user-web)
    │
    │ const { data } = await supabase
    │   .from('travel_requests')        ❌ WRONG!
    │   .select('*')
    │   .eq('user_id', userId)
    ▼
Supabase DB
    │ SELECT * FROM travel_requests
    │
    │ Problems:
    │ ✗ Bypasses backend services
    │ ✗ No business logic validation
    │ ✗ No event emission
    │ ✗ No audit logging
    │ ✗ Security relies only on RLS
    │ ✗ Complex queries in frontend
```

---

## 🎯 The Three Rules

### Rule 1: Authentication → Supabase Auth
```typescript
// ✅ CORRECT
const supabase = getSupabaseClient();
await supabase.auth.signInWithPassword({ email, password });
await supabase.auth.getSession();
await supabase.auth.signOut();
```

### Rule 2: Public Reference Data → Supabase (Read-Only)
```typescript
// ✅ CORRECT
const { data: destinations } = await supabase
  .from('destinations')  // Public, static, read-only
  .select('id, name, country')
  .eq('is_active', true);
```

### Rule 3: Everything Else → Backend Services
```typescript
// ✅ CORRECT
const response = await fetch(
  `https://howweplan-gateway.onrender.com/api/requests/user/${userId}`,
  { headers: { 'Authorization': `Bearer ${session.access_token}` } }
);
const requests = await response.json();
```

---

## 🔄 Service Responsibilities

**All services accessed via:** `https://howweplan-gateway.onrender.com`

```
┌─────────────────────────────────────────────────────────────┐
│  Identity Service          /api/identity/*                  │
│  → User profiles, settings, authentication business logic   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Requests Service          /api/requests/*                  │
│  → Travel requests CRUD, matching orchestration             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Matching Service          /api/matching/*                  │
│  → Agent-request matching, acceptance, scoring              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Messaging Service         /api/messaging/*                 │
│  → Conversations, messages, real-time chat                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Booking-Payments Service  /api/bookings/*                  │
│  → Booking lifecycle, payment processing, refunds           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Itineraries Service       /api/itineraries/*               │
│  → Itinerary CRUD, obfuscation, proposal management         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Notifications Service     /api/notifications/*             │
│  → Push notifications, email, SMS, preferences              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Reviews Service           /api/reviews/*                   │
│  → Reviews, ratings, moderation                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Disputes Service          /api/disputes/*                  │
│  → Dispute management, resolution workflow                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Audit Service             /api/audit/*                     │
│  → System-wide audit logging, compliance                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Benefits of This Architecture

| Benefit | Description |
|---------|-------------|
| **Security** | Backend enforces authorization, not just RLS |
| **Business Logic** | Domain logic centralized in services |
| **Events** | State changes emit events for other services |
| **Audit** | All operations logged automatically |
| **Testing** | Backend logic isolated and testable |
| **Performance** | Optimized queries, caching, batching |
| **Flexibility** | Can swap databases without changing frontend |
| **Monitoring** | Centralized metrics and observability |

---

## 🔍 How to Check Your Code

Before pushing code, ask:

1. Am I using `supabase.from()`? 
   - If YES → Is it auth or public reference data?
     - If NO → **Use backend API instead**

2. Am I writing to the database?
   - If YES → **Must go through backend service**

3. Am I joining tables or doing complex queries?
   - If YES → **Must be done in backend service**

4. Am I changing state (create/update/delete)?
   - If YES → **Must emit events through backend**

**When in doubt, use the backend service.**
