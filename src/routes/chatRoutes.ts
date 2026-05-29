import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../db';
import { authenticateToken } from '../middleware/auth';
import { createNotification } from '../services/notificationService';
import type { Trade } from '../types';

const router = Router({ mergeParams: true });

router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const trade = await queryOne<Trade>(
      'SELECT * FROM trades WHERE id = $1 AND (proposer_id = $2 OR receiver_id = $3)',
      [req.params.id, req.userId, req.userId]
    );

    if (!trade) { res.status(404).json({ error: 'Troca não encontrada' }); return; }

    const since = req.query.since ? parseInt(req.query.since as string) : 0;
    const messages = await query(`
      SELECT m.*, u.username as sender_username
      FROM trade_messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.trade_id = $1 AND m.created_at > $2
      ORDER BY m.created_at ASC
    `, [req.params.id, since]);

    res.json(messages);
  } catch (err) {
    console.error('Get chat messages error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const { body } = req.body;
  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    res.status(400).json({ error: 'Mensagem não pode estar vazia' });
    return;
  }

  try {
    const trade = await queryOne<Trade>(
      'SELECT * FROM trades WHERE id = $1 AND (proposer_id = $2 OR receiver_id = $3)',
      [req.params.id, req.userId, req.userId]
    );

    if (!trade) { res.status(404).json({ error: 'Troca não encontrada' }); return; }
    if (trade.status === 'cancelled' || trade.status === 'completed') {
      res.status(400).json({ error: 'Não podes enviar mensagens numa troca fechada' });
      return;
    }

    const id = uuidv4();
    const now = Date.now();
    await execute(
      'INSERT INTO trade_messages (id, trade_id, sender_id, body, created_at) VALUES ($1, $2, $3, $4, $5)',
      [id, req.params.id, req.userId!, body.trim(), now]
    );

    const otherId = req.userId === trade.proposer_id ? trade.receiver_id : trade.proposer_id;
    const sender = await queryOne<{ username: string }>('SELECT username FROM users WHERE id = $1', [req.userId]);
    createNotification(otherId, 'message', { tradeId: req.params.id, fromUser: sender?.username ?? '', preview: body.slice(0, 80) });

    res.status(201).json({ id, trade_id: req.params.id, sender_id: req.userId, body: body.trim(), created_at: now });
  } catch (err) {
    console.error('Post chat message error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
