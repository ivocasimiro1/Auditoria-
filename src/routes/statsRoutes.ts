import { Router, Request, Response } from 'express';
import { queryOne } from '../db';

const router = Router();

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const usersRow = await queryOne<{ c: string }>('SELECT COUNT(*) as c FROM users');
    const tradesRow = await queryOne<{ c: string }>("SELECT COUNT(*) as c FROM trades WHERE status = 'completed'");
    const stickersRow = await queryOne<{ c: string }>("SELECT COUNT(*) as c FROM user_stickers WHERE status = 'have_to_trade'");
    const listingsRow = await queryOne<{ c: string }>("SELECT COUNT(*) as c FROM listings WHERE status = 'active'");

    res.json({
      users: parseInt(usersRow?.c ?? '0', 10),
      trades_completed: parseInt(tradesRow?.c ?? '0', 10),
      stickers_available: parseInt(stickersRow?.c ?? '0', 10),
      listings_active: parseInt(listingsRow?.c ?? '0', 10),
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
