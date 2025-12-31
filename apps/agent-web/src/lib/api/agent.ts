/**
 * Agent API Module
 * 
 * Handles all agent-specific API operations including profile management,
 * requests, itineraries, and bookings.
 */

import { apiClient, buildPaginationParams, type PaginationParams, type PaginatedResponse } from './client';

// ============================================================================
// TYPES
// ============================================================================

export interface AgentProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  bio: string;
  specializations: string[];
  languages: string[];
  destinations: string[];
  yearsOfExperience: number;
  agencyName: string | null;
  commissionRate: number;
  rating: number | null;
  totalReviews: number;
  completedBookings: number;
  responseTimeMinutes: number | null;
  isVerified: boolean;
  isActive: boolean;
}

export interface TravelRequest {
  id: string;
  userId: string;
  state: string;
  title: string;
  description: string;
  destinations: Array<{
    country: string;
    city: string | null;
    region: string | null;
    flexibility: string;
  }>;
  dates: {
    startDate: string;
    endDate: string;
    flexibility: string;
  };
  budget: {
    minAmount: number;
    maxAmount: number;
    currency: string;
    includesFlights: boolean;
    includesAccommodation: boolean;
    includesActivities: boolean;
  };
  travelers: {
    adults: number;
    children: number;
    childrenAges: number[];
    infants: number;
  };
  preferences: {
    accommodationType: string[];
    accommodationStars: number[];
    interests: string[];
    dietaryRestrictions: string[];
    accessibilityNeeds: string[];
    travelStyle: string;
    pacePreference: string;
  };
  matchedAgentIds: string[];
  selectedAgentId: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  // Client info (obfuscated pre-confirmation)
  client?: {
    firstName: string;
    avatarUrl: string | null;
  };
}

export interface Itinerary {
  id: string;
  requestId: string;
  agentId: string;
  submissionFormat: 'pdf' | 'link' | 'free_text' | 'structured';
  title: string;
  summary: string;
  highlights: string[];
  totalDays: number;
  pdfUrl: string | null;
  externalLinks: string[];
  freeTextContent: string | null;
  pricing: {
    subtotal: number;
    platformCommission: number;
    bookingFee: number;
    totalPrice: number;
    currency: string;
    commissionRate: number;
  };
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'revision_requested' | 'rejected';
  validUntil: string;
  isSelected: boolean;
  createdAt: string;
  updatedAt: string;
  request?: TravelRequest;
}

export interface Booking {
  id: string;
  requestId: string;
  itineraryId: string;
  userId: string;
  agentId: string;
  state: string;
  financials: {
    subtotal: number;
    platformCommission: number;
    bookingFee: number;
    totalCharged: number;
    currency: string;
    agentPayout: number;
    platformRevenue: number;
    refundedAmount: number;
    netRevenue: number;
  };
  timeline: {
    createdAt: string;
    confirmedAt: string | null;
    paidAt: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
  };
  travelStartDate: string;
  travelEndDate: string;
  client?: {
    firstName: string;
    lastName?: string;
    avatarUrl: string | null;
    email?: string;
    phone?: string;
  };
  itinerary?: Itinerary;
}

export interface Conversation {
  id: string;
  requestId: string;
  userId: string;
  agentId: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  isActive: boolean;
  client?: {
    firstName: string;
    avatarUrl: string | null;
  };
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: 'user' | 'agent' | 'system';
  type: 'text' | 'image' | 'file' | 'itinerary_link' | 'system';
  content: string;
  attachments: Array<{
    id: string;
    type: string;
    url: string;
    fileName: string;
    fileSize: number;
  }>;
  isRead: boolean;
  createdAt: string;
}

export interface AgentStats {
  pendingRequests: number;
  activeBookings: number;
  completedBookings: number;
  totalCommission: number;
  thisMonthCommission: number;
  averageRating: number;
  totalReviews: number;
  responseRate: number;
  acceptanceRate: number;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface RequestFilters {
  status?: string;
  destination?: string;
  minBudget?: number;
  maxBudget?: number;
  startDateFrom?: string;
  startDateTo?: string;
  travelStyle?: string;
}

export interface ItineraryFilters {
  status?: string;
  requestId?: string;
}

export interface BookingFilters {
  status?: string;
  startDateFrom?: string;
  startDateTo?: string;
}

// ============================================================================
// AGENT PROFILE APIs
// ============================================================================

export async function getAgentProfile(): Promise<AgentProfile> {
  return apiClient.get<AgentProfile>('/agents/me');
}

export async function updateAgentProfile(data: Partial<AgentProfile>): Promise<AgentProfile> {
  return apiClient.patch<AgentProfile>('/agents/me', data);
}

export async function getAgentStats(): Promise<AgentStats> {
  return apiClient.get<AgentStats>('/agents/me/stats');
}

// ============================================================================
// REQUESTS APIs
// ============================================================================

export async function listAvailableRequests(
  filters?: RequestFilters,
  pagination?: PaginationParams
): Promise<PaginatedResponse<TravelRequest>> {
  return apiClient.get<PaginatedResponse<TravelRequest>>('/agents/requests', {
    params: {
      ...filters,
      ...buildPaginationParams(pagination || {}),
    },
  });
}

export async function getRequest(id: string): Promise<TravelRequest> {
  return apiClient.get<TravelRequest>(`/agents/requests/${id}`);
}

export async function acceptRequest(requestId: string): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>(`/agents/requests/${requestId}/accept`);
}

export async function declineRequest(requestId: string, reason?: string): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>(`/agents/requests/${requestId}/decline`, { reason });
}

export async function getMyRequests(
  filters?: RequestFilters,
  pagination?: PaginationParams
): Promise<PaginatedResponse<TravelRequest>> {
  return apiClient.get<PaginatedResponse<TravelRequest>>('/agents/my-requests', {
    params: {
      ...filters,
      ...buildPaginationParams(pagination || {}),
    },
  });
}

// ============================================================================
// ITINERARY APIs
// ============================================================================

export async function listItineraries(
  filters?: ItineraryFilters,
  pagination?: PaginationParams
): Promise<PaginatedResponse<Itinerary>> {
  return apiClient.get<PaginatedResponse<Itinerary>>('/agents/itineraries', {
    params: {
      ...filters,
      ...buildPaginationParams(pagination || {}),
    },
  });
}

export async function getItinerary(id: string): Promise<Itinerary> {
  return apiClient.get<Itinerary>(`/agents/itineraries/${id}`);
}

export interface CreateItineraryData {
  requestId: string;
  title: string;
  summary: string;
  highlights: string[];
  totalDays: number;
  submissionFormat: 'pdf' | 'link' | 'free_text' | 'structured';
  pdfUrl?: string;
  externalLinks?: string[];
  freeTextContent?: string;
  pricing: {
    subtotal: number;
    currency: string;
  };
}

export async function createItinerary(data: CreateItineraryData): Promise<Itinerary> {
  return apiClient.post<Itinerary>('/agents/itineraries', data);
}

export async function updateItinerary(id: string, data: Partial<CreateItineraryData>): Promise<Itinerary> {
  return apiClient.patch<Itinerary>(`/agents/itineraries/${id}`, data);
}

export async function submitItinerary(id: string): Promise<Itinerary> {
  return apiClient.post<Itinerary>(`/agents/itineraries/${id}/submit`);
}

export async function deleteItinerary(id: string): Promise<{ success: boolean }> {
  return apiClient.delete<{ success: boolean }>(`/agents/itineraries/${id}`);
}

// ============================================================================
// BOOKING APIs
// ============================================================================

export async function listBookings(
  filters?: BookingFilters,
  pagination?: PaginationParams
): Promise<PaginatedResponse<Booking>> {
  return apiClient.get<PaginatedResponse<Booking>>('/agents/bookings', {
    params: {
      ...filters,
      ...buildPaginationParams(pagination || {}),
    },
  });
}

export async function getBooking(id: string): Promise<Booking> {
  return apiClient.get<Booking>(`/agents/bookings/${id}`);
}

// ============================================================================
// MESSAGING APIs
// ============================================================================

export async function listConversations(pagination?: PaginationParams): Promise<PaginatedResponse<Conversation>> {
  return apiClient.get<PaginatedResponse<Conversation>>('/agents/conversations', {
    params: buildPaginationParams(pagination || {}),
  });
}

export async function getConversation(id: string): Promise<Conversation> {
  return apiClient.get<Conversation>(`/agents/conversations/${id}`);
}

export async function getMessages(conversationId: string, pagination?: PaginationParams): Promise<PaginatedResponse<Message>> {
  return apiClient.get<PaginatedResponse<Message>>(`/agents/conversations/${conversationId}/messages`, {
    params: buildPaginationParams(pagination || {}),
  });
}

export async function sendMessage(conversationId: string, content: string, attachments?: File[]): Promise<Message> {
  return apiClient.post<Message>(`/agents/conversations/${conversationId}/messages`, {
    content,
    type: 'text',
  });
}

export async function markMessagesAsRead(conversationId: string): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>(`/agents/conversations/${conversationId}/read`);
}

// ============================================================================
// NOTIFICATION APIs
// ============================================================================

export async function listNotifications(pagination?: PaginationParams): Promise<PaginatedResponse<Notification>> {
  return apiClient.get<PaginatedResponse<Notification>>('/agents/notifications', {
    params: buildPaginationParams(pagination || {}),
  });
}

export async function markNotificationAsRead(id: string): Promise<{ success: boolean }> {
  return apiClient.patch<{ success: boolean }>(`/agents/notifications/${id}/read`);
}

export async function markAllNotificationsAsRead(): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>('/agents/notifications/read-all');
}
