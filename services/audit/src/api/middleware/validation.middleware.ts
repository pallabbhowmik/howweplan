import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError, type ZodSchema } from 'zod';

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

/**
 * Validate request body against a Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.body = schema.parse(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Request body validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        } as ErrorResponse);
      }
      throw error;
    }
  };
}

/**
 * Validate request query parameters against a Zod schema
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.query = schema.parse(request.query) as typeof request.query;
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Query parameter validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        } as ErrorResponse);
      }
      throw error;
    }
  };
}

/**
 * Validate request params against a Zod schema
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.params = schema.parse(request.params) as typeof request.params;
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Path parameter validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        } as ErrorResponse);
      }
      throw error;
    }
  };
}

/**
 * Global error handler plugin
 */
export async function errorHandler(fastify: FastifyInstance): Promise<void> {
  fastify.setErrorHandler((error, request, reply) => {
    const requestId = request.id;

    // Log the error
    request.log.error({
      err: error,
      requestId,
      url: request.url,
      method: request.method,
    });

    // Zod validation errors
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Request validation failed',
        details: error.errors,
        requestId,
      } as ErrorResponse);
    }

    // Fastify validation errors
    if (error.validation) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: error.message,
        details: error.validation,
        requestId,
      } as ErrorResponse);
    }

    // Custom application errors
    if ('statusCode' in error && typeof error.statusCode === 'number') {
      return reply.status(error.statusCode).send({
        error: error.name || 'Error',
        message: error.message,
        requestId,
      } as ErrorResponse);
    }

    // Default 500 error
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      requestId,
    } as ErrorResponse);
  });
}
