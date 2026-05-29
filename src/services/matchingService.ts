import { query, queryOne } from '../db';

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

export async function findMatches(userId: string, limit = 20): Promise<MatchResult[]> {
  // Get current user's tradeable and needed stickers
  const myTrade = await query<{ sticker_id: string }>(
    "SELECT sticker_id FROM user_stickers WHERE user_id = $1 AND status = 'have_to_trade'",
    [userId]
  );

  const myNeed = await query<{ sticker_id: string }>(
    "SELECT sticker_id FROM user_stickers WHERE user_id = $1 AND status = 'need'",
    [userId]
  );

  if (myTrade.length === 0 || myNeed.length === 0) return [];

  const myTradeSet = new Set(myTrade.map(r => r.sticker_id));
  const myNeedSet = new Set(myNeed.map(r => r.sticker_id));

  // Get all other users with their trade/need stickers
  const others = await query<{ user_id: string }>(
    "SELECT DISTINCT user_id FROM user_stickers WHERE user_id != $1",
    [userId]
  );

  const results: MatchResult[] = [];

  for (const { user_id } of others) {
    const theirTrade = await query<{ sticker_id: string }>(
      "SELECT sticker_id FROM user_stickers WHERE user_id = $1 AND status = 'have_to_trade'",
      [user_id]
    );

    const theirNeed = await query<{ sticker_id: string }>(
      "SELECT sticker_id FROM user_stickers WHERE user_id = $1 AND status = 'need'",
      [user_id]
    );

    const theirTradeSet = new Set(theirTrade.map(r => r.sticker_id));
    const theirNeedSet = new Set(theirNeed.map(r => r.sticker_id));

    // What I can give them (my trade ∩ their need)
    const iGive = [...myTradeSet].filter(id => theirNeedSet.has(id));
    // What I can receive from them (their trade ∩ my need)
    const iReceive = [...theirTradeSet].filter(id => myNeedSet.has(id));

    if (iGive.length === 0 || iReceive.length === 0) continue;

    const score = Math.min(iGive.length, iReceive.length);

    const user = await queryOne<{ id: string; username: string; location?: string; rating_sum: number; rating_count: number }>(
      'SELECT id, username, location, rating_sum, rating_count FROM users WHERE id = $1',
      [user_id]
    );

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
