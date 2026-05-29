import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any });
const COMMISSION_PCT = 0.10;
const BASE_URL = process.env.BASE_URL || 'https://panini2026trocadecromos.up.railway.app';

// Create order + Stripe Checkout session
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const { listing_id } = req.body;
  if (!listing_id) { res.status(400).json({ error: 'listing_id obrigatório' }); return; }

  try {
    const listing = await queryOne<any>(`
      SELECT l.*, s.player_name, s.team_name, s.number
      FROM listings l
      JOIN stickers s ON l.sticker_id = s.id
      WHERE l.id = $1 AND l.status = 'active'
    `, [listing_id]);

    if (!listing) { res.status(404).json({ error: 'Anúncio não encontrado' }); return; }
    if (listing.type !== 'sell') { res.status(400).json({ error: 'Este anúncio não é uma venda' }); return; }
    if (listing.user_id === req.userId) { res.status(400).json({ error: 'Não podes comprar o teu próprio anúncio' }); return; }
    if (!listing.price_eur || listing.price_eur <= 0) { res.status(400).json({ error: 'Preço inválido' }); return; }

    const amount_eur = parseFloat(listing.price_eur);
    const commission_eur = parseFloat((amount_eur * COMMISSION_PCT).toFixed(2));
    const orderId = uuidv4();
    const now = Date.now();

    const productName = `Cromo Panini WC2026: ${listing.player_name || listing.team_name} #${String(listing.number).padStart(3, '0')}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: productName },
          unit_amount: Math.round(amount_eur * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${BASE_URL}/#/orders?paid=${orderId}`,
      cancel_url: `${BASE_URL}/#/listings`,
      metadata: { order_id: orderId },
    });

    await execute(`
      INSERT INTO orders (id, listing_id, buyer_id, seller_id, amount_eur, commission_eur, stripe_session_id, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_payment', $8, $8)
    `, [orderId, listing_id, req.userId, listing.user_id, amount_eur, commission_eur, session.id, now]);

    res.json({ checkout_url: session.url, order_id: orderId });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Erro ao criar encomenda' });
  }
});

// Verify payment after Stripe redirect
router.post('/:id/verify', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await queryOne<any>('SELECT * FROM orders WHERE id = $1 AND buyer_id = $2', [req.params.id, req.userId]);
    if (!order) { res.status(404).json({ error: 'Encomenda não encontrada' }); return; }

    if (order.status !== 'pending_payment') { res.json(order); return; }

    const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
    if (session.payment_status === 'paid') {
      const now = Date.now();
      await execute(`UPDATE orders SET status = 'paid', updated_at = $1 WHERE id = $2`, [now, order.id]);
      await execute(`UPDATE listings SET status = 'closed' WHERE id = $1`, [order.listing_id]);
      order.status = 'paid';
    }

    res.json(order);
  } catch (err) {
    console.error('Verify order error:', err);
    res.status(500).json({ error: 'Erro ao verificar pagamento' });
  }
});

// List my orders (as buyer or seller)
router.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await query<any>(`
      SELECT o.*,
             s.player_name, s.team_name, s.team_code, s.number,
             l.image_url as listing_image,
             buyer.username as buyer_username,
             seller.username as seller_username
      FROM orders o
      JOIN listings l ON o.listing_id = l.id
      JOIN stickers s ON l.sticker_id = s.id
      JOIN users buyer ON o.buyer_id = buyer.id
      JOIN users seller ON o.seller_id = seller.id
      WHERE o.buyer_id = $1 OR o.seller_id = $1
      ORDER BY o.created_at DESC
    `, [req.userId]);
    res.json(orders);
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: 'Erro ao obter encomendas' });
  }
});

// Seller marks as shipped
router.post('/:id/ship', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const { tracking_info } = req.body;
  try {
    const order = await queryOne<any>('SELECT * FROM orders WHERE id = $1 AND seller_id = $2', [req.params.id, req.userId]);
    if (!order) { res.status(404).json({ error: 'Encomenda não encontrada' }); return; }
    if (order.status !== 'paid') { res.status(400).json({ error: 'A encomenda ainda não foi paga' }); return; }

    await execute(
      `UPDATE orders SET status = 'shipped', tracking_info = $1, updated_at = $2 WHERE id = $3`,
      [tracking_info || null, Date.now(), order.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Ship order error:', err);
    res.status(500).json({ error: 'Erro ao marcar como enviado' });
  }
});

// Buyer confirms receipt
router.post('/:id/confirm', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await queryOne<any>('SELECT * FROM orders WHERE id = $1 AND buyer_id = $2', [req.params.id, req.userId]);
    if (!order) { res.status(404).json({ error: 'Encomenda não encontrada' }); return; }
    if (order.status !== 'shipped') { res.status(400).json({ error: 'A encomenda ainda não foi enviada' }); return; }

    await execute(
      `UPDATE orders SET status = 'completed', updated_at = $1 WHERE id = $2`,
      [Date.now(), order.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Confirm order error:', err);
    res.status(500).json({ error: 'Erro ao confirmar recepção' });
  }
});

export default router;
