import type { Request, Response, NextFunction } from 'express';
import type { ItineraryService } from '../../services/itinerary.service.js';
import type { AuthenticatedRequest } from '../middleware/index.js';
import { 
  createItineraryRequestSchema,
  updateItineraryRequestSchema,
  addItemRequestSchema,
  updateItemRequestSchema,
  changeStatusRequestSchema,
  listItinerariesQuerySchema,
  type ItineraryResponse,
  type ItineraryItemResponse,
} from '../dto/index.js';
import type { ItineraryWithMeta, ItineraryItem, Itinerary } from '../../models/index.js';

/**
 * Handlers for itinerary endpoints.
 */
export class ItineraryHandler {
  constructor(private readonly itineraryService: ItineraryService) {}

  /**
   * Create a new itinerary.
   * POST /api/v1/itineraries
   */
  create = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = (req as AuthenticatedRequest).user;
      
      let input;
      try {
        input = createItineraryRequestSchema.parse(req.body);
      } catch (parseError) {
        console.error('Itinerary validation error:', parseError);
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: parseError instanceof Error ? parseError.message : 'Invalid input',
          },
        });
        return;
      }

      const itinerary = await this.itineraryService.createItinerary(
        input,
        user.sub
      );

      const response = this.toResponse({
        ...itinerary,
        isRevealed: false,
        itemCount: itinerary.items.length,
        isLatestVersion: true,
      });
      res.status(201).json(response);
    } catch (error) {
      console.error('Create itinerary error:', error);
      next(error);
    }
  };

  /**
   * Get an itinerary by ID.
   * GET /api/v1/itineraries/:id
   */
  getById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({ error: 'Itinerary ID required' });
        return;
      }

      const itinerary = await this.itineraryService.getItinerary(
        id,
        user.sub,
        user.role as 'TRAVELER' | 'AGENT' | 'ADMIN'
      );

      const response = this.toResponse(itinerary);
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update an itinerary.
   * PUT /api/v1/itineraries/:id
   */
  update = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({ error: 'Itinerary ID required' });
        return;
      }

      const input = updateItineraryRequestSchema.parse(req.body);
      const { changeReason, ...updates } = input;

      const itinerary = await this.itineraryService.updateItinerary(
        id,
        updates,
        user.sub,
        user.role as 'AGENT' | 'ADMIN',
        changeReason as string | undefined
      );

      const response = this.toResponse({
        ...itinerary,
        isRevealed: itinerary.disclosureState === 'REVEALED',
        itemCount: itinerary.items.length,
        isLatestVersion: true,
      });
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Add an item to an itinerary.
   * POST /api/v1/itineraries/:id/items
   */
  addItem = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({ error: 'Itinerary ID required' });
        return;
      }

      const input = addItemRequestSchema.parse(req.body);

      const item = await this.itineraryService.addItem(
        id,
        input,
        user.sub,
        user.role as 'AGENT' | 'ADMIN'
      );

      const response = this.itemToResponse(item);
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update an item in an itinerary.
   * PUT /api/v1/itineraries/:itineraryId/items/:itemId
   */
  updateItem = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const { itineraryId, itemId } = req.params;
      
      if (!itineraryId || !itemId) {
        res.status(400).json({ error: 'Itinerary ID and Item ID required' });
        return;
      }

      const input = updateItemRequestSchema.parse(req.body);

      const item = await this.itineraryService.updateItem(
        itineraryId,
        itemId,
        input,
        user.sub,
        user.role as 'AGENT' | 'ADMIN'
      );

      const response = this.itemToResponse(item);
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Remove an item from an itinerary.
   * DELETE /api/v1/itineraries/:itineraryId/items/:itemId
   */
  removeItem = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const { itineraryId, itemId } = req.params;
      
      if (!itineraryId || !itemId) {
        res.status(400).json({ error: 'Itinerary ID and Item ID required' });
        return;
      }

      await this.itineraryService.removeItem(
        itineraryId,
        itemId,
        user.sub,
        user.role as 'AGENT' | 'ADMIN'
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Change itinerary status.
   * PATCH /api/v1/itineraries/:id/status
   */
  changeStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({ error: 'Itinerary ID required' });
        return;
      }

      const input = changeStatusRequestSchema.parse(req.body);

      const itinerary = await this.itineraryService.updateStatus(
        id,
        input.status,
        user.sub,
        user.role as 'AGENT' | 'ADMIN' | 'SYSTEM',
        input.reason
      );

      const response = this.toResponse({
        ...itinerary,
        isRevealed: itinerary.disclosureState === 'REVEALED',
        itemCount: itinerary.items.length,
        isLatestVersion: true,
      });
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * List itineraries with filters.
   * GET /api/v1/itineraries
   */
  list = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const query = listItinerariesQuerySchema.parse(req.query);

      let itineraries: (Itinerary | ItineraryWithMeta)[];
      if (query.requestId) {
        itineraries = await this.itineraryService.getItinerariesForRequest(query.requestId);
      } else if (query.agentId) {
        itineraries = await this.itineraryService.getItinerariesByAgent(query.agentId);
      } else if (query.travelerId) {
        itineraries = await this.itineraryService.getItinerariesForTraveler(query.travelerId);
      } else if (user.role === 'TRAVELER') {
        itineraries = await this.itineraryService.getItinerariesForTraveler(user.sub);
      } else {
        itineraries = [];
      }

      // Filter by status if provided
      if (query.status) {
        itineraries = itineraries.filter(i => i.status === query.status);
      }

      // Paginate
      const start = (query.page - 1) * query.limit;
      const end = start + query.limit;
      const paginatedItineraries = itineraries.slice(start, end);

      const response = {
        items: paginatedItineraries.map(i => this.toResponse(i as ItineraryWithMeta)),
        total: itineraries.length,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(itineraries.length / query.limit),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Convert itinerary to response DTO.
   */
  private toResponse(itinerary: ItineraryWithMeta): ItineraryResponse {
    return {
      id: itinerary.id,
      requestId: itinerary.requestId,
      agentId: itinerary.agentId,
      travelerId: itinerary.travelerId,
      status: itinerary.status,
      disclosureState: itinerary.disclosureState,
      isRevealed: itinerary.isRevealed,
      overview: {
        title: itinerary.overview.title,
        summary: itinerary.overview.summary,
        startDate: itinerary.overview.startDate,
        endDate: itinerary.overview.endDate,
        numberOfDays: itinerary.overview.numberOfDays,
        numberOfNights: itinerary.overview.numberOfNights,
        destinations: itinerary.overview.destinations,
        travelersCount: itinerary.overview.travelersCount,
        tripType: itinerary.overview.tripType,
      },
      pricing: itinerary.pricing ? {
        currency: itinerary.pricing.currency,
        totalPrice: itinerary.pricing.totalPrice,
        pricePerPerson: itinerary.pricing.pricePerPerson,
        depositAmount: itinerary.pricing.depositAmount,
        inclusions: itinerary.pricing.inclusions,
        exclusions: itinerary.pricing.exclusions,
      } : undefined,
      items: itinerary.items.map(item => this.itemToResponse(item)),
      itemCount: itinerary.itemCount,
      version: itinerary.version,
      isLatestVersion: itinerary.isLatestVersion,
      termsAndConditions: itinerary.termsAndConditions,
      cancellationPolicy: itinerary.cancellationPolicy,
      createdAt: itinerary.createdAt,
      updatedAt: itinerary.updatedAt,
      submittedAt: itinerary.submittedAt,
      approvedAt: itinerary.approvedAt,
      disclosedAt: itinerary.disclosedAt,
    };
  }

  /**
   * Convert item to response DTO.
   */
  private itemToResponse(item: ItineraryItem): ItineraryItemResponse {
    return {
      id: item.id,
      type: item.type,
      dayNumber: item.dayNumber,
      sequence: item.sequence,
      title: item.title,
      description: item.description,
      location: {
        city: item.location.city,
        country: item.location.country,
        region: item.location.region,
      },
      timeRange: {
        startDate: item.timeRange.startDate,
        endDate: item.timeRange.endDate,
        startTime: item.timeRange.startTime,
        endTime: item.timeRange.endTime,
      },
      vendor: item.vendor ? {
        name: item.vendor.name,
        category: item.vendor.category,
        starRating: item.vendor.starRating,
      } : undefined,
      travelerNotes: item.travelerNotes,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
