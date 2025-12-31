import { env } from '../../config/env';
import {
  DeliveryResult,
  DeliveryStatus,
  NotificationChannel,
  SmsPayload,
  SmsProvider,
} from '../types';

/**
 * Twilio SMS Provider
 * 
 * Production SMS delivery via Twilio API.
 * Placeholder implementation - requires twilio package installation.
 */
export class TwilioSmsProvider implements SmsProvider {
  readonly name = 'twilio';
  readonly channel = NotificationChannel.SMS;

  // Configuration stored for future Twilio SDK integration
  private readonly config: {
    accountSid: string;
    authToken: string;
    fromNumber: string;
  };

  constructor() {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM_NUMBER) {
      throw new Error(
        'TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER are required for TwilioSmsProvider'
      );
    }

    this.config = {
      accountSid: env.TWILIO_ACCOUNT_SID,
      authToken: env.TWILIO_AUTH_TOKEN,
      fromNumber: env.TWILIO_FROM_NUMBER,
    };
  }

  async healthCheck(): Promise<boolean> {
    // Placeholder: Would verify Twilio credentials using this.config
    void this.config; // Reference to prevent unused warning
    console.warn('TwilioSmsProvider.healthCheck: Placeholder implementation');
    return true;
  }

  async send(payload: SmsPayload): Promise<DeliveryResult> {
    const attemptedAt = new Date();

    // Placeholder implementation
    // In production, this would use the Twilio SDK:
    //
    // const client = twilio(this.config.accountSid, this.config.authToken);
    // const message = await client.messages.create({
    //   body: payload.body,
    //   from: this.config.fromNumber,
    //   to: payload.recipient,
    // });

    console.warn('TwilioSmsProvider.send: Placeholder implementation');
    console.info(`Would send SMS to ${payload.recipient}: ${payload.body}`);

    return {
      success: true,
      status: DeliveryStatus.SENT,
      providerMessageId: `twilio-placeholder-${Date.now()}`,
      retryable: false,
      attemptedAt,
      attemptNumber: 0,
    };
  }
}
