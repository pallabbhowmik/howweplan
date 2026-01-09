import { demoAgents } from '@/lib/agent/demo-agents';
import { apiUrl, authenticatedFetch, getAccessToken } from '@/lib/api/auth';

// ============================================================================
// PRODUCTION-SAFE DATA LAYER
// ============================================================================
// IMPORTANT:
// This module intentionally contains **NO** direct database access.
// In production, agent-web must fetch data via the API Gateway / backend services.
//
// Today, agent-web uses demo login/session flows, so we provide a safe, local mock
// implementation that keeps the UI functional without risking DB exposure.
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

type MatchStatus = 'pending' | 'accepted' | 'declined' | 'expired' | string;

type StoredMessage = {
  id: string;
  conversationId: string;
  senderType: 'user' | 'agent' | 'system';
  content: string;
  isRead: boolean;
  createdAt: string;
};

type StoredConversation = {
  id: string;
  agentId: string;
  userId: string;
  bookingId: string | null;
  requestId: string | null;
  state: string;
  updatedAt: string;
};

type StoredRequest = {
  id: string;
  user_id: string;
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
};

type StoredUser = {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  avatar_url: string | null;
};

type StoredMatch = {
  id: string;
  agent_id: string;
  request_id: string;
  status: MatchStatus;
  match_score: number | null;
  matched_at: string | null;
  expires_at: string | null;
};

type StoredState = {
  users: Record<string, StoredUser>;
  requests: Record<string, StoredRequest>;
  matches: Record<string, StoredMatch>;
  conversations: Record<string, StoredConversation>;
  messages: Record<string, StoredMessage[]>; // keyed by conversationId
};

const STORAGE_KEY = 'howweplan.agent.mockData.v1';

function nowIso(): string {
  return new Date().toISOString();
}

function safeRandomId(prefix: string): string {
  // Not a crypto UUID; good enough for client-only mock state.
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

function defaultState(): StoredState {
  const agentA = demoAgents[0];
  const agentB = demoAgents[1];

  const user1: StoredUser = {
    id: 'u0000000-0000-0000-0000-000000000001',
    first_name: 'Emma',
    last_name: 'Wilson',
    email: 'emma.wilson@email.com',
    avatar_url: null,
  };
  const user2: StoredUser = {
    id: 'u0000000-0000-0000-0000-000000000002',
    first_name: 'Michael',
    last_name: 'Chen',
    email: 'michael.chen@email.com',
    avatar_url: null,
  };

  const req1: StoredRequest = {
    id: 'r0000000-0000-0000-0000-000000000001',
    user_id: user1.id,
    title: 'Bali Honeymoon (10 days)',
    description: 'Beachfront stay + a couple of day trips.',
    destination: { country: 'Indonesia', regions: ['Bali'] },
    departure_date: '2026-02-10',
    return_date: '2026-02-20',
    budget_min: 250000,
    budget_max: 450000,
    budget_currency: 'INR',
    travelers: { adults: 2, children: 0, infants: 0 },
    travel_style: 'luxury',
    preferences: { interests: ['beach', 'spa'] },
    state: 'OPEN',
    created_at: nowIso(),
    expires_at: null,
  };

  const req2: StoredRequest = {
    id: 'r0000000-0000-0000-0000-000000000002',
    user_id: user2.id,
    title: 'Japan City Break (Tokyo + Kyoto)',
    description: 'Food + culture, mid-range hotels.',
    destination: { country: 'Japan', regions: ['Tokyo', 'Kyoto'] },
    departure_date: '2026-03-05',
    return_date: '2026-03-12',
    budget_min: 300000,
    budget_max: 500000,
    budget_currency: 'INR',
    travelers: { adults: 2, children: 0, infants: 0 },
    travel_style: 'mid-range',
    preferences: { interests: ['food', 'culture'] },
    state: 'OPEN',
    created_at: nowIso(),
    expires_at: null,
  };

  const match1: StoredMatch = {
    id: 'm0000000-0000-0000-0000-000000000001',
    agent_id: agentA?.agentId ?? 'b0000000-0000-0000-0000-000000000001',
    request_id: req1.id,
    status: 'pending',
    match_score: 0.91,
    matched_at: nowIso(),
    expires_at: null,
  };
  const match2: StoredMatch = {
    id: 'm0000000-0000-0000-0000-000000000002',
    agent_id: agentB?.agentId ?? 'b0000000-0000-0000-0000-000000000002',
    request_id: req2.id,
    status: 'pending',
    match_score: 0.83,
    matched_at: nowIso(),
    expires_at: null,
  };

  const conv1: StoredConversation = {
    id: 'c0000000-0000-0000-0000-000000000001',
    agentId: match1.agent_id,
    userId: user1.id,
    bookingId: null,
    requestId: req1.id,
    state: 'open',
    updatedAt: nowIso(),
  };

  const conv2: StoredConversation = {
    id: 'c0000000-0000-0000-0000-000000000002',
    agentId: match2.agent_id,
    userId: user2.id,
    bookingId: null,
    requestId: req2.id,
    state: 'open',
    updatedAt: nowIso(),
  };

  const initialMessages1: StoredMessage[] = [
    {
      id: safeRandomId('msg'),
      conversationId: conv1.id,
      senderType: 'user',
      content: 'Hi! We are planning our honeymoon — can you suggest options?',
      isRead: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: safeRandomId('msg'),
      conversationId: conv1.id,
      senderType: 'agent',
      content: 'Absolutely — I can share 2-3 tailored itineraries. Any preferred dates?',
      isRead: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    },
  ];

  const initialMessages2: StoredMessage[] = [
    {
      id: safeRandomId('msg'),
      conversationId: conv2.id,
      senderType: 'user',
      content: 'Looking for Tokyo + Kyoto for 7 days. Food + temples.',
      isRead: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    },
  ];

  return {
    users: {
      [user1.id]: user1,
      [user2.id]: user2,
    },
    requests: {
      [req1.id]: req1,
      [req2.id]: req2,
    },
    matches: {
      [match1.id]: match1,
      [match2.id]: match2,
    },
    conversations: {
      [conv1.id]: conv1,
      [conv2.id]: conv2,
    },
    messages: {
      [conv1.id]: initialMessages1,
      [conv2.id]: initialMessages2,
    },
  };
}

function loadState(): StoredState {
  if (typeof window === 'undefined') return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as StoredState;
    // Minimal shape check
    if (!parsed || typeof parsed !== 'object' || !parsed.conversations || !parsed.messages) {
      return defaultState();
    }
    return parsed;
  } catch {
    return defaultState();
  }
}

function saveState(state: StoredState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function getUnreadCountForConversation(messages: StoredMessage[], agentUserId?: string): number {
  // unread = messages not read and not sent by agent
  return messages.filter((m) => m.isRead === false && m.senderType !== 'agent').length;
}

/**
 * API Error class for better error handling
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function tryFetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authenticatedFetch(apiUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const json = await res.json().catch(() => ({}));
  
  // Check for error responses
  if (!res.ok) {
    const errorMessage = json?.error || json?.message || `Request failed with status ${res.status}`;
    const errorDetails = json?.details || undefined;
    console.error(`[API Error] ${res.status} ${path}:`, errorMessage, errorDetails || '');
    throw new ApiError(errorMessage, res.status, json?.code, errorDetails);
  }
  
  // identity service uses { success, data }, most others use { data }
  return (json?.data ?? json) as T;
}

export async function getAgentIdentity(agentId: string): Promise<AgentIdentity | null> {
  // If authenticated, fetch from backend (derives agent/user identity from token).
  if (getAccessToken()) {
    const me = await tryFetchJson<{ data: {
      agentId: string;
      userId: string;
      email: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
      tier: string | null;
      rating: number | null;
      totalReviews: number;
      isVerified: boolean;
    } }>('/api/matching/api/v1/agent/me');

    const d = (me as any)?.data ?? me;
    if (d?.agentId && d?.userId) {
      return {
        agentId: String(d.agentId),
        userId: String(d.userId),
        email: String(d.email ?? ''),
        firstName: String(d.firstName ?? ''),
        lastName: String(d.lastName ?? ''),
        avatarUrl: (d.avatarUrl ?? null) as string | null,
        tier: String(d.tier ?? ''),
        rating: d.rating === null || d.rating === undefined ? null : Number(d.rating),
        totalReviews: Number(d.totalReviews ?? 0),
        isVerified: Boolean(d.isVerified),
      };
    }
    return null;
  }

  // No token - user is not logged in
  throw new ApiError('Not authenticated. Please log in.', 401, 'NOT_AUTHENTICATED');
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
  // Must be authenticated to fetch stats
  if (!getAccessToken()) {
    throw new ApiError('Not authenticated. Please log in.', 401, 'NOT_AUTHENTICATED');
  }

  // Fetch from backend services - matches from matching-service, messages from messaging-service
  const [matches, conversations] = await Promise.all([
    listMatchedRequests(agentId),
    listConversations(agentId).catch(() => []), // Conversations may fail if messaging service unavailable
  ]);

  const pendingMatches = matches.filter((m) => m.status === 'pending').length;
  const acceptedMatches = matches.filter((m) => m.status === 'accepted').length;

  const unreadMessages = conversations.reduce((acc, c) => acc + Number(c.unreadCount ?? 0), 0);

  return {
    pendingMatches,
    acceptedMatches,
    activeBookings: 0,
    unreadMessages,
  };
}

export async function listMatchedRequests(agentId: string): Promise<AgentRequestMatch[]> {
  // Must be authenticated to fetch matches
  if (!getAccessToken()) {
    throw new ApiError('Not authenticated. Please log in.', 401, 'NOT_AUTHENTICATED');
  }

  // Fetch from backend matching service (derives agentId from JWT)
  const result = await tryFetchJson<{ items: AgentRequestMatch[] }>('/api/matching/api/v1/matches');
  return Array.isArray(result?.items) ? result.items : [];
}

export async function acceptMatch(matchId: string): Promise<void> {
  if (!getAccessToken()) {
    throw new ApiError('Not authenticated. Please log in.', 401, 'NOT_AUTHENTICATED');
  }

  await tryFetchJson('/api/matching/api/v1/matches/' + encodeURIComponent(matchId) + '/accept', {
    method: 'POST',
  });
}

export async function declineMatch(matchId: string, declineReason?: string): Promise<void> {
  if (!getAccessToken()) {
    throw new ApiError('Not authenticated. Please log in.', 401, 'NOT_AUTHENTICATED');
  }

  await tryFetchJson('/api/matching/api/v1/matches/' + encodeURIComponent(matchId) + '/decline', {
    method: 'POST',
    body: JSON.stringify({ reason: declineReason ?? null }),
  });
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
  // Must be authenticated to fetch conversations
  if (!getAccessToken()) {
    throw new ApiError('Not authenticated. Please log in.', 401, 'NOT_AUTHENTICATED');
  }

  // Fetch from backend messaging service (derives agentId from JWT)
  const result = await tryFetchJson<{
    items: Array<{
      id: string;
      bookingId: string | null;
      state: string;
      createdAt: string;
      updatedAt: string;
      participants: Array<{ id: string; participantType: 'USER' | 'AGENT' | 'ADMIN' }>;
      lastMessage: null | { createdAt: string; content: string };
      unreadCount: number;
    }>;
  }>('/api/messaging/api/v1/conversations');

  return (result.items ?? []).map((c) => {
    const userParticipant = (c.participants ?? []).find((p) => p.participantType === 'USER');
    return {
      id: c.id,
      bookingId: c.bookingId ?? null,
      requestId: null,
      userId: userParticipant?.id ?? '',
      state: c.state?.toLowerCase?.() ?? String(c.state ?? ''),
      updatedAt: c.updatedAt,
      lastMessageAt: c.lastMessage?.createdAt ?? null,
      lastMessagePreview: c.lastMessage?.content ? String(c.lastMessage.content).slice(0, 120) : null,
      unreadCount: Number(c.unreadCount ?? 0),
      clientName: 'Client',
      clientAvatarUrl: null,
      destinationLabel: null,
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
  if (!getAccessToken()) {
    throw new ApiError('Not authenticated. Please log in.', 401, 'NOT_AUTHENTICATED');
  }

  const result = await tryFetchJson<{
    items: Array<{
      id: string;
      conversationId: string;
      senderType: 'USER' | 'AGENT' | 'SYSTEM';
      content: string;
      createdAt: string;
      readBy?: unknown;
    }>;
  }>(`/api/messaging/api/v1/messages?conversationId=${encodeURIComponent(conversationId)}`);

  const items = result.items ?? [];
  return items.map((m) => ({
    id: m.id,
    conversationId: m.conversationId,
    senderType: m.senderType === 'AGENT' ? 'agent' : m.senderType === 'SYSTEM' ? 'system' : 'user',
    content: m.content,
    // messaging view doesn't currently expose per-recipient read state; treat as read if readBy is present.
    isRead: Boolean((m as any).isRead ?? ((m as any).readBy && Array.isArray((m as any).readBy) && (m as any).readBy.length > 0)),
    createdAt: m.createdAt,
  }));
}

export async function sendMessage(conversationId: string, senderUserId: string, content: string): Promise<void> {
  if (!getAccessToken()) {
    throw new ApiError('Not authenticated. Please log in.', 401, 'NOT_AUTHENTICATED');
  }

  await tryFetchJson(`/api/messaging/api/v1/messages`, {
    method: 'POST',
    body: JSON.stringify({
      conversationId,
      content,
      messageType: 'TEXT',
    }),
  });
}

export async function markConversationRead(conversationId: string): Promise<void> {
  if (!getAccessToken()) {
    throw new ApiError('Not authenticated. Please log in.', 401, 'NOT_AUTHENTICATED');
  }

  const messages = await listMessages(conversationId);
  const last = messages.length > 0 ? messages[messages.length - 1] : null;
  if (!last?.id) return;

  await tryFetchJson(`/api/messaging/api/v1/messages/read-up-to`, {
    method: 'POST',
    body: JSON.stringify({
      conversationId,
      upToMessageId: last.id,
    }),
  });
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
  if (!getAccessToken()) {
    throw new ApiError('Not authenticated. Please log in.', 401, 'NOT_AUTHENTICATED');
  }

  // Fetch request details from the requests service
  const req = await tryFetchJson<any>(`/api/requests/api/v1/requests/${requestId}`);
  if (!req) return null;

  // Try to fetch user details if available
  let client: TravelRequestDetails['client'] = null;
  if (req.user_id || req.userId) {
    try {
      const user = await tryFetchJson<any>(`/api/identity/api/v1/users/${req.user_id || req.userId}`);
      if (user) {
        client = {
          firstName: user.first_name ?? user.firstName ?? '',
          lastName: user.last_name ?? user.lastName ?? '',
          email: user.email ?? '',
          avatarUrl: user.avatar_url ?? user.avatarUrl ?? null,
        };
      }
    } catch {
      // User info not available, continue without it
    }
  }

  return {
    id: req.id,
    userId: req.user_id ?? req.userId,
    title: req.title,
    description: req.description ?? null,
    destination: req.destination,
    departureDate: req.departure_date ?? req.departureDate,
    returnDate: req.return_date ?? req.returnDate,
    budgetMin: req.budget_min ?? req.budgetMin ?? null,
    budgetMax: req.budget_max ?? req.budgetMax ?? null,
    budgetCurrency: req.budget_currency ?? req.budgetCurrency ?? null,
    travelers: req.travelers,
    travelStyle: req.travel_style ?? req.travelStyle ?? null,
    preferences: req.preferences,
    state: req.state,
    createdAt: req.created_at ?? req.createdAt,
    expiresAt: req.expires_at ?? req.expiresAt ?? null,
    client,
  };
}

export async function getAgentMatchForRequest(agentId: string, requestId: string): Promise<AgentMatchForRequest | null> {
  if (!getAccessToken()) {
    throw new ApiError('Not authenticated. Please log in.', 401, 'NOT_AUTHENTICATED');
  }

  // Fetch all matches for this agent, then find the one for this request
  const matches = await tryFetchJson<any[]>(`/api/matching/api/v1/matches`);
  const match = matches?.find((m) => (m.agent_id === agentId || m.agentId === agentId) && (m.request_id === requestId || m.requestId === requestId)) ?? null;
  if (!match) return null;

  return {
    matchId: match.id,
    status: match.status,
    matchScore: match.match_score ?? match.matchScore ?? null,
    matchedAt: match.matched_at ?? match.matchedAt ?? null,
    expiresAt: match.expires_at ?? match.expiresAt ?? null,
  };
}

// ============================================================================
// BOOKINGS
// ============================================================================

export type AgentBooking = {
  id: string;
  bookingNumber: string | null;
  userId: string;
  agentId: string;
  itineraryId: string | null;
  requestId: string | null;
  state: string;
  paymentState: string;
  tripStartDate: string | null;
  tripEndDate: string | null;
  destinationCity: string | null;
  destinationCountry: string | null;
  travelerCount: number | null;
  totalAmountCents: number;
  agentPayoutCents: number | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Client details (fetched via join or populated separately)
  client?: {
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  };
};

/**
 * List bookings for the authenticated agent.
 * Backend determines agent from JWT token.
 */
export async function listAgentBookings(options?: {
  limit?: number;
  offset?: number;
  status?: string;
}): Promise<AgentBooking[]> {
  if (!getAccessToken()) {
    throw new ApiError('Not authenticated. Please log in.', 401, 'NOT_AUTHENTICATED');
  }

  const { limit = 20, offset = 0, status } = options ?? {};
  const queryParams = new URLSearchParams();
  queryParams.set('limit', String(limit));
  queryParams.set('offset', String(offset));
  if (status) {
    queryParams.set('status', status);
  }

  const result = await tryFetchJson<{
    success: boolean;
    data: {
      bookings: Array<{
        id: string;
        bookingNumber: string | null;
        userId: string;
        agentId: string;
        itineraryId: string | null;
        requestId: string | null;
        state: string;
        paymentState: string;
        tripStartDate: string | null;
        tripEndDate: string | null;
        destinationCity: string | null;
        destinationCountry: string | null;
        travelerCount: number | null;
        basePriceCents: number;
        bookingFeeCents: number;
        platformCommissionCents: number;
        totalAmountCents: number;
        agentPayoutCents: number | null;
        cancellationReason: string | null;
        cancelledAt: string | null;
        agentConfirmedAt: string | null;
        tripCompletedAt: string | null;
        createdAt: string;
        updatedAt: string;
      }>;
      pagination: { limit: number; offset: number; hasMore: boolean };
    };
  }>(`/api/booking-payments/api/v1/bookings?${queryParams.toString()}`);

  const bookings = result?.data?.bookings ?? [];

  return bookings.map((b) => ({
    id: b.id,
    bookingNumber: b.bookingNumber,
    userId: b.userId,
    agentId: b.agentId,
    itineraryId: b.itineraryId,
    requestId: b.requestId,
    state: b.state?.toLowerCase?.() ?? String(b.state ?? ''),
    paymentState: b.paymentState?.toLowerCase?.() ?? 'pending',
    tripStartDate: b.tripStartDate,
    tripEndDate: b.tripEndDate,
    destinationCity: b.destinationCity,
    destinationCountry: b.destinationCountry,
    travelerCount: b.travelerCount,
    totalAmountCents: b.totalAmountCents ?? 0,
    agentPayoutCents: b.agentPayoutCents,
    cancellationReason: b.cancellationReason,
    cancelledAt: b.cancelledAt,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  }));
}

/**
 * Get a single booking by ID for the authenticated agent.
 */
export async function getAgentBookingById(bookingId: string): Promise<AgentBooking | null> {
  if (!getAccessToken()) {
    throw new ApiError('Not authenticated. Please log in.', 401, 'NOT_AUTHENTICATED');
  }

  const result = await tryFetchJson<{
    success: boolean;
    data: {
      id: string;
      bookingNumber: string | null;
      userId: string;
      agentId: string;
      itineraryId: string | null;
      requestId: string | null;
      state: string;
      paymentState: string;
      tripStartDate: string | null;
      tripEndDate: string | null;
      destinationCity: string | null;
      destinationCountry: string | null;
      travelerCount: number | null;
      totalAmountCents: number;
      agentPayoutCents: number | null;
      cancellationReason: string | null;
      cancelledAt: string | null;
      createdAt: string;
      updatedAt: string;
    };
  }>(`/api/booking-payments/api/v1/bookings/${encodeURIComponent(bookingId)}`);

  const b = result?.data;
  if (!b) return null;

  return {
    id: b.id,
    bookingNumber: b.bookingNumber,
    userId: b.userId,
    agentId: b.agentId,
    itineraryId: b.itineraryId,
    requestId: b.requestId,
    state: b.state?.toLowerCase?.() ?? String(b.state ?? ''),
    paymentState: b.paymentState?.toLowerCase?.() ?? 'pending',
    tripStartDate: b.tripStartDate,
    tripEndDate: b.tripEndDate,
    destinationCity: b.destinationCity,
    destinationCountry: b.destinationCountry,
    travelerCount: b.travelerCount,
    totalAmountCents: b.totalAmountCents ?? 0,
    agentPayoutCents: b.agentPayoutCents,
    cancellationReason: b.cancellationReason,
    cancelledAt: b.cancelledAt,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

// ============================================================================
// REVIEWS
// ============================================================================

export type AgentReview = {
  id: string;
  reviewerId: string;
  reviewerType: string;
  subjectId: string;
  subjectType: string;
  bookingId: string | null;
  rating: number;
  title: string | null;
  content: string | null;
  aspects: {
    communication?: number;
    knowledge?: number;
    valueForMoney?: number;
    responsiveness?: number;
  } | null;
  status: string;
  reviewerDisplayName: string | null;
  destination: string | null;
  createdAt: string;
  publishedAt: string | null;
  response: {
    content: string;
    createdAt: string;
  } | null;
};

/**
 * List reviews received by the agent.
 * Backend derives agent from JWT token.
 */
export async function listAgentReviews(): Promise<AgentReview[]> {
  if (!getAccessToken()) {
    throw new ApiError('Not authenticated. Please log in.', 401, 'NOT_AUTHENTICATED');
  }

  const result = await tryFetchJson<{
    given: any[];
    received: Array<{
      id: string;
      reviewerId: string;
      reviewerType: string;
      subjectId: string;
      subjectType: string;
      bookingId: string | null;
      rating: number;
      title: string | null;
      content: string | null;
      aspects: any;
      status: string;
      createdAt: string;
      publishedAt: string | null;
      agentResponse?: {
        content: string;
        createdAt: string;
      } | null;
    }>;
  }>('/api/reviews/api/v1/reviews/my');

  const received = result?.received ?? [];

  return received.map((r) => ({
    id: r.id,
    reviewerId: r.reviewerId,
    reviewerType: r.reviewerType?.toLowerCase?.() ?? 'traveler',
    subjectId: r.subjectId,
    subjectType: r.subjectType?.toLowerCase?.() ?? 'agent',
    bookingId: r.bookingId,
    rating: r.rating ?? 5,
    title: r.title,
    content: r.content,
    aspects: r.aspects ?? null,
    status: r.status?.toLowerCase?.() ?? 'published',
    reviewerDisplayName: null, // Would need to fetch from identity service
    destination: null, // Would need to fetch from booking data
    createdAt: r.createdAt,
    publishedAt: r.publishedAt,
    response: r.agentResponse ?? null,
  }));
}

/**
 * Submit a response to a review.
 */
export async function respondToReview(reviewId: string, content: string): Promise<void> {
  if (!getAccessToken()) {
    throw new ApiError('Not authenticated. Please log in.', 401, 'NOT_AUTHENTICATED');
  }

  await tryFetchJson(`/api/reviews/api/v1/reviews/${encodeURIComponent(reviewId)}/respond`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

// ============================================================================
// ITINERARY DATA
// ============================================================================

export type AgentItinerary = {
  id: string;
  requestId: string;
  agentId: string;
  travelerId: string;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | string;
  disclosureState: 'OBFUSCATED' | 'PARTIAL' | 'REVEALED' | string;
  overview: {
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
  pricing?: {
    currency: string;
    totalPrice: number;
    pricePerPerson?: number;
    depositAmount?: number;
    inclusions?: string[];
    exclusions?: string[];
    paymentTerms?: string;
  };
  items: Array<{
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
  version: number;
  termsAndConditions?: string;
  cancellationPolicy?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  approvedAt?: string;
  disclosedAt?: string;
  // Virtual fields for display
  client?: {
    firstName: string;
    lastName: string;
  };
  viewCount?: number;
  rating?: number | null;
};

export type ListItinerariesOptions = {
  requestId?: string;
  status?: string;
  page?: number;
  limit?: number;
};

/**
 * List itineraries for the current agent.
 */
export async function listAgentItineraries(options: ListItinerariesOptions = {}): Promise<AgentItinerary[]> {
  if (!getAccessToken()) {
    throw new ApiError('Not authenticated. Please log in.', 401, 'NOT_AUTHENTICATED');
  }

  const params = new URLSearchParams();
  if (options.requestId) params.set('requestId', options.requestId);
  if (options.status) params.set('status', options.status);
  if (options.page) params.set('page', String(options.page));
  if (options.limit) params.set('limit', String(options.limit));

  const queryString = params.toString();
  const url = '/api/itineraries/api/v1/itineraries' + (queryString ? `?${queryString}` : '');

  const result = await tryFetchJson<{
    items: AgentItinerary[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>(url);

  return result?.items ?? [];
}

/**
 * Get a single itinerary by ID.
 */
export async function getAgentItineraryById(itineraryId: string): Promise<AgentItinerary | null> {
  if (!getAccessToken()) {
    throw new ApiError('Not authenticated. Please log in.', 401, 'NOT_AUTHENTICATED');
  }

  const result = await tryFetchJson<AgentItinerary>(
    `/api/itineraries/api/v1/itineraries/${encodeURIComponent(itineraryId)}`
  );
  return result ?? null;
}

export type CreateItineraryInput = {
  requestId: string;
  travelerId: string;
  overview: {
    title: string;
    summary?: string;
    startDate: string;
    endDate: string;
    numberOfDays: number;
    numberOfNights: number;
    destinations: string[];
    travelersCount?: number;
    tripType?: string;
  };
  pricing?: {
    currency?: string;
    totalPrice: number;
    pricePerPerson?: number;
    depositAmount?: number;
    inclusions?: string[];
    exclusions?: string[];
    paymentTerms?: string;
  };
  termsAndConditions?: string;
  cancellationPolicy?: string;
  internalNotes?: string;
};

/**
 * Create a new itinerary.
 */
export async function createItinerary(input: CreateItineraryInput): Promise<AgentItinerary | null> {
  if (!getAccessToken()) {
    throw new ApiError('Not authenticated. Please log in.', 401, 'NOT_AUTHENTICATED');
  }

  const result = await tryFetchJson<AgentItinerary>(
    '/api/itineraries/api/v1/itineraries',
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );
  return result ?? null;
}

export type UpdateItineraryInput = Partial<Omit<CreateItineraryInput, 'requestId' | 'travelerId'>>;

/**
 * Update an existing itinerary.
 */
export async function updateItinerary(itineraryId: string, input: UpdateItineraryInput): Promise<AgentItinerary | null> {
  if (!getAccessToken()) {
    throw new ApiError('Not authenticated. Please log in.', 401, 'NOT_AUTHENTICATED');
  }

  const result = await tryFetchJson<AgentItinerary>(
    `/api/itineraries/api/v1/itineraries/${encodeURIComponent(itineraryId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    }
  );
  return result ?? null;
}

/**
 * Change the status of an itinerary.
 */
export async function changeItineraryStatus(itineraryId: string, status: string): Promise<void> {
  if (!getAccessToken()) {
    throw new ApiError('Not authenticated. Please log in.', 401, 'NOT_AUTHENTICATED');
  }

  await tryFetchJson(
    `/api/itineraries/api/v1/itineraries/${encodeURIComponent(itineraryId)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }
  );
}

/**
 * Delete an itinerary (soft delete / cancel).
 */
export async function deleteItinerary(itineraryId: string): Promise<void> {
  if (!getAccessToken()) {
    throw new ApiError('Not authenticated. Please log in.', 401, 'NOT_AUTHENTICATED');
  }

  await changeItineraryStatus(itineraryId, 'CANCELLED');
}
