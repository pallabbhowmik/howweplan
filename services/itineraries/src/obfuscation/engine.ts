import type { 
  Itinerary, 
  ItineraryItem, 
  VendorInfo,
} from '../models/index.js';
import { DisclosureState, ItineraryItemType } from '../models/index.js';
import type { 
  ObfuscationConfig, 
  ObfuscationResult, 
  ObfuscationContext,
  ObfuscationStrategy,
  ObfuscatedVendor,
  ObfuscatedItineraryItem,
} from './types.js';
import { DEFAULT_OBFUSCATION_CONFIG } from './types.js';
import { OBFUSCATION_REPLACEMENTS } from './patterns.js';
import {
  HotelObfuscationStrategy,
  VendorObfuscationStrategy,
  ReferenceObfuscationStrategy,
  ContactObfuscationStrategy,
  AddressObfuscationStrategy,
} from './strategies/index.js';

/**
 * Obfuscation engine for itinerary data.
 * 
 * CORE BUSINESS RULES:
 * - Pre-payment itineraries MUST be obfuscated and non-executable
 * - No exact hotel names, vendors, or booking references pre-payment
 * - Exact details revealed ONLY after payment
 * - Original agent content MUST be preserved
 */
export class ObfuscationEngine {
  private readonly strategies: ObfuscationStrategy[];
  private readonly config: ObfuscationConfig;

  constructor(config: Partial<ObfuscationConfig> = {}) {
    this.config = { ...DEFAULT_OBFUSCATION_CONFIG, ...config };
    this.strategies = this.initializeStrategies();
  }

  /**
   * Initialize obfuscation strategies based on config.
   */
  private initializeStrategies(): ObfuscationStrategy[] {
    const strategies: ObfuscationStrategy[] = [];

    if (this.config.obfuscateHotels) {
      strategies.push(new HotelObfuscationStrategy());
    }
    if (this.config.obfuscateVendors) {
      strategies.push(new VendorObfuscationStrategy());
    }
    if (this.config.obfuscateReferences) {
      strategies.push(new ReferenceObfuscationStrategy());
    }
    if (this.config.obfuscateContacts) {
      strategies.push(new ContactObfuscationStrategy());
    }
    if (this.config.obfuscateAddresses) {
      strategies.push(new AddressObfuscationStrategy());
    }

    return strategies;
  }

  /**
   * Obfuscate an entire itinerary.
   * Returns a new itinerary object with sensitive data obfuscated.
   */
  obfuscateItinerary(itinerary: Itinerary): ObfuscationResult<Itinerary> {
    const obfuscatedFields: string[] = [];

    // Obfuscate items
    const itemResults = itinerary.items.map((item: ItineraryItem, index: number) => {
      const result = this.obfuscateItem(item);
      if (result.wasObfuscated) {
        result.obfuscatedFields.forEach(field => {
          obfuscatedFields.push(`items[${index}].${field}`);
        });
      }
      return result;
    });

    // Obfuscate text fields
    const overviewResult = this.obfuscateTextFields(itinerary.overview, 'overview');
    obfuscatedFields.push(...overviewResult.obfuscatedFields);

    // Build obfuscated itinerary
    const obfuscatedItinerary: Itinerary = {
      ...itinerary,
      disclosureState: DisclosureState.OBFUSCATED,
      overview: overviewResult.data,
      items: itemResults.map((r: ObfuscationResult<ObfuscatedItineraryItem>) => r.data as ItineraryItem),
      // Remove internal notes from obfuscated view
      internalNotes: undefined,
    };

    return {
      data: obfuscatedItinerary,
      wasObfuscated: obfuscatedFields.length > 0,
      obfuscatedFields,
    };
  }

  /**
   * Obfuscate a single itinerary item.
   */
  obfuscateItem(item: ItineraryItem): ObfuscationResult<ObfuscatedItineraryItem> {
    const obfuscatedFields: string[] = [];
    const context = this.buildContext(item);

    // Start with a copy of the item
    const obfuscatedItem: ObfuscatedItineraryItem = {
      ...item,
      agentNotes: undefined, // Always hide agent notes
    };

    if (item.agentNotes) {
      obfuscatedFields.push('agentNotes');
    }

    // Obfuscate vendor information
    if (item.vendor) {
      const vendorResult = this.obfuscateVendor(item.vendor, context);
      obfuscatedItem.vendor = vendorResult.data;
      if (vendorResult.wasObfuscated) {
        vendorResult.obfuscatedFields.forEach(field => {
          obfuscatedFields.push(`vendor.${field}`);
        });
      }
    }

    // Obfuscate title
    const titleResult = this.obfuscateText(item.title, context);
    if (titleResult.wasObfuscated) {
      obfuscatedItem.title = titleResult.data;
      obfuscatedFields.push('title');
    }

    // Obfuscate description
    if (item.description) {
      const descResult = this.obfuscateText(item.description, context);
      if (descResult.wasObfuscated) {
        obfuscatedItem.description = descResult.data;
        obfuscatedFields.push('description');
      }
    }

    // Obfuscate traveler notes
    if (item.travelerNotes) {
      const notesResult = this.obfuscateText(item.travelerNotes, context);
      if (notesResult.wasObfuscated) {
        obfuscatedItem.travelerNotes = notesResult.data;
        obfuscatedFields.push('travelerNotes');
      }
    }

    // Obfuscate transport details
    if (item.transportDetails) {
      const transportResult = this.obfuscateTextFields(item.transportDetails, 'transportDetails');
      if (transportResult.wasObfuscated) {
        obfuscatedItem.transportDetails = transportResult.data;
        obfuscatedFields.push(...transportResult.obfuscatedFields);
      }
    }

    // Obfuscate accommodation details
    if (item.accommodationDetails) {
      const accomResult = this.obfuscateTextFields(item.accommodationDetails, 'accommodationDetails');
      if (accomResult.wasObfuscated) {
        obfuscatedItem.accommodationDetails = accomResult.data;
        obfuscatedFields.push(...accomResult.obfuscatedFields);
      }
    }

    return {
      data: obfuscatedItem,
      wasObfuscated: obfuscatedFields.length > 0,
      obfuscatedFields,
    };
  }

  /**
   * Obfuscate vendor information.
   */
  obfuscateVendor(vendor: VendorInfo, context?: ObfuscationContext): ObfuscationResult<ObfuscatedVendor> {
    const obfuscatedFields: string[] = [];

    // Obfuscate vendor name
    const nameResult = this.obfuscateText(vendor.name, context);
    obfuscatedFields.push('name');

    // Build obfuscated vendor
    const obfuscatedVendor: ObfuscatedVendor = {
      name: nameResult.data,
      category: vendor.category,
      starRating: vendor.starRating,
      // These fields are completely hidden
      contactEmail: undefined,
      contactPhone: undefined,
      bookingReference: undefined,
      confirmationNumber: undefined,
    };

    // Track which contact fields were hidden
    if (vendor.contactEmail) obfuscatedFields.push('contactEmail');
    if (vendor.contactPhone) obfuscatedFields.push('contactPhone');
    if (vendor.bookingReference) obfuscatedFields.push('bookingReference');
    if (vendor.confirmationNumber) obfuscatedFields.push('confirmationNumber');

    return {
      data: obfuscatedVendor,
      wasObfuscated: obfuscatedFields.length > 0,
      obfuscatedFields,
    };
  }

  /**
   * Obfuscate a single text string.
   */
  obfuscateText(text: string, context?: ObfuscationContext): ObfuscationResult<string> {
    let result = text;
    let wasObfuscated = false;

    for (const strategy of this.strategies) {
      if (strategy.applies(result, context)) {
        result = strategy.obfuscate(result, context);
        wasObfuscated = true;
      }
    }

    return {
      data: result,
      wasObfuscated,
      obfuscatedFields: wasObfuscated ? ['text'] : [],
    };
  }

  /**
   * Obfuscate all string fields in an object.
   */
  private obfuscateTextFields<T extends Record<string, unknown>>(
    obj: T,
    prefix: string
  ): ObfuscationResult<T> {
    const obfuscatedFields: string[] = [];
    const result = { ...obj };

    for (const [key, value] of Object.entries(result)) {
      if (typeof value === 'string') {
        const textResult = this.obfuscateText(value);
        if (textResult.wasObfuscated) {
          (result as Record<string, unknown>)[key] = textResult.data;
          obfuscatedFields.push(`${prefix}.${key}`);
        }
      }
    }

    return {
      data: result,
      wasObfuscated: obfuscatedFields.length > 0,
      obfuscatedFields,
    };
  }

  /**
   * Build obfuscation context from item.
   */
  private buildContext(item: ItineraryItem): ObfuscationContext {
    return {
      itemType: item.type,
      starRating: item.vendor?.starRating,
      category: item.vendor?.category,
      transportMode: item.transportDetails?.mode,
    };
  }

  /**
   * Check if an itinerary should be obfuscated.
   */
  shouldObfuscate(itinerary: Itinerary): boolean {
    return itinerary.disclosureState === DisclosureState.OBFUSCATED;
  }

  /**
   * Get appropriate view of itinerary based on disclosure state.
   */
  getView(itinerary: Itinerary): Itinerary {
    if (this.shouldObfuscate(itinerary)) {
      return this.obfuscateItinerary(itinerary).data;
    }
    return itinerary;
  }
}

/**
 * Default engine instance for common use.
 */
export const defaultObfuscationEngine = new ObfuscationEngine();

/**
 * Convenience function to obfuscate an itinerary.
 */
export function obfuscateItinerary(itinerary: Itinerary): Itinerary {
  return defaultObfuscationEngine.obfuscateItinerary(itinerary).data;
}

/**
 * Convenience function to get the correct view of an itinerary.
 */
export function getItineraryView(itinerary: Itinerary): Itinerary {
  return defaultObfuscationEngine.getView(itinerary);
}
