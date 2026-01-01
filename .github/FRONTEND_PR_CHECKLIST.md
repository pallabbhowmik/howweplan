# Frontend PR Checklist - Data Access Compliance

Use this checklist when reviewing or submitting frontend PRs.

---

## 🔍 Code Review - Data Access Patterns

### Supabase Client Usage

- [ ] **No new direct database queries**  
  No `supabase.from('table_name')` calls except for:
  - Authentication (`supabase.auth.*`)
  - Public reference data (destinations, countries - read-only)

- [ ] **Authentication uses Supabase Auth API correctly**  
  - `supabase.auth.signInWithPassword()`
  - `supabase.auth.getSession()`
  - `supabase.auth.signOut()`
  - `supabase.auth.onAuthStateChange()`

- [ ] **No RLS bypass attempts**  
  No service role key usage in frontend  
  No attempts to bypass Row-Level Security

### Backend Service Integration

- [ ] **CRUD operations use backend APIs**  
  All create/read/update/delete operations go through appropriate services:
  - User profile → Identity Service
  - Travel requests → Requests Service
  - Bookings → Booking-Payments Service
  - Messages → Messaging Service
  - Notifications → Notifications Service

- [ ] **API calls include authentication**  
  All backend API calls include:
  ```typescript
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
  ```

- [ ] **Proper error handling**  
  - Network errors handled
  - 401/403 handled (redirect to login)
  - 400/422 validation errors shown to user
  - 500 errors logged and user-friendly message shown

### Data Flow

- [ ] **No business logic in frontend data layer**  
  Complex calculations, validations, and transformations are done in backend

- [ ] **No multi-table joins in frontend**  
  Complex queries with joins are handled by backend services

- [ ] **No direct event emission from frontend**  
  State changes emit events through backend services, not directly

---

## 📝 Files to Check

### If PR touches these directories:
- `apps/*/src/lib/data/`
- `apps/*/src/lib/supabase/`
- `apps/*/src/lib/api/`

### Review for:
1. New `getSupabaseClient()` usage
2. New `supabase.from()` calls
3. Direct database writes
4. Complex queries
5. Business logic

---

## ✅ Approved Patterns

### Pattern 1: Authentication
```typescript
// ✅ APPROVED
const supabase = getSupabaseClient();
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
```

### Pattern 2: Public Reference Data (Read-Only)
```typescript
// ✅ APPROVED
const supabase = getSupabaseClient();
const { data: destinations } = await supabase
  .from('destinations')  // Public, static table
  .select('id, name, country, image_url')
  .eq('is_active', true);
```

### Pattern 3: Backend API Call
```typescript
// ✅ APPROVED
const response = await fetch(`${API_BASE_URL}/requests/user/${userId}`, {
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
  },
});

if (!response.ok) {
  if (response.status === 401) {
    // Redirect to login
    router.push('/login');
    return;
  }
  throw new Error('Failed to fetch requests');
}

const requests = await response.json();
```

---

## ❌ Rejected Patterns

### Anti-Pattern 1: Direct Database Query
```typescript
// ❌ REJECTED - Use backend API instead
const { data } = await supabase
  .from('travel_requests')
  .select('*')
  .eq('user_id', userId);

// ✅ CORRECT
const response = await fetch(`${API_BASE_URL}/requests/user/${userId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Anti-Pattern 2: Direct Database Write
```typescript
// ❌ REJECTED - Use backend API instead
const { error } = await supabase
  .from('users')
  .update({ first_name: 'John' })
  .eq('id', userId);

// ✅ CORRECT
await fetch(`${API_BASE_URL}/identity/profile`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ firstName: 'John' }),
});
```

### Anti-Pattern 3: Complex Join in Frontend
```typescript
// ❌ REJECTED - Complex queries in backend
const { data } = await supabase
  .from('bookings')
  .select(`
    *,
    travel_requests (*),
    agents (
      *,
      users (*)
    )
  `)
  .eq('user_id', userId);

// ✅ CORRECT
const response = await fetch(`${API_BASE_URL}/bookings/user/${userId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
// Backend handles joins and returns formatted data
```

---

## 🚨 Red Flags

If you see any of these in a frontend PR, **request changes**:

- [ ] `supabase.from('users')`
- [ ] `supabase.from('travel_requests')`
- [ ] `supabase.from('bookings')`
- [ ] `supabase.from('messages')`
- [ ] `supabase.from('conversations')`
- [ ] `supabase.from('agent_matches')`
- [ ] `supabase.from('notifications')`
- [ ] `.insert()`, `.update()`, `.delete()` on any table
- [ ] Complex `.select()` with nested relations
- [ ] Business logic calculations in data layer
- [ ] Multi-table aggregations

---

## 📚 Reference Documents

Before approving, ensure reviewer has read:
- [ARCHITECTURE_RULES.md](../ARCHITECTURE_RULES.md)
- [docs/FRONTEND-DATA-ACCESS-POLICY.md](./FRONTEND-DATA-ACCESS-POLICY.md)
- [docs/FRONTEND-BACKEND-DATAFLOW.md](./FRONTEND-BACKEND-DATAFLOW.md)

---

## 💬 Comments for PR Author

### If violations found:

```
⚠️ Data Access Policy Violation

This PR contains direct Supabase database queries that should go through backend services.

**Files affected:**
- `apps/user-web/src/lib/data/xyz.ts`

**Violations:**
1. Direct query to `travel_requests` table (line 42)
2. Direct write to `users` table (line 89)

**Required changes:**
- Replace Supabase queries with backend API calls
- Use appropriate service endpoints (see SERVICE_ENDPOINTS.md)

**Reference:**
- [ARCHITECTURE_RULES.md](../ARCHITECTURE_RULES.md)
- [Frontend Data Access Policy](./docs/FRONTEND-DATA-ACCESS-POLICY.md)

Please update and I'll review again. Thanks!
```

### If compliant:

```
✅ Data Access Compliance

This PR follows our frontend data access policy:
- All CRUD operations go through backend services
- Proper authentication headers included
- No direct database access
- Good error handling

Approved!
```

---

## 🎯 Quick Decision Tree

```
Does the code use Supabase?
  │
  ├─ YES → Is it auth-related?
  │         │
  │         ├─ YES → ✅ APPROVE
  │         │
  │         └─ NO → Is it public reference data (read-only)?
  │                   │
  │                   ├─ YES → ✅ APPROVE
  │                   │
  │                   └─ NO → ❌ REQUEST CHANGES
  │                            (Should use backend API)
  │
  └─ NO → Does it call backend APIs?
            │
            ├─ YES → ✅ APPROVE
            │
            └─ NO → Review further
```

---

## ✍️ Reviewer Signature

- [ ] I have reviewed all data access patterns in this PR
- [ ] I have verified compliance with FRONTEND-DATA-ACCESS-POLICY.md
- [ ] I have checked for any RLS bypass attempts
- [ ] I have verified proper error handling
- [ ] I approve this PR for merge

**Reviewer:** _________________  
**Date:** _________________
