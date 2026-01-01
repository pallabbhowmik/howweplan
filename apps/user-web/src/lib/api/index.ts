/**
 * API Module Exports
 * 
 * Central export point for all API-related utilities.
 */

// Service URL configuration
export {
  getServiceUrl,
  getAllServiceUrls,
  isUsingGateway,
  IDENTITY_URL,
  REQUESTS_URL,
  ITINERARIES_URL,
  MATCHING_URL,
  BOOKING_PAYMENTS_URL,
  MESSAGING_URL,
  NOTIFICATIONS_URL,
  DISPUTES_URL,
  AUDIT_URL,
  REVIEWS_URL,
  type ServiceName,
} from './services';

// Authentication
export {
  login,
  register,
  logout,
  refreshToken,
  storeAuthTokens,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  clearAuthData,
  AuthError,
  type AuthUser,
  type AuthResponse,
  type LoginParams,
  type RegisterParams,
} from './auth';

// API Client
export {
  apiRequest,
  serviceRequest,
  identityApi,
  requestsApi,
  itinerariesApi,
  matchingApi,
  bookingPaymentsApi,
  messagingApi,
  notificationsApi,
  disputesApi,
  reviewsApi,
  type ApiRequestOptions,
  type ApiError,
} from './client';
