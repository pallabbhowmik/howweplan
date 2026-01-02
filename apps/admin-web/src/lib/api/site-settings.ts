/**
 * Site Settings API for Admin
 * 
 * Manage site-wide settings like contact information, company details, etc.
 */

import { apiClient } from './client';

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
// DEFAULT SETTINGS
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
 */
export async function getContactSettings(): Promise<ContactSettings> {
  try {
    const response = await apiClient.get<{ data: ContactSettings }>('/api/settings/contact');
    return response.data || defaultContactSettings;
  } catch (error) {
    console.warn('Failed to fetch contact settings, using defaults:', error);
    return defaultContactSettings;
  }
}

/**
 * Update contact settings
 */
export async function updateContactSettings(settings: Partial<ContactSettings>): Promise<ContactSettings> {
  try {
    const response = await apiClient.put<{ data: ContactSettings }>('/api/settings/contact', settings);
    return response.data || defaultContactSettings;
  } catch (error) {
    console.error('Failed to update contact settings:', error);
    throw error;
  }
}

/**
 * Fetch all site settings
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const response = await apiClient.get<{ data: SiteSettings }>('/api/settings/site');
    return response.data || { contact: defaultContactSettings };
  } catch (error) {
    console.warn('Failed to fetch site settings, using defaults:', error);
    return { contact: defaultContactSettings };
  }
}

/**
 * Update site settings
 */
export async function updateSiteSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
  try {
    const response = await apiClient.put<{ data: SiteSettings }>('/api/settings/site', settings);
    return response.data || { contact: defaultContactSettings };
  } catch (error) {
    console.error('Failed to update site settings:', error);
    throw error;
  }
}
