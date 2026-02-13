/**
 * Messaging Service - Evidence Export Service
 *
 * Handles exporting conversation evidence for disputes.
 * BUSINESS RULE: Message retention for disputes.
 */

import { randomUUID, createHash, createCipheriv, randomBytes } from 'crypto';
import { config } from '../env';
import { auditService } from './audit.service';
import { Errors } from '../api/errors';
import type { ParticipantType } from '../types';
import type {
  ExportEvidenceInput,
  AdminExportEvidenceInput,
  ActorContext,
} from '../api/schemas';

// =============================================================================
// EVIDENCE EXPORT TYPES
// =============================================================================

interface EvidenceExportRecord {
  id: string;
  conversationId: string;
  requestedById: string;
  requesterType: ParticipantType;
  reason: string;
  storageKey: string;
  contentHash: string;
  encryptionKeyId: string;
  messageCount: number;
  createdAt: Date;
  expiresAt: Date;
}

interface EvidenceContent {
  exportId: string;
  conversationId: string;
  exportedAt: string;
  exportedBy: {
    id: string;
    type: ParticipantType;
  };
  reason: string;
  participants: Array<{
    id: string;
    type: ParticipantType;
    displayName: string;
  }>;
  messages: Array<{
    id: string;
    senderId: string;
    senderType: ParticipantType;
    content: string;
    wasMasked: boolean;
    createdAt: string;
    attachments: Array<{
      id: string;
      filename: string;
      mimeType: string;
    }>;
  }>;
  metadata: {
    totalMessages: number;
    dateRange: {
      from: string;
      to: string;
    };
    contentHash: string;
  };
}

// =============================================================================
// EVIDENCE SERVICE
// =============================================================================

export class EvidenceService {
  /**
   * Creates an evidence export for a conversation.
   */
  async createExport(
    input: ExportEvidenceInput,
    actor: ActorContext
  ): Promise<EvidenceExportRecord> {
    // Placeholder
    const conversation = {
      id: input.conversationId,
      bookingId: null as string | null,
      userId: '',
      agentId: '',
    };
    const messages: any[] = [];

    // Generate evidence content
    const evidenceContent: EvidenceContent = {
      exportId: randomUUID(),
      conversationId: input.conversationId,
      exportedAt: new Date().toISOString(),
      exportedBy: {
        id: actor.actorId,
        type: actor.actorType,
      },
      reason: input.reason,
      participants: [], // Would be populated from database
      messages: messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        senderType: m.senderType,
        content: m.content, // Masked content for regular exports
        wasMasked: m.wasMasked,
        createdAt: m.createdAt.toISOString(),
        attachments: [],
      })),
      metadata: {
        totalMessages: messages.length,
        dateRange: {
          from: messages[0]?.createdAt?.toISOString() ?? '',
          to: messages[messages.length - 1]?.createdAt?.toISOString() ?? '',
        },
        contentHash: '',
      },
    };

    // Calculate content hash for integrity
    const contentJson = JSON.stringify(evidenceContent);
    const contentHash = createHash('sha256').update(contentJson).digest('hex');
    evidenceContent.metadata.contentHash = contentHash;

    // Encrypt the evidence
    const { encrypted: _encrypted, keyId } = this.encryptEvidence(contentJson);

    // Store in S3
    const exportId = evidenceContent.exportId;
    const storageKey = `evidence/${input.conversationId}/${exportId}.enc`;

    // In production: await storage.putObject(storageKey, encrypted);

    // Calculate expiration (30 days)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const exportRecord: EvidenceExportRecord = {
      id: exportId,
      conversationId: input.conversationId,
      requestedById: actor.actorId,
      requesterType: actor.actorType,
      reason: input.reason,
      storageKey,
      contentHash,
      encryptionKeyId: keyId,
      messageCount: messages.length,
      createdAt: new Date(),
      expiresAt,
    };

    // Audit log
    await auditService.logEvidenceExported(
      exportId,
      input.conversationId,
      conversation.bookingId,
      contentHash,
      messages.length,
      expiresAt,
      actor,
      input.reason
    );

    return exportRecord;
  }

  /**
   * Creates an admin evidence export (includes original unmasked content).
   * BUSINESS RULE: All admin actions require reason and are audit-logged.
   */
  async createAdminExport(
    input: AdminExportEvidenceInput,
    actor: ActorContext
  ): Promise<EvidenceExportRecord> {
    // Similar to createExport but includes originalContent if available
    // and input.includeOriginalContent is true

    return this.createExport(
      {
        conversationId: input.conversationId,
        reason: input.reason,
        includeAttachments: true,
      },
      actor
    );
  }

  /**
   * Gets an evidence export by ID.
   */
  async getExport(
    _exportId: string,
    _requesterId: string
  ): Promise<EvidenceExportRecord | null> {
    return null;
  }

  /**
   * Gets download URL for an evidence export.
   */
  async getExportDownloadUrl(
    exportId: string,
    requesterId: string
  ): Promise<string> {
    const exportRecord = await this.getExport(exportId, requesterId);

    if (!exportRecord) {
      throw Errors.EXPORT_NOT_FOUND(exportId);
    }

    // Check if expired
    if (exportRecord.expiresAt < new Date()) {
      throw Errors.EXPORT_NOT_FOUND(exportId);
    }

    // Generate Cloudinary download URL
    const url = `https://res.cloudinary.com/${config.storage.cloudName}/raw/upload/${exportRecord.storageKey}`;

    return url;
  }

  /**
   * Lists evidence exports for a conversation.
   */
  async listExportsForConversation(
    _conversationId: string,
    _requesterId: string
  ): Promise<EvidenceExportRecord[]> {
    return [];
  }

  /**
   * Encrypts evidence content using AES-256.
   */
  private encryptEvidence(content: string): { encrypted: Buffer; keyId: string } {
    const key = config.encryption.evidenceKey;
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(content, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Prepend IV to encrypted data
    const result = Buffer.concat([iv, encrypted]);

    return {
      encrypted: result,
      keyId: 'default', // In production, use key rotation and track key IDs
    };
  }
}

// Singleton instance
export const evidenceService = new EvidenceService();
