/**
 * Destinations API Client
 * 
 * Fetches destinations from the backend API for the explore page.
 * Falls back to static data if API is unavailable.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export type DestinationRegion = 'North' | 'South' | 'East' | 'West' | 'Central' | 'Northeast';

export type DestinationTheme = 
  | 'Beach' | 'Mountains' | 'Heritage' | 'Wildlife' | 'Adventure'
  | 'Spiritual' | 'Honeymoon' | 'Offbeat' | 'Hill Station' | 'Desert'
  | 'Backwaters' | 'Culture' | 'Nightlife' | 'Nature' | 'Food' | 'City' | 'Beaches';

export interface Destination {
  id: string;
  name: string;
  state: string;
  region: DestinationRegion;
  themes: DestinationTheme[];
  idealMonths: number[];
  suggestedDurationMin: number;
  suggestedDurationMax: number;
  highlight: string;
  imageUrl: string | null;
  isFeatured: boolean;
  isActive: boolean;
}

export interface DestinationFilters {
  region?: DestinationRegion;
  theme?: DestinationTheme;
  search?: string;
}

/**
 * Fetch destinations from the API
 */
export async function fetchDestinations(filters?: DestinationFilters): Promise<Destination[]> {
  try {
    const params = new URLSearchParams();
    params.set('isActive', 'true'); // Only show active destinations
    
    if (filters?.region) params.set('region', filters.region);
    if (filters?.theme) params.set('theme', filters.theme);
    if (filters?.search) params.set('search', filters.search);

    const url = `${API_BASE_URL}/api/requests/destinations?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.warn('Failed to fetch destinations from API, using fallback:', error);
    return [];
  }
}

/**
 * Fetch featured destinations
 */
export async function fetchFeaturedDestinations(): Promise<Destination[]> {
  try {
    const params = new URLSearchParams({
      isActive: 'true',
      isFeatured: 'true',
    });

    const url = `${API_BASE_URL}/api/requests/destinations?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.warn('Failed to fetch featured destinations from API:', error);
    return [];
  }
}

/**
 * Format ideal months for display
 */
export function formatIdealMonths(months: number[]): string {
  if (!months || months.length === 0) return 'Year-round';
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Group consecutive months
  if (months.length <= 2) {
    return months.map(m => monthNames[m - 1]).join('-');
  }
  
  // Check if all year
  if (months.length >= 10) return 'Year-round';
  
  // Find ranges
  const sortedMonths = [...months].sort((a, b) => a - b);
  return `${monthNames[sortedMonths[0] - 1]}-${monthNames[sortedMonths[sortedMonths.length - 1] - 1]}`;
}

/**
 * Format suggested duration for display
 */
export function formatDuration(min: number, max: number): string {
  if (min === max) return `${min} days`;
  return `${min}-${max} days`;
}
