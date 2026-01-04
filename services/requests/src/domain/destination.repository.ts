/**
 * Destinations Repository
 *
 * Data access for destinations (explore page).
 *
 * Note: We use Supabase service-role access instead of direct pg queries.
 * This makes the service resilient to DATABASE_URL misconfiguration and
 * aligns with the source of truth used by image uploads.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../env';

export interface Destination {
  id: string;
  name: string;
  state: string;
  region: 'North' | 'South' | 'East' | 'West' | 'Central' | 'Northeast';
  themes: string[];
  idealMonths: number[];
  suggestedDurationMin: number;
  suggestedDurationMax: number;
  highlight: string;
  imageUrl: string | null;
  isFeatured: boolean;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDestinationInput {
  id: string;
  name: string;
  state: string;
  region: string;
  themes: string[];
  idealMonths: number[];
  suggestedDurationMin: number;
  suggestedDurationMax: number;
  highlight: string;
  imageUrl?: string | null;
  isFeatured?: boolean;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdateDestinationInput {
  name?: string;
  state?: string;
  region?: string;
  themes?: string[];
  idealMonths?: number[];
  suggestedDurationMin?: number;
  suggestedDurationMax?: number;
  highlight?: string;
  imageUrl?: string | null;
  isFeatured?: boolean;
  isActive?: boolean;
  displayOrder?: number;
}

export interface DestinationFilters {
  region?: string;
  theme?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  search?: string;
}

export interface DestinationRepository {
  findAll(filters?: DestinationFilters): Promise<Destination[]>;
  findById(id: string): Promise<Destination | null>;
  create(input: CreateDestinationInput): Promise<Destination>;
  update(id: string, input: UpdateDestinationInput): Promise<Destination | null>;
  delete(id: string): Promise<boolean>;
  getStats(): Promise<{
    total: number;
    active: number;
    featured: number;
    byRegion: Record<string, number>;
  }>;
  bulkCreate(destinations: CreateDestinationInput[]): Promise<{ imported: number; errors: Array<{ id: string; error: string }> }>;
}

type DestinationRow = {
  id: string;
  name: string;
  state: string;
  region: string;
  themes: string[] | null;
  ideal_months: number[] | null;
  suggested_duration_min: number | null;
  suggested_duration_max: number | null;
  highlight: string | null;
  image_url: string | null;
  is_featured: boolean | null;
  is_active: boolean | null;
  display_order: number | null;
  created_at: string | null;
  updated_at: string | null;
};

let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(config.database.supabaseUrl, config.database.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabaseClient;
}

function mapRow(row: DestinationRow): Destination {
  return {
    id: row.id,
    name: row.name,
    state: row.state,
    region: row.region as Destination['region'],
    themes: row.themes || [],
    idealMonths: row.ideal_months || [],
    suggestedDurationMin: row.suggested_duration_min ?? 0,
    suggestedDurationMax: row.suggested_duration_max ?? 0,
    highlight: row.highlight || '',
    imageUrl: row.image_url,
    isFeatured: row.is_featured ?? false,
    isActive: row.is_active ?? true,
    displayOrder: row.display_order ?? 0,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(0),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(0),
  };
}

export function createDestinationRepository(): DestinationRepository {
  return {
    async findAll(filters?: DestinationFilters): Promise<Destination[]> {
      const supabase = getSupabase();

      let query = supabase
        .from('destinations')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (filters?.region) {
        query = query.eq('region', filters.region);
      }

      if (filters?.theme) {
        // themes is TEXT[] (per schema). `.contains` maps to Postgres @>.
        query = query.contains('themes', [filters.theme]);
      }

      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      if (filters?.isFeatured !== undefined) {
        query = query.eq('is_featured', filters.isFeatured);
      }

      if (filters?.search) {
        const term = filters.search.replace(/%/g, '\\%');
        query = query.or(`name.ilike.%${term}%,state.ilike.%${term}%,highlight.ilike.%${term}%`);
      }

      const result = await query;
      if (result.error) {
        throw new Error(result.error.message);
      }

      return (result.data || []).map((row) => mapRow(row as DestinationRow));
    },

    async findById(id: string): Promise<Destination | null> {
      const supabase = getSupabase();
      const result = await supabase.from('destinations').select('*').eq('id', id).maybeSingle();
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data ? mapRow(result.data as DestinationRow) : null;
    },

    async create(input: CreateDestinationInput): Promise<Destination> {
      const supabase = getSupabase();
      const payload = {
        id: input.id,
        name: input.name,
        state: input.state,
        region: input.region,
        themes: input.themes,
        ideal_months: input.idealMonths,
        suggested_duration_min: input.suggestedDurationMin,
        suggested_duration_max: input.suggestedDurationMax,
        highlight: input.highlight,
        image_url: input.imageUrl ?? null,
        is_featured: input.isFeatured ?? false,
        is_active: input.isActive ?? true,
        display_order: input.displayOrder ?? 0,
      };

      const result = await supabase.from('destinations').insert(payload).select('*').single();
      if (result.error) {
        throw new Error(result.error.message);
      }
      return mapRow(result.data as DestinationRow);
    },

    async update(id: string, input: UpdateDestinationInput): Promise<Destination | null> {
      const supabase = getSupabase();
      const payload: Record<string, unknown> = {};

      if (input.name !== undefined) payload.name = input.name;
      if (input.state !== undefined) payload.state = input.state;
      if (input.region !== undefined) payload.region = input.region;
      if (input.themes !== undefined) payload.themes = input.themes;
      if (input.idealMonths !== undefined) payload.ideal_months = input.idealMonths;
      if (input.suggestedDurationMin !== undefined) payload.suggested_duration_min = input.suggestedDurationMin;
      if (input.suggestedDurationMax !== undefined) payload.suggested_duration_max = input.suggestedDurationMax;
      if (input.highlight !== undefined) payload.highlight = input.highlight;
      if (input.imageUrl !== undefined) payload.image_url = input.imageUrl;
      if (input.isFeatured !== undefined) payload.is_featured = input.isFeatured;
      if (input.isActive !== undefined) payload.is_active = input.isActive;
      if (input.displayOrder !== undefined) payload.display_order = input.displayOrder;

      if (Object.keys(payload).length === 0) {
        return this.findById(id);
      }

      // Keep parity with pg implementation updating updated_at
      payload.updated_at = new Date().toISOString();

      const result = await supabase.from('destinations').update(payload).eq('id', id).select('*').maybeSingle();
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data ? mapRow(result.data as DestinationRow) : null;
    },

    async delete(id: string): Promise<boolean> {
      const supabase = getSupabase();
      const result = await supabase.from('destinations').delete().eq('id', id);
      if (result.error) {
        throw new Error(result.error.message);
      }
      // Supabase doesn't always provide affected rows in a consistent way; treat success as deleted.
      return true;
    },

    async getStats() {
      const supabase = getSupabase();

      const total = await supabase.from('destinations').select('id', { count: 'exact', head: true });
      if (total.error) throw new Error(total.error.message);

      const active = await supabase
        .from('destinations')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);
      if (active.error) throw new Error(active.error.message);

      const featured = await supabase
        .from('destinations')
        .select('id', { count: 'exact', head: true })
        .eq('is_featured', true);
      if (featured.error) throw new Error(featured.error.message);

      // Aggregate by region in-memory (destinations volume is small).
      const regions = await supabase.from('destinations').select('region');
      if (regions.error) throw new Error(regions.error.message);

      const byRegion: Record<string, number> = {};
      for (const row of regions.data || []) {
        const region = (row as { region?: string | null }).region;
        if (!region) continue;
        byRegion[region] = (byRegion[region] || 0) + 1;
      }

      return {
        total: total.count ?? 0,
        active: active.count ?? 0,
        featured: featured.count ?? 0,
        byRegion,
      };
    },

    async bulkCreate(destinations: CreateDestinationInput[]) {
      const imported: number[] = [];
      const errors: Array<{ id: string; error: string }> = [];

      for (const dest of destinations) {
        try {
          await this.create(dest);
          imported.push(1);
        } catch (err) {
          errors.push({
            id: dest.id,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      return { imported: imported.length, errors };
    },
  };
}
