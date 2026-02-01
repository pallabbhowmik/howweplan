import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import {
  templateRepository,
  type CreateTemplateInput,
  type UpdateTemplateInput,
  type TemplateFilter,
  type TemplateSuggestion,
} from '../../repository/template.repository.js';
import {
  createTemplateRequestSchema,
  updateTemplateRequestSchema,
  listTemplatesQuerySchema,
  suggestionsQuerySchema,
  duplicateTemplateRequestSchema,
  recordUsageRequestSchema,
} from '../dto/template.dto.js';
import { env } from '../../env.js';

// ============================================================================
// Types
// ============================================================================

interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    role: string;
    agentId?: string;
  };
  correlationId: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function sendSuccess<T>(res: Response, data: T, correlationId: string, statusCode = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
    requestId: correlationId,
    timestamp: new Date().toISOString(),
  });
}

function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  correlationId: string
): void {
  res.status(statusCode).json({
    success: false,
    error: { code, message },
    requestId: correlationId,
    timestamp: new Date().toISOString(),
  });
}

async function getAgentId(req: AuthenticatedRequest): Promise<string | null> {
  // If agentId is already in the token
  if (req.user?.agentId) {
    return req.user.agentId;
  }
  
  // For agents, we need to look up their agent ID from user ID
  const userId = req.user?.sub;
  if (!userId) {
    return null;
  }

  // Look up the agent record by user_id
  try {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      console.warn(`Agent lookup failed for user ${userId}:`, error?.message);
      return null;
    }

    return data.id;
  } catch (err) {
    console.error('Error looking up agent:', err);
    return null;
  }
}

// ============================================================================
// Handler Class
// ============================================================================

export class TemplateHandler {
  /**
   * Create a new template.
   * POST /api/v1/templates
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    
    try {
      const agentId = await getAgentId(authReq);
      if (!agentId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Agent ID not found', authReq.correlationId);
        return;
      }

      const parsed = createTemplateRequestSchema.parse(req.body);
      
      const input: CreateTemplateInput = {
        name: parsed.name,
        description: parsed.description ?? null,
        templateType: parsed.templateType,
        content: parsed.content,
        destinations: parsed.destinations,
        travelStyles: parsed.travelStyles,
        durationDays: parsed.durationDays ?? null,
        budgetTier: parsed.budgetTier ?? null,
        tags: parsed.tags,
        isFavorite: parsed.isFavorite,
      };

      const template = await templateRepository.create(agentId, input);
      
      sendSuccess(res, template, authReq.correlationId, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        sendError(res, 400, 'VALIDATION_ERROR', error.errors[0]?.message ?? 'Validation error', authReq.correlationId);
        return;
      }
      next(error);
    }
  };

  /**
   * List templates for the current agent.
   * GET /api/v1/templates
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    
    try {
      const agentId = await getAgentId(authReq);
      if (!agentId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Agent ID not found', authReq.correlationId);
        return;
      }

      const query = listTemplatesQuerySchema.parse(req.query);
      
      const filter: TemplateFilter = {
        templateType: query.templateType,
        destination: query.destination,
        travelStyle: query.travelStyle,
        budgetTier: query.budgetTier,
        tag: query.tag,
        isFavorite: query.isFavorite,
        isArchived: query.isArchived,
        search: query.search,
      };

      const { templates, total } = await templateRepository.list(agentId, filter, {
        limit: query.limit,
        offset: query.offset,
      });

      sendSuccess(res, {
        templates,
        pagination: {
          total,
          limit: query.limit,
          offset: query.offset,
          hasMore: query.offset + templates.length < total,
        },
      }, authReq.correlationId);
    } catch (error) {
      if (error instanceof z.ZodError) {
        sendError(res, 400, 'VALIDATION_ERROR', error.errors[0]?.message ?? 'Validation error', authReq.correlationId);
        return;
      }
      next(error);
    }
  };

  /**
   * Get a template by ID.
   * GET /api/v1/templates/:id
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    
    try {
      const agentId = await getAgentId(authReq);
      if (!agentId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Agent ID not found', authReq.correlationId);
        return;
      }

      const id = req.params.id;
      if (!id) {
        sendError(res, 400, 'BAD_REQUEST', 'Template ID is required', authReq.correlationId);
        return;
      }

      const template = await templateRepository.findById(id, agentId);

      if (!template) {
        sendError(res, 404, 'NOT_FOUND', 'Template not found', authReq.correlationId);
        return;
      }

      sendSuccess(res, template, authReq.correlationId);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update a template.
   * PUT /api/v1/templates/:id
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    
    try {
      const agentId = await getAgentId(authReq);
      if (!agentId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Agent ID not found', authReq.correlationId);
        return;
      }

      const id = req.params.id;
      if (!id) {
        sendError(res, 400, 'BAD_REQUEST', 'Template ID is required', authReq.correlationId);
        return;
      }

      const parsed = updateTemplateRequestSchema.parse(req.body);

      const input: UpdateTemplateInput = {
        name: parsed.name,
        description: parsed.description,
        content: parsed.content,
        destinations: parsed.destinations,
        travelStyles: parsed.travelStyles,
        durationDays: parsed.durationDays,
        budgetTier: parsed.budgetTier,
        tags: parsed.tags,
        isFavorite: parsed.isFavorite,
        isArchived: parsed.isArchived,
      };

      const template = await templateRepository.update(id, agentId, input);

      if (!template) {
        sendError(res, 404, 'NOT_FOUND', 'Template not found', authReq.correlationId);
        return;
      }

      sendSuccess(res, template, authReq.correlationId);
    } catch (error) {
      if (error instanceof z.ZodError) {
        sendError(res, 400, 'VALIDATION_ERROR', error.errors[0]?.message ?? 'Validation error', authReq.correlationId);
        return;
      }
      next(error);
    }
  };

  /**
   * Delete a template.
   * DELETE /api/v1/templates/:id
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    
    try {
      const agentId = await getAgentId(authReq);
      if (!agentId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Agent ID not found', authReq.correlationId);
        return;
      }

      const id = req.params.id;
      if (!id) {
        sendError(res, 400, 'BAD_REQUEST', 'Template ID is required', authReq.correlationId);
        return;
      }

      const deleted = await templateRepository.delete(id, agentId);

      if (!deleted) {
        sendError(res, 404, 'NOT_FOUND', 'Template not found', authReq.correlationId);
        return;
      }

      sendSuccess(res, { deleted: true }, authReq.correlationId);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get smart template suggestions.
   * GET /api/v1/templates/suggestions
   * 
   * This endpoint is resilient - returns empty array on errors rather than failing.
   */
  getSuggestions = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    
    try {
      const agentId = await getAgentId(authReq);
      if (!agentId) {
        // Return empty suggestions instead of error for better UX
        console.warn('Agent ID not found for template suggestions, returning empty');
        sendSuccess(res, { suggestions: [] }, authReq.correlationId);
        return;
      }

      let query: { destination?: string; travelStyle?: string; duration?: number; limit?: number };
      try {
        query = suggestionsQuerySchema.parse(req.query);
      } catch (parseError) {
        // If query params are invalid, use defaults
        console.warn('Invalid suggestions query params, using defaults:', parseError);
        query = { limit: 5 };
      }

      let suggestions: TemplateSuggestion[] = [];
      try {
        suggestions = await templateRepository.getSuggestions(
          agentId,
          {
            destination: query.destination,
            travelStyle: query.travelStyle,
            duration: query.duration,
          },
          query.limit
        );
      } catch (repoError) {
        // If repository fails (table doesn't exist, etc.), return empty array
        console.error('Template repository error:', repoError);
        suggestions = [];
      }

      sendSuccess(res, { suggestions }, authReq.correlationId);
    } catch (error) {
      // Catch-all: return empty suggestions rather than crashing
      console.error('Unexpected error in getSuggestions:', error);
      sendSuccess(res, { suggestions: [] }, authReq.correlationId);
    }
  };

  /**
   * Duplicate a template.
   * POST /api/v1/templates/:id/duplicate
   */
  duplicate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    
    try {
      const agentId = await getAgentId(authReq);
      if (!agentId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Agent ID not found', authReq.correlationId);
        return;
      }

      const id = req.params.id;
      if (!id) {
        sendError(res, 400, 'BAD_REQUEST', 'Template ID is required', authReq.correlationId);
        return;
      }

      const parsed = duplicateTemplateRequestSchema.parse(req.body || {});

      const template = await templateRepository.duplicate(id, agentId, parsed.newName);

      if (!template) {
        sendError(res, 404, 'NOT_FOUND', 'Template not found', authReq.correlationId);
        return;
      }

      sendSuccess(res, template, authReq.correlationId, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        sendError(res, 400, 'VALIDATION_ERROR', error.errors[0]?.message ?? 'Validation error', authReq.correlationId);
        return;
      }
      next(error);
    }
  };

  /**
   * Toggle favorite status.
   * POST /api/v1/templates/:id/favorite
   */
  toggleFavorite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    
    try {
      const agentId = await getAgentId(authReq);
      if (!agentId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Agent ID not found', authReq.correlationId);
        return;
      }

      const id = req.params.id;
      if (!id) {
        sendError(res, 400, 'BAD_REQUEST', 'Template ID is required', authReq.correlationId);
        return;
      }

      const isFavorite = await templateRepository.toggleFavorite(id, agentId);

      sendSuccess(res, { isFavorite }, authReq.correlationId);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Record template usage.
   * POST /api/v1/templates/:id/usage
   */
  recordUsage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    
    try {
      const agentId = await getAgentId(authReq);
      if (!agentId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Agent ID not found', authReq.correlationId);
        return;
      }

      const id = req.params.id;
      if (!id) {
        sendError(res, 400, 'BAD_REQUEST', 'Template ID is required', authReq.correlationId);
        return;
      }

      const parsed = recordUsageRequestSchema.parse(req.body || {});

      await templateRepository.recordUsage(id, agentId, {
        itineraryId: parsed.itineraryId,
        destination: parsed.destination,
        travelStyle: parsed.travelStyle,
      });

      sendSuccess(res, { recorded: true }, authReq.correlationId);
    } catch (error) {
      if (error instanceof z.ZodError) {
        sendError(res, 400, 'VALIDATION_ERROR', error.errors[0]?.message ?? 'Validation error', authReq.correlationId);
        return;
      }
      next(error);
    }
  };

  /**
   * Get all unique destinations from agent's templates.
   * GET /api/v1/templates/meta/destinations
   */
  getDestinations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    
    try {
      const agentId = await getAgentId(authReq);
      if (!agentId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Agent ID not found', authReq.correlationId);
        return;
      }

      const destinations = await templateRepository.getDestinations(agentId);

      sendSuccess(res, { destinations }, authReq.correlationId);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all unique tags from agent's templates.
   * GET /api/v1/templates/meta/tags
   */
  getTags = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    
    try {
      const agentId = await getAgentId(authReq);
      if (!agentId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Agent ID not found', authReq.correlationId);
        return;
      }

      const tags = await templateRepository.getTags(agentId);

      sendSuccess(res, { tags }, authReq.correlationId);
    } catch (error) {
      next(error);
    }
  };
}

// Export singleton
export const templateHandler = new TemplateHandler();
