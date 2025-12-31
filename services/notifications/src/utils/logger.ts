/**
 * Logger Utility
 * 
 * Structured logging with JSON output for production.
 * Human-readable output for development.
 */

import { env } from '../config/env';

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
};

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service: string;
  [key: string]: unknown;
}

class Logger {
  private readonly level: number;
  private readonly service: string;

  constructor() {
    this.level = LOG_LEVELS[env.LOG_LEVEL] ?? LOG_LEVELS.info;
    this.service = env.SERVICE_NAME;
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  trace(message: string, context?: Record<string, unknown>): void {
    this.log('trace', message, context);
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (LOG_LEVELS[level] > this.level) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.service,
      ...context,
    };

    const output = env.NODE_ENV === 'production'
      ? JSON.stringify(entry)
      : this.formatHuman(entry);

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

  private formatHuman(entry: LogEntry): string {
    const { level, message, timestamp, service, ...rest } = entry;
    const levelColors: Record<LogLevel, string> = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m',  // Yellow
      info: '\x1b[32m',  // Green
      debug: '\x1b[36m', // Cyan
      trace: '\x1b[90m', // Gray
    };
    const reset = '\x1b[0m';
    const color = levelColors[level];

    let output = `${timestamp} ${color}[${level.toUpperCase()}]${reset} ${message}`;

    if (Object.keys(rest).length > 0) {
      output += ` ${JSON.stringify(rest)}`;
    }

    return output;
  }
}

export const logger = new Logger();
