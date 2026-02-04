/**
 * Data API - All operations through Gateway
 * ==========================================
 * 
 * This module provides data access functions that route ALL requests
 * through the API Gateway. NO direct database access is allowed.
 * 
 * Architecture:
 * Frontend → API Gateway → Microservices → Database
 * 
 * The only exception is Supabase Auth which is handled in lib/supabase/client.ts
 */

import { authenticatedFetch, getAccessToken } from '@/lib/api/auth';
import { apiConfig } from '@/config';

// Normalize API base URL - remove trailing slashes and /api suffix to avoid duplication
const API_BASE = apiConfig.baseUrl
  .replace(/\/+$/, '')      // Remove trailing slashes
  .replace(/\/api(\/v1)?$/, ''); // Remove /api or /api/v1 suffix if present

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  location: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  tripsTaken?: number;
  preferences?: {
    travelStyle?: string;
    budget?: string;
    interests?: string[];
  };
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  marketingEmails?: boolean;
  twoFactorEnabled?: boolean;
  paymentMethods?: Array<{
    type: string;
    last4: string;
    isDefault: boolean;
  }>;
}

export interface TravelRequest {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  destination: {
    city?: string;
    country?: string;
    label?: string;
  };
  departureLocation: {
    city?: string;
    country?: string;
  } | null;
  departureDate: string;
  returnDate: string;
  travelers: {
    adults?: number;
    children?: number;
    infants?: number;
    total?: number;
  };
  budgetMin: number | null;
  budgetMax: number | null;
  budgetCurrency: string;
  travelStyle: string | null;
  preferences: Record<string, unknown>;
  notes: string | null;
  state: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  agentsResponded?: number;
}

export interface Agent {
  id: string;
  userId: string;
  bio: string | null;
  specializations: string[];
  languages: string[];
  destinations: string[];
  yearsOfExperience: number;
  agencyName: string | null;
  tier: 'star' | 'bench';
  commissionRate: number;
  rating: number;
  totalReviews: number;
  completedBookings: number;
  responseTimeMinutes: number;
  isVerified: boolean;
  isAvailable: boolean;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
}

export interface Booking {
  id: string;
  requestId: string | null;
  itineraryId: string | null;
  userId: string;
  agentId: string;
  state: string;
  status: string;
  paymentState: string;
  basePriceCents: number;
  bookingFeeCents: number;
  platformCommissionCents: number;
  totalAmountCents: number;
  totalAmount: number;
  paidAmount: number;
  currency: string;
  travelStartDate: string;
  travelEndDate: string;
  departureDate?: string;
  returnDate?: string;
  startDate?: string;
  endDate?: string;
  chatRequirementMet: boolean;
  contactsRevealed: boolean;
  contactsRevealedAt?: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
  title?: string;
  destination?: string | { city?: string; label?: string; country?: string };
  travelers?: { adults?: number; children?: number; infants?: number; total?: number };
  confirmationCode?: string;
  notes?: string;
  agent?: {
    id: string;
    fullName: string;
    businessName?: string | null;
    rating?: number;
    avatarUrl?: string | null;
  };
  request?: TravelRequest;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  channel: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface DashboardStats {
  activeRequests: number;
  awaitingSelection: number;
  confirmedBookings: number;
  completedTrips: number;
  unreadMessages: number;
}

export interface UserSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  proposalAlerts: boolean;
  messageAlerts: boolean;
  marketingEmails: boolean;
  weeklyDigest: boolean;
  profileVisible: boolean;
  showTravelHistory: boolean;
  allowAgentContact: boolean;
  currency: string;
  language: string;
  theme: string;
  soundEnabled: boolean;
  twoFactorEnabled: boolean;
}

export interface ActivityItem {
  id: string;
  type: 'agent_response' | 'match' | 'message' | 'booking' | 'notification';
  message: string;
  time: string;
  relatedId?: string;
}

export interface Proposal {
  id: string;
  requestId: string;
  agentId: string;
  travelerId?: string;
  status: string;
  title: string;
  description: string;
  totalPrice: number;
  currency: string;
  validUntil: string;
  // Overview data from backend
  overview?: {
    title: string;
    summary?: string;
    startDate: string;
    endDate: string;
    numberOfDays: number;
    numberOfNights: number;
    destinations: string[];
    travelersCount: number;
    tripType?: string;
  };
  // Pricing data from backend
  pricing?: {
    currency: string;
    totalPrice: number;
    pricePerPerson?: number;
    depositAmount?: number;
    inclusions?: string[];
    exclusions?: string[];
    paymentTerms?: string;
  };
  // Items from backend (day-by-day activities)
  items?: Array<{
    id: string;
    dayNumber: number;
    type: string;
    title: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    priceCents?: number;
    notes?: string;
    confirmed: boolean;
  }>;
  // Simplified day-by-day plans
  dayPlans?: Array<{
    dayNumber: number;
    title: string;
    description?: string;
    activities: string[];
  }>;
  // Legacy itinerary format for backward compatibility
  itinerary: Array<{
    day: number;
    title: string;
    description: string;
    activities?: string[];
  }>;
  inclusions: string[];
  exclusions: string[];
  createdAt: string;
  agent?: {
    id: string;
    userId?: string;  // The agent's user account ID (for messaging)
    fullName: string;
    businessName: string | null;
    rating: number;
    avatarUrl: string | null;
    specializations: string[];
    yearsOfExperience: number;
    // Enhanced profile fields
    tier?: 'standard' | 'verified' | 'star';
    isVerified?: boolean;
    totalReviews?: number;
    responseTimeMinutes?: number;
    completedBookings?: number;
    destinations?: string[];
    highlightedReview?: {
      content: string;
      rating: number;
      travelerName?: string;
    };
  };
}

export interface CreateTravelRequestInput {
  userId: string;
  destination: string;
  departureLocation?: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  infants: number;
  budgetMin: number;
  budgetMax: number;
  budgetRange?: string;
  tripType: string;
  experiences: string[];
  preferences?: string;
  specialRequests?: string;
}

export interface UpdateTravelRequestInput {
  destination?: string;
  startDate?: string;
  endDate?: string;
  travelersCount?: number;
  budgetMin?: number | null;
  budgetMax?: number | null;
  specialRequests?: string;
  preferences?: Record<string, unknown>;
}

// ============================================================================
// Helper Functions
// ============================================================================

// Helper to check if an error is a network/connection error
function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message === 'Failed to fetch') return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (error.name === 'NetworkError') return true;
    return msg.includes('network') || msg.includes('connection') || msg.includes('failed to fetch');
  }
  return false;
}

// Retry configuration for transient errors (common on Render free tier)
const RETRY_CONFIG = {
  maxRetries: 2,
  initialDelay: 1000, // 1 second
  maxDelay: 5000,
};

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function gatewayRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<T> {
  const token = getAccessToken();

  // Always default to JSON content-type unless caller overrides.
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const url = `${API_BASE}${endpoint}`;

  let response: Response;
  try {
    // If we have a token, use authenticatedFetch so expired tokens get refreshed.
    // If we don't have a token, keep current behavior (some endpoints are public).
    response = token
      ? await authenticatedFetch(url, { ...options, headers })
      : await fetch(url, { ...options, headers });
  } catch (error) {
    // Handle network errors with retry for transient failures
    if (isNetworkError(error)) {
      if (retryCount < RETRY_CONFIG.maxRetries) {
        const delay = Math.min(
          RETRY_CONFIG.initialDelay * Math.pow(2, retryCount),
          RETRY_CONFIG.maxDelay
        );
        console.debug(`[API] Network error for ${endpoint}, retrying in ${delay}ms (attempt ${retryCount + 1}/${RETRY_CONFIG.maxRetries})`);
        await sleep(delay);
        return gatewayRequest<T>(endpoint, options, retryCount + 1);
      }
      console.debug(`[API] Network error for ${endpoint} - server may be unavailable after ${RETRY_CONFIG.maxRetries} retries`);
      throw new Error('Unable to connect to server. The service may be starting up - please try again in a moment.');
    }
    throw error;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    // Support multiple backend error shapes.
    const message =
      errorData?.error?.message ||
      errorData?.message ||
      (typeof errorData?.error === 'string' ? errorData.error : undefined) ||
      `Request failed: ${response.status}`;

    // Extract validation error details for better error messages
    const details = errorData?.error?.details;
    if (details?.errors && Array.isArray(details.errors)) {
      const validationMessages = details.errors
        .map((e: { field: string; message: string }) => `${e.field}: ${e.message}`)
        .join('; ');
      console.error(`[API] Validation errors: ${validationMessages}`);
      throw new Error(`${message}. Details: ${validationMessages}`);
    }

    throw new Error(message);
  }

  return response.json();
}

function unwrapList<T = any>(result: any, listKey?: string): T[] {
  const data = result?.data ?? result;

  if (Array.isArray(data)) return data as T[];
  if (listKey && Array.isArray(data?.[listKey])) return data[listKey] as T[];
  if (listKey && Array.isArray(result?.[listKey])) return result[listKey] as T[];

  return [];
}

function mapRequestFromApi(r: any): TravelRequest {
  return {
    id: r.id,
    userId: r.userId || r.user_id,
    title: r.title || `${r.destination} Trip`,
    description: r.notes || r.description,
    destination: typeof r.destination === 'string' 
      ? { city: r.destination, label: r.destination }
      : (r.destination || {}),
    departureLocation: r.departureLocation 
      ? (typeof r.departureLocation === 'string' ? { city: r.departureLocation } : r.departureLocation)
      : null,
    departureDate: r.departureDate || r.departure_date || r.start_date,
    returnDate: r.returnDate || r.return_date || r.end_date,
    travelers: r.travelers || { total: r.travelers_count || 1 },
    budgetMin: r.budgetRange?.minAmount || r.budget_min || null,
    budgetMax: r.budgetRange?.maxAmount || r.budget_max || null,
    budgetCurrency: r.budgetRange?.currency || r.budget_currency || 'INR',
    travelStyle: r.travelStyle || r.travel_style,
    preferences: r.preferences || {},
    notes: r.notes || r.special_requirements,
    state: r.state || r.status,
    expiresAt: r.expiresAt || r.expires_at,
    createdAt: r.createdAt || r.created_at,
    updatedAt: r.updatedAt || r.updated_at,
    agentsResponded: r.agentsResponded || 0,
  };
}

function mapBookingFromApi(b: any): Booking {
  return {
    id: b.id,
    requestId: b.requestId || b.request_id,
    itineraryId: b.itineraryId || b.itinerary_id,
    userId: b.userId || b.user_id,
    agentId: b.agentId || b.agent_id,
    state: b.state || b.status,
    status: b.state || b.status,
    paymentState: b.paymentState || b.payment_state || b.payment_status,
    basePriceCents: b.basePriceCents || b.base_price_cents || 0,
    bookingFeeCents: b.bookingFeeCents || b.booking_fee_cents || 0,
    platformCommissionCents: b.platformCommissionCents || b.platform_commission_cents || 0,
    totalAmountCents: b.totalAmountCents || b.total_amount_cents || 0,
    totalAmount: (b.totalAmountCents || b.total_amount_cents || 0) / 100,
    paidAmount: (b.paidAmountCents || b.paid_amount_cents || 0) / 100,
    currency: b.currency || 'USD',
    travelStartDate: b.travelStartDate || b.travel_start_date,
    travelEndDate: b.travelEndDate || b.travel_end_date,
    departureDate: b.travelStartDate || b.travel_start_date,
    returnDate: b.travelEndDate || b.travel_end_date,
    startDate: b.travelStartDate || b.travel_start_date,
    endDate: b.travelEndDate || b.travel_end_date,
    chatRequirementMet: b.chatRequirementMet || b.chat_requirement_met || false,
    contactsRevealed: b.contactsRevealed || b.contacts_revealed || false,
    contactsRevealedAt: b.contactsRevealedAt || b.contacts_revealed_at,
    confirmedAt: b.confirmedAt || b.confirmed_at,
    completedAt: b.completedAt || b.completed_at,
    cancelledAt: b.cancelledAt || b.cancelled_at,
    cancellationReason: b.cancellationReason || b.cancellation_reason,
    createdAt: b.createdAt || b.created_at,
    updatedAt: b.updatedAt || b.updated_at,
    title: b.title,
    destination: b.destination,
    travelers: b.travelers,
    confirmationCode: b.confirmationCode || b.confirmation_code || `TC-${b.id?.slice(0, 8).toUpperCase()}`,
    notes: b.notes,
    agent: b.agent,
    request: b.request,
  };
}

function mapNotificationFromApi(n: any): Notification {
  return {
    id: n.id,
    userId: n.userId || n.user_id,
    type: n.type,
    title: n.title,
    body: n.body || n.message,
    data: n.data || {},
    channel: n.channel || 'in_app',
    isRead: n.isRead || n.is_read || false,
    readAt: n.readAt || n.read_at,
    createdAt: n.createdAt || n.created_at,
  };
}

// ============================================================================
// User API - via Identity Service
// ============================================================================

export async function fetchUser(userId: string): Promise<User | null> {
  try {
    const result = await gatewayRequest<any>(`/api/identity/users/${userId}`);
    const data = result.data || result;
    
    return {
      id: data.id,
      email: data.email,
      firstName: data.firstName || data.first_name || '',
      lastName: data.lastName || data.last_name || '',
      fullName: data.fullName || data.full_name || `${data.firstName || data.first_name || ''} ${data.lastName || data.last_name || ''}`.trim() || 'User',
      phone: data.phone,
      avatarUrl: data.avatarUrl || data.avatar_url,
      location: data.location,
      role: data.role,
      isActive: data.isActive ?? data.is_active ?? true,
      createdAt: data.createdAt || data.created_at,
      tripsTaken: data.tripsTaken || 0,
      preferences: data.preferences || {},
      emailNotifications: data.emailNotifications ?? data.email_notifications ?? true,
      smsNotifications: data.smsNotifications ?? data.sms_notifications ?? false,
      marketingEmails: data.marketingEmails ?? data.marketing_emails ?? false,
      twoFactorEnabled: data.twoFactorEnabled ?? data.two_factor_enabled ?? false,
      paymentMethods: data.paymentMethods || data.payment_methods || [],
    };
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

export async function updateUser(userId: string, updates: Partial<{
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  location: string;
  avatarUrl: string;
}>): Promise<boolean> {
  try {
    await gatewayRequest(`/api/identity/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return true;
  } catch (error) {
    console.error('Error updating user:', error);
    return false;
  }
}

export async function fetchUserSettings(userId: string): Promise<UserSettings | null> {
  try {
    const result = await gatewayRequest<any>(`/api/identity/users/${userId}/settings`);
    const data = result.data || result;
    
    return {
      emailNotifications: data.emailNotifications ?? true,
      pushNotifications: data.pushNotifications ?? true,
      proposalAlerts: data.proposalAlerts ?? true,
      messageAlerts: data.messageAlerts ?? true,
      marketingEmails: data.marketingEmails ?? false,
      weeklyDigest: data.weeklyDigest ?? true,
      profileVisible: data.profileVisible ?? true,
      showTravelHistory: data.showTravelHistory ?? false,
      allowAgentContact: data.allowAgentContact ?? true,
      currency: data.currency ?? 'INR',
      language: data.language ?? 'en',
      theme: data.theme ?? 'light',
      soundEnabled: data.soundEnabled ?? true,
      twoFactorEnabled: data.twoFactorEnabled ?? false,
    };
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return null;
  }
}

export async function updateUserSettings(userId: string, settings: Partial<UserSettings>): Promise<boolean> {
  try {
    await gatewayRequest(`/api/identity/users/${userId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    return true;
  } catch (error) {
    console.error('Error updating user settings:', error);
    return false;
  }
}

export async function changeUserPassword(
  _userId: string, 
  _currentPassword: string, 
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  // Password changes go through Supabase Auth, not Gateway
  // Import here to avoid circular dependency
  const { getSupabaseClient } = await import('@/lib/supabase/client');
  const supabase = getSupabaseClient();
  
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) {
    console.error('Error changing password:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// Travel Requests API - via Requests Service
// ============================================================================

export async function fetchUserRequests(userId: string): Promise<TravelRequest[]> {
  try {
    const result = await gatewayRequest<any>(`/api/requests/api/v1/requests`);
    const requests = unwrapList<any>(result, 'requests').map(mapRequestFromApi);
    
    // Fetch itinerary counts for all requests to populate agentsResponded
    // This is done in parallel for efficiency
    if (requests.length > 0) {
      await Promise.all(requests.map(async (request) => {
        try {
          // Use the request-specific endpoint for itineraries
          const itinerariesResult = await gatewayRequest<any>(
            `/api/itineraries/api/v1/itineraries/request/${request.id}`
          );
          const itineraries = itinerariesResult?.items || itinerariesResult || [];
          if (Array.isArray(itineraries) && itineraries.length > 0) {
            // Count unique agents who submitted itineraries
            const uniqueAgents = new Set(
              itineraries.map((i: any) => i.agentId || i.agent_id).filter(Boolean)
            );
            request.agentsResponded = uniqueAgents.size;
          }
        } catch (itinError) {
          // Keep default 0 if itinerary fetch fails
          console.debug(`Could not fetch itineraries for request ${request.id}`);
        }
      }));
    }
    
    return requests;
  } catch (error) {
    console.error('Error fetching requests:', error);
    return [];
  }
}

export async function fetchRequest(requestId: string): Promise<TravelRequest | null> {
  try {
    // Fetch request details
    const result = await gatewayRequest<any>(`/api/requests/api/v1/requests/${requestId}`);
    const data = result.data || result;
    const request = mapRequestFromApi(data);
    
    // Fetch itinerary count for this request (to show agents responded)
    try {
      // Use the request-specific endpoint for itineraries
      const itinerariesResult = await gatewayRequest<any>(`/api/itineraries/api/v1/itineraries/request/${requestId}`);
      const itineraries = itinerariesResult?.items || itinerariesResult || [];
      if (Array.isArray(itineraries) && itineraries.length > 0) {
        // Count unique agents who submitted itineraries
        const uniqueAgents = new Set(itineraries.map((i: any) => i.agentId || i.agent_id).filter(Boolean));
        request.agentsResponded = uniqueAgents.size;
      }
    } catch (itinError) {
      console.warn('Could not fetch itineraries count:', itinError);
      // Keep the original agentsResponded value (0 by default)
    }
    
    return request;
  } catch (error) {
    console.error('Error fetching request:', error);
    return null;
  }
}

export async function createTravelRequest(input: CreateTravelRequestInput): Promise<TravelRequest> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Not authenticated. Please log in to create a request.');
  }

  const travelStyleMap: Record<string, string> = {
    'adventure': 'mid-range',
    'relaxation': 'mid-range',
    'cultural': 'mid-range',
    'romantic': 'luxury',
    'family': 'mid-range',
    'budget': 'budget',
    'luxury': 'luxury',
    'mid-range': 'mid-range',
    'ultra-luxury': 'ultra-luxury',
    // Map frontend tripType values to backend travelStyle values
    'leisure': 'mid-range',
    'business': 'mid-range',
    'honeymoon': 'luxury',
    'culinary': 'mid-range',
  };

  const requestBody = {
    destination: input.destination,
    departureLocation: input.departureLocation || 'Not specified',
    departureDate: new Date(input.startDate).toISOString(),
    returnDate: new Date(input.endDate).toISOString(),
    travelers: {
      adults: input.adults,
      children: input.children,
      infants: input.infants,
    },
    travelStyle: travelStyleMap[input.tripType] || 'mid-range',
    budgetRange: {
      minAmount: input.budgetMin,
      maxAmount: input.budgetMax,
      currency: 'INR',
    },
    notes: [input.preferences, input.specialRequests].filter(Boolean).join('\n') || null,
  };

  console.debug('[API] Creating travel request with body:', JSON.stringify(requestBody, null, 2));

  const result = await gatewayRequest<any>('/api/requests/api/v1/requests', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });

  const data = result.data || result;
  return mapRequestFromApi(data);
}

export async function updateTravelRequest(_requestId: string, _input: UpdateTravelRequestInput): Promise<void> {
  throw new Error('Request updates are not currently supported. Please cancel and create a new request.');
}

export async function submitTravelRequest(requestId: string): Promise<TravelRequest> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Not authenticated. Please log in to submit a request.');
  }

  const result = await gatewayRequest<any>(`/api/requests/api/v1/requests/${requestId}/submit`, {
    method: 'POST',
  });

  const data = result.data || result;
  return mapRequestFromApi(data);
}

export async function cancelTravelRequest(requestId: string, reason: string = 'Cancelled by user'): Promise<void> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Not authenticated. Please log in to cancel a request.');
  }

  await gatewayRequest(`/api/requests/api/v1/requests/${requestId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// ============================================================================
// Bookings API - via Booking-Payments Service
// ============================================================================

export async function fetchUserBookings(userId: string): Promise<Booking[]> {
  try {
    const result = await gatewayRequest<any>(`/api/booking-payments/api/v1/bookings`);
    const bookings = unwrapList<any>(result, 'bookings');
    return bookings.map(mapBookingFromApi);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return [];
  }
}

export async function fetchBooking(bookingId: string): Promise<Booking | null> {
  try {
    const result = await gatewayRequest<any>(`/api/booking-payments/api/v1/bookings/${bookingId}`);
    const data = result.data || result;
    return mapBookingFromApi(data);
  } catch (error) {
    console.error('Error fetching booking:', error);
    return null;
  }
}

export async function cancelBooking(bookingId: string, reason: string): Promise<void> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Not authenticated. Please log in to cancel a booking.');
  }

  await gatewayRequest(`/api/booking-payments/api/v1/bookings/${bookingId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function createCheckoutSession(params: {
  bookingId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ checkoutUrl: string; sessionId: string }> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Not authenticated. Please log in to complete payment.');
  }

  const result = await gatewayRequest<any>(`/api/booking-payments/api/v1/checkout`, {
    method: 'POST',
    body: JSON.stringify({
      bookingId: params.bookingId,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
    }),
  });

  return {
    checkoutUrl: result.checkoutUrl || result.checkout_url || result.url,
    sessionId: result.sessionId || result.session_id || result.id,
  };
}

export async function createBookingFromProposal(proposalId: string, requestId: string): Promise<Booking> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Not authenticated. Please log in to create a booking.');
  }

  const result = await gatewayRequest<any>(`/api/booking-payments/api/v1/bookings`, {
    method: 'POST',
    body: JSON.stringify({
      itineraryId: proposalId,
      requestId: requestId,
    }),
  });

  const data = result.data || result;
  return mapBookingFromApi(data);
}

// ============================================================================
// Notifications API - via Notifications Service
// ============================================================================

export async function fetchUserNotifications(userId: string, limit = 10): Promise<Notification[]> {
  try {
    const result = await gatewayRequest<any>(`/api/notifications/api/v1/notifications?limit=${limit}`);
    const notifications = unwrapList<any>(result, 'notifications');
    return notifications.map(mapNotificationFromApi);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    await gatewayRequest(`/api/notifications/api/v1/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

// ============================================================================
// Dashboard Stats API - Aggregated from services
// ============================================================================

// Pre-defined state sets for O(1) lookups (created once, reused)
const ACTIVE_REQUEST_STATES = new Set([
  'SUBMITTED', 'MATCHING', 'PROPOSALS_RECEIVED', 'AGENTS_MATCHED', 
  'DRAFT', 'open', 'matched', 'proposals_received'
]);
const SELECTION_PENDING_STATES = new Set([
  'PROPOSALS_RECEIVED', 'AGENTS_MATCHED', 'proposals_received'
]);
const CONFIRMED_BOOKING_STATES = new Set(['CONFIRMED', 'confirmed']);
const COMPLETED_BOOKING_STATES = new Set(['COMPLETED', 'completed']);

export async function fetchDashboardStats(userId: string): Promise<DashboardStats> {
  // Fetch data from gateway APIs in parallel
  const [requests, bookings, notifications] = await Promise.all([
    fetchUserRequests(userId).catch(() => []),
    fetchUserBookings(userId).catch(() => []),
    fetchUserNotifications(userId, 100).catch(() => []),
  ]);

  // Calculate stats using Set.has() for O(1) lookups instead of Array.includes() O(n)
  let activeRequests = 0;
  let awaitingSelection = 0;
  
  for (const r of requests) {
    if (ACTIVE_REQUEST_STATES.has(r.state)) {
      activeRequests++;
    }
    if (SELECTION_PENDING_STATES.has(r.state)) {
      awaitingSelection++;
    }
  }

  // Calculate stats from bookings - single pass
  let confirmedBookings = 0;
  let completedTrips = 0;
  
  for (const b of bookings) {
    if (CONFIRMED_BOOKING_STATES.has(b.state)) {
      confirmedBookings++;
    }
    if (COMPLETED_BOOKING_STATES.has(b.state)) {
      completedTrips++;
    }
  }

  // Calculate unread from notifications - single pass counter
  let unreadMessages = 0;
  for (const n of notifications) {
    if (!n.isRead) unreadMessages++;
  }

  return {
    activeRequests,
    awaitingSelection,
    confirmedBookings,
    completedTrips,
    unreadMessages,
  };
}

// ============================================================================
// Recent Activity API - Aggregated from services
// ============================================================================

export async function fetchRecentActivity(userId: string, limit = 5): Promise<ActivityItem[]> {
  try {
    const notifications = await fetchUserNotifications(userId, limit);
    
    return notifications.map(n => ({
      id: n.id,
      type: 'notification' as const,
      message: n.title || n.body,
      time: n.createdAt,
    }));
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }
}

// ============================================================================
// Agents API - via Matching Service
// ============================================================================

export async function fetchAgents(filters?: {
  tier?: 'star' | 'bench';
  destinations?: string[];
  specializations?: string[];
}): Promise<Agent[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.tier) params.set('tier', filters.tier);
    if (filters?.destinations?.length) params.set('destinations', filters.destinations.join(','));
    if (filters?.specializations?.length) params.set('specializations', filters.specializations.join(','));
    
    const queryString = params.toString();
    const endpoint = `/api/matching/agents${queryString ? `?${queryString}` : ''}`;
    
    const result = await gatewayRequest<any>(endpoint);
    const agents = result.data || result || [];
    
    if (!Array.isArray(agents)) {
      console.warn('Unexpected response format from agents API:', result);
      return [];
    }
    
    return agents.map((a: any) => ({
      id: a.id,
      userId: a.userId || a.user_id,
      bio: a.bio,
      specializations: a.specializations || [],
      languages: a.languages || [],
      destinations: a.destinations || [],
      yearsOfExperience: a.yearsOfExperience || a.years_of_experience || 0,
      agencyName: a.agencyName || a.agency_name,
      tier: a.tier,
      commissionRate: parseFloat(a.commissionRate || a.commission_rate || 0),
      rating: parseFloat(a.rating || 0),
      totalReviews: a.totalReviews || a.total_reviews || 0,
      completedBookings: a.completedBookings || a.completed_bookings || 0,
      responseTimeMinutes: a.responseTimeMinutes || a.response_time_minutes || 0,
      isVerified: a.isVerified ?? a.is_verified ?? false,
      isAvailable: a.isAvailable ?? a.is_available ?? true,
      firstName: a.firstName || a.first_name,
      lastName: a.lastName || a.last_name,
      avatarUrl: a.avatarUrl || a.avatar_url,
    }));
  } catch (error) {
    console.error('Error fetching agents:', error);
    return [];
  }
}

// ============================================================================
// Proposals API - via Itineraries Service
// ============================================================================

export async function fetchRequestProposals(requestId: string): Promise<Proposal[]> {
  try {
    const result = await gatewayRequest<any>(`/api/itineraries/api/v1/itineraries/request/${requestId}`);
    const proposals = result.data || result || [];
    
    if (!Array.isArray(proposals)) {
      console.warn('Unexpected response format from proposals API:', result);
      return [];
    }
    
    // Map proposals with basic data first
    const mappedProposals = proposals.map((p: any) => {
      // Extract from overview (backend structure)
      const overview = p.overview || {};
      const pricing = p.pricing || {};
      
      // Build legacy itinerary format from dayPlans or items for backward compatibility
      const items = p.items || [];
      const dayPlans = p.dayPlans || p.day_plans || [];
      const groupedByDay: Record<number, any> = {};

      if (Array.isArray(dayPlans) && dayPlans.length > 0) {
        dayPlans.forEach((plan: any) => {
          const day = plan.dayNumber || 1;
          groupedByDay[day] = {
            day,
            title: plan.title || `Day ${day}`,
            description: plan.description || '',
            activities: Array.isArray(plan.activities) ? plan.activities : [],
          };
        });
      } else {
        items.forEach((item: any) => {
          const day = item.dayNumber || 1;
          if (!groupedByDay[day]) {
            groupedByDay[day] = {
              day,
              title: `Day ${day}`,
              description: '',
              activities: [],
            };
          }
          if (item.title) {
            groupedByDay[day].activities.push(item.title);
          }
          if (item.description && !groupedByDay[day].description) {
            groupedByDay[day].description = item.description;
          }
        });
      }
      
      // Create itinerary array from overview data or items
      const numberOfDays = overview.numberOfDays || (Array.isArray(dayPlans) ? dayPlans.length : 0) || Object.keys(groupedByDay).length || 0;
      const itinerary = numberOfDays > 0 
        ? Array.from({ length: numberOfDays }, (_, i) => 
            groupedByDay[i + 1] || { day: i + 1, title: `Day ${i + 1}`, description: '', activities: [] }
          )
        : [];
      
      return {
        id: p.id,
        requestId: p.requestId || p.request_id,
        agentId: p.agentId || p.agent_id,
        travelerId: p.travelerId || p.traveler_id,
        status: p.status,
        title: overview.title || p.title || 'Travel Proposal',
        description: overview.summary || p.description || '',
        // Get totalPrice from pricing object (backend structure)
        totalPrice: pricing.totalPrice || p.totalPrice || p.total_price || 0,
        currency: pricing.currency || p.currency || 'INR',
        validUntil: p.validUntil || p.valid_until,
        // Include full structures from backend
        overview: p.overview,
        pricing: p.pricing,
        items: p.items,
        dayPlans: dayPlans,
        // Legacy format for backward compatibility
        itinerary,
        inclusions: pricing.inclusions || p.inclusions || [],
        exclusions: pricing.exclusions || p.exclusions || [],
        createdAt: p.createdAt || p.created_at,
        agent: p.agent,
      };
    });
    
    // Fetch agent details for each proposal using the agent profile endpoint
    // Note: agentId here is the agent profile ID from the agents table, not user_id
    const agentIds = [...new Set(mappedProposals.map(p => p.agentId).filter(Boolean))];
    const agentDetails: Record<string, any> = {};
    
    await Promise.all(
      agentIds.map(async (agentId) => {
        try {
          // Use the /agents/:agentId/profile endpoint which looks up by agent profile ID
          const agentResult = await gatewayRequest<any>(`/api/identity/agents/${agentId}/profile`);
          const agent = agentResult.data || agentResult;
          if (agent) {
            agentDetails[agentId] = {
              id: agent.agentId || agent.id,
              userId: agent.userId,
              fullName: agent.fullName || `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || 'Travel Agent',
              businessName: agent.businessName || agent.agencyName || null,
              rating: agent.rating || 0,
              avatarUrl: agent.avatarUrl || agent.avatar_url || null,
              specializations: agent.specializations || [],
              yearsOfExperience: agent.yearsOfExperience || 0,
              tier: agent.tier || 'standard',
              isVerified: agent.isVerified || false,
              totalReviews: agent.totalReviews || 0,
              responseTimeMinutes: agent.responseTimeMinutes || 0,
              completedBookings: agent.completedBookings || 0,
            };
          }
        } catch (err) {
          console.warn(`Failed to fetch agent ${agentId}:`, err);
          // Set a fallback agent info when fetch fails
          agentDetails[agentId] = {
            id: agentId,
            fullName: 'Travel Agent',
            businessName: null,
            rating: 0,
            avatarUrl: null,
            specializations: [],
            yearsOfExperience: 0,
            tier: 'standard',
            isVerified: false,
            totalReviews: 0,
            responseTimeMinutes: 0,
            completedBookings: 0,
          };
        }
      })
    );
    
    // Attach agent details to proposals
    return mappedProposals.map(p => ({
      ...p,
      agent: agentDetails[p.agentId] || p.agent,
    }));
  } catch (error) {
    console.error('Error fetching proposals:', error);
    return [];
  }
}

// Reviews API
// ============================================================================

export interface ReviewSubmission {
  bookingId: string;
  agentId: string;
  rating: number;
  comment?: string;
  categories?: {
    communication: number;
    expertise: number;
    value: number;
    responsiveness: number;
  };
  reactions?: string[];
  isAnonymous?: boolean;
}

export async function submitReview(review: ReviewSubmission): Promise<{ success: boolean; reviewId?: string }> {
  try {
    const result = await gatewayRequest<any>('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id: review.bookingId,
        agent_id: review.agentId,
        rating: review.rating,
        comment: review.comment,
        category_ratings: review.categories,
        reactions: review.reactions,
        is_anonymous: review.isAnonymous || false,
      }),
    });
    
    return { success: true, reviewId: result.id || result.review_id };
  } catch (error) {
    console.error('Error submitting review:', error);
    throw error;
  }
}

export async function fetchAgentReviews(agentId: string): Promise<{
  reviews: Array<{
    id: string;
    rating: number;
    comment?: string;
    categories?: { communication: number; expertise: number; value: number; responsiveness: number };
    reactions?: string[];
    userName: string;
    tripDestination?: string;
    createdAt: string;
    isAnonymous: boolean;
  }>;
  summary: {
    averageRating: number;
    totalReviews: number;
    categoryAverages: { communication: number; expertise: number; value: number; responsiveness: number };
    reactionCounts: Record<string, number>;
  };
}> {
  try {
    const result = await gatewayRequest<any>(`/api/reviews/agent/${agentId}`);
    return {
      reviews: (result.reviews || []).map((r: any) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        categories: r.category_ratings,
        reactions: r.reactions || [],
        userName: r.is_anonymous ? 'Anonymous Traveler' : (r.user_name || r.userName || 'Traveler'),
        tripDestination: r.trip_destination || r.tripDestination,
        createdAt: r.created_at || r.createdAt,
        isAnonymous: r.is_anonymous || false,
      })),
      summary: result.summary || {
        averageRating: 0,
        totalReviews: 0,
        categoryAverages: { communication: 0, expertise: 0, value: 0, responsiveness: 0 },
        reactionCounts: {},
      },
    };
  } catch (error) {
    console.error('Error fetching agent reviews:', error);
    return {
      reviews: [],
      summary: {
        averageRating: 0,
        totalReviews: 0,
        categoryAverages: { communication: 0, expertise: 0, value: 0, responsiveness: 0 },
        reactionCounts: {},
      },
    };
  }
}
