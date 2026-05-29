import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { findMatches } from '../services/matchingService';

const router = Router();

router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const matches = await findMatches(req.userId!, limit);
    res.json(matches);
  } catch (err) {
    console.error('Find matches error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
