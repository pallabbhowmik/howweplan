import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Extend Express Request to include our custom properties
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
      user?: {
        userId: string;
        email: string;
        role: 'user' | 'agent' | 'admin' | 'system';
        permissions?: string[];
      };
    }
  }
}

export interface LogEntry {
  timestamp: string;
  requestId: string;
  method: string;
  path: string;
  statusCode?: number;
  duration?: number;
  userId?: string;
  userRole?: string;
  ip: string;
  userAgent?: string;
  service?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

class Logger {
  private formatLog(entry: LogEntry): string {
    return JSON.stringify(entry);
  }

  info(entry: LogEntry): void {
    console.log(this.formatLog({ ...entry, level: 'INFO' } as LogEntry & { level: string }));
  }

  warn(entry: LogEntry): void {
    console.warn(this.formatLog({ ...entry, level: 'WARN' } as LogEntry & { level: string }));
  }

  error(entry: LogEntry): void {
    console.error(this.formatLog({ ...entry, level: 'ERROR' } as LogEntry & { level: string }));
  }

  debug(entry: LogEntry): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatLog({ ...entry, level: 'DEBUG' } as LogEntry & { level: string }));
    }
  }
}

export const logger = new Logger();

/**
 * Middleware to add request ID and timing
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Use existing request ID or generate new one
  req.requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  req.startTime = Date.now();

  // Set response headers
  res.setHeader('X-Request-ID', req.requestId);

  next();
}

/**
 * Middleware to log incoming requests
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'],
  };

  logger.info(entry);
  next();
}

/**
 * Middleware to log response completion
 */
export function responseLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const originalSend = res.send;

  res.send = function (body) {
    const duration = Date.now() - req.startTime;
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.userId,
      userRole: req.user?.role,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
    };

    if (res.statusCode >= 400) {
      logger.warn(entry);
    } else {
      logger.info(entry);
    }

    return originalSend.call(this, body);
  };

  next();
}
