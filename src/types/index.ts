export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  location?: string;
  avatar_url?: string;
  rating_sum: number;
  rating_count: number;
  created_at: number;
  is_admin?: boolean;
}

export interface Sticker {
  id: string;
  number: number;
  team_code: string;
  team_name: string;
  group_name: string;
  player_name?: string;
  card_type: 'player' | 'badge' | 'logo' | 'special' | 'stadium';
  rarity: 'common' | 'foil' | 'holographic';
  image_url?: string;
}

export interface UserSticker {
  user_id: string;
  sticker_id: string;
  status: 'have_to_trade' | 'need' | 'have_double';
  updated_at: number;
}

export interface Trade {
  id: string;
  proposer_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'in_transit' | 'completed' | 'cancelled';
  proposer_stickers: string;
  receiver_stickers: string;
  message?: string;
  created_at: number;
  updated_at: number;
}

export interface TradeMessage {
  id: string;
  trade_id: string;
  sender_id: string;
  body: string;
  created_at: number;
}

export interface Shipment {
  id: string;
  trade_id: string;
  carrier: 'CTT' | 'DHL' | 'MRW';
  cost_eur: number;
  tracking_number: string;
  label_data?: string;
  status: 'label_created' | 'picked_up' | 'in_transit' | 'delivered';
  created_at: number;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'trade_proposal' | 'trade_accepted' | 'message' | 'trade_completed' | 'rating' | 'match_found';
  payload: string;
  read: number;
  created_at: number;
}

export interface Rating {
  id: string;
  trade_id: string;
  rater_id: string;
  rated_id: string;
  score: number;
  comment?: string;
  created_at: number;
}

export interface TradeReview {
  id: string;
  trade_id: string;
  reviewer_id: string;
  reviewed_id: string;
  stars: number;
  comment?: string;
  reply?: string;
  created_at: number;
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}
