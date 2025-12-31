/**
 * @tripcomposer/contracts
 * 
 * Single source of truth for all inter-module communication.
 * Contains only TypeScript types and enums - no logic.
 * 
 * Constitution Compliance:
 * - Rule 1: Platform is Merchant of Record (enforced in Payment types)
 * - Rule 2: Payment processing fees passed to user (BookingFee in pricing)
 * - Rule 3: Commission only on completed bookings (COMMISSION_ELIGIBLE_STATES)
 * - Rule 4: No user planning fee (not present in any DTO)
 * - Rule 5: No AI-generated itineraries (not present in any DTO)
 * - Rule 6: Agent submission formats (PDF, links, free text)
 * - Rule 7: Pre-payment obfuscation (ObfuscatedItinerary types)
 * - Rule 8: Exact details post-payment only (RevealedItinerary types)
 * - Rule 9: Semi-blind agents pre-confirmation (ObfuscatedAgent)
 * - Rule 10: Full identity post-confirmation (RevealedAgent)
 * - Rule 11: Contact details post-payment (AgentContactDetails)
 * - Rule 12: Mandatory chat (chatRequirementMet flag)
 * - Rule 13: Subjective complaints non-refundable (isSubjectiveComplaint flag)
 * - Rule 14: Strict refund state machines (state transitions)
 * - Rule 15: Admin arbitration required (ADMIN_REQUIRED_STATES)
 * - Rule 18: Audit events for all state changes (AuditEvent entity)
 * 
 * @version 1.0.0
 */

// ============================================================================
// VERSION
// ============================================================================
export const CONTRACT_VERSION = '1.0.0' as const;

// ============================================================================
// ENTITIES
// ============================================================================
export * from './entities';

// ============================================================================
// STATE MACHINES
// ============================================================================
export * from './states';

// ============================================================================
// EVENTS
// ============================================================================
export * from './events';

// ============================================================================
// DTOs
// ============================================================================
export * from './dtos';
