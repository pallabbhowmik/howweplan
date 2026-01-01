import { getSupabaseClient } from '@/lib/supabase/client';

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

// ============================================================================
// Travel Requests API
// ============================================================================

export async function fetchUserRequests(userId: string): Promise<TravelRequest[]> {
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
  const supabase = getSupabaseClient();

  // Generate a title from destination and dates
  const startDate = new Date(input.startDate);
  const title = `${input.destination} Trip - ${startDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`;

  // Supabase schema uses different column names than Docker schema
  const insertData = {
    user_id: input.userId,
    title,
    destination: input.destination,
    start_date: input.startDate,
    end_date: input.endDate,
    budget_min: input.budgetMin,
    budget_max: input.budgetMax,
    travelers_count: input.adults + input.children + input.infants,
    preferences: {
      tripType: input.tripType,
      experiences: input.experiences,
      budgetRange: input.budgetRange,
      adults: input.adults,
      children: input.children,
      infants: input.infants,
      notes: input.preferences,
    },
    special_requirements: input.specialRequests || null,
    status: 'open',
  };

  const { data, error } = await supabase
    .from('travel_requests')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating travel request:', error);
    throw new Error(`Failed to create travel request: ${error.message}`);
  }

  // Map Supabase schema to our interface
  return {
    id: data.id,
    userId: data.user_id,
    title: data.title,
    description: data.special_requirements,
    destination: { city: data.destination, label: data.destination },
    departureLocation: data.departure_city ? { city: data.departure_city } : null,
    departureDate: data.start_date,
    returnDate: data.end_date,
    travelers: data.preferences || { total: data.travelers_count },
    budgetMin: data.budget_min ? parseFloat(data.budget_min) : null,
    budgetMax: data.budget_max ? parseFloat(data.budget_max) : null,
    budgetCurrency: 'INR',
    travelStyle: data.preferences?.tripType || null,
    preferences: data.preferences || {},
    notes: data.special_requirements,
    state: data.status,
    expiresAt: null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
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

export async function updateTravelRequest(requestId: string, input: UpdateTravelRequestInput): Promise<void> {
  const supabase = getSupabaseClient();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.destination !== undefined) {
    updateData.destination = input.destination;
    updateData.title = `Trip to ${input.destination}`;
  }
  if (input.startDate !== undefined) {
    updateData.start_date = input.startDate;
  }
  if (input.endDate !== undefined) {
    updateData.end_date = input.endDate;
  }
  if (input.travelersCount !== undefined) {
    updateData.travelers_count = input.travelersCount;
  }
  if (input.budgetMin !== undefined) {
    updateData.budget_min = input.budgetMin;
  }
  if (input.budgetMax !== undefined) {
    updateData.budget_max = input.budgetMax;
  }
  if (input.specialRequests !== undefined) {
    updateData.special_requirements = input.specialRequests;
  }
  if (input.preferences !== undefined) {
    updateData.preferences = input.preferences;
  }

  const { error } = await supabase
    .from('travel_requests')
    .update(updateData)
    .eq('id', requestId);

  if (error) {
    console.error('Error updating travel request:', error);
    throw new Error(`Failed to update travel request: ${error.message}`);
  }
}

// Cancel a travel request
export async function cancelTravelRequest(requestId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('travel_requests')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (error) {
    console.error('Error cancelling travel request:', error);
    throw new Error(`Failed to cancel travel request: ${error.message}`);
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
  const supabase = getSupabaseClient();

  // Fetch requests counts by status
  const { data: requests } = await supabase
    .from('travel_requests')
    .select('status')
    .eq('user_id', userId);

  // Support both Supabase schema (lowercase) and Docker schema (uppercase)
  const activeStates = ['SUBMITTED', 'MATCHING', 'PROPOSALS_RECEIVED', 'open', 'matched', 'proposals_received'];
  const selectionStates = ['PROPOSALS_RECEIVED', 'proposals_received'];
  
  const activeRequests = (requests || []).filter((r: any) => 
    activeStates.includes(r.status || r.state)
  ).length;
  
  const awaitingSelection = (requests || []).filter((r: any) => 
    selectionStates.includes(r.status || r.state)
  ).length;

  // Fetch bookings counts (table may not exist in Supabase)
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

