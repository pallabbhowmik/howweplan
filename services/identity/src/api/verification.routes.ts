/**
 * Agent Verification API Routes
 *
 * Handles the multi-tier agent verification system:
 * - Tier 1: SMS OTP, Bank Verification, WhatsApp
 * - Tier 2: Video KYC, Email Reputation
 * - Tier 3: Call Masking, Payout Hold configuration
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  AuthenticatedRequest,
  requireAuth,
  blockSuspended,
  requireAgent,
  requireAdmin,
  validateBody,
  validateParams,
} from '../middleware/index.js';
import {
  sendPhoneOTP,
  verifyPhoneOTP,
  verifyBankAccount,
  submitWhatsAppScreenshot,
  approveWhatsAppVerification,
  checkVideoKYCRequired,
  initiateVideoKYC,
  processVideoKYCCallback,
  checkEmailReputation,
  getVerificationSummary,
  createCallMaskingSession,
  getPayoutHoldHours,
} from '../services/verification-tier.service.js';
import { EventContext } from '../events/index.js';
import { IdentityError } from '../services/errors.js';
import { VideoKYCTrigger } from '../types/verification.types.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function createEventContext(req: Request): EventContext {
  const authReq = req as AuthenticatedRequest;
  return {
    correlationId: authReq.correlationId ?? 'unknown',
    actorId: authReq.identity?.sub ?? null,
    actorRole: authReq.identity?.role ?? 'SYSTEM',
  };
}

function sendSuccess<T>(res: Response, data: T, correlationId: string, statusCode = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
    requestId: correlationId,
    timestamp: new Date().toISOString(),
  });
}

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
// SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const sendPhoneOTPSchema = z.object({
  phoneNumber: z.string().min(10).max(15),
  countryCode: z.string().regex(/^\+\d{1,3}$/),
});

const verifyPhoneOTPSchema = z.object({
  otp: z.string().length(6),
});

const verifyBankAccountSchema = z.object({
  accountHolderName: z.string().min(2).max(200),
  accountNumber: z.string().min(8).max(20),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/),
  bankName: z.string().optional(),
  branchName: z.string().optional(),
});

const submitWhatsAppSchema = z.object({
  phoneNumber: z.string().min(10).max(15),
  businessName: z.string().min(2).max(200),
  screenshotUrl: z.string().url(),
});

const initiateVideoKYCSchema = z.object({
  trigger: z.enum([
    'HIGH_VALUE_BOOKING',
    'DISPUTE_THRESHOLD',
    'NAME_MISMATCH',
    'FRAUD_SIGNAL',
    'ADMIN_TRIGGERED',
    'SELF_UPGRADE',
  ]),
});

const videoKYCCallbackSchema = z.object({
  sessionId: z.string(),
  status: z.enum(['completed', 'failed', 'expired']),
  aadhaarVerified: z.boolean().optional(),
  panVerified: z.boolean().optional(),
  faceMatchScore: z.number().min(0).max(100).optional(),
  livenessScore: z.number().min(0).max(100).optional(),
});

const createCallMaskingSchema = z.object({
  bookingId: z.string().uuid(),
  userId: z.string().uuid(),
  agentId: z.string().uuid(),
  userPhone: z.string().min(10).max(15),
  agentPhone: z.string().min(10).max(15),
});

const agentIdParamSchema = z.object({
  agentId: z.string().uuid(),
});

// ─────────────────────────────────────────────────────────────────────────────
// TIER 1: PHONE VERIFICATION ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /verification/phone/send-otp
 * Send OTP to agent's phone number
 */
router.post(
  '/phone/send-otp',
  requireAuth,
  requireAgent,
  blockSuspended,
  validateBody(sendPhoneOTPSchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const body = req.body as z.infer<typeof sendPhoneOTPSchema>;
    const eventContext = createEventContext(req);

    try {
      const result = await sendPhoneOTP(
        authReq.identity!.sub,
        {
          phoneNumber: body.phoneNumber,
          countryCode: body.countryCode,
        },
        eventContext
      );

      sendSuccess(res, result, authReq.correlationId);
    } catch (error) {
      sendError(
        res,
        error instanceof Error ? error : new Error('Unknown error'),
        authReq.correlationId
      );
    }
  }
);

/**
 * POST /verification/phone/verify-otp
 * Verify the OTP entered by agent
 */
router.post(
  '/phone/verify-otp',
  requireAuth,
  requireAgent,
  blockSuspended,
  validateBody(verifyPhoneOTPSchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const body = req.body as z.infer<typeof verifyPhoneOTPSchema>;
    const eventContext = createEventContext(req);

    try {
      const result = await verifyPhoneOTP(authReq.identity!.sub, body.otp, eventContext);

      sendSuccess(res, result, authReq.correlationId);
    } catch (error) {
      sendError(
        res,
        error instanceof Error ? error : new Error('Unknown error'),
        authReq.correlationId
      );
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// TIER 1: BANK ACCOUNT VERIFICATION ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /verification/bank
 * Verify agent's bank account via penny drop
 */
router.post(
  '/bank',
  requireAuth,
  requireAgent,
  blockSuspended,
  validateBody(verifyBankAccountSchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const body = req.body as z.infer<typeof verifyBankAccountSchema>;
    const eventContext = createEventContext(req);

    try {
      const result = await verifyBankAccount(authReq.identity!.sub, body, eventContext);

      sendSuccess(res, result, authReq.correlationId);
    } catch (error) {
      sendError(
        res,
        error instanceof Error ? error : new Error('Unknown error'),
        authReq.correlationId
      );
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// TIER 1: WHATSAPP VERIFICATION ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /verification/whatsapp
 * Submit WhatsApp Business screenshot
 */
router.post(
  '/whatsapp',
  requireAuth,
  requireAgent,
  blockSuspended,
  validateBody(submitWhatsAppSchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const body = req.body as z.infer<typeof submitWhatsAppSchema>;
    const eventContext = createEventContext(req);

    try {
      const result = await submitWhatsAppScreenshot(
        authReq.identity!.sub,
        body.phoneNumber,
        body.businessName,
        body.screenshotUrl,
        eventContext
      );

      sendSuccess(res, result, authReq.correlationId, 201);
    } catch (error) {
      sendError(
        res,
        error instanceof Error ? error : new Error('Unknown error'),
        authReq.correlationId
      );
    }
  }
);

/**
 * POST /verification/whatsapp/:agentId/approve
 * Admin: Approve WhatsApp verification
 */
router.post(
  '/whatsapp/:agentId/approve',
  requireAuth,
  requireAdmin,
  validateParams(agentIdParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { agentId } = req.params as z.infer<typeof agentIdParamSchema>;
    const eventContext = createEventContext(req);

    try {
      await approveWhatsAppVerification(agentId, authReq.identity!.sub, eventContext);

      sendSuccess(res, { message: 'WhatsApp verification approved' }, authReq.correlationId);
    } catch (error) {
      sendError(
        res,
        error instanceof Error ? error : new Error('Unknown error'),
        authReq.correlationId
      );
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// TIER 2: VIDEO KYC ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /verification/video-kyc/check
 * Check if Video KYC is required for agent
 */
router.get(
  '/video-kyc/check',
  requireAuth,
  requireAgent,
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    try {
      const bookingValue = req.query.bookingValue
        ? parseInt(req.query.bookingValue as string, 10)
        : undefined;

      const result = await checkVideoKYCRequired(authReq.identity!.sub, {
        bookingValueCents: bookingValue,
      });

      sendSuccess(res, result, authReq.correlationId);
    } catch (error) {
      sendError(
        res,
        error instanceof Error ? error : new Error('Unknown error'),
        authReq.correlationId
      );
    }
  }
);

/**
 * POST /verification/video-kyc/initiate
 * Initiate Video KYC session
 */
router.post(
  '/video-kyc/initiate',
  requireAuth,
  requireAgent,
  blockSuspended,
  validateBody(initiateVideoKYCSchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const body = req.body as z.infer<typeof initiateVideoKYCSchema>;
    const eventContext = createEventContext(req);

    try {
      const result = await initiateVideoKYC(
        authReq.identity!.sub,
        body.trigger as VideoKYCTrigger,
        eventContext
      );

      sendSuccess(res, result, authReq.correlationId, 201);
    } catch (error) {
      sendError(
        res,
        error instanceof Error ? error : new Error('Unknown error'),
        authReq.correlationId
      );
    }
  }
);

/**
 * POST /verification/video-kyc/callback
 * Webhook callback from Video KYC provider
 */
router.post(
  '/video-kyc/callback',
  validateBody(videoKYCCallbackSchema),
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as z.infer<typeof videoKYCCallbackSchema>;

    try {
      await processVideoKYCCallback(
        body.sessionId,
        {
          status: body.status,
          aadhaarVerified: body.aadhaarVerified,
          panVerified: body.panVerified,
          faceMatchScore: body.faceMatchScore,
          livenessScore: body.livenessScore,
        },
        {
          correlationId: 'webhook',
          actorId: null,
          actorRole: 'SYSTEM',
        }
      );

      res.status(200).json({ received: true });
    } catch (error) {
      res.status(500).json({ error: 'Processing failed' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// TIER 2: EMAIL REPUTATION ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /verification/email/check
 * Check email reputation
 */
router.post(
  '/email/check',
  requireAuth,
  requireAgent,
  validateBody(z.object({ email: z.string().email() })),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const eventContext = createEventContext(req);
    const { email } = req.body as { email: string };

    try {
      const result = await checkEmailReputation(
        authReq.identity!.sub,
        email,
        eventContext
      );

      sendSuccess(res, result, authReq.correlationId);
    } catch (error) {
      sendError(
        res,
        error instanceof Error ? error : new Error('Unknown error'),
        authReq.correlationId
      );
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// TIER 3: CALL MASKING ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /verification/call-masking
 * Create call masking session for a booking
 * (Called by booking service)
 */
router.post(
  '/call-masking',
  requireAuth,
  validateBody(createCallMaskingSchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const body = req.body as z.infer<typeof createCallMaskingSchema>;

    try {
      const result = await createCallMaskingSession(
        body.bookingId,
        body.userId,
        body.agentId,
        body.userPhone,
        body.agentPhone
      );

      sendSuccess(res, result, authReq.correlationId, 201);
    } catch (error) {
      sendError(
        res,
        error instanceof Error ? error : new Error('Unknown error'),
        authReq.correlationId
      );
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /verification/summary
 * Get comprehensive verification status for agent
 */
router.get(
  '/summary',
  requireAuth,
  requireAgent,
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    try {
      const summary = await getVerificationSummary(authReq.identity!.sub);

      sendSuccess(res, summary, authReq.correlationId);
    } catch (error) {
      sendError(
        res,
        error instanceof Error ? error : new Error('Unknown error'),
        authReq.correlationId
      );
    }
  }
);

/**
 * GET /verification/payout-hold
 * Get current payout hold hours for agent
 */
router.get(
  '/payout-hold',
  requireAuth,
  requireAgent,
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    try {
      const holdHours = await getPayoutHoldHours(authReq.identity!.sub);

      sendSuccess(res, { holdHours }, authReq.correlationId);
    } catch (error) {
      sendError(
        res,
        error instanceof Error ? error : new Error('Unknown error'),
        authReq.correlationId
      );
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /verification/:agentId/summary
 * Admin: Get verification summary for any agent
 */
router.get(
  '/:agentId/summary',
  requireAuth,
  requireAdmin,
  validateParams(agentIdParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { agentId } = req.params as z.infer<typeof agentIdParamSchema>;

    try {
      const summary = await getVerificationSummary(agentId);

      sendSuccess(res, summary, authReq.correlationId);
    } catch (error) {
      sendError(
        res,
        error instanceof Error ? error : new Error('Unknown error'),
        authReq.correlationId
      );
    }
  }
);

/**
 * POST /verification/:agentId/video-kyc/trigger
 * Admin: Trigger Video KYC for an agent
 */
router.post(
  '/:agentId/video-kyc/trigger',
  requireAuth,
  requireAdmin,
  validateParams(agentIdParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { agentId } = req.params as z.infer<typeof agentIdParamSchema>;
    const eventContext = createEventContext(req);

    try {
      const result = await initiateVideoKYC(
        agentId,
        VideoKYCTrigger.ADMIN_TRIGGERED,
        eventContext
      );

      sendSuccess(res, result, authReq.correlationId, 201);
    } catch (error) {
      sendError(
        res,
        error instanceof Error ? error : new Error('Unknown error'),
        authReq.correlationId
      );
    }
  }
);

export { router as verificationRouter };
