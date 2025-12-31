/**
 * Logger Service
 * 
 * Structured logging with configurable levels and formats.
 * All logs include service context for distributed tracing.
 */

import { config } from '../env';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  child(context: LogContext): Logger;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export function createLogger(baseContext: LogContext = {}): Logger {
  const currentLevel = LOG_LEVELS[config.observability.logLevel];
  const isPretty = config.observability.logFormat === 'pretty';

  const formatMessage = (
    level: LogLevel,
    message: string,
    context: LogContext
  ): string => {
    const timestamp = new Date().toISOString();
    const fullContext = {
      ...baseContext,
      ...context,
      service: config.app.serviceName,
      version: config.app.version,
    };

    if (isPretty) {
      const contextStr = Object.keys(fullContext).length > 0
        ? ` ${JSON.stringify(fullContext)}`
        : '';
      return `[${timestamp}] ${level.toUpperCase().padEnd(5)} ${message}${contextStr}`;
    }

    return JSON.stringify({
      timestamp,
      level,
      message,
      ...fullContext,
    });
  };

  const shouldLog = (level: LogLevel): boolean => {
    return LOG_LEVELS[level] >= currentLevel;
  };

  const log = (level: LogLevel, message: string, context: LogContext = {}): void => {
    if (!shouldLog(level)) {
      return;
    }

    const formattedMessage = formatMessage(level, message, context);

    switch (level) {
      case 'debug':
      case 'info':
        console.log(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'error':
        console.error(formattedMessage);
        break;
    }
  };

  return {
    debug(message: string, context?: LogContext): void {
      log('debug', message, context);
    },

    info(message: string, context?: LogContext): void {
      log('info', message, context);
    },

    warn(message: string, context?: LogContext): void {
      log('warn', message, context);
    },

    error(message: string, context?: LogContext): void {
      log('error', message, context);
    },

    child(context: LogContext): Logger {
      return createLogger({ ...baseContext, ...context });
    },
  };
}
