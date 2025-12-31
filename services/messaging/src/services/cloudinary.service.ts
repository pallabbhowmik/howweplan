/**
 * Cloudinary Storage Service
 *
 * Handles file uploads with automatic compression and optimization.
 * Supports auto-deletion of old files based on retention policy.
 */

import { v2 as cloudinary } from 'cloudinary';
import { config } from '../env';
import { logger } from './logger.service';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.storage.cloudName,
  api_key: config.storage.apiKey,
  api_secret: config.storage.apiSecret,
});

export interface UploadOptions {
  conversationId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface UploadResult {
  publicId: string;
  secureUrl: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  format: string;
  resourceType: string;
  bytes: number;
}

class CloudinaryService {
  /**
   * Generate an upload signature for client-side uploads.
   * This allows secure direct uploads without exposing API secret.
   */
  async generateUploadSignature(options: UploadOptions): Promise<{
    signature: string;
    timestamp: number;
    cloudName: string;
    apiKey: string;
    folder: string;
    publicId: string;
  }> {
    const timestamp = Math.round(Date.now() / 1000);
    const publicId = `${options.conversationId}/${Date.now()}_${options.filename}`;

    const paramsToSign = {
      timestamp,
      folder: config.storage.folder,
      public_id: publicId,
      // Automatic optimizations
      quality: 'auto',
      fetch_format: 'auto',
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      config.storage.apiSecret
    );

    logger.info({
      conversationId: options.conversationId,
      filename: options.filename,
      publicId,
    }, 'Generated Cloudinary upload signature');

    return {
      signature,
      timestamp,
      cloudName: config.storage.cloudName,
      apiKey: config.storage.apiKey,
      folder: config.storage.folder,
      publicId,
    };
  }

  /**
   * Upload a file to Cloudinary with automatic compression.
   * For server-side uploads.
   */
  async uploadFile(
    buffer: Buffer,
    options: UploadOptions
  ): Promise<UploadResult> {
    const publicId = `${options.conversationId}/${Date.now()}_${options.filename}`;

    const uploadOptions: any = {
      folder: config.storage.folder,
      public_id: publicId,
      resource_type: 'auto',
      // Automatic optimizations
      quality: 'auto:good',
      fetch_format: 'auto',
    };

    // Image-specific optimizations
    if (options.mimeType.startsWith('image/')) {
      uploadOptions.transformation = [
        // Compress images
        { quality: 'auto:good', fetch_format: 'auto' },
        // Limit dimensions for very large images
        { width: 2048, height: 2048, crop: 'limit' },
      ];
    }

    // Video compression (if needed)
    if (options.mimeType.startsWith('video/')) {
      uploadOptions.transformation = [
        { quality: 'auto:good', fetch_format: 'auto' },
        { width: 1280, crop: 'limit' },
      ];
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            logger.error({ error, options }, 'Cloudinary upload failed');
            reject(error);
            return;
          }

          if (!result) {
            reject(new Error('Upload failed: no result'));
            return;
          }

          logger.info({
            publicId: result.public_id,
            bytes: result.bytes,
            format: result.format,
          }, 'File uploaded to Cloudinary');

          // Generate thumbnail for images
          let thumbnailUrl: string | undefined;
          if (result.resource_type === 'image') {
            thumbnailUrl = cloudinary.url(result.public_id, {
              transformation: [
                { width: 300, height: 300, crop: 'fill' },
                { quality: 'auto:low' },
              ],
            });
          }

          resolve({
            publicId: result.public_id,
            secureUrl: result.secure_url,
            thumbnailUrl,
            width: result.width,
            height: result.height,
            format: result.format,
            resourceType: result.resource_type,
            bytes: result.bytes,
          });
        }
      );

      uploadStream.end(buffer);
    });
  }

  /**
   * Delete a file from Cloudinary.
   */
  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      logger.info({ publicId }, 'File deleted from Cloudinary');
    } catch (error) {
      logger.error({ error, publicId }, 'Failed to delete file from Cloudinary');
      throw error;
    }
  }

  /**
   * Delete old files based on retention policy.
   * Should be called by a scheduled job (cron).
   */
  async deleteOldFiles(): Promise<{ deleted: number; errors: number }> {
    const retentionDays = config.storage.autoDeleteDays;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    logger.info({ retentionDays, cutoffDate }, 'Starting old file cleanup');

    let deleted = 0;
    let errors = 0;
    let nextCursor: string | undefined;

    try {
      do {
        // List files in the folder
        const result = await cloudinary.api.resources({
          type: 'upload',
          prefix: config.storage.folder,
          max_results: 500,
          next_cursor: nextCursor,
        });

        // Filter files older than retention period
        for (const resource of result.resources) {
          const createdAt = new Date(resource.created_at);

          if (createdAt < cutoffDate) {
            try {
              await this.deleteFile(resource.public_id);
              deleted++;
            } catch (error) {
              logger.error({ error, publicId: resource.public_id }, 'Failed to delete old file');
              errors++;
            }
          }
        }

        nextCursor = result.next_cursor;
      } while (nextCursor);

      logger.info({ deleted, errors }, 'Old file cleanup completed');
      return { deleted, errors };
    } catch (error) {
      logger.error({ error }, 'Old file cleanup failed');
      throw error;
    }
  }

  /**
   * Get file information.
   */
  async getFileInfo(publicId: string) {
    try {
      return await cloudinary.api.resource(publicId);
    } catch (error) {
      logger.error({ error, publicId }, 'Failed to get file info');
      throw error;
    }
  }
}

export const cloudinaryService = new CloudinaryService();
