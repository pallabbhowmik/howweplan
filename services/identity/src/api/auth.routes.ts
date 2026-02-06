/**
 * Authentication API routes.
 * Handles login, registration, token refresh, and logout.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createPublicKey } from 'crypto';
import { env } from '../env.js';
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
import { UserRole } from '../types/identity.types.js';
import {
  loginRequestSchema,
  registerRequestSchema,
  refreshTokenRequestSchema,
  changePasswordRequestSchema,
  forgotPasswordRequestSchema,
  resetPasswordRequestSchema,
  verifyEmailRequestSchema,
  resendVerificationRequestSchema,
} from '../types/api.schemas.js';
import {
  createPasswordResetToken,
  verifyPasswordResetToken,
  createEmailVerificationToken,
  verifyToken,
  VerificationType,
} from '../services/verification.service.js';
import { getDbClient } from '../services/database.js';
import { hashPassword } from '../services/password.service.js';

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
function sendError(res: Response, error: IdentityError | Error, correlationId: string): void {
  const statusCode = error instanceof IdentityError ? error.statusCode : 500;
  const errorData =
    error instanceof IdentityError
      ? error.toJSON()
      : { code: 'INTERNAL_ERROR', message: error.message };

  res.status(statusCode).json({
    success: false,
    error: errorData,
    requestId: correlationId,
    timestamp: new Date().toISOString(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /auth/public-key
 * Public endpoint for services (like the API Gateway) to fetch the RS256 public key.
 * Safe to expose: this is a public verification key, not a private signing key.
 */
router.get('/public-key', async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const correlationId = authReq.correlationId ?? 'unknown';

  // Only relevant for RS256. If HS256 is used, there is no public key.
  if (env.JWT_ALGORITHM !== 'RS256') {
    res.status(404).json({
      success: false,
      error: {
        code: 'PUBLIC_KEY_NOT_AVAILABLE',
        message: 'Public key not available',
      },
      requestId: correlationId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Prefer explicit public key; otherwise derive from the configured private key.
  // This avoids needing to configure both keys in every environment.
  let publicKeyPem = env.JWT_PUBLIC_KEY;
  if (!publicKeyPem && env.JWT_PRIVATE_KEY) {
    try {
      publicKeyPem = createPublicKey(env.JWT_PRIVATE_KEY).export({ format: 'pem', type: 'spki' }) as string;
    } catch {
      // Ignore derivation errors; we'll return a 404 below.
    }
  }

  if (!publicKeyPem) {
    res.status(404).json({
      success: false,
      error: {
        code: 'PUBLIC_KEY_NOT_AVAILABLE',
        message: 'Public key not available',
      },
      requestId: correlationId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  sendSuccess(
    res,
    {
      algorithm: env.JWT_ALGORITHM,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      publicKey: publicKeyPem,
    },
    correlationId
  );
});

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
      sendError(res, error instanceof Error ? error : new Error(String(error)), authReq.correlationId);
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
      sendError(res, error instanceof Error ? error : new Error(String(error)), authReq.correlationId);
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
        userWithProfile.email,
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
      sendError(res, error instanceof Error ? error : new Error(String(error)), authReq.correlationId);
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
    sendError(res, error instanceof Error ? error : new Error(String(error)), authReq.correlationId);
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
      sendError(res, error instanceof Error ? error : new Error(String(error)), authReq.correlationId);
    }
  }
);

/**
 * POST /auth/forgot-password
 * Request a password reset email.
 */
router.post(
  '/forgot-password',
  strictRateLimit(3, 60000), // 3 requests per minute
  validateBody(forgotPasswordRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const body = req.body as z.infer<typeof forgotPasswordRequestSchema>;

    try {
      const db = getDbClient();

      // Find user by email
      const { data: user, error } = await db
        .from('users')
        .select('id, email, first_name, status')
        .eq('email', body.email.toLowerCase())
        .single();

      // Always return success to prevent email enumeration
      if (error || !user || user.status === 'DEACTIVATED') {
        sendSuccess(
          res,
          { message: 'If an account exists with this email, you will receive a password reset link.' },
          authReq.correlationId
        );
        return;
      }

      // Create password reset token
      const { token, expiresAt } = await createPasswordResetToken(user.id, user.email);

      // Emit event to trigger email
      const eventContext = createEventContext(req);
      await EventFactory.passwordResetRequested(
        {
          userId: user.id,
          email: user.email,
          firstName: user.first_name,
          resetToken: token,
          expiresAt: expiresAt.toISOString(),
        },
        eventContext
      );

      sendSuccess(
        res,
        { message: 'If an account exists with this email, you will receive a password reset link.' },
        authReq.correlationId
      );
    } catch (error) {
      if (error instanceof IdentityError) {
        sendError(res, error, authReq.correlationId);
        return;
      }
      // Log but don't expose internal errors
      console.error('Forgot password error:', error);
      sendSuccess(
        res,
        { message: 'If an account exists with this email, you will receive a password reset link.' },
        authReq.correlationId
      );
    }
  }
);

/**
 * POST /auth/reset-password
 * Reset password using a token from the email.
 */
router.post(
  '/reset-password',
  strictRateLimit(5, 60000), // 5 attempts per minute
  validateBody(resetPasswordRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const body = req.body as z.infer<typeof resetPasswordRequestSchema>;

    try {
      // Verify token
      const result = await verifyPasswordResetToken(body.token);

      if (!result.valid || !result.userId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: result.error || 'This password reset link is invalid or has expired.',
          },
          requestId: authReq.correlationId,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Hash new password
      const passwordHash = await hashPassword(body.newPassword);

      // Update user's password
      const db = getDbClient();
      const { error } = await db
        .from('users')
        .update({
          password_hash: passwordHash,
          updated_at: new Date().toISOString(),
        })
        .eq('id', result.userId);

      if (error) {
        throw new Error(`Failed to update password: ${error.message}`);
      }

      // Revoke all refresh tokens for security
      await revokeAllUserRefreshTokens(result.userId);

      // Emit password changed event
      const eventContext = createEventContext(req, result.userId);
      await EventFactory.passwordChanged(
        {
          userId: result.userId,
          initiatedBy: 'USER',
        },
        eventContext
      );

      sendSuccess(res, { message: 'Password has been reset successfully. Please log in with your new password.' }, authReq.correlationId);
    } catch (error) {
      sendError(res, error instanceof Error ? error : new Error(String(error)), authReq.correlationId);
    }
  }
);

/**
 * POST /auth/verify-email
 * Verify email address using a token from the email.
 */
router.post(
  '/verify-email',
  strictRateLimit(10, 60000), // 10 attempts per minute
  validateBody(verifyEmailRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const body = req.body as z.infer<typeof verifyEmailRequestSchema>;

    try {
      // Verify token
      const result = await verifyToken(body.token, VerificationType.EMAIL);

      if (!result.valid || !result.userId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'This verification link is invalid or has expired.',
          },
          requestId: authReq.correlationId,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Update user's email_verified status
      const db = getDbClient();
      const { data: user, error } = await db
        .from('users')
        .update({
          email_verified_at: new Date().toISOString(),
          status: 'ACTIVE', // Activate account upon email verification
          updated_at: new Date().toISOString(),
        })
        .eq('id', result.userId)
        .select('id, email, first_name')
        .single();

      if (error || !user) {
        throw new Error(`Failed to verify email: ${error?.message || 'User not found'}`);
      }

      // Emit email verified event
      const eventContext = createEventContext(req, result.userId);
      await EventFactory.emailVerified(
        {
          userId: user.id,
          email: user.email,
          firstName: user.first_name,
        },
        eventContext
      );

      sendSuccess(res, { message: 'Email verified successfully.' }, authReq.correlationId);
    } catch (error) {
      sendError(res, error instanceof Error ? error : new Error(String(error)), authReq.correlationId);
    }
  }
);

/**
 * POST /auth/resend-verification
 * Resend the email verification link.
 */
router.post(
  '/resend-verification',
  strictRateLimit(2, 60000), // 2 requests per minute
  validateBody(resendVerificationRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const body = req.body as z.infer<typeof resendVerificationRequestSchema>;

    try {
      const db = getDbClient();

      // Find user by email
      const { data: user, error } = await db
        .from('users')
        .select('id, email, first_name, email_verified_at, status')
        .eq('email', body.email.toLowerCase())
        .single();

      // Always return success to prevent email enumeration
      if (error || !user || user.status === 'DEACTIVATED') {
        sendSuccess(
          res,
          { message: 'If an account exists with this email and is not verified, you will receive a verification link.' },
          authReq.correlationId
        );
        return;
      }

      // If already verified, return success but don't send email
      if (user.email_verified_at) {
        sendSuccess(
          res,
          { message: 'If an account exists with this email and is not verified, you will receive a verification link.' },
          authReq.correlationId
        );
        return;
      }

      // Create new verification token
      const { token } = await createEmailVerificationToken(user.id, user.email);

      // Emit event to trigger email (reuse userRegistered event for verification email)
      const eventContext = createEventContext(req);
      await EventFactory.userRegistered(
        {
          userId: user.id,
          email: user.email,
          role: UserRole.USER, // Doesn't matter for verification email
          firstName: user.first_name,
          verificationToken: token,
        },
        eventContext
      );

      sendSuccess(
        res,
        { message: 'If an account exists with this email and is not verified, you will receive a verification link.' },
        authReq.correlationId
      );
    } catch (error) {
      // Handle rate limiting from verification service
      if (error instanceof Error && error.message.includes('wait')) {
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: error.message,
          },
          requestId: authReq.correlationId,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (error instanceof IdentityError) {
        sendError(res, error, authReq.correlationId);
        return;
      }
      // Log but don't expose internal errors
      console.error('Resend verification error:', error);
      sendSuccess(
        res,
        { message: 'If an account exists with this email and is not verified, you will receive a verification link.' },
        authReq.correlationId
      );
    }
  }
);

export { router as authRouter };
