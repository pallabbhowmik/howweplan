/**
 * Security Audit Logging Service
 * Records all security-relevant events for compliance and threat detection.
 */

import { getDbClient } from './database.js';
import { env } from '../env.js';

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT EVENT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export enum AuditEventType {
  // Authentication Events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  ALL_TOKENS_REVOKED = 'ALL_TOKENS_REVOKED',

  // Registration & Verification
  USER_REGISTERED = 'USER_REGISTERED',
  EMAIL_VERIFICATION_SENT = 'EMAIL_VERIFICATION_SENT',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',
  PHONE_VERIFICATION_SENT = 'PHONE_VERIFICATION_SENT',
  PHONE_VERIFIED = 'PHONE_VERIFIED',

  // Password Events
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
  PASSWORD_REHASHED = 'PASSWORD_REHASHED',

  // MFA Events
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_DISABLED = 'MFA_DISABLED',
  MFA_CHALLENGE_SUCCESS = 'MFA_CHALLENGE_SUCCESS',
  MFA_CHALLENGE_FAILURE = 'MFA_CHALLENGE_FAILURE',
  MFA_RECOVERY_USED = 'MFA_RECOVERY_USED',

  // Account Security Events
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  ACCOUNT_ACTIVATED = 'ACCOUNT_ACTIVATED',
  ACCOUNT_DEACTIVATED = 'ACCOUNT_DEACTIVATED',
  ACCOUNT_DELETED = 'ACCOUNT_DELETED',

  // Role & Permission Changes
  ROLE_CHANGED = 'ROLE_CHANGED',
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  PERMISSION_REVOKED = 'PERMISSION_REVOKED',

  // Profile Changes
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  EMAIL_CHANGED = 'EMAIL_CHANGED',
  PHONE_CHANGED = 'PHONE_CHANGED',

  // Suspicious Activity
  SUSPICIOUS_LOGIN = 'SUSPICIOUS_LOGIN',
  BRUTE_FORCE_DETECTED = 'BRUTE_FORCE_DETECTED',
  TOKEN_REUSE_DETECTED = 'TOKEN_REUSE_DETECTED',
  UNAUTHORIZED_ACCESS_ATTEMPT = 'UNAUTHORIZED_ACCESS_ATTEMPT',

  // Admin Actions
  ADMIN_USER_LOOKUP = 'ADMIN_USER_LOOKUP',
  ADMIN_USER_MODIFIED = 'ADMIN_USER_MODIFIED',
  ADMIN_FORCED_LOGOUT = 'ADMIN_FORCED_LOGOUT',
}

export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT EVENT INTERFACE
// ─────────────────────────────────────────────────────────────────────────────

export interface AuditEvent {
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string | null;
  targetUserId?: string | null;
  actorId?: string | null;
  actorRole?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  correlationId?: string | null;
  metadata?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOGGER CLASS
// ─────────────────────────────────────────────────────────────────────────────

class AuditLogger {
  private queue: AuditEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly batchSize = 50;
  private readonly flushIntervalMs = 5000;

  constructor() {
    // Start periodic flush
    this.flushInterval = setInterval(() => this.flush(), this.flushIntervalMs);
  }

  /**
   * Logs an audit event.
   */
  async log(event: AuditEvent): Promise<void> {
    // Add to queue for batch processing
    this.queue.push(event);

    // Also log to console for real-time monitoring
    this.logToConsole(event);

    // Flush if queue is full
    if (this.queue.length >= this.batchSize) {
      await this.flush();
    }
  }

  /**
   * Logs event to console with appropriate formatting.
   */
  private logToConsole(event: AuditEvent): void {
    const timestamp = new Date().toISOString();
    const level = event.severity === AuditSeverity.CRITICAL ? 'error' 
                : event.severity === AuditSeverity.WARNING ? 'warn' 
                : 'info';

    const logData = {
      timestamp,
      service: 'identity',
      type: 'AUDIT',
      event: event.eventType,
      severity: event.severity,
      success: event.success,
      userId: event.userId,
      targetUserId: event.targetUserId,
      actorId: event.actorId,
      ip: event.ipAddress,
      correlationId: event.correlationId,
      ...(event.errorMessage && { error: event.errorMessage }),
      ...(event.metadata && { metadata: event.metadata }),
    };

    console[level](JSON.stringify(logData));
  }

  /**
   * Flushes the queue to the database.
   */
  async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const events = this.queue.splice(0, this.batchSize);
    
    try {
      const db = getDbClient();
      
      const records = events.map(event => ({
        event_type: event.eventType,
        severity: event.severity,
        user_id: event.userId || null,
        target_user_id: event.targetUserId || null,
        actor_id: event.actorId || null,
        actor_role: event.actorRole || null,
        ip_address: event.ipAddress || null,
        user_agent: event.userAgent || null,
        correlation_id: event.correlationId || null,
        metadata: event.metadata || {},
        success: event.success,
        error_message: event.errorMessage || null,
        created_at: new Date().toISOString(),
      }));

      const { error } = await db.from('security_audit_logs').insert(records);
      
      if (error) {
        // Log error but don't throw - audit should not break the app
        console.error(`Failed to persist audit logs: ${error.message}`);
        // Re-queue failed events (with limit to prevent infinite growth)
        if (this.queue.length < 1000) {
          this.queue.unshift(...events);
        }
      }
    } catch (error) {
      console.error('Audit flush error:', error);
    }
  }

  /**
   * Graceful shutdown - flush remaining events.
   */
  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    await this.flush();
  }
}

// Singleton instance
export const auditLogger = new AuditLogger();

// ─────────────────────────────────────────────────────────────────────────────
// CONVENIENCE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

interface AuditContext {
  userId?: string | null;
  actorId?: string | null;
  actorRole?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  correlationId?: string | null;
}

/**
 * Logs a successful login.
 */
export async function auditLoginSuccess(
  userId: string,
  context: AuditContext,
  metadata?: Record<string, unknown>
): Promise<void> {
  await auditLogger.log({
    eventType: AuditEventType.LOGIN_SUCCESS,
    severity: AuditSeverity.INFO,
    userId,
    success: true,
    ...context,
    metadata,
  });
}

/**
 * Logs a failed login attempt.
 */
export async function auditLoginFailure(
  email: string,
  context: AuditContext,
  reason: string
): Promise<void> {
  await auditLogger.log({
    eventType: AuditEventType.LOGIN_FAILURE,
    severity: AuditSeverity.WARNING,
    userId: null,
    success: false,
    errorMessage: reason,
    ...context,
    metadata: { email: maskEmail(email) },
  });
}

/**
 * Logs a logout event.
 */
export async function auditLogout(
  userId: string,
  context: AuditContext,
  allDevices: boolean = false
): Promise<void> {
  await auditLogger.log({
    eventType: AuditEventType.LOGOUT,
    severity: AuditSeverity.INFO,
    userId,
    success: true,
    ...context,
    metadata: { allDevices },
  });
}

/**
 * Logs a password change.
 */
export async function auditPasswordChanged(
  userId: string,
  context: AuditContext
): Promise<void> {
  await auditLogger.log({
    eventType: AuditEventType.PASSWORD_CHANGED,
    severity: AuditSeverity.INFO,
    userId,
    success: true,
    ...context,
  });
}

/**
 * Logs an account lock.
 */
export async function auditAccountLocked(
  userId: string,
  context: AuditContext,
  reason: string,
  duration?: number
): Promise<void> {
  await auditLogger.log({
    eventType: AuditEventType.ACCOUNT_LOCKED,
    severity: AuditSeverity.WARNING,
    userId,
    success: true,
    ...context,
    metadata: { reason, durationSeconds: duration },
  });
}

/**
 * Logs a role change.
 */
export async function auditRoleChanged(
  targetUserId: string,
  oldRole: string,
  newRole: string,
  context: AuditContext
): Promise<void> {
  await auditLogger.log({
    eventType: AuditEventType.ROLE_CHANGED,
    severity: AuditSeverity.WARNING,
    userId: context.actorId,
    targetUserId,
    success: true,
    ...context,
    metadata: { oldRole, newRole },
  });
}

/**
 * Logs suspicious activity.
 */
export async function auditSuspiciousActivity(
  eventType: AuditEventType,
  context: AuditContext,
  details: Record<string, unknown>
): Promise<void> {
  await auditLogger.log({
    eventType,
    severity: AuditSeverity.CRITICAL,
    success: false,
    ...context,
    metadata: details,
  });
}

/**
 * Logs MFA events.
 */
export async function auditMfaEvent(
  eventType: AuditEventType,
  userId: string,
  context: AuditContext,
  success: boolean
): Promise<void> {
  await auditLogger.log({
    eventType,
    severity: success ? AuditSeverity.INFO : AuditSeverity.WARNING,
    userId,
    success,
    ...context,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Masks an email address for logging (privacy).
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  const maskedLocal = local.length > 2 
    ? local[0] + '***' + local[local.length - 1]
    : '***';
  return `${maskedLocal}@${domain}`;
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await auditLogger.shutdown();
});

process.on('SIGINT', async () => {
  await auditLogger.shutdown();
});
