import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import type { 
  Submission, 
  CreateSubmissionDto,
  SubmissionContent,
} from '../models/index.js';
import { SubmissionStatus } from '../models/index.js';
import type { SubmissionRepository } from '../repository/index.js';
import { publishEvent } from '../events/index.js';
import { createAuditEvent, logger } from '../utils/index.js';
import { 
  SubmissionNotFoundError,
  DuplicateSubmissionError,
  InvalidSubmissionError,
} from '../utils/index.js';

// ============================================================================
// REALTIME BROADCAST HELPER
// ============================================================================

const API_GATEWAY_URL = process.env.API_GATEWAY_INTERNAL_URL || 'http://localhost:3001';
const INTERNAL_SERVICE_SECRET = process.env.INTERNAL_SERVICE_SECRET || 'dev-internal-secret';

/**
 * Broadcast event to connected WebSocket clients via API Gateway
 */
async function broadcastToClients(
  eventType: 'request_update' | 'new_match' | 'match_expired' | 'proposal_received',
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/internal/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': INTERNAL_SERVICE_SECRET,
      },
      body: JSON.stringify({ eventType, payload }),
    });

    if (!response.ok) {
      logger.warn({
        eventType,
        status: response.status,
      }, 'Failed to broadcast to API Gateway');
    }
  } catch (error) {
    // Non-blocking - don't fail event publishing if broadcast fails
    logger.warn({ error, eventType }, 'Error broadcasting to API Gateway');
  }
}

/**
 * Service for handling agent submissions.
 * 
 * BUSINESS RULES:
 * - Agents may submit itineraries via PDF, links, or free text
 * - Original agent content MUST be preserved
 * - Every state change MUST emit an audit event
 */
export class SubmissionService {
  constructor(private readonly repository: SubmissionRepository) {}

  /**
   * Create a new submission from an agent.
   */
  async createSubmission(dto: CreateSubmissionDto, actorId: string): Promise<Submission> {
    // Generate content hash for deduplication
    const contentHash = this.hashContent(dto.content);

    // Check for duplicate submission
    const existing = await this.repository.findByContentHash(contentHash);
    if (existing) {
      throw new DuplicateSubmissionError(
        `Duplicate submission detected. Original submission ID: ${existing.id}`
      );
    }

    // Validate content based on source
    this.validateContent(dto.content);

    const now = new Date().toISOString();
    const submission: Submission = {
      id: uuidv4(),
      requestId: dto.requestId,
      agentId: dto.agentId,
      travelerId: dto.travelerId,
      source: dto.content.source,
      content: dto.content,
      status: SubmissionStatus.PENDING,
      originalContent: JSON.stringify(dto.content),
      contentHash,
      createdAt: now,
      updatedAt: now,
    };

    // Persist submission
    await this.repository.create(submission);

    // Emit audit event
    await publishEvent(createAuditEvent({
      eventType: 'submission.created',
      entityType: 'submission',
      entityId: submission.id,
      actorId,
      actorRole: 'AGENT',
      changes: {
        status: { from: null, to: SubmissionStatus.PENDING },
      },
      metadata: {
        requestId: dto.requestId,
        source: dto.content.source,
      },
    }));

    // Emit domain event
    await publishEvent({
      type: 'itinerary.submitted',
      payload: {
        submissionId: submission.id,
        requestId: submission.requestId,
        agentId: submission.agentId,
        travelerId: submission.travelerId,
        source: submission.source,
      },
      metadata: {
        timestamp: now,
        correlationId: submission.requestId,
        source: 'itineraries-service',
      },
    });

    // Broadcast to user's WebSocket clients (proposal received)
    broadcastToClients('proposal_received', {
      requestId: submission.requestId,
      submissionId: submission.id,
      agentId: submission.agentId,
      travelerId: submission.travelerId,
    });

    // Broadcast request update
    broadcastToClients('request_update', {
      requestId: submission.requestId,
      status: 'proposal_submitted',
      submissionId: submission.id,
    });

    return submission;
  }

  /**
   * Get a submission by ID.
   */
  async getSubmission(id: string): Promise<Submission> {
    const submission = await this.repository.findById(id);
    if (!submission) {
      throw new SubmissionNotFoundError(`Submission not found: ${id}`);
    }
    return submission;
  }

  /**
   * Get submissions for a request.
   */
  async getSubmissionsForRequest(requestId: string): Promise<Submission[]> {
    return this.repository.findByRequestId(requestId);
  }

  /**
   * Get submissions by agent.
   */
  async getSubmissionsByAgent(agentId: string): Promise<Submission[]> {
    return this.repository.findByAgentId(agentId);
  }

  /**
   * Update submission status.
   */
  async updateStatus(
    id: string,
    status: SubmissionStatus,
    actorId: string,
    actorRole: 'AGENT' | 'ADMIN' | 'SYSTEM',
    errorMessage?: string
  ): Promise<Submission> {
    const submission = await this.getSubmission(id);
    const previousStatus = submission.status;

    // Validate transition
    this.validateStatusTransition(previousStatus, status);

    const now = new Date().toISOString();
    const updates: Partial<Submission> = {
      status,
      updatedAt: now,
    };

    if (status === SubmissionStatus.FAILED && errorMessage) {
      updates.errorMessage = errorMessage;
    }

    if (([SubmissionStatus.PARSED, SubmissionStatus.FAILED, SubmissionStatus.COMPLETED] as SubmissionStatus[]).includes(status)) {
      updates.processedAt = now;
    }

    await this.repository.update(id, updates);

    // Emit audit event
    await publishEvent(createAuditEvent({
      eventType: 'submission.status_changed',
      entityType: 'submission',
      entityId: id,
      actorId,
      actorRole,
      changes: {
        status: { from: previousStatus, to: status },
      },
    }));

    return { ...submission, ...updates };
  }

  /**
   * Link submission to resulting itinerary.
   */
  async linkToItinerary(
    submissionId: string,
    itineraryId: string,
    actorId: string
  ): Promise<void> {
    await this.repository.update(submissionId, {
      resultingItineraryId: itineraryId,
      status: SubmissionStatus.COMPLETED,
      updatedAt: new Date().toISOString(),
    });

    await publishEvent(createAuditEvent({
      eventType: 'submission.linked_to_itinerary',
      entityType: 'submission',
      entityId: submissionId,
      actorId,
      actorRole: 'SYSTEM',
      changes: {
        resultingItineraryId: { from: null, to: itineraryId },
        status: { from: SubmissionStatus.PARSED, to: SubmissionStatus.COMPLETED },
      },
    }));
  }

  /**
   * Hash content for deduplication.
   */
  private hashContent(content: SubmissionContent): string {
    const serialized = JSON.stringify(content);
    return createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Validate submission content based on source type.
   */
  private validateContent(content: SubmissionContent): void {
    switch (content.source) {
      case 'PDF_UPLOAD':
        if (!content.fileUrl || !content.fileName) {
          throw new InvalidSubmissionError('PDF submissions require fileUrl and fileName');
        }
        break;
      case 'EXTERNAL_LINK':
        if (!content.url) {
          throw new InvalidSubmissionError('Link submissions require a URL');
        }
        break;
      case 'FREE_TEXT':
        if (!content.content || content.content.trim().length === 0) {
          throw new InvalidSubmissionError('Free text submissions require content');
        }
        break;
      case 'STRUCTURED_INPUT':
        if (!content.data) {
          throw new InvalidSubmissionError('Structured submissions require data');
        }
        break;
    }
  }

  /**
   * Validate status transition.
   */
  private validateStatusTransition(from: SubmissionStatus, to: SubmissionStatus): void {
    const validTransitions: Record<SubmissionStatus, SubmissionStatus[]> = {
      [SubmissionStatus.PENDING]: [SubmissionStatus.PROCESSING],
      [SubmissionStatus.PROCESSING]: [SubmissionStatus.PARSED, SubmissionStatus.FAILED],
      [SubmissionStatus.PARSED]: [SubmissionStatus.COMPLETED, SubmissionStatus.FAILED],
      [SubmissionStatus.FAILED]: [], // Terminal state
      [SubmissionStatus.COMPLETED]: [], // Terminal state
    };

    if (!validTransitions[from].includes(to)) {
      throw new InvalidSubmissionError(
        `Invalid status transition from ${from} to ${to}`
      );
    }
  }
}
