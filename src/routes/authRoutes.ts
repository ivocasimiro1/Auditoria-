import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { queryOne, execute } from '../db';
import { generateToken } from '../middleware/auth';
import type { User } from '../types';

const router = Router();

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const raw = req.body;
  const username = typeof raw.username === 'string' ? raw.username.trim().slice(0, 30) : '';
  const email    = typeof raw.email    === 'string' ? raw.email.trim().toLowerCase().slice(0, 254) : '';
  const password = typeof raw.password === 'string' ? raw.password.slice(0, 128) : '';
  const location = typeof raw.location === 'string' ? raw.location.trim().slice(0, 100) : '';

  if (!username || !email || !password) {
    res.status(400).json({ error: 'Username, email e password são obrigatórios' });
    return;
  }

  if (!/^[a-zA-Z0-9_.\-]+$/.test(username)) {
    res.status(400).json({ error: 'Username só pode conter letras, números, _ . -' });
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Email inválido' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password deve ter pelo menos 6 caracteres' });
    return;
  }

  try {
    const existing = await queryOne('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (existing) {
      res.status(409).json({ error: 'Email ou username já em uso' });
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const now = Date.now();

    await execute(
      `INSERT INTO users (id, username, email, password_hash, location, rating_sum, rating_count, created_at)
       VALUES ($1, $2, $3, $4, $5, 0, 0, $6)`,
      [id, username, email, hash, location || null, now]
    );

    const token = generateToken(id);
    res.status(201).json({ token, user: { id, username, email, location } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const email    = typeof req.body.email    === 'string' ? req.body.email.trim().toLowerCase().slice(0, 254) : '';
  const password = typeof req.body.password === 'string' ? req.body.password.slice(0, 128) : '';

  if (!email || !password) {
    res.status(400).json({ error: 'Email e password são obrigatórios' });
    return;
  }

  try {
    const user = await queryOne<User>('SELECT * FROM users WHERE email = $1', [email]);

    if (!user) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    const token = generateToken(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        location: user.location,
        avatar_url: user.avatar_url,
        is_admin: user.is_admin || false,
        rating: user.rating_count > 0 ? user.rating_sum / user.rating_count : null,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
