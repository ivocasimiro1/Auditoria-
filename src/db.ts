import { Pool, PoolClient } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set. Please provide a PostgreSQL connection string.');
}

const DATABASE_URL = process.env.DATABASE_URL as string;

let _pool: Pool | null = null;

export function getDb(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
    });
  }
  return _pool;
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const pool = getDb();
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(sql: string, params?: any[]): Promise<void> {
  const pool = getDb();
  await pool.query(sql, params);
}

export async function executeReturning<T = any>(sql: string, params?: any[]): Promise<T> {
  const pool = getDb();
  const result = await pool.query(sql, params);
  return result.rows[0] as T;
}

export async function transaction(fn: (client: PoolClient) => Promise<void>): Promise<void> {
  const pool = getDb();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await fn(client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  location TEXT,
  avatar_url TEXT,
  rating_sum INTEGER DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS stickers (
  id TEXT PRIMARY KEY,
  number INTEGER NOT NULL,
  team_code TEXT NOT NULL,
  team_name TEXT NOT NULL,
  group_name TEXT NOT NULL,
  player_name TEXT,
  card_type TEXT NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'common',
  image_url TEXT
);

CREATE TABLE IF NOT EXISTS user_stickers (
  user_id TEXT NOT NULL,
  sticker_id TEXT NOT NULL,
  status TEXT NOT NULL,
  updated_at BIGINT NOT NULL,
  custom_image_url TEXT,
  PRIMARY KEY (user_id, sticker_id)
);

CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY,
  proposer_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  proposer_stickers TEXT NOT NULL,
  receiver_stickers TEXT NOT NULL,
  message TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  proposer_rated INTEGER DEFAULT 0,
  receiver_rated INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS trade_messages (
  id TEXT PRIMARY KEY,
  trade_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY,
  trade_id TEXT UNIQUE NOT NULL,
  carrier TEXT NOT NULL,
  cost_eur REAL NOT NULL,
  tracking_number TEXT NOT NULL,
  label_data TEXT,
  status TEXT NOT NULL DEFAULT 'label_created',
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  read INTEGER DEFAULT 0,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS ratings (
  id TEXT PRIMARY KEY,
  trade_id TEXT NOT NULL,
  rater_id TEXT NOT NULL,
  rated_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  comment TEXT,
  created_at BIGINT NOT NULL,
  UNIQUE(trade_id, rater_id)
);

CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  sticker_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'trade',
  price_eur REAL,
  description TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_ratings (
  id TEXT PRIMARY KEY,
  trade_id TEXT NOT NULL,
  rater_id TEXT NOT NULL,
  rated_id TEXT NOT NULL,
  stars INTEGER NOT NULL,
  comment TEXT,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS trade_reviews (
  id TEXT PRIMARY KEY,
  trade_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  reviewed_id TEXT NOT NULL,
  stars INTEGER NOT NULL,
  comment TEXT,
  reply TEXT,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_stickers_user ON user_stickers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stickers_sticker ON user_stickers(sticker_id);
CREATE INDEX IF NOT EXISTS idx_trades_proposer ON trades(proposer_id);
CREATE INDEX IF NOT EXISTS idx_trades_receiver ON trades(receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_trade_messages_trade ON trade_messages(trade_id);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  amount_eur REAL NOT NULL,
  commission_eur REAL NOT NULL,
  stripe_session_id TEXT,
  tracking_info TEXT,
  status TEXT NOT NULL DEFAULT 'pending_payment',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);
`;

const MIGRATIONS_SQL = `
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
`;

export async function initDb(): Promise<void> {
  const pool = getDb();
  await pool.query(SCHEMA_SQL);
  await pool.query(MIGRATIONS_SQL);
  console.log('Database schema initialized');
}

export default getDb;
