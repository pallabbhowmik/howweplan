/**
 * Caps Info Handler
 */

import { Request, Response, NextFunction } from 'express';
import { CapEnforcementService, CapsInfo } from '../../services/cap-enforcement.service';

export function createCapsInfoHandler(capEnforcementService: CapEnforcementService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
        return;
      }

      const capsInfo: CapsInfo = await capEnforcementService.getCapsInfo(userId);

      res.json({
        success: true,
        data: capsInfo,
      });
    } catch (error) {
      next(error);
    }
  };
}
