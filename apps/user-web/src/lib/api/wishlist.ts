/**
 * Wishlist API Service
 *
 * All wishlist operations go through the API Gateway -> Wishlist Service.
 * Frontend NEVER queries the database directly.
 *
 * Architecture:
 *   Frontend -> API Gateway (/api/wishlist/*) -> Wishlist Service -> Supabase DB
 */

import { getAccessToken } from '@/lib/api/auth';
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
// GATEWAY REQUEST HELPER
// =============================================================================

const getApiBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, '').replace(/\/api\/?$/, '');
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('vercel.app') || hostname.includes('howweplan')) {
      return 'https://howweplan-irjf.onrender.com';
    }
  }
  return 'http://localhost:3001';
};

async function wishlistRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
  }

  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/wishlist${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Request failed (${response.status})`);
  }

  return response.json();
}

// =============================================================================
// ROW -> ITEM TRANSFORMER
// =============================================================================

function rowToWishlistItem(row: Record<string, unknown>): WishlistItem {
  return {
    id: row.id as string,
    itemType: row.item_type as WishlistItemType,
    itemId: row.item_id as string,
    itemName: row.item_name as string,
    itemImageUrl: (row.item_image_url as string) || undefined,
    itemMetadata: (row.item_metadata as Record<string, unknown>) || {},
    notes: (row.notes as string) || undefined,
    tags: (row.tags as string[]) || [],
    priority: (row.priority as number) || 0,
    plannedDateStart: (row.planned_date_start as string) || undefined,
    plannedDateEnd: (row.planned_date_end as string) || undefined,
    estimatedBudget: (row.estimated_budget as number) || undefined,
    notifyOnDeals: (row.notify_on_deals as boolean) || false,
    createdAt: row.created_at as string,
  };
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Fetch all wishlist items for the current user.
 */
export async function fetchWishlistItems(filters?: WishlistFilters): Promise<WishlistItem[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.itemType && filters.itemType !== 'all') {
      params.set('itemType', filters.itemType);
    }
    if (filters?.tags && filters.tags.length > 0) {
      params.set('tags', filters.tags.join(','));
    }
    if (filters?.search) {
      params.set('search', filters.search);
    }
    if (filters?.sortBy) {
      params.set('sortBy', filters.sortBy);
    }
    if (filters?.sortAsc !== undefined) {
      params.set('sortAsc', String(filters.sortAsc));
    }

    const queryString = params.toString();
    const path = `/api/v1/items${queryString ? `?${queryString}` : ''}`;
    const result = await wishlistRequest<{ data: { items: Record<string, unknown>[] } }>(path);
    return (result?.data?.items || []).map(rowToWishlistItem);
  } catch (err) {
    console.error('Error fetching wishlist items:', err);
    return [];
  }
}

/**
 * Add an item to the wishlist.
 */
export async function addToWishlist(input: WishlistCreateInput): Promise<WishlistItem | null> {
  try {
    const result = await wishlistRequest<{ data: Record<string, unknown> }>('/api/v1/items', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return result?.data ? rowToWishlistItem(result.data) : null;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('already in wishlist')) {
      console.log('Item already in wishlist');
      return null;
    }
    console.error('Error adding to wishlist:', err);
    return null;
  }
}

/**
 * Remove an item from the wishlist by type and item ID.
 */
export async function removeFromWishlist(itemType: WishlistItemType, itemId: string): Promise<boolean> {
  try {
    await wishlistRequest(
      `/api/v1/items?itemType=${encodeURIComponent(itemType)}&itemId=${encodeURIComponent(itemId)}`,
      { method: 'DELETE' }
    );
    return true;
  } catch (err) {
    console.error('Error removing from wishlist:', err);
    return false;
  }
}

/**
 * Remove an item from wishlist by its wishlist ID.
 */
export async function removeWishlistItem(wishlistId: string): Promise<boolean> {
  try {
    await wishlistRequest(`/api/v1/items/${encodeURIComponent(wishlistId)}`, {
      method: 'DELETE',
    });
    return true;
  } catch (err) {
    console.error('Error removing wishlist item:', err);
    return false;
  }
}

/**
 * Update a wishlist item.
 */
export async function updateWishlistItem(
  wishlistId: string,
  updates: WishlistUpdateInput
): Promise<WishlistItem | null> {
  try {
    const result = await wishlistRequest<{ data: Record<string, unknown> }>(
      `/api/v1/items/${encodeURIComponent(wishlistId)}`,
      { method: 'PUT', body: JSON.stringify(updates) }
    );
    return result?.data ? rowToWishlistItem(result.data) : null;
  } catch (err) {
    console.error('Error updating wishlist item:', err);
    return null;
  }
}

/**
 * Check if an item is in the user's wishlist.
 */
export async function isInWishlist(itemType: WishlistItemType, itemId: string): Promise<boolean> {
  try {
    const result = await wishlistRequest<{ data: { results: Record<string, boolean> } }>(
      '/api/v1/check',
      { method: 'POST', body: JSON.stringify({ items: [{ itemType, itemId }] }) }
    );
    return result?.data?.results?.[`${itemType}:${itemId}`] ?? false;
  } catch (err) {
    console.error('Error checking wishlist:', err);
    return false;
  }
}

/**
 * Toggle wishlist status for an item.
 */
export async function toggleWishlist(
  input: WishlistCreateInput
): Promise<{ added: boolean; item: WishlistItem | null }> {
  const wishlisted = await isInWishlist(input.itemType, input.itemId);

  if (wishlisted) {
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
  const empty: WishlistSummary = {
    destinationCount: 0, proposalCount: 0, itineraryCount: 0,
    agentCount: 0, totalCount: 0, lastAddedAt: null,
  };
  try {
    const result = await wishlistRequest<{ data: WishlistSummary }>('/api/v1/summary');
    return result?.data || empty;
  } catch (err) {
    console.error('Error fetching wishlist summary:', err);
    return empty;
  }
}

/**
 * Get all unique tags from user's wishlist.
 */
export async function getWishlistTags(): Promise<string[]> {
  try {
    const result = await wishlistRequest<{ data: { tags: string[] } }>('/api/v1/tags');
    return result?.data?.tags || [];
  } catch (err) {
    console.error('Error fetching wishlist tags:', err);
    return [];
  }
}

/**
 * Batch check which items are wishlisted.
 */
export async function batchCheckWishlist(
  items: Array<{ itemType: WishlistItemType; itemId: string }>
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  try {
    const response = await wishlistRequest<{ data: { results: Record<string, boolean> } }>(
      '/api/v1/check',
      { method: 'POST', body: JSON.stringify({ items }) }
    );

    const results = response?.data?.results || {};
    Object.entries(results).forEach(([key, value]) => {
      result.set(key, value);
    });

    // Fill in any missing items as false
    items.forEach(({ itemType, itemId }) => {
      const key = `${itemType}:${itemId}`;
      if (!result.has(key)) result.set(key, false);
    });
  } catch (err) {
    console.error('Error batch checking wishlist:', err);
    items.forEach(({ itemType, itemId }) => result.set(`${itemType}:${itemId}`, false));
  }
  return result;
}
