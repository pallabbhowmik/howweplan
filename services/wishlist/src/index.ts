/**
 * Wishlist Service
 *
 * Manages user wishlist items (destinations, proposals, itineraries, agents).
 * Follows architecture: Frontend → API Gateway → This Service → Supabase DB.
 *
 * Routes (after gateway strips /api/wishlist prefix):
 *   GET    /api/v1/items          — List wishlist items (with filters)
 *   POST   /api/v1/items          — Add item to wishlist
 *   PUT    /api/v1/items/:id      — Update wishlist item
 *   DELETE /api/v1/items/:id      — Remove wishlist item by ID
 *   DELETE /api/v1/items          — Remove by itemType + itemId (query params)
 *   GET    /api/v1/summary        — Get wishlist summary counts
 *   GET    /api/v1/tags           — Get all unique tags
 *   POST   /api/v1/check          — Batch check which items are wishlisted
 *   GET    /health                — Health check
 */

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

// =============================================================================
// ENVIRONMENT
// =============================================================================

const env = {
  PORT: Number(process.env.PORT) || 3020,
  NODE_ENV: process.env.NODE_ENV || 'development',
  SUPABASE_URL: process.env.SUPABASE_URL || 'http://localhost:54321',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
};

if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

// =============================================================================
// DATABASE CLIENT (Supabase — service role for server-side access)
// =============================================================================

let supabase: SupabaseClient;
function getDb(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: 'public' },
    });
  }
  return supabase;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const ItemTypeEnum = z.enum(['destination', 'proposal', 'itinerary', 'agent']);

const CreateItemSchema = z.object({
  itemType: ItemTypeEnum,
  itemId: z.string().min(1),
  itemName: z.string().min(1).max(255),
  itemImageUrl: z.string().url().nullish(),
  itemMetadata: z.record(z.unknown()).optional().default({}),
  notes: z.string().max(2000).nullish(),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
  priority: z.number().int().min(0).max(10).optional().default(0),
  plannedDateStart: z.string().nullish(),
  plannedDateEnd: z.string().nullish(),
  estimatedBudget: z.number().min(0).nullish(),
  notifyOnDeals: z.boolean().optional().default(false),
});

const UpdateItemSchema = z.object({
  notes: z.string().max(2000).nullish(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  priority: z.number().int().min(0).max(10).optional(),
  plannedDateStart: z.string().nullish(),
  plannedDateEnd: z.string().nullish(),
  estimatedBudget: z.number().min(0).nullish(),
  notifyOnDeals: z.boolean().optional(),
}).partial();

const BatchCheckSchema = z.object({
  items: z.array(z.object({
    itemType: ItemTypeEnum,
    itemId: z.string().min(1),
  })).min(1).max(100),
});

// =============================================================================
// MIDDLEWARE: Extract user from gateway headers
// =============================================================================

function requireUser(req: Request, res: Response, next: NextFunction): void {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request headers' });
    return;
  }
  (req as any).userId = userId;
  next();
}

// =============================================================================
// EXPRESS APP
// =============================================================================

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.path !== '/health') {
    console.log(`[wishlist] ${req.method} ${req.path}`);
  }
  next();
});

// =============================================================================
// HEALTH CHECK
// =============================================================================

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'wishlist', timestamp: new Date().toISOString() });
});

// =============================================================================
// ROUTES
// =============================================================================

// GET /api/v1/items — List wishlist items
app.get('/api/v1/items', requireUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const db = getDb();

    let query = db.from('wishlists').select('*').eq('user_id', userId);

    // Filters
    const itemType = req.query.itemType as string;
    if (itemType && itemType !== 'all') {
      query = query.eq('item_type', itemType);
    }

    const tags = req.query.tags as string;
    if (tags) {
      query = query.overlaps('tags', tags.split(','));
    }

    const search = req.query.search as string;
    if (search) {
      const term = `%${search}%`;
      query = query.or(`item_name.ilike.${term},notes.ilike.${term}`);
    }

    // Sorting
    const sortBy = (req.query.sortBy as string) || 'recent';
    const sortAsc = req.query.sortAsc === 'true';
    const sortColumn: Record<string, string> = {
      recent: 'created_at',
      oldest: 'created_at',
      priority: 'priority',
      name: 'item_name',
      budget: 'estimated_budget',
    };
    const col = sortColumn[sortBy] || 'created_at';
    const ascending = sortBy === 'oldest' || sortAsc;
    query = query.order(col, { ascending, nullsFirst: false });

    const { data, error } = await query;
    if (error) {
      console.error('[wishlist] List error:', error);
      res.status(500).json({ error: 'Failed to fetch wishlist items' });
      return;
    }

    res.json({ data: { items: data || [] } });
  } catch (err) {
    console.error('[wishlist] List error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/items — Add item to wishlist
app.post('/api/v1/items', requireUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const parsed = CreateItemSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }
    const input = parsed.data;
    const db = getDb();

    const { data, error } = await db
      .from('wishlists')
      .insert({
        user_id: userId,
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
      if (error.code === '23505') {
        res.status(409).json({ error: 'Item already in wishlist' });
        return;
      }
      console.error('[wishlist] Insert error:', error);
      res.status(500).json({ error: 'Failed to add item' });
      return;
    }

    res.status(201).json({ data });
  } catch (err) {
    console.error('[wishlist] Insert error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/v1/items/:id — Update wishlist item
app.put('/api/v1/items/:id', requireUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const wishlistId = req.params.id;
    const parsed = UpdateItemSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }
    const updates = parsed.data;
    const db = getDb();

    const updateData: Record<string, unknown> = {};
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.plannedDateStart !== undefined) updateData.planned_date_start = updates.plannedDateStart;
    if (updates.plannedDateEnd !== undefined) updateData.planned_date_end = updates.plannedDateEnd;
    if (updates.estimatedBudget !== undefined) updateData.estimated_budget = updates.estimatedBudget;
    if (updates.notifyOnDeals !== undefined) updateData.notify_on_deals = updates.notifyOnDeals;

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    const { data, error } = await db
      .from('wishlists')
      .update(updateData)
      .eq('id', wishlistId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('[wishlist] Update error:', error);
      res.status(500).json({ error: 'Failed to update item' });
      return;
    }
    if (!data) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    res.json({ data });
  } catch (err) {
    console.error('[wishlist] Update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/v1/items/:id — Remove by wishlist ID
app.delete('/api/v1/items/:id', requireUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const wishlistId = req.params.id;
    const db = getDb();

    const { error } = await db
      .from('wishlists')
      .delete()
      .eq('id', wishlistId)
      .eq('user_id', userId);

    if (error) {
      console.error('[wishlist] Delete error:', error);
      res.status(500).json({ error: 'Failed to remove item' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[wishlist] Delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/v1/items — Remove by itemType + itemId (query params)
app.delete('/api/v1/items', requireUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const itemType = req.query.itemType as string;
    const itemId = req.query.itemId as string;

    if (!itemType || !itemId) {
      res.status(400).json({ error: 'itemType and itemId query params are required' });
      return;
    }

    const db = getDb();
    const { error } = await db
      .from('wishlists')
      .delete()
      .eq('user_id', userId)
      .eq('item_type', itemType)
      .eq('item_id', itemId);

    if (error) {
      console.error('[wishlist] Delete by type error:', error);
      res.status(500).json({ error: 'Failed to remove item' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[wishlist] Delete by type error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/summary — Wishlist summary counts
app.get('/api/v1/summary', requireUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const db = getDb();

    const { data, error } = await db
      .from('wishlists')
      .select('item_type, created_at')
      .eq('user_id', userId);

    if (error) {
      console.error('[wishlist] Summary error:', error);
      res.status(500).json({ error: 'Failed to get summary' });
      return;
    }

    const counts: Record<string, number> = { destination: 0, proposal: 0, itinerary: 0, agent: 0 };
    let lastAddedAt: string | null = null;

    (data || []).forEach((row: any) => {
      if (counts[row.item_type] !== undefined) counts[row.item_type]++;
      if (!lastAddedAt || row.created_at > lastAddedAt) lastAddedAt = row.created_at;
    });

    res.json({
      data: {
        destinationCount: counts.destination,
        proposalCount: counts.proposal,
        itineraryCount: counts.itinerary,
        agentCount: counts.agent,
        totalCount: (data || []).length,
        lastAddedAt,
      },
    });
  } catch (err) {
    console.error('[wishlist] Summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/tags — Get all unique tags
app.get('/api/v1/tags', requireUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const db = getDb();

    const { data, error } = await db
      .from('wishlists')
      .select('tags')
      .eq('user_id', userId);

    if (error) {
      console.error('[wishlist] Tags error:', error);
      res.status(500).json({ error: 'Failed to get tags' });
      return;
    }

    const tagSet = new Set<string>();
    (data || []).forEach((row: any) => {
      (row.tags || []).forEach((tag: string) => tagSet.add(tag));
    });

    res.json({ data: { tags: Array.from(tagSet).sort() } });
  } catch (err) {
    console.error('[wishlist] Tags error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/check — Batch check which items are wishlisted
app.post('/api/v1/check', requireUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const parsed = BatchCheckSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const { items } = parsed.data;
    const db = getDb();

    // Group by type for efficient querying
    const byType = new Map<string, string[]>();
    items.forEach(({ itemType, itemId }) => {
      if (!byType.has(itemType)) byType.set(itemType, []);
      byType.get(itemType)!.push(itemId);
    });

    const result: Record<string, boolean> = {};

    for (const [itemType, itemIds] of byType) {
      const { data, error } = await db
        .from('wishlists')
        .select('item_id')
        .eq('user_id', userId)
        .eq('item_type', itemType)
        .in('item_id', itemIds);

      if (error) {
        console.error(`[wishlist] Batch check ${itemType} error:`, error);
        itemIds.forEach(id => { result[`${itemType}:${id}`] = false; });
        continue;
      }

      const found = new Set((data || []).map((d: any) => d.item_id));
      itemIds.forEach(id => {
        result[`${itemType}:${id}`] = found.has(id);
      });
    }

    res.json({ data: { results: result } });
  } catch (err) {
    console.error('[wishlist] Batch check error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[wishlist] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// =============================================================================
// START SERVER
// =============================================================================

const server = app.listen(env.PORT, () => {
  console.log(`✅ Wishlist service running on port ${env.PORT}`);
});

const shutdown = (signal: string) => {
  console.log(`\n${signal} received. Shutting down wishlist service...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app };
