/**
 * Site Settings API
 * 
 * Fetches public site settings like contact information, company details, etc.
 * Since these are public settings that don't exist on the backend yet,
 * we return defaults. This can be connected to a real API endpoint later.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ContactSettings {
  // Company Info
  companyName: string;
  tagline: string;
  
  // Contact Emails
  generalEmail: string;
  supportEmail: string;
  billingEmail: string;
  agentEmail: string;
  partnershipEmail: string;
  pressEmail: string;
  legalEmail: string;
  privacyEmail: string;
  dpoEmail: string;
  disputesEmail: string;
  dmcaEmail: string;
  
  // Phone Numbers
  mainPhone: string;
  supportPhone: string;
  emergencyPhone: string;
  
  // Address (optional - can be hidden)
  showAddress: boolean;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  
  // Social Links
  facebookUrl: string;
  twitterUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  youtubeUrl: string;
  
  // Business Hours
  businessHours: string;
  supportHours: string;
  
  // Regulatory Info
  showRegulatoryInfo: boolean;
  accreditations: string[];
  licenses: string[];
}

export interface SiteSettings {
  contact: ContactSettings;
}

// ============================================================================
// DEFAULT SETTINGS (Fallback)
// ============================================================================

export const defaultContactSettings: ContactSettings = {
  // Company Info
  companyName: 'HowWePlan',
  tagline: 'Your journey, expertly crafted',
  
  // Contact Emails
  generalEmail: 'hello@howweplan.com',
  supportEmail: 'support@howweplan.com',
  billingEmail: 'billing@howweplan.com',
  agentEmail: 'agents@howweplan.com',
  partnershipEmail: 'partners@howweplan.com',
  pressEmail: 'press@howweplan.com',
  legalEmail: 'legal@howweplan.com',
  privacyEmail: 'privacy@howweplan.com',
  dpoEmail: 'dpo@howweplan.com',
  disputesEmail: 'disputes@howweplan.com',
  dmcaEmail: 'dmca@howweplan.com',
  
  // Phone Numbers
  mainPhone: '+1 (800) HOW-PLAN',
  supportPhone: '+1 (800) 469-7526',
  emergencyPhone: '+1 (888) TRIP-SOS',
  
  // Address (hidden by default)
  showAddress: false,
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'United States',
  
  // Social Links
  facebookUrl: '',
  twitterUrl: '',
  instagramUrl: '',
  linkedinUrl: '',
  youtubeUrl: '',
  
  // Business Hours
  businessHours: 'Monday - Friday: 9:00 AM - 6:00 PM EST',
  supportHours: '24/7',
  
  // Regulatory Info
  showRegulatoryInfo: true,
  accreditations: ['ASTA Member', 'IATA Accredited', 'BBB A+ Rating'],
  licenses: ['California Seller of Travel #XXXXXXXX', 'Florida Seller of Travel #STXXXXX'],
};

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Fetch contact settings
 * Currently returns defaults - can be connected to a real API endpoint later
 */
export async function getContactSettings(): Promise<ContactSettings> {
  // TODO: Connect to real API when backend endpoint is available
  // For now, return defaults
  return defaultContactSettings;
}

/**
 * Fetch all site settings
 * Currently returns defaults - can be connected to a real API endpoint later
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  // TODO: Connect to real API when backend endpoint is available
  // For now, return defaults
  return { contact: defaultContactSettings };
}
