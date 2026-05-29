import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { findMatches } from '../services/matchingService';

const router = Router();

router.get('/', authenticateToken, (req: Request, res: Response): void => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const matches = findMatches(req.userId!, limit);
  res.json(matches);
});

export default router;
