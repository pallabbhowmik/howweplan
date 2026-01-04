/**
 * Destinations API Service
 * 
 * Manage explore page destinations.
 * Admins can add, edit, and remove destinations with their images.
 * 
 * NOTE: Destinations are stored directly in Supabase as reference data.
 */

import { getSupabaseClient } from '@/lib/supabase/client';
import type { PaginationParams } from '@/types';

// Get the shared Supabase client (singleton - no multiple instances)
const getSupabase = () => getSupabaseClient();

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
  readonly limit?: number;
  readonly filters?: DestinationFilters;
}

export interface DestinationsListResponse {
  readonly data: readonly Destination[];
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  };
}

export interface DestinationStats {
  readonly total: number;
  readonly active: number;
  readonly featured: number;
  readonly byRegion: Record<DestinationRegion, number>;
}

// Helper to convert DB row to Destination
function toDestination(row: any): Destination {
  return {
    id: row.id,
    name: row.name,
    state: row.state,
    region: row.region,
    themes: row.themes || [],
    idealMonths: row.ideal_months || [],
    suggestedDurationMin: row.suggested_duration_min || 1,
    suggestedDurationMax: row.suggested_duration_max || 7,
    highlight: row.highlight || '',
    imageUrl: row.image_url,
    isFeatured: row.is_featured || false,
    isActive: row.is_active ?? true,
    displayOrder: row.display_order || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get paginated list of destinations
 */
export async function getDestinations(
  params?: DestinationQueryParams
): Promise<DestinationsListResponse> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? params?.pageSize ?? 20;
  const offset = (page - 1) * limit;
  
  let query = getSupabase()
    .from('destinations')
    .select('*', { count: 'exact' });
  
  // Apply filters
  if (params?.filters) {
    if (params.filters.region) {
      query = query.eq('region', params.filters.region);
    }
    if (params.filters.theme) {
      query = query.contains('themes', [params.filters.theme]);
    }
    if (params.filters.isActive !== undefined) {
      query = query.eq('is_active', params.filters.isActive);
    }
    if (params.filters.isFeatured !== undefined) {
      query = query.eq('is_featured', params.filters.isFeatured);
    }
    if (params.filters.search) {
      query = query.or(`name.ilike.%${params.filters.search}%,state.ilike.%${params.filters.search}%`);
    }
  }
  
  // Apply pagination and ordering
  query = query
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1);
  
  const { data, error, count } = await query;
  
  if (error) {
    console.error('Failed to fetch destinations:', error);
    throw new Error(error.message);
  }
  
  return {
    data: (data || []).map(toDestination),
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

/**
 * Get a single destination by ID
 */
export async function getDestination(id: string): Promise<Destination> {
  const { data, error } = await getSupabase()
    .from('destinations')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    throw new Error(error.message);
  }
  
  return toDestination(data);
}

/**
 * Create a new destination
 */
export async function createDestination(dto: CreateDestinationDto): Promise<Destination> {
  const { data, error } = await getSupabase()
    .from('destinations')
    .insert({
      id: dto.id,
      name: dto.name,
      state: dto.state,
      region: dto.region,
      themes: dto.themes,
      ideal_months: dto.idealMonths,
      suggested_duration_min: dto.suggestedDurationMin,
      suggested_duration_max: dto.suggestedDurationMax,
      highlight: dto.highlight,
      image_url: dto.imageUrl,
      is_featured: dto.isFeatured ?? false,
      is_active: dto.isActive ?? true,
      display_order: dto.displayOrder ?? 0,
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(error.message);
  }
  
  return toDestination(data);
}

/**
 * Update an existing destination
 */
export async function updateDestination(
  id: string,
  dto: UpdateDestinationDto
): Promise<Destination> {
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  
  if (dto.name !== undefined) updates.name = dto.name;
  if (dto.state !== undefined) updates.state = dto.state;
  if (dto.region !== undefined) updates.region = dto.region;
  if (dto.themes !== undefined) updates.themes = dto.themes;
  if (dto.idealMonths !== undefined) updates.ideal_months = dto.idealMonths;
  if (dto.suggestedDurationMin !== undefined) updates.suggested_duration_min = dto.suggestedDurationMin;
  if (dto.suggestedDurationMax !== undefined) updates.suggested_duration_max = dto.suggestedDurationMax;
  if (dto.highlight !== undefined) updates.highlight = dto.highlight;
  if (dto.imageUrl !== undefined) updates.image_url = dto.imageUrl;
  if (dto.isFeatured !== undefined) updates.is_featured = dto.isFeatured;
  if (dto.isActive !== undefined) updates.is_active = dto.isActive;
  if (dto.displayOrder !== undefined) updates.display_order = dto.displayOrder;
  
  const { data, error } = await getSupabase()
    .from('destinations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    throw new Error(error.message);
  }
  
  return toDestination(data);
}

/**
 * Upload destination image and persist its public URL
 */
export async function uploadDestinationImage(
  id: string,
  file: File
): Promise<Destination> {
  // Upload to Supabase Storage
  const fileExt = file.name.split('.').pop();
  const filePath = `destinations/${id}.${fileExt}`;
  
  const { error: uploadError } = await getSupabase().storage
    .from('images')
    .upload(filePath, file, { upsert: true });
  
  if (uploadError) {
    throw new Error(uploadError.message);
  }
  
  // Get public URL with cache-busting timestamp
  const { data: urlData } = getSupabase().storage
    .from('images')
    .getPublicUrl(filePath);
  
  // Add timestamp to bust caches when image is updated
  const imageUrlWithCacheBust = `${urlData.publicUrl}?v=${Date.now()}`;
  
  // Update destination with image URL (includes cache-busting param)
  return updateDestination(id, { imageUrl: imageUrlWithCacheBust });
}

/**
 * Delete a destination
 */
export async function deleteDestination(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('destinations')
    .delete()
    .eq('id', id);
  
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Get destination statistics
 */
export async function getDestinationStats(): Promise<DestinationStats> {
  const { data, error } = await getSupabase()
    .from('destinations')
    .select('region, is_active, is_featured');
  
  if (error) {
    throw new Error(error.message);
  }
  
  const stats: DestinationStats = {
    total: data?.length || 0,
    active: data?.filter(d => d.is_active).length || 0,
    featured: data?.filter(d => d.is_featured).length || 0,
    byRegion: {
      'North': 0,
      'South': 0,
      'East': 0,
      'West': 0,
      'Central': 0,
      'Northeast': 0,
    },
  };
  
  data?.forEach(d => {
    if (d.region && stats.byRegion[d.region as DestinationRegion] !== undefined) {
      stats.byRegion[d.region as DestinationRegion]++;
    }
  });
  
  return stats;
}

/**
 * Bulk update destinations (for reordering, bulk activate/deactivate)
 */
export async function bulkUpdateDestinations(
  updates: Array<{ id: string; updates: UpdateDestinationDto }>
): Promise<Destination[]> {
  const results: Destination[] = [];
  
  for (const { id, updates: dto } of updates) {
    const result = await updateDestination(id, dto);
    results.push(result);
  }
  
  return results;
}

/**
 * Import destinations from JSON
 */
export async function importDestinations(
  destinations: CreateDestinationDto[]
): Promise<{ imported: number; errors: Array<{ id: string; error: string }> }> {
  const errors: Array<{ id: string; error: string }> = [];
  let imported = 0;
  
  for (const dest of destinations) {
    try {
      await createDestination(dest);
      imported++;
    } catch (err: any) {
      errors.push({ id: dest.id, error: err.message });
    }
  }
  
  return { imported, errors };
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
