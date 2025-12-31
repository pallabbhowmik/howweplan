import {
  DeliveryResult,
  DeliveryStatus,
  NotificationChannel,
  PushPayload,
  PushProvider,
} from '../types';

/**
 * Console Push Provider
 * 
 * Development-only provider that logs push notifications to console.
 * Used when PUSH_PROVIDER=console or in test environments.
 */
export class ConsolePushProvider implements PushProvider {
  readonly name = 'console';
  readonly channel = NotificationChannel.PUSH;

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async send(payload: PushPayload): Promise<DeliveryResult> {
    const attemptedAt = new Date();
    const messageId = `console-push-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    console.info('━'.repeat(60));
    console.info('🔔 PUSH NOTIFICATION (Console Provider)');
    console.info('━'.repeat(60));
    console.info(`Idempotency Key: ${payload.idempotencyKey}`);
    console.info(`To (Device Token): ${payload.recipient.slice(0, 20)}...`);
    console.info(`Template: ${payload.templateId}`);
    console.info(`Priority: ${payload.priority}`);
    console.info(`Correlation ID: ${payload.metadata.correlationId}`);
    console.info('─'.repeat(60));
    console.info(`Title: ${payload.title}`);
    console.info(`Body: ${payload.body}`);
    
    if (payload.deepLink) {
      console.info(`Deep Link: ${payload.deepLink}`);
    }
    if (payload.badge !== undefined) {
      console.info(`Badge: ${payload.badge}`);
    }
    if (payload.data) {
      console.info('Data:', JSON.stringify(payload.data, null, 2));
    }
    
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
