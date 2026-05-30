import { queryOne, execute } from '../db';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ivo@despomar.com';

export async function seedUsers(): Promise<void> {
  // Remove demo users if they exist (cleanup from earlier development)
  await execute(
    `DELETE FROM user_stickers WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@demo.pt')`,
  );
  await execute(`DELETE FROM users WHERE email LIKE '%@demo.pt'`);
}

export async function ensureAdmin(): Promise<void> {
  await queryOne(
    'UPDATE users SET is_admin = TRUE WHERE email = $1',
    [ADMIN_EMAIL]
  );
}
