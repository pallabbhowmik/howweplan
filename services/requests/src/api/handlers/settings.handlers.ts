/**
 * System Settings API Handlers
 * 
 * Admin-only handlers for managing system settings.
 */

import { Request, Response } from 'express';
import { SettingsRepository } from '../../domain/settings.repository';

// ============================================================================
// HANDLER FACTORIES
// ============================================================================

/**
 * GET /admin/settings/system - List all system settings
 */
export function createGetAllSettingsHandler(repository: SettingsRepository) {
  return async (_req: Request, res: Response): Promise<void> => {
    try {
      const settings = await repository.getAll();

      res.json({
        success: true,
        data: settings,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error fetching system settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch system settings',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  };
}

/**
 * GET /admin/settings/system/:key - Get a specific system setting
 */
export function createGetSettingHandler(repository: SettingsRepository) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { key } = req.params;

      if (!key) {
        res.status(400).json({
          success: false,
          error: 'Setting key is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const setting = await repository.getByKey(key);

      if (!setting) {
        res.status(404).json({
          success: false,
          error: 'Setting not found',
          key,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        success: true,
        data: setting,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error fetching system setting:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch system setting',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  };
}

/**
 * PUT /admin/settings/system/:key - Update a system setting
 */
export function createUpdateSettingHandler(repository: SettingsRepository) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { key } = req.params;
      const { value } = req.body;

      if (!key) {
        res.status(400).json({
          success: false,
          error: 'Setting key is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (value === undefined) {
        res.status(400).json({
          success: false,
          error: 'Value is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Validate specific settings
      const validationError = validateSettingValue(key, value);
      if (validationError) {
        res.status(400).json({
          success: false,
          error: validationError,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get admin user ID from request headers (set by API gateway)
      const updatedBy = req.headers['x-user-id'] as string | undefined;

      const setting = await repository.update(key, value, updatedBy);

      res.json({
        success: true,
        data: setting,
        message: 'Setting updated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating system setting:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update system setting',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  };
}

/**
 * PUT /admin/settings/system/batch - Batch update multiple settings
 */
export function createBatchUpdateSettingsHandler(repository: SettingsRepository) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { settings } = req.body;

      if (!Array.isArray(settings) || settings.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Settings array is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Validate all settings
      for (const setting of settings) {
        if (!setting.key || setting.value === undefined) {
          res.status(400).json({
            success: false,
            error: 'Each setting must have a key and value',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const validationError = validateSettingValue(setting.key, setting.value);
        if (validationError) {
          res.status(400).json({
            success: false,
            error: `${setting.key}: ${validationError}`,
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      const updatedBy = req.headers['x-user-id'] as string | undefined;
      const updated = await repository.batchUpdate(settings, updatedBy);

      res.json({
        success: true,
        data: updated,
        message: `${updated.length} settings updated successfully`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error batch updating system settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to batch update system settings',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  };
}

/**
 * GET /admin/settings/system/category/:category - Get settings by category
 */
export function createGetSettingsByCategoryHandler(repository: SettingsRepository) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { category } = req.params;

      if (!category) {
        res.status(400).json({
          success: false,
          error: 'Category is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const settings = await repository.getByCategory(category);

      res.json({
        success: true,
        data: settings,
        category,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error fetching settings by category:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch settings by category',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateSettingValue(key: string, value: unknown): string | null {
  switch (key) {
    case 'max_open_requests_per_user':
      if (typeof value !== 'number' || value < 1 || value > 50) {
        return 'Value must be a number between 1 and 50';
      }
      break;

    case 'daily_request_cap_per_user':
      if (typeof value !== 'number' || value < 1 || value > 100) {
        return 'Value must be a number between 1 and 100';
      }
      break;

    case 'request_expiry_hours':
      if (typeof value !== 'number' || value < 1 || value > 720) {
        return 'Value must be a number between 1 and 720';
      }
      break;

    // Add more validations as needed for other settings
  }

  return null;
}
