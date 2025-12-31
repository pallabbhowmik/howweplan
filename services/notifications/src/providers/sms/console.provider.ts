import {
  DeliveryResult,
  DeliveryStatus,
  NotificationChannel,
  SmsPayload,
  SmsProvider,
} from '../types';

/**
 * Console SMS Provider
 * 
 * Development-only provider that logs SMS to console.
 * Used when SMS_PROVIDER=console or in test environments.
 */
export class ConsoleSmsProvider implements SmsProvider {
  readonly name = 'console';
  readonly channel = NotificationChannel.SMS;

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async send(payload: SmsPayload): Promise<DeliveryResult> {
    const attemptedAt = new Date();
    const messageId = `console-sms-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    console.info('━'.repeat(60));
    console.info('📱 SMS (Console Provider)');
    console.info('━'.repeat(60));
    console.info(`Idempotency Key: ${payload.idempotencyKey}`);
    console.info(`To: ${payload.recipient}`);
    console.info(`Template: ${payload.templateId}`);
    console.info(`Priority: ${payload.priority}`);
    console.info(`Correlation ID: ${payload.metadata.correlationId}`);
    console.info('─'.repeat(60));
    console.info(`Body: ${payload.body}`);
    console.info('━'.repeat(60));

    return {
      success: true,
      status: DeliveryStatus.SENT,
      providerMessageId: messageId,
      retryable: false,
      attemptedAt,
      attemptNumber: 0,
    };
  }
}
