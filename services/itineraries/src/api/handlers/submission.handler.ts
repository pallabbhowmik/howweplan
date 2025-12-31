import type { Request, Response, NextFunction } from 'express';
import type { SubmissionService } from '../../services/submission.service.js';
import type { AuthenticatedRequest } from '../middleware/index.js';
import { 
  createSubmissionRequestSchema,
  listSubmissionsQuerySchema,
  type SubmissionResponse,
} from '../dto/index.js';
import { withSubmissionMeta, type Submission } from '../../models/index.js';

/**
 * Handlers for submission endpoints.
 */
export class SubmissionHandler {
  constructor(private readonly submissionService: SubmissionService) {}

  /**
   * Create a new submission.
   * POST /api/v1/submissions
   */
  create = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const input = createSubmissionRequestSchema.parse(req.body);

      const submission = await this.submissionService.createSubmission(
        input,
        user.sub
      );

      const response = this.toResponse(withSubmissionMeta(submission));
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get a submission by ID.
   * GET /api/v1/submissions/:id
   */
  getById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({ error: 'Submission ID required' });
        return;
      }

      const submission = await this.submissionService.getSubmission(id);
      const response = this.toResponse(withSubmissionMeta(submission));
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * List submissions with filters.
   * GET /api/v1/submissions
   */
  list = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = listSubmissionsQuerySchema.parse(req.query);

      let submissions: Submission[];
      if (query.requestId) {
        submissions = await this.submissionService.getSubmissionsForRequest(query.requestId);
      } else if (query.agentId) {
        submissions = await this.submissionService.getSubmissionsByAgent(query.agentId);
      } else {
        // For now, return empty if no filter (would need admin endpoint for all)
        submissions = [];
      }

      // Filter by status if provided
      if (query.status) {
        submissions = submissions.filter(s => s.status === query.status);
      }

      // Paginate
      const start = (query.page - 1) * query.limit;
      const end = start + query.limit;
      const paginatedSubmissions = submissions.slice(start, end);

      const response = {
        items: paginatedSubmissions.map(s => this.toResponse(withSubmissionMeta(s))),
        total: submissions.length,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(submissions.length / query.limit),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get submissions for a request.
   * GET /api/v1/requests/:requestId/submissions
   */
  getByRequest = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { requestId } = req.params;
      
      if (!requestId) {
        res.status(400).json({ error: 'Request ID required' });
        return;
      }

      const submissions = await this.submissionService.getSubmissionsForRequest(requestId);
      const response = submissions.map(s => this.toResponse(withSubmissionMeta(s)));
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Convert submission to response DTO.
   */
  private toResponse(submission: ReturnType<typeof withSubmissionMeta>): SubmissionResponse {
    return {
      id: submission.id,
      requestId: submission.requestId,
      agentId: submission.agentId,
      travelerId: submission.travelerId,
      source: submission.source,
      status: submission.status,
      statusLabel: submission.statusLabel,
      isProcessed: submission.isProcessed,
      isSuccessful: submission.isSuccessful,
      resultingItineraryId: submission.resultingItineraryId,
      errorMessage: submission.errorMessage,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
      processedAt: submission.processedAt,
    };
  }
}
