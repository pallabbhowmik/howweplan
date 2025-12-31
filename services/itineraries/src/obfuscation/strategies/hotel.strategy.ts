import type { ObfuscationStrategy, ObfuscationContext } from '../types.js';
import { 
  HOTEL_BRAND_PATTERNS, 
  OBFUSCATION_REPLACEMENTS 
} from '../patterns.js';

/**
 * Hotel name obfuscation strategy.
 * Replaces exact hotel names with category descriptors.
 * 
 * BUSINESS RULE: No exact hotel names pre-payment.
 */
export class HotelObfuscationStrategy implements ObfuscationStrategy {
  readonly name = 'hotel';

  /**
   * Check if content contains hotel brand names.
   */
  applies(content: string, _context?: ObfuscationContext): boolean {
    return HOTEL_BRAND_PATTERNS.some(pattern => pattern.test(content));
  }

  /**
   * Obfuscate hotel names with category descriptors.
   */
  obfuscate(content: string, context?: ObfuscationContext): string {
    let result = content;

    for (const pattern of HOTEL_BRAND_PATTERNS) {
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0;
      
      result = result.replace(pattern, () => {
        return this.getReplacement(context);
      });
    }

    return result;
  }

  /**
   * Get appropriate replacement based on context.
   */
  private getReplacement(context?: ObfuscationContext): string {
    const starRating = context?.starRating;
    const category = context?.category?.toLowerCase();

    // Determine replacement based on star rating
    if (starRating !== undefined) {
      if (starRating >= 5) {
        return OBFUSCATION_REPLACEMENTS.LUXURY_HOTEL;
      }
      if (starRating >= 4) {
        return OBFUSCATION_REPLACEMENTS.BOUTIQUE_HOTEL;
      }
      if (starRating >= 3) {
        return OBFUSCATION_REPLACEMENTS.BUSINESS_HOTEL;
      }
      return OBFUSCATION_REPLACEMENTS.BUDGET_HOTEL;
    }

    // Determine by category
    if (category) {
      if (category.includes('resort') || category.includes('beach') || category.includes('mountain')) {
        return OBFUSCATION_REPLACEMENTS.RESORT;
      }
      if (category.includes('boutique')) {
        return OBFUSCATION_REPLACEMENTS.BOUTIQUE_HOTEL;
      }
      if (category.includes('business')) {
        return OBFUSCATION_REPLACEMENTS.BUSINESS_HOTEL;
      }
      if (category.includes('luxury') || category.includes('5 star') || category.includes('5-star')) {
        return OBFUSCATION_REPLACEMENTS.LUXURY_HOTEL;
      }
    }

    // Default to generic luxury descriptor
    return OBFUSCATION_REPLACEMENTS.LUXURY_HOTEL;
  }
}

/**
 * Hotel name detector for checking if text contains hotel names.
 */
export function containsHotelName(text: string): boolean {
  return HOTEL_BRAND_PATTERNS.some(pattern => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
}

/**
 * Extract hotel names from text.
 */
export function extractHotelNames(text: string): string[] {
  const matches: string[] = [];

  for (const pattern of HOTEL_BRAND_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[0] && !matches.includes(match[0])) {
        matches.push(match[0]);
      }
    }
  }

  return matches;
}
