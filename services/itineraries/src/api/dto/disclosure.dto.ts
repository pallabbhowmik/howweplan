import { z } from 'zod';
import { disclosureStateSchema } from '../../models/index.js';

/**
 * Disclosure state response.
 */
export const disclosureStateResponseSchema = z.object({
  itineraryId: z.string().uuid(),
  disclosureState: disclosureStateSchema,
  isRevealed: z.boolean(),
  disclosedAt: z.string().datetime().optional(),
});

export type DisclosureStateResponse = z.infer<typeof disclosureStateResponseSchema>;

/**
 * Request to reveal an itinerary (admin only).
 */
export const revealItineraryRequestSchema = z.object({
  reason: z.string().min(1).max(500),
});

export type RevealItineraryRequest = z.infer<typeof revealItineraryRequestSchema>;

/**
 * Request to obfuscate an itinerary (admin only).
 */
export const obfuscateItineraryRequestSchema = z.object({
  reason: z.string().min(1).max(500),
});

export type ObfuscateItineraryRequest = z.infer<typeof obfuscateItineraryRequestSchema>;

/**
 * Version list item response.
 */
export const versionListItemResponseSchema = z.object({
  id: z.string().uuid(),
  itineraryId: z.string().uuid(),
  version: z.number().int().positive(),
  changedBy: z.string().uuid(),
  changedByRole: z.enum(['AGENT', 'ADMIN', 'SYSTEM']),
  changeReason: z.string().optional(),
  changes: z.array(z.object({
    type: z.string(),
    field: z.string().optional(),
    description: z.string().optional(),
  })),
  createdAt: z.string().datetime(),
});

export type VersionListItemResponse = z.infer<typeof versionListItemResponseSchema>;

/**
 * Version history response.
 */
export const versionHistoryResponseSchema = z.object({
  itineraryId: z.string().uuid(),
  currentVersion: z.number().int().positive(),
  versions: z.array(versionListItemResponseSchema),
});

export type VersionHistoryResponse = z.infer<typeof versionHistoryResponseSchema>;

/**
 * Version diff response.
 */
export const versionDiffResponseSchema = z.object({
  itineraryId: z.string().uuid(),
  fromVersion: z.number().int().positive(),
  toVersion: z.number().int().positive(),
  changes: z.array(z.object({
    type: z.string(),
    field: z.string().optional(),
    previousValue: z.unknown().optional(),
    newValue: z.unknown().optional(),
    description: z.string().optional(),
  })),
  addedItems: z.array(z.string()),
  removedItems: z.array(z.string()),
  modifiedItems: z.array(z.string()),
});

export type VersionDiffResponse = z.infer<typeof versionDiffResponseSchema>;

/**
 * Restore version request.
 */
export const restoreVersionRequestSchema = z.object({
  targetVersion: z.number().int().positive(),
  reason: z.string().min(1).max(500),
});

export type RestoreVersionRequest = z.infer<typeof restoreVersionRequestSchema>;
