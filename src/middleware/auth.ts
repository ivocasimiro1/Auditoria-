import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { execute } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'panini_wc2026_secret_key_change_in_production';
const SEEN_DEBOUNCE_MS = 60_000; // update last_seen at most once per minute

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Token de autenticação necessário' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = payload.userId;

    // Fire-and-forget: update last_seen at most once per minute per user
    const now = Date.now();
    execute(
      'UPDATE users SET last_seen = $1 WHERE id = $2 AND last_seen < $3',
      [now, payload.userId, now - SEEN_DEBOUNCE_MS]
    ).catch(() => {});

    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}
