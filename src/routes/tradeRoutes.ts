import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../db';
import { authenticateToken } from '../middleware/auth';
import { createNotification } from '../services/notificationService';
import type { Trade, User, TradeReview } from '../types';

const router = Router();

// List trades for current user
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const { status } = req.query;

  let sql = `
    SELECT t.*,
      p.username as proposer_username, p.location as proposer_location,
      r.username as receiver_username, r.location as receiver_location
    FROM trades t
    JOIN users p ON t.proposer_id = p.id
    JOIN users r ON t.receiver_id = r.id
    WHERE (t.proposer_id = $1 OR t.receiver_id = $2)
  `;
  const params: any[] = [req.userId!, req.userId!];

  if (status) {
    sql += ` AND t.status = $3`;
    params.push(status as string);
  }
  sql += ' ORDER BY t.updated_at DESC';

  try {
    const trades = await query(sql, params);
    res.json(trades);
  } catch (err) {
    console.error('Get trades error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get single trade
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const trade = await queryOne<Trade>(`
      SELECT t.*,
        p.username as proposer_username, p.location as proposer_location, p.rating_sum as p_rating_sum, p.rating_count as p_rating_count,
        r.username as receiver_username, r.location as receiver_location, r.rating_sum as r_rating_sum, r.rating_count as r_rating_count
      FROM trades t
      JOIN users p ON t.proposer_id = p.id
      JOIN users r ON t.receiver_id = r.id
      WHERE t.id = $1 AND (t.proposer_id = $2 OR t.receiver_id = $3)
    `, [req.params.id, req.userId, req.userId]);

    if (!trade) { res.status(404).json({ error: 'Troca não encontrada' }); return; }
    res.json(trade);
  } catch (err) {
    console.error('Get trade error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Create trade proposal
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const { receiver_id, proposer_stickers, receiver_stickers, message } = req.body;

  if (!receiver_id || !Array.isArray(proposer_stickers) || !Array.isArray(receiver_stickers)) {
    res.status(400).json({ error: 'Dados inválidos para proposta de troca' });
    return;
  }

  if (receiver_id === req.userId) {
    res.status(400).json({ error: 'Não podes fazer troca contigo mesmo' });
    return;
  }

  try {
    const receiver = await queryOne<User>('SELECT id, username FROM users WHERE id = $1', [receiver_id]);
    if (!receiver) { res.status(404).json({ error: 'Utilizador não encontrado' }); return; }

    const id = uuidv4();
    const now = Date.now();

    await execute(`
      INSERT INTO trades (id, proposer_id, receiver_id, status, proposer_stickers, receiver_stickers, message, created_at, updated_at)
      VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8)
    `, [id, req.userId!, receiver_id, JSON.stringify(proposer_stickers), JSON.stringify(receiver_stickers), message || null, now, now]);

    const proposer = await queryOne<{ username: string }>('SELECT username FROM users WHERE id = $1', [req.userId]);
    createNotification(receiver_id, 'trade_proposal', {
      tradeId: id,
      fromUser: proposer?.username ?? '',
      fromUserId: req.userId,
      message: message || '',
    });

    res.status(201).json({ id, status: 'pending' });
  } catch (err) {
    console.error('Create trade error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Update trade status
router.patch('/:id/status', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const { action } = req.body;

  try {
    const trade = await queryOne<Trade & { proposer_username: string; receiver_username: string }>(`
      SELECT t.*, p.username as proposer_username, r.username as receiver_username
      FROM trades t
      JOIN users p ON t.proposer_id = p.id
      JOIN users r ON t.receiver_id = r.id
      WHERE t.id = $1
    `, [req.params.id]);

    if (!trade) { res.status(404).json({ error: 'Troca não encontrada' }); return; }
    if (trade.proposer_id !== req.userId && trade.receiver_id !== req.userId) {
      res.status(403).json({ error: 'Sem permissão' }); return;
    }

    // Trades are arranged directly between users (no shipping carriers)
    const transitions: Record<string, { fromStatuses: string[]; newStatus: string; allowedBy: 'receiver' | 'proposer' | 'both' }> = {
      accept:   { fromStatuses: ['pending'],               newStatus: 'accepted',   allowedBy: 'receiver' },
      reject:   { fromStatuses: ['pending'],               newStatus: 'cancelled',  allowedBy: 'receiver' },
      cancel:   { fromStatuses: ['pending'],               newStatus: 'cancelled',  allowedBy: 'proposer' },
      complete: { fromStatuses: ['accepted','in_transit'], newStatus: 'completed',  allowedBy: 'both' },
    };

    const transition = transitions[action];
    if (!transition) { res.status(400).json({ error: 'Ação inválida' }); return; }

    if (!transition.fromStatuses.includes(trade.status)) {
      res.status(409).json({ error: `Transição inválida: a troca está '${trade.status}'` }); return;
    }

    if (transition.allowedBy === 'receiver' && trade.receiver_id !== req.userId) {
      res.status(403).json({ error: 'Apenas o destinatário pode realizar esta ação' }); return;
    }
    if (transition.allowedBy === 'proposer' && trade.proposer_id !== req.userId) {
      res.status(403).json({ error: 'Apenas o proponente pode realizar esta ação' }); return;
    }

    const now = Date.now();
    await execute('UPDATE trades SET status = $1, updated_at = $2 WHERE id = $3', [transition.newStatus, now, trade.id]);

    const notifyUserId = req.userId === trade.proposer_id ? trade.receiver_id : trade.proposer_id;
    const actorName = req.userId === trade.proposer_id ? trade.proposer_username : trade.receiver_username;

    const notifType = action === 'accept' ? 'trade_accepted' : action === 'complete' ? 'trade_completed' : 'trade_proposal';
    createNotification(notifyUserId, notifType, { tradeId: trade.id, fromUser: actorName, action });

    res.json({ success: true, newStatus: transition.newStatus });
  } catch (err) {
    console.error('Update trade status error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Post rating for a completed trade
router.post('/:id/rate', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const { score, comment } = req.body;
  if (!score || score < 1 || score > 5) {
    res.status(400).json({ error: 'Score deve estar entre 1 e 5' });
    return;
  }

  try {
    const trade = await queryOne<Trade>('SELECT * FROM trades WHERE id = $1 AND status = $2', [req.params.id, 'completed']);
    if (!trade) { res.status(404).json({ error: 'Troca concluída não encontrada' }); return; }
    if (trade.proposer_id !== req.userId && trade.receiver_id !== req.userId) {
      res.status(403).json({ error: 'Sem permissão' }); return;
    }

    const ratedId = req.userId === trade.proposer_id ? trade.receiver_id : trade.proposer_id;

    const existing = await queryOne('SELECT id FROM ratings WHERE trade_id = $1 AND rater_id = $2', [req.params.id, req.userId]);
    if (existing) { res.status(409).json({ error: 'Já avaliaste esta troca' }); return; }

    await execute(`
      INSERT INTO ratings (id, trade_id, rater_id, rated_id, score, comment, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [uuidv4(), req.params.id, req.userId!, ratedId, score, comment || null, Date.now()]);

    await execute('UPDATE users SET rating_sum = rating_sum + $1, rating_count = rating_count + 1 WHERE id = $2', [score, ratedId]);

    const rater = await queryOne<{ username: string }>('SELECT username FROM users WHERE id = $1', [req.userId]);
    createNotification(ratedId, 'rating', { tradeId: req.params.id, fromUser: rater?.username ?? '', score });

    res.json({ success: true });
  } catch (err) {
    console.error('Rate trade error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Post review for a completed trade (new system with trade_reviews table)
router.post('/:id/review', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const { stars, comment } = req.body;
  if (!stars || stars < 1 || stars > 5) {
    res.status(400).json({ error: 'Stars deve estar entre 1 e 5' });
    return;
  }

  try {
    const trade = await queryOne<Trade & { proposer_rated: number; receiver_rated: number }>(
      'SELECT * FROM trades WHERE id = $1 AND status = $2',
      [req.params.id, 'completed']
    );
    if (!trade) { res.status(404).json({ error: 'Troca concluída não encontrada' }); return; }

    const isProposer = req.userId === trade.proposer_id;
    const isReceiver = req.userId === trade.receiver_id;

    if (!isProposer && !isReceiver) {
      res.status(403).json({ error: 'Sem permissão' }); return;
    }

    // Check if already rated
    if (isProposer && trade.proposer_rated) {
      res.status(409).json({ error: 'Já avaliaste esta troca' }); return;
    }
    if (isReceiver && trade.receiver_rated) {
      res.status(409).json({ error: 'Já avaliaste esta troca' }); return;
    }

    const reviewedId = isProposer ? trade.receiver_id : trade.proposer_id;
    const reviewId = uuidv4();
    const now = Date.now();

    await execute(`
      INSERT INTO trade_reviews (id, trade_id, reviewer_id, reviewed_id, stars, comment, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [reviewId, req.params.id, req.userId!, reviewedId, stars, comment || null, now]);

    await execute('UPDATE users SET rating_sum = rating_sum + $1, rating_count = rating_count + 1 WHERE id = $2', [stars, reviewedId]);

    if (isProposer) {
      await execute('UPDATE trades SET proposer_rated = 1 WHERE id = $1', [req.params.id]);
    } else {
      await execute('UPDATE trades SET receiver_rated = 1 WHERE id = $1', [req.params.id]);
    }

    const reviewer = await queryOne<{ username: string }>('SELECT username FROM users WHERE id = $1', [req.userId]);
    createNotification(reviewedId, 'rating', { tradeId: req.params.id, fromUser: reviewer?.username ?? '', score: stars });

    res.json({ success: true });
  } catch (err) {
    console.error('Review trade error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Reply to a review (reviewed user replies)
router.post('/:id/review/reply', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const { reply } = req.body;
  if (!reply || !reply.trim()) {
    res.status(400).json({ error: 'Resposta não pode estar vazia' });
    return;
  }

  try {
    const trade = await queryOne<Trade>('SELECT * FROM trades WHERE id = $1', [req.params.id]);
    if (!trade) { res.status(404).json({ error: 'Troca não encontrada' }); return; }

    // The reply is by the reviewed user (the one who received the review)
    const review = await queryOne<TradeReview>(
      'SELECT * FROM trade_reviews WHERE trade_id = $1 AND reviewed_id = $2',
      [req.params.id, req.userId]
    );

    if (!review) { res.status(404).json({ error: 'Avaliação não encontrada' }); return; }

    await execute('UPDATE trade_reviews SET reply = $1 WHERE id = $2', [reply.trim(), review.id]);

    res.json({ success: true });
  } catch (err) {
    console.error('Reply to review error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
