/**
 * Logger Service
 *
 * Structured logging with Pino.
 * All logs include correlation IDs for tracing.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
import pino from 'pino';
import type { Logger as PinoLogger } from 'pino';
import { config } from '../env.js';

// Type assertion for ESM compatibility
const createLogger = pino as unknown as typeof pino.default;

export const logger = createLogger({
  name: config.app.name,
  level: config.app.logLevel,
  formatters: {
    level: (label: string) => ({ level: label }),
  },
  base: {
    service: config.app.name,
    version: config.app.version,
    env: config.app.env,
  },
  timestamp: pino.stdTimeFunctions?.isoTime,
  ...(config.app.env === 'development' && {
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

/** Create a child logger with correlation ID */
export function createRequestLogger(correlationId: string) {
  return logger.child({ correlationId });
}

export type Logger = PinoLogger;
