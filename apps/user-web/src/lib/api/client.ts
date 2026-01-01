/**
 * API Client - Gateway Communication
 * 
 * All backend requests go through the API gateway.
 * Frontend NEVER calls microservices directly.
 * 
 * Architecture:
 * Frontend → API Gateway → Microservices → Database
 * 
 * Gateway routes:
 *   /api/identity/*      → Identity Service
 *   /api/requests/*      → Requests Service
 *   /api/itineraries/*   → Itineraries Service
 *   /api/matching/*      → Matching Service
 *   /api/bookings/*      → Booking-Payments Service
 *   /api/messaging/*     → Messaging Service
 *   /api/notifications/* → Notifications Service
 *   /api/disputes/*      → Disputes Service
 *   /api/reviews/*       → Reviews Service
 */

const rawApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
// Normalize: remove trailing slash and /api suffix if present
const API_BASE_URL = rawApiBaseUrl
  .replace(/\/+$/, '') // Remove trailing slashes
  .replace(/\/api$/, ''); // Remove /api suffix if someone added it
const API_TIMEOUT = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS) || 30000;

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
 */
async function getAuthHeader(): Promise<Record<string, string>> {
  // Import here to avoid circular dependency
  const { getSupabaseClient } = await import('@/lib/supabase/client');
  const supabase = getSupabaseClient();
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.access_token) {
    return { 'Authorization': `Bearer ${session.access_token}` };
  }
  
  return {};
}

/**
 * Make an API request through the gateway
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const authHeader = await getAuthHeader();
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
  
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
  }
}

// ============================================================================
// Identity Service API (via Gateway)
// ============================================================================

export const identityApi = {
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
   */
  listUserRequests: (userId: string) =>
    apiRequest(`/api/requests/user/${userId}`),
  
  /**
   * Get specific request
   */
  getRequest: (requestId: string) =>
    apiRequest(`/api/requests/${requestId}`),
  
  /**
   * Create new travel request
   */
  createRequest: (data: any) =>
    apiRequest('/api/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  /**
   * Update travel request
   */
  updateRequest: (requestId: string, data: any) =>
    apiRequest(`/api/requests/${requestId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  /**
   * Cancel travel request
   */
  cancelRequest: (requestId: string) =>
    apiRequest(`/api/requests/${requestId}`, {
      method: 'DELETE',
    }),
};

// ============================================================================
// Bookings Service API (via Gateway)
// ============================================================================

export const bookingsApi = {
  /**
   * List user's bookings
   */
  listUserBookings: (userId: string) =>
    apiRequest(`/api/bookings/user/${userId}`),
  
  /**
   * Get specific booking
   */
  getBooking: (bookingId: string) =>
    apiRequest(`/api/bookings/${bookingId}`),
  
  /**
   * Confirm booking
   */
  confirmBooking: (bookingId: string, data: any) =>
    apiRequest(`/api/bookings/${bookingId}/confirm`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  /**
   * Cancel booking
   */
  cancelBooking: (bookingId: string, reason?: string) =>
    apiRequest(`/api/bookings/${bookingId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};

// ============================================================================
// Messaging Service API (via Gateway)
// ============================================================================

export const messagingApi = {
  /**
   * List user's conversations
   */
  listConversations: (userId: string) =>
    apiRequest(`/api/messaging/conversations/user/${userId}`),
  
  /**
   * Get conversation messages
   */
  getMessages: (conversationId: string) =>
    apiRequest(`/api/messaging/conversations/${conversationId}/messages`),
  
  /**
   * Send message
   */
  sendMessage: (conversationId: string, content: string) =>
    apiRequest(`/api/messaging/messages`, {
      method: 'POST',
      body: JSON.stringify({ conversationId, content }),
    }),
  
  /**
   * Mark conversation as read
   */
  markAsRead: (conversationId: string) =>
    apiRequest(`/api/messaging/conversations/${conversationId}/read`, {
      method: 'PUT',
    }),
};

// ============================================================================
// Notifications Service API (via Gateway)
// ============================================================================

export const notificationsApi = {
  /**
   * List user's notifications
   */
  listNotifications: (userId: string, limit = 20) =>
    apiRequest(`/api/notifications/user/${userId}?limit=${limit}`),
  
  /**
   * Mark notification as read
   */
  markAsRead: (notificationId: string) =>
    apiRequest(`/api/notifications/${notificationId}/read`, {
      method: 'PUT',
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
