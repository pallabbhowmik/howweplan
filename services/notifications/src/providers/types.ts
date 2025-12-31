/**
 * Notification Channel Types
 * Defines the contracts for all notification delivery channels
 */

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum DeliveryStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced',
  RATE_LIMITED = 'rate_limited',
  SKIPPED = 'skipped',
}

/**
 * Base notification payload
 */
export interface NotificationPayload {
  /** Unique identifier for idempotency */
  idempotencyKey: string;
  /** Notification channel */
  channel: NotificationChannel;
  /** Recipient identifier (email, phone, device token) */
  recipient: string;
  /** Notification priority */
  priority: NotificationPriority;
  /** Template identifier */
  templateId: string;
  /** Template variables */
  variables: Record<string, unknown>;
  /** Metadata for tracking */
  metadata: NotificationMetadata;
}

export interface NotificationMetadata {
  /** Source event that triggered this notification */
  sourceEventId: string;
  /** Source event type */
  sourceEventType: string;
  /** User ID if applicable */
  userId?: string;
  /** Booking ID if applicable */
  bookingId?: string;
  /** Agent ID if applicable */
  agentId?: string;
  /** Correlation ID for tracing */
  correlationId: string;
  /** Timestamp when notification was created */
  createdAt: Date;
}

/**
 * Email-specific payload
 */
export interface EmailPayload extends NotificationPayload {
  channel: NotificationChannel.EMAIL;
  /** Email subject */
  subject: string;
  /** Plain text body (fallback) */
  textBody?: string;
  /** HTML body */
  htmlBody?: string;
  /** Reply-to address override */
  replyTo?: string;
  /** CC recipients */
  cc?: string[];
  /** BCC recipients */
  bcc?: string[];
  /** Attachment references */
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded
  contentType: string;
}

/**
 * SMS-specific payload
 */
export interface SmsPayload extends NotificationPayload {
  channel: NotificationChannel.SMS;
  /** SMS message body */
  body: string;
}

/**
 * Push notification payload
 */
export interface PushPayload extends NotificationPayload {
  channel: NotificationChannel.PUSH;
  /** Push notification title */
  title: string;
  /** Push notification body */
  body: string;
  /** Deep link URL */
  deepLink?: string;
  /** Badge count */
  badge?: number;
  /** Additional data payload */
  data?: Record<string, string>;
}

/**
 * Delivery result from provider
 */
export interface DeliveryResult {
  success: boolean;
  status: DeliveryStatus;
  /** Provider-specific message ID */
  providerMessageId?: string;
  /** Error message if failed */
  errorMessage?: string;
  /** Error code if failed */
  errorCode?: string;
  /** Whether the error is retryable */
  retryable: boolean;
  /** Timestamp of delivery attempt */
  attemptedAt: Date;
  /** Number of retry attempt (0 for first attempt) */
  attemptNumber: number;
}

/**
 * Provider interface
 * All notification providers must implement this interface
 */
export interface NotificationProvider<T extends NotificationPayload> {
  /** Provider name for logging */
  readonly name: string;
  /** Supported channel */
  readonly channel: NotificationChannel;
  /** Check if provider is healthy */
  healthCheck(): Promise<boolean>;
  /** Send notification */
  send(payload: T): Promise<DeliveryResult>;
}

/**
 * Email provider interface
 */
export type EmailProvider = NotificationProvider<EmailPayload>;

/**
 * SMS provider interface
 */
export type SmsProvider = NotificationProvider<SmsPayload>;

/**
 * Push provider interface
 */
export type PushProvider = NotificationProvider<PushPayload>;
