/**
 * Itinerary Submission DTO
 * Data transfer object for agent itinerary submissions
 * 
 * Constitution rules enforced:
 * - Rule 6: Agents may submit via PDF, links, or free text
 * - Rule 7: Pre-payment itineraries MUST be obfuscated
 */

import type { ItinerarySubmissionFormat, ObfuscatedItineraryItem } from '../entities/itinerary-option';

/**
 * Itinerary Item Input DTO
 * Agent provides full details, system generates obfuscated version
 */
export interface ItineraryItemInputDTO {
  readonly dayNumber: number;
  readonly timeOfDay: 'morning' | 'afternoon' | 'evening' | 'full_day';
  readonly category: 'accommodation' | 'transport' | 'activity' | 'meal' | 'transfer';
  /** Full vendor name (will be hidden pre-payment) */
  readonly vendorName: string;
  /** Full address (will be hidden pre-payment) */
  readonly vendorAddress: string;
  readonly vendorPhone: string | null;
  readonly vendorEmail: string | null;
  readonly vendorWebsite: string | null;
  readonly bookingReference: string | null;
  /** Generic description for obfuscated view */
  readonly publicDescription: string;
  /** Area/neighborhood for obfuscated view */
  readonly locationArea: string;
  readonly durationMinutes: number | null;
  readonly starRating: number | null;
  readonly included: boolean;
  readonly cost: number;
  readonly notes: string | null;
}

/**
 * Itinerary Submission DTO
 * Constitution rule 6: Multiple submission formats supported
 */
export interface ItinerarySubmissionDTO {
  readonly requestId: string;
  readonly submissionFormat: ItinerarySubmissionFormat;
  readonly title: string;
  readonly summary: string;
  readonly highlights: readonly string[];
  readonly totalDays: number;
  
  /** Structured items - used when format is 'structured' */
  readonly structuredItems: readonly ItineraryItemInputDTO[] | null;
  
  /** PDF upload - used when format is 'pdf' (rule 6) */
  readonly pdfBase64: string | null;
  readonly pdfFileName: string | null;
  
  /** External links - used when format is 'link' (rule 6) */
  readonly externalLinks: readonly string[] | null;
  
  /** Free text content - used when format is 'free_text' (rule 6) */
  readonly freeTextContent: string | null;
  
  /** Pricing */
  readonly subtotalAmount: number;
  readonly currency: string;
  readonly validUntil: Date;
}

/**
 * Itinerary Submission Response DTO
 */
export interface ItinerarySubmissionResponseDTO {
  readonly itineraryId: string;
  readonly requestId: string;
  readonly submissionFormat: ItinerarySubmissionFormat;
  readonly pricing: {
    readonly subtotal: number;
    readonly platformCommission: number;
    readonly bookingFee: number;
    readonly totalPrice: number;
    readonly currency: string;
  };
  readonly createdAt: Date;
}

/**
 * Obfuscated Itinerary DTO (pre-payment view - rule 7)
 */
export interface ObfuscatedItineraryDTO {
  readonly id: string;
  readonly requestId: string;
  readonly agentId: string;
  readonly title: string;
  readonly summary: string;
  readonly highlights: readonly string[];
  readonly totalDays: number;
  readonly items: readonly ObfuscatedItineraryItem[];
  readonly pdfPreviewUrl: string | null;
  readonly pricing: {
    readonly subtotal: number;
    readonly platformCommission: number;
    readonly bookingFee: number;
    readonly totalPrice: number;
    readonly currency: string;
  };
  readonly validUntil: Date;
  readonly createdAt: Date;
}
