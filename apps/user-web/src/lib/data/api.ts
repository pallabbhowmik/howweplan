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
  status: string;
  title: string;
  description: string;
  totalPrice: number;
  currency: string;
  validUntil: string;
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
    fullName: string;
    businessName: string | null;
    rating: number;
    avatarUrl: string | null;
    specializations: string[];
    yearsOfExperience: number;
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

async function gatewayRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();

  // Always default to JSON content-type unless caller overrides.
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const url = `${API_BASE}${endpoint}`;

  // If we have a token, use authenticatedFetch so expired tokens get refreshed.
  // If we don't have a token, keep current behavior (some endpoints are public).
  const response = token
    ? await authenticatedFetch(url, { ...options, headers })
    : await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    // Support multiple backend error shapes.
    const message =
      errorData?.error?.message ||
      errorData?.message ||
      (typeof errorData?.error === 'string' ? errorData.error : undefined) ||
      `Request failed: ${response.status}`;

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
    const requests = unwrapList<any>(result, 'requests');
    return requests.map(mapRequestFromApi);
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
      const itinerariesResult = await gatewayRequest<any>(`/api/itineraries/api/v1/itineraries?requestId=${requestId}`);
      const itineraries = itinerariesResult?.items || itinerariesResult || [];
      if (Array.isArray(itineraries)) {
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

export async function fetchDashboardStats(userId: string): Promise<DashboardStats> {
  // Fetch data from gateway APIs in parallel
  const [requests, bookings, notifications] = await Promise.all([
    fetchUserRequests(userId).catch(() => []),
    fetchUserBookings(userId).catch(() => []),
    fetchUserNotifications(userId, 100).catch(() => []),
  ]);

  // Calculate stats from requests
  const activeStates = ['SUBMITTED', 'MATCHING', 'PROPOSALS_RECEIVED', 'AGENTS_MATCHED', 'DRAFT', 'open', 'matched', 'proposals_received'];
  const selectionStates = ['PROPOSALS_RECEIVED', 'AGENTS_MATCHED', 'proposals_received'];
  
  const activeRequests = requests.filter(r => 
    activeStates.includes(r.state)
  ).length;
  
  const awaitingSelection = requests.filter(r => 
    selectionStates.includes(r.state)
  ).length;

  // Calculate stats from bookings
  const confirmedBookings = bookings.filter(b => 
    b.state === 'CONFIRMED' || b.state === 'confirmed'
  ).length;

  const completedTrips = bookings.filter(b => 
    b.state === 'COMPLETED' || b.state === 'completed'
  ).length;

  // Calculate unread from notifications
  const unreadMessages = notifications.filter(n => !n.isRead).length;

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
    const result = await gatewayRequest<any>(`/api/itineraries/request/${requestId}`);
    const proposals = result.data || result || [];
    
    if (!Array.isArray(proposals)) {
      console.warn('Unexpected response format from proposals API:', result);
      return [];
    }
    
    return proposals.map((p: any) => ({
      id: p.id,
      requestId: p.requestId || p.request_id,
      agentId: p.agentId || p.agent_id,
      status: p.status,
      title: p.title || 'Travel Proposal',
      description: p.description || '',
      totalPrice: p.totalPrice || p.total_price || 0,
      currency: p.currency || 'USD',
      validUntil: p.validUntil || p.valid_until,
      itinerary: p.itinerary || [],
      inclusions: p.inclusions || [],
      exclusions: p.exclusions || [],
      createdAt: p.createdAt || p.created_at,
      agent: p.agent,
    }));
  } catch (error) {
    console.error('Error fetching proposals:', error);
    return [];
  }
}

