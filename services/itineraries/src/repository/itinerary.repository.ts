import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../env.js';
import type { Itinerary, ItineraryItem } from '../models/index.js';

/**
 * Repository for itinerary data access.
 */
export class ItineraryRepository {
  private readonly client: SupabaseClient;
  private readonly tableName = 'itineraries';
  private readonly itemsTableName = 'itinerary_items';

  constructor(client?: SupabaseClient) {
    this.client = client ?? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }

  /**
   * Create a new itinerary.
   */
  async create(itinerary: Itinerary): Promise<void> {
    // Insert itinerary
    const row = this.toItineraryRow(itinerary);
    console.log('Inserting itinerary row:', JSON.stringify(row, null, 2));
    
    const { error: itineraryError } = await this.client
      .from(this.tableName)
      .insert(row);

    if (itineraryError) {
      console.error('Supabase itinerary insert error:', itineraryError);
      throw new Error(`Failed to create itinerary: ${itineraryError.message}`);
    }

    // Insert items if any
    if (itinerary.items.length > 0) {
      const itemRows = itinerary.items.map(item => this.toItemRow(item));
      console.log('Inserting item rows:', JSON.stringify(itemRows, null, 2));
      
      const { error: itemsError } = await this.client
        .from(this.itemsTableName)
        .insert(itemRows);

      if (itemsError) {
        console.error('Supabase items insert error:', itemsError);
        // Rollback itinerary
        await this.client.from(this.tableName).delete().eq('id', itinerary.id);
        throw new Error(`Failed to create itinerary items: ${itemsError.message}`);
      }
    }
  }

  /**
   * Find itinerary by ID.
   */
  async findById(id: string): Promise<Itinerary | null> {
    // Get itinerary
    const { data: itineraryData, error: itineraryError } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (itineraryError) {
      if (itineraryError.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find itinerary: ${itineraryError.message}`);
    }

    if (!itineraryData) {
      return null;
    }

    // Get items
    const { data: itemsData, error: itemsError } = await this.client
      .from(this.itemsTableName)
      .select('*')
      .eq('itinerary_id', id)
      .order('sequence', { ascending: true });

    if (itemsError) {
      throw new Error(`Failed to find itinerary items: ${itemsError.message}`);
    }

    const itinerary = this.fromItineraryRow(itineraryData);
    itinerary.items = (itemsData ?? []).map(row => this.fromItemRow(row));

    return itinerary;
  }

  /**
   * Find itineraries by request ID.
   * Uses batch query to avoid N+1 problem.
   */
  async findByRequestId(requestId: string): Promise<Itinerary[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find itineraries: ${error.message}`);
    }

    const itineraries = (data ?? []).map(row => this.fromItineraryRow(row));
    
    // Batch load items for all itineraries in a single query
    await this.loadItemsForItineraries(itineraries);

    return itineraries;
  }

  /**
   * Find itineraries by agent ID or user ID.
   * First tries to find by agent_id directly, then looks up agents by user_id.
   * Uses batch query to avoid N+1 problem.
   */
  async findByAgentId(agentIdOrUserId: string): Promise<Itinerary[]> {
    // First, try direct match on agent_id
    let { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('agent_id', agentIdOrUserId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find itineraries: ${error.message}`);
    }

    // If no results, try looking up agents by user_id and get their itineraries
    if (!data || data.length === 0) {
      // Get agent IDs for this user
      const { data: agentData } = await this.client
        .from('agents')
        .select('id')
        .eq('user_id', agentIdOrUserId);
      
      if (agentData && agentData.length > 0) {
        const agentIds = agentData.map((a: { id: string }) => a.id);
        console.log('[findByAgentId] Found agent IDs for user:', agentIds);
        
        const { data: itinData, error: itinError } = await this.client
          .from(this.tableName)
          .select('*')
          .in('agent_id', agentIds)
          .order('created_at', { ascending: false });
        
        if (itinError) {
          throw new Error(`Failed to find itineraries by agent IDs: ${itinError.message}`);
        }
        data = itinData;
      }
    }

    const itineraries = (data ?? []).map(row => this.fromItineraryRow(row));

    // Batch load items for all itineraries in a single query
    await this.loadItemsForItineraries(itineraries);

    return itineraries;
  }

  /**
   * Find itineraries by traveler ID.
   * Uses batch query to avoid N+1 problem.
   */
  async findByTravelerId(travelerId: string): Promise<Itinerary[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('traveler_id', travelerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find itineraries: ${error.message}`);
    }

    const itineraries = (data ?? []).map(row => this.fromItineraryRow(row));

    // Batch load items for all itineraries in a single query
    await this.loadItemsForItineraries(itineraries);

    return itineraries;
  }

  /**
   * Batch load items for multiple itineraries.
   * Uses a single query with IN clause and groups results using Map (O(n) complexity).
   * This avoids the N+1 query problem where we'd otherwise make 1 query per itinerary.
   */
  private async loadItemsForItineraries(itineraries: Itinerary[]): Promise<void> {
    if (itineraries.length === 0) return;

    // Get all itinerary IDs
    const itineraryIds = itineraries.map(i => i.id);

    // Single batch query with IN clause
    const { data: allItemsData, error } = await this.client
      .from(this.itemsTableName)
      .select('*')
      .in('itinerary_id', itineraryIds)
      .order('sequence', { ascending: true });

    if (error) {
      throw new Error(`Failed to load itinerary items: ${error.message}`);
    }

    // Group items by itinerary_id using Map for O(1) lookups
    const itemsByItineraryId = new Map<string, ItineraryItem[]>();
    
    for (const row of allItemsData ?? []) {
      const itineraryId = row['itinerary_id'] as string;
      const item = this.fromItemRow(row);
      
      if (!itemsByItineraryId.has(itineraryId)) {
        itemsByItineraryId.set(itineraryId, []);
      }
      itemsByItineraryId.get(itineraryId)!.push(item);
    }

    // Attach items to itineraries using Map lookup (O(1) per itinerary)
    for (const itinerary of itineraries) {
      itinerary.items = itemsByItineraryId.get(itinerary.id) ?? [];
    }
  }

  /**
   * Update an itinerary.
   */
  async update(id: string, updates: Partial<Itinerary>): Promise<void> {
    const row = this.toPartialItineraryRow(updates);

    if (Object.keys(row).length > 0) {
      const { error } = await this.client
        .from(this.tableName)
        .update(row)
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to update itinerary: ${error.message}`);
      }
    }

    // Update items if provided
    if (updates.items) {
      // Delete existing items
      await this.client
        .from(this.itemsTableName)
        .delete()
        .eq('itinerary_id', id);

      // Insert new items
      if (updates.items.length > 0) {
        const itemRows = updates.items.map(item => this.toItemRow(item));
        const { error: itemsError } = await this.client
          .from(this.itemsTableName)
          .insert(itemRows);

        if (itemsError) {
          throw new Error(`Failed to update itinerary items: ${itemsError.message}`);
        }
      }
    }
  }

  /**
   * Delete an itinerary.
   */
  async delete(id: string): Promise<void> {
    // Delete items first
    await this.client
      .from(this.itemsTableName)
      .delete()
      .eq('itinerary_id', id);

    // Delete itinerary
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete itinerary: ${error.message}`);
    }
  }

  /**
   * Convert itinerary to database row.
   */
  private toItineraryRow(itinerary: Itinerary): Record<string, unknown> {
    return {
      id: itinerary.id,
      request_id: itinerary.requestId,
      agent_id: itinerary.agentId,
      traveler_id: itinerary.travelerId,
      status: itinerary.status,
      disclosure_state: itinerary.disclosureState,
      overview: itinerary.overview,
      pricing: itinerary.pricing,
      day_plans: itinerary.dayPlans,
      version: itinerary.version,
      terms_and_conditions: itinerary.termsAndConditions,
      cancellation_policy: itinerary.cancellationPolicy,
      internal_notes: itinerary.internalNotes,
      created_at: itinerary.createdAt,
      updated_at: itinerary.updatedAt,
      submitted_at: itinerary.submittedAt,
      approved_at: itinerary.approvedAt,
      disclosed_at: itinerary.disclosedAt,
    };
  }

  /**
   * Convert partial itinerary to partial row.
   */
  private toPartialItineraryRow(updates: Partial<Itinerary>): Record<string, unknown> {
    const row: Record<string, unknown> = {};

    if (updates.status !== undefined) row['status'] = updates.status;
    if (updates.disclosureState !== undefined) row['disclosure_state'] = updates.disclosureState;
    if (updates.overview !== undefined) row['overview'] = updates.overview;
    if (updates.pricing !== undefined) row['pricing'] = updates.pricing;
    if (updates.dayPlans !== undefined) row['day_plans'] = updates.dayPlans;
    if (updates.version !== undefined) row['version'] = updates.version;
    if (updates.termsAndConditions !== undefined) row['terms_and_conditions'] = updates.termsAndConditions;
    if (updates.cancellationPolicy !== undefined) row['cancellation_policy'] = updates.cancellationPolicy;
    if (updates.internalNotes !== undefined) row['internal_notes'] = updates.internalNotes;
    if (updates.updatedAt !== undefined) row['updated_at'] = updates.updatedAt;
    if (updates.submittedAt !== undefined) row['submitted_at'] = updates.submittedAt;
    if (updates.approvedAt !== undefined) row['approved_at'] = updates.approvedAt;
    if (updates.disclosedAt !== undefined) row['disclosed_at'] = updates.disclosedAt;

    return row;
  }

  /**
   * Convert database row to itinerary.
   */
  private fromItineraryRow(row: Record<string, unknown>): Itinerary {
    return {
      id: row['id'] as string,
      requestId: row['request_id'] as string,
      agentId: row['agent_id'] as string,
      travelerId: row['traveler_id'] as string,
      status: row['status'] as Itinerary['status'],
      disclosureState: row['disclosure_state'] as Itinerary['disclosureState'],
      overview: row['overview'] as Itinerary['overview'],
      pricing: row['pricing'] as Itinerary['pricing'],
      items: [], // Loaded separately
      dayPlans: (row['day_plans'] as Itinerary['dayPlans']) ?? [],
      version: row['version'] as number,
      termsAndConditions: row['terms_and_conditions'] as string | undefined,
      cancellationPolicy: row['cancellation_policy'] as string | undefined,
      internalNotes: row['internal_notes'] as string | undefined,
      createdAt: row['created_at'] as string,
      updatedAt: row['updated_at'] as string,
      submittedAt: row['submitted_at'] as string | undefined,
      approvedAt: row['approved_at'] as string | undefined,
      disclosedAt: row['disclosed_at'] as string | undefined,
    };
  }

  /**
   * Convert item to database row.
   */
  private toItemRow(item: ItineraryItem): Record<string, unknown> {
    return {
      id: item.id,
      itinerary_id: item.itineraryId,
      type: item.type,
      day_number: item.dayNumber,
      sequence: item.sequence,
      title: item.title,
      description: item.description,
      location: item.location,
      time_range: item.timeRange,
      vendor: item.vendor,
      accommodation_details: item.accommodationDetails,
      transport_details: item.transportDetails,
      activity_details: item.activityDetails,
      agent_notes: item.agentNotes,
      traveler_notes: item.travelerNotes,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }

  /**
   * Convert database row to item.
   */
  private fromItemRow(row: Record<string, unknown>): ItineraryItem {
    return {
      id: row['id'] as string,
      itineraryId: row['itinerary_id'] as string,
      type: row['type'] as ItineraryItem['type'],
      dayNumber: row['day_number'] as number,
      sequence: row['sequence'] as number,
      title: row['title'] as string,
      description: row['description'] as string | undefined,
      location: row['location'] as ItineraryItem['location'],
      timeRange: row['time_range'] as ItineraryItem['timeRange'],
      vendor: row['vendor'] as ItineraryItem['vendor'],
      accommodationDetails: row['accommodation_details'] as ItineraryItem['accommodationDetails'],
      transportDetails: row['transport_details'] as ItineraryItem['transportDetails'],
      activityDetails: row['activity_details'] as ItineraryItem['activityDetails'],
      agentNotes: row['agent_notes'] as string | undefined,
      travelerNotes: row['traveler_notes'] as string | undefined,
      createdAt: row['created_at'] as string,
      updatedAt: row['updated_at'] as string,
    };
  }
}
