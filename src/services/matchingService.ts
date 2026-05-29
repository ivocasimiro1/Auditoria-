import { getDb } from '../db';

export interface MatchResult {
  user: {
    id: string;
    username: string;
    location?: string;
    rating: number | null;
  };
  stickers_i_give: string[];
  stickers_i_receive: string[];
  match_score: number;
}

export function findMatches(userId: string, limit = 20): MatchResult[] {
  const db = getDb();

  // Get current user's tradeable and needed stickers
  const myTrade = db.prepare(
    "SELECT sticker_id FROM user_stickers WHERE user_id = ? AND status = 'have_to_trade'"
  ).all(userId) as { sticker_id: string }[];

  const myNeed = db.prepare(
    "SELECT sticker_id FROM user_stickers WHERE user_id = ? AND status = 'need'"
  ).all(userId) as { sticker_id: string }[];

  if (myTrade.length === 0 || myNeed.length === 0) return [];

  const myTradeSet = new Set(myTrade.map(r => r.sticker_id));
  const myNeedSet = new Set(myNeed.map(r => r.sticker_id));

  // Get all other users with their trade/need stickers
  const others = db.prepare(
    "SELECT DISTINCT user_id FROM user_stickers WHERE user_id != ?"
  ).all(userId) as { user_id: string }[];

  const results: MatchResult[] = [];

  for (const { user_id } of others) {
    const theirTrade = db.prepare(
      "SELECT sticker_id FROM user_stickers WHERE user_id = ? AND status = 'have_to_trade'"
    ).all(user_id) as { sticker_id: string }[];

    const theirNeed = db.prepare(
      "SELECT sticker_id FROM user_stickers WHERE user_id = ? AND status = 'need'"
    ).all(user_id) as { sticker_id: string }[];

    const theirTradeSet = new Set(theirTrade.map(r => r.sticker_id));
    const theirNeedSet = new Set(theirNeed.map(r => r.sticker_id));

    // What I can give them (my trade ∩ their need)
    const iGive = [...myTradeSet].filter(id => theirNeedSet.has(id));
    // What I can receive from them (their trade ∩ my need)
    const iReceive = [...theirTradeSet].filter(id => myNeedSet.has(id));

    if (iGive.length === 0 || iReceive.length === 0) continue;

    const score = Math.min(iGive.length, iReceive.length);

    const user = db.prepare(
      'SELECT id, username, location, rating_sum, rating_count FROM users WHERE id = ?'
    ).get(user_id) as { id: string; username: string; location?: string; rating_sum: number; rating_count: number } | undefined;

    if (!user) continue;

    results.push({
      user: {
        id: user.id,
        username: user.username,
        location: user.location,
        rating: user.rating_count > 0 ? user.rating_sum / user.rating_count : null,
      },
      stickers_i_give: iGive.slice(0, 10),
      stickers_i_receive: iReceive.slice(0, 10),
      match_score: score,
    });
  }

  return results
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, limit);
}
