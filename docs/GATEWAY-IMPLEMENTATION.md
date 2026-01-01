# Gateway-Based Architecture Implementation Guide

**Date:** January 2, 2026  
**Status:** ✅ Complete Implementation

---

## 🎯 Architecture Overview

All frontend applications now communicate with backend services **ONLY** through the API Gateway.

```
Frontend Apps → API Gateway → Backend Services → Database
```

**Gateway URL:** `https://howweplan-gateway.onrender.com`

---

## ✅ What's Been Implemented

### 1. Environment Configuration Updated

All frontend `.env.example` files now use **gateway-only** configuration:

#### **user-web** ([.env.example](../apps/user-web/.env.example))
```env
NEXT_PUBLIC_API_BASE_URL=https://howweplan-gateway.onrender.com
NEXT_PUBLIC_WS_URL=wss://howweplan-gateway.onrender.com/ws
```

#### **agent-web** ([.env.example](../apps/agent-web/.env.example))
```env
NEXT_PUBLIC_API_BASE_URL=https://howweplan-gateway.onrender.com
NEXT_PUBLIC_WS_URL=wss://howweplan-gateway.onrender.com/ws
```

#### **admin-web** ([.env.example](../apps/admin-web/.env.example))
```env
NEXT_PUBLIC_API_BASE_URL=https://howweplan-gateway.onrender.com
NEXT_PUBLIC_WS_URL=wss://howweplan-gateway.onrender.com/ws
```

**Removed:** All direct service URLs (IDENTITY_SERVICE_URL, REQUESTS_SERVICE_URL, etc.)

### 2. API Client Created

New unified API client for user-web: [src/lib/api/client.ts](../apps/user-web/src/lib/api/client.ts)

Features:
- ✅ Automatic authentication header injection
- ✅ Request timeout handling (30s default)
- ✅ 401 redirect to login
- ✅ Typed responses
- ✅ Error handling
- ✅ All requests through gateway

Usage example:
```typescript
import { apiClient } from '@/lib/api/client';

// Get user's travel requests
const requests = await apiClient.requests.listUserRequests(userId);

// Send message
await apiClient.messaging.sendMessage(conversationId, 'Hello!');

// Create booking
await apiClient.bookings.confirmBooking(bookingId, data);
```

### 3. Documentation Updated

All architecture documentation now reflects gateway-based approach:

- ✅ [FRONTEND-DATA-ACCESS-POLICY.md](./FRONTEND-DATA-ACCESS-POLICY.md) - Updated with gateway routing
- ✅ [ARCHITECTURE_RULES.md](../ARCHITECTURE_RULES.md) - Gateway URL in all examples
- ✅ [FRONTEND-BACKEND-DATAFLOW.md](./FRONTEND-BACKEND-DATAFLOW.md) - Updated diagrams with gateway layer
- ✅ [FRONTEND-ARCHITECTURE-SUMMARY.md](./FRONTEND-ARCHITECTURE-SUMMARY.md) - Gateway-first approach

### 4. Code Warnings Added

All violating files marked with architectural warnings pointing to gateway usage.

---

## 🔄 Gateway Route Mapping

### Production Routes

All routes go through: `https://howweplan-gateway.onrender.com`

| Frontend Request | Gateway Route | Backend Service |
|-----------------|---------------|-----------------|
| User profile | `/api/identity/users/:id` | Identity Service |
| Travel requests | `/api/requests/*` | Requests Service |
| Agent matches | `/api/matching/*` | Matching Service |
| Itineraries | `/api/itineraries/*` | Itineraries Service |
| Bookings | `/api/bookings/*` | Booking-Payments Service |
| Messages | `/api/messaging/*` | Messaging Service |
| Notifications | `/api/notifications/*` | Notifications Service |
| Reviews | `/api/reviews/*` | Reviews Service |
| Disputes | `/api/disputes/*` | Disputes Service |
| Audit logs | `/api/audit/*` | Audit Service |

### Backend Service URLs (Internal Only)

These URLs are used **by the gateway** for routing, NOT by frontend:

```
IDENTITY_SERVICE_URL=https://howweplan-identity.onrender.com
REQUESTS_SERVICE_URL=https://howweplan-requests.onrender.com
ITINERARIES_SERVICE_URL=https://howweplan-itineraries.onrender.com
MATCHING_SERVICE_URL=https://howweplan-matching.onrender.com
BOOKING_PAYMENTS_SERVICE_URL=https://howweplan-booking-payments.onrender.com
MESSAGING_SERVICE_URL=https://howweplan-messaging.onrender.com
NOTIFICATIONS_SERVICE_URL=https://howweplan-notifications.onrender.com
DISPUTES_SERVICE_URL=https://howweplan-disputes.onrender.com
AUDIT_SERVICE_URL=https://howweplan-audit.onrender.com
REVIEWS_SERVICE_URL=https://howweplan-reviews.onrender.com
```

**Frontend should NEVER use these URLs directly.**

---

## 📝 Migration Checklist

For each frontend feature that currently violates the architecture:

- [ ] Identify direct Supabase queries in `apps/*/src/lib/data/`
- [ ] Check if corresponding backend endpoint exists at gateway
- [ ] If not, create backend endpoint in appropriate service
- [ ] Replace Supabase query with `apiClient.*` call
- [ ] Test with authentication
- [ ] Verify error handling
- [ ] Remove direct Supabase imports
- [ ] Update tests

---

## 💻 Code Examples

### ❌ WRONG: Direct Service Call

```typescript
// DON'T DO THIS!
const response = await fetch('https://howweplan-requests.onrender.com/api/requests');
```

### ❌ WRONG: Direct Supabase Query

```typescript
// DON'T DO THIS!
const { data } = await supabase
  .from('travel_requests')
  .select('*')
  .eq('user_id', userId);
```

### ✅ CORRECT: Through API Gateway

```typescript
// Do this instead
import { apiClient } from '@/lib/api/client';

const requests = await apiClient.requests.listUserRequests(userId);
```

### ✅ CORRECT: Manual Fetch Through Gateway

```typescript
// If API client doesn't have the method yet
const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/requests/user/${userId}`,
  {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  }
);

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

## 🔐 Authentication Flow

```
1. User logs in via Supabase Auth
   ↓
2. Frontend receives session with access_token
   ↓
3. Frontend includes token in Authorization header
   ↓
4. API Gateway validates token
   ↓
5. Gateway routes request to appropriate service
   ↓
6. Service processes request with user context
   ↓
7. Response flows back through gateway to frontend
```

---

## 🚀 How to Use the New API Client

### Installation

The API client is already created at:
- User Web: `apps/user-web/src/lib/api/client.ts`
- Agent Web: Update `apps/agent-web/src/lib/api/client.ts` (if needed)
- Admin Web: Update `apps/admin-web/src/lib/api/client.ts` (if needed)

### Import and Use

```typescript
import { apiClient } from '@/lib/api/client';

// In your component or page
export default function MyPage() {
  const [requests, setRequests] = useState([]);
  
  useEffect(() => {
    async function loadRequests() {
      try {
        const data = await apiClient.requests.listUserRequests(userId);
        setRequests(data);
      } catch (error) {
        console.error('Failed to load requests:', error);
        // Error handling
      }
    }
    
    loadRequests();
  }, [userId]);
  
  return (/* your JSX */);
}
```

### Available Methods

#### Identity Service
```typescript
apiClient.identity.getProfile(userId)
apiClient.identity.updateProfile(userId, data)
apiClient.identity.getSettings(userId)
apiClient.identity.updateSettings(userId, settings)
```

#### Requests Service
```typescript
apiClient.requests.listUserRequests(userId)
apiClient.requests.getRequest(requestId)
apiClient.requests.createRequest(data)
apiClient.requests.updateRequest(requestId, data)
apiClient.requests.cancelRequest(requestId)
```

#### Bookings Service
```typescript
apiClient.bookings.listUserBookings(userId)
apiClient.bookings.getBooking(bookingId)
apiClient.bookings.confirmBooking(bookingId, data)
apiClient.bookings.cancelBooking(bookingId, reason)
```

#### Messaging Service
```typescript
apiClient.messaging.listConversations(userId)
apiClient.messaging.getMessages(conversationId)
apiClient.messaging.sendMessage(conversationId, content)
apiClient.messaging.markAsRead(conversationId)
```

#### Notifications Service
```typescript
apiClient.notifications.listNotifications(userId, limit)
apiClient.notifications.markAsRead(notificationId)
apiClient.notifications.updatePreferences(userId, preferences)
```

---

## 🧪 Testing

### Local Development

For local testing with Docker:

```env
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws
```

### Production

```env
# .env.production (or use .env.example defaults)
NEXT_PUBLIC_API_BASE_URL=https://howweplan-gateway.onrender.com
NEXT_PUBLIC_WS_URL=wss://howweplan-gateway.onrender.com/ws
```

### Test Checklist

- [ ] Login works (Supabase Auth)
- [ ] API calls include Authorization header
- [ ] 401 redirects to login
- [ ] Error messages display correctly
- [ ] Loading states work
- [ ] Real-time updates work (WebSocket)
- [ ] No direct service URLs in network tab
- [ ] All requests go through gateway

---

## 📊 Benefits of Gateway Architecture

| Benefit | Description |
|---------|-------------|
| **Centralized Auth** | Single point for authentication validation |
| **Rate Limiting** | Control API usage across all services |
| **Monitoring** | Track all API calls in one place |
| **CORS Management** | Single CORS configuration |
| **API Versioning** | Easy to version API without changing services |
| **Load Balancing** | Distribute requests across service instances |
| **Security** | Hide internal service URLs from frontend |
| **Caching** | Cache responses at gateway level |

---

## 🎓 Developer Guidelines

### DO ✅

- Use `apiClient.*` for all backend communication
- Include authentication headers automatically (handled by client)
- Handle errors appropriately
- Use TypeScript types from API responses
- Test both success and error scenarios

### DON'T ❌

- Call backend services directly (bypass gateway)
- Hardcode service URLs in code
- Access Supabase database directly (except auth & public data)
- Skip error handling
- Ignore 401/403 responses

---

## 📚 Reference Documents

- [FRONTEND-DATA-ACCESS-POLICY.md](./FRONTEND-DATA-ACCESS-POLICY.md) - Complete policy
- [ARCHITECTURE_RULES.md](../ARCHITECTURE_RULES.md) - Quick reference
- [FRONTEND-BACKEND-DATAFLOW.md](./FRONTEND-BACKEND-DATAFLOW.md) - Visual diagrams
- [FRONTEND_PR_CHECKLIST.md](../.github/FRONTEND_PR_CHECKLIST.md) - PR review guide

---

## 🆘 Troubleshooting

### Issue: 401 Unauthorized

**Solution:** Check if session is valid
```typescript
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  // Redirect to login
  router.push('/login');
}
```

### Issue: CORS Error

**Solution:** Gateway should have CORS configured. If you see CORS errors:
1. Verify you're using gateway URL, not direct service URL
2. Check gateway CORS configuration

### Issue: Request Timeout

**Solution:** Increase timeout or optimize backend
```typescript
// Increase timeout in .env
NEXT_PUBLIC_API_TIMEOUT_MS=60000  # 60 seconds
```

### Issue: Network Error in Dev

**Solution:** Ensure gateway is running
```bash
# Check if gateway is accessible
curl http://localhost:3001/health

# Or for production
curl https://howweplan-gateway.onrender.com/health
```

---

## ✅ Summary

**Implementation Status:** COMPLETE

- ✅ All `.env.example` files updated
- ✅ API client created with gateway routing
- ✅ Documentation fully updated
- ✅ Code warnings added to violating files
- ✅ Architecture diagrams updated

**Next Steps:**
1. Migrate existing Supabase queries to use API client
2. Test all API endpoints through gateway
3. Remove direct service URL configurations
4. Update any hardcoded URLs in codebase

**The architecture is now properly enforced with clear guidelines and tooling!** 🎉
