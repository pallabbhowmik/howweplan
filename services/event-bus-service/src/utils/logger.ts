/**
 * Logger Utility
 * 
 * Structured logging for the Event Bus Service
 */

import pino from 'pino';

const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

export const logger = pino({
  level,
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  } : undefined,
  base: {
    service: 'event-bus-service',
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
});

export type Logger = typeof logger;
