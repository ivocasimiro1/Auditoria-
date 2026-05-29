import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db';

type NotificationType = 'trade_proposal' | 'trade_accepted' | 'message' | 'trade_completed' | 'rating' | 'match_found';

export function createNotification(userId: string, type: NotificationType, payload: object): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO notifications (id, user_id, type, payload, read, created_at)
    VALUES (?, ?, ?, ?, 0, ?)
  `).run(uuidv4(), userId, type, JSON.stringify(payload), Date.now());
}
