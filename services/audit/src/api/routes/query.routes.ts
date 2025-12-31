import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { auditRepository } from '../../database/index';

/**
 * Query API routes for audit events
 * All routes require admin authentication
 */
export async function queryRoutes(fastify: FastifyInstance): Promise<void> {
  // Get the preHandler, falling back to empty array if not available (dev mode)
  const adminPreHandler = fastify.authenticateAdmin ? [fastify.authenticateAdmin] : [];

  /**
   * GET /events
   * Query audit events with filters
   */
  fastify.get(
    '/events',
    {
      preHandler: adminPreHandler,
      schema: {
        description: 'Query audit events with filters, pagination, and sorting',
        tags: ['audit-events'],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            pageSize: { type: 'number' },
            sortField: { type: 'string' },
            sortDirection: { type: 'string' },
            eventTypes: { type: 'string' },
            categories: { type: 'string' },
            severities: { type: 'string' },
            actorIds: { type: 'string' },
            resourceTypes: { type: 'string' },
            resourceIds: { type: 'string' },
            correlationId: { type: 'string' },
            dateFrom: { type: 'string' },
            dateTo: { type: 'string' },
            searchText: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as Record<string, string>;

      // Parse query parameters into filter structure
      const filters = {
        eventTypes: query.eventTypes?.split(',').filter(Boolean),
        categories: query.categories?.split(',').filter(Boolean),
        severities: query.severities?.split(',').filter(Boolean),
        actorIds: query.actorIds?.split(',').filter(Boolean),
        resourceTypes: query.resourceTypes?.split(',').filter(Boolean),
        resourceIds: query.resourceIds?.split(',').filter(Boolean),
        correlationId: query.correlationId,
        dateRange: query.dateFrom || query.dateTo ? {
          from: query.dateFrom,
          to: query.dateTo,
        } : undefined,
        searchText: query.searchText,
      };

      const pagination = {
        page: parseInt(query.page || '1', 10),
        pageSize: parseInt(query.pageSize || '50', 10),
      };

      const sort = {
        field: (query.sortField || 'timestamp') as 'timestamp' | 'sequenceNumber' | 'eventType' | 'severity',
        direction: (query.sortDirection || 'desc') as 'asc' | 'desc',
      };

      // Remove undefined values from filters
      const cleanedFilters = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== undefined && v !== null)
      );

      const result = await auditRepository.query(
        Object.keys(cleanedFilters).length > 0 ? cleanedFilters : undefined,
        pagination,
        sort
      );

      // Log the query for audit (meta-audit)
      request.log.info({
        action: 'audit_query',
        admin: request.admin,
        filters: cleanedFilters,
        pagination,
        resultCount: result.pagination.totalItems,
      });

      return reply.status(200).send(result);
    }
  );

  /**
   * GET /events/:id
   * Get a single audit event by ID
   */
  fastify.get(
    '/events/:id',
    {
      preHandler: adminPreHandler,
      schema: {
        description: 'Get a single audit event by ID',
        tags: ['audit-events'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const event = await auditRepository.findById(id);

      if (!event) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Audit event with ID ${id} not found`,
        });
      }

      request.log.info({
        action: 'audit_event_view',
        admin: request.admin,
        eventId: id,
      });

      return reply.status(200).send({ data: event });
    }
  );

  /**
   * GET /events/correlation/:correlationId
   * Get all events with the same correlation ID
   */
  fastify.get(
    '/events/correlation/:correlationId',
    {
      preHandler: adminPreHandler,
      schema: {
        description: 'Get all audit events with the same correlation ID',
        tags: ['audit-events'],
        params: {
          type: 'object',
          properties: {
            correlationId: { type: 'string', format: 'uuid' },
          },
          required: ['correlationId'],
        },
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            pageSize: { type: 'number' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { correlationId } = request.params as { correlationId: string };
      const { page, pageSize } = request.query as { page?: number; pageSize?: number };

      const result = await auditRepository.findByCorrelationId(correlationId, {
        page: page ?? 1,
        pageSize: pageSize ?? 50,
      });

      request.log.info({
        action: 'audit_correlation_query',
        admin: request.admin,
        correlationId,
        resultCount: result.pagination.totalItems,
      });

      return reply.status(200).send(result);
    }
  );

  /**
   * GET /resources/:type/:id/history
   * Get audit history for a specific resource
   */
  fastify.get(
    '/resources/:type/:id/history',
    {
      preHandler: adminPreHandler,
      schema: {
        description: 'Get audit history for a specific resource',
        tags: ['audit-events'],
        params: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            id: { type: 'string' },
          },
          required: ['type', 'id'],
        },
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            pageSize: { type: 'number' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { type, id } = request.params as { type: string; id: string };
      const { page, pageSize } = request.query as { page?: number; pageSize?: number };

      const result = await auditRepository.findByResource(type, id, {
        page: page ?? 1,
        pageSize: pageSize ?? 50,
      });

      request.log.info({
        action: 'audit_resource_history',
        admin: request.admin,
        resourceType: type,
        resourceId: id,
        resultCount: result.pagination.totalItems,
      });

      return reply.status(200).send(result);
    }
  );

  /**
   * GET /actors/:id/activity
   * Get audit activity for a specific actor
   */
  fastify.get(
    '/actors/:id/activity',
    {
      preHandler: adminPreHandler,
      schema: {
        description: 'Get audit activity for a specific actor',
        tags: ['audit-events'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            pageSize: { type: 'number' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { page, pageSize } = request.query as { page?: number; pageSize?: number };

      const result = await auditRepository.findByActor(id, {
        page: page ?? 1,
        pageSize: pageSize ?? 50,
      });

      request.log.info({
        action: 'audit_actor_activity',
        admin: request.admin,
        actorId: id,
        resultCount: result.pagination.totalItems,
      });

      return reply.status(200).send(result);
    }
  );

  /**
   * GET /statistics
   * Get audit statistics and aggregations
   */
  fastify.get(
    '/statistics',
    {
      preHandler: adminPreHandler,
      schema: {
        description: 'Get audit statistics and aggregations',
        tags: ['audit-events'],
        querystring: {
          type: 'object',
          properties: {
            from: { type: 'string', format: 'date-time' },
            to: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { from, to } = request.query as { from?: string; to?: string };

      const statistics = await auditRepository.getStatistics({ from, to });

      request.log.info({
        action: 'audit_statistics_view',
        admin: request.admin,
        dateRange: { from, to },
      });

      return reply.status(200).send({ data: statistics });
    }
  );
}
