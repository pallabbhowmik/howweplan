import type { Request, Response, NextFunction } from 'express';
import type { DisclosureService } from '../../services/disclosure.service.js';
import type { VersionService } from '../../services/version.service.js';
import type { ItineraryService } from '../../services/itinerary.service.js';
import type { AuthenticatedRequest } from '../middleware/index.js';
import { 
  revealItineraryRequestSchema,
  obfuscateItineraryRequestSchema,
  restoreVersionRequestSchema,
  type DisclosureStateResponse,
  type VersionHistoryResponse,
  type VersionDiffResponse,
} from '../dto/index.js';
import { DisclosureState } from '../../models/index.js';

/**
 * Handlers for disclosure and version endpoints.
 */
export class DisclosureHandler {
  constructor(
    private readonly disclosureService: DisclosureService,
    private readonly versionService: VersionService,
    private readonly itineraryService: ItineraryService
  ) {}

  /**
   * Get disclosure state for an itinerary.
   * GET /api/v1/itineraries/:id/disclosure
   */
  getDisclosureState = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({ error: 'Itinerary ID required' });
        return;
      }

      const state = await this.disclosureService.getDisclosureState(id);
      const itinerary = await this.itineraryService.getRawItinerary(id);

      const response: DisclosureStateResponse = {
        itineraryId: id,
        disclosureState: state,
        isRevealed: state === DisclosureState.REVEALED,
        disclosedAt: itinerary.disclosedAt,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get obfuscated view of an itinerary.
   * GET /api/v1/itineraries/:id/obfuscated
   */
  getObfuscatedView = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({ error: 'Itinerary ID required' });
        return;
      }

      const itinerary = await this.disclosureService.getObfuscatedView(id);
      res.json(itinerary);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get revealed view of an itinerary.
   * GET /api/v1/itineraries/:id/revealed
   */
  getRevealedView = async (
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

      const itinerary = await this.disclosureService.getRevealedView(
        id,
        user.sub,
        user.role as 'TRAVELER' | 'AGENT' | 'ADMIN'
      );
      res.json(itinerary);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Reveal an itinerary (admin only).
   * POST /api/v1/itineraries/:id/reveal
   */
  reveal = async (
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

      const input = revealItineraryRequestSchema.parse(req.body);

      const itinerary = await this.disclosureService.revealItinerary(
        id,
        user.sub,
        'ADMIN',
        input.reason
      );

      const response: DisclosureStateResponse = {
        itineraryId: id,
        disclosureState: itinerary.disclosureState,
        isRevealed: true,
        disclosedAt: itinerary.disclosedAt,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Obfuscate an itinerary (admin only).
   * POST /api/v1/itineraries/:id/obfuscate
   */
  obfuscate = async (
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

      const input = obfuscateItineraryRequestSchema.parse(req.body);

      const itinerary = await this.disclosureService.obfuscateItinerary(
        id,
        user.sub,
        'ADMIN',
        input.reason
      );

      const response: DisclosureStateResponse = {
        itineraryId: id,
        disclosureState: itinerary.disclosureState,
        isRevealed: false,
        disclosedAt: undefined,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get version history for an itinerary.
   * GET /api/v1/itineraries/:id/versions
   */
  getVersionHistory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({ error: 'Itinerary ID required' });
        return;
      }

      const itinerary = await this.itineraryService.getRawItinerary(id);
      const versions = await this.versionService.getVersionHistory(id);

      const response: VersionHistoryResponse = {
        itineraryId: id,
        currentVersion: itinerary.version,
        versions: versions.map(v => ({
          id: v.id,
          itineraryId: v.itineraryId,
          version: v.version,
          changedBy: v.changedBy,
          changedByRole: v.changedByRole,
          changeReason: v.changeReason,
          changes: v.changes.map(c => ({
            type: c.type,
            field: c.field,
            description: c.description,
          })),
          createdAt: v.createdAt,
        })),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get itinerary at a specific version.
   * GET /api/v1/itineraries/:itineraryId/versions/:version
   */
  getAtVersion = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { itineraryId, version } = req.params;
      
      if (!itineraryId || !version) {
        res.status(400).json({ error: 'Itinerary ID and version required' });
        return;
      }

      const itinerary = await this.versionService.getItineraryAtVersion(
        itineraryId,
        parseInt(version, 10)
      );

      res.json(itinerary);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Compare two versions.
   * GET /api/v1/itineraries/:itineraryId/versions/compare/:fromVersion/:toVersion
   */
  compareVersions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { itineraryId, fromVersion, toVersion } = req.params;
      
      if (!itineraryId || !fromVersion || !toVersion) {
        res.status(400).json({ error: 'Itinerary ID and version numbers required' });
        return;
      }

      const diff = await this.versionService.compareVersions(
        itineraryId,
        parseInt(fromVersion, 10),
        parseInt(toVersion, 10)
      );

      const response: VersionDiffResponse = {
        itineraryId,
        fromVersion: diff.fromVersion,
        toVersion: diff.toVersion,
        changes: diff.changes.map(c => ({
          type: c.type,
          field: c.field,
          previousValue: c.previousValue,
          newValue: c.newValue,
          description: c.description,
        })),
        addedItems: diff.addedItems,
        removedItems: diff.removedItems,
        modifiedItems: diff.modifiedItems,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Restore to a previous version.
   * POST /api/v1/itineraries/:id/versions/restore
   */
  restoreVersion = async (
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

      const input = restoreVersionRequestSchema.parse(req.body);

      const restoredItinerary = await this.versionService.prepareRestore(
        id,
        input.targetVersion,
        user.sub,
        user.role as 'AGENT' | 'ADMIN',
        input.reason
      );

      // Update the itinerary with restored data
      await this.itineraryService.updateItinerary(
        id,
        {
          overview: restoredItinerary.overview,
          pricing: restoredItinerary.pricing,
          termsAndConditions: restoredItinerary.termsAndConditions,
          cancellationPolicy: restoredItinerary.cancellationPolicy,
        },
        user.sub,
        user.role as 'AGENT' | 'ADMIN',
        `Restored to version ${input.targetVersion}: ${input.reason}`
      );

      res.json({ 
        success: true, 
        restoredToVersion: input.targetVersion,
        newVersion: restoredItinerary.version,
      });
    } catch (error) {
      next(error);
    }
  };
}
