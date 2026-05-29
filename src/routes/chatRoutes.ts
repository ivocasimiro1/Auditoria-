import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db';
import { authenticateToken } from '../middleware/auth';
import { createNotification } from '../services/notificationService';
import type { Trade } from '../types';

const router = Router({ mergeParams: true });

router.get('/', authenticateToken, (req: Request, res: Response): void => {
  const db = getDb();
  const trade = db.prepare(
    'SELECT * FROM trades WHERE id = ? AND (proposer_id = ? OR receiver_id = ?)'
  ).get(req.params.id, req.userId, req.userId) as Trade | undefined;

  if (!trade) { res.status(404).json({ error: 'Troca não encontrada' }); return; }

  const since = req.query.since ? parseInt(req.query.since as string) : 0;
  const messages = db.prepare(`
    SELECT m.*, u.username as sender_username
    FROM trade_messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.trade_id = ? AND m.created_at > ?
    ORDER BY m.created_at ASC
  `).all(req.params.id, since);

  res.json(messages);
});

router.post('/', authenticateToken, (req: Request, res: Response): void => {
  const { body } = req.body;
  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    res.status(400).json({ error: 'Mensagem não pode estar vazia' });
    return;
  }

  const db = getDb();
  const trade = db.prepare(
    'SELECT * FROM trades WHERE id = ? AND (proposer_id = ? OR receiver_id = ?)'
  ).get(req.params.id, req.userId, req.userId) as Trade | undefined;

  if (!trade) { res.status(404).json({ error: 'Troca não encontrada' }); return; }
  if (trade.status === 'cancelled' || trade.status === 'completed') {
    res.status(400).json({ error: 'Não podes enviar mensagens numa troca fechada' });
    return;
  }

  const id = uuidv4();
  const now = Date.now();
  db.prepare(
    'INSERT INTO trade_messages (id, trade_id, sender_id, body, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, req.params.id, req.userId!, body.trim(), now);

  const otherId = req.userId === trade.proposer_id ? trade.receiver_id : trade.proposer_id;
  const sender = db.prepare('SELECT username FROM users WHERE id = ?').get(req.userId) as { username: string };
  createNotification(otherId, 'message', { tradeId: req.params.id, fromUser: sender.username, preview: body.slice(0, 80) });

  res.status(201).json({ id, trade_id: req.params.id, sender_id: req.userId, body: body.trim(), created_at: now });
});

export default router;
