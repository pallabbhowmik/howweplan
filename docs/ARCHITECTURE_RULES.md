# 🚨 ARCHITECTURE ENFORCEMENT: Frontend Data Access

**READ THIS BEFORE WRITING ANY FRONTEND CODE**

---

## The Rule

**Frontend → Supabase ONLY for:**
1. ✅ Authentication (Supabase Auth)
2. ✅ Session management
3. ✅ Public read-only reference data (destinations, countries)

**Everything else → Backend Services**

---

## Quick Decision Guide

```
┌─────────────────────────────────────────────┐
│  Need to access data from frontend?         │
└─────────────────┬───────────────────────────┘
                  │
       ┌──────────┴──────────┐
       │                     │
   Is it AUTH?          Is it PUBLIC
   (login/logout/       REFERENCE DATA?
    session)            (destinations,
       │                countries)
       │                     │
      YES                   YES
       │                     │
       ▼                     ▼
   Use Supabase         Use Supabase
   Auth API             (read-only)
       │                     │
       └──────────┬──────────┘
                  │
                  ▼
              All good! ✅
                  
                  
       ┌──────────┴──────────┐
       │                     │
   User data?          Business data?
   Profile?            Requests?
   Settings?           Bookings?
       │               Messages?
       │                     │
      YES                   YES
       │                     │
       ▼                     ▼
   Use Backend          Use Backend
   Services API         Services API
   (Identity)           (Domain Services)
       │                     │
       └──────────┬──────────┘
                  │
                  ▼
              All good! ✅
```

---

## Code Examples

### ✅ CORRECT - Authentication
```typescript
import { getSupabaseClient } from '@/lib/supabase/client';

const supabase = getSupabaseClient();
await supabase.auth.signInWithPassword({ email, password });
```

### ✅ CORRECT - Public Reference Data
```typescript
import { getSupabaseClient } from '@/lib/supabase/client';

const supabase = getSupabaseClient();
const { data } = await supabase
  .from('destinations')  // Public, static, read-only
  .select('*')
  .eq('is_active', true);
```

### ❌ WRONG - User Profile
```typescript
// DON'T DO THIS!
const { data } = await supabase
  .from('users')
  .update({ first_name: 'John' })
  .eq('id', userId);
```

### ✅ CORRECT - User Profile
```typescript
// Do this instead
const response = await fetch(`${API_BASE_URL}/identity/profile`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ firstName: 'John' }),
});
```

### ❌ WRONG - Travel Requests
```typescript
// DON'T DO THIS!
const { data } = await supabase
  .from('travel_requests')
  .select('*')
  .eq('user_id', userId);
```

### ✅ CORRECT - Travel Requests
```typescript
// Do this instead
const response = await fetch(
  `${API_BASE_URL}/api/requests/user/${userId}`,
  {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  }
);
const requests = await response.json();

// Where API_BASE_URL = https://howweplan-gateway.onrender.com
```

---

## Why This Rule?

1. **Security** - Backend enforces authorization, not just RLS
2. **Business Logic** - Domain logic belongs in services
3. **Events** - State changes emit events through event bus
4. **Audit** - All operations logged through audit service
5. **Testing** - Backend logic is easier to test
6. **Performance** - Single backend call vs multiple DB queries

---

## Current Status

⚠️ **LEGACY CODE EXISTS** - Some files violate this policy.  
They are marked with warning comments:

```
apps/user-web/src/lib/data/
  ❌ api.ts          - Profile, requests, bookings (NEEDS MIGRATION)
  ❌ messages.ts     - Messages CRUD (NEEDS MIGRATION)

apps/agent-web/src/lib/data/
  ❌ agent.ts        - Agent data, matches (NEEDS MIGRATION)
```

**DO NOT COPY THESE PATTERNS!**  
These are technical debt that will be migrated.

---

## Backend Service Endpoints

**API Gateway:** `https://howweplan-gateway.onrender.com`  
**All frontend requests must go through the gateway.**

```
Identity Service:        /api/identity/*
Requests Service:        /api/requests/*
Matching Service:        /api/matching/*
Itineraries Service:     /api/itineraries/*
Booking-Payments:        /api/bookings/*
Messaging Service:       /api/messaging/*
Notifications Service:   /api/notifications/*
Reviews Service:         /api/reviews/*
Disputes Service:        /api/disputes/*
Audit Service:           /api/audit/*
```

**Example:** To get user requests:  
`GET https://howweplan-gateway.onrender.com/api/requests/user/{userId}`

See [SERVICE_ENDPOINTS.md](./SERVICE_ENDPOINTS.md) for complete API documentation.

---

## Need Help?

1. Read [docs/FRONTEND-DATA-ACCESS-POLICY.md](./docs/FRONTEND-DATA-ACCESS-POLICY.md)
2. Check [SERVICE_ENDPOINTS.md](./SERVICE_ENDPOINTS.md)
3. Look for examples in the codebase (marked ✅ CORRECT)
4. Ask the team

---

## Before You Merge

- [ ] No new `supabase.from()` calls (except auth or public data)
- [ ] All CRUD goes through backend API
- [ ] Complex queries done in backend services
- [ ] State changes emit events
- [ ] Operations logged through audit

---

**When in doubt: Use the backend service.**
