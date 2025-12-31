import type { ObfuscationStrategy, ObfuscationContext } from '../types.js';
import { 
  BOOKING_REFERENCE_PATTERNS,
  CONTACT_PATTERNS,
  ADDRESS_PATTERNS,
  OBFUSCATION_REPLACEMENTS,
} from '../patterns.js';

/**
 * Booking reference obfuscation strategy.
 * Removes all booking references, confirmation numbers, and similar identifiers.
 * 
 * BUSINESS RULE: No booking references pre-payment.
 */
export class ReferenceObfuscationStrategy implements ObfuscationStrategy {
  readonly name = 'reference';

  /**
   * Check if content contains booking references.
   */
  applies(content: string, _context?: ObfuscationContext): boolean {
    return BOOKING_REFERENCE_PATTERNS.some(pattern => {
      pattern.lastIndex = 0;
      return pattern.test(content);
    });
  }

  /**
   * Obfuscate booking references.
   */
  obfuscate(content: string, _context?: ObfuscationContext): string {
    let result = content;

    for (const pattern of BOOKING_REFERENCE_PATTERNS) {
      pattern.lastIndex = 0;
      result = result.replace(pattern, OBFUSCATION_REPLACEMENTS.BOOKING_REF);
    }

    return result;
  }
}

/**
 * Contact information obfuscation strategy.
 * Removes emails, phone numbers, and URLs.
 * 
 * BUSINESS RULE: No contact details pre-payment.
 */
export class ContactObfuscationStrategy implements ObfuscationStrategy {
  readonly name = 'contact';

  /**
   * Check if content contains contact information.
   */
  applies(content: string, _context?: ObfuscationContext): boolean {
    return CONTACT_PATTERNS.some(pattern => {
      pattern.lastIndex = 0;
      return pattern.test(content);
    });
  }

  /**
   * Obfuscate contact information.
   */
  obfuscate(content: string, _context?: ObfuscationContext): string {
    let result = content;

    for (const pattern of CONTACT_PATTERNS) {
      pattern.lastIndex = 0;
      result = result.replace(pattern, OBFUSCATION_REPLACEMENTS.CONTACT);
    }

    return result;
  }
}

/**
 * Address obfuscation strategy.
 * Removes exact street addresses and postal codes.
 * 
 * BUSINESS RULE: No exact addresses pre-payment.
 */
export class AddressObfuscationStrategy implements ObfuscationStrategy {
  readonly name = 'address';

  /**
   * Check if content contains addresses.
   */
  applies(content: string, _context?: ObfuscationContext): boolean {
    return ADDRESS_PATTERNS.some(pattern => {
      pattern.lastIndex = 0;
      return pattern.test(content);
    });
  }

  /**
   * Obfuscate addresses.
   */
  obfuscate(content: string, _context?: ObfuscationContext): string {
    let result = content;

    for (const pattern of ADDRESS_PATTERNS) {
      pattern.lastIndex = 0;
      result = result.replace(pattern, OBFUSCATION_REPLACEMENTS.ADDRESS);
    }

    return result;
  }
}

/**
 * Check if text contains any reference patterns.
 */
export function containsReference(text: string): boolean {
  return BOOKING_REFERENCE_PATTERNS.some(pattern => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
}

/**
 * Check if text contains any contact patterns.
 */
export function containsContact(text: string): boolean {
  return CONTACT_PATTERNS.some(pattern => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
}

/**
 * Check if text contains any address patterns.
 */
export function containsAddress(text: string): boolean {
  return ADDRESS_PATTERNS.some(pattern => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
}

/**
 * Extract all references from text.
 */
export function extractReferences(text: string): string[] {
  const matches: string[] = [];

  for (const pattern of BOOKING_REFERENCE_PATTERNS) {
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
