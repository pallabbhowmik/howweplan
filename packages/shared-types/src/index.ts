/**
 * @tripcomposer/shared-types
 *
 * Shared TypeScript types for the HowWePlan monorepo.
 * This package provides common type definitions used across frontend and backend.
 *
 * @remarks
 * - Contains NO business logic
 * - Contains NO validation logic
 * - Contains NO side effects
 * - Safe to import in any environment (browser, Node.js, edge)
 *
 * @packageDocumentation
 */

// ============================================================================
// Primitives
// ============================================================================
export type {
  UUID,
  ISODateString,
  CurrencyCode,
  Money,
  Percentage,
  NonEmptyString,
  EmailAddress,
  URLString,
  PositiveInteger,
} from './primitives';

// ============================================================================
// View Models
// ============================================================================
export type {
  // Agent views
  ObfuscatedAgentProfile,
  PublicAgentStats,
  AgentContactInfo,
  // Itinerary views
  ObfuscatedItinerarySummary,
  RevealedItineraryDetails,
  ItineraryImage,
  DestinationDetails,
  GeoCoordinates,
  DayPlan,
  MealPlan,
  ActivityDetails,
  AccommodationDetails,
  TransportationDetails,
  SeasonalRecommendation,
  // Booking views
  BookingPriceBreakdown,
  PriceLineItem,
  DiscountItem,
  TaxItem,
} from './views';

// ============================================================================
// API Types
// ============================================================================
export type {
  // Pagination & filtering
  SortOrder,
  SortConfig,
  DateRange,
  PaginationRequest,
  PaginationMeta,
  PaginationResponse,
  ListRequest,
  // Error types
  FieldError,
  ApiErrorResponse,
  // Success types
  ApiSuccessResponse,
  ResponseMeta,
  ApiResponse,
  ApiEmptyResponse,
  ApiPaginatedResponse,
} from './api';

export { ApiErrorCode, isApiSuccess, isApiError } from './api';
