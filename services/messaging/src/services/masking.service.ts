/**
 * Messaging Service - Content Masking Service
 *
 * Detects and masks contact information in messages before payment.
 * BUSINESS RULE: No direct contact pre-payment.
 */

import { config } from '../env';
import type { MaskingResult, MaskedPattern } from '../types';

// =============================================================================
// MASKING PATTERNS
// =============================================================================

const PATTERNS = {
  // Email pattern
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,

  // Phone patterns (various international formats)
  phone: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,9}/g,

  // URL patterns
  url: /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi,

  // Social media handles
  social: /@[a-zA-Z0-9_]{2,30}(?:\s|$|[.,!?])/gi,
};

const MASK_REPLACEMENTS = {
  email: '[email hidden until payment]',
  phone: '[phone hidden until payment]',
  url: '[link hidden until payment]',
  social: '[handle hidden until payment]',
} as const;

// =============================================================================
// MASKING SERVICE
// =============================================================================

export class ContentMaskingService {
  /**
   * Masks contact information in content if contacts are not revealed.
   *
   * @param content The original message content
   * @param contactsRevealed Whether contacts have been revealed (payment completed)
   * @returns The masked content and metadata about what was masked
   */
  maskContent(content: string, contactsRevealed: boolean): MaskingResult {
    // If contacts are revealed, no masking needed
    if (contactsRevealed) {
      return {
        maskedContent: content,
        wasMasked: false,
        maskedPatterns: [],
      };
    }

    let maskedContent = content;
    const maskedPatterns: MaskedPattern[] = [];

    // Apply each masking pattern based on configuration
    if (config.masking.email) {
      const result = this.applyPattern(maskedContent, PATTERNS.email, 'email');
      maskedContent = result.content;
      maskedPatterns.push(...result.patterns);
    }

    if (config.masking.phone) {
      const result = this.applyPattern(maskedContent, PATTERNS.phone, 'phone');
      maskedContent = result.content;
      maskedPatterns.push(...result.patterns);
    }

    if (config.masking.url) {
      const result = this.applyPattern(maskedContent, PATTERNS.url, 'url');
      maskedContent = result.content;
      maskedPatterns.push(...result.patterns);
    }

    if (config.masking.socialHandles) {
      const result = this.applyPattern(maskedContent, PATTERNS.social, 'social');
      maskedContent = result.content;
      maskedPatterns.push(...result.patterns);
    }

    return {
      maskedContent,
      wasMasked: maskedPatterns.length > 0,
      maskedPatterns,
    };
  }

  /**
   * Applies a masking pattern to content.
   */
  private applyPattern(
    content: string,
    pattern: RegExp,
    type: 'email' | 'phone' | 'url' | 'social'
  ): { content: string; patterns: MaskedPattern[] } {
    const patterns: MaskedPattern[] = [];
    let resultContent = content;
    let match: RegExpExecArray | null;

    // Reset regex state
    pattern.lastIndex = 0;

    // Find all matches first
    const matches: Array<{ original: string; start: number; end: number }> = [];
    while ((match = pattern.exec(content)) !== null) {
      matches.push({
        original: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    // Apply masks in reverse order to maintain correct indices
    for (let i = matches.length - 1; i >= 0; i--) {
      const matchItem = matches[i]!;
      const replacement = MASK_REPLACEMENTS[type];

      resultContent =
        resultContent.substring(0, matchItem.start) +
        replacement +
        resultContent.substring(matchItem.end);

      patterns.unshift({
        type,
        original: matchItem.original,
        masked: replacement,
        startIndex: matchItem.start,
        endIndex: matchItem.end,
      });
    }

    return { content: resultContent, patterns };
  }

  /**
   * Checks if content contains any contact patterns that would be masked.
   * Useful for warning users before they send.
   */
  containsContactInfo(content: string): {
    hasContactInfo: boolean;
    types: ('email' | 'phone' | 'url' | 'social')[];
  } {
    const types: ('email' | 'phone' | 'url' | 'social')[] = [];

    if (config.masking.email && PATTERNS.email.test(content)) {
      types.push('email');
    }
    PATTERNS.email.lastIndex = 0;

    if (config.masking.phone && PATTERNS.phone.test(content)) {
      types.push('phone');
    }
    PATTERNS.phone.lastIndex = 0;

    if (config.masking.url && PATTERNS.url.test(content)) {
      types.push('url');
    }
    PATTERNS.url.lastIndex = 0;

    if (config.masking.socialHandles && PATTERNS.social.test(content)) {
      types.push('social');
    }
    PATTERNS.social.lastIndex = 0;

    return {
      hasContactInfo: types.length > 0,
      types,
    };
  }

  /**
   * Gets the patterns used for masking (for transparency/documentation).
   */
  getMaskingPatterns(): Record<string, string> {
    return {
      email: 'Email addresses',
      phone: 'Phone numbers',
      url: 'URLs and links',
      social: 'Social media handles (@username)',
    };
  }
}

// Singleton instance
export const contentMaskingService = new ContentMaskingService();
