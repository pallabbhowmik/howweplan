/**
 * Delivery Log Repository
 * 
 * Tracks notification delivery attempts for:
 * - Idempotency checking
 * - Delivery status tracking
 * - Audit trail
 * - Retry management
 */

import { Pool } from 'pg';
import { env } from '../config/env';
import {
  DeliveryResult,
  DeliveryStatus,
  NotificationChannel,
  NotificationMetadata,
  NotificationPriority,
} from '../providers/types';
import { logger } from '../utils/logger';

export interface DeliveryLogEntry {
  id: string;
  idempotencyKey: string;
  channel: NotificationChannel;
  recipient: string;
  templateId: string;
  priority: NotificationPriority;
  status: DeliveryStatus;
  providerMessageId?: string;
  errorMessage?: string;
  errorCode?: string;
  attemptCount: number;
  lastAttemptAt: Date;
  metadata: NotificationMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDeliveryLogInput {
  idempotencyKey: string;
  channel: NotificationChannel;
  recipient: string;
  templateId: string;
  priority: NotificationPriority;
  metadata: NotificationMetadata;
}

export class DeliveryLogRepository {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: env.DATABASE_URL,
      min: env.DATABASE_POOL_MIN,
      max: env.DATABASE_POOL_MAX,
    });
  }

  /**
   * Initialize database schema
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS delivery_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          idempotency_key VARCHAR(255) NOT NULL UNIQUE,
          channel VARCHAR(50) NOT NULL,
          recipient VARCHAR(255) NOT NULL,
          template_id VARCHAR(100) NOT NULL,
          priority VARCHAR(20) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          provider_message_id VARCHAR(255),
          error_message TEXT,
          error_code VARCHAR(50),
          attempt_count INTEGER NOT NULL DEFAULT 0,
          last_attempt_at TIMESTAMPTZ,
          metadata JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_delivery_logs_idempotency_key 
          ON delivery_logs(idempotency_key);
        CREATE INDEX IF NOT EXISTS idx_delivery_logs_status 
          ON delivery_logs(status);
        CREATE INDEX IF NOT EXISTS idx_delivery_logs_recipient 
          ON delivery_logs(recipient);
        CREATE INDEX IF NOT EXISTS idx_delivery_logs_created_at 
          ON delivery_logs(created_at);
        CREATE INDEX IF NOT EXISTS idx_delivery_logs_correlation_id 
          ON delivery_logs((metadata->>'correlationId'));
      `);

      logger.info('Delivery logs table initialized');
    } finally {
      client.release();
    }
  }

  /**
   * Check if a notification with this idempotency key already exists
   * Returns the existing entry if found, null otherwise
   */
  async checkIdempotency(idempotencyKey: string): Promise<DeliveryLogEntry | null> {
    const result = await this.pool.query(
      `SELECT * FROM delivery_logs WHERE idempotency_key = $1`,
      [idempotencyKey]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToEntry(result.rows[0]);
  }

  /**
   * Create a new delivery log entry
   */
  async create(input: CreateDeliveryLogInput): Promise<DeliveryLogEntry> {
    const result = await this.pool.query(
      `INSERT INTO delivery_logs (
        idempotency_key, channel, recipient, template_id, priority, status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        input.idempotencyKey,
        input.channel,
        input.recipient,
        input.templateId,
        input.priority,
        DeliveryStatus.PENDING,
        JSON.stringify(input.metadata),
      ]
    );

    return this.mapRowToEntry(result.rows[0]);
  }

  /**
   * Update delivery status after attempt
   */
  async updateStatus(
    idempotencyKey: string,
    result: DeliveryResult
  ): Promise<DeliveryLogEntry | null> {
    const updateResult = await this.pool.query(
      `UPDATE delivery_logs SET
        status = $2,
        provider_message_id = COALESCE($3, provider_message_id),
        error_message = $4,
        error_code = $5,
        attempt_count = attempt_count + 1,
        last_attempt_at = $6,
        updated_at = NOW()
      WHERE idempotency_key = $1
      RETURNING *`,
      [
        idempotencyKey,
        result.status,
        result.providerMessageId,
        result.errorMessage,
        result.errorCode,
        result.attemptedAt,
      ]
    );

    if (updateResult.rows.length === 0) {
      return null;
    }

    return this.mapRowToEntry(updateResult.rows[0]);
  }

  /**
   * Get entries pending retry
   */
  async getPendingRetries(limit: number = 100): Promise<DeliveryLogEntry[]> {
    const result = await this.pool.query(
      `SELECT * FROM delivery_logs 
       WHERE status = $1 
         AND attempt_count < $2
         AND (last_attempt_at IS NULL OR last_attempt_at < NOW() - INTERVAL '1 minute')
       ORDER BY created_at ASC
       LIMIT $3`,
      [DeliveryStatus.FAILED, env.MAX_RETRY_ATTEMPTS, limit]
    );

    return result.rows.map(this.mapRowToEntry);
  }

  /**
   * Get delivery logs by correlation ID
   */
  async getByCorrelationId(correlationId: string): Promise<DeliveryLogEntry[]> {
    const result = await this.pool.query(
      `SELECT * FROM delivery_logs 
       WHERE metadata->>'correlationId' = $1
       ORDER BY created_at ASC`,
      [correlationId]
    );

    return result.rows.map(this.mapRowToEntry);
  }

  /**
   * Get delivery logs by recipient
   */
  async getByRecipient(
    recipient: string,
    limit: number = 50
  ): Promise<DeliveryLogEntry[]> {
    const result = await this.pool.query(
      `SELECT * FROM delivery_logs 
       WHERE recipient = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [recipient, limit]
    );

    return result.rows.map(this.mapRowToEntry);
  }

  /**
   * Get delivery statistics
   */
  async getStatistics(since: Date): Promise<{
    total: number;
    byStatus: Record<DeliveryStatus, number>;
    byChannel: Record<NotificationChannel, number>;
  }> {
    const result = await this.pool.query(
      `SELECT 
        COUNT(*) as total,
        status,
        channel
       FROM delivery_logs 
       WHERE created_at >= $1
       GROUP BY status, channel`,
      [since]
    );

    const stats = {
      total: 0,
      byStatus: {} as Record<DeliveryStatus, number>,
      byChannel: {} as Record<NotificationChannel, number>,
    };

    for (const row of result.rows) {
      const count = parseInt(row.total, 10);
      stats.total += count;

      stats.byStatus[row.status as DeliveryStatus] =
        (stats.byStatus[row.status as DeliveryStatus] || 0) + count;

      stats.byChannel[row.channel as NotificationChannel] =
        (stats.byChannel[row.channel as NotificationChannel] || 0) + count;
    }

    return stats;
  }

  /**
   * Close database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Map database row to entry object
   */
  private mapRowToEntry(row: Record<string, unknown>): DeliveryLogEntry {
    return {
      id: row.id as string,
      idempotencyKey: row.idempotency_key as string,
      channel: row.channel as NotificationChannel,
      recipient: row.recipient as string,
      templateId: row.template_id as string,
      priority: row.priority as NotificationPriority,
      status: row.status as DeliveryStatus,
      providerMessageId: row.provider_message_id as string | undefined,
      errorMessage: row.error_message as string | undefined,
      errorCode: row.error_code as string | undefined,
      attemptCount: row.attempt_count as number,
      lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at as string) : new Date(),
      metadata: row.metadata as NotificationMetadata,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
