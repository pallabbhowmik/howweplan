/**
 * Itinerary Option Entity
 * Represents an itinerary submitted by an agent
 * 
 * Constitution rules enforced:
 * - Rule 6: Agents may submit via PDF, links, or free text
 * - Rule 7: Pre-payment itineraries MUST be obfuscated and non-executable
 * - Rule 8: Exact names/vendors/references revealed ONLY after payment
 */

export type ItinerarySubmissionFormat = 'pdf' | 'link' | 'free_text' | 'structured';

/**
 * Obfuscated itinerary item (pre-payment view - constitution rule 7)
 * No exact hotel names, vendors, or booking references
 */
export interface ObfuscatedItineraryItem {
  readonly id: string;
  readonly dayNumber: number;
  readonly timeOfDay: 'morning' | 'afternoon' | 'evening' | 'full_day';
  readonly category: 'accommodation' | 'transport' | 'activity' | 'meal' | 'transfer';
  readonly description: string; // Generic description, no vendor names
  readonly locationArea: string; // Area/neighborhood only, not exact address
  readonly durationMinutes: number | null;
  readonly starRating: number | null; // For accommodations
  readonly included: boolean;
  readonly estimatedCost: number | null;
}

/**
 * Full itinerary item (post-payment view - constitution rule 8)
 * Includes exact vendor names, addresses, and booking references
 */
export interface RevealedItineraryItem {
  readonly id: string;
  readonly dayNumber: number;
  readonly timeOfDay: 'morning' | 'afternoon' | 'evening' | 'full_day';
  readonly category: 'accommodation' | 'transport' | 'activity' | 'meal' | 'transfer';
  readonly description: string;
  readonly vendorName: string;
  readonly vendorAddress: string;
  readonly vendorPhone: string | null;
  readonly vendorEmail: string | null;
  readonly vendorWebsite: string | null;
  readonly bookingReference: string | null;
  readonly confirmationNumber: string | null;
  readonly locationCoordinates: { lat: number; lng: number } | null;
  readonly durationMinutes: number | null;
  readonly starRating: number | null;
  readonly included: boolean;
  readonly actualCost: number;
  readonly notes: string | null;
}

export interface ItineraryPricing {
  readonly subtotal: number;
  readonly platformCommission: number; // 8-12% as per constitution rule 3
  readonly bookingFee: number; // Payment processing fee passed to user (rule 2)
  readonly totalPrice: number;
  readonly currency: string;
  readonly commissionRate: number;
}

export interface ItineraryOption {
  readonly id: string;
  readonly requestId: string;
  readonly agentId: string;
  readonly submissionFormat: ItinerarySubmissionFormat;
  readonly title: string;
  readonly summary: string;
  readonly highlights: readonly string[];
  readonly totalDays: number;
  readonly obfuscatedItems: readonly ObfuscatedItineraryItem[];
  readonly revealedItems: readonly RevealedItineraryItem[] | null; // null until payment
  readonly pdfUrl: string | null;
  readonly externalLinks: readonly string[];
  readonly freeTextContent: string | null;
  readonly pricing: ItineraryPricing;
  readonly validUntil: Date;
  readonly isSelected: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
