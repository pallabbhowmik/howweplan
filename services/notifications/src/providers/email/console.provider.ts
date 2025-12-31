import {
  DeliveryResult,
  DeliveryStatus,
  EmailPayload,
  EmailProvider,
  NotificationChannel,
} from '../types';

/**
 * Console Email Provider
 * 
 * Development-only provider that logs emails to console.
 * Used when EMAIL_PROVIDER=console or in test environments.
 */
export class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console';
  readonly channel = NotificationChannel.EMAIL;

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async send(payload: EmailPayload): Promise<DeliveryResult> {
    const attemptedAt = new Date();
    const messageId = `console-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    console.info('━'.repeat(60));
    console.info('📧 EMAIL (Console Provider)');
    console.info('━'.repeat(60));
    console.info(`Idempotency Key: ${payload.idempotencyKey}`);
    console.info(`To: ${payload.recipient}`);
    console.info(`Subject: ${payload.subject}`);
    console.info(`Template: ${payload.templateId}`);
    console.info(`Priority: ${payload.priority}`);
    console.info(`Correlation ID: ${payload.metadata.correlationId}`);
    
    if (payload.cc?.length) {
      console.info(`CC: ${payload.cc.join(', ')}`);
    }
    if (payload.bcc?.length) {
      console.info(`BCC: ${payload.bcc.join(', ')}`);
    }
    if (payload.replyTo) {
      console.info(`Reply-To: ${payload.replyTo}`);
    }
    
    console.info('─'.repeat(60));
    console.info('Variables:', JSON.stringify(payload.variables, null, 2));
    
    if (payload.textBody) {
      console.info('─'.repeat(60));
      console.info('Text Body:');
      console.info(payload.textBody);
    }
    
    if (payload.htmlBody) {
      console.info('─'.repeat(60));
      console.info('HTML Body:');
      console.info(payload.htmlBody.slice(0, 500) + (payload.htmlBody.length > 500 ? '...' : ''));
    }
    
    if (payload.attachments?.length) {
      console.info('─'.repeat(60));
      console.info(`Attachments: ${payload.attachments.map((a) => a.filename).join(', ')}`);
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
