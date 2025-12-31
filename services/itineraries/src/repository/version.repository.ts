import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../env.js';
import type { ItineraryVersion } from '../models/index.js';

/**
 * Repository for itinerary version data access.
 */
export class VersionRepository {
  private readonly client: SupabaseClient;
  private readonly tableName = 'itinerary_versions';

  constructor(client?: SupabaseClient) {
    this.client = client ?? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }

  /**
   * Create a new version.
   */
  async create(version: ItineraryVersion): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .insert(this.toRow(version));

    if (error) {
      throw new Error(`Failed to create version: ${error.message}`);
    }
  }

  /**
   * Find version by ID.
   */
  async findById(id: string): Promise<ItineraryVersion | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find version: ${error.message}`);
    }

    return data ? this.fromRow(data) : null;
  }

  /**
   * Find version by itinerary ID and version number.
   */
  async findByItineraryAndVersion(
    itineraryId: string,
    version: number
  ): Promise<ItineraryVersion | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('itinerary_id', itineraryId)
      .eq('version', version)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find version: ${error.message}`);
    }

    return data ? this.fromRow(data) : null;
  }

  /**
   * Find all versions for an itinerary.
   */
  async findByItineraryId(itineraryId: string): Promise<ItineraryVersion[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('itinerary_id', itineraryId)
      .order('version', { ascending: false });

    if (error) {
      throw new Error(`Failed to find versions: ${error.message}`);
    }

    return (data ?? []).map(row => this.fromRow(row));
  }

  /**
   * Find versions in a range.
   */
  async findByItineraryIdAndVersionRange(
    itineraryId: string,
    fromVersion: number,
    toVersion: number
  ): Promise<ItineraryVersion[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('itinerary_id', itineraryId)
      .gte('version', fromVersion)
      .lte('version', toVersion)
      .order('version', { ascending: true });

    if (error) {
      throw new Error(`Failed to find versions: ${error.message}`);
    }

    return (data ?? []).map(row => this.fromRow(row));
  }

  /**
   * Count versions for an itinerary.
   */
  async countByItineraryId(itineraryId: string): Promise<number> {
    const { count, error } = await this.client
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('itinerary_id', itineraryId);

    if (error) {
      throw new Error(`Failed to count versions: ${error.message}`);
    }

    return count ?? 0;
  }

  /**
   * Get latest version number for an itinerary.
   */
  async getLatestVersionNumber(itineraryId: string): Promise<number> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('version')
      .eq('itinerary_id', itineraryId)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return 0;
      }
      throw new Error(`Failed to get latest version: ${error.message}`);
    }

    return (data?.['version'] as number) ?? 0;
  }

  /**
   * Find oldest version for an itinerary.
   */
  async findOldestByItineraryId(itineraryId: string): Promise<ItineraryVersion | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('itinerary_id', itineraryId)
      .order('version', { ascending: true })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find oldest version: ${error.message}`);
    }

    return data ? this.fromRow(data) : null;
  }

  /**
   * Delete a version.
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete version: ${error.message}`);
    }
  }

  /**
   * Delete all versions for an itinerary.
   */
  async deleteByItineraryId(itineraryId: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('itinerary_id', itineraryId);

    if (error) {
      throw new Error(`Failed to delete versions: ${error.message}`);
    }
  }

  /**
   * Convert model to database row.
   */
  private toRow(version: ItineraryVersion): Record<string, unknown> {
    return {
      id: version.id,
      itinerary_id: version.itineraryId,
      version: version.version,
      snapshot: version.snapshot,
      changes: version.changes,
      changed_by: version.changedBy,
      changed_by_role: version.changedByRole,
      change_reason: version.changeReason,
      snapshot_hash: version.snapshotHash,
      created_at: version.createdAt,
    };
  }

  /**
   * Convert database row to model.
   */
  private fromRow(row: Record<string, unknown>): ItineraryVersion {
    return {
      id: row['id'] as string,
      itineraryId: row['itinerary_id'] as string,
      version: row['version'] as number,
      snapshot: row['snapshot'] as string,
      changes: row['changes'] as ItineraryVersion['changes'],
      changedBy: row['changed_by'] as string,
      changedByRole: row['changed_by_role'] as ItineraryVersion['changedByRole'],
      changeReason: row['change_reason'] as string | undefined,
      snapshotHash: row['snapshot_hash'] as string,
      createdAt: row['created_at'] as string,
    };
  }
}
