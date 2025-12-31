import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { query, withTransaction } from './connection';
import {
  AuditEvent,
  CreateAuditEvent,
  StoredAuditEvent,
  AuditEventSchema,
} from '../schema/audit-event.schema';
import {
  AuditQueryFilters,
  Pagination,
  AuditQueryResponse,
  AuditStatisticsResponse,
} from '../schema/query.schema';
import { env } from '../config/env';

/**
 * Sort options for queries
 */
interface SortOptions {
  field: 'timestamp' | 'sequenceNumber' | 'eventType' | 'severity';
  direction: 'asc' | 'desc';
}

/**
 * Compute SHA-256 checksum for audit event integrity
 */
function computeChecksum(event: AuditEvent): string {
  const data = [
    event.id,
    event.correlationId,
    event.eventType,
    event.timestamp,
    JSON.stringify(event.actor),
    JSON.stringify(event.resource),
    event.action,
    event.reason,
  ].join('');

  return createHash('sha256').update(data).digest('hex');
}

/**
 * Audit Event Repository
 * Implements append-only storage with no update/delete operations
 */
export class AuditRepository {
  /**
   * Store a new audit event
   * This is the ONLY write operation allowed
   */
  async store(input: CreateAuditEvent): Promise<StoredAuditEvent> {
    // Generate immutable fields
    const event: AuditEvent = {
      ...input,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    };

    // Validate the complete event
    const validated = AuditEventSchema.parse(event);
    const checksum = computeChecksum(validated);

    const sql = `
      INSERT INTO audit_events (
        id, correlation_id, causation_id,
        event_type, event_version, category, severity,
        timestamp, actor, resource,
        action, reason, state_change, metadata,
        source, gdpr_relevant, pii_contained, retention_category,
        checksum
      ) VALUES (
        $1, $2, $3,
        $4, $5, $6, $7,
        $8, $9, $10,
        $11, $12, $13, $14,
        $15, $16, $17, $18,
        $19
      )
      RETURNING *, sequence_number, stored_at
    `;

    const params = [
      validated.id,
      validated.correlationId,
      validated.causationId || null,
      validated.eventType,
      validated.eventVersion,
      validated.category,
      validated.severity,
      validated.timestamp,
      JSON.stringify(validated.actor),
      JSON.stringify(validated.resource),
      validated.action,
      validated.reason,
      validated.stateChange ? JSON.stringify(validated.stateChange) : null,
      validated.metadata ? JSON.stringify(validated.metadata) : null,
      JSON.stringify(validated.source),
      validated.gdprRelevant,
      validated.piiContained,
      validated.retentionCategory,
      checksum,
    ];

    const result = await query<StoredAuditEvent>(sql, params);
    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to store audit event');
    }
    return this.mapRowToEvent(row);
  }

  /**
   * Store multiple audit events atomically
   */
  async storeBatch(inputs: CreateAuditEvent[]): Promise<StoredAuditEvent[]> {
    return withTransaction(async (client) => {
      const results: StoredAuditEvent[] = [];

      for (const input of inputs) {
        const event: AuditEvent = {
          ...input,
          id: uuidv4(),
          timestamp: new Date().toISOString(),
        };

        const validated = AuditEventSchema.parse(event);
        const checksum = computeChecksum(validated);

        const sql = `
          INSERT INTO audit_events (
            id, correlation_id, causation_id,
            event_type, event_version, category, severity,
            timestamp, actor, resource,
            action, reason, state_change, metadata,
            source, gdpr_relevant, pii_contained, retention_category,
            checksum
          ) VALUES (
            $1, $2, $3,
            $4, $5, $6, $7,
            $8, $9, $10,
            $11, $12, $13, $14,
            $15, $16, $17, $18,
            $19
          )
          RETURNING *, sequence_number, stored_at
        `;

        const params = [
          validated.id,
          validated.correlationId,
          validated.causationId || null,
          validated.eventType,
          validated.eventVersion,
          validated.category,
          validated.severity,
          validated.timestamp,
          JSON.stringify(validated.actor),
          JSON.stringify(validated.resource),
          validated.action,
          validated.reason,
          validated.stateChange ? JSON.stringify(validated.stateChange) : null,
          validated.metadata ? JSON.stringify(validated.metadata) : null,
          JSON.stringify(validated.source),
          validated.gdprRelevant,
          validated.piiContained,
          validated.retentionCategory,
          checksum,
        ];

        const result = await client.query(sql, params);
        results.push(this.mapRowToEvent(result.rows[0]));
      }

      return results;
    });
  }

  /**
   * Find event by ID
   */
  async findById(id: string): Promise<StoredAuditEvent | null> {
    const sql = `SELECT * FROM audit_events WHERE id = $1`;
    const result = await query<StoredAuditEvent>(sql, [id]);
    
    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return this.mapRowToEvent(row);
  }

  /**
   * Find events by correlation ID
   */
  async findByCorrelationId(
    correlationId: string,
    pagination?: Pagination
  ): Promise<AuditQueryResponse> {
    const page = pagination?.page ?? 1;
    const pageSize = Math.min(pagination?.pageSize ?? env.DEFAULT_PAGE_SIZE, env.MAX_PAGE_SIZE);
    const offset = (page - 1) * pageSize;

    const countSql = `SELECT COUNT(*) FROM audit_events WHERE correlation_id = $1`;
    const countResult = await query<{ count: string }>(countSql, [correlationId]);
    const totalItems = parseInt(countResult.rows[0]?.count ?? '0', 10);

    const sql = `
      SELECT * FROM audit_events 
      WHERE correlation_id = $1 
      ORDER BY sequence_number ASC
      LIMIT $2 OFFSET $3
    `;
    const result = await query<StoredAuditEvent>(sql, [correlationId, pageSize, offset]);

    return this.buildQueryResponse(result.rows, page, pageSize, totalItems);
  }

  /**
   * Find events by resource
   */
  async findByResource(
    resourceType: string,
    resourceId: string,
    pagination?: Pagination
  ): Promise<AuditQueryResponse> {
    const page = pagination?.page ?? 1;
    const pageSize = Math.min(pagination?.pageSize ?? env.DEFAULT_PAGE_SIZE, env.MAX_PAGE_SIZE);
    const offset = (page - 1) * pageSize;

    const countSql = `
      SELECT COUNT(*) FROM audit_events 
      WHERE resource_type = $1 AND resource_id = $2
    `;
    const countResult = await query<{ count: string }>(countSql, [resourceType, resourceId]);
    const totalItems = parseInt(countResult.rows[0]?.count ?? '0', 10);

    const sql = `
      SELECT * FROM audit_events 
      WHERE resource_type = $1 AND resource_id = $2
      ORDER BY occurred_at DESC
      LIMIT $3 OFFSET $4
    `;
    const result = await query<StoredAuditEvent>(sql, [resourceType, resourceId, pageSize, offset]);

    return this.buildQueryResponse(result.rows, page, pageSize, totalItems);
  }

  /**
   * Find events by actor
   */
  async findByActor(
    actorId: string,
    pagination?: Pagination
  ): Promise<AuditQueryResponse> {
    const page = pagination?.page ?? 1;
    const pageSize = Math.min(pagination?.pageSize ?? env.DEFAULT_PAGE_SIZE, env.MAX_PAGE_SIZE);
    const offset = (page - 1) * pageSize;

    const countSql = `SELECT COUNT(*) FROM audit_events WHERE actor_id = $1`;
    const countResult = await query<{ count: string }>(countSql, [actorId]);
    const totalItems = parseInt(countResult.rows[0]?.count ?? '0', 10);

    const sql = `
      SELECT * FROM audit_events 
      WHERE actor_id = $1
      ORDER BY occurred_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await query<StoredAuditEvent>(sql, [actorId, pageSize, offset]);

    return this.buildQueryResponse(result.rows, page, pageSize, totalItems);
  }

  /**
   * Query events with filters
   */
  async query(
    filters?: AuditQueryFilters,
    pagination?: Pagination,
    sort?: SortOptions
  ): Promise<AuditQueryResponse> {
    const startTime = Date.now();
    const page = pagination?.page ?? 1;
    const pageSize = Math.min(pagination?.pageSize ?? env.DEFAULT_PAGE_SIZE, env.MAX_PAGE_SIZE);
    const offset = (page - 1) * pageSize;
    const sortField = sort?.field ?? 'timestamp';
    const sortDirection = sort?.direction ?? 'desc';

    const { whereClause, params } = this.buildWhereClause(filters);
    
    // Count query
    const countSql = `SELECT COUNT(*) FROM audit_events ${whereClause}`;
    const countResult = await query<{ count: string }>(countSql, params);
    const totalItems = parseInt(countResult.rows[0]?.count ?? '0', 10);

    // Data query
    const sortColumn = this.getSortColumn(sortField);
    const dataSql = `
      SELECT * FROM audit_events 
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection.toUpperCase()}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const result = await query<StoredAuditEvent>(dataSql, [...params, pageSize, offset]);

    const response = this.buildQueryResponse(result.rows, page, pageSize, totalItems);
    response.query.durationMs = Date.now() - startTime;

    return response;
  }

  /**
   * Get audit statistics
   */
  async getStatistics(dateRange?: { from?: string; to?: string }): Promise<AuditStatisticsResponse> {
    const from = dateRange?.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const to = dateRange?.to ?? new Date().toISOString();

    const [
      totalsResult,
      eventTypeResult,
      dailyResult,
      topTypesResult,
      topActorsResult,
    ] = await Promise.all([
      query<{ total: string }>(`
        SELECT COUNT(*) as total FROM audit_events
        WHERE occurred_at BETWEEN $1 AND $2
      `, [from, to]),
      
      query<{ event_type: string; count: string }>(`
        SELECT event_type, COUNT(*) as count FROM audit_events
        WHERE occurred_at BETWEEN $1 AND $2
        GROUP BY event_type
      `, [from, to]),
      
      query<{ date: string; count: string }>(`
        SELECT DATE(occurred_at) as date, COUNT(*) as count FROM audit_events
        WHERE occurred_at BETWEEN $1 AND $2
        GROUP BY DATE(occurred_at)
        ORDER BY date DESC
        LIMIT 30
      `, [from, to]),
      
      query<{ event_type: string; count: string }>(`
        SELECT event_type, COUNT(*) as count FROM audit_events
        WHERE occurred_at BETWEEN $1 AND $2
        GROUP BY event_type
        ORDER BY count DESC
        LIMIT 10
      `, [from, to]),
      
      query<{ actor_id: string; actor_type: string; count: string }>(`
        SELECT actor_id, actor_type, COUNT(*) as count 
        FROM audit_events
        WHERE occurred_at BETWEEN $1 AND $2 AND actor_id IS NOT NULL
        GROUP BY actor_id, actor_type
        ORDER BY count DESC
        LIMIT 10
      `, [from, to]),
    ]);

    // Build eventsByCategory from event_type grouped by prefix
    const eventsByCategory: Record<string, number> = {};
    for (const row of eventTypeResult.rows) {
      const category = row.event_type.split('.')[0] || 'other';
      eventsByCategory[category] = (eventsByCategory[category] || 0) + parseInt(row.count, 10);
    }

    return {
      totalEvents: parseInt(totalsResult.rows[0]?.total ?? '0', 10),
      eventsByCategory,
      eventsBySeverity: {}, // No severity column in current schema
      eventsPerDay: dailyResult.rows.map(r => ({
        date: r.date,
        count: parseInt(r.count, 10),
      })),
      topEventTypes: topTypesResult.rows.map(r => ({
        eventType: r.event_type,
        count: parseInt(r.count, 10),
      })),
      topActors: topActorsResult.rows.map(r => ({
        actorId: r.actor_id || 'unknown',
        actorType: r.actor_type || 'system',
        count: parseInt(r.count, 10),
      })),
      dateRange: { from, to },
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Build WHERE clause from filters - adapted for actual DB schema
   */
  private buildWhereClause(filters?: AuditQueryFilters): { whereClause: string; params: unknown[] } {
    if (!filters) {
      return { whereClause: '', params: [] };
    }

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.eventTypes?.length) {
      conditions.push(`event_type = ANY($${paramIndex})`);
      params.push(filters.eventTypes);
      paramIndex++;
    }

    // Categories filter based on event_type prefix (e.g., 'request.submitted' -> 'request')
    if (filters.categories?.length) {
      const categoryConditions = filters.categories.map((_, i) => `event_type LIKE $${paramIndex + i} || '.%'`);
      conditions.push(`(${categoryConditions.join(' OR ')})`);
      params.push(...filters.categories);
      paramIndex += filters.categories.length;
    }

    // No severity column in actual schema - ignore this filter
    // if (filters.severities?.length) { ... }

    if (filters.actorTypes?.length) {
      conditions.push(`actor_type = ANY($${paramIndex})`);
      params.push(filters.actorTypes);
      paramIndex++;
    }

    if (filters.actorIds?.length) {
      conditions.push(`actor_id = ANY($${paramIndex})`);
      params.push(filters.actorIds);
      paramIndex++;
    }

    if (filters.resourceTypes?.length) {
      conditions.push(`resource_type = ANY($${paramIndex})`);
      params.push(filters.resourceTypes);
      paramIndex++;
    }

    if (filters.resourceIds?.length) {
      conditions.push(`resource_id = ANY($${paramIndex})`);
      params.push(filters.resourceIds);
      paramIndex++;
    }

    if (filters.correlationId) {
      conditions.push(`correlation_id = $${paramIndex}`);
      params.push(filters.correlationId);
      paramIndex++;
    }

    if (filters.causationId) {
      conditions.push(`causation_id = $${paramIndex}`);
      params.push(filters.causationId);
      paramIndex++;
    }

    if (filters.dateRange?.from) {
      conditions.push(`occurred_at >= $${paramIndex}`);
      params.push(filters.dateRange.from);
      paramIndex++;
    }

    if (filters.dateRange?.to) {
      conditions.push(`occurred_at <= $${paramIndex}`);
      params.push(filters.dateRange.to);
      paramIndex++;
    }

    // No gdpr_relevant, pii_contained columns in actual schema - ignore
    // No retention_category column in actual schema - ignore

    if (filters.services?.length) {
      conditions.push(`source_service = ANY($${paramIndex})`);
      params.push(filters.services);
      paramIndex++;
    }

    if (filters.searchText) {
      conditions.push(`(description ILIKE $${paramIndex} OR reason ILIKE $${paramIndex} OR metadata::text ILIKE $${paramIndex})`);
      params.push(`%${filters.searchText}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, params };
  }

  /**
   * Get sort column name - adapted for actual DB schema
   */
  private getSortColumn(field: string): string {
    const columnMap: Record<string, string> = {
      timestamp: 'occurred_at',
      sequenceNumber: 'id', // No sequence_number in actual schema
      eventType: 'event_type',
      severity: 'event_type', // No severity in actual schema, fallback to event_type
    };
    return columnMap[field] || 'occurred_at';
  }

  /**
   * Build query response with pagination
   */
  private buildQueryResponse(
    rows: StoredAuditEvent[],
    page: number,
    pageSize: number,
    totalItems: number
  ): AuditQueryResponse {
    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      data: rows.map(row => this.mapRowToEvent(row)),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      query: {
        executedAt: new Date().toISOString(),
        durationMs: 0,
      },
    };
  }

  /**
   * Map database row to event object - adapted for actual DB schema
   */
  private mapRowToEvent(row: Record<string, unknown>): StoredAuditEvent {
    const eventType = row.event_type as string;
    const category = eventType.split('.')[0] || 'other';
    const actorType = (row.actor_type as string) || 'system';
    const validActorTypes = ['user', 'agent', 'admin', 'system', 'service'] as const;
    const normalizedActorType = validActorTypes.includes(actorType as typeof validActorTypes[number]) 
      ? actorType as typeof validActorTypes[number]
      : 'system' as const;
    
    return {
      id: row.id as string,
      correlationId: row.correlation_id as string || '',
      causationId: row.causation_id as string | undefined,
      eventType,
      eventVersion: row.event_version as string || '1.0.0',
      category: category as StoredAuditEvent['category'],
      severity: 'info' as StoredAuditEvent['severity'], // Default, no column in DB
      timestamp: row.occurred_at ? (row.occurred_at as Date).toISOString() : new Date().toISOString(),
      actor: {
        type: normalizedActorType,
        id: row.actor_id as string || 'unknown',
      },
      resource: {
        type: row.resource_type as string || 'unknown',
        id: row.resource_id as string || 'unknown',
      },
      action: row.action as string,
      reason: row.reason as string || row.description as string || '',
      stateChange: row.previous_state || row.new_state ? {
        before: row.previous_state ? (typeof row.previous_state === 'string' ? JSON.parse(row.previous_state) : row.previous_state) : undefined,
        after: row.new_state ? (typeof row.new_state === 'string' ? JSON.parse(row.new_state) : row.new_state) : undefined,
      } : undefined,
      metadata: row.metadata
        ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata)
        : undefined,
      source: {
        service: row.source_service as string || 'unknown',
        version: '1.0.0',
      },
      gdprRelevant: false, // No column in DB
      piiContained: false, // No column in DB
      retentionCategory: 'standard' as StoredAuditEvent['retentionCategory'],
      sequenceNumber: 0, // No column in DB
      storedAt: row.created_at ? (row.created_at as Date).toISOString() : new Date().toISOString(),
      checksum: '', // No column in DB
    };
  }
}

// Singleton instance
export const auditRepository = new AuditRepository();
