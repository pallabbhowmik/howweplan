import pino from 'pino';
import { env } from '../env.js';

/**
 * Application logger.
 * Uses pino for structured JSON logging.
 */
export const logger = pino({
  name: env.SERVICE_NAME,
  level: env.LOG_LEVEL,
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: env.SERVICE_NAME,
    version: env.SERVICE_VERSION,
    env: env.NODE_ENV,
  },
});

/**
 * Create a child logger with additional context.
 */
export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

/**
 * Request logger for HTTP requests.
 */
export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}
