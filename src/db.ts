import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'panini.db');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  location TEXT,
  avatar_url TEXT,
  rating_sum INTEGER DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
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
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, sticker_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (sticker_id) REFERENCES stickers(id)
);
CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY,
  proposer_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  proposer_stickers TEXT NOT NULL,
  receiver_stickers TEXT NOT NULL,
  message TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (proposer_id) REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS trade_messages (
  id TEXT PRIMARY KEY,
  trade_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (trade_id) REFERENCES trades(id)
);
CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY,
  trade_id TEXT UNIQUE NOT NULL,
  carrier TEXT NOT NULL,
  cost_eur REAL NOT NULL,
  tracking_number TEXT NOT NULL,
  label_data TEXT,
  status TEXT NOT NULL DEFAULT 'label_created',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (trade_id) REFERENCES trades(id)
);
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  read INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS ratings (
  id TEXT PRIMARY KEY,
  trade_id TEXT NOT NULL,
  rater_id TEXT NOT NULL,
  rated_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  comment TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(trade_id, rater_id),
  FOREIGN KEY (trade_id) REFERENCES trades(id)
);
CREATE INDEX IF NOT EXISTS idx_user_stickers_user ON user_stickers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stickers_sticker ON user_stickers(sticker_id);
CREATE INDEX IF NOT EXISTS idx_trades_proposer ON trades(proposer_id);
CREATE INDEX IF NOT EXISTS idx_trades_receiver ON trades(receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_trade_messages_trade ON trade_messages(trade_id);
`;

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    _db.exec(SCHEMA);
  }
  return _db;
}

export default getDb;
