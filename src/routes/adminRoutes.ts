import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/users', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const me = await queryOne<{ is_admin: boolean }>('SELECT is_admin FROM users WHERE id = $1', [req.userId]);
    if (!me?.is_admin) { res.status(403).json({ error: 'Sem permissão' }); return; }
    const users = await query(
      `SELECT u.id, u.username, u.email, u.location, u.avatar_url, u.is_admin, u.rating_sum, u.rating_count, u.created_at,
              (SELECT COUNT(*) FROM trades WHERE (proposer_id = u.id OR receiver_id = u.id) AND status = 'completed') as completed_trades
       FROM users u ORDER BY u.created_at DESC`,
      []
    );
    res.json(users);
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
