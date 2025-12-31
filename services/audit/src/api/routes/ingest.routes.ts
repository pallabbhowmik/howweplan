import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { auditRepository } from '../../database/index';
import { CreateAuditEventSchema } from '../../schema/index';

/**
 * Internal API routes for ingesting audit events
 * These routes are used by other services via the event bus or direct HTTP
 * Requires service authentication
 */
export async function ingestRoutes(fastify: FastifyInstance): Promise<void> {
  // Get the preHandler, falling back to empty array if not available (dev mode)
  const servicePreHandler = fastify.authenticateService ? [fastify.authenticateService] : [];

  /**
   * POST /ingest
   * Ingest a single audit event
   * For service-to-service calls
   */
  fastify.post(
    '/ingest',
    {
      preHandler: servicePreHandler,
      schema: {
        description: 'Ingest a single audit event (internal service use)',
        tags: ['audit-ingest'],
        body: {
          type: 'object',
          required: ['eventType', 'correlationId', 'category', 'actor', 'resource', 'action', 'reason', 'source'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const validationResult = CreateAuditEventSchema.safeParse(request.body);

      if (!validationResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Invalid audit event payload',
          details: validationResult.error.errors,
        });
      }

      const event = await auditRepository.store(validationResult.data);

      request.log.info({
        action: 'audit_event_ingested',
        service: request.service,
        eventId: event.id,
        eventType: event.eventType,
      });

      return reply.status(201).send({
        success: true,
        data: {
          id: event.id,
          sequenceNumber: event.sequenceNumber,
          storedAt: event.storedAt,
        },
      });
    }
  );

  /**
   * POST /ingest/batch
   * Ingest multiple audit events atomically
   * For bulk operations
   */
  fastify.post(
    '/ingest/batch',
    {
      preHandler: servicePreHandler,
      schema: {
        description: 'Ingest multiple audit events atomically (internal service use)',
        tags: ['audit-ingest'],
        body: {
          type: 'object',
          properties: {
            events: {
              type: 'array',
              maxItems: 100,
            },
          },
          required: ['events'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as { events?: unknown[] };
      const events = body.events;

      if (!Array.isArray(events) || events.length === 0) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Events array is required and must not be empty',
        });
      }

      if (events.length > 100) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Maximum 100 events per batch',
        });
      }

      // Validate all events first
      const validatedEvents = [];
      const errors = [];

      for (let i = 0; i < events.length; i++) {
        const result = CreateAuditEventSchema.safeParse(events[i]);
        if (result.success) {
          validatedEvents.push(result.data);
        } else {
          errors.push({
            index: i,
            errors: result.error.errors,
          });
        }
      }

      if (errors.length > 0) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: `${errors.length} event(s) failed validation`,
          details: errors,
        });
      }

      // Store all events atomically
      const storedEvents = await auditRepository.storeBatch(validatedEvents);

      request.log.info({
        action: 'audit_batch_ingested',
        service: request.service,
        count: storedEvents.length,
      });

      return reply.status(201).send({
        success: true,
        data: {
          count: storedEvents.length,
          events: storedEvents.map(e => ({
            id: e.id,
            sequenceNumber: e.sequenceNumber,
            storedAt: e.storedAt,
          })),
        },
      });
    }
  );
}
