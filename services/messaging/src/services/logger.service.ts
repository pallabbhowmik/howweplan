/**
 * Logger Service
 *
 * Simple console logging for messaging service.
 */

export const logger = {
  info: (data: any, message?: string) => {
    if (message) {
      console.log(`[INFO] ${message}`, data);
    } else {
      console.log('[INFO]', data);
    }
  },
  error: (data: any, message?: string) => {
    if (message) {
      console.error(`[ERROR] ${message}`, data);
    } else {
      console.error('[ERROR]', data);
    }
  },
  warn: (data: any, message?: string) => {
    if (message) {
      console.warn(`[WARN] ${message}`, data);
    } else {
      console.warn('[WARN]', data);
    }
  },
  debug: (data: any, message?: string) => {
    if (message) {
      console.debug(`[DEBUG] ${message}`, data);
    } else {
      console.debug('[DEBUG]', data);
    }
  },
};

/** Create a child logger with correlation ID */
export function createRequestLogger(correlationId: string) {
  return {
    ...logger,
    info: (data: any, message?: string) => logger.info({ ...data, correlationId }, message),
    error: (data: any, message?: string) => logger.error({ ...data, correlationId }, message),
    warn: (data: any, message?: string) => logger.warn({ ...data, correlationId }, message),
    debug: (data: any, message?: string) => logger.debug({ ...data, correlationId }, message),
  };
}

export type Logger = typeof logger;
