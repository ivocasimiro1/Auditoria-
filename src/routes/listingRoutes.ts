import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../db';
import { authenticateToken } from '../middleware/auth';
import { createNotification } from '../services/notificationService';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, '..', '..', 'public', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Apenas imagens JPG, PNG ou WebP'));
  },
});

// List all active listings
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { type, team, location, search } = req.query;

  let sql = `
    SELECT l.*, u.username, u.location as user_location,
           s.team_name, s.team_code, s.player_name, s.card_type, s.number, s.rarity
    FROM listings l
    JOIN users u ON l.user_id = u.id
    JOIN stickers s ON l.sticker_id = s.id
    WHERE l.status = 'active'
  `;
  const params: any[] = [];
  let idx = 1;

  if (type) { sql += ` AND l.type = $${idx++}`; params.push(type as string); }
  if (team) { sql += ` AND s.team_code = $${idx++}`; params.push(team as string); }
  if (location) { sql += ` AND u.location ILIKE $${idx++}`; params.push(`%${location}%`); }
  if (search) {
    sql += ` AND (s.player_name ILIKE $${idx} OR s.team_name ILIKE $${idx + 1} OR l.description ILIKE $${idx + 2})`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    idx += 3;
  }

  sql += ' ORDER BY l.created_at DESC LIMIT 100';

  try {
    res.json(await query(sql, params));
  } catch (err) {
    console.error('Get listings error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get single listing
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const listing = await queryOne(`
      SELECT l.*, u.username, u.location as user_location, u.rating_sum, u.rating_count,
             s.team_name, s.team_code, s.player_name, s.card_type, s.number, s.rarity
      FROM listings l
      JOIN users u ON l.user_id = u.id
      JOIN stickers s ON l.sticker_id = s.id
      WHERE l.id = $1
    `, [req.params.id]);
    if (!listing) { res.status(404).json({ error: 'Anúncio não encontrado' }); return; }
    res.json(listing);
  } catch (err) {
    console.error('Get listing error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Create listing
router.post('/', authenticateToken, upload.single('image'), async (req: Request, res: Response): Promise<void> => {
  const { sticker_id, type, price_eur, description } = req.body;

  if (!sticker_id || !type) { res.status(400).json({ error: 'sticker_id e type são obrigatórios' }); return; }
  if (!['trade', 'sell', 'gift'].includes(type)) { res.status(400).json({ error: 'Tipo inválido' }); return; }

  try {
    const sticker = await queryOne('SELECT id FROM stickers WHERE id = $1', [sticker_id]);
    if (!sticker) { res.status(404).json({ error: 'Cromo não encontrado' }); return; }

    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    const id = uuidv4();
    const now = Date.now();

    await execute(`
      INSERT INTO listings (id, user_id, sticker_id, type, price_eur, description, image_url, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8)
    `, [id, req.userId!, sticker_id, type, price_eur ? parseFloat(price_eur) : null, description || null, image_url, now]);

    res.status(201).json({ id, status: 'active' });
  } catch (err) {
    console.error('Create listing error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Close listing
router.patch('/:id/close', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const listing = await queryOne<{ id: string }>('SELECT id FROM listings WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (!listing) { res.status(404).json({ error: 'Anúncio não encontrado' }); return; }
    await execute("UPDATE listings SET status = 'closed' WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Close listing error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Upload photo for a listing (update image)
router.post('/:id/photo', authenticateToken, upload.single('image'), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: 'Imagem obrigatória' }); return; }
  try {
    const listing = await queryOne<{ id: string; image_url?: string }>('SELECT id, image_url FROM listings WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (!listing) { res.status(404).json({ error: 'Anúncio não encontrado' }); return; }

    if (listing.image_url) {
      const old = path.join(__dirname, '..', '..', 'public', listing.image_url);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }

    const image_url = `/uploads/${req.file.filename}`;
    await execute('UPDATE listings SET image_url = $1 WHERE id = $2', [image_url, req.params.id]);
    res.json({ image_url });
  } catch (err) {
    console.error('Upload listing photo error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Upload custom photo for a sticker in collection
router.post('/sticker-photo/:stickerId', authenticateToken, upload.single('image'), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: 'Imagem obrigatória' }); return; }
  try {
    const entry = await queryOne('SELECT user_id FROM user_stickers WHERE user_id = $1 AND sticker_id = $2', [req.userId, req.params.stickerId]);
    if (!entry) { res.status(404).json({ error: 'Cromo não está na tua coleção' }); return; }

    const image_url = `/uploads/${req.file.filename}`;
    await execute('UPDATE user_stickers SET custom_image_url = $1 WHERE user_id = $2 AND sticker_id = $3',
      [image_url, req.userId!, req.params.stickerId]);

    res.json({ image_url });
  } catch (err) {
    console.error('Upload sticker photo error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
