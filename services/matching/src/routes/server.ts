/**
 * HTTP Server
 * 
 * Simple HTTP server for the matching service.
 * Handles health checks and webhook events.
 * 
 * @version 2.0.1 - URL parsing safety fix
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

function requireAdmin(user: GatewayUser | null, res: ServerResponse): GatewayUser | null {
  if (!user) {
    logger.warn({ event: 'auth_failed', reason: 'no_user_headers', message: 'Missing X-User-Id or X-User-Role headers' });
    sendJson(res, 401, { 
      error: 'Unauthorized', 
      code: 'AUTH_NO_HEADERS',
      details: 'Missing authentication headers. The API Gateway should forward X-User-Id and X-User-Role headers.' 
    });
    return null;
  }
  if (String(user.role).toLowerCase() !== 'admin') {
    logger.warn({ 
      event: 'auth_forbidden', 
      userId: user.userId, 
      role: user.role, 
      email: user.email,
      message: `User role is '${user.role}' but 'admin' is required` 
    });
    sendJson(res, 403, { error: 'Forbidden', details: `Role '${user.role}' cannot access admin endpoints. Required: 'admin'` });
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

/**
 * Get match details including user ID
 */
async function getMatchDetails(matchId: string, agentId: string): Promise<{ userId: string; requestId: string } | null> {
  const { rows } = await query<{ user_id: string; request_id: string }>(
    `
    SELECT tr.user_id, am.request_id
    FROM agent_matches am
    JOIN travel_requests tr ON tr.id = am.request_id
    WHERE am.id = $1 AND am.agent_id = $2
    `,
    [matchId, agentId]
  );
  return rows[0] ? { userId: rows[0].user_id, requestId: rows[0].request_id } : null;
}

/**
 * Create conversation via messaging service internal webhook (best-effort, non-blocking)
 */
async function createConversationForMatch(userId: string, agentId: string, requestId: string, matchId: string): Promise<void> {
  // Import config dynamically to avoid circular dependencies
  const { servicesConfig } = await import('../config/env.js');
  const messagingServiceUrl = servicesConfig.messagingServiceUrl;
  const internalApiKey = servicesConfig.internalApiKey;
  
  try {
    const response = await fetch(`${messagingServiceUrl}/internal/webhooks/match-accepted`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Api-Key': internalApiKey,
      },
      body: JSON.stringify({
        userId,
        agentId,
        requestId,
        matchId,
      }),
    });

    if (response.ok) {
      const data = await response.json() as { data?: { conversationId?: string } };
      logger.info({ userId, agentId, conversationId: data?.data?.conversationId }, 'Conversation created for match');
    } else {
      const errorText = await response.text().catch(() => 'unknown');
      logger.warn({ userId, agentId, status: response.status, error: errorText }, 'Failed to create conversation');
    }
  } catch (error) {
    logger.warn({ err: error, userId, agentId }, 'Failed to call messaging service');
  }
}

async function acceptMatchForAgent(agentId: string, matchId: string): Promise<boolean> {
  // Get match details first to get user ID
  const matchDetails = await getMatchDetails(matchId, agentId);
  if (!matchDetails) {
    return false;
  }

  const { rowCount } = await query(
    `
    UPDATE agent_matches
    SET status = 'accepted', responded_at = NOW()
    WHERE id = $1 AND agent_id = $2 AND status = 'pending'
    `,
    [matchId, agentId]
  );
  
  if (rowCount > 0) {
    // Create conversation asynchronously (don't block the response)
    createConversationForMatch(matchDetails.userId, agentId, matchDetails.requestId, matchId).catch((err) => {
      logger.error({ err }, 'Background conversation creation failed');
    });
  }
  
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
 * Health check response with DB connectivity check
 */
async function handleHealthCheck(res: ServerResponse): Promise<void> {
  const eventBus = getEventBus();
  
  // Check database connectivity
  let dbStatus = 'unknown';
  let dbError: string | undefined;
  try {
    const { rows } = await query<{ now: Date }>('SELECT NOW() as now');
    if (rows.length > 0) {
      dbStatus = 'connected';
    }
  } catch (err) {
    dbStatus = 'error';
    dbError = err instanceof Error ? err.message : 'Unknown database error';
  }
  
  const isHealthy = dbStatus === 'connected';
  
  const health = {
    status: isHealthy ? 'healthy' : 'degraded',
    service: env.SERVICE_NAME,
    version: '2.0.2',
    timestamp: new Date().toISOString(),
    eventBus: {
      connected: eventBus.connected,
    },
    database: {
      status: dbStatus,
      ...(dbError && { error: dbError }),
    },
  };

  res.writeHead(isHealthy ? 200 : 503, { 'Content-Type': 'application/json' });
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
  // from the catch block), these will prevent runtime crashes.
  let parsedUrl: URL | undefined = undefined;
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
    handleHealthCheck(res).catch((err) => {
      logger.error({ err }, 'Health check failed');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: 'Health check failed' }));
    });
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

  // Debug endpoint to check agent status
  if (url === '/debug/agents' && method === 'GET') {
    try {
      const { rows: stats } = await query<{ 
        total: string; 
        verified: string; 
        available: string;
        verified_and_available: string;
      }>(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_verified = true) as verified,
          COUNT(*) FILTER (WHERE is_available = true) as available,
          COUNT(*) FILTER (WHERE is_verified = true AND is_available = true) as verified_and_available
        FROM agents
      `);
      
      const { rows: recentMatches } = await query<{ count: string }>(`
        SELECT COUNT(*) as count FROM agent_matches WHERE matched_at > NOW() - INTERVAL '24 hours'
      `);

      const { rows: recentRequests } = await query<{ count: string }>(`
        SELECT COUNT(*) as count FROM travel_requests WHERE created_at > NOW() - INTERVAL '24 hours'
      `);

      sendJson(res, 200, {
        agents: {
          total: parseInt(stats[0]?.total || '0'),
          verified: parseInt(stats[0]?.verified || '0'),
          available: parseInt(stats[0]?.available || '0'),
          verifiedAndAvailable: parseInt(stats[0]?.verified_and_available || '0'),
        },
        last24h: {
          matches: parseInt(recentMatches[0]?.count || '0'),
          requests: parseInt(recentRequests[0]?.count || '0'),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to get agent debug info');
      sendJson(res, 500, { error: 'Failed to get agent info' });
    }
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

      logger.info({ requestId, correlationId, destination: request?.destination }, 'Received internal match trigger');

      // Only match with verified and available agents
      // Agents must be approved by admin (is_verified=true) and available (is_available=true)
      const { rows: agents } = await query<{ id: string; is_verified: boolean }>(
        `SELECT id, is_verified FROM agents WHERE is_verified = true AND is_available = true LIMIT 10`
      );

      if (agents.length === 0) {
        logger.error({ requestId }, 'No agents exist in the database!');
        sendJson(res, 200, { success: false, matchCount: 0, message: 'No agents exist in database' });
        return;
      }

      logger.info({ requestId, agentCount: agents.length, verified: agents.filter(a => a.is_verified).length }, 'Found agents for matching');

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

  // Internal endpoint: Create matches for a new agent with all open requests
  if (url === '/internal/agent-onboard' && method === 'POST') {
    // Verify internal service secret
    const serviceSecret = req.headers['x-internal-service-secret'] || req.headers['x-api-key'];
    const validSecret = env.INTERNAL_JWT_SECRET || env.EVENT_BUS_API_KEY;
    if (serviceSecret !== validSecret) {
      logger.warn('Invalid internal service secret for /internal/agent-onboard');
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    try {
      const body = await parseJsonBody(req);
      const { agentId, userId } = body;

      if (!agentId && !userId) {
        sendJson(res, 400, { error: 'Missing agentId or userId' });
        return;
      }

      // Get agent ID from userId if not provided
      let resolvedAgentId = agentId;
      if (!resolvedAgentId && userId) {
        const agentResult = await query<{ id: string }>('SELECT id FROM agents WHERE user_id = $1', [userId]);
        resolvedAgentId = agentResult.rows[0]?.id;
        if (!resolvedAgentId) {
          sendJson(res, 404, { error: 'Agent not found for userId' });
          return;
        }
      }

      logger.info({ agentId: resolvedAgentId, userId }, 'Onboarding new agent - creating matches with open requests');

      // Get all open travel requests (state = 'open' or 'matching')
      const { rows: openRequests } = await query<{ id: string }>(
        `SELECT id FROM travel_requests 
         WHERE state IN ('open', 'matching') 
         AND (expires_at IS NULL OR expires_at > NOW())
         LIMIT 100`
      );

      if (openRequests.length === 0) {
        logger.info({ agentId: resolvedAgentId }, 'No open requests to match with new agent');
        sendJson(res, 200, { success: true, matchCount: 0, message: 'No open requests available' });
        return;
      }

      // Create matches for each open request
      let matchCount = 0;
      for (const request of openRequests) {
        try {
          await query(
            `INSERT INTO agent_matches (id, request_id, agent_id, status, match_score, matched_at)
             VALUES (gen_random_uuid(), $1, $2, 'pending', 70.0, NOW())
             ON CONFLICT (request_id, agent_id) DO NOTHING`,
            [request.id, resolvedAgentId]
          );
          matchCount++;
        } catch (err) {
          logger.warn({ requestId: request.id, agentId: resolvedAgentId, err }, 'Failed to create match for new agent');
        }
      }

      logger.info({ agentId: resolvedAgentId, matchCount, totalRequests: openRequests.length }, 'Created matches for new agent');
      sendJson(res, 200, { success: true, matchCount });
      return;

    } catch (error) {
      logger.error({ err: error }, 'Failed to onboard new agent');
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
      const searchParams = parsedUrl?.searchParams;
      const limitStr = searchParams?.get('limit') ?? '50';
      const offsetStr = searchParams?.get('offset') ?? '0';
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

  // Agent can refresh/request matches with open travel requests
  if (url === '/api/v1/matches/refresh' && method === 'POST') {
    const user = requireAgent(getGatewayUser(req), res);
    if (!user) return;

    try {
      const agentId = await loadAgentIdForUserId(user.userId);
      if (!agentId) {
        sendJson(res, 404, { error: 'Agent not found' });
        return;
      }

      logger.info({ agentId, userId: user.userId }, 'Agent requesting match refresh');

      // Get all open travel requests
      const { rows: openRequests } = await query<{ id: string }>(
        `SELECT id FROM travel_requests 
         WHERE state IN ('open', 'matching') 
         AND (expires_at IS NULL OR expires_at > NOW())
         LIMIT 100`
      );

      if (openRequests.length === 0) {
        sendJson(res, 200, { success: true, matchCount: 0, message: 'No open requests available' });
        return;
      }

      // Create matches for each open request
      let matchCount = 0;
      for (const request of openRequests) {
        try {
          await query(
            `INSERT INTO agent_matches (id, request_id, agent_id, status, match_score, matched_at)
             VALUES (gen_random_uuid(), $1, $2, 'pending', 70.0, NOW())
             ON CONFLICT (request_id, agent_id) DO NOTHING`,
            [request.id, agentId]
          );
          matchCount++;
        } catch (err) {
          logger.warn({ requestId: request.id, agentId, err }, 'Failed to create match');
        }
      }

      logger.info({ agentId, matchCount, totalRequests: openRequests.length }, 'Refreshed matches for agent');
      sendJson(res, 200, { success: true, matchCount, message: `Found ${openRequests.length} open requests` });
    } catch (error) {
      logger.error({ err: error, userId: user.userId, endpoint: '/api/v1/matches/refresh' }, 'Failed to refresh matches');
      sendJson(res, 500, { error: 'Failed to refresh matches', details: error instanceof Error ? error.message : 'Database error' });
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

  // Verify match - used by other services to check if an agent has a valid match for a request
  if (url.startsWith('/api/v1/matches/verify') && method === 'GET') {
    // This is an internal service endpoint - can be called with service headers or user auth
    const searchParams = parsedUrl?.searchParams;
    let agentId = searchParams?.get('agentId');
    const userId = searchParams?.get('userId'); // Alternative: pass userId and we lookup agentId
    const requestId = searchParams?.get('requestId');

    logger.info({ agentId, userId, requestId, endpoint: '/api/v1/matches/verify' }, 'Match verify request received');

    if ((!agentId && !userId) || !requestId) {
      sendJson(res, 400, { 
        success: false, 
        error: 'Missing required parameters: (agentId or userId) and requestId' 
      });
      return;
    }

    try {
      // If userId provided instead of agentId, look up the agentId
      if (!agentId && userId) {
        logger.info({ userId }, 'Looking up agentId for userId');
        const agentResult = await query<{ id: string }>(
          'SELECT id FROM agents WHERE user_id = $1 LIMIT 1',
          [userId]
        );
        agentId = agentResult.rows[0]?.id ?? null;
        logger.info({ userId, foundAgentId: agentId }, 'Agent lookup result');
        
        if (!agentId) {
          sendJson(res, 200, { 
            success: false, 
            error: 'Agent not found for this user' 
          });
          return;
        }
      }

      logger.info({ agentId, requestId }, 'Querying agent_matches table');
      const result = await query<{ id: string; status: string }>(
        `SELECT id, status FROM agent_matches 
         WHERE agent_id = $1 AND request_id = $2 
         AND status IN ('pending', 'accepted', 'itinerary_submitted', 'booked')
         LIMIT 1`,
        [agentId, requestId]
      );
      logger.info({ agentId, requestId, matchFound: result.rows.length > 0, match: result.rows[0] }, 'Match query result');

      const match = result.rows[0];
      if (match) {
        sendJson(res, 200, { 
          success: true, 
          data: { 
            id: match.id, 
            agentId, 
            requestId, 
            status: match.status 
          } 
        });
      } else {
        sendJson(res, 200, { 
          success: false, 
          error: 'No accepted match found for this agent and request' 
        });
      }
    } catch (error) {
      logger.error({ err: error, agentId, userId, requestId, endpoint: '/api/v1/matches/verify' }, 'Failed to verify match');
      sendJson(res, 500, { success: false, error: 'Failed to verify match' });
    }
    return;
  }

  // ---------------------------------------------------------------------------
  // Admin API Endpoints
  // ---------------------------------------------------------------------------

  // GET /v1/admin/matching/overrides - List matching overrides
  if (url === '/v1/admin/matching/overrides' && method === 'GET') {
    const user = requireAdmin(getGatewayUser(req), res);
    if (!user) return;

    try {
      const searchParams = parsedUrl?.searchParams;
      const page = Math.max(Number(searchParams?.get('page') ?? '1'), 1);
      const pageSize = Math.min(Math.max(Number(searchParams?.get('pageSize') ?? '25'), 1), 100);
      const isActive = searchParams?.get('isActive');

      // TODO: Implement matching_overrides table and query
      // For now, return empty results to prevent 404
      logger.info({ 
        userId: user.userId, 
        page, 
        pageSize, 
        isActive 
      }, 'Admin fetching matching overrides (not implemented - returning empty)');

      sendJson(res, 200, {
        items: [],
        pagination: {
          page,
          pageSize,
          total: 0,
          totalPages: 0,
        },
      });
    } catch (error) {
      logger.error({ err: error, userId: user.userId }, 'Failed to fetch matching overrides');
      sendJson(res, 500, { error: 'Failed to fetch matching overrides' });
    }
    return;
  }

  // GET /v1/admin/matching/overrides/:id - Get override details
  if (url.match(/^\/v1\/admin\/matching\/overrides\/[a-f0-9-]+$/) && method === 'GET') {
    const user = requireAdmin(getGatewayUser(req), res);
    if (!user) return;

    try {
      const overrideId = url.split('/').pop();
      
      // TODO: Implement matching_overrides table and query
      logger.info({ userId: user.userId, overrideId }, 'Admin fetching override details (not implemented)');

      sendJson(res, 404, { error: 'Override not found' });
    } catch (error) {
      logger.error({ err: error, userId: user.userId }, 'Failed to fetch override details');
      sendJson(res, 500, { error: 'Failed to fetch override details' });
    }
    return;
  }

  // POST /v1/admin/matching/overrides - Create new override
  if (url === '/v1/admin/matching/overrides' && method === 'POST') {
    const user = requireAdmin(getGatewayUser(req), res);
    if (!user) return;

    try {
      const body = await parseJsonBody(req);
      const { type, tripRequestId, agentId, expiresAt, reason } = body;

      if (!type || !tripRequestId || !reason) {
        sendJson(res, 400, { error: 'Missing required fields: type, tripRequestId, reason' });
        return;
      }

      // TODO: Implement matching_overrides table and insert
      logger.info({ 
        userId: user.userId, 
        type, 
        tripRequestId, 
        agentId, 
        reason 
      }, 'Admin creating matching override (not implemented)');

      // Return a mock response for now
      const mockOverride = {
        id: `mock-${Date.now()}`,
        type,
        tripRequestId,
        agentId: agentId || null,
        expiresAt: expiresAt || null,
        createdBy: user.userId,
        reason,
        createdAt: new Date().toISOString(),
        isActive: true,
      };

      sendJson(res, 201, mockOverride);
    } catch (error) {
      logger.error({ err: error, userId: user.userId }, 'Failed to create matching override');
      sendJson(res, 500, { error: 'Failed to create matching override' });
    }
    return;
  }

  // POST /v1/admin/matching/overrides/:id/cancel - Cancel override
  if (url.match(/^\/v1\/admin\/matching\/overrides\/[a-f0-9-]+\/cancel$/) && method === 'POST') {
    const user = requireAdmin(getGatewayUser(req), res);
    if (!user) return;

    try {
      const pathParts = url.split('/');
      const overrideId = pathParts[pathParts.length - 2];
      const body = await parseJsonBody(req);
      const { reason } = body;

      if (!reason) {
        sendJson(res, 400, { error: 'Missing required field: reason' });
        return;
      }

      // TODO: Implement matching_overrides table and update
      logger.info({ 
        userId: user.userId, 
        overrideId, 
        reason 
      }, 'Admin cancelling matching override (not implemented)');

      // Return a mock response for now
      sendJson(res, 200, {
        id: overrideId,
        isActive: false,
        cancelledAt: new Date().toISOString(),
        cancelledBy: user.userId,
      });
    } catch (error) {
      logger.error({ err: error, userId: user.userId }, 'Failed to cancel matching override');
      sendJson(res, 500, { error: 'Failed to cancel matching override' });
    }
    return;
  }

  // GET /v1/admin/matching/pending-requests - Get pending trip requests
  if (url === '/v1/admin/matching/pending-requests' && method === 'GET') {
    const user = requireAdmin(getGatewayUser(req), res);
    if (!user) return;

    try {
      const searchParams = parsedUrl?.searchParams;
      const page = Math.max(Number(searchParams?.get('page') ?? '1'), 1);
      const pageSize = Math.min(Math.max(Number(searchParams?.get('pageSize') ?? '50'), 1), 100);
      const offset = (page - 1) * pageSize;

      logger.info({ 
        userId: user.userId, 
        page, 
        pageSize 
      }, 'Admin fetching pending trip requests');

      // Query travel_requests that are open/pending with few or no matches
      const { rows: requests } = await query<{
        id: string;
        title: string;
        destination: unknown;
        departure_date: string;
        return_date: string;
        state: string;
        created_at: string;
        user_id: string;
        match_count: string;
      }>(
        `
        SELECT 
          tr.id,
          tr.title,
          tr.destination,
          tr.departure_date::text as departure_date,
          tr.return_date::text as return_date,
          tr.state,
          tr.created_at::text as created_at,
          tr.user_id,
          COUNT(am.id)::text as match_count,
          EXTRACT(day FROM NOW() - tr.created_at)::int as waiting_days
        FROM travel_requests tr
        LEFT JOIN agent_matches am ON am.request_id = tr.id
        WHERE tr.state IN ('open', 'matching')
          AND (tr.expires_at IS NULL OR tr.expires_at > NOW())
        GROUP BY tr.id, tr.title, tr.destination, tr.departure_date, tr.return_date, 
                 tr.state, tr.created_at, tr.user_id
        HAVING COUNT(am.id) < 3
        ORDER BY tr.created_at DESC
        LIMIT $1 OFFSET $2
        `,
        [pageSize, offset]
      );

      const { rows: countResult } = await query<{ count: string }>(
        `
        SELECT COUNT(DISTINCT tr.id)::text as count
        FROM travel_requests tr
        LEFT JOIN agent_matches am ON am.request_id = tr.id
        WHERE tr.state IN ('open', 'matching')
          AND (tr.expires_at IS NULL OR tr.expires_at > NOW())
        GROUP BY tr.id
        HAVING COUNT(am.id) < 3
        `
      );

      const total = parseInt(countResult[0]?.count || '0');
      const totalPages = Math.ceil(total / pageSize);

      const items = requests.map(r => ({
        id: r.id,
        title: r.title,
        destination: r.destination,
        startDate: r.departure_date,
        endDate: r.return_date,
        status: r.state,
        userId: r.user_id,
        waitingDays: Math.floor((Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        matchCount: parseInt(r.match_count),
      }));

      sendJson(res, 200, {
        items,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
        },
      });
    } catch (error) {
      logger.error({ err: error, userId: user.userId }, 'Failed to fetch pending trip requests');
      sendJson(res, 500, { error: 'Failed to fetch pending trip requests' });
    }
    return;
  }

  // GET /v1/admin/matching/available-agents/:tripRequestId - Get available agents
  if (url.match(/^\/v1\/admin\/matching\/available-agents\/[a-f0-9-]+$/) && method === 'GET') {
    const user = requireAdmin(getGatewayUser(req), res);
    if (!user) return;

    try {
      const tripRequestId = url.split('/').pop();

      logger.info({ 
        userId: user.userId, 
        tripRequestId 
      }, 'Admin fetching available agents for trip request');

      // Query available and verified agents
      const { rows: agents } = await query<{
        user_id: string;
        email: string;
        first_name: string;
        last_name: string;
      }>(
        `
        SELECT 
          u.id as user_id,
          u.email,
          u.first_name,
          u.last_name
        FROM agents a
        JOIN users u ON u.id = a.user_id
        WHERE a.is_verified = true 
          AND a.is_available = true
        LIMIT 50
        `,
        []
      );

      const items = agents.map(a => ({
        id: a.user_id,
        email: a.email,
        firstName: a.first_name,
        lastName: a.last_name,
      }));

      sendJson(res, 200, items);
    } catch (error) {
      logger.error({ err: error, userId: user.userId }, 'Failed to fetch available agents');
      sendJson(res, 500, { error: 'Failed to fetch available agents' });
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
