/**
 * Structured Logging with Pino
 * 
 * Features:
 * - JSON structured logs
 * - Correlation ID injection
 * - Trace context integration
 * - Log level configuration
 */

import pino, { Logger as PinoLogger } from 'pino';
import { trace } from '@opentelemetry/api';

export interface LoggerConfig {
  serviceName: string;
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  pretty?: boolean;
}

export type Logger = PinoLogger;

/**
 * Create a configured logger instance.
 */
export function createLogger(config: LoggerConfig): Logger {
  const transport = config.pretty
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined;

  const logger = pino({
    name: config.serviceName,
    level: config.level || 'info',
    transport,
    formatters: {
      level: (label) => ({ level: label }),
      bindings: () => ({}),
    },
    mixin() {
      // Add trace context to all logs
      const span = trace.getActiveSpan();
      if (span) {
        const spanContext = span.spanContext();
        return {
          traceId: spanContext.traceId,
          spanId: spanContext.spanId,
        };
      }
      return {};
    },
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  });

  return logger;
}

/**
 * Create a child logger with additional context.
 */
export function createChildLogger(
  parent: Logger,
  bindings: Record<string, unknown>
): Logger {
  return parent.child(bindings);
}
