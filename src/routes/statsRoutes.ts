import { Router, Request, Response } from 'express';
import { getDb } from '../db';

const router = Router();

router.get('/', (_req: Request, res: Response): void => {
  const db = getDb();
  const users = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  const trades = (db.prepare("SELECT COUNT(*) as c FROM trades WHERE status = 'completed'").get() as { c: number }).c;
  const stickers_available = (db.prepare("SELECT COUNT(*) as c FROM user_stickers WHERE status = 'have_to_trade'").get() as { c: number }).c;
  const listings_active = (db.prepare("SELECT COUNT(*) as c FROM listings WHERE status = 'active'").get() as { c: number }).c;
  res.json({ users, trades_completed: trades, stickers_available, listings_active });
});

export default router;
