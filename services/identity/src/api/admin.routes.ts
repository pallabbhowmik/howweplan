/**
 * Admin API routes.
 * Handles administrative operations on users and agents.
 * Per business rules: all admin actions require a reason and are audit-logged.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  AuthenticatedRequest,
  requireAuth,
  requireAdmin,
  validateBody,
  validateParams,
  validateQuery,
} from '../middleware/index.js';
import { getUserById, getUserWithProfile, updateAccountStatus } from '../services/user.service.js';
import {
  approveVerification,
  rejectVerification,
  revokeVerification,
  listPendingVerifications,
} from '../services/agent.service.js';
import { getDbClient } from '../services/database.js';
import { EventContext } from '../events/index.js';
import { IdentityError, UserNotFoundError, AdminReasonRequiredError } from '../services/errors.js';
import {
  adminUpdateAccountStatusRequestSchema,
  adminReviewVerificationRequestSchema,
  adminListUsersQuerySchema,
  uuidSchema,
} from '../types/api.schemas.js';
import { AdminActionContext, AccountStatus } from '../types/identity.types.js';

const router = Router();

// Apply admin requirement to all routes
router.use(requireAuth, requireAdmin);

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates an event context from the request.
 */
function createEventContext(req: Request): EventContext {
  const authReq = req as AuthenticatedRequest;
  return {
    correlationId: authReq.correlationId ?? 'unknown',
    actorId: authReq.identity.sub,
    actorRole: authReq.identity.role,
  };
}

/**
 * Creates an admin action context from the request body.
 */
function createAdminContext(
  adminId: string,
  body: { reason: string; referenceId?: string }
): AdminActionContext {
  if (!body.reason || body.reason.length < 10) {
    throw new AdminReasonRequiredError();
  }
  return {
    adminId,
    reason: body.reason,
    referenceId: body.referenceId,
  };
}

/**
 * Sends a success response.
 */
function sendSuccess<T>(res: Response, data: T, correlationId: string, statusCode: number = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
    requestId: correlationId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Sends an error response.
 */
function sendError(res: Response, error: IdentityError, correlationId: string): void {
  res.status(error.statusCode).json({
    success: false,
    error: error.toJSON(),
    requestId: correlationId,
    timestamp: new Date().toISOString(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PARAM SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const userIdParamSchema = z.object({
  userId: uuidSchema,
});

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(25),
});

const agentListQuerySchema = paginationQuerySchema.extend({
  status: z
    .enum(['all', 'pending_approval', 'approved', 'suspended', 'rejected', 'deactivated'])
    .optional()
    .default('all'),
  search: z.string().optional(),
  sortField: z.enum(['createdAt', 'rating', 'bookings']).optional(),
  sortDirection: z.enum(['asc', 'desc']).optional().default('desc'),
  minRating: z.coerce.number().min(0).max(5).optional(),
  hasDisputes: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

const disputeListQuerySchema = paginationQuerySchema.extend({
  status: z
    .enum(['all', 'opened', 'under_review', 'pending_user_response', 'pending_agent_response'])
    .optional()
    .default('all'),
  category: z
    .enum([
      'service_not_delivered',
      'service_quality',
      'pricing_discrepancy',
      'communication_issue',
      'safety_concern',
      'fraud_suspected',
      'other',
    ])
    .optional(),
  userId: uuidSchema.optional(),
  agentId: uuidSchema.optional(),
  bookingId: uuidSchema.optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortField: z.enum(['createdAt', 'updatedAt', 'status']).optional(),
  sortDirection: z.enum(['asc', 'desc']).optional().default('desc'),
});

const refundListQuerySchema = paginationQuerySchema.extend({
  status: z
    .enum(['all', 'pending_review', 'approved', 'rejected', 'processing', 'completed', 'failed'])
    .optional()
    .default('all'),
  reason: z
    .enum([
      'dispute_resolution',
      'service_cancellation',
      'duplicate_charge',
      'agent_no_show',
      'platform_error',
      'goodwill',
    ])
    .optional(),
  userId: uuidSchema.optional(),
  bookingId: uuidSchema.optional(),
  disputeId: uuidSchema.optional(),
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().min(0).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortField: z.enum(['requestedAt', 'amount', 'status']).optional(),
  sortDirection: z.enum(['asc', 'desc']).optional().default('desc'),
});

const auditQuerySchema = paginationQuerySchema.extend({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  category: z
    .enum([
      'agent_management',
      'matching',
      'dispute',
      'refund',
      'booking',
      'payment',
      'authentication',
      'system',
    ])
    .optional(),
  severity: z.enum(['info', 'warning', 'critical']).optional(),
  actorType: z.enum(['admin', 'system', 'user', 'agent']).optional(),
  actorId: uuidSchema.optional(),
  targetType: z.string().optional(),
  targetId: z.string().optional(),
  action: z.string().optional(),
  search: z.string().optional(),
});

const matchingOverrideListQuerySchema = paginationQuerySchema.extend({
  type: z.enum(['force_assign', 'force_unassign', 'priority_boost', 'blacklist']).optional(),
  tripRequestId: uuidSchema.optional(),
  agentId: uuidSchema.optional(),
  isActive: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  createdBy: uuidSchema.optional(),
});

const tripRequestPendingQuerySchema = paginationQuerySchema;

// ─────────────────────────────────────────────────────────────────────────────
// USER MANAGEMENT ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /admin/users
 * List users with filtering and pagination.
 */
router.get(
  '/users',
  validateQuery(adminListUsersQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const query = req.query as unknown as z.infer<typeof adminListUsersQuerySchema>;

    try {
      const db = getDbClient();

      // Build query
      let dbQuery = db
        .from('users')
        .select('id, email, role, status, first_name, last_name, photo_url, email_verified_at, created_at, updated_at', {
          count: 'exact',
        });

      if (query.role) {
        dbQuery = dbQuery.eq('role', query.role);
      }
      if (query.status) {
        dbQuery = dbQuery.eq('status', query.status);
      }
      if (query.search) {
        dbQuery = dbQuery.or(`email.ilike.%${query.search}%,first_name.ilike.%${query.search}%,last_name.ilike.%${query.search}%`);
      }

      // Apply sorting
      const sortColumn = {
        createdAt: 'created_at',
        email: 'email',
        firstName: 'first_name',
        lastName: 'last_name',
      }[query.sortBy];
      
      dbQuery = dbQuery.order(sortColumn, { ascending: query.sortOrder === 'asc' });

      // Apply pagination
      const offset = (query.page - 1) * query.pageSize;
      dbQuery = dbQuery.range(offset, offset + query.pageSize - 1);

      const { data, error, count } = await dbQuery;

      if (error) {
        throw new Error(`Failed to list users: ${error.message}`);
      }

      const users = (data ?? []).map((row) => ({
        id: row.id,
        email: row.email,
        role: row.role,
        status: row.status,
        firstName: row.first_name,
        lastName: row.last_name,
        photoUrl: row.photo_url,
        emailVerifiedAt: row.email_verified_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      sendSuccess(
        res,
        {
          users,
          pagination: {
            page: query.page,
            pageSize: query.pageSize,
            total: count ?? 0,
            totalPages: Math.ceil((count ?? 0) / query.pageSize),
          },
        },
        authReq.correlationId
      );
    } catch (error) {
      if (error instanceof IdentityError) {
        sendError(res, error, authReq.correlationId);
        return;
      }
      throw error;
    }
  }
);

/**
 * GET /admin/users/:userId
 * Get a user by ID with full details.
 */
router.get(
  '/users/:userId',
  validateParams(userIdParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { userId } = req.params as z.infer<typeof userIdParamSchema>;

    try {
      const userWithProfile = await getUserWithProfile(userId);

      if (!userWithProfile) {
        throw new UserNotFoundError(userId);
      }

      sendSuccess(
        res,
        {
          id: userWithProfile.id,
          email: userWithProfile.email,
          firstName: userWithProfile.firstName,
          lastName: userWithProfile.lastName,
          photoUrl: userWithProfile.photoUrl,
          role: userWithProfile.role,
          status: userWithProfile.status,
          emailVerifiedAt: userWithProfile.emailVerifiedAt?.toISOString() ?? null,
          createdAt: userWithProfile.createdAt.toISOString(),
          updatedAt: userWithProfile.updatedAt.toISOString(),
          agentProfile: userWithProfile.agentProfile
            ? {
                verificationStatus: userWithProfile.agentProfile.verificationStatus,
                verificationSubmittedAt:
                  userWithProfile.agentProfile.verificationSubmittedAt?.toISOString() ?? null,
                verificationCompletedAt:
                  userWithProfile.agentProfile.verificationCompletedAt?.toISOString() ?? null,
                verificationRejectedReason: userWithProfile.agentProfile.verificationRejectedReason,
                businessName: userWithProfile.agentProfile.businessName,
                bio: userWithProfile.agentProfile.bio,
                specialties: userWithProfile.agentProfile.specialties,
              }
            : null,
        },
        authReq.correlationId
      );
    } catch (error) {
      if (error instanceof IdentityError) {
        sendError(res, error, authReq.correlationId);
        return;
      }
      throw error;
    }
  }
);

/**
 * PATCH /admin/users/:userId/status
 * Update a user's account status.
 * Per business rules: all admin actions require a reason.
 */
router.patch(
  '/users/:userId/status',
  validateParams(userIdParamSchema),
  validateBody(adminUpdateAccountStatusRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { userId } = req.params as z.infer<typeof userIdParamSchema>;
    const body = req.body as z.infer<typeof adminUpdateAccountStatusRequestSchema>;

    try {
      const adminContext = createAdminContext(authReq.identity.sub, body);
      const eventContext = createEventContext(req);

      const user = await updateAccountStatus(
        userId,
        body.status as AccountStatus,
        adminContext,
        eventContext
      );

      sendSuccess(
        res,
        {
          id: user.id,
          email: user.email,
          status: user.status,
          updatedAt: user.updatedAt.toISOString(),
        },
        authReq.correlationId
      );
    } catch (error) {
      if (error instanceof IdentityError) {
        sendError(res, error, authReq.correlationId);
        return;
      }
      throw error;
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION MANAGEMENT ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /admin/verifications/pending
 * List pending agent verifications.
 */
router.get(
  '/verifications/pending',
  validateQuery(z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const query = req.query as unknown as { page: number; pageSize: number };

    try {
      const { profiles, total } = await listPendingVerifications(query.page, query.pageSize);

      // Enrich with user data
      const enrichedProfiles = await Promise.all(
        profiles.map(async (profile) => {
          const user = await getUserById(profile.userId);
          return {
            userId: profile.userId,
            email: user?.email ?? 'unknown',
            firstName: user?.firstName ?? 'unknown',
            lastName: user?.lastName ?? 'unknown',
            verificationStatus: profile.verificationStatus,
            verificationSubmittedAt: profile.verificationSubmittedAt?.toISOString() ?? null,
            businessName: profile.businessName,
          };
        })
      );

      sendSuccess(
        res,
        {
          verifications: enrichedProfiles,
          pagination: {
            page: query.page,
            pageSize: query.pageSize,
            total,
            totalPages: Math.ceil(total / query.pageSize),
          },
        },
        authReq.correlationId
      );
    } catch (error) {
      if (error instanceof IdentityError) {
        sendError(res, error, authReq.correlationId);
        return;
      }
      throw error;
    }
  }
);

/**
 * POST /admin/users/:userId/verification/approve
 * Approve an agent's verification.
 * Per business rules: all admin actions require a reason.
 */
router.post(
  '/users/:userId/verification/approve',
  validateParams(userIdParamSchema),
  validateBody(adminReviewVerificationRequestSchema.pick({ reason: true, referenceId: true })),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { userId } = req.params as z.infer<typeof userIdParamSchema>;
    const body = req.body as { reason: string; referenceId?: string };

    try {
      const adminContext = createAdminContext(authReq.identity.sub, body);
      const eventContext = createEventContext(req);

      const profile = await approveVerification(userId, adminContext, eventContext);

      sendSuccess(
        res,
        {
          userId: profile.userId,
          verificationStatus: profile.verificationStatus,
          verificationCompletedAt: profile.verificationCompletedAt?.toISOString() ?? null,
        },
        authReq.correlationId
      );
    } catch (error) {
      if (error instanceof IdentityError) {
        sendError(res, error, authReq.correlationId);
        return;
      }
      throw error;
    }
  }
);

/**
 * POST /admin/users/:userId/verification/reject
 * Reject an agent's verification.
 * Per business rules: all admin actions require a reason.
 */
router.post(
  '/users/:userId/verification/reject',
  validateParams(userIdParamSchema),
  validateBody(adminReviewVerificationRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { userId } = req.params as z.infer<typeof userIdParamSchema>;
    const body = req.body as z.infer<typeof adminReviewVerificationRequestSchema>;

    try {
      if (body.decision !== 'REJECT') {
        throw new Error('Invalid decision for rejection endpoint');
      }

      const adminContext = createAdminContext(authReq.identity.sub, body);
      const eventContext = createEventContext(req);

      const profile = await rejectVerification(
        userId,
        body.rejectionReason ?? 'No specific reason provided',
        adminContext,
        eventContext
      );

      sendSuccess(
        res,
        {
          userId: profile.userId,
          verificationStatus: profile.verificationStatus,
          verificationRejectedReason: profile.verificationRejectedReason,
          verificationCompletedAt: profile.verificationCompletedAt?.toISOString() ?? null,
        },
        authReq.correlationId
      );
    } catch (error) {
      if (error instanceof IdentityError) {
        sendError(res, error, authReq.correlationId);
        return;
      }
      throw error;
    }
  }
);

/**
 * POST /admin/users/:userId/verification/revoke
 * Revoke a verified agent's verification.
 * Per business rules: all admin actions require a reason.
 */
router.post(
  '/users/:userId/verification/revoke',
  validateParams(userIdParamSchema),
  validateBody(z.object({
    reason: z.string().min(10).max(1000),
    referenceId: z.string().max(100).optional(),
  })),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { userId } = req.params as z.infer<typeof userIdParamSchema>;
    const body = req.body as { reason: string; referenceId?: string };

    try {
      const adminContext = createAdminContext(authReq.identity.sub, body);
      const eventContext = createEventContext(req);

      const profile = await revokeVerification(userId, adminContext, eventContext);

      sendSuccess(
        res,
        {
          userId: profile.userId,
          verificationStatus: profile.verificationStatus,
        },
        authReq.correlationId
      );
    } catch (error) {
      if (error instanceof IdentityError) {
        sendError(res, error, authReq.correlationId);
        return;
      }
      throw error;
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN WEB - COMPATIBILITY ROUTES
// These endpoints exist to back the admin-web pages which expect:
//   1) a standardized { success, data } envelope
//   2) certain resource-oriented paths under /admin/*
//
// They read from the same database (via Supabase PostgREST) to ensure seeded
// data appears in the UI even when domain services expose different shapes.
// ─────────────────────────────────────────────────────────────────────────────

function sendApiError(
  res: Response,
  correlationId: string,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
): void {
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
    requestId: correlationId,
    timestamp: new Date().toISOString(),
  });
}

function mapAgentStatusToUserStatus(status: string | undefined): string | undefined {
  switch (status) {
    case 'pending_approval':
      return 'pending';
    case 'approved':
      return 'active';
    case 'suspended':
      return 'suspended';
    case 'deactivated':
      return 'deactivated';
    case 'rejected':
      return 'rejected';
    case 'all':
    default:
      return undefined;
  }
}

function mapDisputeStateToStatus(state: string | null | undefined):
  | 'opened'
  | 'under_review'
  | 'pending_user_response'
  | 'pending_agent_response'
  | 'resolved_user_favor'
  | 'resolved_agent_favor'
  | 'resolved_partial'
  | 'closed_no_action' {
  const s = (state ?? '').toUpperCase();

  if (s === 'OPENED') return 'opened';
  if (s === 'AWAITING_AGENT_RESPONSE' || s === 'AGENT_RESPONDED') return 'pending_agent_response';
  if (s === 'USER_REVIEWING' || s === 'AWAITING_EVIDENCE') return 'pending_user_response';
  if (s === 'ESCALATED_TO_ADMIN' || s === 'UNDER_INVESTIGATION') return 'under_review';
  if (s === 'RESOLVED_USER_FAVOR') return 'resolved_user_favor';
  if (s === 'RESOLVED_AGENT_FAVOR') return 'resolved_agent_favor';
  if (s === 'RESOLVED_PARTIAL') return 'resolved_partial';

  return 'closed_no_action';
}

function mapRefundStatus(dbStatus: string | null | undefined):
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'processing'
  | 'completed'
  | 'failed' {
  const s = (dbStatus ?? '').toLowerCase();
  if (s === 'pending') return 'pending_review';
  if (s === 'processing') return 'processing';
  if (s === 'succeeded') return 'completed';
  if (s === 'failed') return 'failed';
  return 'pending_review';
}

function mapRefundReason(dbReason: string | null | undefined):
  | 'dispute_resolution'
  | 'service_cancellation'
  | 'duplicate_charge'
  | 'agent_no_show'
  | 'platform_error'
  | 'goodwill' {
  const r = (dbReason ?? '').toLowerCase();
  if (r.includes('dispute')) return 'dispute_resolution';
  if (r.includes('cancel')) return 'service_cancellation';
  if (r.includes('duplicate')) return 'duplicate_charge';
  if (r.includes('no show')) return 'agent_no_show';
  if (r.includes('platform')) return 'platform_error';
  if (r === 'goodwill') return 'goodwill';
  return 'goodwill';
}

function mapAuditCategory(resourceType: string | null | undefined, eventType: string | null | undefined):
  | 'agent_management'
  | 'matching'
  | 'dispute'
  | 'refund'
  | 'booking'
  | 'payment'
  | 'authentication'
  | 'system' {
  const rt = (resourceType ?? '').toLowerCase();
  const et = (eventType ?? '').toLowerCase();
  if (rt === 'agent') return 'agent_management';
  if (rt === 'dispute') return 'dispute';
  if (rt === 'refund') return 'refund';
  if (rt === 'booking') return 'booking';
  if (rt === 'payment') return 'payment';
  if (rt === 'user' || et.includes('auth') || et.includes('login')) return 'authentication';
  if (et.includes('matching')) return 'matching';
  return 'system';
}

function mapAuditSeverity(action: string | null | undefined): 'info' | 'warning' | 'critical' {
  const a = (action ?? '').toUpperCase();
  if (a.includes('SUSPEND') || a.includes('ESCALATE')) return 'warning';
  if (a.includes('DELETE') || a.includes('REFUND') || a.includes('REVOKE')) return 'critical';
  return 'info';
}

// ─────────────────────────────────────────────────────────────────────────────
// Agents
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/agents',
  validateQuery(agentListQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const query = req.query as unknown as z.infer<typeof agentListQuerySchema>;

    try {
      const db = getDbClient();

      let q = db
        .from('users')
        .select('id, email, first_name, last_name, avatar_url, is_active, is_banned, created_at, updated_at', { count: 'exact' })
        .eq('role', 'agent');

      // Map status filter to is_active/is_banned
      if (query.status) {
        const mappedStatus = mapAgentStatusToUserStatus(query.status);
        if (mappedStatus === 'ACTIVE') {
          q = q.eq('is_active', true).eq('is_banned', false);
        } else if (mappedStatus === 'INACTIVE' || mappedStatus === 'SUSPENDED') {
          q = q.eq('is_active', false);
        } else if (mappedStatus === 'BANNED') {
          q = q.eq('is_banned', true);
        }
      }

      if (query.search) {
        q = q.or(`email.ilike.%${query.search}%,first_name.ilike.%${query.search}%,last_name.ilike.%${query.search}%`);
      }

      // Apply sorting (default newest)
      const sortColumn = {
        createdAt: 'created_at',
        rating: 'created_at',
        bookings: 'created_at',
      }[query.sortField ?? 'createdAt'];

      q = q.order(sortColumn, { ascending: query.sortDirection === 'asc' });

      const offset = (query.page - 1) * query.pageSize;
      q = q.range(offset, offset + query.pageSize - 1);

      const { data: agentUsers, error: userErr, count } = await q;
      if (userErr) {
        sendApiError(res, authReq.correlationId, 500, 'DB_ERROR', 'Failed to list agents', { message: userErr.message });
        return;
      }

      const userIds = (agentUsers ?? []).map((u) => u.id);
      if (userIds.length === 0) {
        sendSuccess(
          res,
          {
            items: [],
            totalCount: count ?? 0,
            page: query.page,
            pageSize: query.pageSize,
            hasMore: false,
            totalPages: 0,
          },
          authReq.correlationId
        );
        return;
      }

      const { data: agentRows, error: agentErr } = await db
        .from('agents')
        .select('id, user_id, rating, completed_bookings, created_at, updated_at')
        .in('user_id', userIds);
      if (agentErr) {
        sendApiError(res, authReq.correlationId, 500, 'DB_ERROR', 'Failed to load agent profiles', {
          message: agentErr.message,
        });
        return;
      }

      const agentByUserId = new Map<string, any>((agentRows ?? []).map((a) => [a.user_id, a]));
      const agentIds = (agentRows ?? []).map((a) => a.id);

      // Dispute counts
      const { data: disputeRows } = await db
        .from('disputes')
        .select('agent_id')
        .in('agent_id', agentIds);
      const disputesByAgentId = new Map<string, number>();
      for (const row of disputeRows ?? []) {
        const key = row.agent_id as string;
        disputesByAgentId.set(key, (disputesByAgentId.get(key) ?? 0) + 1);
      }

      // Booking counts
      const { data: bookingRows } = await db
        .from('bookings')
        .select('agent_id, state')
        .in('agent_id', agentIds);
      const totalBookingsByAgentId = new Map<string, number>();
      const completedBookingsByAgentId = new Map<string, number>();
      for (const row of bookingRows ?? []) {
        const key = row.agent_id as string;
        totalBookingsByAgentId.set(key, (totalBookingsByAgentId.get(key) ?? 0) + 1);
        if ((row.state as string | null)?.toUpperCase() === 'COMPLETED') {
          completedBookingsByAgentId.set(key, (completedBookingsByAgentId.get(key) ?? 0) + 1);
        }
      }

      const items = (agentUsers ?? []).map((u) => {
        const agent = agentByUserId.get(u.id);
        const agentId = agent?.id ?? u.id;
        
        // Derive status from is_active and is_banned flags
        let derivedStatus: string;
        if (u.is_banned) {
          derivedStatus = 'suspended';
        } else if (u.is_active) {
          derivedStatus = 'approved';
        } else {
          derivedStatus = 'pending';
        }

        return {
          id: agentId,
          email: u.email,
          firstName: u.first_name,
          lastName: u.last_name,
          photoUrl: u.avatar_url,
          status: derivedStatus,
          applicationDate: new Date(u.created_at).toISOString(),
          approvalDate: null,
          suspensionDate: null,
          totalBookings: totalBookingsByAgentId.get(agentId) ?? 0,
          completedBookings: completedBookingsByAgentId.get(agentId) ?? agent?.completed_bookings ?? 0,
          disputeCount: disputesByAgentId.get(agentId) ?? 0,
          averageRating: agent?.rating ?? null,
          createdAt: agent?.created_at ?? u.created_at,
          updatedAt: agent?.updated_at ?? u.updated_at,
        };
      });

      // Apply derived filters
      const filtered = items.filter((a) => {
        if (query.minRating !== undefined && a.averageRating !== null && a.averageRating < query.minRating) {
          return false;
        }
        if (query.hasDisputes !== undefined && query.hasDisputes) {
          return a.disputeCount > 0;
        }
        return true;
      });

      const totalCount = count ?? filtered.length;
      const totalPages = Math.ceil(totalCount / query.pageSize);

      sendSuccess(
        res,
        {
          items: filtered,
          totalCount,
          page: query.page,
          pageSize: query.pageSize,
          hasMore: query.page < totalPages,
          totalPages,
        },
        authReq.correlationId
      );
    } catch (error) {
      if (error instanceof IdentityError) {
        sendError(res, error, authReq.correlationId);
        return;
      }
      sendApiError(res, authReq.correlationId, 500, 'INTERNAL', 'Failed to list agents');
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Disputes
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/disputes',
  validateQuery(disputeListQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const query = req.query as unknown as z.infer<typeof disputeListQuerySchema>;

    try {
      const db = getDbClient();

      let q = db
        .from('disputes')
        .select(
          'id, booking_id, user_id, agent_id, category, state, description, created_at, updated_at, requested_refund_amount',
          { count: 'exact' }
        );

      if (query.bookingId) q = q.eq('booking_id', query.bookingId);
      if (query.userId) q = q.eq('user_id', query.userId);
      if (query.agentId) q = q.eq('agent_id', query.agentId);

      if (query.status && query.status !== 'all') {
        const stateFilter = {
          opened: ['OPENED'],
          under_review: ['ESCALATED_TO_ADMIN', 'UNDER_INVESTIGATION', 'AWAITING_EVIDENCE'],
          pending_user_response: ['USER_REVIEWING', 'AWAITING_EVIDENCE'],
          pending_agent_response: ['AWAITING_AGENT_RESPONSE', 'AGENT_RESPONDED'],
        }[query.status];
        if (stateFilter) q = q.in('state', stateFilter);
      }

      if (query.category) {
        const categoryMap: Record<string, string> = {
          communication_issue: 'communication',
          pricing_discrepancy: 'billing',
        };

        const mappedCategory = categoryMap[query.category] ?? query.category;
        q = q.eq('category', mappedCategory);
      }

      const sortColumn = {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        status: 'state',
      }[query.sortField ?? 'updatedAt'];
      q = q.order(sortColumn, { ascending: query.sortDirection === 'asc' });

      const offset = (query.page - 1) * query.pageSize;
      q = q.range(offset, offset + query.pageSize - 1);

      const { data: disputes, error: dErr, count } = await q;
      if (dErr) {
        sendApiError(res, authReq.correlationId, 500, 'DB_ERROR', 'Failed to list disputes', { message: dErr.message });
        return;
      }

      const ids = (disputes ?? []).map((d) => d.id);
      const { data: evidenceRows } = ids.length
        ? await db
            .from('dispute_evidence')
            .select('dispute_id, submitted_by_type, file_url')
            .in('dispute_id', ids)
        : { data: [] };

      const evidenceByDispute = new Map<string, { user: string[]; agent: string[] }>();
      for (const ev of evidenceRows ?? []) {
        const key = ev.dispute_id as string;
        if (!evidenceByDispute.has(key)) evidenceByDispute.set(key, { user: [], agent: [] });
        const bucket = evidenceByDispute.get(key)!;
        const url = (ev.file_url as string) ?? '';
        if ((ev.submitted_by_type as string)?.toLowerCase() === 'agent') bucket.agent.push(url);
        else bucket.user.push(url);
      }

      const items = (disputes ?? []).map((d) => {
        const categoryMap: Record<string, string> = {
          communication: 'communication_issue',
          billing: 'pricing_discrepancy',
        };

        const mappedCategory = categoryMap[(d.category as string) ?? ''] ?? (d.category as string);

        const evidence = evidenceByDispute.get(d.id as string) ?? { user: [], agent: [] };

        return {
          id: d.id,
          bookingId: d.booking_id,
          userId: d.user_id,
          agentId: d.agent_id,
          category: mappedCategory,
          status: mapDisputeStateToStatus(d.state),
          description: d.description,
          userEvidence: evidence.user,
          agentEvidence: evidence.agent,
          adminNotes: [],
          refundAmount:
            d.requested_refund_amount !== null && d.requested_refund_amount !== undefined
              ? Number(d.requested_refund_amount) / 100
              : null,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
          resolvedAt: null,
          resolvedBy: null,
        };
      });

      const totalCount = count ?? items.length;
      const totalPages = Math.ceil(totalCount / query.pageSize);

      sendSuccess(
        res,
        {
          items,
          totalCount,
          page: query.page,
          pageSize: query.pageSize,
          hasMore: query.page < totalPages,
          totalPages,
        },
        authReq.correlationId
      );
    } catch (error) {
      if (error instanceof IdentityError) {
        sendError(res, error, authReq.correlationId);
        return;
      }
      sendApiError(res, authReq.correlationId, 500, 'INTERNAL', 'Failed to list disputes');
    }
  }
);

router.get(
  '/disputes/:disputeId',
  validateParams(z.object({ disputeId: uuidSchema })),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { disputeId } = req.params as { disputeId: string };

    try {
      const db = getDbClient();
      const { data: d, error: dErr } = await db
        .from('disputes')
        .select('id, booking_id, user_id, agent_id, category, state, description, created_at, updated_at, requested_refund_amount')
        .eq('id', disputeId)
        .maybeSingle();

      if (dErr || !d) {
        sendApiError(res, authReq.correlationId, 404, 'NOT_FOUND', 'Dispute not found');
        return;
      }

      const { data: evidenceRows } = await db
        .from('dispute_evidence')
        .select('submitted_by_type, file_url')
        .eq('dispute_id', disputeId);

      const userEvidence: string[] = [];
      const agentEvidence: string[] = [];
      for (const ev of evidenceRows ?? []) {
        const url = (ev.file_url as string) ?? '';
        if ((ev.submitted_by_type as string)?.toLowerCase() === 'agent') agentEvidence.push(url);
        else userEvidence.push(url);
      }

      const mappedCategory = {
        communication: 'communication_issue',
        billing: 'pricing_discrepancy',
      }[(d.category as string) ?? ''] ?? (d.category as string);

      sendSuccess(
        res,
        {
          id: d.id,
          bookingId: d.booking_id,
          userId: d.user_id,
          agentId: d.agent_id,
          category: mappedCategory,
          status: mapDisputeStateToStatus(d.state),
          description: d.description,
          userEvidence,
          agentEvidence,
          adminNotes: [],
          refundAmount:
            d.requested_refund_amount !== null && d.requested_refund_amount !== undefined
              ? Number(d.requested_refund_amount) / 100
              : null,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
          resolvedAt: null,
          resolvedBy: null,
        },
        authReq.correlationId
      );
    } catch (error) {
      sendApiError(res, authReq.correlationId, 500, 'INTERNAL', 'Failed to load dispute');
    }
  }
);

router.patch(
  '/disputes/:disputeId/status',
  validateParams(z.object({ disputeId: uuidSchema })),
  validateBody(
    z.object({
      status: z.string().min(1),
      reason: z.string().min(10),
      correlationId: z.string().optional(),
    })
  ),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { disputeId } = req.params as { disputeId: string };
    const body = req.body as { status: string; reason: string };

    try {
      const db = getDbClient();
      const mappedState = {
        opened: 'OPENED',
        under_review: 'UNDER_INVESTIGATION',
        pending_user_response: 'USER_REVIEWING',
        pending_agent_response: 'AWAITING_AGENT_RESPONSE',
        resolved_user_favor: 'RESOLVED_USER_FAVOR',
        resolved_agent_favor: 'RESOLVED_AGENT_FAVOR',
        resolved_partial: 'RESOLVED_PARTIAL',
        closed_no_action: 'CLOSED',
      }[(body.status ?? '').toLowerCase()] as string | undefined;

      if (!mappedState) {
        sendApiError(res, authReq.correlationId, 400, 'INVALID_STATUS', 'Invalid dispute status');
        return;
      }

      const { data, error } = await db
        .from('disputes')
        .update({ state: mappedState, updated_at: new Date().toISOString() })
        .eq('id', disputeId)
        .select('id, booking_id, user_id, agent_id, category, state, description, created_at, updated_at, requested_refund_amount')
        .maybeSingle();

      if (error || !data) {
        sendApiError(res, authReq.correlationId, 500, 'DB_ERROR', 'Failed to update dispute');
        return;
      }

      sendSuccess(
        res,
        {
          id: data.id,
          bookingId: data.booking_id,
          userId: data.user_id,
          agentId: data.agent_id,
          category: data.category,
          status: mapDisputeStateToStatus(data.state),
          description: data.description,
          userEvidence: [],
          agentEvidence: [],
          adminNotes: [],
          refundAmount:
            data.requested_refund_amount !== null && data.requested_refund_amount !== undefined
              ? Number(data.requested_refund_amount) / 100
              : null,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          resolvedAt: null,
          resolvedBy: null,
        },
        authReq.correlationId
      );
    } catch (error) {
      sendApiError(res, authReq.correlationId, 500, 'INTERNAL', 'Failed to update dispute status');
    }
  }
);

router.post(
  '/disputes/:disputeId/notes',
  validateParams(z.object({ disputeId: uuidSchema })),
  validateBody(
    z.object({
      content: z.string().min(1).max(5000),
      isInternal: z.boolean().default(true),
      reason: z.string().min(10),
      correlationId: z.string().optional(),
    })
  ),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    // Notes are not persisted in base schema; return updated dispute for UI.
    const { disputeId } = req.params as { disputeId: string };
    const db = getDbClient();
    const { data, error } = await db
      .from('disputes')
      .select('id, booking_id, user_id, agent_id, category, state, description, created_at, updated_at, requested_refund_amount')
      .eq('id', disputeId)
      .maybeSingle();

    if (error || !data) {
      sendApiError(res, authReq.correlationId, 404, 'NOT_FOUND', 'Dispute not found');
      return;
    }

    sendSuccess(
      res,
      {
        id: data.id,
        bookingId: data.booking_id,
        userId: data.user_id,
        agentId: data.agent_id,
        category: data.category,
        status: mapDisputeStateToStatus(data.state),
        description: data.description,
        userEvidence: [],
        agentEvidence: [],
        adminNotes: [],
        refundAmount:
          data.requested_refund_amount !== null && data.requested_refund_amount !== undefined
            ? Number(data.requested_refund_amount) / 100
            : null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        resolvedAt: null,
        resolvedBy: null,
      },
      authReq.correlationId
    );
  }
);

router.post(
  '/disputes/:disputeId/resolve',
  validateParams(z.object({ disputeId: uuidSchema })),
  validateBody(
    z.object({
      resolution: z.string().min(1),
      refundAmount: z.number().nullable().optional(),
      resolutionSummary: z.string().min(1).max(5000),
      reason: z.string().min(10),
      correlationId: z.string().optional(),
    })
  ),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { disputeId } = req.params as { disputeId: string };
    const body = req.body as { resolution: string; refundAmount?: number | null };

    try {
      const db = getDbClient();
      const mappedState = {
        resolved_user_favor: 'RESOLVED_USER_FAVOR',
        resolved_agent_favor: 'RESOLVED_AGENT_FAVOR',
        resolved_partial: 'RESOLVED_PARTIAL',
        closed_no_action: 'CLOSED',
      }[(body.resolution ?? '').toLowerCase()] as string | undefined;

      if (!mappedState) {
        sendApiError(res, authReq.correlationId, 400, 'INVALID_RESOLUTION', 'Invalid dispute resolution status');
        return;
      }

      const update: Record<string, unknown> = {
        state: mappedState,
        updated_at: new Date().toISOString(),
      };
      if (body.refundAmount !== undefined && body.refundAmount !== null) {
        update['requested_refund_amount'] = Math.round(body.refundAmount * 100);
      }

      const { data, error } = await db
        .from('disputes')
        .update(update)
        .eq('id', disputeId)
        .select('id, booking_id, user_id, agent_id, category, state, description, created_at, updated_at, requested_refund_amount')
        .maybeSingle();

      if (error || !data) {
        sendApiError(res, authReq.correlationId, 500, 'DB_ERROR', 'Failed to resolve dispute');
        return;
      }

      sendSuccess(
        res,
        {
          id: data.id,
          bookingId: data.booking_id,
          userId: data.user_id,
          agentId: data.agent_id,
          category: data.category,
          status: mapDisputeStateToStatus(data.state),
          description: data.description,
          userEvidence: [],
          agentEvidence: [],
          adminNotes: [],
          refundAmount:
            data.requested_refund_amount !== null && data.requested_refund_amount !== undefined
              ? Number(data.requested_refund_amount) / 100
              : null,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          resolvedAt: new Date().toISOString(),
          resolvedBy: authReq.identity.sub,
        },
        authReq.correlationId
      );
    } catch (error) {
      sendApiError(res, authReq.correlationId, 500, 'INTERNAL', 'Failed to resolve dispute');
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Refunds
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/refunds',
  validateQuery(refundListQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const query = req.query as unknown as z.infer<typeof refundListQuerySchema>;

    try {
      const db = getDbClient();

      let q = db
        .from('refunds')
        .select('id, booking_id, dispute_id, amount_cents, currency, status, reason, stripe_refund_id, created_at, processed_at', {
          count: 'exact',
        });

      if (query.bookingId) q = q.eq('booking_id', query.bookingId);
      if (query.disputeId) q = q.eq('dispute_id', query.disputeId);

      if (query.status && query.status !== 'all') {
        const mapped = {
          pending_review: ['pending'],
          processing: ['processing'],
          completed: ['succeeded'],
          failed: ['failed'],
          approved: ['processing'],
          rejected: ['failed'],
        }[query.status];
        if (mapped) q = q.in('status', mapped);
      }

      const sortColumn = {
        requestedAt: 'created_at',
        amount: 'amount_cents',
        status: 'status',
      }[query.sortField ?? 'requestedAt'];
      q = q.order(sortColumn, { ascending: query.sortDirection === 'asc' });

      const offset = (query.page - 1) * query.pageSize;
      q = q.range(offset, offset + query.pageSize - 1);

      const { data: refunds, error: rErr, count } = await q;
      if (rErr) {
        sendApiError(res, authReq.correlationId, 500, 'DB_ERROR', 'Failed to list refunds', { message: rErr.message });
        return;
      }

      const bookingIds = Array.from(new Set((refunds ?? []).map((r) => r.booking_id)));
      const { data: bookings } = bookingIds.length
        ? await db.from('bookings').select('id, user_id').in('id', bookingIds)
        : { data: [] };
      const bookingUser = new Map<string, string>((bookings ?? []).map((b) => [b.id as string, b.user_id as string]));

      const items = (refunds ?? []).map((r) => ({
        id: r.id,
        bookingId: r.booking_id,
        disputeId: r.dispute_id,
        userId: bookingUser.get(r.booking_id as string) ?? '',
        amount: Number(r.amount_cents) / 100,
        currency: r.currency,
        status: mapRefundStatus(r.status),
        reason: mapRefundReason(r.reason),
        adminNotes: r.reason ?? '',
        stripeRefundId: r.stripe_refund_id,
        requestedAt: r.created_at,
        processedAt: r.processed_at,
        processedBy: null,
      }));

      const totalCount = count ?? items.length;
      const totalPages = Math.ceil(totalCount / query.pageSize);

      sendSuccess(
        res,
        {
          items,
          totalCount,
          page: query.page,
          pageSize: query.pageSize,
          hasMore: query.page < totalPages,
          totalPages,
        },
        authReq.correlationId
      );
    } catch (error) {
      sendApiError(res, authReq.correlationId, 500, 'INTERNAL', 'Failed to list refunds');
    }
  }
);

router.post(
  '/refunds/trigger',
  validateBody(
    z.object({
      bookingId: uuidSchema,
      amount: z.number().min(0),
      refundReason: z.string().min(1),
      adminReason: z.string().min(10),
      correlationId: z.string().optional(),
    })
  ),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const body = req.body as { bookingId: string; amount: number; refundReason: string; adminReason: string };
    const db = getDbClient();

    // Create a pending refund row (if possible)
    const { data: booking, error: bErr } = await db
      .from('bookings')
      .select('id, request_id')
      .eq('id', body.bookingId)
      .maybeSingle();
    if (bErr || !booking) {
      sendApiError(res, authReq.correlationId, 404, 'NOT_FOUND', 'Booking not found');
      return;
    }

    const insert = {
      booking_id: body.bookingId,
      payment_id: null,
      dispute_id: null,
      amount_cents: Math.round(body.amount * 100),
      currency: 'USD',
      refund_type: 'partial',
      reason: body.refundReason,
      initiated_by: 'platform',
      stripe_refund_id: null,
      status: 'pending',
    };

    const { data: refund, error: rErr } = await db
      .from('refunds')
      .insert(insert)
      .select('id, booking_id, dispute_id, amount_cents, currency, status, reason, stripe_refund_id, created_at, processed_at')
      .maybeSingle();

    if (rErr || !refund) {
      sendApiError(res, authReq.correlationId, 500, 'DB_ERROR', 'Failed to create refund');
      return;
    }

    sendSuccess(
      res,
      {
        id: refund.id,
        bookingId: refund.booking_id,
        disputeId: refund.dispute_id,
        userId: '',
        amount: Number(refund.amount_cents) / 100,
        currency: refund.currency,
        status: mapRefundStatus(refund.status),
        reason: mapRefundReason(refund.reason),
        adminNotes: body.adminReason,
        stripeRefundId: refund.stripe_refund_id,
        requestedAt: refund.created_at,
        processedAt: refund.processed_at,
        processedBy: authReq.identity.sub,
      },
      authReq.correlationId,
      201
    );
  }
);

router.post(
  '/refunds/:refundId/approve',
  validateParams(z.object({ refundId: uuidSchema })),
  validateBody(z.object({ adjustedAmount: z.number().nullable().optional(), reason: z.string().min(10), correlationId: z.string().optional() })),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { refundId } = req.params as { refundId: string };
    const db = getDbClient();
    const { data: refund, error } = await db
      .from('refunds')
      .update({ status: 'processing', processed_at: new Date().toISOString() })
      .eq('id', refundId)
      .select('id, booking_id, dispute_id, amount_cents, currency, status, reason, stripe_refund_id, created_at, processed_at')
      .maybeSingle();

    if (error || !refund) {
      sendApiError(res, authReq.correlationId, 500, 'DB_ERROR', 'Failed to approve refund');
      return;
    }

    sendSuccess(
      res,
      {
        id: refund.id,
        bookingId: refund.booking_id,
        disputeId: refund.dispute_id,
        userId: '',
        amount: Number(refund.amount_cents) / 100,
        currency: refund.currency,
        status: 'approved',
        reason: mapRefundReason(refund.reason),
        adminNotes: '',
        stripeRefundId: refund.stripe_refund_id,
        requestedAt: refund.created_at,
        processedAt: refund.processed_at,
        processedBy: authReq.identity.sub,
      },
      authReq.correlationId
    );
  }
);

router.post(
  '/refunds/:refundId/reject',
  validateParams(z.object({ refundId: uuidSchema })),
  validateBody(z.object({ reason: z.string().min(10), correlationId: z.string().optional() })),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { refundId } = req.params as { refundId: string };
    const db = getDbClient();
    const { data: refund, error } = await db
      .from('refunds')
      .update({ status: 'failed', processed_at: new Date().toISOString() })
      .eq('id', refundId)
      .select('id, booking_id, dispute_id, amount_cents, currency, status, reason, stripe_refund_id, created_at, processed_at')
      .maybeSingle();

    if (error || !refund) {
      sendApiError(res, authReq.correlationId, 500, 'DB_ERROR', 'Failed to reject refund');
      return;
    }

    sendSuccess(
      res,
      {
        id: refund.id,
        bookingId: refund.booking_id,
        disputeId: refund.dispute_id,
        userId: '',
        amount: Number(refund.amount_cents) / 100,
        currency: refund.currency,
        status: 'rejected',
        reason: mapRefundReason(refund.reason),
        adminNotes: '',
        stripeRefundId: refund.stripe_refund_id,
        requestedAt: refund.created_at,
        processedAt: refund.processed_at,
        processedBy: authReq.identity.sub,
      },
      authReq.correlationId
    );
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Matching
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/matching/overrides',
  validateQuery(matchingOverrideListQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const query = req.query as unknown as z.infer<typeof matchingOverrideListQuerySchema>;
    const totalPages = 0;
    // Overrides are not part of the base schema; return empty list by default.
    sendSuccess(
      res,
      {
        items: [],
        totalCount: 0,
        page: query.page,
        pageSize: query.pageSize,
        hasMore: false,
        totalPages,
      },
      authReq.correlationId
    );
  }
);

router.post(
  '/matching/overrides',
  validateBody(
    z.object({
      type: z.enum(['force_assign', 'force_unassign', 'priority_boost', 'blacklist']),
      tripRequestId: uuidSchema,
      agentId: uuidSchema.nullable(),
      expiresAt: z.string().nullable(),
      reason: z.string().min(10),
      correlationId: z.string().optional(),
    })
  ),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const body = req.body as {
      type: 'force_assign' | 'force_unassign' | 'priority_boost' | 'blacklist';
      tripRequestId: string;
      agentId: string | null;
      expiresAt: string | null;
      reason: string;
    };

    // Not persisted; return a synthetic override for UI flows.
    sendSuccess(
      res,
      {
        id: crypto.randomUUID(),
        type: body.type,
        tripRequestId: body.tripRequestId,
        agentId: body.agentId,
        expiresAt: body.expiresAt,
        createdBy: authReq.identity.sub,
        reason: body.reason,
        createdAt: new Date().toISOString(),
        isActive: true,
      },
      authReq.correlationId,
      201
    );
  }
);

router.post(
  '/matching/overrides/:overrideId/cancel',
  validateParams(z.object({ overrideId: z.string().min(1) })),
  validateBody(z.object({ reason: z.string().min(10), correlationId: z.string().optional() })),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { overrideId } = req.params as { overrideId: string };
    sendSuccess(
      res,
      {
        id: overrideId,
        type: 'force_assign',
        tripRequestId: crypto.randomUUID(),
        agentId: null,
        expiresAt: null,
        createdBy: authReq.identity.sub,
        reason: 'cancelled',
        createdAt: new Date().toISOString(),
        isActive: false,
      },
      authReq.correlationId
    );
  }
);

router.get(
  '/matching/pending-requests',
  validateQuery(tripRequestPendingQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const query = req.query as unknown as z.infer<typeof tripRequestPendingQuerySchema>;
    const db = getDbClient();

    const offset = (query.page - 1) * query.pageSize;
    const { data: requests, error, count } = await db
      .from('travel_requests')
      .select('id, user_id, destination, departure_date, return_date, state, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + query.pageSize - 1);

    if (error) {
      sendApiError(res, authReq.correlationId, 500, 'DB_ERROR', 'Failed to list pending requests', { message: error.message });
      return;
    }

    const items = (requests ?? [])
      .filter((r) => (r.state as string) === 'SUBMITTED')
      .map((r) => {
        const dest = r.destination as any;
        const destination = dest?.city && dest?.country ? `${dest.city}, ${dest.country}` : JSON.stringify(dest ?? {});
        const createdAt = new Date(r.created_at as string);
        const waitingDays = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
        return {
          id: r.id,
          destination,
          startDate: r.departure_date,
          endDate: r.return_date,
          status: (r.state as string).toLowerCase(),
          userId: r.user_id,
          waitingDays,
        };
      });

    const totalCount = count ?? items.length;
    const totalPages = Math.ceil(totalCount / query.pageSize);

    sendSuccess(
      res,
      {
        items,
        totalCount,
        page: query.page,
        pageSize: query.pageSize,
        hasMore: query.page < totalPages,
        totalPages,
      },
      authReq.correlationId
    );
  }
);

router.get(
  '/matching/available-agents/:tripRequestId',
  validateParams(z.object({ tripRequestId: uuidSchema })),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const db = getDbClient();

    const { data: users, error } = await db
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('role', 'agent')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      sendApiError(res, authReq.correlationId, 500, 'DB_ERROR', 'Failed to list available agents');
      return;
    }

    sendSuccess(
      res,
      (users ?? []).map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
      })),
      authReq.correlationId
    );
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Audit
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/audit/events',
  validateQuery(auditQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const query = req.query as unknown as z.infer<typeof auditQuerySchema>;
    const db = getDbClient();

    let q = db
      .from('audit_events')
      .select(
        'id, event_type, occurred_at, correlation_id, actor_type, actor_id, resource_type, resource_id, action, description, metadata, created_at',
        { count: 'exact' }
      );

    if (query.actorType) q = q.eq('actor_type', query.actorType);
    if (query.actorId) q = q.eq('actor_id', query.actorId);
    if (query.targetType) q = q.eq('resource_type', query.targetType);
    if (query.targetId) q = q.eq('resource_id', query.targetId);
    if (query.action) q = q.ilike('action', `%${query.action}%`);
    if (query.search) q = q.or(`description.ilike.%${query.search}%,event_type.ilike.%${query.search}%`);
    if (query.startDate) q = q.gte('occurred_at', query.startDate);
    if (query.endDate) q = q.lte('occurred_at', query.endDate);

    q = q.order('occurred_at', { ascending: false });

    const offset = (query.page - 1) * query.pageSize;
    q = q.range(offset, offset + query.pageSize - 1);

    const { data: rows, error, count } = await q;
    if (error) {
      sendApiError(res, authReq.correlationId, 500, 'DB_ERROR', 'Failed to query audit events', { message: error.message });
      return;
    }

    const actorIds = Array.from(
      new Set(
        (rows ?? [])
          .map((r) => r.actor_id)
          .filter((v) => typeof v === 'string' && v.length > 0) as string[]
      )
    );
    const { data: actorUsers } = actorIds.length
      ? await db.from('users').select('id, email').in('id', actorIds)
      : { data: [] };
    const actorEmail = new Map<string, string>((actorUsers ?? []).map((u) => [u.id as string, u.email as string]));

    const events = (rows ?? [])
      .map((r) => {
        const category = mapAuditCategory(r.resource_type as string, r.event_type as string);
        return {
          id: r.id,
          timestamp: (r.occurred_at ?? r.created_at) as string,
          category,
          severity: mapAuditSeverity(r.action as string),
          action: (r.description ?? r.action ?? r.event_type ?? 'Event') as string,
          actorType: (r.actor_type ?? 'system') as 'admin' | 'system' | 'user' | 'agent',
          actorId: (r.actor_id ?? '') as string,
          actorEmail: r.actor_id ? actorEmail.get(r.actor_id as string) ?? null : null,
          targetType: (r.resource_type ?? null) as string | null,
          targetId: (r.resource_id ?? null) as string | null,
          reason: (r.metadata as any)?.reason ?? null,
          metadata: (r.metadata ?? {}) as Record<string, unknown>,
          ipAddress: null,
          userAgent: null,
          correlationId: (r.correlation_id ?? '') as string,
          previousState: null,
          newState: null,
        };
      })
      .filter((e) => {
        if (query.category && e.category !== query.category) return false;
        if (query.severity && e.severity !== query.severity) return false;
        return true;
      });

    const totalCount = count ?? events.length;
    const totalPages = Math.ceil(totalCount / query.pageSize);

    sendSuccess(
      res,
      {
        events,
        totalCount,
        page: query.page,
        pageSize: query.pageSize,
        hasMore: query.page < totalPages,
      },
      authReq.correlationId
    );
  }
);

router.get(
  '/audit/events/:eventId',
  validateParams(z.object({ eventId: uuidSchema })),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { eventId } = req.params as { eventId: string };
    const db = getDbClient();
    const { data: r, error } = await db
      .from('audit_events')
      .select('id, event_type, occurred_at, correlation_id, actor_type, actor_id, resource_type, resource_id, action, description, metadata, created_at')
      .eq('id', eventId)
      .maybeSingle();

    if (error || !r) {
      sendApiError(res, authReq.correlationId, 404, 'NOT_FOUND', 'Audit event not found');
      return;
    }

    sendSuccess(
      res,
      {
        id: r.id,
        timestamp: (r.occurred_at ?? r.created_at) as string,
        category: mapAuditCategory(r.resource_type as string, r.event_type as string),
        severity: mapAuditSeverity(r.action as string),
        action: (r.description ?? r.action ?? r.event_type ?? 'Event') as string,
        actorType: (r.actor_type ?? 'system') as 'admin' | 'system' | 'user' | 'agent',
        actorId: (r.actor_id ?? '') as string,
        actorEmail: null,
        targetType: (r.resource_type ?? null) as string | null,
        targetId: (r.resource_id ?? null) as string | null,
        reason: (r.metadata as any)?.reason ?? null,
        metadata: (r.metadata ?? {}) as Record<string, unknown>,
        ipAddress: null,
        userAgent: null,
        correlationId: (r.correlation_id ?? '') as string,
        previousState: null,
        newState: null,
      },
      authReq.correlationId
    );
  }
);

router.get(
  '/audit/targets/:targetType/:targetId',
  validateParams(z.object({ targetType: z.string().min(1), targetId: z.string().min(1) })),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { targetType, targetId } = req.params as { targetType: string; targetId: string };
    const db = getDbClient();

    const { data: rows } = await db
      .from('audit_events')
      .select('id, event_type, occurred_at, correlation_id, actor_type, actor_id, resource_type, resource_id, action, description, metadata, created_at', {
        count: 'exact',
      })
      .eq('resource_type', targetType)
      .eq('resource_id', targetId)
      .order('occurred_at', { ascending: false })
      .range(0, 49);

    const events = (rows ?? []).map((r) => ({
      id: r.id,
      timestamp: (r.occurred_at ?? r.created_at) as string,
      category: mapAuditCategory(r.resource_type as string, r.event_type as string),
      severity: mapAuditSeverity(r.action as string),
      action: (r.description ?? r.action ?? r.event_type ?? 'Event') as string,
      actorType: (r.actor_type ?? 'system') as 'admin' | 'system' | 'user' | 'agent',
      actorId: (r.actor_id ?? '') as string,
      actorEmail: null,
      targetType: (r.resource_type ?? null) as string | null,
      targetId: (r.resource_id ?? null) as string | null,
      reason: (r.metadata as any)?.reason ?? null,
      metadata: (r.metadata ?? {}) as Record<string, unknown>,
      ipAddress: null,
      userAgent: null,
      correlationId: (r.correlation_id ?? '') as string,
      previousState: null,
      newState: null,
    }));

    sendSuccess(
      res,
      {
        events,
        totalCount: events.length,
        page: 1,
        pageSize: events.length,
        hasMore: false,
      },
      authReq.correlationId
    );
  }
);

router.get(
  '/audit/statistics',
  validateQuery(z.object({ periodDays: z.coerce.number().int().min(1).max(365).default(30) })),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { periodDays } = req.query as unknown as { periodDays: number };
    const db = getDbClient();

    const from = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();
    const { data: rows, error } = await db
      .from('audit_events')
      .select('event_type, occurred_at, actor_type, resource_type, action')
      .gte('occurred_at', from);
    if (error) {
      sendApiError(res, authReq.correlationId, 500, 'DB_ERROR', 'Failed to load audit statistics');
      return;
    }

    const eventsByCategory: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};
    const eventsByActorType: Record<string, number> = {};
    let recentCriticalEvents = 0;

    for (const r of rows ?? []) {
      const category = mapAuditCategory(r.resource_type as string, r.event_type as string);
      const severity = mapAuditSeverity(r.action as string);
      const actorType = (r.actor_type ?? 'system') as string;

      eventsByCategory[category] = (eventsByCategory[category] ?? 0) + 1;
      eventsBySeverity[severity] = (eventsBySeverity[severity] ?? 0) + 1;
      eventsByActorType[actorType] = (eventsByActorType[actorType] ?? 0) + 1;
      if (severity === 'critical') recentCriticalEvents += 1;
    }

    sendSuccess(
      res,
      {
        totalEvents: (rows ?? []).length,
        eventsByCategory,
        eventsBySeverity,
        eventsByActorType,
        recentCriticalEvents,
        periodStart: from,
        periodEnd: new Date().toISOString(),
      },
      authReq.correlationId
    );
  }
);

router.post(
  '/audit/export',
  validateBody(
    z.object({
      filters: z.record(z.any()).default({}),
      format: z.enum(['csv', 'json']),
      includeMetadata: z.boolean().default(true),
    })
  ),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    // Minimal dev implementation: return a stubbed download URL.
    sendSuccess(
      res,
      {
        downloadUrl: 'about:blank',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        recordCount: 0,
      },
      authReq.correlationId
    );
  }
);

export { router as adminRouter };
