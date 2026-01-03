/**
 * Booking Controller
 *
 * HTTP handlers for booking operations.
 */

import type { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { bookingService } from '../services/booking.service.js';
import { createRequestLogger } from '../services/logger.service.js';
import {
  validateInput,
  createBookingSchema,
  cancelBookingSchema,
} from '../validators/request.validators.js';
import { formatErrorResponse, ValidationError } from '../utils/errors.js';
import type { EventMetadata } from '../types/events.types.js';

/** Extract metadata from request for audit purposes */
function extractMetadata(req: Request, actorId: string, actorType: EventMetadata['actorType']): EventMetadata {
  const ipAddress = req.ip;
  const userAgent = req.get('user-agent');
  return {
    actorId,
    actorType,
    ...(ipAddress && { ipAddress }),
    ...(userAgent && { userAgent }),
  };
}

/** List bookings for authenticated user */
export async function listUserBookings(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const correlationId = (req.headers['x-correlation-id'] as string) ?? uuid();
  const logger = createRequestLogger(correlationId);

  try {
    // User ID comes from the gateway's auth headers
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string | undefined;

    logger.info({ userId, userRole, limit, offset, status }, 'Listing user bookings');

    // Query bookings from database
    const bookings = await bookingService.listUserBookings(userId, userRole, { limit, offset, status });

    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          limit,
          offset,
          hasMore: bookings.length === limit,
        },
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to list bookings');
    const formatted = formatErrorResponse(error);
    res.status(formatted.statusCode).json(formatted);
  }
}

/** Create a new booking */
export async function createBooking(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const correlationId = (req.headers['x-correlation-id'] as string) ?? uuid();
  const logger = createRequestLogger(correlationId);

  try {
    // Validate input
    const validation = validateInput(createBookingSchema, req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error);
    }

    const dto = validation.data;
    const metadata = extractMetadata(req, dto.userId, 'user');

    logger.info({ userId: dto.userId, agentId: dto.agentId }, 'Creating booking');

    const result = await bookingService.createBooking(dto, metadata);

    if ('error' in result) {
      res.status(400).json({ error: result.error });
      return;
    }

    const responseDto = bookingService.toResponseDTO(result);
    res.status(201).json(responseDto);
  } catch (error) {
    logger.error({ error }, 'Failed to create booking');
    const formatted = formatErrorResponse(error);
    res.status(formatted.statusCode).json(formatted);
  }
}

/** Get booking by ID */
export async function getBooking(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const correlationId = (req.headers['x-correlation-id'] as string) ?? uuid();
  const logger = createRequestLogger(correlationId);

  try {
    const { bookingId } = req.params;

    if (!bookingId) {
      throw new ValidationError('bookingId is required');
    }

    logger.info({ bookingId }, 'Getting booking');

    // In production, this would fetch from database
    // For now, return a placeholder response
    res.status(501).json({ error: 'Not implemented - requires database integration' });
  } catch (error) {
    logger.error({ error }, 'Failed to get booking');
    const formatted = formatErrorResponse(error);
    res.status(formatted.statusCode).json(formatted);
  }
}

/** Cancel a booking */
export async function cancelBooking(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const correlationId = (req.headers['x-correlation-id'] as string) ?? uuid();
  const logger = createRequestLogger(correlationId);

  try {
    // Validate input
    const validation = validateInput(cancelBookingSchema, {
      ...req.body,
      bookingId: req.params['bookingId'],
    });
    if (!validation.success) {
      throw new ValidationError(validation.error);
    }

    const dto = validation.data;
    
    // Determine actor type based on who is cancelling
    const actorType: EventMetadata['actorType'] = dto.adminReason ? 'admin' : 'user';
    // Note: metadata will be used when database integration is added
    void extractMetadata(req, dto.cancelledBy, actorType);

    logger.info(
      {
        bookingId: dto.bookingId,
        reason: dto.reason,
        cancelledBy: dto.cancelledBy,
      },
      'Cancelling booking'
    );

    // In production, this would fetch booking from database first
    // For now, return a placeholder response
    res.status(501).json({ error: 'Not implemented - requires database integration' });
  } catch (error) {
    logger.error({ error }, 'Failed to cancel booking');
    const formatted = formatErrorResponse(error);
    res.status(formatted.statusCode).json(formatted);
  }
}

/** Confirm booking by agent */
export async function confirmByAgent(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const correlationId = (req.headers['x-correlation-id'] as string) ?? uuid();
  const logger = createRequestLogger(correlationId);

  try {
    const { bookingId } = req.params;
    const { agentId } = req.body as { agentId?: string };

    if (!bookingId) {
      throw new ValidationError('bookingId is required');
    }

    if (!agentId) {
      throw new ValidationError('agentId is required');
    }

    // Note: metadata will be used when database integration is added
    void extractMetadata(req, agentId, 'agent');

    logger.info({ bookingId, agentId }, 'Agent confirming booking');

    // In production, this would fetch booking and call confirmByAgent
    res.status(501).json({ error: 'Not implemented - requires database integration' });
  } catch (error) {
    logger.error({ error }, 'Failed to confirm booking');
    const formatted = formatErrorResponse(error);
    res.status(formatted.statusCode).json(formatted);
  }
}

/** Complete trip */
export async function completeTrip(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const correlationId = (req.headers['x-correlation-id'] as string) ?? uuid();
  const logger = createRequestLogger(correlationId);

  try {
    const { bookingId } = req.params;

    if (!bookingId) {
      throw new ValidationError('bookingId is required');
    }

    // Note: metadata will be used when database integration is added
    void extractMetadata(req, 'system', 'system');

    logger.info({ bookingId }, 'Completing trip');

    // In production, this would fetch booking and call completeTrip
    res.status(501).json({ error: 'Not implemented - requires database integration' });
  } catch (error) {
    logger.error({ error }, 'Failed to complete trip');
    const formatted = formatErrorResponse(error);
    res.status(formatted.statusCode).json(formatted);
  }
}
