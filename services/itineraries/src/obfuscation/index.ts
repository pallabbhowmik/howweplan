// Engine
export { 
  ObfuscationEngine, 
  defaultObfuscationEngine,
  obfuscateItinerary,
  getItineraryView,
} from './engine.js';

// Types
export type {
  ObfuscationStrategy,
  ObfuscationContext,
  ObfuscationResult,
  ObfuscationConfig,
  ObfuscatedVendor,
  ObfuscatedItineraryItem,
} from './types.js';
export { DEFAULT_OBFUSCATION_CONFIG } from './types.js';

// Patterns
export {
  HOTEL_BRAND_PATTERNS,
  TRANSPORT_BRAND_PATTERNS,
  VENDOR_PATTERNS,
  BOOKING_REFERENCE_PATTERNS,
  CONTACT_PATTERNS,
  ADDRESS_PATTERNS,
  OBFUSCATION_REPLACEMENTS,
  ALL_SENSITIVE_PATTERNS,
  type ObfuscationReplacement,
} from './patterns.js';

// Strategies
export {
  HotelObfuscationStrategy,
  VendorObfuscationStrategy,
  ReferenceObfuscationStrategy,
  ContactObfuscationStrategy,
  AddressObfuscationStrategy,
  containsHotelName,
  containsVendorName,
  containsReference,
  containsContact,
  containsAddress,
  extractHotelNames,
  extractVendorNames,
  extractReferences,
} from './strategies/index.js';
