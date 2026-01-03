import { getSupabaseClient, getSessionToken } from '@/lib/supabase/client';
import { apiConfig } from '@/config';

// ============================================================================
// ⚠️ ARCHITECTURE VIOLATION WARNING ⚠️
// ============================================================================
// This file contains DIRECT Supabase queries that VIOLATE our architecture.
// 
// ❌ WRONG: Frontend → Supabase DB (bypasses backend services)
// ✅ RIGHT: Frontend → Backend Services → Supabase DB
// 
// According to FRONTEND-DATA-ACCESS-POLICY.md:
// Frontend should ONLY use Supabase for:
//   1. Authentication (Supabase Auth API)
//   2. Session management
//   3. Public read-only reference data (destinations, countries)
// 
// ALL OTHER OPERATIONS must go through backend services:
//   - User profile → Identity Service
//   - Travel requests → Requests Service
//   - Bookings → Booking-Payments Service
//   - Messages → Messaging Service
//   - Notifications → Notifications Service
// 
// TODO: Migrate these functions to use backend API endpoints.
// See docs/FRONTEND-DATA-ACCESS-POLICY.md for migration plan.
// ============================================================================

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
  // Computed fields
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
  // Joined user data
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
  status: string; // Alias for state
  paymentState: string;
  basePriceCents: number;
  bookingFeeCents: number;
  platformCommissionCents: number;
  totalAmountCents: number;
  totalAmount: number; // Alias for totalAmountCents/100
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
  // Additional fields
  title?: string;
  destination?: string | { city?: string; label?: string; country?: string };
  travelers?: { adults?: number; children?: number; infants?: number; total?: number };
  confirmationCode?: string;
  notes?: string;
  // Joined data
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

// ============================================================================
// User API
// ============================================================================

export async function fetchUser(userId: string): Promise<User | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  // Get the number of completed bookings for this user (table may not exist)
  let tripsTaken = 0;
  try {
    const { count } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('state', ['COMPLETED', 'completed']);
    tripsTaken = count || 0;
  } catch {
    // bookings table may not exist in Supabase
  }

  return {
    id: data.id,
    email: data.email,
    firstName: data.first_name,
    lastName: data.last_name,
    fullName: data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'User',
    phone: data.phone,
    avatarUrl: data.avatar_url,
    location: data.location || null,
    role: data.role,
    isActive: data.is_active,
    createdAt: data.created_at,
    tripsTaken: tripsTaken || 0,
    preferences: data.preferences || {},
    emailNotifications: data.email_notifications ?? true,
    smsNotifications: data.sms_notifications ?? false,
    marketingEmails: data.marketing_emails ?? false,
    twoFactorEnabled: data.two_factor_enabled ?? false,
    paymentMethods: data.payment_methods || [],
  };
}

export async function updateUser(userId: string, updates: Partial<{
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  location: string;
  avatarUrl: string;
}>): Promise<boolean> {
  const supabase = getSupabaseClient();

  const dbUpdates: Record<string, unknown> = {};
  if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
  if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
  if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
  if (updates.location !== undefined) dbUpdates.location = updates.location;
  if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;

  const { error } = await supabase
    .from('users')
    .update(dbUpdates)
    .eq('id', userId);

  if (error) {
    console.error('Error updating user:', error);
    return false;
  }

  return true;
}

export interface UserSettings {
  // Notifications
  emailNotifications: boolean;
  pushNotifications: boolean;
  proposalAlerts: boolean;
  messageAlerts: boolean;
  marketingEmails: boolean;
  weeklyDigest: boolean;
  // Privacy
  profileVisible: boolean;
  showTravelHistory: boolean;
  allowAgentContact: boolean;
  // Preferences
  currency: string;
  language: string;
  theme: string;
  soundEnabled: boolean;
  // Security
  twoFactorEnabled: boolean;
}

export async function fetchUserSettings(userId: string): Promise<UserSettings | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('users')
    .select('preferences, email_notifications, marketing_emails, two_factor_enabled')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user settings:', error);
    return null;
  }

  const prefs = data.preferences || {};
  
  return {
    // Notifications
    emailNotifications: data.email_notifications ?? true,
    pushNotifications: prefs.pushNotifications ?? true,
    proposalAlerts: prefs.proposalAlerts ?? true,
    messageAlerts: prefs.messageAlerts ?? true,
    marketingEmails: data.marketing_emails ?? false,
    weeklyDigest: prefs.weeklyDigest ?? true,
    // Privacy
    profileVisible: prefs.profileVisible ?? true,
    showTravelHistory: prefs.showTravelHistory ?? false,
    allowAgentContact: prefs.allowAgentContact ?? true,
    // Preferences
    currency: prefs.currency ?? 'INR',
    language: prefs.language ?? 'en',
    theme: prefs.theme ?? 'light',
    soundEnabled: prefs.soundEnabled ?? true,
    // Security
    twoFactorEnabled: data.two_factor_enabled ?? false,
  };
}

export async function updateUserSettings(userId: string, settings: Partial<UserSettings>): Promise<boolean> {
  const supabase = getSupabaseClient();

  // First fetch current preferences to merge
  const { data: currentData, error: fetchError } = await supabase
    .from('users')
    .select('preferences')
    .eq('id', userId)
    .single();

  if (fetchError) {
    console.error('Error fetching current settings:', fetchError);
    return false;
  }

  const currentPrefs = currentData?.preferences || {};
  
  // Build updates object
  const dbUpdates: Record<string, unknown> = {};
  
  // Direct column updates
  if (settings.emailNotifications !== undefined) {
    dbUpdates.email_notifications = settings.emailNotifications;
  }
  if (settings.marketingEmails !== undefined) {
    dbUpdates.marketing_emails = settings.marketingEmails;
  }
  if (settings.twoFactorEnabled !== undefined) {
    dbUpdates.two_factor_enabled = settings.twoFactorEnabled;
  }
  
  // Preferences JSON updates
  const newPrefs = { ...currentPrefs };
  if (settings.pushNotifications !== undefined) newPrefs.pushNotifications = settings.pushNotifications;
  if (settings.proposalAlerts !== undefined) newPrefs.proposalAlerts = settings.proposalAlerts;
  if (settings.messageAlerts !== undefined) newPrefs.messageAlerts = settings.messageAlerts;
  if (settings.weeklyDigest !== undefined) newPrefs.weeklyDigest = settings.weeklyDigest;
  if (settings.profileVisible !== undefined) newPrefs.profileVisible = settings.profileVisible;
  if (settings.showTravelHistory !== undefined) newPrefs.showTravelHistory = settings.showTravelHistory;
  if (settings.allowAgentContact !== undefined) newPrefs.allowAgentContact = settings.allowAgentContact;
  if (settings.currency !== undefined) newPrefs.currency = settings.currency;
  if (settings.language !== undefined) newPrefs.language = settings.language;
  if (settings.theme !== undefined) newPrefs.theme = settings.theme;
  if (settings.soundEnabled !== undefined) newPrefs.soundEnabled = settings.soundEnabled;
  
  dbUpdates.preferences = newPrefs;

  const { error } = await supabase
    .from('users')
    .update(dbUpdates)
    .eq('id', userId);

  if (error) {
    console.error('Error updating user settings:', error);
    return false;
  }

  return true;
}

export async function changeUserPassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  
  // Supabase handles password changes through auth
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
// Travel Requests API
// ============================================================================

export async function fetchUserRequests(userId: string): Promise<TravelRequest[]> {
  const token = await getSessionToken();
  
  // If not authenticated, try Supabase fallback for read-only data
  if (!token) {
    return fetchUserRequestsFromSupabase(userId);
  }

  try {
    const response = await fetch(`${apiConfig.baseUrl}/api/requests/api/v1/requests`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.warn('Gateway request failed, falling back to Supabase');
      return fetchUserRequestsFromSupabase(userId);
    }

    const result = await response.json();
    const requests = result.data || [];

    return requests.map((r: any) => ({
      id: r.id,
      userId: r.userId,
      title: `${r.destination} Trip`,
      description: r.notes,
      destination: typeof r.destination === 'string' 
        ? { city: r.destination, label: r.destination }
        : (r.destination || {}),
      departureLocation: r.departureLocation ? { city: r.departureLocation } : null,
      departureDate: r.departureDate,
      returnDate: r.returnDate,
      travelers: r.travelers || {},
      budgetMin: r.budgetRange?.minAmount || null,
      budgetMax: r.budgetRange?.maxAmount || null,
      budgetCurrency: r.budgetRange?.currency || 'INR',
      travelStyle: r.travelStyle,
      preferences: {},
      notes: r.notes,
      state: r.state,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      agentsResponded: r.agentsResponded || 0,
    }));
  } catch (error) {
    console.warn('Gateway request error, falling back to Supabase:', error);
    return fetchUserRequestsFromSupabase(userId);
  }
}

// Fallback function for when gateway is unavailable
async function fetchUserRequestsFromSupabase(userId: string): Promise<TravelRequest[]> {
  const supabase = getSupabaseClient();

  const { data: requests, error } = await supabase
    .from('travel_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching requests:', error);
    return [];
  }

  // Fetch agent match counts (table may not exist in Supabase)
  const requestIds = requests.map((r: any) => r.id);
  const matchCounts = new Map<string, number>();
  
  if (requestIds.length > 0) {
    try {
      const { data: matches, error: matchErr } = await supabase
        .from('agent_matches')
        .select('request_id')
        .in('request_id', requestIds)
        .eq('status', 'accepted');

      if (!matchErr && matches) {
        for (const m of matches) {
          const rid = (m as any).request_id;
          matchCounts.set(rid, (matchCounts.get(rid) || 0) + 1);
        }
      }
    } catch {
      // agent_matches table may not exist
    }
  }

  return requests.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    title: r.title,
    description: r.special_requirements || r.description,
    // Handle both Supabase (destination as string) and Docker (destination as JSONB)
    destination: typeof r.destination === 'string' 
      ? { city: r.destination, label: r.destination }
      : (r.destination || {}),
    departureLocation: r.departure_city 
      ? { city: r.departure_city }
      : r.departure_location,
    // Handle both Supabase (start_date/end_date) and Docker (departure_date/return_date)
    departureDate: r.start_date || r.departure_date,
    returnDate: r.end_date || r.return_date,
    // Handle both Supabase (travelers_count) and Docker (travelers JSONB)
    travelers: r.travelers || { total: r.travelers_count },
    budgetMin: r.budget_min ? parseFloat(r.budget_min) : null,
    budgetMax: r.budget_max ? parseFloat(r.budget_max) : null,
    budgetCurrency: r.budget_currency || 'INR',
    travelStyle: r.travel_style || r.preferences?.tripType,
    preferences: r.preferences || {},
    notes: r.special_requirements || r.notes,
    state: r.status || r.state, // Support both Supabase (status) and Docker (state) schemas
    expiresAt: r.expires_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    agentsResponded: matchCounts.get(r.id) || 0,
  }));
}

export async function fetchRequest(requestId: string): Promise<TravelRequest | null> {
  const token = await getSessionToken();
  
  // Try gateway first if authenticated
  if (token) {
    try {
      const response = await fetch(`${apiConfig.baseUrl}/api/requests/api/v1/requests/${requestId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        const data = result.data;
        
        return {
          id: data.id,
          userId: data.userId,
          title: `${data.destination} Trip`,
          description: data.notes,
          destination: typeof data.destination === 'string' 
            ? { city: data.destination, label: data.destination }
            : (data.destination || {}),
          departureLocation: data.departureLocation ? { city: data.departureLocation } : null,
          departureDate: data.departureDate,
          returnDate: data.returnDate,
          travelers: data.travelers || {},
          budgetMin: data.budgetRange?.minAmount || null,
          budgetMax: data.budgetRange?.maxAmount || null,
          budgetCurrency: data.budgetRange?.currency || 'INR',
          travelStyle: data.travelStyle,
          preferences: {},
          notes: data.notes,
          state: data.state,
          expiresAt: data.expiresAt,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      }
    } catch (error) {
      console.warn('Gateway request error, falling back to Supabase:', error);
    }
  }

  // Fallback to Supabase
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('travel_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (error) {
    console.error('Error fetching request:', error);
    return null;
  }

  // Map both Supabase and Docker schema columns
  return {
    id: data.id,
    userId: data.user_id,
    title: data.title,
    description: data.special_requirements || data.description,
    // Handle both Supabase (destination as string) and Docker (destination as JSONB)
    destination: typeof data.destination === 'string' 
      ? { city: data.destination, label: data.destination }
      : (data.destination || {}),
    departureLocation: data.departure_city 
      ? { city: data.departure_city }
      : data.departure_location,
    // Handle both Supabase (start_date/end_date) and Docker (departure_date/return_date)
    departureDate: data.start_date || data.departure_date,
    returnDate: data.end_date || data.return_date,
    // Handle both Supabase (travelers_count) and Docker (travelers JSONB)
    travelers: data.preferences?.adults 
      ? { 
          adults: data.preferences.adults, 
          children: data.preferences.children, 
          infants: data.preferences.infants,
          total: data.travelers_count || (data.preferences.adults + data.preferences.children + data.preferences.infants)
        }
      : (data.travelers || { total: data.travelers_count }),
    budgetMin: data.budget_min ? parseFloat(data.budget_min) : null,
    budgetMax: data.budget_max ? parseFloat(data.budget_max) : null,
    budgetCurrency: data.budget_currency || 'INR',
    travelStyle: data.travel_style || data.preferences?.tripType,
    preferences: data.preferences || {},
    notes: data.special_requirements || data.notes,
    state: data.status || data.state, // Support both schemas
    expiresAt: data.expires_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
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

export async function createTravelRequest(input: CreateTravelRequestInput): Promise<TravelRequest> {
  // Get auth token for API gateway
  const token = await getSessionToken();
  if (!token) {
    throw new Error('Not authenticated. Please log in to create a request.');
  }

  // Map tripType to travelStyle enum expected by the API
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

  // Prepare the request body for the gateway API
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

  const response = await fetch(`${apiConfig.baseUrl}/api/requests/api/v1/requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Error creating travel request:', errorData);
    throw new Error(errorData.error?.message || errorData.message || `Failed to create travel request: ${response.status}`);
  }

  const result = await response.json();
  const data = result.data;

  // Map API response to our interface
  return {
    id: data.id,
    userId: data.userId,
    title: `${input.destination} Trip`,
    description: data.notes,
    destination: { city: data.destination, label: data.destination },
    departureLocation: data.departureLocation ? { city: data.departureLocation } : null,
    departureDate: data.departureDate,
    returnDate: data.returnDate,
    travelers: data.travelers || { adults: input.adults, children: input.children, infants: input.infants },
    budgetMin: data.budgetRange?.minAmount || input.budgetMin,
    budgetMax: data.budgetRange?.maxAmount || input.budgetMax,
    budgetCurrency: data.budgetRange?.currency || 'INR',
    travelStyle: data.travelStyle,
    preferences: {},
    notes: data.notes,
    state: data.state,
    expiresAt: data.expiresAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

// ============================================================================
// Update Travel Request
// ============================================================================

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

export async function updateTravelRequest(_requestId: string, _input: UpdateTravelRequestInput): Promise<void> {
  // TODO: Implement via gateway API when endpoint is available
  // For now, updates are not supported - users should cancel and create new requests
  throw new Error('Request updates are not currently supported. Please cancel and create a new request.');
}

// Cancel a travel request
export async function cancelTravelRequest(requestId: string): Promise<void> {
  const token = await getSessionToken();
  if (!token) {
    throw new Error('Not authenticated. Please log in to cancel a request.');
  }

  const response = await fetch(`${apiConfig.baseUrl}/api/requests/api/v1/requests/${requestId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Error cancelling travel request:', errorData);
    throw new Error(errorData.error?.message || errorData.message || `Failed to cancel request: ${response.status}`);
  }
}

// ============================================================================
// Bookings API
// ============================================================================

export async function fetchUserBookings(userId: string): Promise<Booking[]> {
  const supabase = getSupabaseClient();

  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookings:', error);
      return [];
    }

    if (!bookings || bookings.length === 0) {
      return [];
    }

  // Fetch agent details
  const agentIds = [...new Set(bookings.map((b: any) => b.agent_id).filter(Boolean))];
  const agentsById = new Map<string, any>();
  
  if (agentIds.length > 0) {
    const { data: agents, error: agentErr } = await supabase
      .from('agents')
      .select('id, user_id, tier, rating, total_reviews')
      .in('id', agentIds);

    if (!agentErr && agents) {
      // Get user info for agents
      const agentUserIds = agents.map((a: any) => a.user_id);
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url')
        .in('id', agentUserIds);

      const usersById = new Map((users || []).map((u: any) => [u.id, u]));

      for (const a of agents) {
        const user = usersById.get((a as any).user_id);
        agentsById.set((a as any).id, {
          ...a,
          firstName: user?.first_name,
          lastName: user?.last_name,
          avatarUrl: user?.avatar_url,
        });
      }
    }
  }

  // Fetch request details for destination info
  const requestIds = [...new Set(bookings.map((b: any) => b.request_id).filter(Boolean))];
  const requestsById = new Map<string, any>();
  
  if (requestIds.length > 0) {
    const { data: requests } = await supabase
      .from('travel_requests')
      .select('id, title, destination')
      .in('id', requestIds);

    for (const r of requests || []) {
      requestsById.set((r as any).id, r);
    }
  }

  return bookings.map((b: any) => {
    const agent = agentsById.get(b.agent_id);
    const request = requestsById.get(b.request_id);
    
    return {
      id: b.id,
      requestId: b.request_id,
      itineraryId: b.itinerary_id,
      userId: b.user_id,
      agentId: b.agent_id,
      state: b.status || b.state, // Support both schemas
      status: b.status || b.state, // Alias
      paymentState: b.payment_state || b.payment_status,
      basePriceCents: b.base_price_cents,
      bookingFeeCents: b.booking_fee_cents,
      platformCommissionCents: b.platform_commission_cents,
      totalAmountCents: b.total_amount_cents,
      totalAmount: (b.total_amount_cents || 0) / 100,
      paidAmount: (b.paid_amount_cents || 0) / 100,
      currency: b.currency,
      travelStartDate: b.travel_start_date,
      travelEndDate: b.travel_end_date,
      departureDate: b.travel_start_date,
      returnDate: b.travel_end_date,
      startDate: b.travel_start_date,
      endDate: b.travel_end_date,
      chatRequirementMet: b.chat_requirement_met,
      contactsRevealed: b.contacts_revealed,
      confirmedAt: b.confirmed_at,
      completedAt: b.completed_at,
      cancelledAt: b.cancelled_at,
      cancellationReason: b.cancellation_reason,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
      // Derived from request
      title: request?.title,
      destination: request?.destination,
      travelers: request?.travelers || { total: 1 },
      confirmationCode: b.confirmation_code || `TC-${b.id.slice(0, 8).toUpperCase()}`,
      notes: b.notes,
      // Agent info formatted for display
      agent: agent ? {
        id: agent.id,
        fullName: `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || 'Unknown Agent',
        businessName: agent.agency_name,
        rating: parseFloat(agent.rating),
        avatarUrl: agent.avatarUrl,
      } : undefined,
      request,
    };
  });
  } catch (err) {
    // bookings table may not exist in Supabase
    console.error('Error in fetchUserBookings:', err);
    return [];
  }
}

// ============================================================================
// Notifications API
// ============================================================================

export async function fetchUserNotifications(userId: string, limit = 10): Promise<Notification[]> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return (data || []).map((n: any) => ({
      id: n.id,
      userId: n.user_id,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data || {},
      channel: n.channel,
      isRead: n.is_read,
      readAt: n.read_at,
      createdAt: n.created_at,
    }));
  } catch (err) {
    // notifications table may not exist
    console.error('Error in fetchUserNotifications:', err);
    return [];
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const supabase = getSupabaseClient();

  try {
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);
  } catch {
    // notifications table may not exist
  }
}

// ============================================================================
// Dashboard Stats API
// ============================================================================

export async function fetchDashboardStats(userId: string): Promise<DashboardStats> {
  const token = await getSessionToken();
  
  // Try to get requests from gateway
  let requests: TravelRequest[] = [];
  if (token) {
    try {
      requests = await fetchUserRequests(userId);
    } catch {
      // Fallback handled inside fetchUserRequests
    }
  }

  // Calculate stats from requests
  const activeStates = ['SUBMITTED', 'MATCHING', 'PROPOSALS_RECEIVED', 'AGENTS_MATCHED', 'DRAFT', 'open', 'matched', 'proposals_received'];
  const selectionStates = ['PROPOSALS_RECEIVED', 'AGENTS_MATCHED', 'proposals_received'];
  
  const activeRequests = requests.filter(r => 
    activeStates.includes(r.state)
  ).length;
  
  const awaitingSelection = requests.filter(r => 
    selectionStates.includes(r.state)
  ).length;

  // Fetch bookings counts from Supabase (table may not exist)
  const supabase = getSupabaseClient();
  let confirmedBookings = 0;
  let completedTrips = 0;
  try {
    const { data: bookings } = await supabase
      .from('bookings')
      .select('state')
      .eq('user_id', userId);

    confirmedBookings = (bookings || []).filter((b: any) => 
      (b.status || b.state) === 'CONFIRMED' || (b.status || b.state) === 'confirmed'
    ).length;

    completedTrips = (bookings || []).filter((b: any) => 
      (b.status || b.state) === 'COMPLETED' || (b.status || b.state) === 'completed'
    ).length;
  } catch {
    // bookings table may not exist
  }

  // Fetch unread messages count (tables may not exist)
  let unreadMessages = 0;
  try {
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', userId);

    if (conversations && conversations.length > 0) {
      const convIds = conversations.map((c: any) => c.id);
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', convIds)
        .eq('sender_type', 'agent')
        .eq('is_read', false);

      unreadMessages = count || 0;
    }
  } catch {
    // conversations/messages tables may not exist
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
// Recent Activity API
// ============================================================================

export interface ActivityItem {
  id: string;
  type: 'agent_response' | 'match' | 'message' | 'booking' | 'notification';
  message: string;
  time: string;
  relatedId?: string;
}

export async function fetchRecentActivity(userId: string, limit = 5): Promise<ActivityItem[]> {
  const supabase = getSupabaseClient();
  const activities: ActivityItem[] = [];

  // Fetch recent notifications (table may not exist)
  try {
    const { data: notifications } = await supabase
      .from('notifications')
      .select('id, type, title, body, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    for (const n of notifications || []) {
      activities.push({
        id: n.id,
        type: 'notification',
        message: n.title || n.body,
        time: n.created_at,
      });
    }
  } catch {
    // notifications table may not exist
  }

  // Fetch recent messages from agents (tables may not exist)
  try {
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', userId);

    if (conversations && conversations.length > 0) {
      const convIds = conversations.map((c: any) => c.id);
      const { data: messages } = await supabase
        .from('messages')
        .select('id, content, created_at, conversation_id')
        .in('conversation_id', convIds)
        .eq('sender_type', 'agent')
        .order('created_at', { ascending: false })
        .limit(3);

      for (const m of messages || []) {
        activities.push({
          id: m.id,
          type: 'message',
          message: `New message: "${(m.content as string).substring(0, 50)}..."`,
          time: m.created_at,
          relatedId: m.conversation_id,
        });
      }
    }
  } catch {
    // conversations/messages tables may not exist
  }

  // Sort by time and return top items
  activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  return activities.slice(0, limit);
}

// ============================================================================
// Agents API
// ============================================================================

export async function fetchAgents(filters?: {
  tier?: 'star' | 'bench';
  destinations?: string[];
  specializations?: string[];
}): Promise<Agent[]> {
  const supabase = getSupabaseClient();

  try {
    let query = supabase
      .from('agents')
      .select('*')
      .eq('is_verified', true)
      .eq('is_available', true);

    if (filters?.tier) {
      query = query.eq('tier', filters.tier);
    }

    const { data: agents, error } = await query.order('rating', { ascending: false });

    if (error) {
      console.error('Error fetching agents:', error);
      return [];
    }

    // Get user info for agents
    const agentUserIds = agents.map((a: any) => a.user_id);
    const { data: users } = await supabase
      .from('users')
      .select('id, first_name, last_name, avatar_url')
      .in('id', agentUserIds);

    const usersById = new Map((users || []).map((u: any) => [u.id, u]));

    return agents.map((a: any) => {
      const user = usersById.get(a.user_id);
      return {
        id: a.id,
        userId: a.user_id,
        bio: a.bio,
        specializations: a.specializations || [],
        languages: a.languages || [],
        destinations: a.destinations || [],
        yearsOfExperience: a.years_of_experience,
        agencyName: a.agency_name,
        tier: a.tier,
        commissionRate: parseFloat(a.commission_rate),
        rating: parseFloat(a.rating),
        totalReviews: a.total_reviews,
        completedBookings: a.completed_bookings,
        responseTimeMinutes: a.response_time_minutes,
        isVerified: a.is_verified,
        isAvailable: a.is_available,
        firstName: user?.first_name,
        lastName: user?.last_name,
        avatarUrl: user?.avatar_url,
      };
    });
  } catch (err) {
    // agents table may not exist
    console.error('Error in fetchAgents:', err);
    return [];
  }
}

// ============================================================================
// Individual Item Fetching
// ============================================================================

export async function fetchBooking(bookingId: string): Promise<Booking | null> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error) {
      console.error('Error fetching booking:', error);
      return null;
    }

  // Fetch travel request info if request_id exists
  let travelRequest = null;
  if (data.request_id) {
    const { data: reqData } = await supabase
      .from('travel_requests')
      .select('title, destination, departure_date, return_date, travelers, notes')
      .eq('id', data.request_id)
      .single();
    travelRequest = reqData;
  }

  // Fetch agent info if agentId exists
  let agent = null;
  if (data.agent_id) {
    const { data: agentData } = await supabase
      .from('agents')
      .select('id, user_id, bio, tier, rating, agency_name')
      .eq('id', data.agent_id)
      .single();
    
    if (agentData) {
      const { data: userData } = await supabase
        .from('users')
        .select('first_name, last_name, avatar_url')
        .eq('id', agentData.user_id)
        .single();
      
      agent = {
        id: agentData.id,
        fullName: userData ? `${userData.first_name} ${userData.last_name}` : 'Unknown Agent',
        businessName: agentData.agency_name,
        rating: parseFloat(agentData.rating),
        avatarUrl: userData?.avatar_url,
      };
    }
  }

  return {
    id: data.id,
    requestId: data.request_id,
    itineraryId: data.itinerary_id,
    userId: data.user_id,
    agentId: data.agent_id,
    state: data.status || data.state, // Support both schemas
    status: data.status || data.state, // Alias for UI compatibility
    paymentState: data.payment_state || data.payment_status,
    basePriceCents: data.base_price_cents,
    bookingFeeCents: data.booking_fee_cents,
    platformCommissionCents: data.platform_commission_cents,
    totalAmountCents: data.total_amount_cents,
    totalAmount: (data.total_amount_cents || 0) / 100,
    paidAmount: data.payment_state === 'CAPTURED' ? (data.total_amount_cents || 0) / 100 : 0,
    currency: data.currency || 'USD',
    travelStartDate: data.travel_start_date,
    travelEndDate: data.travel_end_date,
    departureDate: data.travel_start_date,
    returnDate: data.travel_end_date,
    startDate: data.travel_start_date,
    endDate: data.travel_end_date,
    // Fields from associated travel request
    title: travelRequest?.title || 'Trip Booking',
    destination: travelRequest?.destination || 'Unknown Destination',
    travelers: travelRequest?.travelers || { total: 1 },
    notes: travelRequest?.notes || data.cancellation_reason,
    confirmationCode: data.id.slice(0, 8).toUpperCase(), // Generate from booking ID
    chatRequirementMet: data.chat_requirement_met,
    contactsRevealed: data.contacts_revealed,
    contactsRevealedAt: data.contacts_revealed_at,
    confirmedAt: data.confirmed_at,
    completedAt: data.completed_at,
    cancelledAt: data.cancelled_at,
    cancellationReason: data.cancellation_reason,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    agent: agent || undefined,
  };
  } catch (err) {
    // bookings table may not exist
    console.error('Error in fetchBooking:', err);
    return null;
  }
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

export async function fetchRequestProposals(requestId: string): Promise<Proposal[]> {
  const supabase = getSupabaseClient();

  try {
    // First try the proposals table
    const { data: proposals, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching proposals:', error);
      
      // Fall back to agent_matches with proposals
      try {
        const { data: matches, error: matchError } = await supabase
          .from('agent_matches')
          .select('*')
          .eq('request_id', requestId)
          .eq('status', 'proposal_sent');
        
        if (matchError || !matches || matches.length === 0) {
          return [];
        }

        // Get agent info for matches
        const agentIds = matches.map((m: any) => m.agent_id);
        const { data: agents } = await supabase
          .from('agents')
          .select('id, user_id, agency_name, tier, rating, specializations, years_of_experience')
          .in('id', agentIds);

        const userIds = (agents || []).map((a: any) => a.user_id);
        const { data: users } = await supabase
          .from('users')
          .select('id, first_name, last_name, avatar_url')
          .in('id', userIds);

        const agentsById = new Map((agents || []).map((a: any) => [a.id, a]));
        const usersById = new Map((users || []).map((u: any) => [u.id, u]));

        return matches.map((m: any) => {
          const agent = agentsById.get(m.agent_id);
          const user = agent ? usersById.get(agent.user_id) : null;
          const proposal = m.proposal_data || {};
          
          return {
            id: m.id,
            requestId: m.request_id,
            agentId: m.agent_id,
            status: m.status,
            title: proposal.title || 'Travel Proposal',
            description: proposal.description || '',
            totalPrice: proposal.total_price || m.quoted_price || 0,
            currency: proposal.currency || 'USD',
            validUntil: proposal.valid_until || m.expires_at,
            itinerary: proposal.itinerary || [],
            inclusions: proposal.inclusions || [],
            exclusions: proposal.exclusions || [],
            createdAt: m.created_at,
            agent: agent ? {
              id: agent.id,
              fullName: user ? `${user.first_name} ${user.last_name}` : 'Unknown Agent',
              businessName: agent.agency_name,
              rating: parseFloat(agent.rating),
              avatarUrl: user?.avatar_url,
              specializations: agent.specializations || [],
              yearsOfExperience: agent.years_of_experience,
            } : undefined,
          };
        });
      } catch {
        // agent_matches table may not exist
        return [];
      }
    }

    if (!proposals || proposals.length === 0) {
      return [];
    }

  // Get agent info
  const agentIds = proposals.map((p: any) => p.agent_id);
  const { data: agents } = await supabase
    .from('agents')
    .select('id, user_id, agency_name, tier, rating, specializations, years_of_experience')
    .in('id', agentIds);

  const userIds = (agents || []).map((a: any) => a.user_id);
  const { data: users } = await supabase
    .from('users')
    .select('id, first_name, last_name, avatar_url')
    .in('id', userIds);

  const agentsById = new Map((agents || []).map((a: any) => [a.id, a]));
  const usersById = new Map((users || []).map((u: any) => [u.id, u]));

  return proposals.map((p: any) => {
    const agent = agentsById.get(p.agent_id);
    const user = agent ? usersById.get(agent.user_id) : null;
    
    return {
      id: p.id,
      requestId: p.request_id,
      agentId: p.agent_id,
      status: p.status,
      title: p.title || 'Travel Proposal',
      description: p.description || '',
      totalPrice: p.total_price || 0,
      currency: p.currency || 'USD',
      validUntil: p.valid_until,
      itinerary: p.itinerary || [],
      inclusions: p.inclusions || [],
      exclusions: p.exclusions || [],
      createdAt: p.created_at,
      agent: agent ? {
        id: agent.id,
        fullName: user ? `${user.first_name} ${user.last_name}` : 'Unknown Agent',
        businessName: agent.agency_name,
        rating: parseFloat(agent.rating),
        avatarUrl: user?.avatar_url,
        specializations: agent.specializations || [],
        yearsOfExperience: agent.years_of_experience,
      } : undefined,
    };
  });
  } catch (err) {
    // proposals/agents tables may not exist
    console.error('Error in fetchRequestProposals:', err);
    return [];
  }
}

