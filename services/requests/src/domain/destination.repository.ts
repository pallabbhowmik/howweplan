/**
 * Destinations Repository
 * 
 * Database operations for destinations (explore page).
 */

import { Pool } from 'pg';
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

const pool = new Pool({
  connectionString: config.database.url,
});

function mapRow(row: any): Destination {
  return {
    id: row.id,
    name: row.name,
    state: row.state,
    region: row.region,
    themes: row.themes || [],
    idealMonths: row.ideal_months || [],
    suggestedDurationMin: row.suggested_duration_min,
    suggestedDurationMax: row.suggested_duration_max,
    highlight: row.highlight,
    imageUrl: row.image_url,
    isFeatured: row.is_featured,
    isActive: row.is_active,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createDestinationRepository(): DestinationRepository {
  return {
    async findAll(filters?: DestinationFilters): Promise<Destination[]> {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (filters?.region) {
        conditions.push(`region = $${paramIndex++}`);
        params.push(filters.region);
      }

      if (filters?.theme) {
        conditions.push(`$${paramIndex++} = ANY(themes)`);
        params.push(filters.theme);
      }

      if (filters?.isActive !== undefined) {
        conditions.push(`is_active = $${paramIndex++}`);
        params.push(filters.isActive);
      }

      if (filters?.isFeatured !== undefined) {
        conditions.push(`is_featured = $${paramIndex++}`);
        params.push(filters.isFeatured);
      }

      if (filters?.search) {
        conditions.push(`(name ILIKE $${paramIndex} OR state ILIKE $${paramIndex} OR highlight ILIKE $${paramIndex})`);
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const query = `
        SELECT * FROM destinations
        ${whereClause}
        ORDER BY display_order ASC, name ASC
      `;

      const result = await pool.query(query, params);
      return result.rows.map(mapRow);
    },

    async findById(id: string): Promise<Destination | null> {
      const result = await pool.query(
        'SELECT * FROM destinations WHERE id = $1',
        [id]
      );
      return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
    },

    async create(input: CreateDestinationInput): Promise<Destination> {
      const result = await pool.query(
        `INSERT INTO destinations (
          id, name, state, region, themes, ideal_months,
          suggested_duration_min, suggested_duration_max, highlight,
          image_url, is_featured, is_active, display_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          input.id,
          input.name,
          input.state,
          input.region,
          input.themes,
          input.idealMonths,
          input.suggestedDurationMin,
          input.suggestedDurationMax,
          input.highlight,
          input.imageUrl || null,
          input.isFeatured ?? false,
          input.isActive ?? true,
          input.displayOrder ?? 0,
        ]
      );
      return mapRow(result.rows[0]);
    },

    async update(id: string, input: UpdateDestinationInput): Promise<Destination | null> {
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (input.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        params.push(input.name);
      }
      if (input.state !== undefined) {
        updates.push(`state = $${paramIndex++}`);
        params.push(input.state);
      }
      if (input.region !== undefined) {
        updates.push(`region = $${paramIndex++}`);
        params.push(input.region);
      }
      if (input.themes !== undefined) {
        updates.push(`themes = $${paramIndex++}`);
        params.push(input.themes);
      }
      if (input.idealMonths !== undefined) {
        updates.push(`ideal_months = $${paramIndex++}`);
        params.push(input.idealMonths);
      }
      if (input.suggestedDurationMin !== undefined) {
        updates.push(`suggested_duration_min = $${paramIndex++}`);
        params.push(input.suggestedDurationMin);
      }
      if (input.suggestedDurationMax !== undefined) {
        updates.push(`suggested_duration_max = $${paramIndex++}`);
        params.push(input.suggestedDurationMax);
      }
      if (input.highlight !== undefined) {
        updates.push(`highlight = $${paramIndex++}`);
        params.push(input.highlight);
      }
      if (input.imageUrl !== undefined) {
        updates.push(`image_url = $${paramIndex++}`);
        params.push(input.imageUrl);
      }
      if (input.isFeatured !== undefined) {
        updates.push(`is_featured = $${paramIndex++}`);
        params.push(input.isFeatured);
      }
      if (input.isActive !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        params.push(input.isActive);
      }
      if (input.displayOrder !== undefined) {
        updates.push(`display_order = $${paramIndex++}`);
        params.push(input.displayOrder);
      }

      if (updates.length === 0) {
        return this.findById(id);
      }

      params.push(id);
      const result = await pool.query(
        `UPDATE destinations SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${paramIndex}
         RETURNING *`,
        params
      );

      return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
    },

    async delete(id: string): Promise<boolean> {
      const result = await pool.query(
        'DELETE FROM destinations WHERE id = $1',
        [id]
      );
      return (result.rowCount || 0) > 0;
    },

    async getStats() {
      const result = await pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_active = true) as active,
          COUNT(*) FILTER (WHERE is_featured = true) as featured,
          region,
          COUNT(*) as region_count
        FROM destinations
        GROUP BY GROUPING SETS ((), (region))
      `);

      const stats = {
        total: 0,
        active: 0,
        featured: 0,
        byRegion: {} as Record<string, number>,
      };

      for (const row of result.rows) {
        if (row.region === null) {
          stats.total = parseInt(row.total);
          stats.active = parseInt(row.active);
          stats.featured = parseInt(row.featured);
        } else {
          stats.byRegion[row.region] = parseInt(row.region_count);
        }
      }

      return stats;
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
