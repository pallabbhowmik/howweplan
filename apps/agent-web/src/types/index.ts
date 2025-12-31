/**
 * Agent Portal Type Definitions
 */

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// ============================================================================
// REQUEST STATES
// ============================================================================

export type RequestState =
  | 'draft'
  | 'submitted'
  | 'matching'
  | 'agents_matched'
  | 'agent_confirmed'
  | 'itinerary_pending'
  | 'itinerary_submitted'
  | 'itinerary_approved'
  | 'payment_pending'
  | 'completed'
  | 'cancelled'
  | 'expired';

// ============================================================================
// BOOKING STATES
// ============================================================================

export type BookingState =
  | 'pending_payment'
  | 'payment_processing'
  | 'payment_failed'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'refund_requested'
  | 'refund_processing'
  | 'refunded'
  | 'disputed';

// ============================================================================
// ITINERARY STATES
// ============================================================================

export type ItineraryStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'revision_requested'
  | 'rejected';

// ============================================================================
// UI COMPONENT PROPS
// ============================================================================

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface SortOption {
  value: string;
  label: string;
  direction: 'asc' | 'desc';
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface ItineraryFormData {
  requestId: string;
  title: string;
  summary: string;
  highlights: string[];
  totalDays: number;
  submissionFormat: 'pdf' | 'link' | 'free_text' | 'structured';
  pdfFile?: File;
  pdfUrl?: string;
  externalLinks: string[];
  freeTextContent: string;
  pricing: {
    subtotal: number;
    currency: string;
  };
}

export interface ProfileFormData {
  firstName: string;
  lastName: string;
  bio: string;
  specializations: string[];
  languages: string[];
  destinations: string[];
  yearsOfExperience: number;
  agencyName: string;
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface DashboardStats {
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

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export type NotificationType =
  | 'new_request'
  | 'request_accepted'
  | 'itinerary_approved'
  | 'itinerary_revision'
  | 'booking_confirmed'
  | 'payment_received'
  | 'new_message'
  | 'review_received'
  | 'system';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  data?: Record<string, unknown>;
}
