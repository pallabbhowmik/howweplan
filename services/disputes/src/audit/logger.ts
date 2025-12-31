/**
 * Audit Logger
 * 
 * This module provides structured logging and audit trail functionality.
 * Every state change MUST emit an audit event per business rules.
 * All admin actions require a reason and are audit-logged.
 */

import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { config, env } from '../env.js';
import { AuditLogEntry } from '../types/domain.js';

/**
 * Create the base pino logger instance.
 */
const loggerOptions: pino.LoggerOptions = {
  name: config.service.name,
  level: config.logging.level,
  base: {
    service: config.service.name,
    version: config.service.version,
    env: env.NODE_ENV,
  },
};

if (config.logging.format === 'pretty') {
  loggerOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  };
}

const baseLogger = pino(loggerOptions);

/**
 * Logger instance with service context.
 */
export const logger = baseLogger;

/**
 * Audit log entry creation parameters.
 */
export interface CreateAuditLogParams {
  entityType: 'dispute' | 'evidence' | 'resolution';
  entityId: string;
  action: string;
  actorType: 'traveler' | 'agent' | 'admin' | 'system';
  actorId: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * In-memory audit log store for development.
 * In production, this would write to a database.
 */
const auditLogStore: AuditLogEntry[] = [];

/**
 * Create an audit log entry.
 * This is called for every state change per business rules.
 */
export async function createAuditLog(
  params: CreateAuditLogParams
): Promise<AuditLogEntry> {
  const entry: AuditLogEntry = {
    id: uuidv4(),
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    actorType: params.actorType,
    actorId: params.actorId,
    previousState: params.previousState ?? null,
    newState: params.newState ?? null,
    reason: params.reason ?? null,
    ipAddress: params.ipAddress ?? null,
    userAgent: params.userAgent ?? null,
    createdAt: new Date(),
  };

  if (config.audit.enabled) {
    // Log to structured logger
    logger.info({
      msg: 'Audit log entry created',
      audit: {
        id: entry.id,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        actorType: entry.actorType,
        actorId: entry.actorId,
        reason: entry.reason,
      },
    });

    // Store based on destination
    switch (config.audit.destination) {
      case 'database':
        // In production, this would write to database
        auditLogStore.push(entry);
        break;
      case 'stdout':
        console.log(JSON.stringify(entry));
        break;
      case 'file':
        // In production, this would write to a file
        auditLogStore.push(entry);
        break;
    }
  }

  return entry;
}

/**
 * Query audit logs for an entity.
 */
export async function getAuditLogs(
  entityType: AuditLogEntry['entityType'],
  entityId: string
): Promise<AuditLogEntry[]> {
  return auditLogStore.filter(
    (log) => log.entityType === entityType && log.entityId === entityId
  );
}

/**
 * Query audit logs by actor.
 */
export async function getAuditLogsByActor(
  actorId: string,
  actorType?: AuditLogEntry['actorType']
): Promise<AuditLogEntry[]> {
  return auditLogStore.filter(
    (log) =>
      log.actorId === actorId &&
      (actorType === undefined || log.actorType === actorType)
  );
}

/**
 * Create an admin action audit log.
 * All admin actions require a reason per business rules.
 */
export async function auditAdminAction(params: {
  entityType: 'dispute' | 'evidence' | 'resolution';
  entityId: string;
  action: string;
  adminId: string;
  reason: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<AuditLogEntry> {
  if (!params.reason?.trim()) {
    throw new Error('Admin actions require a reason for audit logging');
  }

  return createAuditLog({
    ...params,
    actorType: 'admin',
    actorId: params.adminId,
  });
}

/**
 * Request-scoped logger with correlation ID.
 */
export function createRequestLogger(correlationId: string) {
  return logger.child({ correlationId });
}

/**
 * Create a child logger with additional context.
 */
export function createChildLogger(
  context: Record<string, unknown>
): pino.Logger {
  return logger.child(context);
}
