/**
 * Obfuscation patterns for sensitive travel data.
 * These patterns identify content that must be hidden pre-payment.
 * 
 * BUSINESS RULE: No exact hotel names, vendors, or booking references pre-payment.
 */

/**
 * Known hotel brand patterns for detection.
 */
export const HOTEL_BRAND_PATTERNS: RegExp[] = [
  // Major chains
  /\b(marriott|hilton|hyatt|ihg|intercontinental|holiday inn|crowne plaza)\b/gi,
  /\b(sheraton|westin|w hotel|st\.?\s*regis|ritz[\s-]?carlton|jw marriott)\b/gi,
  /\b(four seasons|mandarin oriental|peninsula|shangri[\s-]?la|rosewood)\b/gi,
  /\b(fairmont|raffles|sofitel|novotel|mercure|ibis|accor)\b/gi,
  /\b(radisson|park hyatt|grand hyatt|andaz|aloft|element)\b/gi,
  /\b(doubletree|hampton inn|embassy suites|homewood suites)\b/gi,
  /\b(best western|wyndham|ramada|days inn|super 8|la quinta)\b/gi,
  /\b(ace hotel|kimpton|thompson|edition|1 hotel|six senses)\b/gi,
  /\b(aman|como|belmond|oetker|rocco forte|dorchester)\b/gi,
  
  // Boutique and luxury
  /\b(boutique hotel|luxury resort|5[\s-]?star hotel|palace hotel)\b/gi,
  /\b(beach resort|mountain lodge|safari lodge|eco[\s-]?lodge)\b/gi,
];

/**
 * Airline and transport brand patterns.
 */
export const TRANSPORT_BRAND_PATTERNS: RegExp[] = [
  // Airlines
  /\b(emirates|qatar|singapore airlines|cathay pacific|ana|jal)\b/gi,
  /\b(lufthansa|british airways|air france|klm|swiss|austrian)\b/gi,
  /\b(delta|united|american airlines|jetblue|southwest|alaska)\b/gi,
  /\b(virgin atlantic|virgin australia|qantas|air new zealand)\b/gi,
  /\b(turkish airlines|etihad|saudia|royal jordanian|el al)\b/gi,
  /\b(air canada|westjet|aeromexico|latam|avianca|copa)\b/gi,
  /\b(ryanair|easyjet|vueling|norwegian|wizz air|spirit)\b/gi,
  
  // Rail
  /\b(eurostar|thalys|tgv|ice|ave|amtrak|via rail)\b/gi,
  /\b(shinkansen|orient express|rocky mountaineer)\b/gi,
  
  // Cruise
  /\b(royal caribbean|carnival|norwegian cruise|msc|princess)\b/gi,
  /\b(celebrity cruises|holland america|cunard|viking|seabourn)\b/gi,
];

/**
 * Tour operator and activity provider patterns.
 */
export const VENDOR_PATTERNS: RegExp[] = [
  /\b(viator|getyourguide|klook|civitatis|tiqets)\b/gi,
  /\b(g adventures|intrepid|contiki|trafalgar|insight)\b/gi,
  /\b(abercrombie[\s&]+kent|butterfield[\s&]+robinson|backroads)\b/gi,
  /\b(exodus|explore|exodus travels|world expeditions)\b/gi,
];

/**
 * Booking reference patterns.
 */
export const BOOKING_REFERENCE_PATTERNS: RegExp[] = [
  // Alphanumeric booking codes
  /\b(booking|confirmation|reference|reservation)[\s:#-]*([A-Z0-9]{4,12})\b/gi,
  /\b(PNR|locator|record)[\s:#-]*([A-Z0-9]{6})\b/gi,
  
  // Specific formats
  /\b[A-Z]{2}\d{4,6}[A-Z]?\b/g, // Flight-style: AA1234A
  /\b\d{9,12}\b/g, // Long numeric
  /\b[A-Z0-9]{6}-[A-Z0-9]{4}\b/g, // Hyphenated
];

/**
 * Contact information patterns.
 */
export const CONTACT_PATTERNS: RegExp[] = [
  // Email
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Phone (international formats)
  /\+?\d{1,4}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}/g,
  
  // URLs
  /https?:\/\/[^\s]+/g,
];

/**
 * Address patterns that might reveal exact locations.
 */
export const ADDRESS_PATTERNS: RegExp[] = [
  // Street addresses
  /\d+\s+[A-Za-z]+\s+(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|place|pl)\b/gi,
  
  // Postal codes
  /\b\d{5}(-\d{4})?\b/g, // US ZIP
  /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}\b/gi, // UK
  /\b\d{4}\s*[A-Z]{2}\b/g, // Netherlands
];

/**
 * Price and amount patterns.
 */
export const PRICE_PATTERNS: RegExp[] = [
  /[$€£¥₹]\s*[\d,]+\.?\d*/g,
  /[\d,]+\.?\d*\s*(USD|EUR|GBP|JPY|INR|AUD|CAD|CHF)\b/gi,
];

/**
 * All sensitive patterns combined.
 */
export const ALL_SENSITIVE_PATTERNS = [
  ...HOTEL_BRAND_PATTERNS,
  ...TRANSPORT_BRAND_PATTERNS,
  ...VENDOR_PATTERNS,
  ...BOOKING_REFERENCE_PATTERNS,
  ...CONTACT_PATTERNS,
  ...ADDRESS_PATTERNS,
];

/**
 * Category mappings for obfuscation replacements.
 */
export const OBFUSCATION_REPLACEMENTS = {
  // Hotels
  LUXURY_HOTEL: '5-Star Luxury Hotel',
  BOUTIQUE_HOTEL: 'Boutique Hotel',
  BUSINESS_HOTEL: 'Business Class Hotel',
  RESORT: 'Beach/Mountain Resort',
  BUDGET_HOTEL: 'Comfortable Hotel',
  
  // Transport
  INTERNATIONAL_FLIGHT: 'International Flight',
  DOMESTIC_FLIGHT: 'Domestic Flight',
  PREMIUM_AIRLINE: 'Premium Carrier Flight',
  BUDGET_AIRLINE: 'Economy Flight',
  TRAIN: 'Train Journey',
  HIGH_SPEED_RAIL: 'High-Speed Train',
  CRUISE: 'Cruise',
  FERRY: 'Ferry Crossing',
  
  // Activities
  GUIDED_TOUR: 'Guided Tour',
  PRIVATE_TOUR: 'Private Excursion',
  GROUP_ACTIVITY: 'Group Activity',
  
  // Generic
  BOOKING_REF: '[Reference provided after payment]',
  CONTACT: '[Contact details after payment]',
  ADDRESS: '[Exact address after payment]',
  VENDOR: 'Local Partner',
  PROVIDER: 'Licensed Provider',
} as const;

export type ObfuscationReplacement = keyof typeof OBFUSCATION_REPLACEMENTS;
