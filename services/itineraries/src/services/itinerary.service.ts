import { v4 as uuidv4 } from 'uuid';
import type { 
  Itinerary, 
  CreateItineraryInput,
  UpdateItineraryInput,
  ItineraryItem,
  CreateItineraryItemInput,
  UpdateItineraryItemInput,
  ItineraryWithMeta,
} from '../models/index.js';
import { 
  ItineraryStatus, 
  DisclosureState,
  VALID_STATUS_TRANSITIONS,
  withMeta,
} from '../models/index.js';
import type { ItineraryRepository } from '../repository/index.js';
import type { VersionService } from './index.js';
import { ObfuscationEngine, getItineraryView } from '../obfuscation/index.js';
import { publishEvent } from '../events/index.js';
import { createAuditEvent } from '../utils/index.js';
import { 
  ItineraryNotFoundError,
  InvalidStateTransitionError,
  ValidationError,
} from '../utils/index.js';
import { env } from '../env.js';

/**
 * Core itinerary management service.
 * 
 * BUSINESS RULES:
 * - Store agent submissions
 * - Preserve original agent content
 * - Version control for all changes
 * - Every state change MUST emit an audit event
 * - No payment logic in this service
 */
export class ItineraryService {
  private readonly obfuscationEngine: ObfuscationEngine;

  constructor(
    private readonly repository: ItineraryRepository,
    private readonly versionService: VersionService
  ) {
    this.obfuscationEngine = new ObfuscationEngine();
  }

  /**
   * Create a new itinerary.
   */
  async createItinerary(
    input: CreateItineraryInput,
    actorId: string
  ): Promise<Itinerary> {
    // Validate item count
    if (input.items.length > env.MAX_ITINERARY_ITEMS) {
      throw new ValidationError(
        `Itinerary cannot have more than ${env.MAX_ITINERARY_ITEMS} items`
      );
    }

    const now = new Date().toISOString();
    const itineraryId = uuidv4();

    // Create items with IDs
    const items: ItineraryItem[] = input.items.map((item: CreateItineraryItemInput, index: number) => ({
      ...item,
      id: uuidv4(),
      itineraryId,
      sequence: index,
      createdAt: now,
      updatedAt: now,
    }));

    const itinerary: Itinerary = {
      id: itineraryId,
      requestId: input.requestId,
      agentId: input.agentId,
      travelerId: input.travelerId,
      status: ItineraryStatus.DRAFT,
      disclosureState: DisclosureState.OBFUSCATED, // Always start obfuscated
      overview: input.overview,
      pricing: input.pricing,
      items,
      dayPlans: [],
      version: 1,
      termsAndConditions: input.termsAndConditions,
      cancellationPolicy: input.cancellationPolicy,
      internalNotes: input.internalNotes,
      createdAt: now,
      updatedAt: now,
    };

    // Persist itinerary
    await this.repository.create(itinerary);

    // Create initial version (non-blocking)
    if (env.ENABLE_VERSION_HISTORY) {
      try {
        await this.versionService.createVersion(itinerary, actorId, 'AGENT', 'Initial creation');
      } catch (versionError) {
        console.warn('Failed to create initial version (non-blocking):', versionError);
      }
    }

    // Emit audit event (non-blocking)
    try {
      await publishEvent(createAuditEvent({
        eventType: 'itinerary.created',
        entityType: 'itinerary',
        entityId: itinerary.id,
        actorId,
        actorRole: 'AGENT',
        changes: {
          status: { from: null, to: ItineraryStatus.DRAFT },
          disclosureState: { from: null, to: DisclosureState.OBFUSCATED },
        },
        metadata: {
          requestId: input.requestId,
          itemCount: items.length,
        },
      }));
    } catch (auditError) {
      console.warn('Failed to emit audit event (non-blocking):', auditError);
    }

    return itinerary;
  }

  /**
   * Get an itinerary by ID.
   * Returns obfuscated or revealed view based on disclosure state.
   */
  async getItinerary(
    id: string,
    requesterId: string,
    requesterRole: 'TRAVELER' | 'AGENT' | 'ADMIN'
  ): Promise<ItineraryWithMeta> {
    const itinerary = await this.repository.findById(id);
    if (!itinerary) {
      throw new ItineraryNotFoundError(`Itinerary not found: ${id}`);
    }

    // Agents and admins can see full details
    if (requesterRole === 'AGENT' || requesterRole === 'ADMIN') {
      return withMeta(itinerary);
    }

    // Travelers get the appropriate view based on disclosure state
    const view = getItineraryView(itinerary);
    return withMeta(view);
  }

  /**
   * Get raw itinerary without any view transformation.
   * For internal use only.
   */
  async getRawItinerary(id: string): Promise<Itinerary> {
    const itinerary = await this.repository.findById(id);
    if (!itinerary) {
      throw new ItineraryNotFoundError(`Itinerary not found: ${id}`);
    }
    return itinerary;
  }

  /**
   * Update an itinerary.
   */
  async updateItinerary(
    id: string,
    updates: UpdateItineraryInput,
    actorId: string,
    actorRole: 'AGENT' | 'ADMIN',
    changeReason?: string
  ): Promise<Itinerary> {
    const itinerary = await this.getRawItinerary(id);

    // Only draft itineraries can be updated via this method
    if (itinerary.status !== ItineraryStatus.DRAFT) {
      throw new InvalidStateTransitionError(
        `Cannot update itinerary in ${itinerary.status} status`
      );
    }

    const now = new Date().toISOString();
    const updatedItinerary: Itinerary = {
      ...itinerary,
      overview: updates.overview 
        ? { ...itinerary.overview, ...updates.overview }
        : itinerary.overview,
      pricing: updates.pricing
        ? itinerary.pricing 
          ? { ...itinerary.pricing, ...updates.pricing }
          : undefined
        : itinerary.pricing,
      termsAndConditions: updates.termsAndConditions ?? itinerary.termsAndConditions,
      cancellationPolicy: updates.cancellationPolicy ?? itinerary.cancellationPolicy,
      internalNotes: updates.internalNotes ?? itinerary.internalNotes,
      version: itinerary.version + 1,
      updatedAt: now,
    };

    // Persist updates
    await this.repository.update(id, updatedItinerary);

    // Create new version
    if (env.ENABLE_VERSION_HISTORY) {
      await this.versionService.createVersion(
        updatedItinerary,
        actorId,
        actorRole,
        changeReason
      );
    }

    // Emit audit event
    await publishEvent(createAuditEvent({
      eventType: 'itinerary.updated',
      entityType: 'itinerary',
      entityId: id,
      actorId,
      actorRole,
      changes: {
        version: { from: itinerary.version, to: updatedItinerary.version },
      },
      metadata: {
        changeReason,
      },
    }));

    return updatedItinerary;
  }

  /**
   * Update a submitted proposal (before user acceptance).
   * Agents can update their proposals to make changes based on traveler feedback.
   * This emits a notification event to inform the traveler of the update.
   */
  async updateProposal(
    id: string,
    updates: UpdateItineraryInput,
    actorId: string,
    changeReason?: string
  ): Promise<Itinerary> {
    const itinerary = await this.getRawItinerary(id);

    // Only DRAFT or SUBMITTED proposals can be updated (not APPROVED/REJECTED/ARCHIVED)
    const editableStatuses: string[] = [ItineraryStatus.DRAFT, ItineraryStatus.SUBMITTED, ItineraryStatus.UNDER_REVIEW];
    if (!editableStatuses.includes(itinerary.status)) {
      throw new InvalidStateTransitionError(
        `Cannot update proposal in ${itinerary.status} status. Proposals can only be updated before acceptance.`
      );
    }

    // Verify the actor is the agent who created this proposal
    if (itinerary.agentId !== actorId) {
      throw new ValidationError('Only the agent who created this proposal can update it');
    }

    const now = new Date().toISOString();
    const previousVersion = itinerary.version;
    const updatedItinerary: Itinerary = {
      ...itinerary,
      overview: updates.overview 
        ? { ...itinerary.overview, ...updates.overview }
        : itinerary.overview,
      pricing: updates.pricing
        ? itinerary.pricing 
          ? { ...itinerary.pricing, ...updates.pricing }
          : undefined
        : itinerary.pricing,
      dayPlans: updates.dayPlans ?? itinerary.dayPlans,
      termsAndConditions: updates.termsAndConditions ?? itinerary.termsAndConditions,
      cancellationPolicy: updates.cancellationPolicy ?? itinerary.cancellationPolicy,
      internalNotes: updates.internalNotes ?? itinerary.internalNotes,
      version: itinerary.version + 1,
      updatedAt: now,
    };

    // Persist updates
    await this.repository.update(id, updatedItinerary);

    // Create new version for history tracking
    if (env.ENABLE_VERSION_HISTORY) {
      await this.versionService.createVersion(
        updatedItinerary,
        actorId,
        'AGENT',
        changeReason || 'Proposal updated'
      );
    }

    // Emit proposal updated event (for notifications and real-time updates)
    await publishEvent({
      type: 'itinerary.proposal_updated',
      payload: {
        itineraryId: id,
        requestId: itinerary.requestId,
        agentId: itinerary.agentId,
        travelerId: itinerary.travelerId,
        version: updatedItinerary.version,
        previousVersion,
        changeReason: changeReason || 'Agent updated the proposal',
        updatedAt: now,
        // Include summary for notification
        proposalSummary: {
          title: updatedItinerary.overview?.title,
          totalPrice: updatedItinerary.pricing?.totalPrice,
          currency: updatedItinerary.pricing?.currency || 'INR',
        },
      },
      metadata: {
        timestamp: now,
        correlationId: `proposal-update-${id}-${Date.now()}`,
        source: env.SERVICE_NAME,
      },
    });

    // Also emit audit event for compliance
    await publishEvent(createAuditEvent({
      eventType: 'itinerary.proposal_updated',
      entityType: 'itinerary',
      entityId: id,
      actorId,
      actorRole: 'AGENT',
      changes: {
        version: { from: previousVersion, to: updatedItinerary.version },
        status: { from: itinerary.status, to: updatedItinerary.status },
      },
      metadata: {
        changeReason,
        requestId: itinerary.requestId,
        travelerId: itinerary.travelerId,
      },
    }));

    return updatedItinerary;
  }

  /**
   * Add an item to an itinerary.
   */
  async addItem(
    itineraryId: string,
    item: CreateItineraryItemInput,
    actorId: string,
    actorRole: 'AGENT' | 'ADMIN'
  ): Promise<ItineraryItem> {
    const itinerary = await this.getRawItinerary(itineraryId);

    // Check item limit
    if (itinerary.items.length >= env.MAX_ITINERARY_ITEMS) {
      throw new ValidationError(
        `Itinerary cannot have more than ${env.MAX_ITINERARY_ITEMS} items`
      );
    }

    const now = new Date().toISOString();
    const newItem: ItineraryItem = {
      ...item,
      id: uuidv4(),
      itineraryId,
      sequence: itinerary.items.length,
      createdAt: now,
      updatedAt: now,
    };

    // Add to items
    const updatedItems = [...itinerary.items, newItem];
    await this.repository.update(itineraryId, {
      items: updatedItems,
      version: itinerary.version + 1,
      updatedAt: now,
    });

    // Emit audit event
    await publishEvent(createAuditEvent({
      eventType: 'itinerary.item_added',
      entityType: 'itinerary',
      entityId: itineraryId,
      actorId,
      actorRole,
      changes: {
        itemCount: { from: itinerary.items.length, to: updatedItems.length },
      },
      metadata: {
        itemId: newItem.id,
        itemType: newItem.type,
      },
    }));

    return newItem;
  }

  /**
   * Update an item in an itinerary.
   */
  async updateItem(
    itineraryId: string,
    itemId: string,
    updates: UpdateItineraryItemInput,
    actorId: string,
    actorRole: 'AGENT' | 'ADMIN'
  ): Promise<ItineraryItem> {
    const itinerary = await this.getRawItinerary(itineraryId);
    const itemIndex = itinerary.items.findIndex((i: ItineraryItem) => i.id === itemId);
    
    if (itemIndex === -1) {
      throw new ValidationError(`Item not found: ${itemId}`);
    }

    const existingItem = itinerary.items[itemIndex];
    if (!existingItem) {
      throw new ValidationError(`Item not found: ${itemId}`);
    }

    const now = new Date().toISOString();
    const updatedItem: ItineraryItem = {
      ...existingItem,
      ...updates,
      updatedAt: now,
    };

    const updatedItems = [...itinerary.items];
    updatedItems[itemIndex] = updatedItem;

    await this.repository.update(itineraryId, {
      items: updatedItems,
      version: itinerary.version + 1,
      updatedAt: now,
    });

    // Emit audit event
    await publishEvent(createAuditEvent({
      eventType: 'itinerary.item_updated',
      entityType: 'itinerary',
      entityId: itineraryId,
      actorId,
      actorRole,
      changes: {},
      metadata: {
        itemId,
        itemType: updatedItem.type,
      },
    }));

    return updatedItem;
  }

  /**
   * Remove an item from an itinerary.
   */
  async removeItem(
    itineraryId: string,
    itemId: string,
    actorId: string,
    actorRole: 'AGENT' | 'ADMIN'
  ): Promise<void> {
    const itinerary = await this.getRawItinerary(itineraryId);
    const itemIndex = itinerary.items.findIndex((i: ItineraryItem) => i.id === itemId);
    
    if (itemIndex === -1) {
      throw new ValidationError(`Item not found: ${itemId}`);
    }

    const removedItem = itinerary.items[itemIndex];
    const updatedItems = itinerary.items.filter((i: ItineraryItem) => i.id !== itemId);

    // Resequence items
    const resequencedItems = updatedItems.map((item: ItineraryItem, index: number) => ({
      ...item,
      sequence: index,
    }));

    const now = new Date().toISOString();
    await this.repository.update(itineraryId, {
      items: resequencedItems,
      version: itinerary.version + 1,
      updatedAt: now,
    });

    // Emit audit event
    await publishEvent(createAuditEvent({
      eventType: 'itinerary.item_removed',
      entityType: 'itinerary',
      entityId: itineraryId,
      actorId,
      actorRole,
      changes: {
        itemCount: { from: itinerary.items.length, to: resequencedItems.length },
      },
      metadata: {
        itemId,
        itemType: removedItem?.type,
      },
    }));
  }

  /**
   * Update itinerary status.
   */
  async updateStatus(
    id: string,
    newStatus: ItineraryStatus,
    actorId: string,
    actorRole: 'AGENT' | 'ADMIN' | 'SYSTEM',
    reason?: string
  ): Promise<Itinerary> {
    const itinerary = await this.getRawItinerary(id);
    const currentStatus = itinerary.status;

    // Validate transition
    const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus as ItineraryStatus];
    if (!validTransitions.includes(newStatus)) {
      throw new InvalidStateTransitionError(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }

    const now = new Date().toISOString();
    const updates: Partial<Itinerary> = {
      status: newStatus,
      updatedAt: now,
    };

    // Set timestamps based on new status
    if (newStatus === ItineraryStatus.SUBMITTED) {
      updates.submittedAt = now;
    }
    if (newStatus === ItineraryStatus.APPROVED) {
      updates.approvedAt = now;
    }

    await this.repository.update(id, updates);

    // Emit audit event
    await publishEvent(createAuditEvent({
      eventType: 'itinerary.status_changed',
      entityType: 'itinerary',
      entityId: id,
      actorId,
      actorRole,
      changes: {
        status: { from: currentStatus, to: newStatus },
      },
      metadata: {
        reason,
      },
    }));

    return { ...itinerary, ...updates };
  }

  /**
   * Get itineraries for a request.
   */
  async getItinerariesForRequest(requestId: string): Promise<Itinerary[]> {
    return this.repository.findByRequestId(requestId);
  }

  /**
   * Get itineraries by agent.
   */
  async getItinerariesByAgent(agentId: string): Promise<Itinerary[]> {
    return this.repository.findByAgentId(agentId);
  }

  /**
   * Get itineraries for a traveler.
   */
  async getItinerariesForTraveler(travelerId: string): Promise<ItineraryWithMeta[]> {
    const itineraries = await this.repository.findByTravelerId(travelerId);
    return itineraries.map((it: Itinerary) => withMeta(getItineraryView(it)));
  }

  /**
   * Process expired itineraries.
   * Itineraries in SUBMITTED status that have been waiting too long are marked as ARCHIVED.
   * 
   * @returns Number of itineraries expired
   */
  async processExpiredItineraries(): Promise<number> {
    const expiryHours = env.ITINERARY_EXPIRY_HOURS;
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - expiryHours);

    // Find itineraries that are submitted but past the expiry window
    // In production, this would be a database query:
    // const expiredItineraries = await prisma.itinerary.findMany({
    //   where: {
    //     status: ItineraryStatus.SUBMITTED,
    //     submittedAt: { lt: cutoffDate },
    //   },
    // });

    // Placeholder for expired itineraries
    const expiredItineraries: Itinerary[] = [];

    let expiredCount = 0;

    for (const itinerary of expiredItineraries) {
      try {
        await this.updateStatus(
          itinerary.id,
          ItineraryStatus.ARCHIVED,
          'system',
          'ADMIN', // System acts as admin
          'Automatically expired - no selection within time window'
        );
        expiredCount++;

        // Emit expiration event for downstream services
        await publishEvent(createAuditEvent({
          eventType: 'itinerary.expired',
          entityType: 'itinerary',
          entityId: itinerary.id,
          actorId: 'system',
          actorRole: 'ADMIN',
          changes: {
            status: { from: ItineraryStatus.SUBMITTED, to: ItineraryStatus.ARCHIVED },
          },
          metadata: {
            requestId: itinerary.requestId,
            agentId: itinerary.agentId,
            submittedAt: itinerary.submittedAt,
            expiryHours,
            reason: 'automatic_expiration',
          },
        }));
      } catch (error) {
        // Log error but continue processing other itineraries
        console.error(`Failed to expire itinerary ${itinerary.id}:`, error);
      }
    }

    return expiredCount;
  }

  /**
   * Check if an itinerary is expired based on submission date.
   */
  isExpired(itinerary: Itinerary): boolean {
    if (itinerary.status !== ItineraryStatus.SUBMITTED) {
      return false;
    }

    if (!itinerary.submittedAt) {
      return false;
    }

    const expiryHours = env.ITINERARY_EXPIRY_HOURS;
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - expiryHours);

    const submittedAt = new Date(itinerary.submittedAt);
    return submittedAt < cutoffDate;
  }

  /**
   * Get the expiry date for an itinerary.
   * Returns null if the itinerary is not in a state where expiry applies.
   */
  getExpiryDate(itinerary: Itinerary): Date | null {
    if (itinerary.status !== ItineraryStatus.SUBMITTED || !itinerary.submittedAt) {
      return null;
    }

    const submittedAt = new Date(itinerary.submittedAt);
    const expiryDate = new Date(submittedAt);
    expiryDate.setHours(expiryDate.getHours() + env.ITINERARY_EXPIRY_HOURS);

    return expiryDate;
  }
}
