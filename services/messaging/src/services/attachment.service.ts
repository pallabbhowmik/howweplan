/**
 * Messaging Service - Attachment Service
 *
 * Handles file attachment uploads using Cloudinary with compression.
 */

import { randomUUID } from 'crypto';
import { config } from '../env';
import { Errors } from '../api/errors';
import { cloudinaryService } from './cloudinary.service';
import type { AttachmentView } from '../types';
import type { UploadAttachmentInput } from '../api/schemas';

// =============================================================================
// ATTACHMENT SERVICE
// =============================================================================

export class AttachmentService {
  /**
   * Creates a presigned upload signature for Cloudinary.
   * Client uploads directly to Cloudinary with automatic compression.
   */
  async createPresignedUploadUrl(
    input: UploadAttachmentInput,
    _uploaderId: string
  ): Promise<{
    attachmentId: string;
    uploadUrl: string;
    uploadSignature: any;
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

    const attachmentId = randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Generate Cloudinary upload signature
    const uploadSignature = await cloudinaryService.generateUploadSignature({
      conversationId: input.conversationId,
      filename: input.filename,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    });

    // Cloudinary upload endpoint
    const uploadUrl = `https://api.cloudinary.com/v1_1/${uploadSignature.cloudName}/auto/upload`;

    return {
      attachmentId,
      uploadUrl,
      uploadSignature,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Confirms an attachment upload has completed on Cloudinary.
   */
  async confirmUpload(
    attachmentId: string,
    publicId: string,
    _uploaderId: string
  ): Promise<AttachmentView> {
    // Get file info from Cloudinary
    const fileInfo = await cloudinaryService.getFileInfo(publicId);

    // Generate thumbnail URL for images
    let thumbnailUrl: string | null = null;
    if (fileInfo.resource_type === 'image') {
      thumbnailUrl = `https://res.cloudinary.com/${config.storage.cloudName}/image/upload/w_300,h_300,c_fill,q_auto/${publicId}`;
    }

    return {
      id: attachmentId,
      filename: fileInfo.public_id.split('/').pop() || 'unknown',
      mimeType: fileInfo.format,
      sizeBytes: fileInfo.bytes,
      url: fileInfo.secure_url,
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
