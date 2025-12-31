/**
 * Logger Configuration
 * 
 * Pino-based structured logging with support for:
 * - Log levels from environment
 * - Correlation IDs for request tracing
 * - Child loggers for context
 */

import pino from 'pino';
import { env } from '../config/index.js';

/**
 * Create the base logger instance
 */
export const logger = pino({
  name: env.SERVICE_NAME,
  level: env.LOG_LEVEL,
  formatters: {
    level: (label) => ({ level: label }),
    bindings: () => ({
      service: env.SERVICE_NAME,
      env: env.NODE_ENV,
    }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // In production, output JSON; in development, use pretty print
  ...(env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
});

/**
 * Create a child logger with additional context
 */
export function createChildLogger(context: Record<string, unknown>): pino.Logger {
  return logger.child(context);
}

/**
 * Create a request-scoped logger with correlation ID
 */
export function createRequestLogger(
  correlationId: string,
  additionalContext?: Record<string, unknown>
): pino.Logger {
  return logger.child({
    correlationId,
    ...additionalContext,
  });
}
