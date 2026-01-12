import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../env.js';

// ============================================================================
// Types
// ============================================================================

export type TemplateType = 'full' | 'day' | 'activity' | 'accommodation' | 'transport' | 'meal';
export type BudgetTier = 'budget' | 'mid-range' | 'luxury' | 'ultra-luxury';

export interface TemplateContent {
  // For 'full' templates
  days?: DayContent[];
  inclusions?: string[];
  exclusions?: string[];
  notes?: string;
  
  // For 'day' templates
  title?: string;
  activities?: ActivityContent[];
  
  // For individual component templates
  name?: string;
  description?: string;
  location?: string;
  price?: { amount: number; currency: string };
  duration_minutes?: number;
  start_time?: string;
  
  // Flexible additional fields
  [key: string]: unknown;
}

export interface DayContent {
  day: number;
  title: string;
  activities: ActivityContent[];
  notes?: string;
}

export interface ActivityContent {
  name: string;
  description?: string;
  location?: string;
  start_time?: string;
  duration_minutes?: number;
  price?: { amount: number; currency: string };
  type?: 'activity' | 'accommodation' | 'transport' | 'meal';
  [key: string]: unknown;
}

export interface ItineraryTemplate {
  id: string;
  agentId: string;
  name: string;
  description: string | null;
  templateType: TemplateType;
  content: TemplateContent;
  destinations: string[];
  travelStyles: string[];
  durationDays: number | null;
  budgetTier: BudgetTier | null;
  tags: string[];
  usageCount: number;
  lastUsedAt: Date | null;
  isFavorite: boolean;
  isArchived: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTemplateInput {
  name: string;
  description?: string | null;
  templateType: TemplateType;
  content: TemplateContent;
  destinations?: string[];
  travelStyles?: string[];
  durationDays?: number | null;
  budgetTier?: BudgetTier | null;
  tags?: string[];
  isFavorite?: boolean;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string | null;
  content?: TemplateContent;
  destinations?: string[];
  travelStyles?: string[];
  durationDays?: number | null;
  budgetTier?: BudgetTier | null;
  tags?: string[];
  isFavorite?: boolean;
  isArchived?: boolean;
}

export interface TemplateFilter {
  templateType?: TemplateType;
  destination?: string;
  travelStyle?: string;
  budgetTier?: BudgetTier;
  tag?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  search?: string;
}

export interface TemplateSuggestion {
  id: string;
  name: string;
  description: string | null;
  templateType: TemplateType;
  destinations: string[];
  travelStyles: string[];
  durationDays: number | null;
  tags: string[];
  usageCount: number;
  lastUsedAt: Date | null;
  isFavorite: boolean;
  relevanceScore: number;
}

// Database row types
interface TemplateRow {
  id: string;
  agent_id: string;
  name: string;
  description: string | null;
  template_type: string;
  content: Record<string, unknown>;
  destinations: string[];
  travel_styles: string[];
  duration_days: number | null;
  budget_tier: string | null;
  tags: string[];
  usage_count: number;
  last_used_at: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Repository
// ============================================================================

export class TemplateRepository {
  private readonly client: SupabaseClient;
  private readonly tableName = 'agent_itinerary_templates';

  constructor(client?: SupabaseClient) {
    this.client = client ?? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }

  // --------------------------------------------------------------------------
  // CRUD Operations
  // --------------------------------------------------------------------------

  /**
   * Create a new template.
   */
  async create(agentId: string, input: CreateTemplateInput): Promise<ItineraryTemplate> {
    const row = {
      agent_id: agentId,
      name: input.name,
      description: input.description ?? null,
      template_type: input.templateType,
      content: input.content,
      destinations: input.destinations ?? [],
      travel_styles: input.travelStyles ?? [],
      duration_days: input.durationDays ?? null,
      budget_tier: input.budgetTier ?? null,
      tags: input.tags ?? [],
      is_favorite: input.isFavorite ?? false,
    };

    const { data, error } = await this.client
      .from(this.tableName)
      .insert(row)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create template: ${error.message}`);
    }

    return this.fromRow(data as TemplateRow);
  }

  /**
   * Find template by ID.
   */
  async findById(id: string, agentId: string): Promise<ItineraryTemplate | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select()
      .eq('id', id)
      .eq('agent_id', agentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to find template: ${error.message}`);
    }

    return data ? this.fromRow(data as TemplateRow) : null;
  }

  /**
   * Update a template.
   */
  async update(id: string, agentId: string, input: UpdateTemplateInput): Promise<ItineraryTemplate | null> {
    const updates: Record<string, unknown> = {};
    
    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.content !== undefined) updates.content = input.content;
    if (input.destinations !== undefined) updates.destinations = input.destinations;
    if (input.travelStyles !== undefined) updates.travel_styles = input.travelStyles;
    if (input.durationDays !== undefined) updates.duration_days = input.durationDays;
    if (input.budgetTier !== undefined) updates.budget_tier = input.budgetTier;
    if (input.tags !== undefined) updates.tags = input.tags;
    if (input.isFavorite !== undefined) updates.is_favorite = input.isFavorite;
    if (input.isArchived !== undefined) updates.is_archived = input.isArchived;

    const { data, error } = await this.client
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .eq('agent_id', agentId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to update template: ${error.message}`);
    }

    return data ? this.fromRow(data as TemplateRow) : null;
  }

  /**
   * Delete a template.
   */
  async delete(id: string, agentId: string): Promise<boolean> {
    const { error, count } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('agent_id', agentId);

    if (error) {
      throw new Error(`Failed to delete template: ${error.message}`);
    }

    return (count ?? 0) > 0;
  }

  // --------------------------------------------------------------------------
  // Query Operations
  // --------------------------------------------------------------------------

  /**
   * List templates for an agent with filtering.
   */
  async list(
    agentId: string,
    filter?: TemplateFilter,
    pagination?: { limit?: number; offset?: number }
  ): Promise<{ templates: ItineraryTemplate[]; total: number }> {
    let query = this.client
      .from(this.tableName)
      .select('*', { count: 'exact' })
      .eq('agent_id', agentId);

    // Apply filters
    if (filter) {
      if (filter.templateType) {
        query = query.eq('template_type', filter.templateType);
      }
      if (filter.destination) {
        query = query.contains('destinations', [filter.destination]);
      }
      if (filter.travelStyle) {
        query = query.contains('travel_styles', [filter.travelStyle]);
      }
      if (filter.budgetTier) {
        query = query.eq('budget_tier', filter.budgetTier);
      }
      if (filter.tag) {
        query = query.contains('tags', [filter.tag]);
      }
      if (filter.isFavorite !== undefined) {
        query = query.eq('is_favorite', filter.isFavorite);
      }
      if (filter.isArchived !== undefined) {
        query = query.eq('is_archived', filter.isArchived);
      } else {
        // Default: exclude archived
        query = query.eq('is_archived', false);
      }
      if (filter.search) {
        query = query.or(`name.ilike.%${filter.search}%,description.ilike.%${filter.search}%`);
      }
    } else {
      // Default: exclude archived
      query = query.eq('is_archived', false);
    }

    // Order by most recently updated
    query = query.order('updated_at', { ascending: false });

    // Pagination
    const limit = pagination?.limit ?? 20;
    const offset = pagination?.offset ?? 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list templates: ${error.message}`);
    }

    return {
      templates: (data as TemplateRow[]).map(row => this.fromRow(row)),
      total: count ?? 0,
    };
  }

  /**
   * Get smart template suggestions based on context.
   * Uses the database function for efficient scoring.
   */
  async getSuggestions(
    agentId: string,
    context?: {
      destination?: string;
      travelStyle?: string;
      duration?: number;
    },
    limit: number = 10
  ): Promise<TemplateSuggestion[]> {
    const { data, error } = await this.client.rpc('get_template_suggestions', {
      p_agent_id: agentId,
      p_destination: context?.destination ?? null,
      p_travel_style: context?.travelStyle ?? null,
      p_duration: context?.duration ?? null,
      p_limit: limit,
    });

    if (error) {
      // Fallback to simple query if function doesn't exist
      console.warn('Template suggestions function not available, using fallback:', error.message);
      return this.getSuggestionsFallback(agentId, context, limit);
    }

    return (data as Array<{
      id: string;
      name: string;
      description: string | null;
      template_type: string;
      destinations: string[];
      travel_styles: string[];
      duration_days: number | null;
      tags: string[];
      usage_count: number;
      last_used_at: string | null;
      is_favorite: boolean;
      relevance_score: number;
    }>).map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      templateType: row.template_type as TemplateType,
      destinations: row.destinations,
      travelStyles: row.travel_styles,
      durationDays: row.duration_days,
      tags: row.tags,
      usageCount: row.usage_count,
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : null,
      isFavorite: row.is_favorite,
      relevanceScore: row.relevance_score,
    }));
  }

  /**
   * Fallback suggestions query if the database function isn't available.
   */
  private async getSuggestionsFallback(
    agentId: string,
    context?: { destination?: string; travelStyle?: string; duration?: number },
    limit: number = 10
  ): Promise<TemplateSuggestion[]> {
    let query = this.client
      .from(this.tableName)
      .select('id, name, description, template_type, destinations, travel_styles, duration_days, tags, usage_count, last_used_at, is_favorite')
      .eq('agent_id', agentId)
      .eq('is_archived', false)
      .order('usage_count', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(limit);

    // If destination provided, try to filter
    if (context?.destination) {
      query = query.contains('destinations', [context.destination]);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get template suggestions: ${error.message}`);
    }

    return (data as Array<{
      id: string;
      name: string;
      description: string | null;
      template_type: string;
      destinations: string[];
      travel_styles: string[];
      duration_days: number | null;
      tags: string[];
      usage_count: number;
      last_used_at: string | null;
      is_favorite: boolean;
    }>).map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      templateType: row.template_type as TemplateType,
      destinations: row.destinations,
      travelStyles: row.travel_styles,
      durationDays: row.duration_days,
      tags: row.tags,
      usageCount: row.usage_count,
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : null,
      isFavorite: row.is_favorite,
      relevanceScore: row.usage_count + (row.is_favorite ? 10 : 0),
    }));
  }

  /**
   * Record template usage (increments counter and logs history).
   */
  async recordUsage(
    templateId: string,
    agentId: string,
    context?: {
      itineraryId?: string;
      destination?: string;
      travelStyle?: string;
    }
  ): Promise<void> {
    // Try to use the database function
    const { error } = await this.client.rpc('record_template_usage', {
      p_template_id: templateId,
      p_agent_id: agentId,
      p_itinerary_id: context?.itineraryId ?? null,
      p_destination: context?.destination ?? null,
      p_travel_style: context?.travelStyle ?? null,
    });

    if (error) {
      // Fallback: just update the template directly
      console.warn('Template usage function not available, using fallback:', error.message);
      await this.client
        .from(this.tableName)
        .update({
          usage_count: this.client.rpc('increment_usage_count') as unknown as number,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', templateId)
        .eq('agent_id', agentId);
    }
  }

  /**
   * Toggle favorite status.
   */
  async toggleFavorite(id: string, agentId: string): Promise<boolean> {
    // Get current status
    const { data: current } = await this.client
      .from(this.tableName)
      .select('is_favorite')
      .eq('id', id)
      .eq('agent_id', agentId)
      .single();

    if (!current) return false;

    const newValue = !current.is_favorite;

    const { error } = await this.client
      .from(this.tableName)
      .update({ is_favorite: newValue })
      .eq('id', id)
      .eq('agent_id', agentId);

    if (error) {
      throw new Error(`Failed to toggle favorite: ${error.message}`);
    }

    return newValue;
  }

  /**
   * Get all unique destinations from agent's templates.
   */
  async getDestinations(agentId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('destinations')
      .eq('agent_id', agentId)
      .eq('is_archived', false);

    if (error) {
      throw new Error(`Failed to get destinations: ${error.message}`);
    }

    const allDestinations = new Set<string>();
    for (const row of data as Array<{ destinations: string[] }>) {
      for (const dest of row.destinations) {
        allDestinations.add(dest);
      }
    }

    return Array.from(allDestinations).sort();
  }

  /**
   * Get all unique tags from agent's templates.
   */
  async getTags(agentId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('tags')
      .eq('agent_id', agentId)
      .eq('is_archived', false);

    if (error) {
      throw new Error(`Failed to get tags: ${error.message}`);
    }

    const allTags = new Set<string>();
    for (const row of data as Array<{ tags: string[] }>) {
      for (const tag of row.tags) {
        allTags.add(tag);
      }
    }

    return Array.from(allTags).sort();
  }

  /**
   * Duplicate a template.
   */
  async duplicate(id: string, agentId: string, newName?: string): Promise<ItineraryTemplate | null> {
    const original = await this.findById(id, agentId);
    if (!original) return null;

    return this.create(agentId, {
      name: newName ?? `${original.name} (Copy)`,
      description: original.description,
      templateType: original.templateType,
      content: original.content,
      destinations: original.destinations,
      travelStyles: original.travelStyles,
      durationDays: original.durationDays,
      budgetTier: original.budgetTier,
      tags: original.tags,
      isFavorite: false,
    });
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private fromRow(row: TemplateRow): ItineraryTemplate {
    return {
      id: row.id,
      agentId: row.agent_id,
      name: row.name,
      description: row.description,
      templateType: row.template_type as TemplateType,
      content: row.content as TemplateContent,
      destinations: row.destinations,
      travelStyles: row.travel_styles,
      durationDays: row.duration_days,
      budgetTier: row.budget_tier as BudgetTier | null,
      tags: row.tags,
      usageCount: row.usage_count,
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : null,
      isFavorite: row.is_favorite,
      isArchived: row.is_archived,
      isPublic: row.is_public,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

// Export singleton instance
export const templateRepository = new TemplateRepository();
