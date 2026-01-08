/**
 * Agent Verification Tier Service
 *
 * Orchestrates the multi-tier agent verification system.
 * Integrates SMS OTP, Bank Verification, Video KYC, Email Reputation,
 * and manages verification tier progression.
 *
 * TIER 1 (Basic - Required for all agents):
 * - SMS OTP Phone Verification (₹0.10-0.30)
 * - Bank Account Name Verification (₹1-3)
 * - WhatsApp Business Screenshot (₹0)
 *
 * TIER 2 (Enhanced - Conditional triggers):
 * - Video KYC (₹40-120) - for high-value/high-risk
 * - Email Domain Reputation (₹0-1)
 *
 * TIER 3 (Strategic Features):
 * - Call/Chat Masking (usage-based)
 * - Payout Hold Buffer (24-72 hours)
 */

import { smsOtpService } from './sms-otp.service.js';
import { bankVerificationService } from './bank-verification.service.js';
import { videoKYCService } from './video-kyc.service.js';
import { emailReputationService } from './email-reputation.service.js';
import { callMaskingService } from './call-masking.service.js';
import { getDbClient } from './database.js';
import { EventFactory, EventContext } from '../events/index.js';
import {
  VerificationTier,
  VideoKYCTrigger,
  VideoKYCStatus,
  BankVerificationStatus,
  EmailReputationStatus,
  type AgentVerificationState,
  type SMSOTPRequest,
  type BankAccountDetails,
  VerificationConfig,
} from '../types/verification.types.js';

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION STATE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get agent's current verification state from database
 */
export async function getAgentVerificationState(
  userId: string
): Promise<AgentVerificationState | null> {
  const db = getDbClient();

  const { data, error } = await db
    .from('agent_profiles')
    .select(
      `
      user_id,
      verification_tier,
      phone_verified,
      phone_verified_at,
      bank_account_verified,
      bank_account_verified_at,
      bank_holder_name,
      whatsapp_verified,
      whatsapp_verified_at,
      video_kyc_status,
      video_kyc_completed_at,
      email_reputation_status,
      email_reputation_score,
      call_masking_enabled,
      payout_hold_hours,
      risk_score,
      last_verification_check,
      created_at,
      updated_at
    `
    )
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    userId: data.user_id,
    tier: data.verification_tier as VerificationTier,
    phoneVerified: data.phone_verified ?? false,
    phoneVerifiedAt: data.phone_verified_at ? new Date(data.phone_verified_at) : null,
    bankAccountVerified: data.bank_account_verified ?? false,
    bankAccountVerifiedAt: data.bank_account_verified_at
      ? new Date(data.bank_account_verified_at)
      : null,
    bankHolderName: data.bank_holder_name,
    whatsappVerified: data.whatsapp_verified ?? false,
    whatsappVerifiedAt: data.whatsapp_verified_at ? new Date(data.whatsapp_verified_at) : null,
    videoKycStatus: (data.video_kyc_status as VideoKYCStatus) ?? VideoKYCStatus.NOT_REQUIRED,
    videoKycCompletedAt: data.video_kyc_completed_at
      ? new Date(data.video_kyc_completed_at)
      : null,
    emailReputationScore: data.email_reputation_score,
    emailReputationStatus:
      (data.email_reputation_status as EmailReputationStatus) ?? EmailReputationStatus.NOT_CHECKED,
    callMaskingEnabled: data.call_masking_enabled ?? false,
    payoutHoldHours: data.payout_hold_hours ?? 72,
    riskScore: data.risk_score ?? 50,
    lastVerificationCheck: data.last_verification_check
      ? new Date(data.last_verification_check)
      : new Date(),
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 1: SMS OTP VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send SMS OTP for phone verification
 */
export async function sendPhoneOTP(
  userId: string,
  request: SMSOTPRequest,
  eventContext: EventContext
): Promise<{ success: boolean; expiresAt: Date; message: string }> {
  console.log('[verification-tier] Starting phone OTP verification', { userId });

  try {
    const response = await smsOtpService.sendOTP(userId, request);

    // Log verification attempt
    await logVerificationAttempt(userId, 'SMS_OTP', 'OTP_SENT', {
      provider: response.provider,
      costCents: response.costCents,
      phoneNumber: `${request.countryCode}${request.phoneNumber.slice(-4)}`,
    });

    // Emit event
    await EventFactory.verificationOTPSent(
      {
        userId,
        verificationType: 'PHONE',
        provider: response.provider,
      },
      eventContext
    );

    return {
      success: true,
      expiresAt: response.expiresAt,
      message: `OTP sent to ${request.countryCode}XXXXX${request.phoneNumber.slice(-4)}`,
    };
  } catch (error) {
    console.error('[verification-tier] Failed to send phone OTP', { userId, error });
    throw error;
  }
}

/**
 * Verify phone OTP
 */
export async function verifyPhoneOTP(
  userId: string,
  otp: string,
  eventContext: EventContext
): Promise<{ success: boolean; message: string; tier: VerificationTier }> {
  console.log('[verification-tier] Verifying phone OTP', { userId });

  const result = await smsOtpService.verifyOTP(userId, otp);

  if (result.success) {
    // Update agent profile
    const db = getDbClient();
    await db
      .from('agent_profiles')
      .update({
        phone_verified: true,
        phone_verified_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // Log successful verification
    await logVerificationAttempt(userId, 'SMS_OTP', 'VERIFIED', {});

    // Emit event
    await EventFactory.verificationCompleted(
      {
        userId,
        verificationType: 'PHONE',
        status: 'VERIFIED',
      },
      eventContext
    );

    // Get updated tier
    const state = await getAgentVerificationState(userId);
    return {
      success: true,
      message: result.message,
      tier: state?.tier ?? VerificationTier.BASIC_PENDING,
    };
  }

  return {
    success: false,
    message: result.message,
    tier: VerificationTier.UNVERIFIED,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 1: BANK ACCOUNT VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify bank account via penny drop
 */
export async function verifyBankAccount(
  userId: string,
  details: BankAccountDetails,
  eventContext: EventContext
): Promise<{
  success: boolean;
  status: BankVerificationStatus;
  message: string;
  tier: VerificationTier;
  requiresVideoKYC: boolean;
}> {
  console.log('[verification-tier] Starting bank account verification', { userId });

  try {
    const response = await bankVerificationService.verifyBankAccount(userId, details);

    // Update agent profile
    const db = getDbClient();
    const updateData: Record<string, unknown> = {
      bank_account_last4: details.accountNumber.slice(-4),
      bank_ifsc: details.ifscCode,
      bank_name_match_score: response.nameMatchScore,
    };

    if (response.status === BankVerificationStatus.VERIFIED) {
      updateData.bank_account_verified = true;
      updateData.bank_account_verified_at = new Date().toISOString();
      updateData.bank_holder_name = response.accountHolderName;
    }

    await db.from('agent_profiles').update(updateData).eq('user_id', userId);

    // Log verification attempt
    await logVerificationAttempt(userId, 'BANK_ACCOUNT', response.status, {
      nameMatchScore: response.nameMatchScore,
      costCents: response.costCents,
    });

    // Emit event
    await EventFactory.verificationCompleted(
      {
        userId,
        verificationType: 'BANK_ACCOUNT',
        status: response.status,
        metadata: {
          nameMatchScore: response.nameMatchScore,
        },
      },
      eventContext
    );

    // Check if Video KYC should be triggered due to name mismatch
    const requiresVideoKYC = response.status === BankVerificationStatus.NAME_MISMATCH;

    // Get updated tier
    const state = await getAgentVerificationState(userId);

    return {
      success: response.success,
      status: response.status,
      message: response.success
        ? 'Bank account verified successfully'
        : response.status === BankVerificationStatus.NAME_MISMATCH
          ? `Name mismatch detected. Bank shows: ${response.accountHolderName}. Video KYC may be required.`
          : 'Bank account verification failed',
      tier: state?.tier ?? VerificationTier.BASIC_PENDING,
      requiresVideoKYC,
    };
  } catch (error) {
    console.error('[verification-tier] Bank verification failed', { userId, error });
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 1: WHATSAPP BUSINESS VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Submit WhatsApp Business screenshot for verification
 */
export async function submitWhatsAppScreenshot(
  userId: string,
  phoneNumber: string,
  businessName: string,
  screenshotUrl: string,
  eventContext: EventContext
): Promise<{ success: boolean; message: string }> {
  const db = getDbClient();

  // Insert verification record
  const { error } = await db.from('whatsapp_verifications').insert({
    user_id: userId,
    phone_number: phoneNumber,
    business_name: businessName,
    screenshot_url: screenshotUrl,
    status: 'PENDING_REVIEW',
  });

  if (error) {
    throw new Error(`Failed to submit WhatsApp verification: ${error.message}`);
  }

  // Log attempt
  await logVerificationAttempt(userId, 'WHATSAPP', 'PENDING_REVIEW', {
    businessName,
  });

  // Emit event
  await EventFactory.verificationSubmitted(
    {
      userId,
      verificationType: 'WHATSAPP_BUSINESS',
    },
    eventContext
  );

  return {
    success: true,
    message: 'WhatsApp Business screenshot submitted for review',
  };
}

/**
 * Admin: Approve WhatsApp verification
 */
export async function approveWhatsAppVerification(
  userId: string,
  adminId: string,
  eventContext: EventContext
): Promise<void> {
  const db = getDbClient();

  // Update verification record
  await db
    .from('whatsapp_verifications')
    .update({
      status: 'VERIFIED',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('status', 'PENDING_REVIEW');

  // Update agent profile
  await db
    .from('agent_profiles')
    .update({
      whatsapp_verified: true,
      whatsapp_verified_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  // Emit event
  await EventFactory.verificationCompleted(
    {
      userId,
      verificationType: 'WHATSAPP_BUSINESS',
      status: 'VERIFIED',
      approvedBy: adminId,
    },
    eventContext
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 2: VIDEO KYC VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if Video KYC should be triggered
 */
export async function checkVideoKYCRequired(
  _userId: string,
  context: {
    bookingValueCents?: number;
    disputeCount?: number;
    hasBankNameMismatch?: boolean;
  }
): Promise<{ required: boolean; trigger: VideoKYCTrigger | null }> {
  return videoKYCService.shouldTriggerVideoKYC(context);
}

/**
 * Initiate Video KYC for agent
 */
export async function initiateVideoKYC(
  userId: string,
  trigger: VideoKYCTrigger,
  eventContext: EventContext
): Promise<{
  sessionUrl: string | null;
  expiresAt: Date | null;
  message: string;
}> {
  console.log('[verification-tier] Initiating Video KYC', { userId, trigger });

  try {
    const verification = await videoKYCService.initiateVideoKYC(userId, trigger);

    // Update agent profile
    const db = getDbClient();
    await db
      .from('agent_profiles')
      .update({
        video_kyc_status: VideoKYCStatus.LINK_SENT,
      })
      .eq('user_id', userId);

    // Store verification record
    await db.from('video_kyc_verifications').insert({
      user_id: userId,
      provider: verification.provider,
      status: verification.status,
      trigger,
      session_id: verification.sessionId,
      session_url: verification.sessionUrl,
      cost_paise: verification.costCents,
      expires_at: verification.expiresAt?.toISOString(),
    });

    // Emit event
    await EventFactory.videoKYCInitiated(
      {
        userId,
        trigger,
        sessionId: verification.sessionId ?? '',
      },
      eventContext
    );

    return {
      sessionUrl: verification.sessionUrl,
      expiresAt: verification.expiresAt,
      message: 'Video KYC link has been sent. Please complete verification within 24 hours.',
    };
  } catch (error) {
    console.error('[verification-tier] Failed to initiate Video KYC', { userId, error });
    throw error;
  }
}

/**
 * Process Video KYC webhook callback
 */
export async function processVideoKYCCallback(
  sessionId: string,
  callbackData: {
    status: 'completed' | 'failed' | 'expired';
    aadhaarVerified?: boolean;
    panVerified?: boolean;
    faceMatchScore?: number;
    livenessScore?: number;
  },
  eventContext: EventContext
): Promise<void> {
  const verification = await videoKYCService.processCallback(sessionId, callbackData);
  if (!verification) return;

  const db = getDbClient();

  // Update video_kyc_verifications table
  await db
    .from('video_kyc_verifications')
    .update({
      status: verification.status,
      aadhaar_verified: verification.aadhaarVerified,
      pan_verified: verification.panVerified,
      face_match_score: verification.faceMatchScore,
      liveness_score: verification.livenessScore,
      completed_at: verification.completedAt?.toISOString(),
    })
    .eq('session_id', sessionId);

  // Update agent profile
  const profileUpdate: Record<string, unknown> = {
    video_kyc_status: verification.status,
  };

  if (verification.status === VideoKYCStatus.COMPLETED) {
    profileUpdate.video_kyc_completed_at = new Date().toISOString();
    profileUpdate.aadhaar_verified = verification.aadhaarVerified;
    profileUpdate.pan_verified = verification.panVerified;
    profileUpdate.face_match_score = verification.faceMatchScore;
  }

  await db.from('agent_profiles').update(profileUpdate).eq('user_id', verification.userId);

  // Emit event
  await EventFactory.videoKYCCompleted(
    {
      userId: verification.userId,
      status: verification.status,
      aadhaarVerified: verification.aadhaarVerified,
      panVerified: verification.panVerified,
    },
    eventContext
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 2: EMAIL REPUTATION CHECK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check email reputation
 */
export async function checkEmailReputation(
  userId: string,
  email: string,
  _eventContext: EventContext
): Promise<{
  score: number;
  status: EmailReputationStatus;
  isAcceptable: boolean;
  riskFactors: string[];
}> {
  const reputation = await emailReputationService.checkReputation(userId, email);

  // Update agent profile
  const db = getDbClient();
  await db
    .from('agent_profiles')
    .update({
      email_reputation_status: reputation.status,
      email_reputation_score: reputation.score,
      email_is_disposable: reputation.isDisposable,
    })
    .eq('user_id', userId);

  // Store reputation record
  await db.from('email_reputations').upsert({
    user_id: userId,
    email: reputation.email,
    status: reputation.status,
    score: reputation.score,
    is_disposable: reputation.isDisposable,
    is_free_provider: reputation.isFreeProvider,
    domain_age_days: reputation.domainAge,
    has_mx_records: reputation.hasMxRecords,
    is_deliverable: reputation.isDeliverable,
    risk_factors: reputation.riskFactors,
    checked_at: reputation.checkedAt.toISOString(),
  });

  return {
    score: reputation.score,
    status: reputation.status,
    isAcceptable: reputation.score >= VerificationConfig.emailReputationThreshold,
    riskFactors: [...reputation.riskFactors],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 3: CALL MASKING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create call masking session for a booking
 */
export async function createCallMaskingSession(
  bookingId: string,
  userId: string,
  agentId: string,
  userPhone: string,
  agentPhone: string
): Promise<{
  userMaskedNumber: string;
  agentMaskedNumber: string;
  expiresAt: Date;
}> {
  const session = await callMaskingService.createSession({
    bookingId,
    userId,
    agentId,
    userPhone,
    agentPhone,
  });

  return {
    userMaskedNumber: session.userMaskedNumber,
    agentMaskedNumber: session.agentMaskedNumber,
    expiresAt: session.expiresAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 3: PAYOUT HOLD MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get payout hold hours for an agent based on their verification tier
 */
export async function getPayoutHoldHours(userId: string): Promise<number> {
  const state = await getAgentVerificationState(userId);
  return state?.payoutHoldHours ?? 72;
}

/**
 * Create payout hold for a booking
 */
export async function createPayoutHold(
  bookingId: string,
  agentId: string,
  amountCents: number,
  reason: string
): Promise<Date> {
  const holdHours = await getPayoutHoldHours(agentId);
  const releaseEligibleAt = new Date(Date.now() + holdHours * 60 * 60 * 1000);

  const db = getDbClient();
  await db.from('payout_holds').insert({
    booking_id: bookingId,
    agent_id: agentId,
    amount_paise: amountCents,
    reason,
    hold_hours: holdHours,
    release_eligible_at: releaseEligibleAt.toISOString(),
  });

  return releaseEligibleAt;
}

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION SUMMARY & DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get comprehensive verification status for agent dashboard
 */
export async function getVerificationSummary(userId: string): Promise<{
  tier: VerificationTier;
  tier1Progress: {
    phone: { verified: boolean; verifiedAt: Date | null };
    bank: { verified: boolean; verifiedAt: Date | null; holderName: string | null };
    whatsapp: { verified: boolean; verifiedAt: Date | null };
    completionPercent: number;
  };
  tier2Status: {
    videoKyc: { status: VideoKYCStatus; requiredTriggers: VideoKYCTrigger[] };
    emailReputation: { status: EmailReputationStatus; score: number | null };
  };
  tier3Features: {
    callMaskingEnabled: boolean;
    payoutHoldHours: number;
  };
  riskScore: number;
  nextSteps: string[];
}> {
  const state = await getAgentVerificationState(userId);

  if (!state) {
    return {
      tier: VerificationTier.UNVERIFIED,
      tier1Progress: {
        phone: { verified: false, verifiedAt: null },
        bank: { verified: false, verifiedAt: null, holderName: null },
        whatsapp: { verified: false, verifiedAt: null },
        completionPercent: 0,
      },
      tier2Status: {
        videoKyc: { status: VideoKYCStatus.NOT_REQUIRED, requiredTriggers: [] },
        emailReputation: { status: EmailReputationStatus.NOT_CHECKED, score: null },
      },
      tier3Features: {
        callMaskingEnabled: false,
        payoutHoldHours: 72,
      },
      riskScore: 50,
      nextSteps: ['Complete phone verification', 'Complete bank account verification'],
    };
  }

  // Calculate Tier 1 completion percentage
  const tier1Complete = [
    state.phoneVerified,
    state.bankAccountVerified,
    state.whatsappVerified,
  ].filter(Boolean).length;
  const tier1Percent = Math.round((tier1Complete / 3) * 100);

  // Determine next steps
  const nextSteps: string[] = [];
  if (!state.phoneVerified) {
    nextSteps.push('Verify your phone number with OTP');
  }
  if (!state.bankAccountVerified) {
    nextSteps.push('Add and verify your bank account');
  }
  if (!state.whatsappVerified) {
    nextSteps.push('Submit WhatsApp Business screenshot');
  }
  if (state.tier === VerificationTier.BASIC_VERIFIED && !state.videoKycCompletedAt) {
    nextSteps.push('Complete Video KYC for enhanced verification (optional)');
  }

  return {
    tier: state.tier,
    tier1Progress: {
      phone: { verified: state.phoneVerified, verifiedAt: state.phoneVerifiedAt },
      bank: {
        verified: state.bankAccountVerified,
        verifiedAt: state.bankAccountVerifiedAt,
        holderName: state.bankHolderName,
      },
      whatsapp: { verified: state.whatsappVerified, verifiedAt: state.whatsappVerifiedAt },
      completionPercent: tier1Percent,
    },
    tier2Status: {
      videoKyc: { status: state.videoKycStatus, requiredTriggers: [] },
      emailReputation: { status: state.emailReputationStatus, score: state.emailReputationScore },
    },
    tier3Features: {
      callMaskingEnabled: state.callMaskingEnabled,
      payoutHoldHours: state.payoutHoldHours,
    },
    riskScore: state.riskScore,
    nextSteps,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOGGING
// ─────────────────────────────────────────────────────────────────────────────

async function logVerificationAttempt(
  userId: string,
  verificationType: string,
  action: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const db = getDbClient();

  await db.from('verification_audit_log').insert({
    user_id: userId,
    verification_type: verificationType,
    action,
    metadata,
  });
}
