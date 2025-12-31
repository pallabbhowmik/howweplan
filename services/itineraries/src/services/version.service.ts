import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import type { 
  Itinerary,
  ItineraryVersion,
  CreateVersionInput,
  VersionListItem,
  VersionDiff,
  VersionChange,
} from '../models/index.js';
import { toVersionListItem, VersionChangeType } from '../models/index.js';
import type { VersionRepository } from '../repository/index.js';
import { publishEvent } from '../events/index.js';
import { createAuditEvent } from '../utils/index.js';
import { 
  VersionNotFoundError,
  ValidationError,
} from '../utils/index.js';
import { env } from '../env.js';

/**
 * Service for managing itinerary versions.
 * 
 * BUSINESS RULES:
 * - Preserve original agent content
 * - Version control for all changes
 * - Every version change MUST emit an audit event
 */
export class VersionService {
  constructor(private readonly repository: VersionRepository) {}

  /**
   * Create a new version snapshot.
   */
  async createVersion(
    itinerary: Itinerary,
    changedBy: string,
    changedByRole: 'AGENT' | 'ADMIN' | 'SYSTEM',
    changeReason?: string
  ): Promise<ItineraryVersion> {
    // Check version limit
    const existingVersions = await this.repository.countByItineraryId(itinerary.id);
    if (existingVersions >= env.MAX_VERSIONS_PER_ITINERARY) {
      // Delete oldest version to make room
      await this.pruneOldestVersion(itinerary.id);
    }

    const snapshot = JSON.stringify(itinerary);
    const snapshotHash = this.hashSnapshot(snapshot);

    // Detect changes from previous version
    const changes = await this.detectChanges(itinerary);

    const version: ItineraryVersion = {
      id: uuidv4(),
      itineraryId: itinerary.id,
      version: itinerary.version,
      snapshot,
      changes,
      changedBy,
      changedByRole,
      changeReason,
      snapshotHash,
      createdAt: new Date().toISOString(),
    };

    await this.repository.create(version);

    // Emit audit event
    await publishEvent(createAuditEvent({
      eventType: 'itinerary.version_created',
      entityType: 'itinerary_version',
      entityId: version.id,
      actorId: changedBy,
      actorRole: changedByRole,
      changes: {
        version: { from: itinerary.version - 1, to: itinerary.version },
      },
      metadata: {
        itineraryId: itinerary.id,
        changeReason,
        changeCount: changes.length,
      },
    }));

    // Emit domain event
    await publishEvent({
      type: 'itinerary.version.created',
      payload: {
        versionId: version.id,
        itineraryId: itinerary.id,
        version: itinerary.version,
        changedBy,
        changedByRole,
      },
      metadata: {
        timestamp: version.createdAt,
        correlationId: itinerary.requestId,
        source: 'itineraries-service',
      },
    });

    return version;
  }

  /**
   * Get a specific version.
   */
  async getVersion(id: string): Promise<ItineraryVersion> {
    const version = await this.repository.findById(id);
    if (!version) {
      throw new VersionNotFoundError(`Version not found: ${id}`);
    }
    return version;
  }

  /**
   * Get version by itinerary and version number.
   */
  async getVersionByNumber(
    itineraryId: string,
    versionNumber: number
  ): Promise<ItineraryVersion> {
    const version = await this.repository.findByItineraryAndVersion(
      itineraryId,
      versionNumber
    );
    if (!version) {
      throw new VersionNotFoundError(
        `Version ${versionNumber} not found for itinerary ${itineraryId}`
      );
    }
    return version;
  }

  /**
   * Get all versions for an itinerary.
   */
  async getVersionHistory(itineraryId: string): Promise<VersionListItem[]> {
    const versions = await this.repository.findByItineraryId(itineraryId);
    return versions.map(toVersionListItem);
  }

  /**
   * Get the itinerary state at a specific version.
   */
  async getItineraryAtVersion(
    itineraryId: string,
    versionNumber: number
  ): Promise<Itinerary> {
    const version = await this.getVersionByNumber(itineraryId, versionNumber);
    return JSON.parse(version.snapshot) as Itinerary;
  }

  /**
   * Compare two versions and get differences.
   */
  async compareVersions(
    itineraryId: string,
    fromVersion: number,
    toVersion: number
  ): Promise<VersionDiff> {
    if (fromVersion >= toVersion) {
      throw new ValidationError('fromVersion must be less than toVersion');
    }

    const fromItinerary = await this.getItineraryAtVersion(itineraryId, fromVersion);
    const toItinerary = await this.getItineraryAtVersion(itineraryId, toVersion);

    // Collect all changes between versions
    const versions = await this.repository.findByItineraryIdAndVersionRange(
      itineraryId,
      fromVersion + 1,
      toVersion
    );

    const allChanges: VersionChange[] = versions.flatMap((v: ItineraryVersion) => v.changes);

    // Identify item changes
    const fromItemIds = new Set(fromItinerary.items.map(i => i.id));
    const toItemIds = new Set(toItinerary.items.map(i => i.id));

    const addedItems = [...toItemIds].filter(id => !fromItemIds.has(id));
    const removedItems = [...fromItemIds].filter(id => !toItemIds.has(id));
    const modifiedItems = [...fromItemIds]
      .filter(id => toItemIds.has(id))
      .filter(id => {
        const fromItem = fromItinerary.items.find(i => i.id === id);
        const toItem = toItinerary.items.find(i => i.id === id);
        return JSON.stringify(fromItem) !== JSON.stringify(toItem);
      });

    return {
      fromVersion,
      toVersion,
      changes: allChanges,
      addedItems,
      removedItems,
      modifiedItems,
    };
  }

  /**
   * Restore an itinerary to a previous version.
   * Returns the restored itinerary data (caller must persist).
   */
  async prepareRestore(
    itineraryId: string,
    targetVersion: number,
    actorId: string,
    actorRole: 'AGENT' | 'ADMIN',
    reason: string
  ): Promise<Itinerary> {
    if (!reason || reason.trim().length === 0) {
      throw new ValidationError('Reason is required for version restore');
    }

    const targetItinerary = await this.getItineraryAtVersion(itineraryId, targetVersion);
    
    // Get current version number
    const currentVersion = await this.repository.getLatestVersionNumber(itineraryId);

    // Update version number to be new version
    const restoredItinerary: Itinerary = {
      ...targetItinerary,
      version: currentVersion + 1,
      updatedAt: new Date().toISOString(),
    };

    return restoredItinerary;
  }

  /**
   * Detect changes from previous version.
   */
  private async detectChanges(itinerary: Itinerary): Promise<VersionChange[]> {
    const changes: VersionChange[] = [];

    if (itinerary.version === 1) {
      // First version - mark as created
      changes.push({
        type: VersionChangeType.CREATED,
        description: 'Initial itinerary creation',
      });
      return changes;
    }

    // Get previous version
    const previousVersion = await this.repository.findByItineraryAndVersion(
      itinerary.id,
      itinerary.version - 1
    );

    if (!previousVersion) {
      changes.push({
        type: VersionChangeType.UPDATED,
        description: 'Previous version not found, marking as update',
      });
      return changes;
    }

    const previous = JSON.parse(previousVersion.snapshot) as Itinerary;

    // Check for status change
    if (previous.status !== itinerary.status) {
      changes.push({
        type: VersionChangeType.STATUS_CHANGED,
        field: 'status',
        previousValue: previous.status,
        newValue: itinerary.status,
      });
    }

    // Check for pricing change
    if (JSON.stringify(previous.pricing) !== JSON.stringify(itinerary.pricing)) {
      changes.push({
        type: VersionChangeType.PRICING_UPDATED,
        field: 'pricing',
      });
    }

    // Check for item changes
    const prevItemIds = new Set(previous.items.map(i => i.id));
    const currItemIds = new Set(itinerary.items.map(i => i.id));

    const addedIds = [...currItemIds].filter(id => !prevItemIds.has(id));
    const removedIds = [...prevItemIds].filter(id => !currItemIds.has(id));
    const commonIds = [...prevItemIds].filter(id => currItemIds.has(id));

    if (addedIds.length > 0) {
      changes.push({
        type: VersionChangeType.ITEMS_ADDED,
        description: `Added ${addedIds.length} item(s)`,
      });
    }

    if (removedIds.length > 0) {
      changes.push({
        type: VersionChangeType.ITEMS_REMOVED,
        description: `Removed ${removedIds.length} item(s)`,
      });
    }

    const modifiedIds = commonIds.filter(id => {
      const prevItem = previous.items.find(i => i.id === id);
      const currItem = itinerary.items.find(i => i.id === id);
      return JSON.stringify(prevItem) !== JSON.stringify(currItem);
    });

    if (modifiedIds.length > 0) {
      changes.push({
        type: VersionChangeType.ITEMS_MODIFIED,
        description: `Modified ${modifiedIds.length} item(s)`,
      });
    }

    // If no specific changes detected, mark as general update
    if (changes.length === 0) {
      changes.push({
        type: VersionChangeType.UPDATED,
        description: 'General update',
      });
    }

    return changes;
  }

  /**
   * Prune oldest version for an itinerary.
   */
  private async pruneOldestVersion(itineraryId: string): Promise<void> {
    const oldest = await this.repository.findOldestByItineraryId(itineraryId);
    if (oldest) {
      await this.repository.delete(oldest.id);
    }
  }

  /**
   * Hash snapshot for integrity verification.
   */
  private hashSnapshot(snapshot: string): string {
    return createHash('sha256').update(snapshot).digest('hex');
  }
}
