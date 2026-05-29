import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { authenticateToken } from '../middleware/auth';

const VALID_STATUSES = ['have_to_trade', 'need', 'have_double', 'none'];

const router = Router();

router.get('/', (req: Request, res: Response): void => {
  const db = getDb();
  const { team, type, group, search } = req.query;

  let query = 'SELECT * FROM stickers WHERE 1=1';
  const params: (string | number)[] = [];

  if (team) { query += ' AND team_code = ?'; params.push(team as string); }
  if (type) { query += ' AND card_type = ?'; params.push(type as string); }
  if (group) { query += ' AND group_name = ?'; params.push(group as string); }
  if (search) { query += ' AND (player_name LIKE ? OR team_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  query += ' ORDER BY number ASC';
  const stickers = db.prepare(query).all(...params);
  res.json(stickers);
});

router.get('/teams', (_req: Request, res: Response): void => {
  const db = getDb();
  const teams = db.prepare(`
    SELECT DISTINCT team_code, team_name, group_name
    FROM stickers
    WHERE team_code != 'SPECIAL'
    ORDER BY group_name, team_name
  `).all();
  res.json(teams);
});

// Get user's collection status for all stickers
router.get('/collection/me', authenticateToken, (req: Request, res: Response): void => {
  const db = getDb();
  const collection = db.prepare(`
    SELECT s.*, us.status, us.updated_at as status_updated
    FROM stickers s
    LEFT JOIN user_stickers us ON s.id = us.sticker_id AND us.user_id = ?
    ORDER BY s.number ASC
  `).all(req.userId);
  res.json(collection);
});

// Collection stats
router.get('/collection/stats/me', authenticateToken, (req: Request, res: Response): void => {
  const db = getDb();
  const total = (db.prepare('SELECT COUNT(*) as c FROM stickers').get() as { c: number }).c;
  const stats = db.prepare(`
    SELECT status, COUNT(*) as count FROM user_stickers WHERE user_id = ? GROUP BY status
  `).all(req.userId) as { status: string; count: number }[];

  const result: Record<string, number> = { total, have_to_trade: 0, need: 0, have_double: 0 };
  for (const s of stats) result[s.status] = s.count;
  result.collected = result.have_to_trade + result.have_double;
  result.completion_pct = Math.round((result.collected / total) * 100);

  res.json(result);
});

// Update status for a sticker
router.put('/collection/:stickerId', authenticateToken, (req: Request, res: Response): void => {
  const { stickerId } = req.params;
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: 'Status inválido' });
    return;
  }

  const db = getDb();
  const sticker = db.prepare('SELECT id FROM stickers WHERE id = ?').get(stickerId);
  if (!sticker) { res.status(404).json({ error: 'Cromo não encontrado' }); return; }

  if (status === 'none') {
    db.prepare('DELETE FROM user_stickers WHERE user_id = ? AND sticker_id = ?').run(req.userId, stickerId);
  } else {
    db.prepare(`
      INSERT INTO user_stickers (user_id, sticker_id, status, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, sticker_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at
    `).run(req.userId, stickerId, status, Date.now());
  }

  res.json({ success: true, stickerId, status });
});

// Bulk update sticker statuses
router.post('/collection/bulk', authenticateToken, (req: Request, res: Response): void => {
  const { updates } = req.body as { updates: Array<{ stickerId: string; status: string }> };
  if (!Array.isArray(updates)) { res.status(400).json({ error: 'updates deve ser um array' }); return; }

  for (const { stickerId, status } of updates) {
    if (!VALID_STATUSES.includes(status)) {
      res.status(400).json({ error: `Status inválido: ${status}` }); return;
    }
    if (!stickerId || typeof stickerId !== 'string') {
      res.status(400).json({ error: 'stickerId inválido' }); return;
    }
  }

  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO user_stickers (user_id, sticker_id, status, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, sticker_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at
  `);
  const del = db.prepare('DELETE FROM user_stickers WHERE user_id = ? AND sticker_id = ?');
  const now = Date.now();

  db.transaction(() => {
    for (const { stickerId, status } of updates) {
      if (status === 'none') del.run(req.userId, stickerId);
      else upsert.run(req.userId, stickerId, status, now);
    }
  })();

  res.json({ success: true, count: updates.length });
});

// Single sticker by ID — must be last to avoid shadowing /collection/* routes
router.get('/:id', (req: Request, res: Response): void => {
  const db = getDb();
  const sticker = db.prepare('SELECT * FROM stickers WHERE id = ?').get(req.params.id);
  if (!sticker) { res.status(404).json({ error: 'Cromo não encontrado' }); return; }
  res.json(sticker);
});

export default router;
