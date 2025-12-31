import { Resend } from 'resend';
import { env } from '../../config/env';
import {
  DeliveryResult,
  DeliveryStatus,
  EmailAttachment,
  EmailPayload,
  EmailProvider,
  NotificationChannel,
} from '../types';

/**
 * Resend Email Provider
 * 
 * Production-grade email delivery via Resend API.
 * Free tier: 3,000 emails/month, 100 emails/day
 */
export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';
  readonly channel = NotificationChannel.EMAIL;

  private readonly client: Resend;
  private readonly fromAddress: string;
  private readonly fromName: string;
  private readonly replyTo: string | undefined;

  constructor() {
    if (!env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is required for ResendEmailProvider');
    }

    this.client = new Resend(env.RESEND_API_KEY);
    this.fromAddress = env.EMAIL_FROM_ADDRESS;
    this.fromName = env.EMAIL_FROM_NAME;
    this.replyTo = env.EMAIL_REPLY_TO;
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Resend doesn't have a dedicated health endpoint
      // We verify the API key is valid by attempting to list domains
      await this.client.domains.list();
      return true;
    } catch {
      return false;
    }
  }

  async send(payload: EmailPayload): Promise<DeliveryResult> {
    const attemptedAt = new Date();

    try {
      const response = await this.client.emails.send({
        from: `${this.fromName} <${this.fromAddress}>`,
        to: payload.recipient,
        subject: payload.subject,
        text: payload.textBody ?? '',
        html: payload.htmlBody,
        reply_to: payload.replyTo ?? this.replyTo,
        cc: payload.cc,
        bcc: payload.bcc,
        attachments: payload.attachments?.map((a: EmailAttachment) => ({
          filename: a.filename,
          content: Buffer.from(a.content, 'base64'),
        })),
        headers: {
          'X-Idempotency-Key': payload.idempotencyKey,
          'X-Correlation-ID': payload.metadata.correlationId,
        },
      });

      if (response.error) {
        return this.handleError(response.error, attemptedAt, 0);
      }

      return {
        success: true,
        status: DeliveryStatus.SENT,
        providerMessageId: response.data?.id,
        retryable: false,
        attemptedAt,
        attemptNumber: 0,
      };
    } catch (error) {
      return this.handleError(error, attemptedAt, 0);
    }
  }

  private handleError(
    error: unknown,
    attemptedAt: Date,
    attemptNumber: number
  ): DeliveryResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Determine if error is retryable based on error type
    const retryable = this.isRetryableError(error);

    return {
      success: false,
      status: DeliveryStatus.FAILED,
      errorMessage,
      errorCode: this.extractErrorCode(error),
      retryable,
      attemptedAt,
      attemptNumber,
    };
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      // Rate limits and temporary failures are retryable
      if (message.includes('rate limit') || message.includes('429')) return true;
      if (message.includes('timeout') || message.includes('503')) return true;
      if (message.includes('temporary')) return true;
    }
    return false;
  }

  private extractErrorCode(error: unknown): string | undefined {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      return String((error as { statusCode: number }).statusCode);
    }
    return undefined;
  }
}
