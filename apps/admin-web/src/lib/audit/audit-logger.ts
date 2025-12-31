/**
 * Client-Side Audit Logger
 * 
 * Emits audit events for all admin actions.
 * Events are sent to the backend for persistent storage.
 */

import type { AuditCategory, AuditSeverity, AuditEvent } from '@/types';

// ============================================================================
// AUDIT EMITTER INTERFACE
// ============================================================================

export interface AuditEmitParams {
  readonly category: AuditCategory;
  readonly severity: AuditSeverity;
  readonly action: string;
  readonly targetType?: string;
  readonly targetId?: string;
  readonly reason: string;
  readonly metadata?: Record<string, unknown>;
  readonly correlationId: string;
  readonly previousState?: Record<string, unknown>;
  readonly newState?: Record<string, unknown>;
}

export interface AuditEmitResult {
  readonly success: boolean;
  readonly eventId?: string;
  readonly error?: string;
}

// ============================================================================
// AUDIT QUEUE (For Offline/Retry Support)
// ============================================================================

interface QueuedAuditEvent {
  readonly params: AuditEmitParams;
  readonly timestamp: string;
  readonly retryCount: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

let auditQueue: QueuedAuditEvent[] = [];
let isProcessingQueue = false;

// ============================================================================
// AUDIT LOGGER CLASS
// ============================================================================

class AuditLogger {
  private apiBaseUrl: string;
  private adminId: string | null = null;
  private adminEmail: string | null = null;

  constructor() {
    // Will be set from env at runtime
    this.apiBaseUrl = '';
  }

  /**
   * Initialize the logger with configuration.
   * Must be called before emitting events.
   */
  initialize(config: {
    apiBaseUrl: string;
    adminId: string;
    adminEmail: string;
  }): void {
    this.apiBaseUrl = config.apiBaseUrl;
    this.adminId = config.adminId;
    this.adminEmail = config.adminEmail;
  }

  /**
   * Emit an audit event.
   * Events are sent immediately but queued for retry on failure.
   */
  async emit(params: AuditEmitParams): Promise<AuditEmitResult> {
    if (!this.adminId) {
      console.error('[Audit] Logger not initialized');
      return { success: false, error: 'Audit logger not initialized' };
    }

    const event = this.buildEvent(params);
    
    try {
      const result = await this.sendEvent(event);
      return result;
    } catch (error) {
      // Queue for retry
      this.queueEvent(params);
      console.error('[Audit] Failed to emit event, queued for retry:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Build the complete audit event from params.
   */
  private buildEvent(params: AuditEmitParams): Omit<AuditEvent, 'id'> {
    return {
      timestamp: new Date().toISOString(),
      category: params.category,
      severity: params.severity,
      action: params.action,
      actorType: 'admin',
      actorId: this.adminId!,
      actorEmail: this.adminEmail,
      targetType: params.targetType ?? null,
      targetId: params.targetId ?? null,
      reason: params.reason,
      metadata: params.metadata ?? {},
      ipAddress: null, // Set by backend
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      correlationId: params.correlationId,
      previousState: params.previousState ?? null,
      newState: params.newState ?? null,
    };
  }

  /**
   * Send event to backend API.
   */
  private async sendEvent(event: Omit<AuditEvent, 'id'>): Promise<AuditEmitResult> {
    const response = await fetch(`${this.apiBaseUrl}/admin/audit/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to emit audit event: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return { success: true, eventId: data.eventId };
  }

  /**
   * Queue event for retry.
   */
  private queueEvent(params: AuditEmitParams): void {
    auditQueue.push({
      params,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    });

    // Start processing queue if not already running
    if (!isProcessingQueue) {
      this.processQueue();
    }
  }

  /**
   * Process queued events with exponential backoff.
   */
  private async processQueue(): Promise<void> {
    if (isProcessingQueue || auditQueue.length === 0) return;
    
    isProcessingQueue = true;

    while (auditQueue.length > 0) {
      const item = auditQueue[0];
      
      if (item.retryCount >= MAX_RETRIES) {
        console.error('[Audit] Max retries exceeded for event:', item.params.action);
        auditQueue.shift();
        continue;
      }

      try {
        const event = this.buildEvent(item.params);
        await this.sendEvent(event);
        auditQueue.shift(); // Remove successful event
      } catch {
        // Increment retry count and wait
        auditQueue[0] = { ...item, retryCount: item.retryCount + 1 };
        await new Promise(resolve => 
          setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, item.retryCount))
        );
      }
    }

    isProcessingQueue = false;
  }

  /**
   * Get count of queued events (for UI indicator).
   */
  getQueuedCount(): number {
    return auditQueue.length;
  }

  /**
   * Force flush all queued events.
   */
  async flush(): Promise<void> {
    await this.processQueue();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const auditLogger = new AuditLogger();
