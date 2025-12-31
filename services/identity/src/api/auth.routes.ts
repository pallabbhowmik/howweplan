/**
 * Authentication API routes.
 * Handles login, registration, token refresh, and logout.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  AuthenticatedRequest,
  requireAuth,
  blockSuspended,
  validateBody,
  strictRateLimit,
} from '../middleware/index.js';
import {
  registerUser,
  authenticateUser,
  changePassword,
  getUserWithProfile,
} from '../services/user.service.js';
import {
  verifyRefreshToken,
  createTokenPair,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
} from '../services/token.service.js';
import { EventFactory, EventContext } from '../events/index.js';
import { IdentityError } from '../services/errors.js';
import {
  loginRequestSchema,
  registerRequestSchema,
  refreshTokenRequestSchema,
  changePasswordRequestSchema,
} from '../types/api.schemas.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates an event context from the request.
 */
function createEventContext(req: Request, actorId: string | null = null): EventContext {
  const authReq = req as AuthenticatedRequest;
  return {
    correlationId: authReq.correlationId ?? 'unknown',
    actorId: actorId ?? authReq.identity?.sub ?? null,
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
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /auth/register
 * Register a new user account.
 */
router.post(
  '/register',
  strictRateLimit(5, 60000), // 5 registrations per minute
  validateBody(registerRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const body = req.body as z.infer<typeof registerRequestSchema>;

    try {
      const eventContext = createEventContext(req);
      const result = await registerUser(
        body.email,
        body.password,
        body.firstName,
        body.lastName,
        body.role,
        eventContext
      );

      sendSuccess(
        res,
        {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
          tokenType: 'Bearer' as const,
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            role: result.user.role,
            status: result.user.status,
          },
        },
        authReq.correlationId,
        201
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
 * POST /auth/login
 * Authenticate with email and password.
 */
router.post(
  '/login',
  strictRateLimit(10, 60000), // 10 login attempts per minute
  validateBody(loginRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const body = req.body as z.infer<typeof loginRequestSchema>;

    try {
      const eventContext = createEventContext(req);
      const result = await authenticateUser(
        body.email,
        body.password,
        authReq.clientIp ?? 'unknown',
        req.headers['user-agent'] ?? 'unknown',
        eventContext
      );

      sendSuccess(
        res,
        {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
          tokenType: 'Bearer' as const,
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            role: result.user.role,
            status: result.user.status,
          },
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
 * POST /auth/refresh
 * Refresh an access token using a refresh token.
 */
router.post(
  '/refresh',
  strictRateLimit(20, 60000), // 20 refreshes per minute
  validateBody(refreshTokenRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const body = req.body as z.infer<typeof refreshTokenRequestSchema>;

    try {
      // Verify the refresh token
      const { userId, tokenHash } = await verifyRefreshToken(body.refreshToken);

      // Get current user data for the new token
      const userWithProfile = await getUserWithProfile(userId);
      if (!userWithProfile) {
        throw new Error('User not found');
      }

      // Revoke the old refresh token (rotation)
      await revokeRefreshToken(tokenHash);

      // Create new tokens
      const tokens = await createTokenPair(
        userWithProfile.id,
        userWithProfile.role,
        userWithProfile.status,
        userWithProfile.agentProfile?.verificationStatus ?? null
      );

      // Emit token refreshed event
      const eventContext = createEventContext(req, userId);
      await EventFactory.tokenRefreshed({ userId }, eventContext);

      sendSuccess(
        res,
        {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          tokenType: 'Bearer' as const,
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
 * POST /auth/logout
 * Logout and revoke the current refresh token.
 */
router.post('/logout', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;

  try {
    // Revoke all refresh tokens for the user
    await revokeAllUserRefreshTokens(authReq.identity.sub);

    // Emit logout event
    const eventContext = createEventContext(req);
    await EventFactory.userLoggedOut({ userId: authReq.identity.sub }, eventContext);

    sendSuccess(res, { message: 'Logged out successfully' }, authReq.correlationId);
  } catch (error) {
    if (error instanceof IdentityError) {
      sendError(res, error, authReq.correlationId);
      return;
    }
    throw error;
  }
});

/**
 * POST /auth/change-password
 * Change the current user's password.
 */
router.post(
  '/change-password',
  requireAuth,
  blockSuspended,
  validateBody(changePasswordRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const body = req.body as z.infer<typeof changePasswordRequestSchema>;

    try {
      const eventContext = createEventContext(req);
      await changePassword(
        authReq.identity.sub,
        body.currentPassword,
        body.newPassword,
        eventContext
      );

      sendSuccess(res, { message: 'Password changed successfully' }, authReq.correlationId);
    } catch (error) {
      if (error instanceof IdentityError) {
        sendError(res, error, authReq.correlationId);
        return;
      }
      throw error;
    }
  }
);

export { router as authRouter };
