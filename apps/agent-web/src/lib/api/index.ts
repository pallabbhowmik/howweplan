/**
 * Agent Portal API Index
 * Re-exports all API modules
 */

export {
  apiClient,
  ApiClientError,
  NetworkError,
  TimeoutError,
  buildPaginationParams,
  type PaginationParams,
  type PaginatedResponse,
} from './client';

export {
  // Profile
  getAgentProfile,
  updateAgentProfile,
  getAgentStats,
  // Requests
  listAvailableRequests,
  getRequest,
  acceptRequest,
  declineRequest,
  getMyRequests,
  // Itineraries
  listItineraries,
  getItinerary,
  createItinerary,
  updateItinerary,
  submitItinerary,
  deleteItinerary,
  // Bookings
  listBookings,
  getBooking,
  // Messaging
  listConversations,
  getConversation,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  // Notifications
  listNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from './agent';

export type {
  AgentProfile,
  TravelRequest,
  Itinerary,
  Booking,
  Conversation,
  Message,
  AgentStats,
  Notification,
  RequestFilters,
  ItineraryFilters,
  BookingFilters,
  CreateItineraryData,
} from './agent';
