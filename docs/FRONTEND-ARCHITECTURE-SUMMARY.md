# Frontend Architecture Summary

## 🎯 Core Rule

**Frontend applications communicate with Supabase ONLY for:**
- ✅ Authentication (Supabase Auth API)
- ✅ Session management  
- ✅ Public read-only data (destinations, countries)

**Everything else goes through backend services.**

---

## ✅ What's Been Done

### 1. Policy Documentation
- **[FRONTEND-DATA-ACCESS-POLICY.md](./docs/FRONTEND-DATA-ACCESS-POLICY.md)** - Complete architectural policy with migration plan
- **[ARCHITECTURE_RULES.md](./ARCHITECTURE_RULES.md)** - Quick reference for developers

### 2. Code Annotations
All violating files marked with warning comments:
- `apps/user-web/src/lib/data/api.ts` - User, requests, bookings operations
- `apps/user-web/src/lib/data/messages.ts` - Message CRUD
- `apps/agent-web/src/lib/data/agent.ts` - Agent data, matches, messages

### 3. Supabase Client Guards
Added usage policies to:
- `apps/user-web/src/lib/supabase/client.ts`
- `apps/agent-web/src/lib/supabase/client.ts`  
- `apps/admin-web/src/lib/supabase/client.ts`

### 4. Environment Documentation
Updated `.env.example` files with data access policy:
- `apps/user-web/.env.example`
- `apps/agent-web/.env.example`
- `apps/admin-web/.env.example`

---

## 📋 Current Violations (Technical Debt)

### user-web App
| File | Violations | Should Use Instead |
|------|-----------|-------------------|
| `api.ts` | User profile CRUD | Identity Service |
| `api.ts` | Travel requests CRUD | Requests Service |
| `api.ts` | Bookings queries | Booking-Payments Service |
| `api.ts` | Notifications | Notifications Service |
| `api.ts` | Dashboard stats | Aggregation API endpoint |
| `messages.ts` | Conversations + messages | Messaging Service |

### agent-web App
| File | Violations | Should Use Instead |
|------|-----------|-------------------|
| `agent.ts` | Agent identity/profile | Identity Service |
| `agent.ts` | Agent statistics | Stats aggregation endpoint |
| `agent.ts` | Match operations | Matching Service |
| `agent.ts` | Conversations | Messaging Service |
| `agent.ts` | Messages CRUD | Messaging Service |

---

## 🚀 Next Steps (Migration Plan)

### Phase 1: Backend API Endpoints (Priority)
Create missing endpoints in backend services:

#### Identity Service
- [ ] `POST /api/identity/profile` - Update profile
- [ ] `GET /api/identity/profile/:userId` - Get profile  
- [ ] `PUT /api/identity/settings` - Update settings

#### Requests Service  
- [ ] `GET /api/requests/user/:userId` - List user requests
- [ ] `POST /api/requests` - Create request
- [ ] `PUT /api/requests/:id` - Update request
- [ ] `DELETE /api/requests/:id` - Cancel request

#### Messaging Service
- [ ] `GET /api/messaging/conversations` - List conversations
- [ ] `GET /api/messaging/conversations/:id/messages` - Get messages
- [ ] `POST /api/messaging/messages` - Send message
- [ ] `PUT /api/messaging/conversations/:id/read` - Mark read

#### Booking-Payments Service
- [ ] `GET /api/bookings/user/:userId` - List bookings
- [ ] `GET /api/bookings/:id` - Get booking details

#### Matching Service
- [ ] `GET /api/matching/agent/:agentId/matches` - Get agent matches
- [ ] `POST /api/matching/matches/:id/accept` - Accept match
- [ ] `POST /api/matching/matches/:id/decline` - Decline match

### Phase 2: Frontend Migration
- [ ] Create API client wrappers for backend endpoints
- [ ] Replace Supabase calls in `api.ts` with backend API calls
- [ ] Replace Supabase calls in `messages.ts` with Messaging Service
- [ ] Replace Supabase calls in `agent.ts` with appropriate services
- [ ] Update tests to mock backend instead of Supabase

### Phase 3: Cleanup
- [ ] Remove unnecessary RLS policies
- [ ] Restrict Supabase anon key permissions
- [ ] Run security audit
- [ ] Update documentation

---

## 📖 Reference Documents

- [docs/FRONTEND-DATA-ACCESS-POLICY.md](./docs/FRONTEND-DATA-ACCESS-POLICY.md) - Complete policy & migration plan
- [ARCHITECTURE_RULES.md](./ARCHITECTURE_RULES.md) - Quick reference for developers
- [SERVICE_ENDPOINTS.md](./SERVICE_ENDPOINTS.md) - Backend API documentation
- [docs/EVENT-FLOWS.md](./docs/EVENT-FLOWS.md) - Event-driven architecture
- [docs/SECURITY-VERIFICATION.md](./docs/SECURITY-VERIFICATION.md) - Security patterns

---

## 🔍 Code Review Checklist

Before merging any frontend PR:

- [ ] No new `supabase.from()` calls (except auth or public reference data)
- [ ] All CRUD operations use backend API endpoints
- [ ] Complex queries are handled in backend services
- [ ] State-changing operations emit events through event bus
- [ ] Operations are logged through audit service
- [ ] API calls include proper authentication headers
- [ ] Error handling follows standard patterns

---

## 💡 Quick Examples

### Authentication (ALLOWED)
```typescript
const supabase = getSupabaseClient();
await supabase.auth.signInWithPassword({ email, password });
```

### Public Data (ALLOWED)
```typescript
const { data } = await supabase
  .from('destinations')
  .select('*');
```

### User Profile (USE BACKEND)
```typescript
const response = await fetch(`${API_BASE_URL}/identity/profile`, {
  method: 'PUT',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ firstName: 'John' }),
});
```

### Travel Requests (USE BACKEND)
```typescript
const response = await fetch(
  `${API_BASE_URL}/requests/user/${userId}`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);
```

---

**When in doubt, use the backend service.**
