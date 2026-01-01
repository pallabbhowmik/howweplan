# Frontend Data Access Policy
**Status:** 🔴 CRITICAL - Architecture Enforcement  
**Last Updated:** January 2, 2026

---

## 🎯 Core Principle

**Frontend applications MUST route all data operations through backend services, with ONLY three exceptions:**

1. ✅ **Authentication** - Supabase Auth API only
2. ✅ **Session Management** - Auth session state only  
3. ✅ **Public Read-Only Data** - Static reference data (destinations, countries, etc.)

**Everything else MUST go through backend services.**

---

## ❌ VIOLATIONS FOUND

### Current Issues in Codebase

#### **user-web App** (`apps/user-web/src/lib/data/`)

**VIOLATING FILES:**
- ❌ `api.ts` - Direct Supabase queries for:
  - User profile CRUD (lines 165-250)
  - User settings (lines 251-370)
  - Travel requests CRUD (lines 391-650)
  - Bookings queries (lines 670-770)
  - Notifications (lines 792-830)
  - Dashboard stats aggregations (lines 832-900)
  
- ❌ `messages.ts` - Direct Supabase queries for:
  - Conversations list with complex joins (lines 27-140)
  - Messages CRUD operations (lines 145-184)
  - Multi-table joins (conversations, messages, agents, bookings, requests)

#### **agent-web App** (`apps/agent-web/src/lib/data/`)

**VIOLATING FILES:**
- ❌ `agent.ts` - Direct Supabase queries for:
  - Agent identity & profile (lines 23-48)
  - Agent statistics (lines 89-118)
  - Match operations (lines 125-220)
  - Conversations with joins (lines 233-310)
  - Message CRUD (lines 360-490)

### Why These Are Violations

1. **Business Logic in Frontend** - Complex joins, filtering, and aggregations should be in backend
2. **No Service Boundaries** - Frontend bypasses domain services (Identity, Requests, Messaging, etc.)
3. **RLS Dependency** - Security relies solely on Row-Level Security, not service-layer auth
4. **Breaking Event Architecture** - Direct DB writes bypass event bus for state changes
5. **Audit Trail Gaps** - Operations don't go through audit service
6. **Testing Difficulty** - Business logic in frontend is harder to test
7. **Performance Issues** - Multiple round-trips for complex queries instead of single backend call

---

## ✅ CORRECT PATTERNS

### 1. Authentication (ALLOWED)
```typescript
// ✅ CORRECT - Using Supabase Auth
import { getSupabaseClient } from '@/lib/supabase/client';

const supabase = getSupabaseClient();

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

// Get session
const { data: { session } } = await supabase.auth.getSession();

// Sign out
await supabase.auth.signOut();

// Subscribe to auth changes
supabase.auth.onAuthStateChange((event, session) => {
  // Handle auth state
});
```

### 2. Public Read-Only Data (ALLOWED)
```typescript
// ✅ CORRECT - Reading static reference data
const { data: destinations } = await supabase
  .from('destinations')  // Public, static reference table
  .select('id, name, country, region, image_url')
  .eq('is_active', true)
  .order('name');

// ✅ CORRECT - Reading public agent profiles (for browse/search)
const { data: agents } = await supabase
  .from('agent_public_profiles')  // Read-only view
  .select('id, display_name, tier, rating, specializations')
  .eq('is_available', true);
```

### 3. All Other Operations (MUST USE BACKEND)
```typescript
// ❌ WRONG - Direct Supabase query
const { data } = await supabase
  .from('travel_requests')
  .select('*')
  .eq('user_id', userId);

// ❌ WRONG - Direct service call
const response = await fetch('https://howweplan-requests.onrender.com/api/requests');

// ✅ CORRECT - Through API gateway
const requests = await fetch(`${API_BASE_URL}/api/requests/user/${userId}`, {
  headers: { 
    'Authorization': `Bearer ${session.access_token}` 
  }
}).then(r => r.json());

// Where API_BASE_URL = https://howweplan-gateway.onrender.com
```
```

---

## 🛠️ MIGRATION PLAN

### Phase 1: Stop the Bleeding (IMMEDIATE)
- [ ] Add warning comments to all violating files
- [ ] Document which functions need migration
- [ ] Create tracking issue for each service area

### Phase 2: Backend API Endpoints (Sprint 1-2)
Create proper backend endpoints for:

**All requests go through API Gateway: https://howweplan-gateway.onrender.com**

#### Identity Service (`services/identity/`)
- `POST /api/identity/profile` - Update user profile
- `GET /api/identity/profile/:userId` - Get user details
- `PUT /api/identity/settings` - Update user settings

#### Requests Service (`services/requests/`)
- `GET /api/requests/user/:userId` - List user's requests
- `POST /api/requests` - Create new request
- `PUT /api/requests/:id` - Update request
- `DELETE /api/requests/:id` - Cancel request
- `GET /api/requests/:id` - Get request details

#### Messaging Service (`services/messaging/`)
- `GET /api/messaging/conversations` - List conversations
- `GET /api/messaging/conversations/:id/messages` - Get messages
- `POST /api/messaging/messages` - Send message
- `PUT /api/messaging/conversations/:id/read` - Mark as read

#### Booking-Payments Service (`services/booking-payments/`)
- `GET /api/bookings/user/:userId` - List user bookings
- `GET /api/bookings/:id` - Get booking details
- `POST /api/bookings/:id/confirm` - Confirm booking
- `POST /api/bookings/:id/cancel` - Cancel booking

#### Notifications Service (`services/notifications/`)
- `GET /api/notifications/user/:userId` - List notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `POST /api/notifications/preferences` - Update preferences

#### Matching Service (`services/matching/`)
- `GET /api/matching/agent/:agentId/matches` - Get agent matches
- `POST /api/matching/matches/:id/accept` - Accept match
- `POST /api/matching/matches/:id/decline` - Decline match

**Note:** All endpoints are accessed via gateway, never directly.

### Phase 3: Frontend Migration (Sprint 2-3)
- [ ] Create new API client wrappers pointing to backend
- [ ] Replace Supabase calls with backend API calls
- [ ] Update tests to mock backend instead of Supabase
- [ ] Remove direct Supabase imports from data layer

### Phase 4: Cleanup (Sprint 3)
- [ ] Remove RLS policies that are no longer needed
- [ ] Update Supabase schema to restrict frontend access
- [ ] Run security audit
- [ ] Update documentation

---

## 📋 ENFORCEMENT CHECKLIST

Before merging any frontend PR, verify:

- [ ] No new `supabase.from()` calls except in auth or public data contexts
- [ ] All CRUD operations go through backend API
- [ ] Complex queries/joins are done in backend services
- [ ] State-changing operations emit events through event bus
- [ ] Operations are logged through audit service

---

## 🚨 IMMEDIATE ACTION ITEMS

1. **Add warning comments** to all violating files (see Phase 1)
2. **Create API specification** for missing backend endpoints
3. **Prioritize migration** of most critical functions:
   - User profile management
   - Travel request CRUD
   - Message sending/reading
   - Booking operations

---

## 📚 Reference

- [SERVICE_ENDPOINTS.md](./SERVICE_ENDPOINTS.md) - Backend API documentation
- [Event-Driven Architecture](./EVENT-FLOWS.md) - How events should flow
- [Security Policy](./SECURITY-VERIFICATION.md) - Auth & authorization patterns

---

## 🤝 Questions?

If you're unsure whether something should use Supabase or backend:

**Ask yourself:**
1. Is it authentication/session management? → **Supabase**
2. Is it static, public reference data (destinations, countries)? → **Supabase** (read-only)
3. Does it involve business logic, state changes, or user data? → **Backend Service**

**When in doubt, use the backend service.**
