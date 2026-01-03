/**
 * Destinations API Service
 * 
 * Manage explore page destinations.
 * Admins can add, edit, and remove destinations with their images.
 */

import { apiClient, buildPaginationParams } from './client';
import type { PaginationParams, PaginatedResponse } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

export type DestinationRegion = 'North' | 'South' | 'East' | 'West' | 'Central' | 'Northeast';

export type DestinationTheme = 
  | 'Beach' | 'Mountains' | 'Heritage' | 'Wildlife' | 'Adventure'
  | 'Spiritual' | 'Honeymoon' | 'Offbeat' | 'Hill Station' | 'Desert'
  | 'Backwaters' | 'Culture' | 'Nightlife';

export interface Destination {
  readonly id: string;
  readonly name: string;
  readonly state: string;
  readonly region: DestinationRegion;
  readonly themes: readonly DestinationTheme[];
  readonly idealMonths: readonly number[];
  readonly suggestedDurationMin: number;
  readonly suggestedDurationMax: number;
  readonly highlight: string;
  readonly imageUrl: string | null;
  readonly isFeatured: boolean;
  readonly isActive: boolean;
  readonly displayOrder: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateDestinationDto {
  readonly id: string;
  readonly name: string;
  readonly state: string;
  readonly region: DestinationRegion;
  readonly themes: readonly DestinationTheme[];
  readonly idealMonths: readonly number[];
  readonly suggestedDurationMin: number;
  readonly suggestedDurationMax: number;
  readonly highlight: string;
  readonly imageUrl?: string | null;
  readonly isFeatured?: boolean;
  readonly isActive?: boolean;
  readonly displayOrder?: number;
}

export interface UpdateDestinationDto {
  readonly name?: string;
  readonly state?: string;
  readonly region?: DestinationRegion;
  readonly themes?: readonly DestinationTheme[];
  readonly idealMonths?: readonly number[];
  readonly suggestedDurationMin?: number;
  readonly suggestedDurationMax?: number;
  readonly highlight?: string;
  readonly imageUrl?: string | null;
  readonly isFeatured?: boolean;
  readonly isActive?: boolean;
  readonly displayOrder?: number;
}

export interface DestinationFilters {
  readonly region?: DestinationRegion;
  readonly theme?: DestinationTheme;
  readonly isActive?: boolean;
  readonly isFeatured?: boolean;
  readonly search?: string;
}

export interface DestinationQueryParams extends PaginationParams {
  readonly filters?: DestinationFilters;
}

export interface DestinationStats {
  readonly total: number;
  readonly active: number;
  readonly featured: number;
  readonly byRegion: Record<DestinationRegion, number>;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get paginated list of destinations
 */
export async function getDestinations(
  params?: DestinationQueryParams
): Promise<PaginatedResponse<Destination>> {
  const queryParams = buildPaginationParams(params);
  
  if (params?.filters) {
    if (params.filters.region) queryParams.region = params.filters.region;
    if (params.filters.theme) queryParams.theme = params.filters.theme;
    if (params.filters.isActive !== undefined) queryParams.isActive = String(params.filters.isActive);
    if (params.filters.isFeatured !== undefined) queryParams.isFeatured = String(params.filters.isFeatured);
    if (params.filters.search) queryParams.search = params.filters.search;
  }

  return apiClient.get<PaginatedResponse<Destination>>('/destinations', { params: queryParams });
}

/**
 * Get a single destination by ID
 */
export async function getDestination(id: string): Promise<Destination> {
  return apiClient.get<Destination>(`/destinations/${encodeURIComponent(id)}`);
}

/**
 * Create a new destination
 */
export async function createDestination(data: CreateDestinationDto): Promise<Destination> {
  return apiClient.post<Destination>('/destinations', data);
}

/**
 * Update an existing destination
 */
export async function updateDestination(
  id: string,
  data: UpdateDestinationDto
): Promise<Destination> {
  return apiClient.patch<Destination>(`/destinations/${encodeURIComponent(id)}`, data);
}

/**
 * Delete a destination
 */
export async function deleteDestination(id: string): Promise<void> {
  return apiClient.delete(`/destinations/${encodeURIComponent(id)}`);
}

/**
 * Get destination statistics
 */
export async function getDestinationStats(): Promise<DestinationStats> {
  return apiClient.get<DestinationStats>('/destinations/stats');
}

/**
 * Bulk update destinations (for reordering, bulk activate/deactivate)
 */
export async function bulkUpdateDestinations(
  updates: Array<{ id: string; updates: UpdateDestinationDto }>
): Promise<Destination[]> {
  return apiClient.patch<Destination[]>('/destinations/bulk', { updates });
}

/**
 * Import destinations from JSON
 */
export async function importDestinations(
  destinations: CreateDestinationDto[]
): Promise<{ imported: number; errors: Array<{ id: string; error: string }> }> {
  return apiClient.post('/destinations/import', { destinations });
}

// ============================================================================
// THEME & REGION CONSTANTS
// ============================================================================

export const DESTINATION_REGIONS: DestinationRegion[] = [
  'North', 'South', 'East', 'West', 'Central', 'Northeast'
];

export const DESTINATION_THEMES: DestinationTheme[] = [
  'Beach', 'Mountains', 'Heritage', 'Wildlife', 'Adventure',
  'Spiritual', 'Honeymoon', 'Offbeat', 'Hill Station', 'Desert',
  'Backwaters', 'Culture', 'Nightlife'
];

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const THEME_COLORS: Record<DestinationTheme, string> = {
  'Beach': 'bg-cyan-100 text-cyan-800',
  'Mountains': 'bg-emerald-100 text-emerald-800',
  'Heritage': 'bg-amber-100 text-amber-800',
  'Wildlife': 'bg-lime-100 text-lime-800',
  'Adventure': 'bg-orange-100 text-orange-800',
  'Spiritual': 'bg-purple-100 text-purple-800',
  'Honeymoon': 'bg-pink-100 text-pink-800',
  'Offbeat': 'bg-indigo-100 text-indigo-800',
  'Hill Station': 'bg-teal-100 text-teal-800',
  'Desert': 'bg-yellow-100 text-yellow-800',
  'Backwaters': 'bg-blue-100 text-blue-800',
  'Culture': 'bg-rose-100 text-rose-800',
  'Nightlife': 'bg-violet-100 text-violet-800',
};

export const REGION_COLORS: Record<DestinationRegion, string> = {
  'North': 'bg-blue-100 text-blue-800',
  'South': 'bg-green-100 text-green-800',
  'East': 'bg-amber-100 text-amber-800',
  'West': 'bg-orange-100 text-orange-800',
  'Central': 'bg-purple-100 text-purple-800',
  'Northeast': 'bg-teal-100 text-teal-800',
};
