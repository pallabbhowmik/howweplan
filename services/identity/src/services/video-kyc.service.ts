/**
 * Video KYC Verification Service
 *
 * Provides enhanced identity verification via video-based KYC.
 * Triggered conditionally for high-risk cases.
 *
 * Triggers:
 * - High-value bookings (>₹1,00,000)
 * - Multiple disputes (>=2)
 * - Bank name mismatch
 * - Fraud signals
 * - Admin-triggered
 * - Agent self-upgrade request
 *
 * Supports providers: Signzy, IDfy, HyperVerge, Digio
 * Cost: ₹40-120 per verification
 *
 * Flow:
 * 1. System determines Video KYC is required
 * 2. Agent receives video KYC link
 * 3. Agent completes live video verification
 * 4. Provider verifies Aadhaar/PAN, face match, liveness
 * 5. System updates verification tier
 */

import crypto from 'crypto';
import {
  VideoKYCProvider,
  VideoKYCStatus,
  VideoKYCTrigger,
  VerificationConfig,
  VerificationCosts,
  type VideoKYCVerification,
} from '../types/verification.types.js';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

interface VideoKYCProviderConfig {
  signzy?: {
    apiKey: string;
    apiUrl: string;
    callbackUrl: string;
  };
  idfy?: {
    apiKey: string;
    accountId: string;
    apiUrl: string;
    callbackUrl: string;
  };
  hyperverge?: {
    appId: string;
    appKey: string;
    apiUrl: string;
    callbackUrl: string;
  };
  digio?: {
    clientId: string;
    clientSecret: string;
    apiUrl: string;
    callbackUrl: string;
  };
}

const getProviderConfig = (): VideoKYCProviderConfig => ({
  signzy: process.env.SIGNZY_VIDEO_API_KEY
    ? {
        apiKey: process.env.SIGNZY_VIDEO_API_KEY,
        apiUrl: process.env.SIGNZY_VIDEO_API_URL ?? 'https://signzy.tech',
        callbackUrl: process.env.SIGNZY_CALLBACK_URL ?? '',
      }
    : undefined,
  idfy: process.env.IDFY_API_KEY
    ? {
        apiKey: process.env.IDFY_API_KEY,
        accountId: process.env.IDFY_ACCOUNT_ID!,
        apiUrl: process.env.IDFY_API_URL ?? 'https://eve.idfy.com',
        callbackUrl: process.env.IDFY_CALLBACK_URL ?? '',
      }
    : undefined,
  hyperverge: process.env.HYPERVERGE_APP_ID
    ? {
        appId: process.env.HYPERVERGE_APP_ID,
        appKey: process.env.HYPERVERGE_APP_KEY!,
        apiUrl: process.env.HYPERVERGE_API_URL ?? 'https://ind.hyperverge.co',
        callbackUrl: process.env.HYPERVERGE_CALLBACK_URL ?? '',
      }
    : undefined,
  digio: process.env.DIGIO_CLIENT_ID
    ? {
        clientId: process.env.DIGIO_CLIENT_ID,
        clientSecret: process.env.DIGIO_CLIENT_SECRET!,
        apiUrl: process.env.DIGIO_API_URL ?? 'https://api.digio.in',
        callbackUrl: process.env.DIGIO_CALLBACK_URL ?? '',
      }
    : undefined,
});

const getPreferredProvider = (): VideoKYCProvider => {
  const config = getProviderConfig();
  // Priority: HyperVerge (cheapest) > IDfy > Signzy > Digio
  if (config.hyperverge) return VideoKYCProvider.HYPERVERGE;
  if (config.idfy) return VideoKYCProvider.IDFY;
  if (config.signzy) return VideoKYCProvider.SIGNZY;
  if (config.digio) return VideoKYCProvider.DIGIO;
  throw new Error('No Video KYC provider configured');
};

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER EVALUATION
// ─────────────────────────────────────────────────────────────────────────────

interface TriggerContext {
  bookingValueCents?: number;
  disputeCount?: number;
  hasBankNameMismatch?: boolean;
  hasFraudSignal?: boolean;
  isAdminTriggered?: boolean;
  isSelfUpgrade?: boolean;
}

/**
 * Determine if Video KYC should be triggered
 */
function evaluateTrigger(context: TriggerContext): VideoKYCTrigger | null {
  // Priority order for triggers
  if (context.hasFraudSignal) {
    return VideoKYCTrigger.FRAUD_SIGNAL;
  }
  if (context.isAdminTriggered) {
    return VideoKYCTrigger.ADMIN_TRIGGERED;
  }
  if (context.disputeCount && context.disputeCount >= VerificationConfig.videoKycDisputeThreshold) {
    return VideoKYCTrigger.DISPUTE_THRESHOLD;
  }
  if (context.hasBankNameMismatch) {
    return VideoKYCTrigger.NAME_MISMATCH;
  }
  if (
    context.bookingValueCents &&
    context.bookingValueCents >= VerificationConfig.videoKycBookingThreshold * 100
  ) {
    return VideoKYCTrigger.HIGH_VALUE_BOOKING;
  }
  if (context.isSelfUpgrade) {
    return VideoKYCTrigger.SELF_UPGRADE;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER IMPLEMENTATIONS
// ─────────────────────────────────────────────────────────────────────────────

interface CreateSessionResult {
  success: boolean;
  sessionId: string | null;
  sessionUrl: string | null;
  expiresAt: Date | null;
  error?: string;
}

/**
 * Create session via Signzy
 */
async function createSignzySession(
  userId: string,
  config: NonNullable<VideoKYCProviderConfig['signzy']>
): Promise<CreateSessionResult> {
  try {
    const response = await fetch(`${config.apiUrl}/api/v2/patrons/videokyc/session`, {
      method: 'POST',
      headers: {
        Authorization: config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId: userId,
        callbackUrl: config.callbackUrl,
        verifyAadhaar: true,
        verifyPan: true,
        livenessCheck: true,
      }),
    });

    const data = (await response.json()) as {
      result?: {
        sessionId?: string;
        url?: string;
        expiresAt?: string;
      };
      error?: { message: string };
    };

    if (!data.result?.sessionId) {
      return {
        success: false,
        sessionId: null,
        sessionUrl: null,
        expiresAt: null,
        error: data.error?.message ?? 'Session creation failed',
      };
    }

    return {
      success: true,
      sessionId: data.result.sessionId,
      sessionUrl: data.result.url ?? null,
      expiresAt: data.result.expiresAt ? new Date(data.result.expiresAt) : null,
    };
  } catch (error) {
    console.error('Signzy session creation failed', error);
    return {
      success: false,
      sessionId: null,
      sessionUrl: null,
      expiresAt: null,
      error: String(error),
    };
  }
}

/**
 * Create session via IDfy
 */
async function createIdfySession(
  userId: string,
  config: NonNullable<VideoKYCProviderConfig['idfy']>
): Promise<CreateSessionResult> {
  try {
    const response = await fetch(`${config.apiUrl}/v3/tasks/async/verify_with_source/video_kyc`, {
      method: 'POST',
      headers: {
        'api-key': config.apiKey,
        'account-id': config.accountId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task_id: `vkyc_${userId}_${Date.now()}`,
        group_id: 'video_kyc',
        data: {
          customer_id: userId,
          callback_url: config.callbackUrl,
          document_types: ['aadhaar', 'pan'],
        },
      }),
    });

    const data = (await response.json()) as {
      request_id?: string;
      link?: string;
      error?: { message: string };
    };

    if (!data.request_id) {
      return {
        success: false,
        sessionId: null,
        sessionUrl: null,
        expiresAt: null,
        error: data.error?.message ?? 'Session creation failed',
      };
    }

    // IDfy links typically expire in 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    return {
      success: true,
      sessionId: data.request_id,
      sessionUrl: data.link ?? null,
      expiresAt,
    };
  } catch (error) {
    console.error('IDfy session creation failed', error);
    return {
      success: false,
      sessionId: null,
      sessionUrl: null,
      expiresAt: null,
      error: String(error),
    };
  }
}

/**
 * Create session via HyperVerge
 */
async function createHyperVergeSession(
  userId: string,
  config: NonNullable<VideoKYCProviderConfig['hyperverge']>
): Promise<CreateSessionResult> {
  try {
    const response = await fetch(`${config.apiUrl}/v1/link/start`, {
      method: 'POST',
      headers: {
        appId: config.appId,
        appKey: config.appKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transactionId: `hv_${userId}_${Date.now()}`,
        workflowId: 'video_kyc_workflow',
        redirectUrl: config.callbackUrl,
        inputs: {
          customerId: userId,
        },
      }),
    });

    const data = (await response.json()) as {
      status?: string;
      result?: {
        startKycUrl?: string;
        transactionId?: string;
        expiry?: string;
      };
      error?: string;
    };

    if (data.status !== 'success' || !data.result) {
      return {
        success: false,
        sessionId: null,
        sessionUrl: null,
        expiresAt: null,
        error: data.error ?? 'Session creation failed',
      };
    }

    return {
      success: true,
      sessionId: data.result.transactionId ?? null,
      sessionUrl: data.result.startKycUrl ?? null,
      expiresAt: data.result.expiry ? new Date(data.result.expiry) : null,
    };
  } catch (error) {
    console.error('HyperVerge session creation failed', error);
    return {
      success: false,
      sessionId: null,
      sessionUrl: null,
      expiresAt: null,
      error: String(error),
    };
  }
}

/**
 * Create session via Digio
 */
async function createDigioSession(
  userId: string,
  config: NonNullable<VideoKYCProviderConfig['digio']>
): Promise<CreateSessionResult> {
  try {
    const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

    const response = await fetch(`${config.apiUrl}/v3/client/kyc/video/request`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_identifier: userId,
        notify_customer: false,
        redirect_url: config.callbackUrl,
        verify_aadhaar: true,
        verify_pan: true,
      }),
    });

    const data = (await response.json()) as {
      id?: string;
      kyc_url?: string;
      expire_in_days?: number;
      error?: { message: string };
    };

    if (!data.id) {
      return {
        success: false,
        sessionId: null,
        sessionUrl: null,
        expiresAt: null,
        error: data.error?.message ?? 'Session creation failed',
      };
    }

    const expiresAt = new Date(Date.now() + (data.expire_in_days ?? 7) * 24 * 60 * 60 * 1000);

    return {
      success: true,
      sessionId: data.id,
      sessionUrl: data.kyc_url ?? null,
      expiresAt,
    };
  } catch (error) {
    console.error('Digio session creation failed', error);
    return {
      success: false,
      sessionId: null,
      sessionUrl: null,
      expiresAt: null,
      error: String(error),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VIDEO KYC SERVICE
// ─────────────────────────────────────────────────────────────────────────────

class VideoKYCService {
  // In-memory store for demo - replace with database in production
  private verifications = new Map<string, VideoKYCVerification>();

  /**
   * Check if Video KYC should be triggered
   */
  shouldTriggerVideoKYC(context: TriggerContext): { required: boolean; trigger: VideoKYCTrigger | null } {
    const trigger = evaluateTrigger(context);
    return {
      required: trigger !== null,
      trigger,
    };
  }

  /**
   * Initiate Video KYC session
   */
  async initiateVideoKYC(
    userId: string,
    trigger: VideoKYCTrigger
  ): Promise<VideoKYCVerification> {
    const provider = getPreferredProvider();
    const config = getProviderConfig();

    console.log('Initiating Video KYC', { userId, provider, trigger });

    // Create session via provider
    let result: CreateSessionResult;
    let costCents: number;

    switch (provider) {
      case VideoKYCProvider.SIGNZY:
        result = await createSignzySession(userId, config.signzy!);
        costCents = VerificationCosts.videoKyc.signzy;
        break;
      case VideoKYCProvider.IDFY:
        result = await createIdfySession(userId, config.idfy!);
        costCents = VerificationCosts.videoKyc.idfy;
        break;
      case VideoKYCProvider.HYPERVERGE:
        result = await createHyperVergeSession(userId, config.hyperverge!);
        costCents = VerificationCosts.videoKyc.hyperverge;
        break;
      case VideoKYCProvider.DIGIO:
        result = await createDigioSession(userId, config.digio!);
        costCents = VerificationCosts.videoKyc.digio;
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    if (!result.success) {
      throw new Error(`Failed to create Video KYC session: ${result.error}`);
    }

    const verification: VideoKYCVerification = {
      id: crypto.randomUUID(),
      userId,
      provider,
      status: VideoKYCStatus.LINK_SENT,
      trigger,
      sessionId: result.sessionId,
      sessionUrl: result.sessionUrl,
      aadhaarVerified: false,
      panVerified: false,
      faceMatchScore: null,
      livenessScore: null,
      costCents,
      expiresAt: result.expiresAt,
      completedAt: null,
      createdAt: new Date(),
    };

    this.verifications.set(userId, verification);

    console.log('Video KYC session created', { sessionId: result.sessionId, bookingId: userId });

    return verification;
  }

  /**
   * Process webhook callback from provider
   */
  async processCallback(
    sessionId: string,
    callbackData: {
      status: 'completed' | 'failed' | 'expired';
      aadhaarVerified?: boolean;
      panVerified?: boolean;
      faceMatchScore?: number;
      livenessScore?: number;
    }
  ): Promise<VideoKYCVerification | null> {
    // Find verification by session ID
    let verification: VideoKYCVerification | undefined;
    let userId: string | undefined;

    for (const [uid, v] of this.verifications) {
      if (v.sessionId === sessionId) {
        verification = v;
        userId = uid;
        break;
      }
    }

    if (!verification || !userId) {
      console.warn('Video KYC callback for unknown session', { sessionId });
      return null;
    }

    let newStatus: VideoKYCStatus;
    switch (callbackData.status) {
      case 'completed':
        newStatus = VideoKYCStatus.COMPLETED;
        break;
      case 'failed':
        newStatus = VideoKYCStatus.FAILED;
        break;
      case 'expired':
        newStatus = VideoKYCStatus.EXPIRED;
        break;
      default:
        newStatus = verification.status;
    }

    const updatedVerification: VideoKYCVerification = {
      ...verification,
      status: newStatus,
      aadhaarVerified: callbackData.aadhaarVerified ?? verification.aadhaarVerified,
      panVerified: callbackData.panVerified ?? verification.panVerified,
      faceMatchScore: callbackData.faceMatchScore ?? verification.faceMatchScore,
      livenessScore: callbackData.livenessScore ?? verification.livenessScore,
      completedAt: newStatus === VideoKYCStatus.COMPLETED ? new Date() : null,
    };

    this.verifications.set(userId, updatedVerification);

    console.log('Video KYC callback processed', { sessionId, status: newStatus });

    return updatedVerification;
  }

  /**
   * Get verification status
   */
  getVerificationStatus(userId: string): VideoKYCVerification | null {
    return this.verifications.get(userId) ?? null;
  }

  /**
   * Get provider cost
   */
  getProviderCost(provider: VideoKYCProvider): number {
    switch (provider) {
      case VideoKYCProvider.SIGNZY:
        return VerificationCosts.videoKyc.signzy;
      case VideoKYCProvider.IDFY:
        return VerificationCosts.videoKyc.idfy;
      case VideoKYCProvider.HYPERVERGE:
        return VerificationCosts.videoKyc.hyperverge;
      case VideoKYCProvider.DIGIO:
        return VerificationCosts.videoKyc.digio;
      default:
        return 0;
    }
  }
}

export const videoKYCService = new VideoKYCService();
