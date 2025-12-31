import { env } from '../config/env';

/**
 * Log levels with numeric priority
 */
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

/**
 * Log entry structure
 */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Structured logger for the audit service
 */
class Logger {
  private readonly minLevel: number;
  private readonly format: 'json' | 'pretty';
  private readonly service: string;

  constructor() {
    this.minLevel = LOG_LEVELS[env.LOG_LEVEL];
    this.format = env.LOG_FORMAT;
    this.service = env.SERVICE_NAME;
  }

  /**
   * Format and output log entry
   */
  private log(level: LogLevel, message: string, data?: Record<string, unknown> | Error): void {
    if (LOG_LEVELS[level] < this.minLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      message,
    };

    // Handle Error objects
    if (data instanceof Error) {
      entry.error = {
        name: data.name,
        message: data.message,
        stack: data.stack,
      };
    } else if (data) {
      // Check if data contains an error
      if (data.error instanceof Error) {
        entry.error = {
          name: data.error.name,
          message: data.error.message,
          stack: data.error.stack,
        };
        const { error, ...rest } = data;
        if (Object.keys(rest).length > 0) {
          entry.data = rest;
        }
      } else {
        entry.data = data;
      }
    }

    const output = this.format === 'json'
      ? JSON.stringify(entry)
      : this.formatPretty(entry);

    // Route to appropriate console method
    switch (level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }

  /**
   * Format log entry for development (pretty print)
   */
  private formatPretty(entry: LogEntry): string {
    const levelColors: Record<LogLevel, string> = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m', // red
    };
    const reset = '\x1b[0m';

    let output = `${entry.timestamp} ${levelColors[entry.level]}[${entry.level.toUpperCase()}]${reset} ${entry.message}`;

    if (entry.data) {
      output += `\n  Data: ${JSON.stringify(entry.data, null, 2)}`;
    }

    if (entry.error) {
      output += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack) {
        output += `\n  Stack: ${entry.error.stack}`;
      }
    }

    return output;
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  info(message: string | Record<string, unknown>, data?: Record<string, unknown>): void {
    if (typeof message === 'object') {
      this.log('info', message.message as string || 'Info', message);
    } else {
      this.log('info', message, data);
    }
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  error(message: string | Record<string, unknown>, error?: Error | Record<string, unknown>): void {
    if (typeof message === 'object') {
      this.log('error', message.message as string || 'Error', message);
    } else {
      this.log('error', message, error as Record<string, unknown>);
    }
  }
}

export const logger = new Logger();
