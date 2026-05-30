import { v4 as uuidv4 } from 'uuid';
import { execute } from '../db';

type NotificationType = 'trade_proposal' | 'trade_accepted' | 'message' | 'trade_completed' | 'rating' | 'match_found';

export function createNotification(userId: string, type: NotificationType, payload: object): void {
  execute(
    `INSERT INTO notifications (id, user_id, type, payload, read, created_at) VALUES ($1, $2, $3, $4, 0, $5)`,
    [uuidv4(), userId, type, JSON.stringify(payload), Date.now()]
  ).catch(err => console.error('Failed to create notification:', err));
}
