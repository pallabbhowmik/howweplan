/**
 * Verification Types
 *
 * Comprehensive verification tier system for agent identity.
 * This module defines all verification methods, statuses, and configurations.
 *
 * TIER 1 (High Priority - Required):
 * - SMS OTP Verification (₹0.10-0.30/OTP via Twilio/Gupshup/Karix)
 * - Bank Account Name Verification (₹1-3 via penny drop)
 * - WhatsApp Business Verification (₹0 - screenshot upload)
 *
 * TIER 2 (Conditional - High-risk cases):
 * - Video KYC (₹40-120 via Signzy/IDfy/HyperVerge)
 * - Email Domain Reputation Check (₹0-1)
 *
 * TIER 3 (Strategic - Business enablement):
 * - Call/Chat Masking (usage-based)
 * - Payout Hold Buffer (24-72 hours, ₹0)
 */

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION TIERS & LEVELS
// ─────────────────────────────────────────────────────────────────────────────

export const VerificationTier = {
  /** New agent, no verification completed */
  UNVERIFIED: 'UNVERIFIED',
  /** Tier 1 verification in progress */
  BASIC_PENDING: 'BASIC_PENDING',
  /** Tier 1 completed (SMS + Bank verified) */
  BASIC_VERIFIED: 'BASIC_VERIFIED',
  /** Tier 2 triggered (Video KYC pending) */
  ENHANCED_PENDING: 'ENHANCED_PENDING',
  /** Tier 2 completed (Video KYC passed) */
  ENHANCED_VERIFIED: 'ENHANCED_VERIFIED',
  /** Verification failed or revoked */
  FAILED: 'FAILED',
  /** Suspended pending investigation */
  SUSPENDED: 'SUSPENDED',
} as const;

export type VerificationTier = (typeof VerificationTier)[keyof typeof VerificationTier];

// ─────────────────────────────────────────────────────────────────────────────
// SMS OTP VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export const SMSProvider = {
  TWILIO: 'TWILIO',
  GUPSHUP: 'GUPSHUP',
  KARIX: 'KARIX',
  MSG91: 'MSG91',
} as const;

export type SMSProvider = (typeof SMSProvider)[keyof typeof SMSProvider];

export const SMSOTPStatus = {
  NOT_STARTED: 'NOT_STARTED',
  OTP_SENT: 'OTP_SENT',
  OTP_EXPIRED: 'OTP_EXPIRED',
  VERIFIED: 'VERIFIED',
  MAX_ATTEMPTS_EXCEEDED: 'MAX_ATTEMPTS_EXCEEDED',
} as const;

export type SMSOTPStatus = (typeof SMSOTPStatus)[keyof typeof SMSOTPStatus];

export interface SMSOTPRequest {
  readonly phoneNumber: string;
  readonly countryCode: string;
}

export interface SMSOTPVerification {
  readonly id: string;
  readonly userId: string;
  readonly phoneNumber: string;
  readonly countryCode: string;
  readonly provider: SMSProvider;
  readonly status: SMSOTPStatus;
  readonly otpHash: string;
  readonly expiresAt: Date;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly verifiedAt: Date | null;
  readonly createdAt: Date;
}

export interface SMSOTPResponse {
  readonly success: boolean;
  readonly messageId: string | null;
  readonly provider: SMSProvider;
  readonly costCents: number;
  readonly expiresAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// BANK ACCOUNT VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export const BankVerificationStatus = {
  NOT_STARTED: 'NOT_STARTED',
  PENDING: 'PENDING',
  PENNY_DROP_INITIATED: 'PENNY_DROP_INITIATED',
  VERIFIED: 'VERIFIED',
  FAILED: 'FAILED',
  NAME_MISMATCH: 'NAME_MISMATCH',
} as const;

export type BankVerificationStatus =
  (typeof BankVerificationStatus)[keyof typeof BankVerificationStatus];

export const BankVerificationProvider = {
  CASHFREE: 'CASHFREE',
  RAZORPAY: 'RAZORPAY',
  SIGNZY: 'SIGNZY',
  MANUAL: 'MANUAL',
} as const;

export type BankVerificationProvider =
  (typeof BankVerificationProvider)[keyof typeof BankVerificationProvider];

export interface BankAccountDetails {
  readonly accountHolderName: string;
  readonly accountNumber: string;
  readonly ifscCode: string;
  readonly bankName?: string;
  readonly branchName?: string;
}

export interface BankVerification {
  readonly id: string;
  readonly userId: string;
  readonly accountNumber: string;
  readonly ifscCode: string;
  readonly providedName: string;
  readonly verifiedName: string | null;
  readonly nameMatchScore: number | null;
  readonly provider: BankVerificationProvider;
  readonly status: BankVerificationStatus;
  readonly referenceId: string | null;
  readonly costCents: number;
  readonly verifiedAt: Date | null;
  readonly createdAt: Date;
}

export interface BankVerificationResponse {
  readonly success: boolean;
  readonly status: BankVerificationStatus;
  readonly accountHolderName: string | null;
  readonly nameMatchScore: number | null;
  readonly referenceId: string;
  readonly costCents: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// WHATSAPP BUSINESS VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export const WhatsAppVerificationStatus = {
  NOT_STARTED: 'NOT_STARTED',
  SCREENSHOT_UPLOADED: 'SCREENSHOT_UPLOADED',
  PENDING_REVIEW: 'PENDING_REVIEW',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
} as const;

export type WhatsAppVerificationStatus =
  (typeof WhatsAppVerificationStatus)[keyof typeof WhatsAppVerificationStatus];

export interface WhatsAppVerification {
  readonly id: string;
  readonly userId: string;
  readonly phoneNumber: string;
  readonly businessName: string;
  readonly screenshotUrl: string;
  readonly status: WhatsAppVerificationStatus;
  readonly reviewedBy: string | null;
  readonly reviewedAt: Date | null;
  readonly rejectionReason: string | null;
  readonly createdAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// VIDEO KYC VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export const VideoKYCProvider = {
  SIGNZY: 'SIGNZY',
  IDFY: 'IDFY',
  HYPERVERGE: 'HYPERVERGE',
  DIGIO: 'DIGIO',
} as const;

export type VideoKYCProvider = (typeof VideoKYCProvider)[keyof typeof VideoKYCProvider];

export const VideoKYCStatus = {
  NOT_REQUIRED: 'NOT_REQUIRED',
  PENDING: 'PENDING',
  LINK_SENT: 'LINK_SENT',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
} as const;

export type VideoKYCStatus = (typeof VideoKYCStatus)[keyof typeof VideoKYCStatus];

export const VideoKYCTrigger = {
  /** High-value transactions above threshold */
  HIGH_VALUE_BOOKING: 'HIGH_VALUE_BOOKING',
  /** Multiple disputes or complaints */
  DISPUTE_THRESHOLD: 'DISPUTE_THRESHOLD',
  /** Name mismatch in bank verification */
  NAME_MISMATCH: 'NAME_MISMATCH',
  /** Suspicious activity detected */
  FRAUD_SIGNAL: 'FRAUD_SIGNAL',
  /** Manual admin trigger */
  ADMIN_TRIGGERED: 'ADMIN_TRIGGERED',
  /** Agent requested upgrade */
  SELF_UPGRADE: 'SELF_UPGRADE',
} as const;

export type VideoKYCTrigger = (typeof VideoKYCTrigger)[keyof typeof VideoKYCTrigger];

export interface VideoKYCVerification {
  readonly id: string;
  readonly userId: string;
  readonly provider: VideoKYCProvider;
  readonly status: VideoKYCStatus;
  readonly trigger: VideoKYCTrigger;
  readonly sessionId: string | null;
  readonly sessionUrl: string | null;
  readonly aadhaarVerified: boolean;
  readonly panVerified: boolean;
  readonly faceMatchScore: number | null;
  readonly livenessScore: number | null;
  readonly costCents: number;
  readonly expiresAt: Date | null;
  readonly completedAt: Date | null;
  readonly createdAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL REPUTATION CHECK
// ─────────────────────────────────────────────────────────────────────────────

export const EmailReputationStatus = {
  NOT_CHECKED: 'NOT_CHECKED',
  CHECKING: 'CHECKING',
  VALID: 'VALID',
  DISPOSABLE: 'DISPOSABLE',
  INVALID: 'INVALID',
  HIGH_RISK: 'HIGH_RISK',
} as const;

export type EmailReputationStatus =
  (typeof EmailReputationStatus)[keyof typeof EmailReputationStatus];

export interface EmailReputation {
  readonly id: string;
  readonly userId: string;
  readonly email: string;
  readonly status: EmailReputationStatus;
  readonly score: number;
  readonly isDisposable: boolean;
  readonly isFreeProvider: boolean;
  readonly domainAge: number | null;
  readonly hasMxRecords: boolean;
  readonly isDeliverable: boolean;
  readonly riskFactors: readonly string[];
  readonly checkedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// CALL/CHAT MASKING
// ─────────────────────────────────────────────────────────────────────────────

export const MaskingProvider = {
  EXOTEL: 'EXOTEL',
  KNOWLARITY: 'KNOWLARITY',
  KALEYRA: 'KALEYRA',
} as const;

export type MaskingProvider = (typeof MaskingProvider)[keyof typeof MaskingProvider];

export const MaskingSessionStatus = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  TERMINATED: 'TERMINATED',
} as const;

export type MaskingSessionStatus =
  (typeof MaskingSessionStatus)[keyof typeof MaskingSessionStatus];

export interface MaskingSession {
  readonly id: string;
  readonly bookingId: string;
  readonly userId: string;
  readonly agentId: string;
  readonly provider: MaskingProvider;
  readonly userMaskedNumber: string;
  readonly agentMaskedNumber: string;
  readonly status: MaskingSessionStatus;
  readonly expiresAt: Date;
  readonly totalCalls: number;
  readonly totalDurationMinutes: number;
  readonly costCents: number;
  readonly createdAt: Date;
}

export interface MaskingConfig {
  readonly enabled: boolean;
  readonly provider: MaskingProvider;
  readonly sessionDurationHours: number;
  readonly maxCallsPerSession: number;
  readonly costPerMinuteCents: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYOUT HOLD BUFFER
// ─────────────────────────────────────────────────────────────────────────────

export const PayoutHoldReason = {
  /** Default hold for new agents */
  NEW_AGENT: 'NEW_AGENT',
  /** Standard trip completion hold */
  TRIP_COMPLETION: 'TRIP_COMPLETION',
  /** Extended hold due to disputes */
  DISPUTE_PENDING: 'DISPUTE_PENDING',
  /** Extended hold due to fraud signals */
  FRAUD_REVIEW: 'FRAUD_REVIEW',
  /** Manual admin hold */
  ADMIN_HOLD: 'ADMIN_HOLD',
} as const;

export type PayoutHoldReason = (typeof PayoutHoldReason)[keyof typeof PayoutHoldReason];

export interface PayoutHoldConfig {
  /** Base hold hours for new agents (72 hours) */
  readonly newAgentHoldHours: number;
  /** Standard hold hours after trip completion (24 hours) */
  readonly standardHoldHours: number;
  /** Extended hold hours for disputes (168 hours = 7 days) */
  readonly disputeHoldHours: number;
  /** Number of successful trips to reduce hold period */
  readonly tripsToReduceHold: number;
}

export interface PayoutHold {
  readonly id: string;
  readonly bookingId: string;
  readonly agentId: string;
  readonly amountCents: number;
  readonly reason: PayoutHoldReason;
  readonly holdHours: number;
  readonly holdStartedAt: Date;
  readonly releaseEligibleAt: Date;
  readonly releasedAt: Date | null;
  readonly createdAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPREHENSIVE VERIFICATION STATUS
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentVerificationState {
  readonly userId: string;
  readonly tier: VerificationTier;

  // Tier 1 - Basic Verification
  readonly phoneVerified: boolean;
  readonly phoneVerifiedAt: Date | null;
  readonly bankAccountVerified: boolean;
  readonly bankAccountVerifiedAt: Date | null;
  readonly bankHolderName: string | null;
  readonly whatsappVerified: boolean;
  readonly whatsappVerifiedAt: Date | null;

  // Tier 2 - Enhanced Verification
  readonly videoKycStatus: VideoKYCStatus;
  readonly videoKycCompletedAt: Date | null;
  readonly emailReputationScore: number | null;
  readonly emailReputationStatus: EmailReputationStatus;

  // Tier 3 - Business Features
  readonly callMaskingEnabled: boolean;
  readonly payoutHoldHours: number;

  // Meta
  readonly riskScore: number;
  readonly lastVerificationCheck: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION THRESHOLDS & CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export const VerificationConfig = {
  /** Name match threshold for bank verification (0-100) */
  bankNameMatchThreshold: 80,
  /** Email reputation score threshold */
  emailReputationThreshold: 50,
  /** Booking value threshold (INR) to trigger Video KYC */
  videoKycBookingThreshold: 100000,
  /** Number of disputes to trigger Video KYC */
  videoKycDisputeThreshold: 2,
  /** OTP validity in minutes */
  otpValidityMinutes: 10,
  /** Max OTP attempts */
  maxOtpAttempts: 3,
  /** OTP resend cooldown in seconds */
  otpResendCooldownSeconds: 60,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION COSTS (in paise for INR)
// ─────────────────────────────────────────────────────────────────────────────

export const VerificationCosts = {
  smsOtp: {
    twilio: 30, // ₹0.30
    gupshup: 15, // ₹0.15
    karix: 10, // ₹0.10
    msg91: 12, // ₹0.12
  },
  bankVerification: {
    cashfree: 200, // ₹2
    razorpay: 150, // ₹1.50
    signzy: 300, // ₹3
  },
  videoKyc: {
    signzy: 7000, // ₹70
    idfy: 5000, // ₹50
    hyperverge: 4000, // ₹40
    digio: 12000, // ₹120
  },
  emailReputation: {
    free: 0,
    paid: 100, // ₹1
  },
  callMasking: {
    perMinute: 150, // ₹1.50/minute
    setupFee: 0,
  },
} as const;
