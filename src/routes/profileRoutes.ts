import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { authenticateToken } from '../middleware/auth';
import type { User } from '../types';

const router = Router();

router.get('/me', authenticateToken, (req: Request, res: Response): void => {
  const db = getDb();
  const user = db.prepare(
    'SELECT id, username, email, location, avatar_url, rating_sum, rating_count, created_at FROM users WHERE id = ?'
  ).get(req.userId) as User | undefined;

  if (!user) { res.status(404).json({ error: 'Utilizador não encontrado' }); return; }
  res.json({
    ...user,
    rating: user.rating_count > 0 ? user.rating_sum / user.rating_count : null,
  });
});

router.get('/:id', (req: Request, res: Response): void => {
  const db = getDb();
  const user = db.prepare(
    'SELECT id, username, location, avatar_url, rating_sum, rating_count, created_at FROM users WHERE id = ?'
  ).get(req.params.id) as Omit<User, 'email' | 'password_hash'> | undefined;

  if (!user) { res.status(404).json({ error: 'Utilizador não encontrado' }); return; }

  const tradeCount = (db.prepare(
    "SELECT COUNT(*) as c FROM trades WHERE (proposer_id = ? OR receiver_id = ?) AND status = 'completed'"
  ).get(req.params.id, req.params.id) as { c: number }).c;

  const recentRatings = db.prepare(
    'SELECT score, comment, created_at FROM ratings WHERE rated_id = ? ORDER BY created_at DESC LIMIT 5'
  ).all(req.params.id);

  res.json({
    ...user,
    rating: user.rating_count > 0 ? user.rating_sum / user.rating_count : null,
    completed_trades: tradeCount,
    recent_ratings: recentRatings,
  });
});

router.put('/me', authenticateToken, (req: Request, res: Response): void => {
  const { username, location, avatar_url } = req.body;
  const db = getDb();

  if (username) {
    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.userId);
    if (existing) { res.status(409).json({ error: 'Username já em uso' }); return; }
  }

  const updates: string[] = [];
  const values: (string | null)[] = [];
  if (username) { updates.push('username = ?'); values.push(username); }
  if (location !== undefined) { updates.push('location = ?'); values.push(location || null); }
  if (avatar_url !== undefined) { updates.push('avatar_url = ?'); values.push(avatar_url || null); }

  if (updates.length === 0) { res.status(400).json({ error: 'Nada para atualizar' }); return; }

  values.push(req.userId!);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

router.get('/:id/trades', (req: Request, res: Response): void => {
  const db = getDb();
  const trades = db.prepare(`
    SELECT t.id, t.status, t.created_at, t.updated_at,
      p.username as proposer_username, r.username as receiver_username
    FROM trades t
    JOIN users p ON t.proposer_id = p.id
    JOIN users r ON t.receiver_id = r.id
    WHERE (t.proposer_id = ? OR t.receiver_id = ?) AND t.status = 'completed'
    ORDER BY t.updated_at DESC LIMIT 20
  `).all(req.params.id, req.params.id);
  res.json(trades);
});

export default router;
