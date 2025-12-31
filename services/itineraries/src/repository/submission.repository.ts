import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../env.js';
import type { Submission } from '../models/index.js';

/**
 * Repository for submission data access.
 */
export class SubmissionRepository {
  private readonly client: SupabaseClient;
  private readonly tableName = 'submissions';

  constructor(client?: SupabaseClient) {
    this.client = client ?? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }

  /**
   * Create a new submission.
   */
  async create(submission: Submission): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .insert(this.toRow(submission));

    if (error) {
      throw new Error(`Failed to create submission: ${error.message}`);
    }
  }

  /**
   * Find submission by ID.
   */
  async findById(id: string): Promise<Submission | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find submission: ${error.message}`);
    }

    return data ? this.fromRow(data) : null;
  }

  /**
   * Find submissions by request ID.
   */
  async findByRequestId(requestId: string): Promise<Submission[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find submissions: ${error.message}`);
    }

    return (data ?? []).map(row => this.fromRow(row));
  }

  /**
   * Find submissions by agent ID.
   */
  async findByAgentId(agentId: string): Promise<Submission[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find submissions: ${error.message}`);
    }

    return (data ?? []).map(row => this.fromRow(row));
  }

  /**
   * Find submission by content hash.
   */
  async findByContentHash(contentHash: string): Promise<Submission | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('content_hash', contentHash)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find submission: ${error.message}`);
    }

    return data ? this.fromRow(data) : null;
  }

  /**
   * Update a submission.
   */
  async update(id: string, updates: Partial<Submission>): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .update(this.toPartialRow(updates))
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update submission: ${error.message}`);
    }
  }

  /**
   * Delete a submission.
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete submission: ${error.message}`);
    }
  }

  /**
   * Convert model to database row.
   */
  private toRow(submission: Submission): Record<string, unknown> {
    return {
      id: submission.id,
      request_id: submission.requestId,
      agent_id: submission.agentId,
      traveler_id: submission.travelerId,
      source: submission.source,
      content: submission.content,
      status: submission.status,
      error_message: submission.errorMessage,
      resulting_itinerary_id: submission.resultingItineraryId,
      original_content: submission.originalContent,
      content_hash: submission.contentHash,
      created_at: submission.createdAt,
      updated_at: submission.updatedAt,
      processed_at: submission.processedAt,
    };
  }

  /**
   * Convert partial model to partial database row.
   */
  private toPartialRow(updates: Partial<Submission>): Record<string, unknown> {
    const row: Record<string, unknown> = {};
    
    if (updates.status !== undefined) row['status'] = updates.status;
    if (updates.errorMessage !== undefined) row['error_message'] = updates.errorMessage;
    if (updates.resultingItineraryId !== undefined) row['resulting_itinerary_id'] = updates.resultingItineraryId;
    if (updates.updatedAt !== undefined) row['updated_at'] = updates.updatedAt;
    if (updates.processedAt !== undefined) row['processed_at'] = updates.processedAt;
    
    return row;
  }

  /**
   * Convert database row to model.
   */
  private fromRow(row: Record<string, unknown>): Submission {
    return {
      id: row['id'] as string,
      requestId: row['request_id'] as string,
      agentId: row['agent_id'] as string,
      travelerId: row['traveler_id'] as string,
      source: row['source'] as Submission['source'],
      content: row['content'] as Submission['content'],
      status: row['status'] as Submission['status'],
      errorMessage: row['error_message'] as string | undefined,
      resultingItineraryId: row['resulting_itinerary_id'] as string | undefined,
      originalContent: row['original_content'] as string,
      contentHash: row['content_hash'] as string,
      createdAt: row['created_at'] as string,
      updatedAt: row['updated_at'] as string,
      processedAt: row['processed_at'] as string | undefined,
    };
  }
}
