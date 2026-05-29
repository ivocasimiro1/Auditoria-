import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db';
import { authenticateToken } from '../middleware/auth';
import { createNotification } from '../services/notificationService';
import type { Trade, User, TradeReview } from '../types';

const router = Router();

// List trades for current user
router.get('/', authenticateToken, (req: Request, res: Response): void => {
  const db = getDb();
  const { status } = req.query;

  let query = `
    SELECT t.*,
      p.username as proposer_username, p.location as proposer_location,
      r.username as receiver_username, r.location as receiver_location
    FROM trades t
    JOIN users p ON t.proposer_id = p.id
    JOIN users r ON t.receiver_id = r.id
    WHERE (t.proposer_id = ? OR t.receiver_id = ?)
  `;
  const params: (string | number)[] = [req.userId!, req.userId!];

  if (status) { query += ' AND t.status = ?'; params.push(status as string); }
  query += ' ORDER BY t.updated_at DESC';

  const trades = db.prepare(query).all(...params);
  res.json(trades);
});

// Get single trade
router.get('/:id', authenticateToken, (req: Request, res: Response): void => {
  const db = getDb();
  const trade = db.prepare(`
    SELECT t.*,
      p.username as proposer_username, p.location as proposer_location, p.rating_sum as p_rating_sum, p.rating_count as p_rating_count,
      r.username as receiver_username, r.location as receiver_location, r.rating_sum as r_rating_sum, r.rating_count as r_rating_count
    FROM trades t
    JOIN users p ON t.proposer_id = p.id
    JOIN users r ON t.receiver_id = r.id
    WHERE t.id = ? AND (t.proposer_id = ? OR t.receiver_id = ?)
  `).get(req.params.id, req.userId, req.userId) as Trade | undefined;

  if (!trade) { res.status(404).json({ error: 'Troca não encontrada' }); return; }
  res.json(trade);
});

// Create trade proposal
router.post('/', authenticateToken, (req: Request, res: Response): void => {
  const { receiver_id, proposer_stickers, receiver_stickers, message } = req.body;

  if (!receiver_id || !Array.isArray(proposer_stickers) || !Array.isArray(receiver_stickers)) {
    res.status(400).json({ error: 'Dados inválidos para proposta de troca' });
    return;
  }

  if (receiver_id === req.userId) {
    res.status(400).json({ error: 'Não podes fazer troca contigo mesmo' });
    return;
  }

  const db = getDb();
  const receiver = db.prepare('SELECT id, username FROM users WHERE id = ?').get(receiver_id) as User | undefined;
  if (!receiver) { res.status(404).json({ error: 'Utilizador não encontrado' }); return; }

  const id = uuidv4();
  const now = Date.now();

  db.prepare(`
    INSERT INTO trades (id, proposer_id, receiver_id, status, proposer_stickers, receiver_stickers, message, created_at, updated_at)
    VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?)
  `).run(id, req.userId!, receiver_id, JSON.stringify(proposer_stickers), JSON.stringify(receiver_stickers), message || null, now, now);

  const proposer = db.prepare('SELECT username FROM users WHERE id = ?').get(req.userId) as { username: string };
  createNotification(receiver_id, 'trade_proposal', {
    tradeId: id,
    fromUser: proposer.username,
    fromUserId: req.userId,
    message: message || '',
  });

  res.status(201).json({ id, status: 'pending' });
});

// Update trade status
router.patch('/:id/status', authenticateToken, (req: Request, res: Response): void => {
  const { action } = req.body;
  const db = getDb();

  const trade = db.prepare(`
    SELECT t.*, p.username as proposer_username, r.username as receiver_username
    FROM trades t
    JOIN users p ON t.proposer_id = p.id
    JOIN users r ON t.receiver_id = r.id
    WHERE t.id = ?
  `).get(req.params.id) as (Trade & { proposer_username: string; receiver_username: string }) | undefined;

  if (!trade) { res.status(404).json({ error: 'Troca não encontrada' }); return; }
  if (trade.proposer_id !== req.userId && trade.receiver_id !== req.userId) {
    res.status(403).json({ error: 'Sem permissão' }); return;
  }

  const transitions: Record<string, { fromStatus: string; newStatus: string; allowedBy: 'receiver' | 'proposer' | 'both' }> = {
    accept:   { fromStatus: 'pending',    newStatus: 'accepted',   allowedBy: 'receiver' },
    reject:   { fromStatus: 'pending',    newStatus: 'cancelled',  allowedBy: 'receiver' },
    cancel:   { fromStatus: 'pending',    newStatus: 'cancelled',  allowedBy: 'proposer' },
    ship:     { fromStatus: 'accepted',   newStatus: 'in_transit', allowedBy: 'both' },
    complete: { fromStatus: 'in_transit', newStatus: 'completed',  allowedBy: 'both' },
  };

  const transition = transitions[action];
  if (!transition) { res.status(400).json({ error: 'Ação inválida' }); return; }

  if (trade.status !== transition.fromStatus) {
    res.status(409).json({ error: `Transição inválida: a troca está '${trade.status}'` }); return;
  }

  if (transition.allowedBy === 'receiver' && trade.receiver_id !== req.userId) {
    res.status(403).json({ error: 'Apenas o destinatário pode realizar esta ação' }); return;
  }
  if (transition.allowedBy === 'proposer' && trade.proposer_id !== req.userId) {
    res.status(403).json({ error: 'Apenas o proponente pode realizar esta ação' }); return;
  }

  const now = Date.now();
  db.prepare('UPDATE trades SET status = ?, updated_at = ? WHERE id = ?').run(transition.newStatus, now, trade.id);

  const notifyUserId = req.userId === trade.proposer_id ? trade.receiver_id : trade.proposer_id;
  const actorName = req.userId === trade.proposer_id ? trade.proposer_username : trade.receiver_username;

  const notifType = action === 'accept' ? 'trade_accepted' : action === 'complete' ? 'trade_completed' : 'trade_proposal';
  createNotification(notifyUserId, notifType, { tradeId: trade.id, fromUser: actorName, action });

  res.json({ success: true, newStatus: transition.newStatus });
});

// Post rating for a completed trade
router.post('/:id/rate', authenticateToken, (req: Request, res: Response): void => {
  const { score, comment } = req.body;
  if (!score || score < 1 || score > 5) {
    res.status(400).json({ error: 'Score deve estar entre 1 e 5' });
    return;
  }

  const db = getDb();
  const trade = db.prepare('SELECT * FROM trades WHERE id = ? AND status = ?').get(req.params.id, 'completed') as Trade | undefined;
  if (!trade) { res.status(404).json({ error: 'Troca concluída não encontrada' }); return; }
  if (trade.proposer_id !== req.userId && trade.receiver_id !== req.userId) {
    res.status(403).json({ error: 'Sem permissão' }); return;
  }

  const ratedId = req.userId === trade.proposer_id ? trade.receiver_id : trade.proposer_id;

  const existing = db.prepare('SELECT id FROM ratings WHERE trade_id = ? AND rater_id = ?').get(req.params.id, req.userId);
  if (existing) { res.status(409).json({ error: 'Já avaliaste esta troca' }); return; }

  db.prepare(`
    INSERT INTO ratings (id, trade_id, rater_id, rated_id, score, comment, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), req.params.id, req.userId!, ratedId, score, comment || null, Date.now());

  db.prepare('UPDATE users SET rating_sum = rating_sum + ?, rating_count = rating_count + 1 WHERE id = ?').run(score, ratedId);

  const rater = db.prepare('SELECT username FROM users WHERE id = ?').get(req.userId) as { username: string };
  createNotification(ratedId, 'rating', { tradeId: req.params.id, fromUser: rater.username, score });

  res.json({ success: true });
});

// Post review for a completed trade (new system with trade_reviews table)
router.post('/:id/review', authenticateToken, (req: Request, res: Response): void => {
  const { stars, comment } = req.body;
  if (!stars || stars < 1 || stars > 5) {
    res.status(400).json({ error: 'Stars deve estar entre 1 e 5' });
    return;
  }

  const db = getDb();
  const trade = db.prepare('SELECT * FROM trades WHERE id = ? AND status = ?').get(req.params.id, 'completed') as (Trade & { proposer_rated: number; receiver_rated: number }) | undefined;
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

  db.prepare(`
    INSERT INTO trade_reviews (id, trade_id, reviewer_id, reviewed_id, stars, comment, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(reviewId, req.params.id, req.userId!, reviewedId, stars, comment || null, now);

  db.prepare('UPDATE users SET rating_sum = rating_sum + ?, rating_count = rating_count + 1 WHERE id = ?').run(stars, reviewedId);

  if (isProposer) {
    db.prepare('UPDATE trades SET proposer_rated = 1 WHERE id = ?').run(req.params.id);
  } else {
    db.prepare('UPDATE trades SET receiver_rated = 1 WHERE id = ?').run(req.params.id);
  }

  const reviewer = db.prepare('SELECT username FROM users WHERE id = ?').get(req.userId) as { username: string };
  createNotification(reviewedId, 'rating', { tradeId: req.params.id, fromUser: reviewer.username, score: stars });

  res.json({ success: true });
});

// Reply to a review (reviewed user replies)
router.post('/:id/review/reply', authenticateToken, (req: Request, res: Response): void => {
  const { reply } = req.body;
  if (!reply || !reply.trim()) {
    res.status(400).json({ error: 'Resposta não pode estar vazia' });
    return;
  }

  const db = getDb();
  const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.id) as Trade | undefined;
  if (!trade) { res.status(404).json({ error: 'Troca não encontrada' }); return; }

  // The reply is by the reviewed user (the one who received the review)
  const review = db.prepare(
    'SELECT * FROM trade_reviews WHERE trade_id = ? AND reviewed_id = ?'
  ).get(req.params.id, req.userId) as TradeReview | undefined;

  if (!review) { res.status(404).json({ error: 'Avaliação não encontrada' }); return; }

  db.prepare('UPDATE trade_reviews SET reply = ? WHERE id = ?').run(reply.trim(), review.id);

  res.json({ success: true });
});

export default router;
