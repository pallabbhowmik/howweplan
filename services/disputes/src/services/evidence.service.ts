/**
 * Evidence Service
 * 
 * Handles evidence collection and management for disputes.
 */

import { v4 as uuidv4 } from 'uuid';
import { config } from '../env.js';
import {
  Evidence,
  EvidenceType,
  EvidenceSource,
} from '../types/domain.js';
import { EvidenceSubmitDTO } from '../types/dto.js';
import { getDispute } from './dispute.service.js';
import { canSubmitEvidence } from '../state-machine/dispute-state.js';
import {
  eventPublisher,
  createEvidenceSubmittedEvent,
  type EventContext,
} from '../events/publisher.js';
import { createAuditLog, logger } from '../audit/logger.js';

/**
 * In-memory evidence store for development.
 */
const evidenceStore = new Map<string, Evidence>();

/**
 * Get evidence count for a dispute.
 */
async function getEvidenceCountForDispute(disputeId: string): Promise<number> {
  return Array.from(evidenceStore.values()).filter(
    (e) => e.disputeId === disputeId
  ).length;
}

/**
 * Validate file upload.
 */
function validateFileUpload(dto: EvidenceSubmitDTO): void {
  // Check file size
  const maxSizeBytes = config.limits.maxEvidenceFileSizeMb * 1024 * 1024;
  if (dto.fileSizeBytes > maxSizeBytes) {
    throw new Error(
      `File size exceeds limit of ${config.limits.maxEvidenceFileSizeMb}MB`
    );
  }

  // Check MIME type
  if (!config.limits.allowedEvidenceMimeTypes.includes(dto.mimeType)) {
    throw new Error(
      `File type '${dto.mimeType}' is not allowed. Allowed types: ${config.limits.allowedEvidenceMimeTypes.join(', ')}`
    );
  }
}

/**
 * Submit evidence for a dispute.
 */
export async function submitEvidence(
  dto: EvidenceSubmitDTO,
  submitterId: string,
  submitterType: 'traveler' | 'agent',
  context: EventContext
): Promise<Evidence> {
  // Check feature toggle
  if (!config.features.evidenceFileUpload) {
    throw new Error('Evidence file upload is currently disabled');
  }

  const dispute = await getDispute(dto.disputeId);
  if (!dispute) {
    throw new Error(`Dispute not found: ${dto.disputeId}`);
  }

  // Check if evidence submission is allowed in current state
  if (!canSubmitEvidence(dispute.state)) {
    throw new Error(
      `Cannot submit evidence in state '${dispute.state}'. Evidence can only be submitted in 'pending_evidence' or 'evidence_submitted' states.`
    );
  }

  // Check evidence count limit
  const currentCount = await getEvidenceCountForDispute(dto.disputeId);
  if (currentCount >= config.limits.maxEvidenceFilesPerDispute) {
    throw new Error(
      `Maximum evidence limit of ${config.limits.maxEvidenceFilesPerDispute} files reached`
    );
  }

  // Validate file
  validateFileUpload(dto);

  // Verify submitter has permission
  if (submitterType === 'traveler' && dispute.travelerId !== submitterId) {
    throw new Error('Only the dispute creator can submit evidence as traveler');
  }
  if (submitterType === 'agent' && dispute.agentId !== submitterId) {
    throw new Error('Only the assigned agent can submit evidence');
  }

  const evidenceId = uuidv4();

  const evidence: Evidence = {
    id: evidenceId,
    disputeId: dto.disputeId,
    type: dto.type,
    source: submitterType,
    submittedBy: submitterId,
    fileName: dto.fileName,
    fileUrl: dto.fileUrl,
    fileSizeBytes: dto.fileSizeBytes,
    mimeType: dto.mimeType,
    description: dto.description ?? null,
    createdAt: new Date(),
    isVerified: false,
    verifiedBy: null,
    verifiedAt: null,
  };

  evidenceStore.set(evidenceId, evidence);

  // Create audit log
  await createAuditLog({
    entityType: 'evidence',
    entityId: evidenceId,
    action: 'evidence_submitted',
    actorType: submitterType,
    actorId: submitterId,
    newState: evidence as unknown as Record<string, unknown>,
  });

  // Emit event
  await eventPublisher.publish(
    createEvidenceSubmittedEvent(context, {
      disputeId: dto.disputeId,
      evidenceId,
      submittedBy: submitterId,
      submitterType,
      evidenceType: dto.type,
      totalEvidenceCount: currentCount + 1,
    })
  );

  logger.info({
    msg: 'Evidence submitted',
    evidenceId,
    disputeId: dto.disputeId,
    type: dto.type,
    submitterType,
  });

  return evidence;
}

/**
 * Get evidence for a dispute.
 */
export async function getEvidenceForDispute(
  disputeId: string
): Promise<Evidence[]> {
  return Array.from(evidenceStore.values()).filter(
    (e) => e.disputeId === disputeId
  );
}

/**
 * Get evidence by ID.
 */
export async function getEvidence(evidenceId: string): Promise<Evidence | null> {
  return evidenceStore.get(evidenceId) ?? null;
}

/**
 * Verify evidence (admin action).
 */
export async function verifyEvidence(
  evidenceId: string,
  adminId: string,
  verified: boolean,
  context: EventContext
): Promise<Evidence> {
  const evidence = await getEvidence(evidenceId);
  if (!evidence) {
    throw new Error(`Evidence not found: ${evidenceId}`);
  }

  const updatedEvidence: Evidence = {
    ...evidence,
    isVerified: verified,
    verifiedBy: adminId,
    verifiedAt: new Date(),
  };

  evidenceStore.set(evidenceId, updatedEvidence);

  // Create audit log
  await createAuditLog({
    entityType: 'evidence',
    entityId: evidenceId,
    action: verified ? 'evidence_verified' : 'evidence_rejected',
    actorType: 'admin',
    actorId: adminId,
    previousState: { isVerified: evidence.isVerified },
    newState: { isVerified: verified },
    reason: verified ? 'Evidence verified by admin' : 'Evidence rejected by admin',
  });

  logger.info({
    msg: 'Evidence verification updated',
    evidenceId,
    verified,
    adminId,
  });

  return updatedEvidence;
}

/**
 * Get evidence statistics for a dispute.
 */
export async function getEvidenceStats(disputeId: string): Promise<{
  total: number;
  byType: Record<EvidenceType, number>;
  bySource: Record<EvidenceSource, number>;
  verifiedCount: number;
}> {
  const evidence = await getEvidenceForDispute(disputeId);

  const byType: Record<EvidenceType, number> = {
    photo: 0,
    document: 0,
    screenshot: 0,
    communication_log: 0,
    receipt: 0,
    video: 0,
    written_statement: 0,
  };

  const bySource: Record<EvidenceSource, number> = {
    traveler: 0,
    agent: 0,
    admin: 0,
    system: 0,
  };

  let verifiedCount = 0;

  for (const e of evidence) {
    byType[e.type]++;
    bySource[e.source]++;
    if (e.isVerified) verifiedCount++;
  }

  return {
    total: evidence.length,
    byType,
    bySource,
    verifiedCount,
  };
}
