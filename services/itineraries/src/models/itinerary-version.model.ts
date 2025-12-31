import { z } from 'zod';

/**
 * Version change type.
 */
export const VersionChangeType = {
  CREATED: 'CREATED',
  UPDATED: 'UPDATED',
  ITEMS_ADDED: 'ITEMS_ADDED',
  ITEMS_REMOVED: 'ITEMS_REMOVED',
  ITEMS_MODIFIED: 'ITEMS_MODIFIED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  PRICING_UPDATED: 'PRICING_UPDATED',
} as const;

export type VersionChangeType = typeof VersionChangeType[keyof typeof VersionChangeType];

export const versionChangeTypeSchema = z.enum([
  'CREATED',
  'UPDATED',
  'ITEMS_ADDED',
  'ITEMS_REMOVED',
  'ITEMS_MODIFIED',
  'STATUS_CHANGED',
  'PRICING_UPDATED',
]);

/**
 * Individual change within a version.
 */
export const versionChangeSchema = z.object({
  type: versionChangeTypeSchema,
  field: z.string().max(100).optional(),
  previousValue: z.unknown().optional(),
  newValue: z.unknown().optional(),
  itemId: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
});

export type VersionChange = z.infer<typeof versionChangeSchema>;

/**
 * Itinerary version snapshot.
 * Preserves complete state at a point in time.
 */
export const itineraryVersionSchema = z.object({
  id: z.string().uuid(),
  itineraryId: z.string().uuid(),
  
  /** Version number (sequential) */
  version: z.number().int().positive(),
  
  /** Complete snapshot of itinerary at this version */
  snapshot: z.string(), // JSON stringified itinerary
  
  /** Changes from previous version */
  changes: z.array(versionChangeSchema).default([]),
  
  /** Who made this change */
  changedBy: z.string().uuid(),
  /** Role of person who made change */
  changedByRole: z.enum(['AGENT', 'ADMIN', 'SYSTEM']),
  
  /** Reason for change (required for admin changes) */
  changeReason: z.string().max(500).optional(),
  
  /** Hash for integrity verification */
  snapshotHash: z.string().length(64),
  
  /** Audit timestamp */
  createdAt: z.string().datetime(),
});

export type ItineraryVersion = z.infer<typeof itineraryVersionSchema>;

/**
 * Schema for creating a new version.
 */
export const createVersionSchema = z.object({
  itineraryId: z.string().uuid(),
  snapshot: z.string(),
  changes: z.array(versionChangeSchema).default([]),
  changedBy: z.string().uuid(),
  changedByRole: z.enum(['AGENT', 'ADMIN', 'SYSTEM']),
  changeReason: z.string().max(500).optional(),
});

export type CreateVersionInput = z.infer<typeof createVersionSchema>;

/**
 * Version list item (without full snapshot).
 */
export interface VersionListItem {
  id: string;
  itineraryId: string;
  version: number;
  changes: VersionChange[];
  changedBy: string;
  changedByRole: 'AGENT' | 'ADMIN' | 'SYSTEM';
  changeReason?: string;
  createdAt: string;
}

/**
 * Convert full version to list item.
 */
export function toVersionListItem(version: ItineraryVersion): VersionListItem {
  const { snapshot, snapshotHash, ...rest } = version;
  return rest;
}

/**
 * Version comparison result.
 */
export interface VersionDiff {
  fromVersion: number;
  toVersion: number;
  changes: VersionChange[];
  addedItems: string[];
  removedItems: string[];
  modifiedItems: string[];
}
