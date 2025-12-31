/**
 * Messaging Service - Attachment Service
 *
 * Handles file attachment uploads and storage.
 */

import { randomUUID } from 'crypto';
import { config } from '../env';
import { Errors } from '../api/errors';
import type { AttachmentView } from '../types';
import type { UploadAttachmentInput } from '../api/schemas';

// =============================================================================
// ATTACHMENT SERVICE
// =============================================================================

export class AttachmentService {
  /**
   * Creates a presigned URL for uploading an attachment.
   */
  async createPresignedUploadUrl(
    input: UploadAttachmentInput,
    _uploaderId: string
  ): Promise<{
    attachmentId: string;
    uploadUrl: string;
    expiresAt: string;
  }> {
    // Validate file type
    if (!config.limits.allowedAttachmentTypes.includes(input.mimeType)) {
      throw Errors.ATTACHMENT_TYPE_NOT_ALLOWED(
        input.mimeType,
        config.limits.allowedAttachmentTypes
      );
    }

    // Validate file size
    if (input.sizeBytes > config.limits.maxAttachmentSize) {
      throw Errors.ATTACHMENT_TOO_LARGE(config.limits.maxAttachmentSize);
    }

    // Verify uploader is participant in conversation
    // const conversation = await prisma.conversation.findUnique({
    //   where: { id: input.conversationId }
    // });
    // if (conversation.userId !== uploaderId && conversation.agentId !== uploaderId) {
    //   throw Errors.NOT_PARTICIPANT();
    // }

    const attachmentId = randomUUID();
    const storageKey = `${input.conversationId}/${attachmentId}/${input.filename}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create pending attachment record
    // await prisma.messageAttachment.create({
    //   data: {
    //     id: attachmentId,
    //     messageId: null, // Will be set when message is sent
    //     filename: input.filename,
    //     mimeType: input.mimeType,
    //     sizeBytes: input.sizeBytes,
    //     storageKey,
    //     url: null,
    //     thumbnailUrl: null,
    //     status: 'PENDING',
    //     uploaderId,
    //     expiresAt
    //   }
    // });

    // Generate presigned upload URL
    // In production, this would use S3 or compatible storage
    const uploadUrl = `${config.storage.endpoint}/${config.storage.bucket}/${storageKey}?upload=presigned`;

    return {
      attachmentId,
      uploadUrl,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Confirms an attachment upload has completed.
   */
  async confirmUpload(
    attachmentId: string,
    _uploaderId: string
  ): Promise<AttachmentView> {
    // Verify the attachment exists and belongs to uploader
    // const attachment = await prisma.messageAttachment.findUnique({
    //   where: { id: attachmentId }
    // });

    // Placeholder
    const attachment = {
      id: attachmentId,
      filename: 'placeholder.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      storageKey: `attachments/${attachmentId}`,
      url: null as string | null,
      thumbnailUrl: null as string | null,
    };

    // Verify file exists in storage
    // const exists = await storage.headObject(attachment.storageKey);

    // Generate download URL
    const url = `${config.storage.endpoint}/${config.storage.bucket}/${attachment.storageKey}`;

    // Update attachment status
    // await prisma.messageAttachment.update({
    //   where: { id: attachmentId },
    //   data: { status: 'CONFIRMED', url }
    // });

    // Generate thumbnail for images
    let thumbnailUrl: string | null = null;
    if (attachment.mimeType.startsWith('image/')) {
      // thumbnailUrl = await this.generateThumbnail(attachment.storageKey);
    }

    return {
      id: attachment.id,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      url,
      thumbnailUrl,
    };
  }

  /**
   * Gets attachment metadata.
   */
  async getAttachment(
    _attachmentId: string,
    _requesterId: string
  ): Promise<AttachmentView | null> {
    // Fetch attachment and verify access
    // const attachment = await prisma.messageAttachment.findUnique({
    //   where: { id: attachmentId },
    //   include: { message: { include: { conversation: true } } }
    // });

    // Placeholder
    return null;
  }

  /**
   * Gets a presigned download URL for an attachment.
   */
  async getDownloadUrl(
    attachmentId: string,
    requesterId: string
  ): Promise<string> {
    // Verify access
    const attachment = await this.getAttachment(attachmentId, requesterId);

    if (!attachment) {
      throw Errors.ATTACHMENT_NOT_FOUND(attachmentId);
    }

    // Generate presigned download URL
    // In production, this would generate a time-limited signed URL
    return attachment.url;
  }
}

// Singleton instance
export const attachmentService = new AttachmentService();
