import type { ObfuscationStrategy, ObfuscationContext } from '../types.js';
import { 
  TRANSPORT_BRAND_PATTERNS,
  VENDOR_PATTERNS,
  OBFUSCATION_REPLACEMENTS,
} from '../patterns.js';

/**
 * Vendor name obfuscation strategy.
 * Replaces exact vendor and transport provider names with generic descriptors.
 * 
 * BUSINESS RULE: No exact vendor names pre-payment.
 */
export class VendorObfuscationStrategy implements ObfuscationStrategy {
  readonly name = 'vendor';

  private readonly allPatterns = [...TRANSPORT_BRAND_PATTERNS, ...VENDOR_PATTERNS];

  /**
   * Check if content contains vendor/transport brand names.
   */
  applies(content: string, _context?: ObfuscationContext): boolean {
    return this.allPatterns.some(pattern => {
      pattern.lastIndex = 0;
      return pattern.test(content);
    });
  }

  /**
   * Obfuscate vendor names with generic descriptors.
   */
  obfuscate(content: string, context?: ObfuscationContext): string {
    let result = content;

    // Handle transport brands
    for (const pattern of TRANSPORT_BRAND_PATTERNS) {
      pattern.lastIndex = 0;
      result = result.replace(pattern, () => {
        return this.getTransportReplacement(context);
      });
    }

    // Handle vendor/tour operator brands
    for (const pattern of VENDOR_PATTERNS) {
      pattern.lastIndex = 0;
      result = result.replace(pattern, () => {
        return OBFUSCATION_REPLACEMENTS.PROVIDER;
      });
    }

    return result;
  }

  /**
   * Get appropriate transport replacement based on context.
   */
  private getTransportReplacement(context?: ObfuscationContext): string {
    const mode = context?.transportMode?.toLowerCase();
    const category = context?.category?.toLowerCase();

    // Determine by transport mode
    if (mode) {
      if (mode.includes('flight') || mode.includes('air')) {
        if (category?.includes('premium') || category?.includes('business') || category?.includes('first')) {
          return OBFUSCATION_REPLACEMENTS.PREMIUM_AIRLINE;
        }
        if (category?.includes('budget') || category?.includes('low-cost')) {
          return OBFUSCATION_REPLACEMENTS.BUDGET_AIRLINE;
        }
        if (category?.includes('international')) {
          return OBFUSCATION_REPLACEMENTS.INTERNATIONAL_FLIGHT;
        }
        return OBFUSCATION_REPLACEMENTS.DOMESTIC_FLIGHT;
      }
      
      if (mode.includes('train') || mode.includes('rail')) {
        if (category?.includes('high-speed') || category?.includes('express')) {
          return OBFUSCATION_REPLACEMENTS.HIGH_SPEED_RAIL;
        }
        return OBFUSCATION_REPLACEMENTS.TRAIN;
      }
      
      if (mode.includes('cruise') || mode.includes('ship')) {
        return OBFUSCATION_REPLACEMENTS.CRUISE;
      }
      
      if (mode.includes('ferry') || mode.includes('boat')) {
        return OBFUSCATION_REPLACEMENTS.FERRY;
      }
    }

    // Determine by category alone
    if (category) {
      if (category.includes('premium') || category.includes('luxury')) {
        return OBFUSCATION_REPLACEMENTS.PREMIUM_AIRLINE;
      }
    }

    // Default to generic
    return OBFUSCATION_REPLACEMENTS.PROVIDER;
  }
}

/**
 * Vendor name detector for checking if text contains vendor names.
 */
export function containsVendorName(text: string): boolean {
  const allPatterns = [...TRANSPORT_BRAND_PATTERNS, ...VENDOR_PATTERNS];
  return allPatterns.some(pattern => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
}

/**
 * Extract vendor names from text.
 */
export function extractVendorNames(text: string): string[] {
  const matches: string[] = [];
  const allPatterns = [...TRANSPORT_BRAND_PATTERNS, ...VENDOR_PATTERNS];

  for (const pattern of allPatterns) {
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
