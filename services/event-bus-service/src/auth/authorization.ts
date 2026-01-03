/**
 * Authorization Layer
 * 
 * Controls which services can:
 * - Publish specific event types
 * - Subscribe to specific event types/domains
 * 
 * Authentication Options:
 * - mTLS (mutual TLS) - certificates identify services
 * - Signed tokens (JWT) - tokens identify services
 * - API keys - simple key-based auth
 */

import { Request, Response, NextFunction } from 'express';
import { EventDomain, EventTypes } from '../types/event.types';
import { logger } from '../utils/logger';

// ============================================================================
// AUTHORIZATION RULES
// ============================================================================

/**
 * Define which services can publish which event types
 */
const PUBLISH_RULES: Record<string, string[]> = {
  // Requests service
  'requests-service': [
    EventTypes.REQUESTS.REQUEST_CREATED,
    EventTypes.REQUESTS.REQUEST_UPDATED,
    EventTypes.REQUESTS.REQUEST_SUBMITTED,
    EventTypes.REQUESTS.REQUEST_CANCELLED,
    EventTypes.REQUESTS.REQUEST_EXPIRED,
  ],
  
  // Itineraries service
  'itineraries-service': [
    EventTypes.ITINERARIES.ITINERARY_CREATED,
    EventTypes.ITINERARIES.ITINERARY_UPDATED,
    EventTypes.ITINERARIES.ITINERARY_SUBMITTED,
    EventTypes.ITINERARIES.ITINERARY_ACCEPTED,
    EventTypes.ITINERARIES.ITINERARY_REJECTED,
    EventTypes.ITINERARIES.ITINERARY_REVISION_REQUESTED,
    EventTypes.ITINERARIES.ITINERARY_CANCELLED,
    EventTypes.ITINERARIES.ITINERARY_EXPIRED,
  ],
  
  // Matching service
  'matching-service': [
    EventTypes.MATCHING.AGENT_MATCHED,
    EventTypes.MATCHING.AGENT_ASSIGNED,
    EventTypes.MATCHING.AGENT_UNASSIGNED,
    EventTypes.MATCHING.MATCH_DECLINED,
  ],
  
  // Booking service
  'booking-payments-service': [
    EventTypes.BOOKINGS.BOOKING_CREATED,
    EventTypes.BOOKINGS.BOOKING_CONFIRMED,
    EventTypes.BOOKINGS.BOOKING_MODIFIED,
    EventTypes.BOOKINGS.BOOKING_CANCELLED,
    EventTypes.BOOKINGS.BOOKING_COMPLETED,
    EventTypes.PAYMENTS.PAYMENT_INITIATED,
    EventTypes.PAYMENTS.PAYMENT_COMPLETED,
    EventTypes.PAYMENTS.PAYMENT_FAILED,
    EventTypes.PAYMENTS.REFUND_INITIATED,
    EventTypes.PAYMENTS.REFUND_COMPLETED,
    EventTypes.PAYMENTS.PAYOUT_INITIATED,
    EventTypes.PAYMENTS.PAYOUT_COMPLETED,
  ],
  
  // Messaging service
  'messaging-service': [
    EventTypes.MESSAGING.MESSAGE_SENT,
    EventTypes.MESSAGING.MESSAGE_DELIVERED,
    EventTypes.MESSAGING.MESSAGE_READ,
    EventTypes.MESSAGING.CONVERSATION_CREATED,
    EventTypes.MESSAGING.CONVERSATION_CLOSED,
  ],
  
  // Disputes service
  'disputes-service': [
    EventTypes.DISPUTES.DISPUTE_OPENED,
    EventTypes.DISPUTES.DISPUTE_ESCALATED,
    EventTypes.DISPUTES.DISPUTE_RESOLVED,
    EventTypes.DISPUTES.DISPUTE_CLOSED,
  ],
  
  // Reviews service
  'reviews-service': [
    EventTypes.REVIEWS.REVIEW_SUBMITTED,
    EventTypes.REVIEWS.REVIEW_PUBLISHED,
    EventTypes.REVIEWS.REVIEW_FLAGGED,
    EventTypes.REVIEWS.REVIEW_REMOVED,
    EventTypes.REVIEWS.RESPONSE_ADDED,
  ],
  
  // Notifications service
  'notifications-service': [
    EventTypes.NOTIFICATIONS.NOTIFICATION_SENT,
    EventTypes.NOTIFICATIONS.NOTIFICATION_DELIVERED,
    EventTypes.NOTIFICATIONS.NOTIFICATION_FAILED,
    EventTypes.NOTIFICATIONS.NOTIFICATION_READ,
  ],
  
  // Identity service
  'identity-service': [
    EventTypes.IDENTITY.USER_REGISTERED,
    EventTypes.IDENTITY.USER_VERIFIED,
    EventTypes.IDENTITY.USER_PROFILE_UPDATED,
    EventTypes.IDENTITY.AGENT_PROFILE_CREATED,
    EventTypes.IDENTITY.AGENT_PROFILE_VERIFIED,
    EventTypes.IDENTITY.AGENT_PROFILE_SUSPENDED,
  ],
  
  // Audit service
  'audit-service': [
    EventTypes.AUDIT.AUDIT_LOG_CREATED,
    EventTypes.AUDIT.COMPLIANCE_CHECK_PASSED,
    EventTypes.AUDIT.COMPLIANCE_CHECK_FAILED,
    EventTypes.AUDIT.DATA_EXPORT_REQUESTED,
    EventTypes.AUDIT.DATA_EXPORT_COMPLETED,
  ],
  
  // API Gateway (can publish some events)
  'api-gateway': [
    EventTypes.IDENTITY.USER_REGISTERED,
    EventTypes.IDENTITY.USER_PROFILE_UPDATED,
  ],
};

/**
 * Define which services can subscribe to which domains/events
 */
const SUBSCRIBE_RULES: Record<string, string[]> = {
  // Requests service can listen to itineraries, matching
  'requests-service': [
    `${EventDomain.ITINERARIES}.*`,
    `${EventDomain.MATCHING}.*`,
  ],
  
  // Itineraries service can listen to requests, bookings
  'itineraries-service': [
    `${EventDomain.REQUESTS}.*`,
    `${EventDomain.BOOKINGS}.*`,
  ],
  
  // Matching service can listen to requests, identity
  'matching-service': [
    `${EventDomain.REQUESTS}.*`,
    `${EventDomain.IDENTITY}.*`,
  ],
  
  // Booking service can listen to itineraries, payments
  'booking-payments-service': [
    `${EventDomain.ITINERARIES}.*`,
    `${EventDomain.PAYMENTS}.*`,
  ],
  
  // Messaging service can listen to all domains (for context)
  'messaging-service': [
    `${EventDomain.REQUESTS}.*`,
    `${EventDomain.ITINERARIES}.*`,
    `${EventDomain.BOOKINGS}.*`,
    `${EventDomain.DISPUTES}.*`,
  ],
  
  // Disputes service can listen to bookings, payments, messaging
  'disputes-service': [
    `${EventDomain.BOOKINGS}.*`,
    `${EventDomain.PAYMENTS}.*`,
    `${EventDomain.MESSAGING}.*`,
  ],
  
  // Reviews service can listen to bookings
  'reviews-service': [
    `${EventDomain.BOOKINGS}.*`,
  ],
  
  // Notifications service can listen to everything (to send notifications)
  'notifications-service': [
    `${EventDomain.REQUESTS}.*`,
    `${EventDomain.ITINERARIES}.*`,
    `${EventDomain.MATCHING}.*`,
    `${EventDomain.BOOKINGS}.*`,
    `${EventDomain.PAYMENTS}.*`,
    `${EventDomain.MESSAGING}.*`,
    `${EventDomain.DISPUTES}.*`,
    `${EventDomain.REVIEWS}.*`,
    `${EventDomain.IDENTITY}.*`,
  ],
  
  // Audit service can listen to everything (for compliance)
  'audit-service': [
    `${EventDomain.REQUESTS}.*`,
    `${EventDomain.ITINERARIES}.*`,
    `${EventDomain.MATCHING}.*`,
    `${EventDomain.BOOKINGS}.*`,
    `${EventDomain.PAYMENTS}.*`,
    `${EventDomain.MESSAGING}.*`,
    `${EventDomain.DISPUTES}.*`,
    `${EventDomain.REVIEWS}.*`,
    `${EventDomain.NOTIFICATIONS}.*`,
    `${EventDomain.IDENTITY}.*`,
  ],
  
  // Identity service doesn't typically subscribe to events
  'identity-service': [],
};

// ============================================================================
// SERVICE AUTHENTICATION
// ============================================================================

export interface ServiceIdentity {
  service_name: string;
  authenticated: boolean;
  auth_method: 'api_key' | 'jwt' | 'mtls' | 'none';
}

/**
 * Extract service identity from request
 */
export function extractServiceIdentity(req: Request): ServiceIdentity {
  // Try API key first
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey) {
    const serviceName = validateApiKey(apiKey);
    if (serviceName) {
      return {
        service_name: serviceName,
        authenticated: true,
        auth_method: 'api_key',
      };
    }
  }
  
  // Try JWT token
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const serviceName = validateJwtToken(token);
    if (serviceName) {
      return {
        service_name: serviceName,
        authenticated: true,
        auth_method: 'jwt',
      };
    }
  }
  
  // Try mTLS (client certificate)
  const clientCert = (req as any).client?.getPeerCertificate?.();
  if (clientCert?.subject?.CN) {
    return {
      service_name: clientCert.subject.CN,
      authenticated: true,
      auth_method: 'mtls',
    };
  }
  
  // Development mode - allow service name header
  if (process.env.NODE_ENV === 'development') {
    const serviceName = req.headers['x-service-name'] as string;
    if (serviceName) {
      return {
        service_name: serviceName,
        authenticated: true,
        auth_method: 'none',
      };
    }
  }
  
  return {
    service_name: 'unknown',
    authenticated: false,
    auth_method: 'none',
  };
}

/**
 * Validate API key and return service name
 */
function validateApiKey(apiKey: string): string | null {
  // In production, look up API key in database or secrets manager
  // For now, use environment variables
  const apiKeys: Record<string, string> = {
    [process.env.REQUESTS_SERVICE_API_KEY || 'requests-key']: 'requests-service',
    [process.env.ITINERARIES_SERVICE_API_KEY || 'itineraries-key']: 'itineraries-service',
    [process.env.MATCHING_SERVICE_API_KEY || 'matching-key']: 'matching-service',
    [process.env.BOOKING_SERVICE_API_KEY || 'booking-key']: 'booking-payments-service',
    [process.env.MESSAGING_SERVICE_API_KEY || 'messaging-key']: 'messaging-service',
    [process.env.DISPUTES_SERVICE_API_KEY || 'disputes-key']: 'disputes-service',
    [process.env.REVIEWS_SERVICE_API_KEY || 'reviews-key']: 'reviews-service',
    [process.env.NOTIFICATIONS_SERVICE_API_KEY || 'notifications-key']: 'notifications-service',
    [process.env.IDENTITY_SERVICE_API_KEY || 'identity-key']: 'identity-service',
    [process.env.AUDIT_SERVICE_API_KEY || 'audit-key']: 'audit-service',
    [process.env.API_GATEWAY_API_KEY || 'gateway-key']: 'api-gateway',
  };
  
  return apiKeys[apiKey] || null;
}

/**
 * Validate JWT token and return service name
 */
function validateJwtToken(token: string): string | null {
  // In production, verify JWT signature and extract claims
  // For now, just decode and trust (NOT SECURE - for demo only)
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload.service_name || payload.sub || null;
  } catch {
    return null;
  }
}

// ============================================================================
// AUTHORIZATION CHECKS
// ============================================================================

/**
 * Check if service can publish an event type
 */
export function canPublish(serviceName: string, eventType: string): boolean {
  const allowedEvents = PUBLISH_RULES[serviceName] || [];
  return allowedEvents.includes(eventType);
}

/**
 * Check if service can subscribe to an event type
 */
export function canSubscribe(serviceName: string, eventType: string): boolean {
  const allowedPatterns = SUBSCRIBE_RULES[serviceName] || [];
  
  for (const pattern of allowedPatterns) {
    if (pattern.endsWith('.*')) {
      // Domain wildcard
      const domain = pattern.slice(0, -2);
      if (eventType.startsWith(`${domain}.`)) {
        return true;
      }
    } else if (pattern === eventType) {
      // Exact match
      return true;
    }
  }
  
  return false;
}

// ============================================================================
// EXPRESS MIDDLEWARE
// ============================================================================

/**
 * Authentication middleware
 */
export function authenticateService(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const identity = extractServiceIdentity(req);
  
  if (!identity.authenticated) {
    logger.warn('Unauthenticated request', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Service authentication required',
    });
    return;
  }
  
  // Attach identity to request
  (req as any).serviceIdentity = identity;
  
  next();
}

/**
 * Authorization middleware for publishing
 */
export function authorizePublish(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const identity: ServiceIdentity = (req as any).serviceIdentity;
  const eventType = req.body?.event_type;
  
  if (!identity) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  
  if (!eventType) {
    res.status(400).json({ error: 'Missing event_type' });
    return;
  }
  
  if (!canPublish(identity.service_name, eventType)) {
    logger.warn('Unauthorized publish attempt', {
      service: identity.service_name,
      event_type: eventType,
    });
    
    res.status(403).json({
      error: 'Forbidden',
      message: `Service ${identity.service_name} cannot publish ${eventType}`,
    });
    return;
  }
  
  next();
}

/**
 * Authorization middleware for subscribing
 */
export function authorizeSubscribe(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const identity: ServiceIdentity = (req as any).serviceIdentity;
  const eventTypes: string[] = req.body?.event_types || [];
  
  if (!identity) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  
  for (const eventType of eventTypes) {
    if (!canSubscribe(identity.service_name, eventType)) {
      logger.warn('Unauthorized subscribe attempt', {
        service: identity.service_name,
        event_type: eventType,
      });
      
      res.status(403).json({
        error: 'Forbidden',
        message: `Service ${identity.service_name} cannot subscribe to ${eventType}`,
      });
      return;
    }
  }
  
  next();
}

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

/**
 * Get all authorization rules (for admin/debugging)
 */
export function getAuthorizationRules(): {
  publish: typeof PUBLISH_RULES;
  subscribe: typeof SUBSCRIBE_RULES;
} {
  return {
    publish: { ...PUBLISH_RULES },
    subscribe: { ...SUBSCRIBE_RULES },
  };
}

/**
 * Get rules for a specific service
 */
export function getServiceRules(serviceName: string): {
  canPublish: string[];
  canSubscribe: string[];
} {
  return {
    canPublish: PUBLISH_RULES[serviceName] || [],
    canSubscribe: SUBSCRIBE_RULES[serviceName] || [],
  };
}
