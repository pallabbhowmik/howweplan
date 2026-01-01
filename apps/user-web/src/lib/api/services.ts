/**
 * Service API Configuration
 * 
 * This module provides URLs for all backend microservices.
 * In production, requests can either go through an API gateway
 * or directly to individual services on Render.
 */

// API Gateway URL (if deployed)
const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL;

// Individual service URLs (fallback when no gateway)
const SERVICE_URLS = {
  identity: process.env.NEXT_PUBLIC_IDENTITY_URL || 'https://howweplan-identity.onrender.com',
  requests: process.env.NEXT_PUBLIC_REQUESTS_URL || 'https://howweplan-requests.onrender.com',
  itineraries: process.env.NEXT_PUBLIC_ITINERARIES_URL || 'https://howweplan-itineraries.onrender.com',
  matching: process.env.NEXT_PUBLIC_MATCHING_URL || 'https://howweplan-matching.onrender.com',
  bookingPayments: process.env.NEXT_PUBLIC_BOOKING_PAYMENTS_URL || 'https://howweplan-booking-payments.onrender.com',
  messaging: process.env.NEXT_PUBLIC_MESSAGING_URL || 'https://howweplan-messaging.onrender.com',
  notifications: process.env.NEXT_PUBLIC_NOTIFICATIONS_URL || 'https://howweplan-notifications.onrender.com',
  disputes: process.env.NEXT_PUBLIC_DISPUTES_URL || 'https://howweplan-disputes.onrender.com',
  audit: process.env.NEXT_PUBLIC_AUDIT_URL || 'https://howweplan-audit.onrender.com',
  reviews: process.env.NEXT_PUBLIC_REVIEWS_URL || 'https://howweplan-reviews.onrender.com',
} as const;

export type ServiceName = keyof typeof SERVICE_URLS;

/**
 * Get the base URL for a specific service.
 * 
 * If an API gateway is configured, routes through the gateway.
 * Otherwise, connects directly to the service on Render.
 */
export function getServiceUrl(service: ServiceName): string {
  // If API gateway is configured, use it
  if (API_GATEWAY_URL) {
    // Gateway routes: /api/identity, /api/requests, etc.
    const servicePath = service === 'bookingPayments' ? 'booking-payments' : service;
    return `${API_GATEWAY_URL}/api/${servicePath}`;
  }
  
  // Direct connection to service
  return SERVICE_URLS[service];
}

/**
 * Get all service URLs (for debugging/health checks)
 */
export function getAllServiceUrls(): Record<ServiceName, string> {
  return Object.keys(SERVICE_URLS).reduce((acc, key) => {
    acc[key as ServiceName] = getServiceUrl(key as ServiceName);
    return acc;
  }, {} as Record<ServiceName, string>);
}

/**
 * Check if using API gateway
 */
export function isUsingGateway(): boolean {
  return !!API_GATEWAY_URL;
}

// Export individual service URLs for convenience
export const IDENTITY_URL = getServiceUrl('identity');
export const REQUESTS_URL = getServiceUrl('requests');
export const ITINERARIES_URL = getServiceUrl('itineraries');
export const MATCHING_URL = getServiceUrl('matching');
export const BOOKING_PAYMENTS_URL = getServiceUrl('bookingPayments');
export const MESSAGING_URL = getServiceUrl('messaging');
export const NOTIFICATIONS_URL = getServiceUrl('notifications');
export const DISPUTES_URL = getServiceUrl('disputes');
export const AUDIT_URL = getServiceUrl('audit');
export const REVIEWS_URL = getServiceUrl('reviews');
