import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';
import { env } from '../../config/env';

/**
 * Admin authentication context
 */
export interface AdminContext {
  adminId: string;
  email: string;
  role: string;
  permissions: string[];
}

/**
 * Service authentication context
 */
export interface ServiceContext {
  serviceId: string;
  serviceName: string;
}

/**
 * Extended request with auth context
 */
declare module 'fastify' {
  interface FastifyRequest {
    admin?: AdminContext;
    service?: ServiceContext;
  }
}

/**
 * Initialize Supabase client for token verification
 */
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Verify admin JWT token
 */
async function verifyAdminToken(token: string): Promise<AdminContext | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }

    // Check if user has admin role in metadata
    const role = user.user_metadata?.role;
    if (role !== 'admin' && role !== 'super_admin') {
      return null;
    }

    return {
      adminId: user.id,
      email: user.email ?? '',
      role,
      permissions: user.user_metadata?.permissions ?? [],
    };
  } catch {
    return null;
  }
}

/**
 * Verify internal service token
 */
function verifyServiceToken(token: string): ServiceContext | null {
  try {
    // Format: service_name:timestamp:signature
    const parts = token.split(':');
    if (parts.length !== 3) {
      return null;
    }

    const [serviceName, timestamp, signature] = parts;
    if (!serviceName || !timestamp || !signature) {
      return null;
    }

    const now = Date.now();
    const tokenTime = parseInt(timestamp, 10);

    // Token expires after 5 minutes
    if (isNaN(tokenTime) || now - tokenTime > 5 * 60 * 1000) {
      return null;
    }

    // Verify signature (simple HMAC-like verification)
    const expectedSignature = createHmac('sha256', env.INTERNAL_SERVICE_SECRET)
      .update(`${serviceName}:${timestamp}`)
      .digest('hex');

    if (signature !== expectedSignature) {
      return null;
    }

    return {
      serviceId: `${serviceName}-${timestamp}`,
      serviceName,
    };
  } catch {
    return null;
  }
}

/**
 * Authentication middleware plugin
 */
export async function authMiddleware(fastify: FastifyInstance): Promise<void> {
  /**
   * Admin authentication decorator
   */
  fastify.decorate('authenticateAdmin', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const authHeader = request.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.substring(7);
    const admin = await verifyAdminToken(token);

    if (!admin) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired admin token',
      });
    }

    request.admin = admin;
  });

  /**
   * Service authentication decorator
   */
  fastify.decorate('authenticateService', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const serviceToken = request.headers['x-service-token'] as string;
    
    if (!serviceToken) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing service token',
      });
    }

    const service = verifyServiceToken(serviceToken);

    if (!service) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired service token',
      });
    }

    request.service = service;
  });

  /**
   * Combined authentication (admin OR service)
   */
  fastify.decorate('authenticate', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const authHeader = request.headers.authorization;
    const serviceToken = request.headers['x-service-token'] as string;

    // Try admin auth first
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const admin = await verifyAdminToken(token);
      if (admin) {
        request.admin = admin;
        return;
      }
    }

    // Try service auth
    if (serviceToken) {
      const service = verifyServiceToken(serviceToken);
      if (service) {
        request.service = service;
        return;
      }
    }

    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid or missing authentication',
    });
  });
}

// Type augmentation for Fastify decorators
declare module 'fastify' {
  interface FastifyInstance {
    authenticateAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authenticateService: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
