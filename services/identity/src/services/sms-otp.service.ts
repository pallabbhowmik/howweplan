/**
 * SMS OTP Verification Service
 *
 * Provides phone number verification via OTP using multiple providers.
 * Supports Twilio, Gupshup, Karix, and MSG91.
 *
 * Cost: ₹0.10-0.30 per OTP
 *
 * Flow:
 * 1. Agent submits phone number
 * 2. System sends OTP via configured provider
 * 3. Agent enters OTP within validity window
 * 4. System verifies and marks phone as verified
 */

import crypto from 'crypto';
import {
  SMSProvider,
  SMSOTPStatus,
  VerificationConfig,
  VerificationCosts,
  type SMSOTPRequest,
  type SMSOTPResponse,
  type SMSOTPVerification,
} from '../types/verification.types.js';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

interface SMSProviderConfig {
  twilio?: {
    accountSid: string;
    authToken: string;
    fromNumber: string;
  };
  gupshup?: {
    apiKey: string;
    senderId: string;
  };
  karix?: {
    apiKey: string;
    senderId: string;
  };
  msg91?: {
    authKey: string;
    senderId: string;
    templateId: string;
  };
}

const getProviderConfig = (): SMSProviderConfig => ({
  twilio: process.env.TWILIO_ACCOUNT_SID
    ? {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN!,
        fromNumber: process.env.TWILIO_FROM_NUMBER!,
      }
    : undefined,
  gupshup: process.env.GUPSHUP_API_KEY
    ? {
        apiKey: process.env.GUPSHUP_API_KEY,
        senderId: process.env.GUPSHUP_SENDER_ID!,
      }
    : undefined,
  karix: process.env.KARIX_API_KEY
    ? {
        apiKey: process.env.KARIX_API_KEY,
        senderId: process.env.KARIX_SENDER_ID!,
      }
    : undefined,
  msg91: process.env.MSG91_AUTH_KEY
    ? {
        authKey: process.env.MSG91_AUTH_KEY,
        senderId: process.env.MSG91_SENDER_ID!,
        templateId: process.env.MSG91_TEMPLATE_ID!,
      }
    : undefined,
});

const getPreferredProvider = (): SMSProvider => {
  const config = getProviderConfig();
  // Priority: MSG91 (cheapest for India) > Gupshup > Karix > Twilio
  if (config.msg91) return SMSProvider.MSG91;
  if (config.gupshup) return SMSProvider.GUPSHUP;
  if (config.karix) return SMSProvider.KARIX;
  if (config.twilio) return SMSProvider.TWILIO;
  throw new Error('No SMS provider configured');
};

// ─────────────────────────────────────────────────────────────────────────────
// OTP GENERATION & HASHING
// ─────────────────────────────────────────────────────────────────────────────

const generateOTP = (length = 6): string => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[crypto.randomInt(0, digits.length)];
  }
  return otp;
};

const hashOTP = (otp: string): string => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

const verifyOTPHash = (otp: string, hash: string): boolean => {
  return hashOTP(otp) === hash;
};

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER IMPLEMENTATIONS
// ─────────────────────────────────────────────────────────────────────────────

interface SendOTPResult {
  success: boolean;
  messageId: string | null;
  error?: string;
}

/**
 * Send OTP via Twilio
 */
async function sendViaTwilio(
  phoneNumber: string,
  otp: string,
  config: NonNullable<SMSProviderConfig['twilio']>
): Promise<SendOTPResult> {
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;
    const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');

    const body = new URLSearchParams({
      From: config.fromNumber,
      To: phoneNumber,
      Body: `Your TripComposer verification code is: ${otp}. Valid for ${VerificationConfig.otpValidityMinutes} minutes. Do not share this code.`,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, messageId: null, error };
    }

    const data = (await response.json()) as { sid: string };
    return { success: true, messageId: data.sid };
  } catch (error) {
    console.error('Twilio SMS failed', error);
    return { success: false, messageId: null, error: String(error) };
  }
}

/**
 * Send OTP via Gupshup
 */
async function sendViaGupshup(
  phoneNumber: string,
  otp: string,
  config: NonNullable<SMSProviderConfig['gupshup']>
): Promise<SendOTPResult> {
  try {
    const message = `Your TripComposer verification code is: ${otp}. Valid for ${VerificationConfig.otpValidityMinutes} minutes.`;

    const params = new URLSearchParams({
      method: 'SendMessage',
      send_to: phoneNumber.replace('+', ''),
      msg: message,
      msg_type: 'TEXT',
      userid: config.apiKey,
      auth_scheme: 'plain',
      password: config.senderId,
      v: '1.1',
      format: 'json',
    });

    const response = await fetch(
      `https://enterprise.smsgupshup.com/GatewayAPI/rest?${params.toString()}`
    );

    if (!response.ok) {
      return { success: false, messageId: null, error: 'Gupshup API error' };
    }

    const data = (await response.json()) as { id?: string };
    return { success: true, messageId: data.id ?? null };
  } catch (error) {
    console.error('Gupshup SMS failed', error);
    return { success: false, messageId: null, error: String(error) };
  }
}

/**
 * Send OTP via MSG91
 */
async function sendViaMSG91(
  phoneNumber: string,
  otp: string,
  config: NonNullable<SMSProviderConfig['msg91']>
): Promise<SendOTPResult> {
  try {
    const response = await fetch('https://api.msg91.com/api/v5/otp', {
      method: 'POST',
      headers: {
        authkey: config.authKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_id: config.templateId,
        mobile: phoneNumber.replace('+', ''),
        otp,
        sender: config.senderId,
        otp_expiry: VerificationConfig.otpValidityMinutes,
      }),
    });

    if (!response.ok) {
      return { success: false, messageId: null, error: 'MSG91 API error' };
    }

    const data = (await response.json()) as { request_id?: string };
    return { success: true, messageId: data.request_id ?? null };
  } catch (error) {
    console.error('MSG91 SMS failed', error);
    return { success: false, messageId: null, error: String(error) };
  }
}

/**
 * Send OTP via Karix
 */
async function sendViaKarix(
  phoneNumber: string,
  otp: string,
  config: NonNullable<SMSProviderConfig['karix']>
): Promise<SendOTPResult> {
  try {
    const message = `Your TripComposer verification code is: ${otp}. Valid for ${VerificationConfig.otpValidityMinutes} minutes.`;

    const response = await fetch('https://api.karix.io/message/', {
      method: 'POST',
      headers: {
        'api-key': config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: 'sms',
        source: config.senderId,
        destination: [phoneNumber],
        content: {
          text: message,
        },
      }),
    });

    if (!response.ok) {
      return { success: false, messageId: null, error: 'Karix API error' };
    }

    const data = (await response.json()) as { objects?: Array<{ uid?: string }> };
    return { success: true, messageId: data.objects?.[0]?.uid ?? null };
  } catch (error) {
    console.error('Karix SMS failed', error);
    return { success: false, messageId: null, error: String(error) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SMS OTP SERVICE
// ─────────────────────────────────────────────────────────────────────────────

class SMSOTPService {
  // In-memory store for demo - replace with database in production
  private verifications = new Map<string, SMSOTPVerification>();
  private userLastSent = new Map<string, Date>();

  /**
   * Send OTP to phone number
   */
  async sendOTP(userId: string, request: SMSOTPRequest): Promise<SMSOTPResponse> {
    const { phoneNumber, countryCode } = request;
    const fullNumber = `${countryCode}${phoneNumber}`;

    // Check cooldown
    const lastSent = this.userLastSent.get(userId);
    if (lastSent) {
      const elapsed = (Date.now() - lastSent.getTime()) / 1000;
      if (elapsed < VerificationConfig.otpResendCooldownSeconds) {
        throw new Error(
          `Please wait ${Math.ceil(VerificationConfig.otpResendCooldownSeconds - elapsed)} seconds before requesting another OTP`
        );
      }
    }

    // Generate OTP
    const otp = generateOTP(6);
    const otpHash = hashOTP(otp);
    const provider = getPreferredProvider();
    const config = getProviderConfig();

    // Send via provider
    let result: SendOTPResult;
    switch (provider) {
      case SMSProvider.TWILIO:
        result = await sendViaTwilio(fullNumber, otp, config.twilio!);
        break;
      case SMSProvider.GUPSHUP:
        result = await sendViaGupshup(fullNumber, otp, config.gupshup!);
        break;
      case SMSProvider.MSG91:
        result = await sendViaMSG91(fullNumber, otp, config.msg91!);
        break;
      case SMSProvider.KARIX:
        result = await sendViaKarix(fullNumber, otp, config.karix!);
        break;
      default:
        throw new Error(`Unsupported SMS provider: ${provider}`);
    }

    if (!result.success) {
      console.error('Failed to send OTP', { userId, provider, error: result.error });
      throw new Error('Failed to send OTP. Please try again.');
    }

    // Store verification record
    const expiresAt = new Date(Date.now() + VerificationConfig.otpValidityMinutes * 60 * 1000);
    const verification: SMSOTPVerification = {
      id: crypto.randomUUID(),
      userId,
      phoneNumber,
      countryCode,
      provider,
      status: SMSOTPStatus.OTP_SENT,
      otpHash,
      expiresAt,
      attempts: 0,
      maxAttempts: VerificationConfig.maxOtpAttempts,
      verifiedAt: null,
      createdAt: new Date(),
    };

    this.verifications.set(userId, verification);
    this.userLastSent.set(userId, new Date());

    // Calculate cost based on provider
    const costCents = this.getProviderCost(provider);

    console.log('OTP sent successfully', { userId, provider, messageId: result.messageId });

    return {
      success: true,
      messageId: result.messageId,
      provider,
      costCents,
      expiresAt,
    };
  }

  /**
   * Verify OTP
   */
  async verifyOTP(userId: string, otp: string): Promise<{ success: boolean; message: string }> {
    const verification = this.verifications.get(userId);

    if (!verification) {
      return { success: false, message: 'No OTP request found. Please request a new OTP.' };
    }

    if (verification.status === SMSOTPStatus.VERIFIED) {
      return { success: true, message: 'Phone already verified.' };
    }

    if (verification.status === SMSOTPStatus.MAX_ATTEMPTS_EXCEEDED) {
      return { success: false, message: 'Maximum attempts exceeded. Please request a new OTP.' };
    }

    if (new Date() > verification.expiresAt) {
      this.verifications.set(userId, {
        ...verification,
        status: SMSOTPStatus.OTP_EXPIRED,
      });
      return { success: false, message: 'OTP expired. Please request a new OTP.' };
    }

    // Verify OTP
    const isValid = verifyOTPHash(otp, verification.otpHash);

    if (!isValid) {
      const newAttempts = verification.attempts + 1;
      const status =
        newAttempts >= verification.maxAttempts
          ? SMSOTPStatus.MAX_ATTEMPTS_EXCEEDED
          : SMSOTPStatus.OTP_SENT;

      this.verifications.set(userId, {
        ...verification,
        attempts: newAttempts,
        status,
      });

      if (status === SMSOTPStatus.MAX_ATTEMPTS_EXCEEDED) {
        return { success: false, message: 'Maximum attempts exceeded. Please request a new OTP.' };
      }

      return {
        success: false,
        message: `Invalid OTP. ${verification.maxAttempts - newAttempts} attempts remaining.`,
      };
    }

    // Mark as verified
    this.verifications.set(userId, {
      ...verification,
      status: SMSOTPStatus.VERIFIED,
      verifiedAt: new Date(),
    });

    console.log('Phone verified successfully', { userId });

    return { success: true, message: 'Phone number verified successfully.' };
  }

  /**
   * Get verification status
   */
  getVerificationStatus(userId: string): SMSOTPVerification | null {
    return this.verifications.get(userId) ?? null;
  }

  /**
   * Get provider cost
   */
  private getProviderCost(provider: SMSProvider): number {
    switch (provider) {
      case SMSProvider.TWILIO:
        return VerificationCosts.smsOtp.twilio;
      case SMSProvider.GUPSHUP:
        return VerificationCosts.smsOtp.gupshup;
      case SMSProvider.KARIX:
        return VerificationCosts.smsOtp.karix;
      case SMSProvider.MSG91:
        return VerificationCosts.smsOtp.msg91;
      default:
        return 0;
    }
  }
}

export const smsOtpService = new SMSOTPService();
