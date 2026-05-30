import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, transaction } from '../db';

const DEMO_USERS = [
  { username: 'joao_cromos', email: 'joao@demo.pt', password: 'demo123', location: 'Lisboa' },
  { username: 'maria_panini', email: 'maria@demo.pt', password: 'demo123', location: 'Porto' },
  { username: 'pedro_mundial', email: 'pedro@demo.pt', password: 'demo123', location: 'Braga' },
  { username: 'ana_futebol', email: 'ana@demo.pt', password: 'demo123', location: 'Coimbra' },
  { username: 'carlos_stickers', email: 'carlos@demo.pt', password: 'demo123', location: 'Faro' },
  { username: 'sofia_wc2026', email: 'sofia@demo.pt', password: 'demo123', location: 'Aveiro' },
  { username: 'miguel_troca', email: 'miguel@demo.pt', password: 'demo123', location: 'Setúbal' },
  { username: 'rita_album', email: 'rita@demo.pt', password: 'demo123', location: 'Évora' },
  { username: 'tiago_panini', email: 'tiago@demo.pt', password: 'demo123', location: 'Leiria' },
  { username: 'inês_cromos', email: 'ines@demo.pt', password: 'demo123', location: 'Viseu' },
];

export async function seedUsers(): Promise<void> {
  const countRow = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM users');
  const count = parseInt(countRow?.count ?? '0', 10);
  if (count > 0) return;

  const allStickers = await query<{ id: string }>('SELECT id FROM stickers');
  const stickerIds = allStickers.map(s => s.id);

  for (const u of DEMO_USERS) {
    const hash = bcrypt.hashSync(u.password, 10);
    const userId = uuidv4();
    const now = Date.now();

    await transaction(async (client) => {
      await client.query(
        `INSERT INTO users (id, username, email, password_hash, location, rating_sum, rating_count, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING`,
        [userId, u.username, u.email, hash, u.location, Math.floor(Math.random() * 25), Math.floor(Math.random() * 6), now]
      );

      // Give each user a random partial collection
      const shuffled = [...stickerIds].sort(() => Math.random() - 0.5);
      const haveCount = Math.floor(stickerIds.length * (0.4 + Math.random() * 0.4));
      const tradeCount = Math.floor(haveCount * 0.2);

      const haveIds = shuffled.slice(0, haveCount);
      const tradeIds = haveIds.slice(0, tradeCount);
      const needIds = shuffled.slice(haveCount, haveCount + Math.floor(stickerIds.length * 0.2));

      for (const sid of tradeIds) {
        await client.query(
          `INSERT INTO user_stickers (user_id, sticker_id, status, updated_at) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [userId, sid, 'have_to_trade', now]
        );
      }
      for (const sid of haveIds.slice(tradeCount)) {
        await client.query(
          `INSERT INTO user_stickers (user_id, sticker_id, status, updated_at) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [userId, sid, 'have_double', now]
        );
      }
      for (const sid of needIds) {
        await client.query(
          `INSERT INTO user_stickers (user_id, sticker_id, status, updated_at) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [userId, sid, 'need', now]
        );
      }
    });
  }

  console.log('Demo users seeded successfully');
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ivo@despomar.com';

export async function ensureAdmin(): Promise<void> {
  await queryOne(
    'UPDATE users SET is_admin = TRUE WHERE email = $1',
    [ADMIN_EMAIL]
  );
}
