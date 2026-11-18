import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { SystemHealthBadge } from './components/SystemHealthBadge';
import { AuctionList } from './components/AuctionList';
import { AuctionDetailModal } from './components/AuctionDetailModal';
import { CreateAuctionModal } from './components/CreateAuctionModal';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ArchitectureView } from './components/ArchitectureView';
import { UserManagement } from './components/UserManagement';
import { NotificationModal } from './components/NotificationModal';
import { AuthModal } from './components/AuthModal';
import { LoginPage } from './components/LoginPage';
import { ChatDrawer } from './components/ChatDrawer';
import { MessageSquare } from 'lucide-react';
import { Auction, WebSocketMessage, User, AppNotification } from './types';
import { api } from './services/api';
import { wsClient } from './services/websocket';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'auctions' | 'analytics' | 'architecture' | 'users'>('auctions');
  
  // Current user state starts as null so Log In page is always the first screen displayed
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);

  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState<boolean>(true);

  // Notifications State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [selectedChatCustomer, setSelectedChatCustomer] = useState<string | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  const isManager = currentUser?.role === 'MANAGER';

  const loadNotifications = useCallback(async () => {
    try {
      const notifs = await api.getNotifications(currentUser?.username, currentUser?.role || 'CUSTOMER');
      setNotifications(notifs);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, [currentUser]);

  const loadChatUnread = useCallback(async () => {
    if (!currentUser) {
      setUnreadChatCount(0);
      return;
    }
    try {
      const count = await api.getChatUnreadCount(currentUser.username, currentUser.role);
      setUnreadChatCount(count);
    } catch (err) {
      console.error('Failed to load chat unread count:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    loadNotifications();
    loadChatUnread();

    // Poll unread chat count periodically
    const interval = setInterval(loadChatUnread, 5000);
    return () => clearInterval(interval);
  }, [loadNotifications, loadChatUnread]);

  // Fetch all auctions
  const loadAuctions = useCallback(async () => {
    try {
      const data = await api.listAuctions();
      setAuctions(data);
    } catch (err) {
      console.error('Failed to load auctions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuctions();

    // Connect to global WebSocket feed
    wsClient.connect();

    const unsubscribe = wsClient.subscribe((msg: WebSocketMessage) => {
      if ((msg.type === 'NEW_BID' || msg.type === 'AUCTION_UPDATED' || msg.type === 'AUCTION_ENDED') && msg.updated_auction) {
        setAuctions((prev) =>
          prev.map((a) => (a.id === msg.updated_auction?.id ? msg.updated_auction : a))
        );
      } else if (msg.type === 'AUCTION_CREATED' && msg.auction) {
        setAuctions((prev) =>
          prev.some((a) => a.id === msg.auction!.id) ? prev : [msg.auction!, ...prev]
        );
      }
    });

    return () => {
      unsubscribe();
      wsClient.disconnect();
    };
  }, [loadAuctions]);

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setIsGuest(false);
    setActiveTab('auctions');
  };

  const handlePlaceQuickBid = async (auctionId: string, amount: number) => {
    if (!currentUser) {
      handleOpenAuth('login');
      return;
    }
    if (currentUser.role === 'MANAGER') {
      alert('Managers are not permitted to place bids on auctions.');
      return;
    }
    const currentBal = currentUser.balance || 0;
    if (amount > currentBal) {
      alert(
        `Insufficient wallet balance!\n\nYour available balance is ${currentBal.toLocaleString()} Units, but this bid requires ${amount.toLocaleString()} Units (short by ${(amount - currentBal).toLocaleString()} Units).\n\n(1 Unit = 10 USD and 1 Unit = 45000 MMK)\n\nPlease contact Manager Support via Chat to request a balance top-up.`
      );
      return;
    }
    try {
      const res = await api.placeBid(auctionId, currentUser.username, amount);
      if (res.updated_auction) {
        const updated = res.updated_auction;
        setAuctions((prev) =>
          prev.map((a) => (a.id === updated.id ? updated : a))
        );
      }
    } catch (err: any) {
      alert(err.message || 'Bid placement failed.');
    }
  };

  const handleAuctionUpdated = (updated: Auction) => {
    setAuctions((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    if (selectedAuction && selectedAuction.id === updated.id) {
      setSelectedAuction(updated);
    }
  };

  const handleOpenRoomById = async (auctionId: string) => {
    try {
      const auction = await api.getAuction(auctionId);
      if (auction) {
        setSelectedAuction(auction);
      }
    } catch (err) {
      console.error('Could not find auction:', err);
    }
  };

  const handleCreateSampleData = async () => {
    setLoading(true);
    const samples = [
      {
        title: 'Patek Philippe Grandmaster Chime 6300A',
        description: 'Ultra-rare stainless steel double-faced grand complication timepiece.',
        category: 'Experiences, Homeware & Luxury Fashion',
        image_url: '/items_photo/Experiences, Homeware & Luxury Fashion/Patek Philippe Grandmaster Chime 6300A-010.webp',
        start_price: 250000.0,
        duration_seconds: 259200,
      },
      {
        title: 'CTF Pink Star Diamond (59.60 Carat)',
        description: 'Flawless Fancy Vivid Pink oval mixed-cut diamond, museum-grade provenance.',
        category: 'Jewelry',
        image_url: '/items_photo/Jewelry/CTF Pink Star Diamond.webp',
        start_price: 500000.0,
        duration_seconds: 172800,
      },
      {
        title: "David Gilmour 'Black Strat' Guitar",
        description: 'Iconic 1969 Fender Stratocaster played on Pink Floyd classic studio albums.',
        category: 'Autographed Music Memorabilia',
        image_url: '/items_photo/Autographed Music Memorabilia/David Gilmours Black Strat.jpg',
        start_price: 150000.0,
        duration_seconds: 432000,
      },
      {
        title: '1952 Mickey Mantle Topps #311 Card',
        description: 'PSA graded iconic vintage baseball card in pristine archival slab.',
        category: 'Autographed Sports Memorabilia & Game Tickets',
        image_url: '/items_photo/Autographed Sports Memorabilia & Game Tickets/1952 Topps Mickey Mantle 311.jpg',
        start_price: 120000.0,
        duration_seconds: 86400,
      },
      {
        title: 'The Oppenheimer Blue Diamond Ring',
        description: '14.62-carat emerald-cut Fancy Vivid Blue diamond mounted in platinum.',
        category: 'Jewelry',
        image_url: '/items_photo/Jewelry/The Oppenheimer Blue.jpg',
        start_price: 350000.0,
        duration_seconds: 345600,
      }
    ];

    try {
      for (const item of samples) {
        const created = await api.createAuction(item);
        await api.placeBid(created.id, 'bob_trader', item.start_price + 5000);
        await api.placeBid(created.id, 'charlie_sniper', item.start_price + 12000);
      }
      await api.triggerAnalytics();
      await loadAuctions();
    } catch (err) {
      console.error('Error creating sample data:', err);
    } finally {
      setLoading(false);
    }
  };

  // If user is not logged in and didn't choose guest exploration, show full-screen Login Page first
  if (!currentUser && !isGuest) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          loadAuctions();
        }}
        onContinueAsGuest={() => {
          setIsGuest(true);
          loadAuctions();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#070a14] text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
        onOpenCreate={() => setIsCreateOpen(true)}
        unreadNotificationsCount={notifications.filter(n => !n.read).length}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        unreadChatCount={unreadChatCount}
        onOpenChat={() => {
          setSelectedChatCustomer(null);
          setIsChatOpen(true);
        }}
      />

      {/* Cluster Health Bar */}
      <SystemHealthBadge />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'auctions' && (
          <AuctionList
            auctions={auctions}
            currentUser={currentUser}
            onOpenAuth={handleOpenAuth}
            onPlaceQuickBid={handlePlaceQuickBid}
            onOpenRoom={(a) => setSelectedAuction(a)}
            onRefresh={loadAuctions}
            onCreateSampleData={handleCreateSampleData}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            currentUser={currentUser}
            onOpenRoomById={handleOpenRoomById}
          />
        )}

        {activeTab === 'users' && isManager && (
          <UserManagement 
            currentUser={currentUser}
            onDirectMessageCustomer={(username) => {
              setSelectedChatCustomer(username);
              setIsChatOpen(true);
            }}
          />
        )}

        {activeTab === 'architecture' && <ArchitectureView />}
      </main>

      {/* Customer & Manager Chat Drawer */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setSelectedChatCustomer(null);
          loadChatUnread();
        }}
        currentUser={currentUser}
        targetCustomerUsername={selectedChatCustomer}
        onOpenUserManagement={() => setActiveTab('users')}
      />

      {/* Floating Chat Concierge Button */}
      {currentUser && (
        <button
          onClick={() => {
            setSelectedChatCustomer(null);
            setIsChatOpen(true);
          }}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-2xl shadow-amber-500/30 hover:scale-105 transition-all cursor-pointer border border-amber-400/40"
          title={isManager ? "Open Customer Communications Hub" : "Chat with Platform Manager Support"}
        >
          <div className="relative">
            <MessageSquare className="w-4 h-4" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-2.5 -right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white shadow-md animate-bounce">
                {unreadChatCount}
              </span>
            )}
          </div>
          <span className="hidden sm:inline">
            {isManager ? 'Communications Hub' : 'Live Concierge'}
          </span>
        </button>
      )}

      {/* Notifications Modal */}
      <NotificationModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        currentUser={currentUser}
        onRefreshNotifications={loadNotifications}
        onOpenAuction={handleOpenRoomById}
      />

      {/* Live Bidding Room Modal */}
      {selectedAuction && (
        <AuctionDetailModal
          auction={selectedAuction}
          currentUser={currentUser}
          onOpenAuth={handleOpenAuth}
          onClose={() => setSelectedAuction(null)}
          onAuctionUpdated={handleAuctionUpdated}
          onOpenChat={() => {
            setSelectedChatCustomer(null);
            setIsChatOpen(true);
          }}
        />
      )}

      {/* Create Auction Modal */}
      {isCreateOpen && (
        <CreateAuctionModal
          currentUser={currentUser}
          onOpenAuth={handleOpenAuth}
          onClose={() => setIsCreateOpen(false)}
          onAuctionCreated={(newAuction) => {
            setAuctions((prev) => [newAuction, ...prev]);
            setSelectedAuction(newAuction);
          }}
        />
      )}

      {/* Login & Sign Up Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        initialMode={authMode}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          loadAuctions();
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        NovaAuction • Real-Time Distributed Live Bidding System
      </footer>
    </div>
  );
};

export default App;
