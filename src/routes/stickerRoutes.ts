import { Router, Request, Response } from 'express';
import { query, queryOne, execute, transaction } from '../db';
import { authenticateToken } from '../middleware/auth';

const VALID_STATUSES = ['have_to_trade', 'need', 'have_double', 'none'];

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { team, type, group, search } = req.query;

  let sql = 'SELECT * FROM stickers WHERE 1=1';
  const params: any[] = [];
  let idx = 1;

  if (team) { sql += ` AND team_code = $${idx++}`; params.push(team as string); }
  if (type) { sql += ` AND card_type = $${idx++}`; params.push(type as string); }
  if (group) { sql += ` AND group_name = $${idx++}`; params.push(group as string); }
  if (search) {
    sql += ` AND (player_name ILIKE $${idx} OR team_name ILIKE $${idx + 1})`;
    params.push(`%${search}%`, `%${search}%`);
    idx += 2;
  }

  sql += ' ORDER BY number ASC';

  try {
    const stickers = await query(sql, params);
    res.json(stickers);
  } catch (err) {
    console.error('Get stickers error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/teams', async (_req: Request, res: Response): Promise<void> => {
  try {
    const teams = await query(`
      SELECT DISTINCT team_code, team_name, group_name
      FROM stickers
      WHERE team_code != 'SPECIAL'
      ORDER BY group_name, team_name
    `);
    res.json(teams);
  } catch (err) {
    console.error('Get teams error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get user's collection status for all stickers
router.get('/collection/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const collection = await query(`
      SELECT s.*, us.status, us.updated_at as status_updated, us.custom_image_url
      FROM stickers s
      LEFT JOIN user_stickers us ON s.id = us.sticker_id AND us.user_id = $1
      ORDER BY s.number ASC
    `, [req.userId]);
    res.json(collection);
  } catch (err) {
    console.error('Get collection error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Collection stats
router.get('/collection/stats/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const totalRow = await queryOne<{ c: string }>('SELECT COUNT(*) as c FROM stickers');
    const total = parseInt(totalRow?.c ?? '0', 10);

    const stats = await query<{ status: string; count: string }>(
      'SELECT status, COUNT(*) as count FROM user_stickers WHERE user_id = $1 GROUP BY status',
      [req.userId]
    );

    const result: Record<string, number> = { total, have_to_trade: 0, need: 0, have_double: 0 };
    for (const s of stats) result[s.status] = parseInt(s.count, 10);
    result.collected = result.have_to_trade + result.have_double;
    result.completion_pct = Math.round((result.collected / total) * 100);

    res.json(result);
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Update status for a sticker
router.put('/collection/:stickerId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const { stickerId } = req.params;
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: 'Status inválido' });
    return;
  }

  try {
    const sticker = await queryOne('SELECT id FROM stickers WHERE id = $1', [stickerId]);
    if (!sticker) { res.status(404).json({ error: 'Cromo não encontrado' }); return; }

    if (status === 'none') {
      await execute('DELETE FROM user_stickers WHERE user_id = $1 AND sticker_id = $2', [req.userId, stickerId]);
    } else {
      await execute(`
        INSERT INTO user_stickers (user_id, sticker_id, status, updated_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT(user_id, sticker_id) DO UPDATE SET status = EXCLUDED.status, updated_at = EXCLUDED.updated_at
      `, [req.userId, stickerId, status, Date.now()]);
    }

    res.json({ success: true, stickerId, status });
  } catch (err) {
    console.error('Update sticker status error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Bulk update sticker statuses
router.post('/collection/bulk', authenticateToken, async (req: Request, res: Response): Promise<void> => {
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

  const now = Date.now();

  try {
    await transaction(async (client) => {
      for (const { stickerId, status } of updates) {
        if (status === 'none') {
          await client.query('DELETE FROM user_stickers WHERE user_id = $1 AND sticker_id = $2', [req.userId, stickerId]);
        } else {
          await client.query(`
            INSERT INTO user_stickers (user_id, sticker_id, status, updated_at)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT(user_id, sticker_id) DO UPDATE SET status = EXCLUDED.status, updated_at = EXCLUDED.updated_at
          `, [req.userId, stickerId, status, now]);
        }
      }
    });

    res.json({ success: true, count: updates.length });
  } catch (err) {
    console.error('Bulk update error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Admin: update sticker player_name
router.put('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await queryOne<{ is_admin: boolean }>('SELECT is_admin FROM users WHERE id = $1', [req.userId]);
    if (!user?.is_admin) { res.status(403).json({ error: 'Sem permissão' }); return; }

    const { player_name } = req.body;
    if (!player_name || typeof player_name !== 'string' || !player_name.trim()) {
      res.status(400).json({ error: 'Nome inválido' }); return;
    }

    const updated = await queryOne(
      'UPDATE stickers SET player_name = $1 WHERE id = $2 RETURNING *',
      [player_name.trim(), req.params.id]
    );
    if (!updated) { res.status(404).json({ error: 'Cromo não encontrado' }); return; }
    res.json(updated);
  } catch (err) {
    console.error('Update sticker error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Single sticker by ID — must be last to avoid shadowing /collection/* routes
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const sticker = await queryOne('SELECT * FROM stickers WHERE id = $1', [req.params.id]);
    if (!sticker) { res.status(404).json({ error: 'Cromo não encontrado' }); return; }
    res.json(sticker);
  } catch (err) {
    console.error('Get sticker error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
