/**
 * Payment Controller
 *
 * HTTP handlers for payment operations.
 */

import type { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { paymentService } from '../services/payment.service.js';
import { createRequestLogger } from '../services/logger.service.js';
import {
  validateInput,
  createCheckoutSchema,
} from '../validators/request.validators.js';
import { formatErrorResponse, ValidationError } from '../utils/errors.js';

/** Create a checkout session for a booking */
export function createCheckoutSession(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const correlationId = (req.headers['x-correlation-id'] as string) ?? uuid();
  const logger = createRequestLogger(correlationId);

  try {
    // Validate input
    const validation = validateInput(createCheckoutSchema, {
      ...req.body,
      bookingId: req.params['bookingId'],
    });
    if (!validation.success) {
      throw new ValidationError(validation.error);
    }

    const dto = validation.data;

    logger.info({ bookingId: dto.bookingId }, 'Creating checkout session');

    // In production, this would:
    // 1. Fetch booking from database
    // 2. Get user email
    // 3. Call paymentService.createCheckout
    // For now, return a placeholder response
    res.status(501).json({ error: 'Not implemented - requires database integration' });
  } catch (error) {
    logger.error({ error }, 'Failed to create checkout session');
    const formatted = formatErrorResponse(error);
    res.status(formatted.statusCode).json(formatted);
  }
}

/** Get fee breakdown for a booking amount */
export function getFeeBreakdown(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const correlationId = (req.headers['x-correlation-id'] as string) ?? uuid();
  const logger = createRequestLogger(correlationId);

  try {
    const amountParam = req.query['amount'];

    if (!amountParam || typeof amountParam !== 'string') {
      throw new ValidationError('amount query parameter is required');
    }

    const amountCents = parseInt(amountParam, 10);

    if (isNaN(amountCents) || amountCents <= 0) {
      throw new ValidationError('amount must be a positive integer (cents)');
    }

    logger.info({ amountCents }, 'Getting fee breakdown');

    const breakdown = paymentService.getFeeBreakdown(amountCents);
    res.json(breakdown);
  } catch (error) {
    logger.error({ error }, 'Failed to get fee breakdown');
    const formatted = formatErrorResponse(error);
    res.status(formatted.statusCode).json(formatted);
  }
}
