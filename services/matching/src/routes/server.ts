/**
 * HTTP Server
 * 
 * Simple HTTP server for the matching service.
 * Handles health checks and webhook events.
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { logger } from '../lib/logger.js';
import { env } from '../config/index.js';
import { handleWebhook } from './webhook.router.js';
import { getEventBus } from '../events/index.js';
import { query } from '../db/connection.js';

type GatewayUser = {
  userId: string;
  role: string;
  email?: string;
};

type AgentMe = {
  agentId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  tier: string | null;
  rating: number | null;
  totalReviews: number;
  isVerified: boolean;
  // From agent_profiles
  verificationStatus: string | null;
  businessName: string | null;
  bio: string | null;
  specialties: string[];
  // From agents table
  languages: string[];
  destinations: string[];
  yearsOfExperience: number;
  agencyName: string | null;
  commissionRate: number;
  completedBookings: number;
  responseTimeMinutes: number | null;
  isAvailable: boolean;
  // From agent_stats (trust metrics)
  trustLevel: string | null;
  badges: string[];
  platformProtectionScore: number | null;
  platformProtectionEligible: boolean | null;
  averageRating: number | null;
  ratingCount: number | null;
};

type AgentRequestMatch = {
  matchId: string;
  requestId: string;
  status: string;
  matchScore: number | null;
  matchedAt: string | null;
  expiresAt: string | null;
  request: {
    id: string;
    title: string;
    description: string | null;
    destination: unknown;
    departure_date: string;
    return_date: string;
    budget_min: number | null;
    budget_max: number | null;
    budget_currency: string | null;
    travelers: unknown;
    travel_style: string | null;
    preferences: unknown;
    state: string;
    created_at: string;
    expires_at: string | null;
    user_id: string;
  };
  user: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  } | null;
};

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function getGatewayUser(req: IncomingMessage): GatewayUser | null {
  const userId = (req.headers['x-user-id'] as string | undefined) ?? undefined;
  const role = (req.headers['x-user-role'] as string | undefined) ?? undefined;
  const email = (req.headers['x-user-email'] as string | undefined) ?? undefined;

  if (!userId || !role) return null;
  return { userId, role, email };
}

function requireAgent(user: GatewayUser | null, res: ServerResponse): GatewayUser | null {
  if (!user) {
    logger.warn({ event: 'auth_failed', reason: 'no_user_headers', message: 'Missing X-User-Id or X-User-Role headers' });
    sendJson(res, 401, { 
      error: 'Unauthorized', 
      code: 'AUTH_NO_HEADERS',
      details: 'Missing authentication headers. The API Gateway should forward X-User-Id and X-User-Role headers. This may indicate JWT verification failed at the gateway level.' 
    });
    return null;
  }
  if (String(user.role).toLowerCase() !== 'agent') {
    logger.warn({ 
      event: 'auth_forbidden', 
      userId: user.userId, 
      role: user.role, 
      email: user.email,
      message: `User role is '${user.role}' but 'agent' is required` 
    });
    sendJson(res, 403, { error: 'Forbidden', details: `Role '${user.role}' cannot access agent endpoints. Required: 'agent'` });
    return null;
  }
  return user;
}

async function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

async function loadAgentIdForUserId(userId: string): Promise<string | null> {
  const { rows } = await query<{ id: string }>('SELECT id FROM agents WHERE user_id = $1 LIMIT 1', [userId]);
  return rows[0]?.id ?? null;
}

async function getAgentMe(userId: string): Promise<AgentMe | null> {
  const { rows } = await query<{
    // From users table
    user_id: string;
    email: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    // From agents table
    agent_id: string;
    tier: string | null;
    rating: string | number | null;
    total_reviews: number | null;
    is_verified: boolean | null;
    bio: string | null;
    languages: string[] | null;
    destinations: string[] | null;
    years_of_experience: number | null;
    agency_name: string | null;
    commission_rate: string | number | null;
    completed_bookings: number | null;
    response_time_minutes: number | null;
    is_available: boolean | null;
    specializations: string[] | null;
    // From agent_profiles table
    verification_status: string | null;
    business_name: string | null;
    profile_bio: string | null;
    specialties: string[] | null;
    // From agent_stats table
    trust_level: string | null;
    badges: string[] | null;
    platform_protection_score: number | null;
    platform_protection_eligible: boolean | null;
    average_rating: string | number | null;
    rating_count: number | null;
  }>(
    `
    SELECT
      -- User basic info
      u.id as user_id,
      u.email,
      u.first_name,
      u.last_name,
      u.avatar_url,
      -- Agent operational data
      a.id as agent_id,
      a.tier,
      a.rating,
      a.total_reviews,
      a.is_verified,
      a.bio,
      a.languages,
      a.destinations,
      a.years_of_experience,
      a.agency_name,
      a.commission_rate,
      a.completed_bookings,
      a.response_time_minutes,
      a.is_available,
      a.specializations,
      -- Agent profile (verification)
      ap.verification_status,
      ap.business_name,
      ap.bio as profile_bio,
      ap.specialties,
      -- Agent stats (trust & reputation)
      ast.trust_level,
      ast.badges,
      ast.platform_protection_score,
      ast.platform_protection_eligible,
      ast.average_rating,
      ast.rating_count
    FROM agents a
    JOIN users u ON u.id = a.user_id
    LEFT JOIN agent_profiles ap ON ap.user_id = a.user_id
    LEFT JOIN agent_stats ast ON ast.agent_id = a.id
    WHERE a.user_id = $1
    LIMIT 1
    `,
    [userId]
  );

  const row = rows[0];
  if (!row) return null;

  return {
    agentId: row.agent_id,
    userId: row.user_id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    avatarUrl: row.avatar_url,
    tier: row.tier,
    rating: row.rating === null ? null : Number(row.rating),
    totalReviews: row.total_reviews ?? 0,
    isVerified: Boolean(row.is_verified),
    // From agent_profiles
    verificationStatus: row.verification_status,
    businessName: row.business_name,
    bio: row.profile_bio ?? row.bio,
    specialties: row.specialties ?? row.specializations ?? [],
    // From agents table
    languages: row.languages ?? [],
    destinations: row.destinations ?? [],
    yearsOfExperience: row.years_of_experience ?? 0,
    agencyName: row.agency_name,
    commissionRate: row.commission_rate === null ? 0.1 : Number(row.commission_rate),
    completedBookings: row.completed_bookings ?? 0,
    responseTimeMinutes: row.response_time_minutes,
    isAvailable: row.is_available ?? true,
    // From agent_stats
    trustLevel: row.trust_level,
    badges: row.badges ?? [],
    platformProtectionScore: row.platform_protection_score,
    platformProtectionEligible: row.platform_protection_eligible,
    averageRating: row.average_rating === null ? null : Number(row.average_rating),
    ratingCount: row.rating_count,
  };
}

async function listMatchesForAgent(agentId: string, limit: number, offset: number): Promise<AgentRequestMatch[]> {
  const { rows } = await query<{
    match_id: string;
    request_id: string;
    status: string;
    match_score: string | number | null;
    matched_at: string | null;
    expires_at: string | null;

    tr_id: string;
    tr_user_id: string;
    tr_title: string;
    tr_description: string | null;
    tr_destination: any;
    tr_departure_date: string;
    tr_return_date: string;
    tr_budget_min: string | number | null;
    tr_budget_max: string | number | null;
    tr_budget_currency: string | null;
    tr_travelers: any;
    tr_travel_style: string | null;
    tr_preferences: any;
    tr_state: string;
    tr_created_at: string;
    tr_expires_at: string | null;

    u_id: string | null;
    u_first_name: string | null;
    u_last_name: string | null;
    u_avatar_url: string | null;
  }>(
    `
    SELECT
      am.id as match_id,
      am.request_id,
      am.status,
      am.match_score,
      am.matched_at,
      COALESCE(am.expires_at, tr.expires_at) as expires_at,

      tr.id as tr_id,
      tr.user_id as tr_user_id,
      tr.title as tr_title,
      tr.description as tr_description,
      tr.destination as tr_destination,
      tr.departure_date::text as tr_departure_date,
      tr.return_date::text as tr_return_date,
      tr.budget_min as tr_budget_min,
      tr.budget_max as tr_budget_max,
      tr.budget_currency as tr_budget_currency,
      tr.travelers as tr_travelers,
      tr.travel_style as tr_travel_style,
      tr.preferences as tr_preferences,
      tr.state::text as tr_state,
      tr.created_at::text as tr_created_at,
      tr.expires_at::text as tr_expires_at,

      u.id as u_id,
      u.first_name as u_first_name,
      u.last_name as u_last_name,
      u.avatar_url as u_avatar_url
    FROM agent_matches am
    JOIN travel_requests tr ON tr.id = am.request_id
    LEFT JOIN users u ON u.id = tr.user_id
    WHERE am.agent_id = $1
    ORDER BY am.matched_at DESC NULLS LAST
    LIMIT $2 OFFSET $3
    `,
    [agentId, limit, offset]
  );

  return rows.map((r) => ({
    matchId: r.match_id,
    requestId: r.request_id,
    status: r.status,
    matchScore: r.match_score === null ? null : Number(r.match_score),
    matchedAt: r.matched_at,
    expiresAt: r.expires_at,
    request: {
      id: r.tr_id,
      user_id: r.tr_user_id,
      title: r.tr_title,
      description: r.tr_description,
      destination: r.tr_destination,
      departure_date: r.tr_departure_date,
      return_date: r.tr_return_date,
      budget_min: r.tr_budget_min === null ? null : Number(r.tr_budget_min),
      budget_max: r.tr_budget_max === null ? null : Number(r.tr_budget_max),
      budget_currency: r.tr_budget_currency,
      travelers: r.tr_travelers,
      travel_style: r.tr_travel_style,
      preferences: r.tr_preferences,
      state: r.tr_state,
      created_at: r.tr_created_at,
      expires_at: r.tr_expires_at,
    },
    user: r.u_id
      ? {
          id: r.u_id,
          first_name: r.u_first_name ?? '',
          last_name: r.u_last_name ?? '',
          avatar_url: r.u_avatar_url,
        }
      : null,
  }));
}

async function acceptMatchForAgent(agentId: string, matchId: string): Promise<boolean> {
  const { rowCount } = await query(
    `
    UPDATE agent_matches
    SET status = 'accepted', responded_at = NOW()
    WHERE id = $1 AND agent_id = $2 AND status = 'pending'
    `,
    [matchId, agentId]
  );
  return rowCount > 0;
}

async function declineMatchForAgent(agentId: string, matchId: string, reason: string | null): Promise<boolean> {
  const { rowCount } = await query(
    `
    UPDATE agent_matches
    SET status = 'declined', responded_at = NOW(), decline_reason = $3
    WHERE id = $1 AND agent_id = $2 AND status = 'pending'
    `,
    [matchId, agentId, reason]
  );
  return rowCount > 0;
}

/**
 * Health check response
 */
function handleHealthCheck(res: ServerResponse): void {
  const eventBus = getEventBus();
  
  const health = {
    status: 'healthy',
    service: env.SERVICE_NAME,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    eventBus: {
      connected: eventBus.connected,
    },
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(health));
}

/**
 * Metrics response
 */
function handleMetrics(res: ServerResponse): void {
  const eventBus = getEventBus();
  const memoryUsage = process.memoryUsage();
  
  const metrics = {
    service: env.SERVICE_NAME,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
    },
    eventBus: {
      connected: eventBus.connected,
    },
    metrics: {
      // Placeholder metrics
      requestsProcessed: 0,
      matchesCreated: 0,
      matchingFailures: 0,
      avgMatchingTimeMs: 0,
      agentsEvaluated: 0,
    },
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(metrics));
}

/**
 * Request handler
 */
async function requestHandler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const rawUrl = req.url ?? '/';

  // Defensive defaults: even if URL parsing fails (or a future refactor forgets to return
  // from the catch block), these will prevent runtime crashes like
  // "Cannot read properties of undefined (reading 'searchParams')".
  let parsedUrl: URL = new URL('http://localhost/');
  let url: string = '/';

  try {
    parsedUrl = new URL(rawUrl, `http://${req.headers.host ?? 'localhost'}`);
    url = parsedUrl.pathname;
  } catch (parseError) {
    logger.error({ err: parseError, rawUrl }, 'Failed to parse request URL');
    sendJson(res, 400, { error: 'Invalid request URL' });
    return;
  }

  const method = req.method ?? 'GET';

  // CORS headers - handle both gateway-proxied requests and direct access
  const originHeader = req.headers.origin;
  const origin = typeof originHeader === 'string' ? originHeader : undefined;
  const allowedOrigins = [
    'https://howweplan-agent.vercel.app',
    'https://howweplan-user.vercel.app',
    'https://howweplan-admin.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
  ] as const;
  const defaultOrigin = 'https://howweplan-agent.vercel.app';
  const corsOrigin = (origin && allowedOrigins.includes(origin as typeof allowedOrigins[number])) ? origin : defaultOrigin;
  
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-API-Key, X-User-Id, X-User-Role, X-User-Email, X-Request-Id, X-Internal-Service-Secret'
  );

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Route requests
  // Root endpoint - redirect to health for Render health checks
  if (url === '/' && method === 'GET') {
    res.writeHead(302, { Location: '/health' });
    res.end();
    return;
  }

  if (url === '/health' && method === 'GET') {
    handleHealthCheck(res);
    return;
  }

  // Debug endpoint to show received headers - helps diagnose gateway issues
  if (url === '/debug/headers' && method === 'GET') {
    const relevantHeaders = {
      'x-user-id': req.headers['x-user-id'] ?? 'NOT SET',
      'x-user-role': req.headers['x-user-role'] ?? 'NOT SET',
      'x-user-email': req.headers['x-user-email'] ?? 'NOT SET',
      'x-request-id': req.headers['x-request-id'] ?? 'NOT SET',
      'authorization': req.headers['authorization'] ? 'Bearer ***' : 'NOT SET',
      'origin': req.headers['origin'] ?? 'NOT SET',
    };
    sendJson(res, 200, { 
      message: 'Headers received by matching service',
      headers: relevantHeaders,
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (url === '/metrics' && method === 'GET') {
    handleMetrics(res);
    return;
  }

  if (url === '/webhook/event' && method === 'POST') {
    await handleWebhook(req, res);
    return;
  }

  // ---------------------------------------------------------------------------
  // Internal Service API (for inter-service communication)
  // ---------------------------------------------------------------------------

  if (url === '/internal/match' && method === 'POST') {
    // Verify internal service secret
    const serviceSecret = req.headers['x-internal-service-secret'] || req.headers['x-api-key'];
    const validSecret = env.INTERNAL_JWT_SECRET || env.EVENT_BUS_API_KEY;
    if (serviceSecret !== validSecret) {
      logger.warn('Invalid internal service secret for /internal/match');
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    try {
      const body = await parseJsonBody(req);
      const { requestId, request, correlationId } = body;

      if (!requestId || !request) {
        sendJson(res, 400, { error: 'Missing requestId or request data' });
        return;
      }

      logger.info({ requestId, correlationId }, 'Received internal match trigger');

      // Create agent_matches directly in the database
      // This is a simplified version - the full matching engine would score agents
      const { rows: agents } = await query<{ id: string }>(
        `SELECT id FROM agents WHERE is_verified = true LIMIT 5`
      );

      if (agents.length === 0) {
        logger.warn({ requestId }, 'No verified agents found for matching');
        sendJson(res, 200, { success: true, matchCount: 0, message: 'No agents available' });
        return;
      }

      // Create matches for each available agent
      let matchCount = 0;
      for (const agent of agents) {
        try {
          await query(
            `INSERT INTO agent_matches (id, request_id, agent_id, status, match_score, matched_at)
             VALUES (gen_random_uuid(), $1, $2, 'pending', 75.0, NOW())
             ON CONFLICT (request_id, agent_id) DO NOTHING`,
            [requestId, agent.id]
          );
          matchCount++;
        } catch (err) {
          logger.warn({ requestId, agentId: agent.id, err }, 'Failed to create match');
        }
      }

      logger.info({ requestId, matchCount }, 'Created agent matches');
      sendJson(res, 200, { success: true, matchCount });
      return;

    } catch (error) {
      logger.error({ err: error }, 'Failed to process internal match trigger');
      sendJson(res, 500, { error: 'Internal server error' });
      return;
    }
  }

  // ---------------------------------------------------------------------------
  // Authenticated API (via API Gateway)
  // ---------------------------------------------------------------------------

  if (url === '/api/v1/agent/me' && method === 'GET') {
    const user = requireAgent(getGatewayUser(req), res);
    if (!user) return;

    try {
      const me = await getAgentMe(user.userId);
      if (!me) {
        sendJson(res, 404, { error: 'Agent profile not found' });
        return;
      }
      sendJson(res, 200, { data: me });
    } catch (error) {
      logger.error({ err: error, userId: user.userId, endpoint: '/api/v1/agent/me' }, 'Failed to fetch agent profile');
      sendJson(res, 500, { error: 'Failed to fetch agent profile', details: error instanceof Error ? error.message : 'Database error' });
    }
    return;
  }

  if (url === '/api/v1/matches' && method === 'GET') {
    const user = requireAgent(getGatewayUser(req), res);
    if (!user) return;

    try {
      const agentId = await loadAgentIdForUserId(user.userId);
      if (!agentId) {
        sendJson(res, 404, { error: 'Agent not found' });
        return;
      }

      // Safe access to searchParams with fallback
      const limitStr = parsedUrl?.searchParams?.get('limit') ?? '50';
      const offsetStr = parsedUrl?.searchParams?.get('offset') ?? '0';
      const limit = Math.min(Math.max(Number(limitStr), 1), 200);
      const offset = Math.max(Number(offsetStr), 0);

      const items = await listMatchesForAgent(agentId, limit, offset);
      sendJson(res, 200, { items });
    } catch (error) {
      logger.error({ err: error, userId: user.userId, endpoint: '/api/v1/matches' }, 'Failed to fetch matches');
      sendJson(res, 500, { error: 'Failed to fetch matches', details: error instanceof Error ? error.message : 'Database error' });
    }
    return;
  }

  const acceptMatchRoute = url.match(/^\/api\/v1\/matches\/([^/]+)\/accept$/);
  if (acceptMatchRoute && method === 'POST') {
    const user = requireAgent(getGatewayUser(req), res);
    if (!user) return;
    const matchId = acceptMatchRoute[1] ?? '';

    try {
      const agentId = await loadAgentIdForUserId(user.userId);
      if (!agentId) {
        sendJson(res, 404, { error: 'Agent not found' });
        return;
      }

      const ok = await acceptMatchForAgent(agentId, matchId);
      if (!ok) {
        sendJson(res, 409, { error: 'Match not in pending state or not found' });
        return;
      }

      sendJson(res, 200, { success: true });
    } catch (error) {
      logger.error({ err: error, userId: user.userId, matchId, endpoint: '/api/v1/matches/:id/accept' }, 'Failed to accept match');
      sendJson(res, 500, { error: 'Failed to accept match', details: error instanceof Error ? error.message : 'Database error' });
    }
    return;
  }

  const declineMatchRoute = url.match(/^\/api\/v1\/matches\/([^/]+)\/decline$/);
  if (declineMatchRoute && method === 'POST') {
    const user = requireAgent(getGatewayUser(req), res);
    if (!user) return;
    const matchId = declineMatchRoute[1] ?? '';

    try {
      const agentId = await loadAgentIdForUserId(user.userId);
      if (!agentId) {
        sendJson(res, 404, { error: 'Agent not found' });
        return;
      }

      let reason: string | null = null;
      try {
        const body = await parseJsonBody(req);
        if (typeof body?.reason === 'string' && body.reason.trim()) {
          reason = body.reason.trim().slice(0, 500);
        }
      } catch {
        sendJson(res, 400, { error: 'Invalid JSON' });
        return;
      }

      const ok = await declineMatchForAgent(agentId, matchId, reason);
      if (!ok) {
        sendJson(res, 409, { error: 'Match not in pending state or not found' });
        return;
      }

      sendJson(res, 200, { success: true });
    } catch (error) {
      logger.error({ err: error, userId: user.userId, matchId, endpoint: '/api/v1/matches/:id/decline' }, 'Failed to decline match');
      sendJson(res, 500, { error: 'Failed to decline match', details: error instanceof Error ? error.message : 'Database error' });
    }
    return;
  }

  // 404 for unknown routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}

/**
 * Start the HTTP server
 */
export function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      requestHandler(req, res).catch((error) => {
        logger.error(
          {
            err: error,
            method: req.method,
            url: req.url,
            requestId: req.headers['x-request-id'],
            userId: req.headers['x-user-id'],
            userRole: req.headers['x-user-role'],
          },
          'Request handler error'
        );
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      });
    });

    server.on('error', (error) => {
      logger.error({ err: error }, 'Server error');
      reject(error);
    });

    server.listen(env.PORT, () => {
      logger.info({ port: env.PORT }, 'HTTP server listening');
      resolve();
    });
  });
}
