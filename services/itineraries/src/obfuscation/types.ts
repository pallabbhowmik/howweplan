import type { ItineraryItem, VendorInfo } from '../models/index.js';

/**
 * Obfuscation strategy interface.
 * Each strategy handles a specific type of sensitive data.
 */
export interface ObfuscationStrategy {
  /** Strategy identifier */
  readonly name: string;
  
  /** Check if this strategy applies to given content */
  applies(content: string, context?: ObfuscationContext): boolean;
  
  /** Obfuscate the content */
  obfuscate(content: string, context?: ObfuscationContext): string;
}

/**
 * Context provided to obfuscation strategies.
 */
export interface ObfuscationContext {
  /** Item type for context-aware obfuscation */
  itemType?: string;
  /** Star rating if known */
  starRating?: number;
  /** Category hint */
  category?: string;
  /** Transport mode if applicable */
  transportMode?: string;
}

/**
 * Result of obfuscation operation.
 */
export interface ObfuscationResult<T> {
  /** Obfuscated data */
  data: T;
  /** Whether any obfuscation was applied */
  wasObfuscated: boolean;
  /** List of fields that were obfuscated */
  obfuscatedFields: string[];
}

/**
 * Vendor obfuscation result.
 */
export interface ObfuscatedVendor {
  /** Generic category instead of name */
  category: string;
  /** Star rating preserved if available */
  starRating?: number;
  /** Contact info stripped */
  contactEmail?: string | undefined;
  contactPhone?: string | undefined;
  /** Booking references stripped */
  bookingReference?: string | undefined;
  confirmationNumber?: string | undefined;
  /** Original name hidden */
  name: string;
}

/**
 * Obfuscated itinerary item (subset of fields hidden).
 */
export interface ObfuscatedItineraryItem extends Omit<ItineraryItem, 'vendor' | 'agentNotes'> {
  vendor?: ObfuscatedVendor;
  /** Agent notes never shown to travelers pre-payment */
  agentNotes?: string | undefined;
}

/**
 * Full obfuscation configuration.
 */
export interface ObfuscationConfig {
  /** Whether to obfuscate hotel names */
  obfuscateHotels: boolean;
  /** Whether to obfuscate vendor names */
  obfuscateVendors: boolean;
  /** Whether to obfuscate booking references */
  obfuscateReferences: boolean;
  /** Whether to obfuscate contact information */
  obfuscateContacts: boolean;
  /** Whether to obfuscate exact addresses */
  obfuscateAddresses: boolean;
  /** Whether to obfuscate prices */
  obfuscatePrices: boolean;
  /** Custom replacement mappings */
  customReplacements?: Record<string, string>;
}

/**
 * Default obfuscation configuration.
 * All sensitive data is obfuscated by default.
 */
export const DEFAULT_OBFUSCATION_CONFIG: ObfuscationConfig = {
  obfuscateHotels: true,
  obfuscateVendors: true,
  obfuscateReferences: true,
  obfuscateContacts: true,
  obfuscateAddresses: true,
  obfuscatePrices: false, // Prices are usually okay to show
};
