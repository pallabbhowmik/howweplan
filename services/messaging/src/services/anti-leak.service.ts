/**
 * Anti-Leak Detection Service
 * 
 * Detects and blocks attempts to share contact information pre-payment.
 * Records violations and triggers trust/badge updates.
 * 
 * RULES ENFORCED:
 * - Block phone numbers
 * - Block email addresses
 * - Block UPI IDs
 * - Block external payment links
 * - Block social media handles
 * - Block website URLs
 * - Log all violations
 * - Increment platformViolationCount on repeated violations
 */

import { ViolationType } from '@tripcomposer/contracts';

// =============================================================================
// PATTERN DEFINITIONS
// =============================================================================

/**
 * Patterns for detecting contact information leakage.
 * Designed for Indian market (UPI, Indian phone formats).
 */
const LEAK_PATTERNS = {
  // Phone numbers (Indian formats + international)
  phone: [
    /(?:\+91[\s-]?)?[6-9]\d{9}/g,                    // Indian mobile: +91 9876543210
    /(?:\+91[\s-]?)?\d{10}/g,                        // Indian: 9876543210
    /(?:\+?\d{1,3}[\s-]?)?\d{10,12}/g,              // International
    /\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/g,             // US format: 123-456-7890
    /call\s+(?:me|us)\s+(?:at|on)\s+\d+/gi,         // "call me at..."
  ],

  // Email addresses
  email: [
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
    /[\w.-]+\s*\[\s*at\s*\]\s*[\w.-]+\s*\[\s*dot\s*\]\s*\w+/gi,  // obfuscated: user[at]domain[dot]com
    /[\w.-]+\s*at\s*[\w.-]+\s*dot\s*\w+/gi,                      // user at domain dot com
  ],

  // UPI IDs (India-specific payment identifiers)
  upi: [
    /[a-zA-Z0-9._-]+@[a-zA-Z]+/gi,                  // user@paytm, user@gpay
    /\bupi\s*:\s*[a-zA-Z0-9._-]+@[a-zA-Z]+/gi,     // UPI: user@paytm
    /pay\s*(?:via|using|on)\s*[a-zA-Z0-9._-]+@/gi, // "pay via user@"
  ],

  // External payment links
  paymentLinks: [
    /(?:paytm|phonepe|gpay|razorpay|paypal|venmo)\.(?:com|me|link)\/[^\s]+/gi,
    /(?:upi|pay)\.me\/[^\s]+/gi,
    /bit\.ly\/[^\s]+/gi,                           // URL shorteners often hide payment links
    /tinyurl\.com\/[^\s]+/gi,
  ],

  // Website URLs
  urls: [
    /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi,
    /www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
    /[a-zA-Z0-9.-]+\.(?:com|in|org|net|io|co)\b/gi,
  ],

  // Social media handles
  social: [
    /@[a-zA-Z0-9_]{2,30}\b/gi,                     // @username
    /(?:instagram|facebook|twitter|whatsapp|telegram)[\s.:]+[a-zA-Z0-9_]+/gi,
    /(?:ig|fb|tw|wa|tg)[\s.:]+[a-zA-Z0-9_]+/gi,   // Abbreviated social handles
    /dm\s+(?:me|us)\s+(?:on|at)/gi,               // "DM me on..."
  ],

  // WhatsApp-specific (common for off-platform contact in India)
  whatsapp: [
    /whatsapp\s*(?:me|us|number|no\.?)?[\s:]+\d+/gi,
    /wa\.me\/\d+/gi,
    /(?:ping|msg|message)\s+(?:me|us)\s+(?:on|at)\s+whatsapp/gi,
  ],

  // Bank account details
  bankDetails: [
    /(?:a\/c|account|acc)\s*(?:no\.?|number)?[\s:]+\d{9,18}/gi,
    /ifsc[\s:]+[A-Z]{4}0[A-Z0-9]{6}/gi,
    /(?:bank|transfer)\s+(?:to|details?)[\s:]+/gi,
  ],
};

// =============================================================================
// TYPES
// =============================================================================

export interface LeakDetectionResult {
  hasLeak: boolean;
  leakTypes: ViolationType[];
  detectedPatterns: {
    type: ViolationType;
    pattern: string;
    matches: string[];
  }[];
  shouldBlock: boolean;
  sanitizedContent: string | null;
  warningMessage: string | null;
}

export interface ViolationDetails {
  violationType: ViolationType;
  originalContent: string;
  detectedPatterns: string[];
  timestamp: Date;
}

// =============================================================================
// LEAK DETECTION SERVICE
// =============================================================================

export const antiLeakService = {
  /**
   * Detect potential contact information leaks in content.
   * Returns detailed information about what was detected.
   */
  detectLeaks(content: string): LeakDetectionResult {
    const detectedPatterns: LeakDetectionResult['detectedPatterns'] = [];
    const leakTypes = new Set<ViolationType>();

    // Check phone patterns
    for (const pattern of LEAK_PATTERNS.phone) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        leakTypes.add(ViolationType.CONTACT_INFO_LEAK);
        detectedPatterns.push({
          type: ViolationType.CONTACT_INFO_LEAK,
          pattern: 'phone',
          matches: [...new Set(matches)],
        });
      }
    }

    // Check email patterns
    for (const pattern of LEAK_PATTERNS.email) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        leakTypes.add(ViolationType.CONTACT_INFO_LEAK);
        detectedPatterns.push({
          type: ViolationType.CONTACT_INFO_LEAK,
          pattern: 'email',
          matches: [...new Set(matches)],
        });
      }
    }

    // Check UPI patterns
    for (const pattern of LEAK_PATTERNS.upi) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        leakTypes.add(ViolationType.PAYMENT_INFO_LEAK);
        detectedPatterns.push({
          type: ViolationType.PAYMENT_INFO_LEAK,
          pattern: 'upi',
          matches: [...new Set(matches)],
        });
      }
    }

    // Check payment link patterns
    for (const pattern of LEAK_PATTERNS.paymentLinks) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        leakTypes.add(ViolationType.EXTERNAL_PAYMENT_LINK);
        detectedPatterns.push({
          type: ViolationType.EXTERNAL_PAYMENT_LINK,
          pattern: 'payment_link',
          matches: [...new Set(matches)],
        });
      }
    }

    // Check URL patterns
    for (const pattern of LEAK_PATTERNS.urls) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        leakTypes.add(ViolationType.EXTERNAL_LINK_SHARE);
        detectedPatterns.push({
          type: ViolationType.EXTERNAL_LINK_SHARE,
          pattern: 'url',
          matches: [...new Set(matches)],
        });
      }
    }

    // Check social media patterns
    for (const pattern of LEAK_PATTERNS.social) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        leakTypes.add(ViolationType.CONTACT_INFO_LEAK);
        detectedPatterns.push({
          type: ViolationType.CONTACT_INFO_LEAK,
          pattern: 'social',
          matches: [...new Set(matches)],
        });
      }
    }

    // Check WhatsApp patterns
    for (const pattern of LEAK_PATTERNS.whatsapp) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        leakTypes.add(ViolationType.CONTACT_INFO_LEAK);
        detectedPatterns.push({
          type: ViolationType.CONTACT_INFO_LEAK,
          pattern: 'whatsapp',
          matches: [...new Set(matches)],
        });
      }
    }

    // Check bank details patterns
    for (const pattern of LEAK_PATTERNS.bankDetails) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        leakTypes.add(ViolationType.PAYMENT_INFO_LEAK);
        detectedPatterns.push({
          type: ViolationType.PAYMENT_INFO_LEAK,
          pattern: 'bank_details',
          matches: [...new Set(matches)],
        });
      }
    }

    const hasLeak = detectedPatterns.length > 0;
    const shouldBlock = hasLeak; // Block all messages with leaks

    return {
      hasLeak,
      leakTypes: [...leakTypes],
      detectedPatterns,
      shouldBlock,
      sanitizedContent: null, // We block, not sanitize
      warningMessage: hasLeak
        ? 'Your message contains contact information. To protect both parties, contact details can only be shared after payment is confirmed.'
        : null,
    };
  },

  /**
   * Get the most severe violation type from detection result.
   */
  getMostSevereViolation(result: LeakDetectionResult): ViolationType | null {
    if (!result.hasLeak) return null;

    // Severity order: payment > contact > links
    if (result.leakTypes.includes(ViolationType.EXTERNAL_PAYMENT_LINK)) {
      return ViolationType.EXTERNAL_PAYMENT_LINK;
    }
    if (result.leakTypes.includes(ViolationType.PAYMENT_INFO_LEAK)) {
      return ViolationType.PAYMENT_INFO_LEAK;
    }
    if (result.leakTypes.includes(ViolationType.CONTACT_INFO_LEAK)) {
      return ViolationType.CONTACT_INFO_LEAK;
    }
    if (result.leakTypes.includes(ViolationType.EXTERNAL_LINK_SHARE)) {
      return ViolationType.EXTERNAL_LINK_SHARE;
    }

    return result.leakTypes[0] || null;
  },

  /**
   * Generate a violation record from detection result.
   */
  createViolationRecord(
    agentId: string,
    result: LeakDetectionResult,
    messageId: string | null,
    bookingId: string | null
  ): ViolationDetails {
    const violationType = this.getMostSevereViolation(result) || ViolationType.POLICY_VIOLATION;

    return {
      violationType,
      originalContent: '[REDACTED]', // Don't store actual content
      detectedPatterns: result.detectedPatterns.map(p => `${p.pattern}: ${p.matches.length} match(es)`),
      timestamp: new Date(),
    };
  },

  /**
   * Check if message should be blocked based on contacts revealed status.
   */
  shouldBlockMessage(content: string, contactsRevealed: boolean): {
    blocked: boolean;
    reason: string | null;
    violationType: ViolationType | null;
  } {
    // If contacts are revealed (post-payment), no blocking needed
    if (contactsRevealed) {
      return { blocked: false, reason: null, violationType: null };
    }

    const detection = this.detectLeaks(content);

    if (detection.shouldBlock) {
      return {
        blocked: true,
        reason: detection.warningMessage,
        violationType: this.getMostSevereViolation(detection),
      };
    }

    return { blocked: false, reason: null, violationType: null };
  },
};

// =============================================================================
// ITINERARY OBFUSCATION
// =============================================================================

/**
 * Patterns and rules for obfuscating itinerary content pre-payment.
 */
export const itineraryObfuscation = {
  /**
   * Obfuscate hotel/vendor names in itinerary.
   * Pre-payment: Shows generic descriptions
   * Post-payment: Shows full details
   */
  obfuscateVendorNames(content: string): string {
    // Replace specific hotel names with generic description
    const hotelPatterns = [
      /(?:taj|oberoi|itc|leela|marriott|hyatt|hilton|radisson|crowne\s*plaza)[^\n,.]*/gi,
      /(?:hotel|resort|inn|lodge|palace|villa)\s+[A-Z][a-zA-Z\s]+/gi,
    ];

    let obfuscated = content;
    for (const pattern of hotelPatterns) {
      obfuscated = obfuscated.replace(pattern, '[Premium Hotel - Details after booking]');
    }

    // Replace restaurant names
    obfuscated = obfuscated.replace(
      /(?:restaurant|cafe|dhaba|bistro)\s+[A-Z][a-zA-Z\s]+/gi,
      '[Restaurant - Details after booking]'
    );

    return obfuscated;
  },

  /**
   * Remove URLs from itinerary content.
   */
  removeUrls(content: string): string {
    return content
      .replace(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi, '[Link available after booking]')
      .replace(/www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, '[Link available after booking]');
  },

  /**
   * Remove map links and coordinates.
   */
  removeMapLinks(content: string): string {
    return content
      .replace(/(?:google\.com\/maps|maps\.google|goo\.gl\/maps)[^\s]+/gi, '[Map link available after booking]')
      .replace(/\d{1,3}\.\d+,\s*\d{1,3}\.\d+/g, '[Location details after booking]');
  },

  /**
   * Full obfuscation for pre-payment itinerary display.
   */
  obfuscateForPrePayment(content: string): string {
    let result = content;
    result = this.obfuscateVendorNames(result);
    result = this.removeUrls(result);
    result = this.removeMapLinks(result);
    return result;
  },

  /**
   * Generate watermark for itinerary.
   */
  generateWatermark(userId: string, requestId: string): string {
    const timestamp = new Date().toISOString();
    return `[Protected Content | User: ${userId.slice(0, 8)}... | Request: ${requestId.slice(0, 8)}... | Generated: ${timestamp}]`;
  },
};

export default antiLeakService;
