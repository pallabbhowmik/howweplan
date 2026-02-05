/**
 * User API routes.
 * Handles user profile management and settings.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  AuthenticatedRequest,
  requireAuth,
  blockSuspended,
  requireOwnership,
  validateBody,
  validateParams,
} from '../middleware/index.js';
import {
  getUserById,
  getUserWithProfile,
  getOrCreateUserFromGateway,
  updateUserProfile,
  getUserSettings,
  updateUserSettings,
} from '../services/user.service.js';
import { EventContext } from '../events/index.js';
import { IdentityError, UserNotFoundError } from '../services/errors.js';
import { updateUserProfileRequestSchema, uuidSchema, userSettingsSchema } from '../types/api.schemas.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates an event context from the request.
 */
function createEventContext(req: Request): EventContext {
  const authReq = req as AuthenticatedRequest;
  return {
    correlationId: authReq.correlationId ?? 'unknown',
    actorId: authReq.identity?.sub ?? null,
    actorRole: authReq.identity?.role ?? 'SYSTEM',
  };
}

/**
 * Sends a success response.
 */
function sendSuccess<T>(res: Response, data: T, correlationId: string, statusCode: number = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
    requestId: correlationId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Sends an error response.
 */
function sendError(res: Response, error: IdentityError, correlationId: string): void {
  res.status(error.statusCode).json({
    success: false,
    error: error.toJSON(),
    requestId: correlationId,
    timestamp: new Date().toISOString(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PARAM SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const userIdParamSchema = z.object({
  userId: uuidSchema,
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /users/me
 * Get the current user's profile.
 * Auto-creates user from gateway auth info if they don't exist (for Supabase-authenticated users).
 */
router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;

  try {
    // Get email and role from gateway-forwarded headers for auto-creation
    const gatewayEmail = req.headers['x-user-email'] as string | undefined;
    const gatewayRole = req.headers['x-user-role'] as string | undefined;

    // Use getOrCreateUserFromGateway which will auto-create if needed
    let userWithProfile;
    if (gatewayEmail) {
      // User came through gateway with auth info - use auto-create
      userWithProfile = await getOrCreateUserFromGateway(
        authReq.identity.sub,
        gatewayEmail,
        gatewayRole || authReq.identity.role
      );
    } else {
      // Direct call without gateway headers - try to get existing user
      userWithProfile = await getUserWithProfile(authReq.identity.sub);
      if (!userWithProfile) {
        throw new UserNotFoundError(authReq.identity.sub);
      }
    }

    sendSuccess(
      res,
      {
        id: userWithProfile.id,
        email: userWithProfile.email,
        firstName: userWithProfile.firstName,
        lastName: userWithProfile.lastName,
        photoUrl: userWithProfile.photoUrl,
        role: userWithProfile.role,
        status: userWithProfile.status,
        emailVerifiedAt: userWithProfile.emailVerifiedAt?.toISOString() ?? null,
        createdAt: userWithProfile.createdAt.toISOString(),
        agentProfile: userWithProfile.agentProfile
          ? {
              verificationStatus: userWithProfile.agentProfile.verificationStatus,
              verificationSubmittedAt:
                userWithProfile.agentProfile.verificationSubmittedAt?.toISOString() ?? null,
              verificationCompletedAt:
                userWithProfile.agentProfile.verificationCompletedAt?.toISOString() ?? null,
              businessName: userWithProfile.agentProfile.businessName,
              bio: userWithProfile.agentProfile.bio,
              specialties: userWithProfile.agentProfile.specialties,
            }
          : null,
      },
      authReq.correlationId
    );
  } catch (error) {
    if (error instanceof IdentityError) {
      sendError(res, error, authReq.correlationId);
      return;
    }
    throw error;
  }
});

/**
 * PATCH /users/me
 * Update the current user's profile.
 */
router.patch(
  '/me',
  requireAuth,
  blockSuspended,
  validateBody(updateUserProfileRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const body = req.body as z.infer<typeof updateUserProfileRequestSchema>;

    try {
      const eventContext = createEventContext(req);
      const user = await updateUserProfile(authReq.identity.sub, body, eventContext);

      sendSuccess(
        res,
        {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          photoUrl: user.photoUrl,
          role: user.role,
          status: user.status,
        },
        authReq.correlationId
      );
    } catch (error) {
      if (error instanceof IdentityError) {
        sendError(res, error, authReq.correlationId);
        return;
      }
      throw error;
    }
  }
);

/**
 * GET /users/:userId
 * Get a user by ID. Accessible to:
 * - The user themselves (owner)
 * - Admins
 * - Agents (can view client profiles for matched requests)
 * - Users (can view agent profiles for proposals/bookings)
 */
router.get(
  '/:userId',
  requireAuth,
  validateParams(userIdParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { userId } = req.params as z.infer<typeof userIdParamSchema>;

    // Allow: owner, admin, or agent (agents can view client profiles for matched requests)
    const isOwner = authReq.identity.sub === userId;
    const isAdmin = authReq.identity.role === 'admin';
    const isAgent = authReq.identity.role === 'agent';
    const isUser = authReq.identity.role === 'user';

    // First check basic permissions
    if (!isOwner && !isAdmin && !isAgent && !isUser) {
      res.status(403).json({
        success: false,
        error: {
          code: 'IDENTITY_INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to view this user',
        },
        requestId: authReq.correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      const user = await getUserById(userId);

      if (!user) {
        throw new UserNotFoundError(userId);
      }

      // Users can only view agent profiles, not other users
      if (isUser && !isOwner && user.role !== 'agent') {
        res.status(403).json({
          success: false,
          error: {
            code: 'IDENTITY_INSUFFICIENT_PERMISSIONS',
            message: 'Users can only view agent profiles',
          },
          requestId: authReq.correlationId,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      sendSuccess(
        res,
        {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          photoUrl: user.photoUrl,
          role: user.role,
          status: user.status,
          emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
          createdAt: user.createdAt.toISOString(),
        },
        authReq.correlationId
      );
    } catch (error) {
      if (error instanceof IdentityError) {
        sendError(res, error, authReq.correlationId);
        return;
      }
      throw error;
    }
  }
);

/**
 * GET /users/:userId/settings
 * Get user settings. Only accessible to the user themselves or admins.
 */
router.get(
  '/:userId/settings',
  requireAuth,
  validateParams(userIdParamSchema),
  requireOwnership('userId'),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { userId } = req.params as z.infer<typeof userIdParamSchema>;

    try {
      const settings = await getUserSettings(userId);

      sendSuccess(res, settings, authReq.correlationId);
    } catch (error) {
      if (error instanceof IdentityError) {
        sendError(res, error, authReq.correlationId);
        return;
      }
      throw error;
    }
  }
);

/**
 * PUT /users/:userId/settings
 * Update user settings. Only accessible to the user themselves.
 */
router.put(
  '/:userId/settings',
  requireAuth,
  blockSuspended,
  validateParams(userIdParamSchema),
  requireOwnership('userId'),
  validateBody(userSettingsSchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { userId } = req.params as z.infer<typeof userIdParamSchema>;
    const body = req.body as z.infer<typeof userSettingsSchema>;

    try {
      const settings = await updateUserSettings(userId, body);

      sendSuccess(res, settings, authReq.correlationId);
    } catch (error) {
      if (error instanceof IdentityError) {
        sendError(res, error, authReq.correlationId);
        return;
      }
      throw error;
    }
  }
);

export { router as userRouter };
