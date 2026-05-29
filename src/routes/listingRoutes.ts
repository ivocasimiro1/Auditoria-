import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db';
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
router.get('/', (req: Request, res: Response): void => {
  const db = getDb();
  const { type, team, location, search } = req.query;

  let query = `
    SELECT l.*, u.username, u.location as user_location,
           s.team_name, s.team_code, s.player_name, s.card_type, s.number, s.rarity
    FROM listings l
    JOIN users u ON l.user_id = u.id
    JOIN stickers s ON l.sticker_id = s.id
    WHERE l.status = 'active'
  `;
  const params: (string | number)[] = [];

  if (type) { query += ' AND l.type = ?'; params.push(type as string); }
  if (team) { query += ' AND s.team_code = ?'; params.push(team as string); }
  if (location) { query += ' AND u.location LIKE ?'; params.push(`%${location}%`); }
  if (search) {
    query += ' AND (s.player_name LIKE ? OR s.team_name LIKE ? OR l.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY l.created_at DESC LIMIT 100';
  res.json(db.prepare(query).all(...params));
});

// Get single listing
router.get('/:id', (req: Request, res: Response): void => {
  const db = getDb();
  const listing = db.prepare(`
    SELECT l.*, u.username, u.location as user_location, u.rating_sum, u.rating_count,
           s.team_name, s.team_code, s.player_name, s.card_type, s.number, s.rarity
    FROM listings l
    JOIN users u ON l.user_id = u.id
    JOIN stickers s ON l.sticker_id = s.id
    WHERE l.id = ?
  `).get(req.params.id);
  if (!listing) { res.status(404).json({ error: 'Anúncio não encontrado' }); return; }
  res.json(listing);
});

// Create listing
router.post('/', authenticateToken, upload.single('image'), (req: Request, res: Response): void => {
  const { sticker_id, type, price_eur, description } = req.body;

  if (!sticker_id || !type) { res.status(400).json({ error: 'sticker_id e type são obrigatórios' }); return; }
  if (!['trade', 'sell', 'gift'].includes(type)) { res.status(400).json({ error: 'Tipo inválido' }); return; }

  const db = getDb();
  const sticker = db.prepare('SELECT id FROM stickers WHERE id = ?').get(sticker_id);
  if (!sticker) { res.status(404).json({ error: 'Cromo não encontrado' }); return; }

  const image_url = req.file ? `/uploads/${req.file.filename}` : null;
  const id = uuidv4();
  const now = Date.now();

  db.prepare(`
    INSERT INTO listings (id, user_id, sticker_id, type, price_eur, description, image_url, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
  `).run(id, req.userId!, sticker_id, type, price_eur ? parseFloat(price_eur) : null, description || null, image_url, now);

  res.status(201).json({ id, status: 'active' });
});

// Close listing
router.patch('/:id/close', authenticateToken, (req: Request, res: Response): void => {
  const db = getDb();
  const listing = db.prepare('SELECT * FROM listings WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as { id: string } | undefined;
  if (!listing) { res.status(404).json({ error: 'Anúncio não encontrado' }); return; }
  db.prepare("UPDATE listings SET status = 'closed' WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Upload photo for a listing (update image)
router.post('/:id/photo', authenticateToken, upload.single('image'), (req: Request, res: Response): void => {
  if (!req.file) { res.status(400).json({ error: 'Imagem obrigatória' }); return; }
  const db = getDb();
  const listing = db.prepare('SELECT * FROM listings WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as { id: string; image_url?: string } | undefined;
  if (!listing) { res.status(404).json({ error: 'Anúncio não encontrado' }); return; }

  if (listing.image_url) {
    const old = path.join(__dirname, '..', '..', 'public', listing.image_url);
    if (fs.existsSync(old)) fs.unlinkSync(old);
  }

  const image_url = `/uploads/${req.file.filename}`;
  db.prepare('UPDATE listings SET image_url = ? WHERE id = ?').run(image_url, req.params.id);
  res.json({ image_url });
});

// Upload custom photo for a sticker in collection
router.post('/sticker-photo/:stickerId', authenticateToken, upload.single('image'), (req: Request, res: Response): void => {
  if (!req.file) { res.status(400).json({ error: 'Imagem obrigatória' }); return; }
  const db = getDb();
  const entry = db.prepare('SELECT * FROM user_stickers WHERE user_id = ? AND sticker_id = ?').get(req.userId, req.params.stickerId);
  if (!entry) { res.status(404).json({ error: 'Cromo não está na tua coleção' }); return; }

  const image_url = `/uploads/${req.file.filename}`;
  db.prepare('UPDATE user_stickers SET custom_image_url = ? WHERE user_id = ? AND sticker_id = ?')
    .run(image_url, req.userId!, req.params.stickerId);

  res.json({ image_url });
});

export default router;
