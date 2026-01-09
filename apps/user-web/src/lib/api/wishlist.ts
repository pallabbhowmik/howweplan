/**
 * Wishlist API Service
 * 
 * Handles all wishlist-related operations with Supabase backend.
 * Supports destinations, proposals, itineraries, and agents.
 */

import { getSupabaseClient } from '@/lib/supabase/client';
import type { WishlistItem, WishlistItemType } from '@/components/trust/WishlistButton';

// =============================================================================
// TYPES
// =============================================================================

export interface WishlistCreateInput {
  itemType: WishlistItemType;
  itemId: string;
  itemName: string;
  itemImageUrl?: string;
  itemMetadata?: Record<string, unknown>;
  notes?: string;
  tags?: string[];
  priority?: number;
  plannedDateStart?: string;
  plannedDateEnd?: string;
  estimatedBudget?: number;
  notifyOnDeals?: boolean;
}

export interface WishlistUpdateInput {
  notes?: string;
  tags?: string[];
  priority?: number;
  plannedDateStart?: string | null;
  plannedDateEnd?: string | null;
  estimatedBudget?: number | null;
  notifyOnDeals?: boolean;
}

export interface WishlistFilters {
  itemType?: WishlistItemType | 'all';
  tags?: string[];
  search?: string;
  sortBy?: 'recent' | 'oldest' | 'priority' | 'name' | 'budget';
  sortAsc?: boolean;
}

export interface WishlistSummary {
  destinationCount: number;
  proposalCount: number;
  itineraryCount: number;
  agentCount: number;
  totalCount: number;
  lastAddedAt: string | null;
}

// =============================================================================
// DATABASE ROW TYPE (matches wishlists table)
// =============================================================================

interface WishlistRow {
  id: string;
  user_id: string;
  item_type: WishlistItemType;
  item_id: string;
  item_name: string;
  item_image_url: string | null;
  item_metadata: Record<string, unknown>;
  notes: string | null;
  tags: string[];
  priority: number;
  planned_date_start: string | null;
  planned_date_end: string | null;
  estimated_budget: number | null;
  notify_on_deals: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function rowToWishlistItem(row: WishlistRow): WishlistItem {
  return {
    id: row.id,
    itemType: row.item_type,
    itemId: row.item_id,
    itemName: row.item_name,
    itemImageUrl: row.item_image_url || undefined,
    itemMetadata: row.item_metadata || {},
    notes: row.notes || undefined,
    tags: row.tags || [],
    priority: row.priority || 0,
    plannedDateStart: row.planned_date_start || undefined,
    plannedDateEnd: row.planned_date_end || undefined,
    estimatedBudget: row.estimated_budget || undefined,
    notifyOnDeals: row.notify_on_deals || false,
    createdAt: row.created_at,
  };
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Fetch all wishlist items for the current user.
 */
export async function fetchWishlistItems(filters?: WishlistFilters): Promise<WishlistItem[]> {
  const supabase = getSupabaseClient();
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('Auth error fetching wishlist:', authError);
    return [];
  }

  let query = supabase
    .from('wishlists')
    .select('*')
    .eq('user_id', user.id);

  // Apply filters
  if (filters?.itemType && filters.itemType !== 'all') {
    query = query.eq('item_type', filters.itemType);
  }

  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps('tags', filters.tags);
  }

  if (filters?.search) {
    const searchTerm = `%${filters.search}%`;
    query = query.or(`item_name.ilike.${searchTerm},notes.ilike.${searchTerm}`);
  }

  // Apply sorting
  const sortColumn = {
    recent: 'created_at',
    oldest: 'created_at',
    priority: 'priority',
    name: 'item_name',
    budget: 'estimated_budget',
  }[filters?.sortBy || 'recent'] || 'created_at';

  const sortAscending = filters?.sortBy === 'oldest' || filters?.sortAsc;
  query = query.order(sortColumn, { ascending: sortAscending, nullsFirst: false });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching wishlist items:', error);
    return [];
  }

  return (data as WishlistRow[]).map(rowToWishlistItem);
}

/**
 * Add an item to the wishlist.
 */
export async function addToWishlist(input: WishlistCreateInput): Promise<WishlistItem | null> {
  const supabase = getSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('Auth error adding to wishlist:', authError);
    return null;
  }

  const { data, error } = await supabase
    .from('wishlists')
    .insert({
      user_id: user.id,
      item_type: input.itemType,
      item_id: input.itemId,
      item_name: input.itemName,
      item_image_url: input.itemImageUrl || null,
      item_metadata: input.itemMetadata || {},
      notes: input.notes || null,
      tags: input.tags || [],
      priority: input.priority || 0,
      planned_date_start: input.plannedDateStart || null,
      planned_date_end: input.plannedDateEnd || null,
      estimated_budget: input.estimatedBudget || null,
      notify_on_deals: input.notifyOnDeals || false,
    })
    .select()
    .single();

  if (error) {
    // Check if it's a unique constraint violation (item already in wishlist)
    if (error.code === '23505') {
      console.log('Item already in wishlist');
      return null;
    }
    console.error('Error adding to wishlist:', error);
    return null;
  }

  return rowToWishlistItem(data as WishlistRow);
}

/**
 * Remove an item from the wishlist.
 */
export async function removeFromWishlist(itemType: WishlistItemType, itemId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('Auth error removing from wishlist:', authError);
    return false;
  }

  const { error } = await supabase
    .from('wishlists')
    .delete()
    .eq('user_id', user.id)
    .eq('item_type', itemType)
    .eq('item_id', itemId);

  if (error) {
    console.error('Error removing from wishlist:', error);
    return false;
  }

  return true;
}

/**
 * Remove an item from wishlist by its wishlist ID.
 */
export async function removeWishlistItem(wishlistId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('Auth error removing wishlist item:', authError);
    return false;
  }

  const { error } = await supabase
    .from('wishlists')
    .delete()
    .eq('id', wishlistId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error removing wishlist item:', error);
    return false;
  }

  return true;
}

/**
 * Update a wishlist item.
 */
export async function updateWishlistItem(
  wishlistId: string,
  updates: WishlistUpdateInput
): Promise<WishlistItem | null> {
  const supabase = getSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('Auth error updating wishlist item:', authError);
    return null;
  }

  const updateData: Record<string, unknown> = {};
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  if (updates.tags !== undefined) updateData.tags = updates.tags;
  if (updates.priority !== undefined) updateData.priority = updates.priority;
  if (updates.plannedDateStart !== undefined) updateData.planned_date_start = updates.plannedDateStart;
  if (updates.plannedDateEnd !== undefined) updateData.planned_date_end = updates.plannedDateEnd;
  if (updates.estimatedBudget !== undefined) updateData.estimated_budget = updates.estimatedBudget;
  if (updates.notifyOnDeals !== undefined) updateData.notify_on_deals = updates.notifyOnDeals;

  const { data, error } = await supabase
    .from('wishlists')
    .update(updateData)
    .eq('id', wishlistId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating wishlist item:', error);
    return null;
  }

  return rowToWishlistItem(data as WishlistRow);
}

/**
 * Check if an item is in the user's wishlist.
 */
export async function isInWishlist(itemType: WishlistItemType, itemId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return false;
  }

  const { data, error } = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', user.id)
    .eq('item_type', itemType)
    .eq('item_id', itemId)
    .maybeSingle();

  if (error) {
    console.error('Error checking wishlist:', error);
    return false;
  }

  return !!data;
}

/**
 * Toggle wishlist status for an item.
 */
export async function toggleWishlist(input: WishlistCreateInput): Promise<{ added: boolean; item: WishlistItem | null }> {
  const isWishlisted = await isInWishlist(input.itemType, input.itemId);
  
  if (isWishlisted) {
    const removed = await removeFromWishlist(input.itemType, input.itemId);
    return { added: false, item: removed ? null : null };
  } else {
    const item = await addToWishlist(input);
    return { added: true, item };
  }
}

/**
 * Get wishlist summary counts.
 */
export async function getWishlistSummary(): Promise<WishlistSummary> {
  const supabase = getSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return {
      destinationCount: 0,
      proposalCount: 0,
      itineraryCount: 0,
      agentCount: 0,
      totalCount: 0,
      lastAddedAt: null,
    };
  }

  const { data, error } = await supabase
    .from('wishlists')
    .select('item_type, created_at')
    .eq('user_id', user.id);

  if (error || !data) {
    console.error('Error fetching wishlist summary:', error);
    return {
      destinationCount: 0,
      proposalCount: 0,
      itineraryCount: 0,
      agentCount: 0,
      totalCount: 0,
      lastAddedAt: null,
    };
  }

  const counts = {
    destination: 0,
    proposal: 0,
    itinerary: 0,
    agent: 0,
  };

  let lastAddedAt: string | null = null;

  data.forEach((row: { item_type: WishlistItemType; created_at: string }) => {
    counts[row.item_type]++;
    if (!lastAddedAt || row.created_at > lastAddedAt) {
      lastAddedAt = row.created_at;
    }
  });

  return {
    destinationCount: counts.destination,
    proposalCount: counts.proposal,
    itineraryCount: counts.itinerary,
    agentCount: counts.agent,
    totalCount: data.length,
    lastAddedAt,
  };
}

/**
 * Get all unique tags from user's wishlist.
 */
export async function getWishlistTags(): Promise<string[]> {
  const supabase = getSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return [];
  }

  const { data, error } = await supabase
    .from('wishlists')
    .select('tags')
    .eq('user_id', user.id);

  if (error || !data) {
    console.error('Error fetching wishlist tags:', error);
    return [];
  }

  const tagsSet = new Set<string>();
  data.forEach((row: { tags: string[] }) => {
    row.tags?.forEach(tag => tagsSet.add(tag));
  });

  return Array.from(tagsSet).sort();
}

/**
 * Batch check which items are wishlisted.
 */
export async function batchCheckWishlist(
  items: Array<{ itemType: WishlistItemType; itemId: string }>
): Promise<Map<string, boolean>> {
  const supabase = getSupabaseClient();
  const result = new Map<string, boolean>();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    items.forEach(item => result.set(`${item.itemType}:${item.itemId}`, false));
    return result;
  }

  // Group by type for efficient querying
  const byType = new Map<WishlistItemType, string[]>();
  items.forEach(item => {
    if (!byType.has(item.itemType)) {
      byType.set(item.itemType, []);
    }
    byType.get(item.itemType)!.push(item.itemId);
  });

  // Query each type
  for (const [itemType, itemIds] of byType) {
    const { data, error } = await supabase
      .from('wishlists')
      .select('item_id')
      .eq('user_id', user.id)
      .eq('item_type', itemType)
      .in('item_id', itemIds);

    if (error) {
      console.error(`Error batch checking ${itemType} wishlist:`, error);
      continue;
    }

    const wishlistedIds = new Set(data?.map((d: { item_id: string }) => d.item_id) || []);
    itemIds.forEach(itemId => {
      result.set(`${itemType}:${itemId}`, wishlistedIds.has(itemId));
    });
  }

  return result;
}

