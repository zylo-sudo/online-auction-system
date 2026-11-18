import { Auction, Bid, TrendingAuction, UserRecommendation, FraudAlert, User, AuthResponse, UserRole, AppNotification, ChatMessage, ChatConversation } from '../types';

const API_BASE = '/api';

async function safeJsonParse(res: Response) {
  const text = await res.text();
  if (!text) {
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}. Please check that backend services are running.`);
    }
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text || `Server returned HTTP ${res.status}`);
  }
}

export const api = {
  // Authentication
  async register(req: {
    username: string;
    full_name: string;
    email: string;
    password: string;
    role?: UserRole;
  }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    const data = await safeJsonParse(res);
    if (!res.ok) throw new Error(data.detail || 'Registration failed');
    if (data.token) {
      localStorage.setItem('nova_token', data.token);
      localStorage.setItem('nova_user', JSON.stringify(data.user));
    }
    return data;
  },

  async login(usernameOrEmail: string, password: string, role?: UserRole): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username_or_email: usernameOrEmail, 
        password,
        role: role ? role.toUpperCase() : undefined 
      }),
    });
    const data = await safeJsonParse(res);
    if (!res.ok) throw new Error(data.detail || 'Login failed');
    if (data.token) {
      localStorage.setItem('nova_token', data.token);
      localStorage.setItem('nova_user', JSON.stringify(data.user));
    }
    return data;
  },

  async getMe(): Promise<User | null> {
    const token = localStorage.getItem('nova_token');
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return await safeJsonParse(res);
    } catch {
      return null;
    }
  },

  getSavedUser(): User | null {
    try {
      const u = localStorage.getItem('nova_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  logout() {
    localStorage.removeItem('nova_token');
    localStorage.removeItem('nova_user');
  },

  // Users Management
  async listUsers(): Promise<{ total: number; users: User[] }> {
    const res = await fetch(`${API_BASE}/auth/users`);
    if (!res.ok) throw new Error('Failed to fetch users');
    return await safeJsonParse(res);
  },

  async updateUserBalance(username: string, balance: number): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/users/${encodeURIComponent(username)}/balance`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ balance }),
    });
    const data = await safeJsonParse(res);
    if (!res.ok) throw new Error(data.detail || 'Failed to update balance');
    return data;
  },

  async updateUserRole(username: string, role: UserRole): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/users/${encodeURIComponent(username)}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    const data = await safeJsonParse(res);
    if (!res.ok) throw new Error(data.detail || 'Failed to update role');
    return data;
  },

  async deleteUser(username: string): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/users/${encodeURIComponent(username)}`, {
      method: 'DELETE',
    });
    const data = await safeJsonParse(res);
    if (!res.ok) throw new Error(data.detail || 'Failed to delete user');
    return data;
  },

  // Auctions
  async listAuctions(): Promise<Auction[]> {
    const res = await fetch(`${API_BASE}/auctions`);
    if (!res.ok) throw new Error('Failed to fetch auctions');
    const data = await safeJsonParse(res);
    return data.auctions || [];
  },

  async getAuction(id: string): Promise<Auction> {
    const res = await fetch(`${API_BASE}/auctions/${id}`);
    if (!res.ok) throw new Error('Auction not found');
    const data = await safeJsonParse(res);
    return data.auction || data;
  },

  async createAuction(auction: {
    title: string;
    description: string;
    category: string;
    image_url?: string;
    start_price: number;
    duration_seconds?: number;
    start_time?: number;
    end_time?: number;
  }): Promise<Auction> {
    const res = await fetch(`${API_BASE}/auctions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auction),
    });
    const data = await safeJsonParse(res);
    if (!res.ok) throw new Error(data.detail || 'Failed to create auction');
    return data.auction || data;
  },

  async placeBid(auctionId: string, bidder: string, amount: number): Promise<{ success: boolean; message: string; updated_auction?: Auction }> {
    const res = await fetch(`${API_BASE}/auctions/${auctionId}/bid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bidder, amount }),
    });
    const data = await safeJsonParse(res);
    if (!res.ok) throw new Error(data.detail || 'Failed to place bid');
    return data;
  },

  async getBidHistory(auctionId: string): Promise<Bid[]> {
    const res = await fetch(`${API_BASE}/auctions/${auctionId}/bids`);
    if (!res.ok) throw new Error('Failed to fetch bids');
    const data = await safeJsonParse(res);
    return data.bids || [];
  },

  async endAuction(auctionId: string, managerUsername: string): Promise<{ success: boolean; message: string; auction: Auction }> {
    const res = await fetch(`${API_BASE}/auctions/${auctionId}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manager_username: managerUsername }),
    });
    const data = await safeJsonParse(res);
    if (!res.ok) throw new Error(data.detail || 'Failed to end auction');
    return data;
  },

  async getMostBiddedAuction(): Promise<{ found: boolean; auction?: Auction }> {
    const res = await fetch(`${API_BASE}/auctions/special/most-bidded`);
    if (!res.ok) throw new Error('Failed to fetch most bidded auction');
    return await safeJsonParse(res);
  },

  async listBids(auctionId: string): Promise<Bid[]> {
    return this.getBidHistory(auctionId);
  },

  // Market Analytics
  async getTrending(): Promise<TrendingAuction[]> {
    try {
      const res = await fetch(`${API_BASE}/analytics/trending`);
      if (!res.ok) return [];
      const data = await safeJsonParse(res);
      return data.trending_auctions || [];
    } catch {
      return [];
    }
  },

  async getRecommendations(bidder: string): Promise<UserRecommendation | null> {
    try {
      const res = await fetch(`${API_BASE}/analytics/recommendations/${encodeURIComponent(bidder)}`);
      if (!res.ok) return null;
      return await safeJsonParse(res);
    } catch {
      return null;
    }
  },

  async getFraudAlerts(): Promise<FraudAlert[]> {
    try {
      const res = await fetch(`${API_BASE}/analytics/fraud-alerts`);
      if (!res.ok) return [];
      const data = await safeJsonParse(res);
      return data.alerts || [];
    } catch {
      return [];
    }
  },

  async triggerAnalytics(): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/analytics/trigger`, { method: 'POST' });
    return await safeJsonParse(res);
  },

  // Notifications API
  async getNotifications(username?: string, role?: string): Promise<AppNotification[]> {
    try {
      const params = new URLSearchParams();
      if (username) params.append('username', username);
      if (role) params.append('role', role);
      const res = await fetch(`${API_BASE}/notifications?${params.toString()}`);
      if (!res.ok) return [];
      const data = await safeJsonParse(res);
      return data.notifications || [];
    } catch {
      return [];
    }
  },

  async markNotificationRead(id: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' });
    } catch {}
  },

  async markAllNotificationsRead(): Promise<void> {
    try {
      await fetch(`${API_BASE}/notifications/mark-all-read`, { method: 'POST' });
    } catch {}
  },

  async approveAccountRequest(reqId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/notifications/account-request/${encodeURIComponent(reqId)}/approve`, {
      method: 'POST',
    });
    const data = await safeJsonParse(res);
    if (!res.ok) throw new Error(data.detail || 'Failed to approve account request');
    return data;
  },

  async declineAccountRequest(reqId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/notifications/account-request/${encodeURIComponent(reqId)}/decline`, {
      method: 'POST',
    });
    const data = await safeJsonParse(res);
    if (!res.ok) throw new Error(data.detail || 'Failed to decline account request');
    return data;
  },

  // Customer & Manager Chat Communication
  async getChatConversations(username?: string, role: string = 'CUSTOMER'): Promise<ChatConversation[]> {
    try {
      const params = new URLSearchParams();
      if (username) params.append('username', username);
      if (role) params.append('role', role);
      const res = await fetch(`${API_BASE}/chat/conversations?${params.toString()}`);
      if (!res.ok) return [];
      const data = await safeJsonParse(res);
      return data.conversations || [];
    } catch (err) {
      console.error('Failed to get chat conversations:', err);
      return [];
    }
  },

  async getChatMessages(customerUsername: string, username?: string, role: string = 'CUSTOMER'): Promise<ChatMessage[]> {
    try {
      const params = new URLSearchParams();
      params.append('customer_username', customerUsername);
      if (username) params.append('username', username);
      if (role) params.append('role', role);
      const res = await fetch(`${API_BASE}/chat/messages?${params.toString()}`);
      if (!res.ok) return [];
      const data = await safeJsonParse(res);
      return data.messages || [];
    } catch (err) {
      console.error('Failed to get chat messages:', err);
      return [];
    }
  },

  async sendChatMessage(payload: {
    sender_username: string;
    sender_role: string;
    sender_name?: string;
    content: string;
    customer_username?: string;
    recipient_username?: string;
  }): Promise<ChatMessage> {
    const res = await fetch(`${API_BASE}/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await safeJsonParse(res);
    if (!res.ok) throw new Error(data.detail || 'Failed to send chat message');
    return data.message;
  },

  async markChatRead(customerUsername: string, role: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/chat/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_username: customerUsername, role })
      });
    } catch (err) {
      console.error('Failed to mark chat read:', err);
    }
  },

  async getChatUnreadCount(username?: string, role: string = 'CUSTOMER'): Promise<number> {
    try {
      const params = new URLSearchParams();
      if (username) params.append('username', username);
      if (role) params.append('role', role);
      const res = await fetch(`${API_BASE}/chat/unread-count?${params.toString()}`);
      if (!res.ok) return 0;
      const data = await safeJsonParse(res);
      return data.unread_count || 0;
    } catch {
      return 0;
    }
  },

  async getHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`);
      return res.ok ? await safeJsonParse(res) : { status: 'offline' };
    } catch {
      return { status: 'offline' };
    }
  }
};
