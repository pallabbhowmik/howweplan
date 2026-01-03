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
    sendJson(res, 401, { error: 'Unauthorized' });
    return null;
  }
  if (String(user.role).toLowerCase() !== 'agent') {
    sendJson(res, 403, { error: 'Forbidden' });
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
    user_id: string;
    agent_id: string;
    email: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    tier: string | null;
    rating: string | number | null;
    total_reviews: number | null;
    is_verified: boolean | null;
  }>(
    `
    SELECT
      u.id as user_id,
      a.id as agent_id,
      u.email,
      u.first_name,
      u.last_name,
      u.avatar_url,
      a.tier,
      a.rating,
      a.total_reviews,
      a.is_verified
    FROM agents a
    JOIN users u ON u.id = a.user_id
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
  const method = req.method ?? 'GET';
  const parsedUrl = new URL(rawUrl, `http://${req.headers.host ?? 'localhost'}`);
  const url = parsedUrl.pathname;

  // CORS headers for preflight (primarily for local dev; gateway handles CORS in prod)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-API-Key, X-User-Id, X-User-Role, X-User-Email, X-Request-Id'
  );

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Route requests
  if (url === '/health' && method === 'GET') {
    handleHealthCheck(res);
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
  // Authenticated API (via API Gateway)
  // ---------------------------------------------------------------------------

  if (url === '/api/v1/agent/me' && method === 'GET') {
    const user = requireAgent(getGatewayUser(req), res);
    if (!user) return;

    const me = await getAgentMe(user.userId);
    if (!me) {
      sendJson(res, 404, { error: 'Agent profile not found' });
      return;
    }

    sendJson(res, 200, { data: me });
    return;
  }

  if (url === '/api/v1/matches' && method === 'GET') {
    const user = requireAgent(getGatewayUser(req), res);
    if (!user) return;

    const agentId = await loadAgentIdForUserId(user.userId);
    if (!agentId) {
      sendJson(res, 404, { error: 'Agent not found' });
      return;
    }

    const limit = Math.min(Math.max(Number(parsedUrl.searchParams.get('limit') ?? '50'), 1), 200);
    const offset = Math.max(Number(parsedUrl.searchParams.get('offset') ?? '0'), 0);

    const items = await listMatchesForAgent(agentId, limit, offset);
    sendJson(res, 200, { items });
    return;
  }

  const acceptMatchRoute = url.match(/^\/api\/v1\/matches\/([^/]+)\/accept$/);
  if (acceptMatchRoute && method === 'POST') {
    const user = requireAgent(getGatewayUser(req), res);
    if (!user) return;
    const matchId = acceptMatchRoute[1] ?? '';

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
    return;
  }

  const declineMatchRoute = url.match(/^\/api\/v1\/matches\/([^/]+)\/decline$/);
  if (declineMatchRoute && method === 'POST') {
    const user = requireAgent(getGatewayUser(req), res);
    if (!user) return;
    const matchId = declineMatchRoute[1] ?? '';

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
        logger.error({ error }, 'Request handler error');
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      });
    });

    server.on('error', (error) => {
      logger.error({ error }, 'Server error');
      reject(error);
    });

    server.listen(env.PORT, () => {
      logger.info({ port: env.PORT }, 'HTTP server listening');
      resolve();
    });
  });
}
