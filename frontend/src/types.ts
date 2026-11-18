export type UserRole = 'CUSTOMER' | 'MANAGER';

export interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: UserRole;
  balance: number;
  created_at: number;
  status?: 'ACTIVE' | 'PENDING_APPROVAL' | 'DECLINED';
  approved?: boolean;
  win_rate?: number;
  auctions_won?: number;
  auctions_participated?: number;
  total_bids_placed?: number;
  collector_tier?: 'LEGEND' | 'MASTER' | 'ELITE' | 'ACTIVE' | 'STAFF';
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user: User;
  token?: string;
  pending_approval?: boolean;
}

export interface Auction {
  id: string;
  title: string;
  description: string;
  category: string;
  image_url?: string;
  start_price: number;
  current_price: number;
  highest_bidder: string;
  start_time: number;
  end_time: number;
  status: 'ACTIVE' | 'ENDED' | 'UPCOMING' | 'CANCELLED';
  shard_id: number;
  total_bids: number;
}

export interface Bid {
  id: string;
  auction_id: string;
  bidder: string;
  amount: number;
  timestamp: number;
  shard_id: number;
}

export interface TrendingAuction {
  auction_id: string;
  title: string;
  category: string;
  current_price: number;
  total_bids: number;
  unique_bidders: number;
  recent_bids_1h: number;
  price_growth_pct: number;
  trending_score: number;
  status: string;
}

export interface UserRecommendation {
  bidder: string;
  preferred_categories: string[];
  total_bids_placed: number;
  recommendations: Array<{
    auction_id: string;
    title: string;
    category: string;
    current_price: number;
    match_score: number;
  }>;
}

export interface FraudAlert {
  alert_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  auction_id: string;
  bidder: string;
  details: string;
  timestamp: number;
}

export interface WebSocketMessage {
  type: 'NEW_BID' | 'AUCTION_CREATED' | 'AUCTION_UPDATED' | 'AUCTION_ENDED' | 'PONG';
  auction_id?: string;
  bidder?: string;
  amount?: number;
  timestamp?: number;
  current_price?: number;
  updated_auction?: Auction;
  auction?: Auction;
}

export interface AppNotification {
  id: string;
  type: 'AUCTION_WON' | 'LEVEL_ACHIEVED' | 'ACCOUNT_APPROVAL_REQUEST' | 'BID_OUTBID';
  recipientRole?: 'MANAGER' | 'CUSTOMER' | 'ALL';
  recipientUsername?: string;
  title: string;
  message: string;
  details?: {
    auction_id?: string;
    auction_title?: string;
    winner?: string;
    amount?: number;
    tier?: string;
    win_rate?: number;
    auctions_won?: number;
    total_bids?: number;
    requester_username?: string;
    requester_name?: string;
    requester_email?: string;
    requester_role?: string;
  };
  timestamp: number;
  read: boolean;
  actionStatus?: 'PENDING' | 'APPROVED' | 'DECLINED';
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  customer_username: string;
  sender_username: string;
  sender_name: string;
  sender_role: UserRole;
  recipient_username: string;
  content: string;
  timestamp: number;
  read: boolean;
}

export interface ChatConversation {
  conversation_id: string;
  customer_username: string;
  customer_name: string;
  customer_email?: string;
  customer_tier?: string;
  customer_win_rate?: number;
  last_message?: string | null;
  last_message_time?: number;
  unread_count: number;
}

