import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db';
import { authenticateToken } from '../middleware/auth';
import { calculateShipping, generateTrackingNumber, generateLabel, TRACKING_STATES, type Carrier } from '../services/shippingService';
import type { Trade } from '../types';

const router = Router({ mergeParams: true });

// Get shipping quotes for a trade
router.get('/quotes', authenticateToken, (req: Request, res: Response): void => {
  const db = getDb();
  const trade = db.prepare(
    'SELECT * FROM trades WHERE id = ? AND (proposer_id = ? OR receiver_id = ?)'
  ).get(req.params.id, req.userId, req.userId) as Trade | undefined;

  if (!trade) { res.status(404).json({ error: 'Troca não encontrada' }); return; }

  const propCount = JSON.parse(trade.proposer_stickers).length;
  const recvCount = JSON.parse(trade.receiver_stickers).length;
  const totalCount = propCount + recvCount;

  res.json(calculateShipping(totalCount));
});

// Create shipment for accepted trade
router.post('/', authenticateToken, (req: Request, res: Response): void => {
  const { carrier } = req.body as { carrier: Carrier };
  if (!['CTT', 'DHL', 'MRW'].includes(carrier)) {
    res.status(400).json({ error: 'Transportadora inválida' });
    return;
  }

  const db = getDb();
  const trade = db.prepare(
    "SELECT t.*, p.username as proposer_username, r.username as receiver_username FROM trades t JOIN users p ON t.proposer_id = p.id JOIN users r ON t.receiver_id = r.id WHERE t.id = ? AND status = 'accepted' AND (t.proposer_id = ? OR t.receiver_id = ?)"
  ).get(req.params.id, req.userId, req.userId) as (Trade & { proposer_username: string; receiver_username: string }) | undefined;

  if (!trade) { res.status(404).json({ error: 'Troca aceite não encontrada' }); return; }

  const existing = db.prepare('SELECT id FROM shipments WHERE trade_id = ?').get(req.params.id);
  if (existing) { res.status(409).json({ error: 'Envio já criado para esta troca' }); return; }

  const totalCount = JSON.parse(trade.proposer_stickers).length + JSON.parse(trade.receiver_stickers).length;
  const quotes = calculateShipping(totalCount);
  const quote = quotes.find(q => q.carrier === carrier)!;
  const tracking = generateTrackingNumber(carrier);
  const label = generateLabel(carrier, tracking, trade.proposer_username, trade.receiver_username);

  db.prepare(`
    INSERT INTO shipments (id, trade_id, carrier, cost_eur, tracking_number, label_data, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'label_created', ?)
  `).run(uuidv4(), req.params.id, carrier, quote.cost_eur, tracking, label, Date.now());

  db.prepare("UPDATE trades SET status = 'in_transit', updated_at = ? WHERE id = ?").run(Date.now(), req.params.id);

  res.status(201).json({ tracking_number: tracking, carrier, cost_eur: quote.cost_eur, status: 'label_created' });
});

// Get shipment status
router.get('/', authenticateToken, (req: Request, res: Response): void => {
  const db = getDb();
  const shipment = db.prepare(`
    SELECT s.* FROM shipments s
    JOIN trades t ON s.trade_id = t.id
    WHERE s.trade_id = ? AND (t.proposer_id = ? OR t.receiver_id = ?)
  `).get(req.params.id, req.userId, req.userId);

  if (!shipment) { res.status(404).json({ error: 'Envio não encontrado' }); return; }
  res.json(shipment);
});

// Advance shipment tracking state (simulates real courier updates)
router.post('/advance', authenticateToken, (req: Request, res: Response): void => {
  const db = getDb();
  const shipment = db.prepare(`
    SELECT s.* FROM shipments s
    JOIN trades t ON s.trade_id = t.id
    WHERE s.trade_id = ? AND (t.proposer_id = ? OR t.receiver_id = ?)
  `).get(req.params.id, req.userId, req.userId) as { id: string; status: string; trade_id: string } | undefined;

  if (!shipment) { res.status(404).json({ error: 'Envio não encontrado' }); return; }

  const currentIdx = TRACKING_STATES.indexOf(shipment.status as typeof TRACKING_STATES[number]);
  if (currentIdx === TRACKING_STATES.length - 1) {
    res.status(400).json({ error: 'Envio já entregue' }); return;
  }

  const nextStatus = TRACKING_STATES[currentIdx + 1];
  db.prepare('UPDATE shipments SET status = ? WHERE id = ?').run(nextStatus, shipment.id);

  if (nextStatus === 'delivered') {
    db.prepare("UPDATE trades SET status = 'completed', updated_at = ? WHERE id = ?").run(Date.now(), shipment.trade_id);
  }

  res.json({ status: nextStatus });
});

export default router;
