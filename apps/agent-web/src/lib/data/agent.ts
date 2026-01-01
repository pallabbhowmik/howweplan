import { getSupabaseClient } from '@/lib/supabase/client';

// ============================================================================
// ⚠️ ARCHITECTURE VIOLATION WARNING ⚠️
// ============================================================================
// This file directly queries Supabase for agent data, matches, and messages.
// This VIOLATES our architecture.
// 
// ❌ WRONG: Direct Supabase queries bypassing backend services
// ✅ RIGHT: Use backend service API endpoints
// 
// Functions that need migration:
//   - getAgentIdentity() → Identity Service
//   - getAgentStats() → Multiple services (aggregated endpoint needed)
//   - listMatchedRequests() → Matching Service
//   - acceptMatch()/declineMatch() → Matching Service
//   - listConversations() → Messaging Service
//   - sendMessage() → Messaging Service
// 
// See docs/FRONTEND-DATA-ACCESS-POLICY.md for migration plan.
// ============================================================================

export type AgentIdentity = {
  agentId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  tier: 'star' | 'bench' | string;
  rating: number | null;
  totalReviews: number;
  isVerified: boolean;
};

export type AgentStatsSummary = {
  pendingMatches: number;
  acceptedMatches: number;
  activeBookings: number;
  unreadMessages: number;
};

export async function getAgentIdentity(agentId: string): Promise<AgentIdentity | null> {
  const supabase = getSupabaseClient();

  const { data: agentRow, error: agentErr } = await supabase
    .from('agents')
    .select('id, user_id, tier, rating, total_reviews, is_verified, users!agents_user_id_fkey(id, email, first_name, last_name, avatar_url)')
    .eq('id', agentId)
    .maybeSingle();

  if (agentErr) throw agentErr;
  if (!agentRow) return null;

  const u: any = (agentRow as any).users;
  return {
    agentId: (agentRow as any).id,
    userId: (agentRow as any).user_id,
    email: u?.email ?? '',
    firstName: u?.first_name ?? 'Agent',
    lastName: u?.last_name ?? '',
    avatarUrl: u?.avatar_url ?? null,
    tier: (agentRow as any).tier ?? 'bench',
    rating: (agentRow as any).rating === null || (agentRow as any).rating === undefined ? null : Number((agentRow as any).rating),
    totalReviews: Number((agentRow as any).total_reviews ?? 0),
    isVerified: Boolean((agentRow as any).is_verified),
  };
}

export type AgentRequestMatch = {
  matchId: string;
  requestId: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | string;
  matchScore: number | null;
  matchedAt: string | null;
  expiresAt: string | null;
  request: {
    id: string;
    title: string;
    description: string | null;
    destination: any;
    departure_date: string;
    return_date: string;
    budget_min: number | null;
    budget_max: number | null;
    budget_currency: string | null;
    travelers: any;
    travel_style: string | null;
    preferences: any;
    state: string;
    created_at: string;
    expires_at: string | null;
    user_id: string;
  };
  user: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  } | null;
};

export async function getAgentStats(agentId: string): Promise<AgentStatsSummary> {
  const supabase = getSupabaseClient();

  const [{ count: pendingMatches }, { count: acceptedMatches }, { count: activeBookings }, { count: unreadMessages }] =
    await Promise.all([
      supabase
        .from('agent_matches')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId)
        .eq('status', 'pending'),
      supabase
        .from('agent_matches')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId)
        .eq('status', 'accepted'),
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId)
        .in('state', ['CONFIRMED', 'IN_PROGRESS', 'PAYMENT_AUTHORIZED', 'PENDING_PAYMENT']),
      supabase
        .from('conversations')
        .select('id')
        .eq('agent_id', agentId)
        .then(async (r) => {
          if (r.error) throw r.error;
          const ids = (r.data ?? []).map((c: any) => c.id);
          if (ids.length === 0) return { count: 0 } as any;
          // unread = messages not read and not sent by agent
          return supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .in('conversation_id', ids)
            .eq('is_read', false)
            .neq('sender_type', 'agent');
        }),
    ]);

  return {
    pendingMatches: pendingMatches ?? 0,
    acceptedMatches: acceptedMatches ?? 0,
    activeBookings: activeBookings ?? 0,
    unreadMessages: unreadMessages ?? 0,
  };
}

export async function listMatchedRequests(agentId: string): Promise<AgentRequestMatch[]> {
  const supabase = getSupabaseClient();

  // Join: agent_matches -> travel_requests, and travel_requests -> users
  const { data, error } = await supabase
    .from('agent_matches')
    .select(
      `
      id,
      status,
      match_score,
      matched_at,
      expires_at,
      request_id,
      travel_requests (
        id,
        user_id,
        title,
        description,
        destination,
        departure_date,
        return_date,
        budget_min,
        budget_max,
        budget_currency,
        travelers,
        travel_style,
        preferences,
        state,
        created_at,
        expires_at
      )
    `
    )
    .eq('agent_id', agentId)
    .order('matched_at', { ascending: false });

  if (error) throw error;

  const requestUserIds = (data ?? [])
    .map((row: any) => row.travel_requests?.user_id as string | undefined)
    .filter(Boolean) as string[];

  const usersById = new Map<string, any>();
  if (requestUserIds.length > 0) {
    const { data: users, error: userErr } = await supabase
      .from('users')
      .select('id, first_name, last_name, avatar_url')
      .in('id', Array.from(new Set(requestUserIds)));

    if (userErr) throw userErr;
    for (const u of users ?? []) usersById.set((u as any).id, u);
  }

  return (data ?? []).map((row: any) => {
    const request = row.travel_requests;
    const user = request?.user_id ? (usersById.get(request.user_id) ?? null) : null;

    return {
      matchId: row.id,
      requestId: row.request_id,
      status: row.status,
      matchScore: row.match_score === null || row.match_score === undefined ? null : Number(row.match_score),
      matchedAt: row.matched_at ?? null,
      expiresAt: row.expires_at ?? request?.expires_at ?? null,
      request,
      user,
    } as AgentRequestMatch;
  });
}

export async function acceptMatch(matchId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('agent_matches')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', matchId);
  if (error) throw error;
}

export async function declineMatch(matchId: string, declineReason?: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('agent_matches')
    .update({
      status: 'declined',
      decline_reason: declineReason ?? null,
      responded_at: new Date().toISOString(),
    })
    .eq('id', matchId);
  if (error) throw error;
}

export type ConversationListItem = {
  id: string;
  bookingId: string | null;
  requestId: string | null;
  userId: string;
  state: string;
  updatedAt: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  clientName: string;
  clientAvatarUrl: string | null;
  destinationLabel: string | null;
};

export async function listConversations(agentId: string): Promise<ConversationListItem[]> {
  const supabase = getSupabaseClient();

  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('id, booking_id, user_id, state, updated_at')
    .eq('agent_id', agentId)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  const convIds = (conversations ?? []).map((c: any) => c.id);
  const userIds = (conversations ?? []).map((c: any) => c.user_id);
  const bookingIds = (conversations ?? [])
    .map((c: any) => c.booking_id as string | null)
    .filter(Boolean) as string[];

  const [usersRes, messagesRes, bookingsRes] = await Promise.all([
    userIds.length
      ? supabase.from('users').select('id, first_name, last_name, avatar_url').in('id', userIds)
      : Promise.resolve({ data: [] as any[], error: null } as any),
    convIds.length
      ? supabase
          .from('messages')
          .select('conversation_id, sender_type, content, is_read, created_at')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as any[], error: null } as any),
    bookingIds.length
      ? supabase.from('bookings').select('id, request_id').in('id', Array.from(new Set(bookingIds)))
      : Promise.resolve({ data: [] as any[], error: null } as any),
  ]);

  if (usersRes.error) throw usersRes.error;
  if (messagesRes.error) throw messagesRes.error;
  if (bookingsRes.error) throw bookingsRes.error;

  const usersById = new Map<string, any>((usersRes.data ?? []).map((u: any) => [u.id, u]));

  const bookingsById = new Map<string, any>((bookingsRes.data ?? []).map((b: any) => [b.id, b]));
  const requestIds = (bookingsRes.data ?? [])
    .map((b: any) => b.request_id as string | null)
    .filter(Boolean) as string[];

  const requestsById = new Map<string, any>();
  if (requestIds.length > 0) {
    const { data: reqs, error: reqErr } = await supabase
      .from('travel_requests')
      .select('id, title, destination')
      .in('id', Array.from(new Set(requestIds)));
    if (reqErr) throw reqErr;
    for (const r of reqs ?? []) requestsById.set((r as any).id, r);
  }

  const lastByConversation = new Map<string, any>();
  const unreadByConversation = new Map<string, number>();

  for (const m of messagesRes.data ?? []) {
    const convId = m.conversation_id as string;
    if (!lastByConversation.has(convId)) lastByConversation.set(convId, m);
    if (m.is_read === false && m.sender_type !== 'agent') {
      unreadByConversation.set(convId, (unreadByConversation.get(convId) ?? 0) + 1);
    }
  }

  return (conversations ?? []).map((c: any) => {
    const u = usersById.get(c.user_id);
    const last = lastByConversation.get(c.id) ?? null;
    const booking = c.booking_id ? bookingsById.get(c.booking_id) : null;
    const requestId = booking?.request_id ?? null;
    const request = requestId ? requestsById.get(requestId) : null;

    let destinationLabel: string | null = null;
    if (request?.destination) {
      const d: any = request.destination;
      const country = typeof d?.country === 'string' ? d.country : null;
      const regions = Array.isArray(d?.regions) ? (d.regions.filter(Boolean) as string[]) : [];
      if (country && regions.length > 0) destinationLabel = `${country} • ${regions.join(', ')}`;
      else if (country) destinationLabel = country;
      else if (typeof request?.title === 'string') destinationLabel = request.title;
    } else if (typeof request?.title === 'string') {
      destinationLabel = request.title;
    }

    return {
      id: c.id,
      bookingId: c.booking_id ?? null,
      requestId,
      userId: c.user_id,
      state: c.state,
      updatedAt: c.updated_at,
      lastMessageAt: last?.created_at ?? null,
      lastMessagePreview: last?.content ? String(last.content).slice(0, 120) : null,
      unreadCount: unreadByConversation.get(c.id) ?? 0,
      clientName: u ? `${u.first_name} ${u.last_name}`.trim() : 'Client',
      clientAvatarUrl: u?.avatar_url ?? null,
      destinationLabel,
    };
  });
}

export type ConversationMessage = {
  id: string;
  conversationId: string;
  senderType: 'user' | 'agent' | 'system';
  content: string;
  isRead: boolean;
  createdAt: string;
};

export async function listMessages(conversationId: string): Promise<ConversationMessage[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_type, content, is_read, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  return (data ?? []).map((m: any) => ({
    id: m.id,
    conversationId: m.conversation_id,
    senderType: m.sender_type,
    content: m.content,
    isRead: Boolean(m.is_read),
    createdAt: m.created_at,
  }));
}

export async function sendMessage(conversationId: string, senderUserId: string, content: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: senderUserId,
    sender_type: 'agent',
    content,
    content_type: 'text',
    is_read: false,
  });
  if (error) throw error;
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const supabase = getSupabaseClient();
  // Only mark messages FROM the user as read (not the agent's own messages)
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_type', 'agent'); // Mark user & system messages as read
  if (error) throw error;
}

export type TravelRequestDetails = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  destination: any;
  departureDate: string;
  returnDate: string;
  budgetMin: number | null;
  budgetMax: number | null;
  budgetCurrency: string | null;
  travelers: any;
  travelStyle: string | null;
  preferences: any;
  state: string;
  createdAt: string;
  expiresAt: string | null;
  client: { firstName: string; lastName: string; email: string; avatarUrl: string | null } | null;
};

export type AgentMatchForRequest = {
  matchId: string;
  status: string;
  matchScore: number | null;
  matchedAt: string | null;
  expiresAt: string | null;
};

export async function getTravelRequestDetails(requestId: string): Promise<TravelRequestDetails | null> {
  const supabase = getSupabaseClient();

  const { data: req, error } = await supabase
    .from('travel_requests')
    .select(
      'id, user_id, title, description, destination, departure_date, return_date, budget_min, budget_max, budget_currency, travelers, travel_style, preferences, state, created_at, expires_at'
    )
    .eq('id', requestId)
    .maybeSingle();

  if (error) throw error;
  if (!req) return null;

  const userId = (req as any).user_id as string;
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('first_name, last_name, email, avatar_url')
    .eq('id', userId)
    .maybeSingle();

  if (userErr) throw userErr;

  return {
    id: (req as any).id,
    userId,
    title: (req as any).title,
    description: (req as any).description ?? null,
    destination: (req as any).destination,
    departureDate: (req as any).departure_date,
    returnDate: (req as any).return_date,
    budgetMin: (req as any).budget_min === null || (req as any).budget_min === undefined ? null : Number((req as any).budget_min),
    budgetMax: (req as any).budget_max === null || (req as any).budget_max === undefined ? null : Number((req as any).budget_max),
    budgetCurrency: (req as any).budget_currency ?? null,
    travelers: (req as any).travelers,
    travelStyle: (req as any).travel_style ?? null,
    preferences: (req as any).preferences,
    state: (req as any).state,
    createdAt: (req as any).created_at,
    expiresAt: (req as any).expires_at ?? null,
    client: user
      ? {
          firstName: (user as any).first_name ?? '',
          lastName: (user as any).last_name ?? '',
          email: (user as any).email ?? '',
          avatarUrl: (user as any).avatar_url ?? null,
        }
      : null,
  };
}

export async function getAgentMatchForRequest(agentId: string, requestId: string): Promise<AgentMatchForRequest | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('agent_matches')
    .select('id, status, match_score, matched_at, expires_at')
    .eq('agent_id', agentId)
    .eq('request_id', requestId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    matchId: (data as any).id,
    status: (data as any).status,
    matchScore: (data as any).match_score === null || (data as any).match_score === undefined ? null : Number((data as any).match_score),
    matchedAt: (data as any).matched_at ?? null,
    expiresAt: (data as any).expires_at ?? null,
  };
}
