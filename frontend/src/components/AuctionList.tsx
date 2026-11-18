import React, { useState, useMemo } from 'react';
import { Search, Filter, Sparkles, RefreshCw, Flame, Gavel } from 'lucide-react';
import { Auction, User } from '../types';
import { AuctionCard } from './AuctionCard';
import { api } from '../services/api';
import { formatUnits } from '../services/currencyHelper';

interface AuctionListProps {
  auctions: Auction[];
  currentUser: User | null;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onPlaceQuickBid: (auctionId: string, amount: number) => Promise<void>;
  onOpenRoom: (auction: Auction) => void;
  onRefresh: () => void;
  onCreateSampleData: () => void;
}

const CATEGORIES = [
  'All',
  'Watches & Luxury',
  'Electronics',
  'Art & Collectibles',
  'Gaming & Tech',
  'Automotive'
];

export const AuctionList: React.FC<AuctionListProps> = ({
  auctions,
  currentUser,
  onOpenAuth,
  onPlaceQuickBid,
  onOpenRoom,
  onRefresh,
  onCreateSampleData,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'UPCOMING' | 'ENDED'>('ACTIVE');

  // Dynamically derive all available categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    auctions.forEach((a) => {
      if (a.category) set.add(a.category);
    });
    return ['All', ...Array.from(set)];
  }, [auctions]);

  const filteredAuctions = useMemo(() => {
    return auctions.filter((a) => {
      const matchesSearch =
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.description.toLowerCase().includes(search.toLowerCase()) ||
        a.category.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        selectedCategory === 'All' || a.category === selectedCategory;
      const matchesStatus =
        statusFilter === 'ALL' || a.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [auctions, search, selectedCategory, statusFilter]);

  const activeCount = auctions.filter((a) => a.status === 'ACTIVE').length;
  const upcomingCount = auctions.filter((a) => a.status === 'UPCOMING').length;
  const endedCount = auctions.filter((a) => a.status === 'ENDED').length;

  // Identify the most-bidded active auction
  const mostBiddedActiveAuction = useMemo(() => {
    const active = auctions.filter((a) => a.status === 'ACTIVE' && (a.total_bids || 0) > 0);
    if (active.length === 0) return null;
    return [...active].sort((a, b) => (b.total_bids || 0) - (a.total_bids || 0))[0];
  }, [auctions]);

  const handleManagerEndAuction = async (auctionToConclude: Auction) => {
    if (!currentUser || currentUser.role !== 'MANAGER') return;
    const confirmMsg = auctionToConclude.highest_bidder
      ? `Are you sure you want to officially conclude "${auctionToConclude.title}" right now?\n\nThe highest bidder @${auctionToConclude.highest_bidder} will be declared the official winner at ${formatUnits(auctionToConclude.current_price)}.`
      : `Are you sure you want to officially conclude "${auctionToConclude.title}" right now?\n\nNo bids have been placed; this lot will end with no winner.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await api.endAuction(auctionToConclude.id, currentUser.username);
      if (res.auction) {
        onRefresh();
        alert(`Auction Hammer Down Concluded!\n\nOfficial Winner: @${res.auction.highest_bidder || 'None'}\nWinning Bid: ${formatUnits(res.auction.current_price)}`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to end auction.');
    }
  };

  return (
    <div className="space-y-6">
      {/* MANAGER ACTION BAR: Highlight Most Bidded Lot */}
      {currentUser?.role === 'MANAGER' && mostBiddedActiveAuction && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-purple-500/15 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 uppercase tracking-wider border border-amber-500/30">
                  Most Bidded Active Lot ({mostBiddedActiveAuction.total_bids} bids)
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Leading: <strong className="text-white">@{mostBiddedActiveAuction.highest_bidder || 'None'}</strong>
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-100 mt-0.5">
                {mostBiddedActiveAuction.title} — <span className="text-amber-300 font-mono">{formatUnits(mostBiddedActiveAuction.current_price)}</span>
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => onOpenRoom(mostBiddedActiveAuction)}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              View Room
            </button>
            <button
              onClick={() => handleManagerEndAuction(mostBiddedActiveAuction)}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-rose-500/25 flex items-center justify-center gap-1.5 transition-all transform active:scale-95 cursor-pointer"
            >
              <Gavel className="w-4 h-4" />
              <span>Hammer Down (End Auction)</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Bar: Controls, Category Pills, Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search 36+ luxury items, watches, art, diamonds..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Status Filters & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFilter === 'ACTIVE'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('UPCOMING')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFilter === 'UPCOMING'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Upcoming ({upcomingCount})
            </button>
            <button
              onClick={() => setStatusFilter('ENDED')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFilter === 'ENDED'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ended ({endedCount})
            </button>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({auctions.length})
            </button>
          </div>

          <button
            onClick={onRefresh}
            title="Refresh list"
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Auction Cards Grid */}
      {filteredAuctions.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAuctions.map((auction) => (
            <AuctionCard
              key={auction.id}
              auction={auction}
              currentUser={currentUser}
              onOpenAuth={onOpenAuth}
              onPlaceQuickBid={onPlaceQuickBid}
              onOpenRoom={onOpenRoom}
              isMostBidded={auction.id === mostBiddedActiveAuction?.id}
              onEndAuction={handleManagerEndAuction}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl glass-card p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto">
          <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4 border border-indigo-500/20">
            <Sparkles className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-100 mb-2">No auctions found</h3>
          <p className="text-xs text-slate-400 mb-6 max-w-sm">
            There are currently no auctions matching your filter criteria. You can create a new auction or load sample demo auctions.
          </p>
          <button
            onClick={onCreateSampleData}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all"
          >
            Generate Demo Auctions
          </button>
        </div>
      )}
    </div>
  );
};
