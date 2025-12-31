/**
 * Audit Service
 * 
 * Records all state changes and actions for compliance.
 * Every mutation MUST be audit logged.
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { config } from '../env';
import { AuditEvent, AuditAction, AuditActor, AuditChange, AuditContext } from '../events/audit.events';
import { Logger } from './logger.service';

export interface AuditService {
  log(params: AuditLogParams): Promise<void>;
}

export interface AuditLogParams {
  action: AuditAction;
  entityId: string;
  actor: AuditActor;
  changes?: AuditChange[];
  context: AuditContext;
}

interface AuditRow {
  id: string;
  timestamp: string;
  service: string;
  action: string;
  entity_type: string;
  entity_id: string;
  actor_type: string;
  actor_id: string;
  actor_ip: string | null;
  actor_user_agent: string | null;
  changes: string;
  correlation_id: string;
  reason: string | null;
  metadata: string | null;
}

export function createAuditService(logger: Logger): AuditService {
  const supabase = createClient(
    config.database.supabaseUrl,
    config.database.supabaseServiceRoleKey
  );

  return {
    async log(params: AuditLogParams): Promise<void> {
      if (!config.observability.auditEnabled) {
        logger.debug('Audit logging disabled, skipping', { action: params.action });
        return;
      }

      const auditEvent: AuditEvent = {
        auditId: randomUUID(),
        timestamp: new Date().toISOString(),
        service: config.app.serviceName,
        action: params.action,
        entityType: 'TravelRequest',
        entityId: params.entityId,
        actor: params.actor,
        changes: params.changes ?? [],
        context: params.context,
      };

      const row: AuditRow = {
        id: auditEvent.auditId,
        timestamp: auditEvent.timestamp,
        service: auditEvent.service,
        action: auditEvent.action,
        entity_type: auditEvent.entityType,
        entity_id: auditEvent.entityId,
        actor_type: auditEvent.actor.type,
        actor_id: auditEvent.actor.id,
        actor_ip: auditEvent.actor.ip ?? null,
        actor_user_agent: auditEvent.actor.userAgent ?? null,
        changes: JSON.stringify(auditEvent.changes),
        correlation_id: auditEvent.context.correlationId,
        reason: auditEvent.context.reason ?? null,
        metadata: auditEvent.context.metadata ? JSON.stringify(auditEvent.context.metadata) : null,
      };

      const { error } = await supabase
        .from('audit_logs')
        .insert(row);

      if (error) {
        // Don't throw - audit failures shouldn't break business operations
        // But log prominently for investigation
        logger.error('Failed to write audit log', {
          error: error.message,
          auditId: auditEvent.auditId,
          action: params.action,
          entityId: params.entityId,
        });
        return;
      }

      logger.debug('Audit log recorded', {
        auditId: auditEvent.auditId,
        action: params.action,
        entityId: params.entityId,
      });
    },
  };
}
