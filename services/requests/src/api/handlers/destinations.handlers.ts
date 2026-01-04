/**
 * Destinations API Handlers
 * 
 * HTTP handlers for destination CRUD operations.
 */

import { Request, Response, RequestHandler } from 'express';
import { createClient } from '@supabase/supabase-js';
import { DestinationRepository } from '../../domain/destination.repository';
import { config } from '../../env';

const DESTINATION_IMAGES_BUCKET = 'destination-images';

function sanitizeFilename(filename: string): string {
  return filename
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

async function ensurePublicBucketExists(bucket: string) {
  const supabase = createClient(
    config.database.supabaseUrl,
    config.database.supabaseServiceRoleKey
  );

  const { error } = await supabase.storage.getBucket(bucket);
  if (!error) {
    return supabase;
  }

  const create = await supabase.storage.createBucket(bucket, {
    public: true,
  });
  if (create.error) {
    // If it already exists (race), ignore; otherwise fail.
    const message = String(create.error.message || 'Failed to create storage bucket');
    if (!/already exists/i.test(message)) {
      throw create.error;
    }
  }

  return supabase;
}

export function createListDestinationsHandler(
  repository: DestinationRepository
): RequestHandler {
  return async (req: Request, res: Response) => {
    try {
      const { region, theme, isActive, isFeatured, search } = req.query;

      const filters = {
        ...(region && { region: String(region) }),
        ...(theme && { theme: String(theme) }),
        ...(isActive !== undefined && { isActive: isActive === 'true' }),
        ...(isFeatured !== undefined && { isFeatured: isFeatured === 'true' }),
        ...(search && { search: String(search) }),
      };

      const destinations = await repository.findAll(filters);

      res.json({
        data: destinations,
        pagination: {
          page: 1,
          limit: destinations.length,
          total: destinations.length,
          totalPages: 1,
        },
      });
    } catch (error) {
      console.error('Failed to list destinations:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to list destinations',
      });
    }
  };
}

export function createGetDestinationHandler(
  repository: DestinationRepository
): RequestHandler {
  return async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const destination = await repository.findById(id);

      if (!destination) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Destination not found',
        });
        return;
      }

      res.json(destination);
    } catch (error) {
      console.error('Failed to get destination:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to get destination',
      });
    }
  };
}

export function createCreateDestinationHandler(
  repository: DestinationRepository
): RequestHandler {
  return async (req: Request, res: Response) => {
    try {
      const {
        id,
        name,
        state,
        region,
        themes,
        idealMonths,
        suggestedDurationMin,
        suggestedDurationMax,
        highlight,
        imageUrl,
        isFeatured,
        isActive,
        displayOrder,
      } = req.body;

      // Validate required fields
      if (!id || !name || !state || !region || !highlight) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Missing required fields: id, name, state, region, highlight',
        });
        return;
      }

      // Check if ID already exists
      const existing = await repository.findById(id);
      if (existing) {
        res.status(409).json({
          error: 'CONFLICT',
          message: `Destination with ID '${id}' already exists`,
        });
        return;
      }

      const destination = await repository.create({
        id,
        name,
        state,
        region,
        themes: themes || [],
        idealMonths: idealMonths || [],
        suggestedDurationMin: suggestedDurationMin || 2,
        suggestedDurationMax: suggestedDurationMax || 4,
        highlight,
        imageUrl,
        isFeatured,
        isActive,
        displayOrder,
      });

      res.status(201).json(destination);
    } catch (error) {
      console.error('Failed to create destination:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to create destination',
      });
    }
  };
}

export function createUpdateDestinationHandler(
  repository: DestinationRepository
): RequestHandler {
  return async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const destination = await repository.update(id, updates);

      if (!destination) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Destination not found',
        });
        return;
      }

      res.json(destination);
    } catch (error) {
      console.error('Failed to update destination:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to update destination',
      });
    }
  };
}

export function createDeleteDestinationHandler(
  repository: DestinationRepository
): RequestHandler {
  return async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await repository.delete(id);

      if (!deleted) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Destination not found',
        });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete destination:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to delete destination',
      });
    }
  };
}

export function createDestinationStatsHandler(
  repository: DestinationRepository
): RequestHandler {
  return async (_req: Request, res: Response) => {
    try {
      const stats = await repository.getStats();
      res.json(stats);
    } catch (error) {
      console.error('Failed to get destination stats:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to get destination stats',
      });
    }
  };
}

export function createImportDestinationsHandler(
  repository: DestinationRepository
): RequestHandler {
  return async (req: Request, res: Response) => {
    try {
      const { destinations } = req.body;

      if (!Array.isArray(destinations)) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'destinations must be an array',
        });
        return;
      }

      const result = await repository.bulkCreate(destinations);
      res.json(result);
    } catch (error) {
      console.error('Failed to import destinations:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to import destinations',
      });
    }
  };
}

export function createBulkUpdateDestinationsHandler(
  repository: DestinationRepository
): RequestHandler {
  return async (req: Request, res: Response) => {
    try {
      const { updates } = req.body;

      if (!Array.isArray(updates)) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'updates must be an array',
        });
        return;
      }

      const results: any[] = [];
      for (const { id, updates: updateData } of updates) {
        const updated = await repository.update(id, updateData);
        if (updated) {
          results.push(updated);
        }
      }

      res.json(results);
    } catch (error) {
      console.error('Failed to bulk update destinations:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to bulk update destinations',
      });
    }
  };
}

export function createUploadDestinationImageHandler(
  repository: DestinationRepository
): RequestHandler {
  return async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      type UploadedFile = {
        buffer: Buffer;
        mimetype: string;
        originalname: string;
      };
      const file = (req as Request & { file?: UploadedFile }).file;

      if (!file) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Missing file. Send multipart/form-data with field name "file".',
        });
        return;
      }

      if (!file.mimetype || !file.mimetype.startsWith('image/')) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid file type. Only image uploads are allowed.',
        });
        return;
      }

      // Ensure destination exists first
      const existing = await repository.findById(id);
      if (!existing) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Destination not found',
        });
        return;
      }

      const supabase = await ensurePublicBucketExists(DESTINATION_IMAGES_BUCKET);

      const safeName = sanitizeFilename(file.originalname || 'image');
      const objectPath = `destinations/${encodeURIComponent(id)}/${Date.now()}-${safeName}`;

      const upload = await supabase.storage
        .from(DESTINATION_IMAGES_BUCKET)
        .upload(objectPath, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (upload.error) {
        console.error('Failed to upload destination image:', upload.error);
        res.status(500).json({
          error: 'INTERNAL_ERROR',
          message: 'Failed to upload destination image',
        });
        return;
      }

      const { data: publicData } = supabase.storage
        .from(DESTINATION_IMAGES_BUCKET)
        .getPublicUrl(objectPath);

      const publicUrl = publicData.publicUrl;

      const updated = await repository.update(id, { imageUrl: publicUrl });
      if (!updated) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Destination not found',
        });
        return;
      }

      res.json(updated);
    } catch (error) {
      console.error('Failed to upload destination image:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to upload destination image',
      });
    }
  };
}
