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
