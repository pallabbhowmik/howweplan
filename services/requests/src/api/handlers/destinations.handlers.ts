/**
 * Destinations API Handlers
 * 
 * HTTP handlers for destination CRUD operations.
 */

import { Request, Response, RequestHandler } from 'express';
import { DestinationRepository } from '../domain/destination.repository';

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
