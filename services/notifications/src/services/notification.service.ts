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
   * Professional HTML email templates for all notification types
   */
  private renderTemplate(templateId: string, variables: Record<string, unknown>): string {
    const templates: Record<string, (vars: Record<string, unknown>) => string> = {
      'password-reset': this.renderPasswordResetTemplate.bind(this),
      'user-welcome': this.renderWelcomeTemplate.bind(this),
      'email-verified': this.renderEmailVerifiedTemplate.bind(this),
      'booking-created': this.renderBookingCreatedTemplate.bind(this),
      'booking-confirmed-user': this.renderBookingConfirmedTemplate.bind(this),
      'itinerary-submitted': this.renderItinerarySubmittedTemplate.bind(this),
    };

    const renderer = templates[templateId];
    if (renderer) {
      return renderer(variables);
    }

    // Fallback for templates not yet implemented
    return this.renderGenericTemplate(templateId, variables);
  }

  /**
   * Base email wrapper with HowWePlan branding
   */
  private wrapEmailTemplate(content: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>HowWePlan</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f7fa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); padding: 12px 16px; border-radius: 12px;">
                    <span style="font-size: 24px; color: white;">✈️</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="font-size: 28px; font-weight: 700; color: #1e3a5f; letter-spacing: -0.5px;">HowWePlan</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                <tr>
                  <td style="padding: 40px;">
                    ${content}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 30px;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">
                © ${new Date().getFullYear()} HowWePlan. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                <a href="${env.FRONTEND_URL}/privacy" style="color: #6b7280; text-decoration: none;">Privacy Policy</a>
                &nbsp;•&nbsp;
                <a href="${env.FRONTEND_URL}/terms" style="color: #6b7280; text-decoration: none;">Terms of Service</a>
                &nbsp;•&nbsp;
                <a href="${env.FRONTEND_URL}/contact" style="color: #6b7280; text-decoration: none;">Contact Us</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Password Reset Email Template
   */
  private renderPasswordResetTemplate(variables: Record<string, unknown>): string {
    const firstName = String(variables.firstName || 'there');
    const resetToken = String(variables.resetToken || '');
    const expiresAt = variables.expiresAt ? new Date(String(variables.expiresAt)) : new Date();
    const expiresInMinutes = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 60000));
    
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(resetToken)}`;

    const content = `
      <h1 style="margin: 0 0 20px 0; font-size: 28px; font-weight: 700; color: #1e3a5f; text-align: center;">
        Reset Your Password
      </h1>
      <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.6; color: #4b5563; text-align: center;">
        Hi ${firstName},
      </p>
      <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #4b5563; text-align: center;">
        We received a request to reset your password. Click the button below to create a new password.
      </p>
      
      <!-- CTA Button -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td align="center" style="padding: 10px 0 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
              Reset Password
            </a>
          </td>
        </tr>
      </table>
      
      <!-- Expiry Warning -->
      <div style="background-color: #fef3c7; border-radius: 10px; padding: 16px; margin-bottom: 25px;">
        <p style="margin: 0; font-size: 14px; color: #92400e; text-align: center;">
          ⏰ This link expires in <strong>${expiresInMinutes} minutes</strong>
        </p>
      </div>
      
      <!-- Alternative Link -->
      <p style="margin: 0 0 15px 0; font-size: 14px; color: #6b7280; text-align: center;">
        If the button doesn't work, copy and paste this link into your browser:
      </p>
      <p style="margin: 0 0 25px 0; font-size: 12px; color: #3b82f6; word-break: break-all; text-align: center; background-color: #f3f4f6; padding: 12px; border-radius: 8px;">
        ${resetUrl}
      </p>
      
      <!-- Security Notice -->
      <div style="border-top: 1px solid #e5e7eb; padding-top: 25px;">
        <p style="margin: 0; font-size: 13px; color: #9ca3af; text-align: center;">
          🔒 If you didn't request this password reset, you can safely ignore this email.
          Your password will remain unchanged.
        </p>
      </div>
    `;

    return this.wrapEmailTemplate(content);
  }

  /**
   * Welcome Email Template
   */
  private renderWelcomeTemplate(variables: Record<string, unknown>): string {
    const firstName = String(variables.firstName || 'there');

    const content = `
      <div style="text-align: center; margin-bottom: 30px;">
        <span style="font-size: 64px;">🎉</span>
      </div>
      <h1 style="margin: 0 0 20px 0; font-size: 28px; font-weight: 700; color: #1e3a5f; text-align: center;">
        Welcome to HowWePlan!
      </h1>
      <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.6; color: #4b5563; text-align: center;">
        Hi ${firstName}, we're thrilled to have you join our community of travelers!
      </p>
      
      <div style="background: linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%); border-radius: 12px; padding: 25px; margin-bottom: 30px;">
        <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600; color: #1e3a5f;">
          What you can do with HowWePlan:
        </h3>
        <ul style="margin: 0; padding: 0 0 0 20px; color: #4b5563; font-size: 15px; line-height: 1.8;">
          <li>Create personalized trip requests</li>
          <li>Get matched with expert travel agents</li>
          <li>Receive custom itineraries tailored to you</li>
          <li>Book with confidence and protection</li>
        </ul>
      </div>
      
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td align="center">
            <a href="${env.FRONTEND_URL}/dashboard" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
              Start Planning Your Trip
            </a>
          </td>
        </tr>
      </table>
    `;

    return this.wrapEmailTemplate(content);
  }

  /**
   * Email Verified Template
   */
  private renderEmailVerifiedTemplate(variables: Record<string, unknown>): string {
    const firstName = String(variables.firstName || 'there');

    const content = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background-color: #d1fae5; border-radius: 50%; padding: 20px;">
          <span style="font-size: 48px;">✅</span>
        </div>
      </div>
      <h1 style="margin: 0 0 20px 0; font-size: 28px; font-weight: 700; color: #1e3a5f; text-align: center;">
        Email Verified!
      </h1>
      <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #4b5563; text-align: center;">
        Great news, ${firstName}! Your email has been successfully verified.
        You now have full access to all HowWePlan features.
      </p>
      
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td align="center">
            <a href="${env.FRONTEND_URL}/dashboard" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
              Go to Dashboard
            </a>
          </td>
        </tr>
      </table>
    `;

    return this.wrapEmailTemplate(content);
  }

  /**
   * Booking Created Template
   */
  private renderBookingCreatedTemplate(variables: Record<string, unknown>): string {
    const firstName = String(variables.firstName || 'there');
    const bookingId = String(variables.bookingId || '');
    const destination = String(variables.destination || 'your destination');

    const content = `
      <div style="text-align: center; margin-bottom: 30px;">
        <span style="font-size: 64px;">📋</span>
      </div>
      <h1 style="margin: 0 0 20px 0; font-size: 28px; font-weight: 700; color: #1e3a5f; text-align: center;">
        Booking Created!
      </h1>
      <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.6; color: #4b5563; text-align: center;">
        Hi ${firstName}, your booking for ${destination} has been created successfully.
      </p>
      
      <div style="background-color: #f3f4f6; border-radius: 10px; padding: 20px; margin-bottom: 30px; text-align: center;">
        <p style="margin: 0 0 5px 0; font-size: 14px; color: #6b7280;">Booking Reference</p>
        <p style="margin: 0; font-size: 24px; font-weight: 700; color: #1e3a5f; letter-spacing: 2px;">${bookingId.slice(0, 8).toUpperCase()}</p>
      </div>
      
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td align="center">
            <a href="${env.FRONTEND_URL}/bookings/${bookingId}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
              View Booking Details
            </a>
          </td>
        </tr>
      </table>
    `;

    return this.wrapEmailTemplate(content);
  }

  /**
   * Booking Confirmed Template
   */
  private renderBookingConfirmedTemplate(variables: Record<string, unknown>): string {
    const firstName = String(variables.firstName || 'there');
    const destination = String(variables.destination || 'your destination');
    const startDate = variables.startDate ? new Date(String(variables.startDate)).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';

    const content = `
      <div style="text-align: center; margin-bottom: 30px;">
        <span style="font-size: 64px;">🎊</span>
      </div>
      <h1 style="margin: 0 0 20px 0; font-size: 28px; font-weight: 700; color: #1e3a5f; text-align: center;">
        Your Trip is Confirmed!
      </h1>
      <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #4b5563; text-align: center;">
        Congratulations ${firstName}! Your trip to ${destination} is officially confirmed.
        ${startDate ? `Get ready for your adventure starting ${startDate}!` : ''}
      </p>
      
      <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 12px; padding: 25px; margin-bottom: 30px; text-align: center;">
        <p style="margin: 0; font-size: 18px; font-weight: 600; color: #065f46;">
          ✨ Everything is set for your journey!
        </p>
      </div>
      
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td align="center">
            <a href="${env.FRONTEND_URL}/dashboard" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
              View Trip Details
            </a>
          </td>
        </tr>
      </table>
    `;

    return this.wrapEmailTemplate(content);
  }

  /**
   * Itinerary Submitted Template
   */
  private renderItinerarySubmittedTemplate(variables: Record<string, unknown>): string {
    const firstName = String(variables.firstName || 'there');
    const agentName = String(variables.agentName || 'Your travel agent');
    const itineraryId = String(variables.itineraryId || '');

    const content = `
      <div style="text-align: center; margin-bottom: 30px;">
        <span style="font-size: 64px;">📝</span>
      </div>
      <h1 style="margin: 0 0 20px 0; font-size: 28px; font-weight: 700; color: #1e3a5f; text-align: center;">
        Your Itinerary is Ready!
      </h1>
      <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #4b5563; text-align: center;">
        Hi ${firstName}, ${agentName} has submitted a custom itinerary for your review.
        Take a look and let us know what you think!
      </p>
      
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td align="center">
            <a href="${env.FRONTEND_URL}/itineraries/${itineraryId}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
              Review Itinerary
            </a>
          </td>
        </tr>
      </table>
    `;

    return this.wrapEmailTemplate(content);
  }

  /**
   * Generic fallback template for unimplemented templates
   */
  private renderGenericTemplate(templateId: string, variables: Record<string, unknown>): string {
    const firstName = String(variables.firstName || 'there');
    
    const varsString = Object.entries(variables)
      .filter(([key]) => !['firstName', 'email'].includes(key))
      .map(([key, value]) => `<li><strong>${key}:</strong> ${String(value)}</li>`)
      .join('\n');

    const content = `
      <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #1e3a5f; text-align: center;">
        ${this.getDefaultSubject(templateId)}
      </h1>
      <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.6; color: #4b5563;">
        Hi ${firstName},
      </p>
      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4b5563;">
        You have a new notification from HowWePlan.
      </p>
      ${varsString ? `<ul style="color: #4b5563; line-height: 1.8;">${varsString}</ul>` : ''}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 30px;">
        <tr>
          <td align="center">
            <a href="${env.FRONTEND_URL}/dashboard" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 10px;">
              Go to Dashboard
            </a>
          </td>
        </tr>
      </table>
    `;

    return this.wrapEmailTemplate(content);
  }
}
