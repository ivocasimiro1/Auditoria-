import { Router, Request, Response } from 'express';
import { query, queryOne, execute } from '../db';
import { authenticateToken } from '../middleware/auth';
import type { User } from '../types';

const router = Router();

router.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await queryOne<User>(
      'SELECT id, username, email, location, avatar_url, rating_sum, rating_count, created_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (!user) { res.status(404).json({ error: 'Utilizador não encontrado' }); return; }
    res.json({
      ...user,
      rating: user.rating_count > 0 ? user.rating_sum / user.rating_count : null,
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await queryOne<Omit<User, 'email' | 'password_hash'>>(
      'SELECT id, username, location, avatar_url, rating_sum, rating_count, created_at FROM users WHERE id = $1',
      [req.params.id]
    );

    if (!user) { res.status(404).json({ error: 'Utilizador não encontrado' }); return; }

    const completedRow = await queryOne<{ c: string }>(
      "SELECT COUNT(*) as c FROM trades WHERE (proposer_id = $1 OR receiver_id = $2) AND status = 'completed'",
      [req.params.id, req.params.id]
    );
    const tradesCompleted = parseInt(completedRow?.c ?? '0', 10);

    const cancelledRow = await queryOne<{ c: string }>(
      "SELECT COUNT(*) as c FROM trades WHERE (proposer_id = $1 OR receiver_id = $2) AND status = 'cancelled'",
      [req.params.id, req.params.id]
    );
    const tradesCancelled = parseInt(cancelledRow?.c ?? '0', 10);

    const reviews = await query<{ stars: number; comment: string | null; reply: string | null; reviewer_username: string; created_at: number }>(`
      SELECT tr.stars, tr.comment, tr.reply, u.username as reviewer_username, tr.created_at
      FROM trade_reviews tr
      JOIN users u ON tr.reviewer_id = u.id
      WHERE tr.reviewed_id = $1
      ORDER BY tr.created_at DESC
      LIMIT 20
    `, [req.params.id]);

    const positiveCount = reviews.filter(r => r.stars >= 4).length;
    const positivePct = reviews.length > 0 ? Math.round((positiveCount / reviews.length) * 100) : null;

    res.json({
      ...user,
      rating: user.rating_count > 0 ? user.rating_sum / user.rating_count : null,
      completed_trades: tradesCompleted,
      trades_completed: tradesCompleted,
      trades_cancelled: tradesCancelled,
      positive_pct: positivePct,
      reviews,
      // keep legacy field for backward compat
      recent_ratings: reviews.map(r => ({ score: r.stars, comment: r.comment, created_at: r.created_at })),
    });
  } catch (err) {
    console.error('Get user profile error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const { username, location, avatar_url } = req.body;

  try {
    if (username) {
      const existing = await queryOne('SELECT id FROM users WHERE username = $1 AND id != $2', [username, req.userId]);
      if (existing) { res.status(409).json({ error: 'Username já em uso' }); return; }
    }

    const updates: string[] = [];
    const values: (string | null)[] = [];
    let idx = 1;

    if (username) { updates.push(`username = $${idx++}`); values.push(username); }
    if (location !== undefined) { updates.push(`location = $${idx++}`); values.push(location || null); }
    if (avatar_url !== undefined) { updates.push(`avatar_url = $${idx++}`); values.push(avatar_url || null); }

    if (updates.length === 0) { res.status(400).json({ error: 'Nada para atualizar' }); return; }

    values.push(req.userId!);
    await execute(`UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`, values);
    res.json({ success: true });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/:id/trades', async (req: Request, res: Response): Promise<void> => {
  try {
    const trades = await query(`
      SELECT t.id, t.status, t.created_at, t.updated_at,
        p.username as proposer_username, r.username as receiver_username
      FROM trades t
      JOIN users p ON t.proposer_id = p.id
      JOIN users r ON t.receiver_id = r.id
      WHERE (t.proposer_id = $1 OR t.receiver_id = $2) AND t.status = 'completed'
      ORDER BY t.updated_at DESC LIMIT 20
    `, [req.params.id, req.params.id]);
    res.json(trades);
  } catch (err) {
    console.error('Get user trades error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
