/**
 * Refund Controller
 *
 * HTTP handlers for refund operations.
 * Enforces: SUBJECTIVE COMPLAINTS ARE NEVER REFUNDABLE.
 */

import type { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { refundService } from '../services/refund.service.js';
import { createRequestLogger } from '../services/logger.service.js';
import {
  validateInput,
  createRefundSchema,
  approveRefundSchema,
  denyRefundSchema,
} from '../validators/request.validators.js';
import { formatErrorResponse, ValidationError } from '../utils/errors.js';
import type { EventMetadata } from '../types/events.types.js';

/** Extract metadata from request for audit purposes */
function extractMetadata(
  req: Request,
  actorId: string,
  actorType: EventMetadata['actorType']
): EventMetadata {
  const ipAddress = req.ip;
  const userAgent = req.get('user-agent');
  return {
    actorId,
    actorType,
    ...(ipAddress && { ipAddress }),
    ...(userAgent && { userAgent }),
  };
}

/** Create a refund request */
export async function createRefundRequest(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const correlationId = (req.headers['x-correlation-id'] as string) ?? uuid();
  const logger = createRequestLogger(correlationId);

  try {
    // Validate input
    const validation = validateInput(createRefundSchema, req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error);
    }

    const dto = validation.data;
    const actorType: EventMetadata['actorType'] = dto.adminReason ? 'admin' : 'user';
    const metadata = extractMetadata(req, dto.requestedBy, actorType);

    logger.info(
      {
        bookingId: dto.bookingId,
        reason: dto.reason,
        requestedBy: dto.requestedBy,
      },
      'Creating refund request'
    );

    const result = await refundService.createRefundRequest({
      bookingId: dto.bookingId,
      reason: dto.reason,
      reasonDetails: dto.reasonDetails,
      requestedBy: dto.requestedBy,
      amountCents: dto.amountCents ?? 0,
      ...(dto.adminReason && { adminReason: dto.adminReason }),
    }, metadata);

    if ('error' in result) {
      // Subjective complaints return 422 Unprocessable Entity
      res.status(422).json({ error: result.error });
      return;
    }

    res.status(201).json(result);
  } catch (error) {
    logger.error({ error }, 'Failed to create refund request');
    const formatted = formatErrorResponse(error);
    res.status(formatted.statusCode).json(formatted);
  }
}

/** Approve a refund request (admin only) */
export async function approveRefund(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const correlationId = (req.headers['x-correlation-id'] as string) ?? uuid();
  const logger = createRequestLogger(correlationId);

  try {
    // Validate input
    const validation = validateInput(approveRefundSchema, {
      ...req.body,
      refundId: req.params['refundId'],
    });
    if (!validation.success) {
      throw new ValidationError(validation.error);
    }

    const input = validation.data;
    const metadata = extractMetadata(req, input.approvedBy, 'admin');

    logger.info(
      {
        refundId: input.refundId,
        approvedBy: input.approvedBy,
      },
      'Approving refund'
    );

    // In production, this would fetch the refund request and booking
    const result = await refundService.approveRefund({
      refundId: input.refundId,
      bookingId: '', // Would be fetched from database
      approvedBy: input.approvedBy,
      reason: input.reason,
      ...(input.amountCents !== undefined && { amountCents: input.amountCents }),
      metadata,
    });

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ success: true, message: 'Refund approved' });
  } catch (error) {
    logger.error({ error }, 'Failed to approve refund');
    const formatted = formatErrorResponse(error);
    res.status(formatted.statusCode).json(formatted);
  }
}

/** Deny a refund request (admin only) */
export async function denyRefund(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const correlationId = (req.headers['x-correlation-id'] as string) ?? uuid();
  const logger = createRequestLogger(correlationId);

  try {
    // Validate input
    const validation = validateInput(denyRefundSchema, {
      ...req.body,
      refundId: req.params['refundId'],
    });
    if (!validation.success) {
      throw new ValidationError(validation.error);
    }

    const input = validation.data;
    const metadata = extractMetadata(req, input.deniedBy, 'admin');

    logger.info(
      {
        refundId: input.refundId,
        deniedBy: input.deniedBy,
      },
      'Denying refund'
    );

    // In production, this would fetch the refund request and booking
    const result = await refundService.denyRefund({
      refundId: input.refundId,
      bookingId: '', // Would be fetched from database
      deniedBy: input.deniedBy,
      reason: input.reason,
      metadata,
    });

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ success: true, message: 'Refund denied' });
  } catch (error) {
    logger.error({ error }, 'Failed to deny refund');
    const formatted = formatErrorResponse(error);
    res.status(formatted.statusCode).json(formatted);
  }
}

/** Get refund statistics (admin only) */
export async function getRefundStats(
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  // In production, this would query the database
  // For now, return mock statistics
  const stats = {
    pendingCount: 5,
    pendingAmount: 45000, // in cents
    approvedThisMonth: 12,
    rejectedThisMonth: 3,
    totalRefundedThisMonth: 156000, // in cents
    averageRefundAmount: 13000, // in cents
    byReason: {
      service_issue: 4,
      trip_cancelled: 3,
      agent_misconduct: 2,
      safety_concern: 2,
      medical_emergency: 1,
      other: 0,
    },
  };

  res.json(stats);
}
