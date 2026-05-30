import { Router, Request, Response } from 'express';
import { query, queryOne, execute } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = Router();

async function requireAdmin(req: Request, res: Response): Promise<boolean> {
  const me = await queryOne<{ is_admin: boolean }>('SELECT is_admin FROM users WHERE id = $1', [req.userId]);
  if (!me?.is_admin) { res.status(403).json({ error: 'Sem permissão' }); return false; }
  return true;
}

router.get('/users', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!await requireAdmin(req, res)) return;
    const users = await query(
      `SELECT u.id, u.username, u.email, u.location, u.avatar_url, u.is_admin, u.rating_sum, u.rating_count, u.created_at,
              (SELECT COUNT(*) FROM trades WHERE (proposer_id = u.id OR receiver_id = u.id) AND status = 'completed') as completed_trades
       FROM users u ORDER BY u.created_at DESC`,
      []
    );
    res.json(users);
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// List pending reports
router.get('/reports', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!await requireAdmin(req, res)) return;
    const reports = await query(`
      SELECT r.id, r.sticker_id, r.current_name, r.suggested_name, r.status, r.created_at,
             s.team_name, s.group_name, s.number,
             u.username as reporter
      FROM sticker_reports r
      JOIN stickers s ON s.id = r.sticker_id
      JOIN users u ON u.id = r.reporter_id
      WHERE r.status = 'pending'
      ORDER BY r.created_at DESC
    `);
    res.json(reports);
  } catch (err) {
    console.error('Admin reports error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Apply report fix (update sticker name and mark report resolved)
router.post('/reports/:id/apply', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!await requireAdmin(req, res)) return;
    const report = await queryOne<{ sticker_id: string; suggested_name: string }>(
      'SELECT sticker_id, suggested_name FROM sticker_reports WHERE id = $1 AND status = $2',
      [req.params.id, 'pending']
    );
    if (!report) { res.status(404).json({ error: 'Report não encontrado' }); return; }

    await execute('UPDATE stickers SET player_name = $1 WHERE id = $2', [report.suggested_name, report.sticker_id]);
    await execute('UPDATE sticker_reports SET status = $1 WHERE id = $2', ['applied', req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Apply report error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Activity dashboard — online users + recent activity feed
router.get('/activity', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!await requireAdmin(req, res)) return;

    const now = Date.now();
    const onlineThreshold = now - 10 * 60 * 1000;
    const dayAgo          = now - 24 * 60 * 60 * 1000;
    const weekAgo         = now - 7  * 24 * 60 * 60 * 1000;

    const [online, feed, topUsers] = await Promise.all([
      query<{ id: string; username: string; location: string; last_seen: number }>(
        `SELECT id, username, location, last_seen FROM users WHERE last_seen > $1 ORDER BY last_seen DESC`,
        [onlineThreshold]
      ),

      query<{ type: string; actor: string; other: string; ts: number }>(
        `SELECT 'nova_conta' as type, username as actor, '' as other, created_at as ts
           FROM users WHERE created_at > $1
         UNION ALL
         SELECT 'proposta_troca', p.username, r.username, t.created_at
           FROM trades t
           JOIN users p ON p.id = t.proposer_id
           JOIN users r ON r.id = t.receiver_id
           WHERE t.created_at > $1
         UNION ALL
         SELECT 'troca_concluida', p.username, r.username, t.updated_at
           FROM trades t
           JOIN users p ON p.id = t.proposer_id
           JOIN users r ON r.id = t.receiver_id
           WHERE t.status = 'completed' AND t.updated_at > $1
         UNION ALL
         SELECT 'mensagem', u.username, '', m.created_at
           FROM trade_messages m
           JOIN users u ON u.id = m.sender_id
           WHERE m.created_at > $1
         UNION ALL
         SELECT 'report_cromo', u.username, sr.suggested_name, sr.created_at
           FROM sticker_reports sr
           JOIN users u ON u.id = sr.reporter_id
           WHERE sr.created_at > $1
         ORDER BY ts DESC LIMIT 100`,
        [dayAgo]
      ),

      query<{ username: string; location: string; trades: string; messages: string; last_seen: number }>(
        `SELECT u.username, u.location, u.last_seen,
           (SELECT COUNT(*) FROM trades WHERE (proposer_id=u.id OR receiver_id=u.id) AND created_at > $1)::text as trades,
           (SELECT COUNT(*) FROM trade_messages WHERE sender_id=u.id AND created_at > $1)::text as messages
         FROM users u
         ORDER BY (
           (SELECT COUNT(*) FROM trades WHERE (proposer_id=u.id OR receiver_id=u.id) AND created_at > $1) +
           (SELECT COUNT(*) FROM trade_messages WHERE sender_id=u.id AND created_at > $1)
         ) DESC
         LIMIT 12`,
        [weekAgo]
      ),
    ]);

    res.json({ online, feed, topUsers, now });
  } catch (err) {
    console.error('Activity error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// List missing sticker reports
router.get('/missing-reports', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!await requireAdmin(req, res)) return;
    const reports = await query(`
      SELECT mr.id, mr.team_name, mr.player_name, mr.notes, mr.status, mr.created_at,
             u.username as reporter
      FROM missing_reports mr
      JOIN users u ON u.id = mr.reporter_id
      WHERE mr.status = 'pending'
      ORDER BY mr.created_at DESC
    `);
    res.json(reports);
  } catch (err) {
    console.error('Missing reports error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Add missing sticker directly from the admin panel
router.post('/missing-reports/:id/add', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!await requireAdmin(req, res)) return;
    const { team_code, player_name, rarity } = req.body;
    if (!team_code?.trim() || !player_name?.trim()) {
      res.status(400).json({ error: 'team_code e player_name são obrigatórios' }); return;
    }

    const team = await queryOne<{ team_name: string; group_name: string }>(
      `SELECT team_name, group_name FROM stickers WHERE team_code = $1 LIMIT 1`, [team_code]
    );
    if (!team) { res.status(404).json({ error: 'Equipa não encontrada' }); return; }

    // Next player index for this team
    const existing = await query<{ id: string }>(
      `SELECT id FROM stickers WHERE team_code = $1 AND card_type = 'player' ORDER BY id`, [team_code]
    );
    const nextIdx = existing.length + 1;
    const stickerId = `${team_code}-P${String(nextIdx).padStart(2, '0')}`;

    // Next global number
    const maxNum = await queryOne<{ max: number }>('SELECT COALESCE(MAX(number), 0) AS max FROM stickers');
    const num = (maxNum?.max || 0) + 1;

    await execute(
      `INSERT INTO stickers (id, number, team_code, team_name, group_name, player_name, card_type, rarity, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, 'player', $7, '') ON CONFLICT (id) DO NOTHING`,
      [stickerId, num, team_code, team.team_name, team.group_name, player_name.trim(), rarity || 'common']
    );
    await execute('UPDATE missing_reports SET status = $1 WHERE id = $2', ['added', req.params.id]);

    res.json({ success: true, sticker_id: stickerId });
  } catch (err) {
    console.error('Add missing sticker error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Dismiss missing report
router.post('/missing-reports/:id/dismiss', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!await requireAdmin(req, res)) return;
    await execute('UPDATE missing_reports SET status = $1 WHERE id = $2', ['dismissed', req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Dismiss report (mark as ignored)
router.post('/reports/:id/dismiss', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!await requireAdmin(req, res)) return;
    await execute('UPDATE sticker_reports SET status = $1 WHERE id = $2', ['dismissed', req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
