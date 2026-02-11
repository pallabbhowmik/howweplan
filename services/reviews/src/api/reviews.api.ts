/**
 * Reviews API Routes
 * 
 * HTTP endpoints for review management.
 * Uses Hono for routing (lightweight, fast, TypeScript-first).
 */

import { Hono, Context, Next } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { reviewService } from '../services';
import { reviewRepository, auditRepository } from '../repositories';
import { ReviewStatus, ReviewerType } from '../models';
import {
  SubmitReviewRequestSchema,
  SaveDraftRequestSchema,
  GetReviewsQuerySchema,
  ModerateReviewRequestSchema,
  ToggleReviewVisibilityRequestSchema,
  PublicReviewResponseSchema,
} from '../schemas';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface AuthContext {
  userId: string;
  userType: 'TRAVELER' | 'AGENT' | 'ADMIN';
}

// =============================================================================
// MIDDLEWARE HELPERS
// =============================================================================

/**
 * Extract auth context from request headers
 * In production, this would verify JWT and extract claims
 */
function getAuthContext(c: Context): AuthContext | null {
  const userId = c.req.header('x-user-id');
  // Support both x-user-type (direct) and x-user-role (from API gateway)
  const rawType = c.req.header('x-user-type') || c.req.header('x-user-role') || '';
  
  // Normalize role values: gateway sends 'user'/'agent'/'admin', we need 'TRAVELER'/'AGENT'/'ADMIN'
  const roleMap: Record<string, AuthContext['userType']> = {
    'user': 'TRAVELER',
    'traveler': 'TRAVELER',
    'TRAVELER': 'TRAVELER',
    'agent': 'AGENT',
    'AGENT': 'AGENT',
    'admin': 'ADMIN',
    'ADMIN': 'ADMIN',
  };
  const userType = roleMap[rawType.toLowerCase()] || roleMap[rawType];

  if (!userId || !userType) return null;
  return { userId, userType };
}

/**
 * Require authentication middleware
 */
async function requireAuth(c: Context, next: Next): Promise<Response | void> {
  const auth = getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
}

/**
 * Require admin role middleware
 */
async function requireAdmin(c: Context, next: Next): Promise<Response | void> {
  const auth = getAuthContext(c);
  if (!auth || auth.userType !== 'ADMIN') {
    return c.json({ error: 'Forbidden - Admin access required' }, 403);
  }
  await next();
}

// =============================================================================
// PUBLIC ROUTES
// =============================================================================

const publicRoutes = new Hono();

/**
 * GET /reviews/public/:subjectId
 * Get published reviews for an agent or traveler
 */
publicRoutes.get(
  '/public/:subjectId',
  zValidator('param', z.object({ subjectId: z.string().uuid() })),
  zValidator('query', z.object({
    page: z.coerce.number().positive().default(1),
    limit: z.coerce.number().positive().max(50).default(20),
  })),
  async (c) => {
    const { subjectId } = c.req.valid('param');
    const { page, limit } = c.req.valid('query');

    const result = await reviewRepository.findMany(
      { subjectId, status: ReviewStatus.PUBLISHED },
      { page, limit, sortBy: 'publishedAt', sortOrder: 'desc' }
    );

    // Transform to public response format (anonymize reviewer details)
    const publicReviews = result.items.map(review => ({
      id: review.id,
      reviewerType: review.reviewerType,
      reviewerDisplayName: 'Verified Traveler',  // Would be fetched from users service
      reviewerAvatarUrl: null,
      ratings: review.ratings,
      title: review.title ?? null,
      content: review.content,
      publishedAt: review.publishedAt,
      tripMonth: review.tripCompletedAt.toLocaleString('default', { month: 'long', year: 'numeric' }),
      tripType: null,  // Would be fetched from booking details
    }));

    return c.json({
      items: publicReviews,
      pagination: {
        page,
        limit,
        totalItems: result.totalCount,
        totalPages: result.totalPages,
        hasNextPage: page < result.totalPages,
        hasPreviousPage: page > 1,
      },
    });
  }
);

// =============================================================================
// AUTHENTICATED USER ROUTES
// =============================================================================

const userRoutes = new Hono();

// Apply auth middleware to all user routes
userRoutes.use('*', requireAuth);

/**
 * GET /reviews/my
 * Get current user's reviews (both given and received)
 */
userRoutes.get('/my', async (c) => {
  const auth = getAuthContext(c)!;

  const [given, received] = await Promise.all([
    reviewRepository.findMany(
      { reviewerId: auth.userId },
      { page: 1, limit: 50, sortBy: 'createdAt', sortOrder: 'desc' }
    ),
    reviewRepository.findMany(
      { subjectId: auth.userId },
      { page: 1, limit: 50, sortBy: 'createdAt', sortOrder: 'desc' }
    ),
  ]);

  return c.json({
    given: given.items,
    received: received.items,
  });
});

/**
 * GET /reviews/pending
 * Get pending reviews the user needs to submit
 */
userRoutes.get('/pending', async (c) => {
  const auth = getAuthContext(c)!;

  const result = await reviewRepository.findMany(
    { 
      reviewerId: auth.userId,
      status: ReviewStatus.PENDING_SUBMISSION,
    },
    { page: 1, limit: 50, sortBy: 'createdAt', sortOrder: 'desc' }
  );

  // Filter to only those within submission window
  const pending = result.items.filter(r => new Date() < r.submissionDeadline);

  return c.json({ pending });
});

/**
 * GET /reviews/:reviewId
 * Get a specific review (user must be reviewer or subject)
 */
userRoutes.get(
  '/:reviewId',
  zValidator('param', z.object({ reviewId: z.string().uuid() })),
  async (c) => {
    const auth = getAuthContext(c)!;
    const { reviewId } = c.req.valid('param');

    const review = await reviewRepository.findById(reviewId);

    if (!review) {
      return c.json({ error: 'Review not found' }, 404);
    }

    // Check access - must be reviewer, subject, or review must be published
    const isReviewer = review.reviewerId === auth.userId;
    const isSubject = review.subjectId === auth.userId;
    const isPublished = review.status === ReviewStatus.PUBLISHED;

    if (!isReviewer && !isSubject && !isPublished) {
      return c.json({ error: 'Not authorized to view this review' }, 403);
    }

    // If subject viewing unpublished review, hide content
    if (isSubject && !isPublished && !isReviewer) {
      return c.json({ error: 'Review is not yet published' }, 403);
    }

    return c.json(review);
  }
);

/**
 * POST /reviews/:reviewId/draft
 * Save a review as draft
 */
userRoutes.post(
  '/:reviewId/draft',
  zValidator('param', z.object({ reviewId: z.string().uuid() })),
  zValidator('json', SaveDraftRequestSchema.omit({ bookingId: true })),
  async (c) => {
    const auth = getAuthContext(c)!;
    const { reviewId } = c.req.valid('param');
    const body = c.req.valid('json');

    // Transform body to match expected type (handle partial ratings for draft)
    const updates: Parameters<typeof reviewService.saveDraft>[2] = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.content !== undefined) updates.content = body.content;
    if (body.ratings?.overall !== undefined) {
      updates.ratings = {
        overall: body.ratings.overall,
        ...body.ratings,
      };
    }

    const result = await reviewService.saveDraft(reviewId, auth.userId, updates);

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    return c.json(result.data);
  }
);

/**
 * POST /reviews/:reviewId/submit
 * Submit a review for publication
 */
userRoutes.post(
  '/:reviewId/submit',
  zValidator('param', z.object({ reviewId: z.string().uuid() })),
  zValidator('json', SubmitReviewRequestSchema.omit({ bookingId: true })),
  async (c) => {
    const auth = getAuthContext(c)!;
    const { reviewId } = c.req.valid('param');
    const body = c.req.valid('json');

    const result = await reviewService.submitReview(
      { reviewId, ...body },
      auth.userId
    );

    if (!result.success) {
      const status = result.error?.code === 'REVIEW_011' ? 409 : 400;  // 409 for gaming/duplicate detection
      return c.json({ error: result.error }, status);
    }

    return c.json(result.data);
  }
);

/**
 * GET /reviews/eligibility/:bookingId
 * Check if user can submit a review for a booking
 */
userRoutes.get(
  '/eligibility/:bookingId',
  zValidator('param', z.object({ bookingId: z.string().uuid() })),
  async (c) => {
    const auth = getAuthContext(c)!;
    const { bookingId } = c.req.valid('param');

    const existingReview = await reviewRepository.findByBookingAndReviewer(
      bookingId,
      auth.userId
    );

    if (!existingReview) {
      return c.json({
        bookingId,
        canSubmitReview: false,
        reason: 'No review invitation found for this booking',
        submissionDeadline: null,
        existingReviewId: null,
        existingReviewStatus: null,
      });
    }

    const canSubmit = 
      [ReviewStatus.PENDING_SUBMISSION, ReviewStatus.DRAFT].includes(existingReview.status) &&
      new Date() < existingReview.submissionDeadline;

    return c.json({
      bookingId,
      canSubmitReview: canSubmit,
      reason: canSubmit ? null : 'Review already submitted or window expired',
      submissionDeadline: existingReview.submissionDeadline,
      existingReviewId: existingReview.id,
      existingReviewStatus: existingReview.status,
    });
  }
);

// =============================================================================
// ADMIN ROUTES
// =============================================================================

const adminRoutes = new Hono();

// Apply admin middleware to all admin routes
adminRoutes.use('*', requireAdmin);

/**
 * GET /reviews/admin/moderation-queue
 * Get reviews pending moderation
 */
adminRoutes.get('/moderation-queue', async (c) => {
  const result = await reviewRepository.findMany(
    { status: ReviewStatus.UNDER_MODERATION },
    { page: 1, limit: 50, sortBy: 'createdAt', sortOrder: 'asc' }
  );

  return c.json(result);
});

/**
 * GET /reviews/admin/:reviewId
 * Get full review details (admin view)
 */
adminRoutes.get(
  '/:reviewId',
  zValidator('param', z.object({ reviewId: z.string().uuid() })),
  async (c) => {
    const { reviewId } = c.req.valid('param');

    const review = await reviewRepository.findById(reviewId);

    if (!review) {
      return c.json({ error: 'Review not found' }, 404);
    }

    // Get audit trail
    const auditTrail = await auditRepository.getReviewAuditTrail(reviewId);

    return c.json({
      review,
      auditTrail,
    });
  }
);

/**
 * POST /reviews/admin/:reviewId/moderate
 * Moderate a review (approve/reject)
 */
adminRoutes.post(
  '/:reviewId/moderate',
  zValidator('param', z.object({ reviewId: z.string().uuid() })),
  zValidator('json', ModerateReviewRequestSchema.omit({ reviewId: true })),
  async (c) => {
    const auth = getAuthContext(c)!;
    const { reviewId } = c.req.valid('param');
    const body = c.req.valid('json');

    const result = await reviewService.moderateReview({
      reviewId,
      ...body,
      adminId: auth.userId,
    });

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    return c.json(result.data);
  }
);

/**
 * POST /reviews/admin/:reviewId/hide
 * Hide a published review
 */
adminRoutes.post(
  '/:reviewId/hide',
  zValidator('param', z.object({ reviewId: z.string().uuid() })),
  zValidator('json', z.object({
    reason: z.string().min(10).max(500),
  })),
  async (c) => {
    const auth = getAuthContext(c)!;
    const { reviewId } = c.req.valid('param');
    const { reason } = c.req.valid('json');

    const result = await reviewService.hideReview(reviewId, auth.userId, reason);

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    return c.json(result.data);
  }
);

/**
 * POST /reviews/admin/:reviewId/unhide
 * Unhide a hidden review
 */
adminRoutes.post(
  '/:reviewId/unhide',
  zValidator('param', z.object({ reviewId: z.string().uuid() })),
  zValidator('json', z.object({
    reason: z.string().min(10).max(500),
  })),
  async (c) => {
    const auth = getAuthContext(c)!;
    const { reviewId } = c.req.valid('param');
    const { reason } = c.req.valid('json');

    const result = await reviewService.unhideReview(reviewId, auth.userId, reason);

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    return c.json(result.data);
  }
);

/**
 * GET /reviews/admin/search
 * Search reviews with filters (admin)
 */
adminRoutes.get(
  '/search',
  zValidator('query', GetReviewsQuerySchema),
  async (c) => {
    const query = c.req.valid('query');

    const result = await reviewRepository.findMany(
      {
        agentId: query.agentId,
        travelerId: query.travelerId,
        bookingId: query.bookingId,
        status: query.status,
        reviewerType: query.reviewerType,
        minRating: query.minRating,
        maxRating: query.maxRating,
        fromDate: query.fromDate,
        toDate: query.toDate,
      },
      {
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      }
    );

    return c.json({
      items: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        totalItems: result.totalCount,
        totalPages: result.totalPages,
        hasNextPage: result.page < result.totalPages,
        hasPreviousPage: result.page > 1,
      },
    });
  }
);

// =============================================================================
// EXPORT COMBINED ROUTER
// =============================================================================

const combinedRoutes = new Hono();

// Mount direct /my endpoint at root level (for frontend compatibility)
// This allows /api/v1/reviews/my to work directly
combinedRoutes.get('/my', requireAuth, async (c) => {
  const auth = getAuthContext(c)!;

  const [given, received] = await Promise.all([
    reviewRepository.findMany(
      { reviewerId: auth.userId },
      { page: 1, limit: 50, sortBy: 'createdAt', sortOrder: 'desc' }
    ),
    reviewRepository.findMany(
      { subjectId: auth.userId },
      { page: 1, limit: 50, sortBy: 'createdAt', sortOrder: 'desc' }
    ),
  ]);

  return c.json({
    given: given.items,
    received: received.items,
  });
});

// Mount subrouters
combinedRoutes.route('/public', publicRoutes);
combinedRoutes.route('/user', userRoutes);
combinedRoutes.route('/admin', adminRoutes);

export const reviewsApi = combinedRoutes;
