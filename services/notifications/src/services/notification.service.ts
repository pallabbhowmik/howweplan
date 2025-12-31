/**
 * Notification Service
 * 
 * Core service for sending notifications through various channels.
 * Implements:
 * - Idempotent sends (using idempotency keys)
 * - Rate limiting
 * - Delivery tracking
 * - Retry with exponential backoff
 * 
 * IMPORTANT: This service contains NO business logic.
 * It only handles the mechanics of notification delivery.
 */

import { env } from '../config/env';
import {
  DeliveryResult,
  DeliveryStatus,
  EmailPayload,
  NotificationChannel,
  NotificationMetadata,
  NotificationPriority,
  PushPayload,
  SmsPayload,
} from '../providers/types';
import { getEmailProvider } from '../providers/email';
import { getSmsProvider } from '../providers/sms';
import { getPushProvider } from '../providers/push';
import { DeliveryLogRepository } from '../repositories/delivery-log.repository';
import { RateLimiterService } from './rate-limiter.service';
import { AuditService } from './audit.service';
import { logger } from '../utils/logger';

export interface SendEmailInput {
  idempotencyKey: string;
  recipient: string;
  templateId: string;
  priority: NotificationPriority | string;
  variables: Record<string, unknown>;
  metadata: NotificationMetadata;
  subject?: string;
  textBody?: string;
  htmlBody?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

export interface SendSmsInput {
  idempotencyKey: string;
  recipient: string;
  templateId: string;
  priority: NotificationPriority | string;
  body: string;
  variables: Record<string, unknown>;
  metadata: NotificationMetadata;
}

export interface SendPushInput {
  idempotencyKey: string;
  recipient: string;
  templateId: string;
  priority: NotificationPriority | string;
  title: string;
  body: string;
  variables: Record<string, unknown>;
  metadata: NotificationMetadata;
  deepLink?: string;
  badge?: number;
  data?: Record<string, string>;
}

export class NotificationService {
  private readonly deliveryLogRepo: DeliveryLogRepository;
  private readonly rateLimiter: RateLimiterService;
  private readonly auditService: AuditService;

  constructor(
    deliveryLogRepo: DeliveryLogRepository,
    rateLimiter: RateLimiterService,
    auditService: AuditService
  ) {
    this.deliveryLogRepo = deliveryLogRepo;
    this.rateLimiter = rateLimiter;
    this.auditService = auditService;
  }

  /**
   * Send an email notification
   */
  async sendEmail(input: SendEmailInput): Promise<DeliveryResult> {
    if (!env.ENABLE_EMAIL) {
      logger.debug('Email notifications disabled, skipping', {
        idempotencyKey: input.idempotencyKey,
      });
      return this.createSkippedResult();
    }

    // Check idempotency
    const existing = await this.deliveryLogRepo.checkIdempotency(input.idempotencyKey);
    if (existing) {
      logger.debug('Duplicate notification detected', {
        idempotencyKey: input.idempotencyKey,
        existingStatus: existing.status,
      });

      // Return existing result for idempotent sends
      if (existing.status === DeliveryStatus.SENT || existing.status === DeliveryStatus.DELIVERED) {
        return {
          success: true,
          status: existing.status,
          providerMessageId: existing.providerMessageId,
          retryable: false,
          attemptedAt: existing.lastAttemptAt,
          attemptNumber: existing.attemptCount,
        };
      }
    }

    // Check rate limit
    if (this.rateLimiter.isRateLimited(NotificationChannel.EMAIL, input.recipient)) {
      logger.warn('Rate limit exceeded', {
        channel: NotificationChannel.EMAIL,
        recipient: input.recipient,
        resetInSeconds: this.rateLimiter.getResetTime(NotificationChannel.EMAIL, input.recipient),
      });

      const result: DeliveryResult = {
        success: false,
        status: DeliveryStatus.RATE_LIMITED,
        errorMessage: 'Rate limit exceeded',
        retryable: true,
        attemptedAt: new Date(),
        attemptNumber: 0,
      };

      await this.recordDeliveryAttempt(input, NotificationChannel.EMAIL, result);
      return result;
    }

    // Create delivery log entry if new
    if (!existing) {
      await this.deliveryLogRepo.create({
        idempotencyKey: input.idempotencyKey,
        channel: NotificationChannel.EMAIL,
        recipient: input.recipient,
        templateId: input.templateId,
        priority: input.priority as NotificationPriority,
        metadata: input.metadata,
      });
    }

    // Build email payload
    const payload: EmailPayload = {
      idempotencyKey: input.idempotencyKey,
      channel: NotificationChannel.EMAIL,
      recipient: input.recipient,
      priority: input.priority as NotificationPriority,
      templateId: input.templateId,
      variables: input.variables,
      metadata: input.metadata,
      subject: input.subject ?? this.getDefaultSubject(input.templateId),
      textBody: input.textBody,
      htmlBody: input.htmlBody ?? this.renderTemplate(input.templateId, input.variables),
      replyTo: input.replyTo,
      cc: input.cc,
      bcc: input.bcc,
    };

    // Send via provider
    const provider = getEmailProvider();
    const result = await provider.send(payload);

    // Record delivery attempt
    await this.recordDeliveryAttempt(input, NotificationChannel.EMAIL, result);

    // Record rate limit on success
    if (result.success) {
      this.rateLimiter.recordSend(NotificationChannel.EMAIL, input.recipient);
    }

    return result;
  }

  /**
   * Send an SMS notification
   */
  async sendSms(input: SendSmsInput): Promise<DeliveryResult> {
    if (!env.ENABLE_SMS || !env.SMS_ENABLED) {
      logger.debug('SMS notifications disabled, skipping', {
        idempotencyKey: input.idempotencyKey,
      });
      return this.createSkippedResult();
    }

    // Check idempotency
    const existing = await this.deliveryLogRepo.checkIdempotency(input.idempotencyKey);
    if (existing && (existing.status === DeliveryStatus.SENT || existing.status === DeliveryStatus.DELIVERED)) {
      return {
        success: true,
        status: existing.status,
        providerMessageId: existing.providerMessageId,
        retryable: false,
        attemptedAt: existing.lastAttemptAt,
        attemptNumber: existing.attemptCount,
      };
    }

    // Check rate limit
    if (this.rateLimiter.isRateLimited(NotificationChannel.SMS, input.recipient)) {
      const result: DeliveryResult = {
        success: false,
        status: DeliveryStatus.RATE_LIMITED,
        errorMessage: 'Rate limit exceeded',
        retryable: true,
        attemptedAt: new Date(),
        attemptNumber: 0,
      };

      await this.recordDeliveryAttempt(input, NotificationChannel.SMS, result);
      return result;
    }

    // Create delivery log entry if new
    if (!existing) {
      await this.deliveryLogRepo.create({
        idempotencyKey: input.idempotencyKey,
        channel: NotificationChannel.SMS,
        recipient: input.recipient,
        templateId: input.templateId,
        priority: input.priority as NotificationPriority,
        metadata: input.metadata,
      });
    }

    // Build SMS payload
    const payload: SmsPayload = {
      idempotencyKey: input.idempotencyKey,
      channel: NotificationChannel.SMS,
      recipient: input.recipient,
      priority: input.priority as NotificationPriority,
      templateId: input.templateId,
      variables: input.variables,
      metadata: input.metadata,
      body: input.body,
    };

    // Send via provider
    const provider = getSmsProvider();
    const result = await provider.send(payload);

    // Record delivery attempt
    await this.recordDeliveryAttempt(input, NotificationChannel.SMS, result);

    // Record rate limit on success
    if (result.success) {
      this.rateLimiter.recordSend(NotificationChannel.SMS, input.recipient);
    }

    return result;
  }

  /**
   * Send a push notification
   */
  async sendPush(input: SendPushInput): Promise<DeliveryResult> {
    if (!env.ENABLE_PUSH || !env.PUSH_ENABLED) {
      logger.debug('Push notifications disabled, skipping', {
        idempotencyKey: input.idempotencyKey,
      });
      return this.createSkippedResult();
    }

    // Check idempotency
    const existing = await this.deliveryLogRepo.checkIdempotency(input.idempotencyKey);
    if (existing && (existing.status === DeliveryStatus.SENT || existing.status === DeliveryStatus.DELIVERED)) {
      return {
        success: true,
        status: existing.status,
        providerMessageId: existing.providerMessageId,
        retryable: false,
        attemptedAt: existing.lastAttemptAt,
        attemptNumber: existing.attemptCount,
      };
    }

    // Check rate limit
    if (this.rateLimiter.isRateLimited(NotificationChannel.PUSH, input.recipient)) {
      const result: DeliveryResult = {
        success: false,
        status: DeliveryStatus.RATE_LIMITED,
        errorMessage: 'Rate limit exceeded',
        retryable: true,
        attemptedAt: new Date(),
        attemptNumber: 0,
      };

      await this.recordDeliveryAttempt(input, NotificationChannel.PUSH, result);
      return result;
    }

    // Create delivery log entry if new
    if (!existing) {
      await this.deliveryLogRepo.create({
        idempotencyKey: input.idempotencyKey,
        channel: NotificationChannel.PUSH,
        recipient: input.recipient,
        templateId: input.templateId,
        priority: input.priority as NotificationPriority,
        metadata: input.metadata,
      });
    }

    // Build push payload
    const payload: PushPayload = {
      idempotencyKey: input.idempotencyKey,
      channel: NotificationChannel.PUSH,
      recipient: input.recipient,
      priority: input.priority as NotificationPriority,
      templateId: input.templateId,
      variables: input.variables,
      metadata: input.metadata,
      title: input.title,
      body: input.body,
      deepLink: input.deepLink,
      badge: input.badge,
      data: input.data,
    };

    // Send via provider
    const provider = getPushProvider();
    const result = await provider.send(payload);

    // Record delivery attempt
    await this.recordDeliveryAttempt(input, NotificationChannel.PUSH, result);

    // Record rate limit on success
    if (result.success) {
      this.rateLimiter.recordSend(NotificationChannel.PUSH, input.recipient);
    }

    return result;
  }

  /**
   * Record delivery attempt in logs
   */
  private async recordDeliveryAttempt(
    input: { idempotencyKey: string; metadata: NotificationMetadata },
    channel: NotificationChannel,
    result: DeliveryResult
  ): Promise<void> {
    try {
      await this.deliveryLogRepo.updateStatus(input.idempotencyKey, result);

      if (env.ENABLE_DELIVERY_TRACKING) {
        await this.auditService.log({
          eventType: result.success ? 'notification.delivered' : 'notification.failed',
          entityType: 'notification',
          entityId: input.idempotencyKey,
          action: `${channel}_delivery_attempt`,
          actorId: 'system',
          correlationId: input.metadata.correlationId,
          metadata: {
            channel,
            status: result.status,
            providerMessageId: result.providerMessageId,
            errorMessage: result.errorMessage,
            attemptNumber: result.attemptNumber,
          },
        });
      }
    } catch (error) {
      logger.error('Failed to record delivery attempt', {
        idempotencyKey: input.idempotencyKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Create a skipped result for disabled channels
   */
  private createSkippedResult(): DeliveryResult {
    return {
      success: true,
      status: DeliveryStatus.SKIPPED,
      retryable: false,
      attemptedAt: new Date(),
      attemptNumber: 0,
    };
  }

  /**
   * Get default subject for template
   * In production, this would load from a template store
   */
  private getDefaultSubject(templateId: string): string {
    const subjects: Record<string, string> = {
      'booking-created': 'Your HowWePlan Booking Has Been Created',
      'booking-confirmed-user': 'Your Trip is Confirmed!',
      'booking-confirmed-agent': 'Booking Confirmed - Action Required',
      'booking-cancelled-user': 'Your Booking Has Been Cancelled',
      'booking-cancelled-agent': 'Booking Cancellation Notice',
      'payment-received': 'Payment Confirmation',
      'payment-failed': 'Payment Failed - Action Required',
      'agent-assigned': 'New Trip Assignment',
      'agent-confirmed-user': 'Your Travel Agent Has Confirmed',
      'itinerary-submitted': 'Your Itinerary is Ready for Review',
      'itinerary-revision-requested': 'Revision Requested for Itinerary',
      'chat-message-received': 'New Message on HowWePlan',
      'refund-requested-user': 'Refund Request Received',
      'refund-requested-agent': 'Refund Request Filed',
      'refund-approved': 'Your Refund Has Been Approved',
      'refund-rejected': 'Refund Request Update',
      'dispute-opened-user': 'Dispute Filed Successfully',
      'dispute-opened-agent': 'Dispute Filed Against Booking',
      'dispute-opened-admin': 'URGENT: Dispute Requires Arbitration',
      'dispute-resolved-user': 'Your Dispute Has Been Resolved',
      'dispute-resolved-agent': 'Dispute Resolution Notice',
      'user-welcome': 'Welcome to HowWePlan!',
      'password-reset': 'Reset Your Password',
      'email-verified': 'Email Verified Successfully',
    };

    return subjects[templateId] ?? 'Notification from HowWePlan';
  }

  /**
   * Render email template
   * In production, this would use a proper templating engine
   */
  private renderTemplate(templateId: string, variables: Record<string, unknown>): string {
    // Placeholder: In production, load and render actual templates
    const varsString = Object.entries(variables)
      .map(([key, value]) => `<p><strong>${key}:</strong> ${String(value)}</p>`)
      .join('\n');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${templateId}</title>
        </head>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h1>HowWePlan</h1>
          <p>Template: ${templateId}</p>
          <hr>
          ${varsString}
          <hr>
          <p style="color: #666; font-size: 12px;">
            This is an automated message from HowWePlan.
          </p>
        </body>
      </html>
    `;
  }
}
