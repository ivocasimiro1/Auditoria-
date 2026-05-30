import { Router, Request, Response } from 'express';
import { query, queryOne, execute } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const { unread_only } = req.query;

  let sql = 'SELECT * FROM notifications WHERE user_id = $1';
  const params: any[] = [req.userId!];

  if (unread_only === 'true') { sql += ' AND read = 0'; }
  sql += ' ORDER BY created_at DESC LIMIT 50';

  try {
    const notifications = await query(sql, params);
    res.json(notifications);
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/unread-count', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = 0', [req.userId]);
    res.json({ count: parseInt(result?.count ?? '0', 10) });
  } catch (err) {
    console.error('Get unread count error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.patch('/:id/read', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    await execute('UPDATE notifications SET read = 1 WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Mark notification read error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.patch('/read-all', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    await execute('UPDATE notifications SET read = 1 WHERE user_id = $1', [req.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Mark all notifications read error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
