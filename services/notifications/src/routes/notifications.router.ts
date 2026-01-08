/**
 * Notifications REST API Router
 * 
 * Provides REST endpoints for user notification management.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// Optimized connection pool for faster response times
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  min: 2,                          // Keep minimum connections warm
  max: 10,                         // Max concurrent connections
  connectionTimeoutMillis: 5000,   // Fast fail on connection issues
  idleTimeoutMillis: 30000,        // Release idle connections after 30s
});

export function createNotificationsRouter(): Router {
  const router = Router();

  /**
   * GET /api/v1/notifications
   * List notifications for the authenticated user
   */
  router.get('/api/v1/notifications', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // User ID comes from the gateway's auth headers
      const userId = req.headers['x-user-id'] as string;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      const unreadOnly = req.query.unread === 'true';

      let query = `
        SELECT id, user_id, type, title, body, data, is_read, read_at, created_at
        FROM notifications
        WHERE user_id = $1
      `;
      const params: any[] = [userId];

      if (unreadOnly) {
        query += ` AND is_read = false`;
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM notifications 
        WHERE user_id = $1 ${unreadOnly ? 'AND is_read = false' : ''}
      `;
      const countResult = await pool.query(countQuery, [userId]);
      const total = parseInt(countResult.rows[0].total);

      // Get unread count
      const unreadCountResult = await pool.query(
        `SELECT COUNT(*) as unread FROM notifications WHERE user_id = $1 AND is_read = false`,
        [userId]
      );
      const unreadCount = parseInt(unreadCountResult.rows[0].unread);

      res.json({
        success: true,
        data: {
          notifications: result.rows.map(row => ({
            id: row.id,
            userId: row.user_id,
            type: row.type,
            title: row.title,
            body: row.body,
            data: row.data,
            isRead: row.is_read,
            readAt: row.read_at,
            createdAt: row.created_at,
          })),
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + result.rows.length < total,
          },
          unreadCount,
        },
      });
    } catch (error) {
      logger.error('Failed to fetch notifications', { error: error instanceof Error ? error.message : String(error) });
      next(error);
    }
  });

  /**
   * POST /api/v1/notifications/:id/read
   * Mark a notification as read
   */
  router.post('/api/v1/notifications/:id/read', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const notificationId = req.params.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const result = await pool.query(
        `UPDATE notifications 
         SET is_read = true, read_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING id, is_read, read_at`,
        [notificationId, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Notification not found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: result.rows[0].id,
          isRead: result.rows[0].is_read,
          readAt: result.rows[0].read_at,
        },
      });
    } catch (error) {
      logger.error('Failed to mark notification as read', { error: error instanceof Error ? error.message : String(error) });
      next(error);
    }
  });

  /**
   * POST /api/v1/notifications/read-all
   * Mark all notifications as read
   */
  router.post('/api/v1/notifications/read-all', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.headers['x-user-id'] as string;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const result = await pool.query(
        `UPDATE notifications 
         SET is_read = true, read_at = NOW()
         WHERE user_id = $1 AND is_read = false
         RETURNING id`,
        [userId]
      );

      res.json({
        success: true,
        data: {
          markedCount: result.rowCount,
        },
      });
    } catch (error) {
      logger.error('Failed to mark all notifications as read', { error: error instanceof Error ? error.message : String(error) });
      next(error);
    }
  });

  /**
   * GET /api/v1/notifications/unread-count
   * Get count of unread notifications
   */
  router.get('/api/v1/notifications/unread-count', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.headers['x-user-id'] as string;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const result = await pool.query(
        `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false`,
        [userId]
      );

      res.json({
        success: true,
        data: {
          count: parseInt(result.rows[0].count),
        },
      });
    } catch (error) {
      logger.error('Failed to get unread count', { error: error instanceof Error ? error.message : String(error) });
      next(error);
    }
  });

  return router;
}
