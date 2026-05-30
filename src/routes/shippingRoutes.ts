import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { queryOne, execute } from '../db';
import { authenticateToken } from '../middleware/auth';
import { calculateShipping, generateTrackingNumber, generateLabel, TRACKING_STATES, type Carrier } from '../services/shippingService';
import type { Trade } from '../types';

const router = Router({ mergeParams: true });

// Get shipping quotes for a trade
router.get('/quotes', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const trade = await queryOne<Trade>(
      'SELECT * FROM trades WHERE id = $1 AND (proposer_id = $2 OR receiver_id = $3)',
      [req.params.id, req.userId, req.userId]
    );

    if (!trade) { res.status(404).json({ error: 'Troca não encontrada' }); return; }

    const propCount = JSON.parse(trade.proposer_stickers).length;
    const recvCount = JSON.parse(trade.receiver_stickers).length;
    const totalCount = propCount + recvCount;

    res.json(calculateShipping(totalCount));
  } catch (err) {
    console.error('Get shipping quotes error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Create shipment for accepted trade
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const { carrier } = req.body as { carrier: Carrier };
  if (!['CTT', 'DHL', 'MRW'].includes(carrier)) {
    res.status(400).json({ error: 'Transportadora inválida' });
    return;
  }

  try {
    const trade = await queryOne<Trade & { proposer_username: string; receiver_username: string }>(
      "SELECT t.*, p.username as proposer_username, r.username as receiver_username FROM trades t JOIN users p ON t.proposer_id = p.id JOIN users r ON t.receiver_id = r.id WHERE t.id = $1 AND status = 'accepted' AND (t.proposer_id = $2 OR t.receiver_id = $3)",
      [req.params.id, req.userId, req.userId]
    );

    if (!trade) { res.status(404).json({ error: 'Troca aceite não encontrada' }); return; }

    const existing = await queryOne('SELECT id FROM shipments WHERE trade_id = $1', [req.params.id]);
    if (existing) { res.status(409).json({ error: 'Envio já criado para esta troca' }); return; }

    const totalCount = JSON.parse(trade.proposer_stickers).length + JSON.parse(trade.receiver_stickers).length;
    const quotes = calculateShipping(totalCount);
    const quote = quotes.find(q => q.carrier === carrier)!;
    const tracking = generateTrackingNumber(carrier);
    const label = generateLabel(carrier, tracking, trade.proposer_username, trade.receiver_username);

    await execute(`
      INSERT INTO shipments (id, trade_id, carrier, cost_eur, tracking_number, label_data, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'label_created', $7)
    `, [uuidv4(), req.params.id, carrier, quote.cost_eur, tracking, label, Date.now()]);

    await execute("UPDATE trades SET status = 'in_transit', updated_at = $1 WHERE id = $2", [Date.now(), req.params.id]);

    res.status(201).json({ tracking_number: tracking, carrier, cost_eur: quote.cost_eur, status: 'label_created' });
  } catch (err) {
    console.error('Create shipment error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get shipment status
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const shipment = await queryOne(`
      SELECT s.* FROM shipments s
      JOIN trades t ON s.trade_id = t.id
      WHERE s.trade_id = $1 AND (t.proposer_id = $2 OR t.receiver_id = $3)
    `, [req.params.id, req.userId, req.userId]);

    if (!shipment) { res.status(404).json({ error: 'Envio não encontrado' }); return; }
    res.json(shipment);
  } catch (err) {
    console.error('Get shipment error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Advance shipment tracking state (simulates real courier updates)
router.post('/advance', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const shipment = await queryOne<{ id: string; status: string; trade_id: string }>(`
      SELECT s.* FROM shipments s
      JOIN trades t ON s.trade_id = t.id
      WHERE s.trade_id = $1 AND (t.proposer_id = $2 OR t.receiver_id = $3)
    `, [req.params.id, req.userId, req.userId]);

    if (!shipment) { res.status(404).json({ error: 'Envio não encontrado' }); return; }

    const currentIdx = TRACKING_STATES.indexOf(shipment.status as typeof TRACKING_STATES[number]);
    if (currentIdx === TRACKING_STATES.length - 1) {
      res.status(400).json({ error: 'Envio já entregue' }); return;
    }

    const nextStatus = TRACKING_STATES[currentIdx + 1];
    await execute('UPDATE shipments SET status = $1 WHERE id = $2', [nextStatus, shipment.id]);

    if (nextStatus === 'delivered') {
      await execute("UPDATE trades SET status = 'completed', updated_at = $1 WHERE id = $2", [Date.now(), shipment.trade_id]);
    }

    res.json({ status: nextStatus });
  } catch (err) {
    console.error('Advance shipment error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
