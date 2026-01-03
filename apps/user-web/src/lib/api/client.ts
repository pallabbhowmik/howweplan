/**
 * API Client - Gateway Communication
 * 
 * All backend requests go through the API gateway.
 * Frontend NEVER calls microservices or database directly.
 * 
 * Architecture:
 * Frontend → API Gateway → Microservices → Database
 * 
 * Gateway routes:
 *   /api/identity/*      → Identity Service
 *   /api/requests/*      → Requests Service
 *   /api/itineraries/*   → Itineraries Service
 *   /api/matching/*      → Matching Service
 *   /api/booking-payments/* → Booking-Payments Service
 *   /api/messaging/*     → Messaging Service
 *   /api/notifications/* → Notifications Service
 *   /api/disputes/*      → Disputes Service
 *   /api/reviews/*       → Reviews Service
 * 
 * Supabase is ONLY used for authentication (supabase.auth.*).
 * All data operations MUST go through the Gateway API.
 */

const rawApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
// Normalize: remove trailing slash and /api suffix if present
const API_BASE_URL = rawApiBaseUrl
  .replace(/\/+$/, '') // Remove trailing slashes
  .replace(/\/api$/, ''); // Remove /api suffix if someone added it
const API_TIMEOUT = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS) || 30000;

// Request deduplication cache to prevent duplicate requests
const requestCache = new Map<string, Promise<any>>();
const CACHE_DURATION = 1000; // 1 second

// Rate limiting protection
const rateLimitMap = new Map<string, number[]>();
const MAX_REQUESTS_PER_MINUTE = 60;

// ============================================================================
// Types
// ============================================================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get authorization header with current session token
 * Uses the Identity Service token from login/register
 */
async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const { getAccessToken } = await import('@/lib/api/auth');
    const token = getAccessToken();
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {
    // ignore
  }

  return {};
}

/**
 * Check rate limiting
 */
function checkRateLimit(endpoint: string): boolean {
  const now = Date.now();
  const requests = rateLimitMap.get(endpoint) || [];
  
  // Remove requests older than 1 minute
  const recentRequests = requests.filter(time => now - time < 60000);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimitMap.set(endpoint, recentRequests);
  return true;
}

/**
 * Make an API request through the gateway with deduplication and rate limiting
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Rate limiting check
  if (!checkRateLimit(endpoint)) {
    throw new Error('Too many requests. Please slow down.');
  }

  // Request deduplication for GET requests
  const cacheKey = `${endpoint}-${JSON.stringify(options)}`;
  if (options.method === 'GET' || !options.method) {
    const cachedRequest = requestCache.get(cacheKey);
    if (cachedRequest) {
      return cachedRequest;
    }
  }

  const authHeader = await getAuthHeader();
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
  
  const requestPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
          ...options.headers,
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
    
    // Handle 401 - redirect to login
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      }
      throw new Error('Unauthorized');
    }
    
    // Handle other error status codes
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: ApiError = {
        message: errorData.message || errorData.error || 'Request failed',
        status: response.status,
        code: errorData.code,
      };
      throw error;
    }
    
      // Parse response
      const data = await response.json();
      return data;
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    } finally {
      // Clean up cache after a short delay
      setTimeout(() => requestCache.delete(cacheKey), CACHE_DURATION);
    }
  })();

  // Store in cache for GET requests
  if (options.method === 'GET' || !options.method) {
    requestCache.set(cacheKey, requestPromise);
  }

  return requestPromise;
}

// ============================================================================
// Identity Service API (via Gateway)
// ============================================================================

export const identityApi = {
  /**
   * Get the current user's profile
   */
  getMe: () => apiRequest(`/api/identity/users/me`),

  /**
   * Get user profile
   */
  getProfile: (userId: string) => 
    apiRequest(`/api/identity/users/${userId}`),
  
  /**
   * Update user profile
   */
  updateProfile: (userId: string, data: any) =>
    apiRequest(`/api/identity/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  /**
   * Get user settings
   */
  getSettings: (userId: string) =>
    apiRequest(`/api/identity/users/${userId}/settings`),
  
  /**
   * Update user settings
   */
  updateSettings: (userId: string, settings: any) =>
    apiRequest(`/api/identity/users/${userId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
};

// ============================================================================
// Requests Service API (via Gateway)
// ============================================================================

export const requestsApi = {
  /**
   * List user's travel requests
   * Note: The gateway identifies the user from the JWT token
   */
  listUserRequests: (_userId?: string) =>
    apiRequest(`/api/requests/api/v1/requests`),
  
  /**
   * Get specific request
   */
  getRequest: (requestId: string) =>
    apiRequest(`/api/requests/api/v1/requests/${requestId}`),
  
  /**
   * Create new travel request
   */
  createRequest: (data: any) =>
    apiRequest('/api/requests/api/v1/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  /**
   * Update travel request
   */
  updateRequest: (requestId: string, data: any) =>
    apiRequest(`/api/requests/api/v1/requests/${requestId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  /**
   * Cancel travel request
   */
  cancelRequest: (requestId: string) =>
    apiRequest(`/api/requests/api/v1/requests/${requestId}/cancel`, {
      method: 'POST',
    }),
};

// ============================================================================
// Messaging Service API (via Gateway)
// ============================================================================

export const messagingApi = {
  /**
   * List conversations for the authenticated user/agent.
   * Server infers the principal from the bearer token.
   */
  listConversations: (_userId?: string) =>
    apiRequest(`/api/messaging/api/v1/conversations`),

  /**
   * List messages for a conversation.
   */
  listMessages: (conversationId: string) =>
    apiRequest(
      `/api/messaging/api/v1/messages?conversationId=${encodeURIComponent(conversationId)}`
    ),

  // Back-compat alias
  getMessages: (conversationId: string) =>
    apiRequest(
      `/api/messaging/api/v1/messages?conversationId=${encodeURIComponent(conversationId)}`
    ),

  /**
   * Send a message.
   */
  sendMessage: (conversationId: string, content: string) =>
    apiRequest(`/api/messaging/api/v1/messages`, {
      method: 'POST',
      body: JSON.stringify({ conversationId, content }),
    }),

  /**
   * Mark all messages read up to the provided messageId.
   */
  markReadUpTo: (conversationId: string, upToMessageId: string) =>
    apiRequest(`/api/messaging/api/v1/messages/read-up-to`, {
      method: 'POST',
      body: JSON.stringify({ conversationId, upToMessageId }),
    }),

  // Back-compat alias
  markAsRead: async (conversationId: string) => {
    const response: any = await apiRequest(
      `/api/messaging/api/v1/messages?conversationId=${encodeURIComponent(conversationId)}`
    );
    const items: any[] = response?.data?.items ?? [];
    const last = items.length > 0 ? items[items.length - 1] : null;
    if (!last?.id) return { data: { markedCount: 0 } };
    return apiRequest(`/api/messaging/api/v1/messages/read-up-to`, {
      method: 'POST',
      body: JSON.stringify({ conversationId, upToMessageId: String(last.id) }),
    });
  },
};

// ============================================================================
// Bookings Service API (via Gateway)
// ============================================================================

export const bookingsApi = {
  /**
   * List user's bookings
   */
  listUserBookings: (_userId?: string) =>
    apiRequest(`/api/booking-payments/api/v1/bookings`),
  
  /**
   * Get specific booking
   */
  getBooking: (bookingId: string) =>
    apiRequest(`/api/booking-payments/api/v1/bookings/${bookingId}`),
  
  /**
   * Confirm booking
   */
  confirmBooking: (bookingId: string, data: any) =>
    apiRequest(`/api/booking-payments/api/v1/bookings/${bookingId}/confirm`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  /**
   * Cancel booking
   */
  cancelBooking: (bookingId: string, reason?: string) =>
    apiRequest(`/api/booking-payments/api/v1/bookings/${bookingId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};

// ============================================================================
// Notifications Service API (via Gateway)
// ============================================================================

export const notificationsApi = {
  /**
   * List user's notifications
   */
  listNotifications: (_userId?: string, limit = 20) =>
    apiRequest(`/api/notifications/api/v1/notifications?limit=${limit}`),
  
  /**
   * Mark notification as read
   */
  markAsRead: (notificationId: string) =>
    apiRequest(`/api/notifications/api/v1/notifications/${notificationId}/read`, {
      method: 'POST',
    }),
  
  /**
   * Update notification preferences
   */
  updatePreferences: (userId: string, preferences: any) =>
    apiRequest(`/api/notifications/preferences`, {
      method: 'PUT',
      body: JSON.stringify(preferences),
    }),
};

// ============================================================================
// Itineraries Service API (via Gateway)
// ============================================================================

export const itinerariesApi = {
  /**
   * Get itinerary details
   */
  getItinerary: (itineraryId: string) =>
    apiRequest(`/api/itineraries/${itineraryId}`),
  
  /**
   * List itineraries for request
   */
  listForRequest: (requestId: string) =>
    apiRequest(`/api/itineraries/request/${requestId}`),
};

// ============================================================================
// Reviews Service API (via Gateway)
// ============================================================================

export const reviewsApi = {
  /**
   * Get public reviews for agent
   */
  getAgentReviews: (agentId: string, page = 1, limit = 20) =>
    apiRequest(`/api/reviews/public/agent/${agentId}?page=${page}&limit=${limit}`),
  
  /**
   * Submit review for booking
   */
  submitReview: (bookingId: string, review: any) =>
    apiRequest('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ ...review, bookingId }),
    }),
};

// ============================================================================
// Disputes Service API (via Gateway)
// ============================================================================

export const disputesApi = {
  /**
   * Create dispute
   */
  createDispute: (data: any) =>
    apiRequest('/api/disputes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  /**
   * Get dispute details
   */
  getDispute: (disputeId: string) =>
    apiRequest(`/api/disputes/${disputeId}`),
  
  /**
   * List user's disputes
   */
  listUserDisputes: (userId: string) =>
    apiRequest(`/api/disputes/user/${userId}`),
};

// ============================================================================
// Export unified API client
// ============================================================================

export const apiClient = {
  identity: identityApi,
  requests: requestsApi,
  bookings: bookingsApi,
  messaging: messagingApi,
  notifications: notificationsApi,
  itineraries: itinerariesApi,
  reviews: reviewsApi,
  disputes: disputesApi,
};

export default apiClient;
