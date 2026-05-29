import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, (req: Request, res: Response): void => {
  const db = getDb();
  const { unread_only } = req.query;

  let query = 'SELECT * FROM notifications WHERE user_id = ?';
  const params: (string | number)[] = [req.userId!];

  if (unread_only === 'true') { query += ' AND read = 0'; }
  query += ' ORDER BY created_at DESC LIMIT 50';

  const notifications = db.prepare(query).all(...params);
  res.json(notifications);
});

router.get('/unread-count', authenticateToken, (req: Request, res: Response): void => {
  const db = getDb();
  const result = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0').get(req.userId) as { count: number };
  res.json({ count: result.count });
});

router.patch('/:id/read', authenticateToken, (req: Request, res: Response): void => {
  const db = getDb();
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

router.patch('/read-all', authenticateToken, (req: Request, res: Response): void => {
  const db = getDb();
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.userId);
  res.json({ success: true });
});

export default router;
