import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, User as UserIcon, Flame, ArrowUpRight, ShieldCheck, Radio, AlertCircle, Sparkles, LogIn, Shield, Calendar, Crown, Award, Star, Zap, MessageSquare, Gavel } from 'lucide-react';
import { Auction, Bid, WebSocketMessage, User } from '../types';
import { api } from '../services/api';
import { wsClient } from '../services/websocket';
import { getItemImage } from '../services/imageHelper';
import { formatUnits, formatUnitsShort, formatUnitsConversions, getAdaptiveIncrements, WALLET_RATE_LABEL } from '../services/currencyHelper';
import { getBidderTierInfo } from '../services/collectorHelper';

interface AuctionDetailModalProps {
  auction: Auction;
  currentUser: User | null;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onClose: () => void;
  onAuctionUpdated: (updatedAuction: Auction) => void;
  onOpenChat?: () => void;
}

export const AuctionDetailModal: React.FC<AuctionDetailModalProps> = ({
  auction: initialAuction,
  currentUser,
  onOpenAuth,
  onClose,
  onAuctionUpdated,
  onOpenChat,
}) => {
  const [auction, setAuction] = useState<Auction>(initialAuction);
  const [bids, setBids] = useState<Bid[]>([]);
  const [bidAmount, setBidAmount] = useState<number>(() => {
    const minInc = getAdaptiveIncrements(initialAuction.current_price)[0];
    return initialAuction.current_price + minInc;
  });
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isEnded, setIsEnded] = useState<boolean>(initialAuction.status === 'ENDED');
  const [isUpcoming, setIsUpcoming] = useState<boolean>(initialAuction.status === 'UPCOMING');
  const [loading, setLoading] = useState<boolean>(false);
  const [endingAuction, setEndingAuction] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [flashNewBid, setFlashNewBid] = useState<boolean>(false);
  const bidListEndRef = useRef<HTMLDivElement>(null);

  const minIncrement = getAdaptiveIncrements(auction.current_price)[0];

  // 1. Fetch initial bids history
  useEffect(() => {
    const loadBids = async () => {
      try {
        const fetchedBids = await api.listBids(auction.id);
        setBids(fetchedBids);
      } catch (err) {
        console.error('Failed to load bids:', err);
      }
    };
    loadBids();
  }, [auction.id]);

  // 2. Connect to WebSocket room for this auction
  useEffect(() => {
    wsClient.connect(auction.id);

    const unsubscribe = wsClient.subscribe((msg: WebSocketMessage) => {
      if (msg.type === 'NEW_BID' && msg.auction_id === auction.id) {
        setFlashNewBid(true);
        setTimeout(() => setFlashNewBid(false), 1200);

        if (msg.updated_auction) {
          setAuction(msg.updated_auction);
          onAuctionUpdated(msg.updated_auction);
          const inc = getAdaptiveIncrements(msg.updated_auction.current_price)[0];
          setBidAmount(msg.updated_auction.current_price + inc);
        }

        setBids((prev) => [
          {
            id: `live-${Date.now()}`,
            auction_id: auction.id,
            bidder: msg.bidder || 'Anonymous',
            amount: msg.amount || 0,
            timestamp: msg.timestamp || Date.now(),
            shard_id: auction.shard_id
          },
          ...prev,
        ]);
      } else if ((msg.type === 'AUCTION_ENDED' || msg.type === 'AUCTION_UPDATED') && msg.auction_id === auction.id) {
        if (msg.updated_auction) {
          setAuction(msg.updated_auction);
          setIsEnded(msg.updated_auction.status === 'ENDED');
          onAuctionUpdated(msg.updated_auction);
        }
      }
    });

    return () => {
      unsubscribe();
      // Restore global live feed connection when exiting the room modal
      wsClient.connect();
    };
  }, [auction.id]);

  // 3. Countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();

      if (auction.status === 'UPCOMING' || auction.start_time > now) {
        setIsUpcoming(true);
        setIsEnded(false);
        const diff = auction.start_time - now;
        if (diff <= 0) {
          setIsUpcoming(false);
          setTimeLeft('Starting now');
        } else {
          const totalSecs = Math.floor(diff / 1000);
          const days = Math.floor(totalSecs / 86400);
          const hours = Math.floor((totalSecs % 86400) / 3600);
          const mins = Math.floor((totalSecs % 3600) / 60);
          const secs = totalSecs % 60;
          if (days > 0) {
            setTimeLeft(`Starts in ${days}d ${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`);
          } else {
            setTimeLeft(`Starts in ${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`);
          }
        }
      } else {
        const diff = auction.end_time - now;
        if (diff <= 0 || auction.status === 'ENDED') {
          setTimeLeft('AUCTION ENDED');
          setIsEnded(true);
          setIsUpcoming(false);
        } else {
          setIsEnded(false);
          setIsUpcoming(false);
          const totalSecs = Math.floor(diff / 1000);
          const days = Math.floor(totalSecs / 86400);
          const hours = Math.floor((totalSecs % 86400) / 3600);
          const mins = Math.floor((totalSecs % 3600) / 60);
          const secs = totalSecs % 60;
          if (days > 0) {
            setTimeLeft(`${days}d ${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`);
          } else {
            setTimeLeft(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
          }
        }
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [auction.start_time, auction.end_time, auction.status]);

  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth('login');
      return;
    }
    if (isEnded || loading) return;
    setErrorMessage('');

    if (bidAmount <= auction.current_price) {
      setErrorMessage(`Bid must be higher than current price (${formatUnits(auction.current_price)})`);
      return;
    }

    const availableBalance = currentUser.balance || 0;
    if (!isManager && bidAmount > availableBalance) {
      const deficit = bidAmount - availableBalance;
      setErrorMessage(
        `Insufficient wallet balance! Your available balance is ${formatUnits(availableBalance)}, but this bid requires ${formatUnits(bidAmount)} (short by ${formatUnits(deficit)}). (1 Unit = 10 USD and 1 Unit = 45000 MMK). Please message Manager Support via Chat to request an account balance top-up.`
      );
      return;
    }

    setLoading(true);
    try {
      const res = await api.placeBid(auction.id, currentUser.username, bidAmount);
      if (res.updated_auction) {
        setAuction(res.updated_auction);
        onAuctionUpdated(res.updated_auction);
        setBidAmount(Math.round((res.updated_auction.current_price + 10) * 100) / 100);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Bid placement failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleEndAuction = async () => {
    if (!currentUser || currentUser.role !== 'MANAGER' || endingAuction) return;
    
    const confirmMsg = auction.highest_bidder
      ? `Are you sure you want to officially conclude this auction right now?\n\nThe highest bidder @${auction.highest_bidder} will be declared the official winner at ${formatUnits(auction.current_price)}.`
      : `Are you sure you want to officially conclude this auction right now?\n\nNo bids have been placed yet; this lot will end with no winner.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setEndingAuction(true);
      const res = await api.endAuction(auction.id, currentUser.username);
      if (res.auction) {
        setAuction(res.auction);
        setIsEnded(true);
        onAuctionUpdated(res.auction);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to conclude auction.');
    } finally {
      setEndingAuction(false);
    }
  };

  const isLeading = currentUser && auction.highest_bidder === currentUser.username;
  const isManager = currentUser?.role === 'MANAGER';
  const availableBalance = currentUser?.balance || 0;
  const isInsufficient = !isManager && !!currentUser && bidAmount > availableBalance;
  const balanceDeficit = isInsufficient ? bidAmount - availableBalance : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] glass-card rounded-3xl overflow-hidden border border-slate-700/80 shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Radio className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{auction.title}</h2>
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Live Bidding
                </span>
              </div>
              <p className="text-xs text-slate-400">Live Auction Room • Connected via WebSockets</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-y-auto">
          
          {/* Left Column: Details & Bidding Form (7 cols) */}
          <div className="md:col-span-7 p-6 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Category & Status */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-800 text-indigo-300 border border-indigo-500/20">
                  {auction.category}
                </span>
                <span
                  className={`text-xs font-mono font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                    isEnded
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : timeLeft.startsWith('00:')
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  {timeLeft}
                </span>
              </div>

              {/* Product Photo Showcase */}
              <div className="relative w-full h-56 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl">
                <img
                  src={getItemImage(auction)}
                  alt={auction.title}
                  className="w-full h-full object-cover object-center"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs">
                  <span className="px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md text-indigo-300 font-semibold border border-indigo-500/20 shadow-md">
                    {auction.category}
                  </span>
                  <span className="text-[11px] text-slate-300 font-mono bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-700/60 shadow-md">
                    {auction.total_bids} bids placed
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
                  Item Details
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
                  {auction.description || 'Exclusive item on the live auction exchange.'}
                </p>
              </div>

              {/* Current Price Banner */}
              <div
                className={`p-5 rounded-2xl border transition-all duration-300 ${
                  flashNewBid
                    ? 'bg-indigo-500/20 border-indigo-500 shadow-lg shadow-indigo-500/30 scale-[1.02]'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      {isUpcoming ? 'Estimated Starting Price' : 'Current Highest Bid'}
                    </span>
                    <div className="text-3xl font-extrabold text-white font-mono mt-0.5">
                      {formatUnits(auction.current_price)}
                    </div>
                    <div className="text-xs text-slate-400 font-mono tracking-tight mt-0.5">
                      {formatUnitsConversions(auction.current_price)}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block mb-1">
                      {isUpcoming ? 'Auction Status' : 'Winning Bidder'}
                    </span>
                    {isUpcoming ? (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Upcoming Auction
                      </span>
                    ) : auction.highest_bidder ? (
                      (() => {
                        const winnerTier = getBidderTierInfo(auction.highest_bidder);
                        return (
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={`text-sm font-semibold px-2.5 py-1 rounded-lg ${
                                isLeading
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-200'
                              }`}
                            >
                              {isLeading ? '★ You are winning!' : `@${auction.highest_bidder}`}
                            </span>
                            <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${winnerTier.badgeClass}`}>
                              {winnerTier.shortTitle} • {winnerTier.minWinRate > 0 ? `${winnerTier.minWinRate}%+ Win` : 'Collector'}
                            </span>
                          </div>
                        );
                      })()
                    ) : (
                      <span className="text-xs text-slate-500 italic">No bids placed</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bidding Form / Auth Prompt / Upcoming Notice / Manager Notice */}
            {isEnded ? (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center text-sm text-slate-400">
                This auction has concluded. {auction.highest_bidder ? `Sold to ${auction.highest_bidder} for ${formatUnits(auction.current_price)}.` : 'No bids were placed.'}
              </div>
            ) : isUpcoming ? (
              <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs space-y-2 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-2 font-bold text-sm text-purple-200">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span>Upcoming Auction Waiting Room</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  This exclusive item is scheduled to open for live bidding on <strong className="text-purple-300">{new Date(auction.start_time).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>.
                </p>
                <div className="flex items-center gap-3 pt-2 text-[11px] text-slate-400">
                  <span>Starting Estimate: <strong className="text-white font-mono">{formatUnits(auction.start_price)}</strong></span>
                  <span>•</span>
                  <span>Countdown: <strong className="text-purple-300 font-mono">{timeLeft}</strong></span>
                </div>
              </div>
            ) : currentUser ? (
              isManager ? (
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs space-y-3 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-purple-200">
                      <Shield className="w-4 h-4 text-purple-400" />
                      <span>Manager Executive Oversight</span>
                    </div>
                    {auction.status !== 'ENDED' && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-[10px] uppercase tracking-wider animate-pulse">
                        Active Bidding
                      </span>
                    )}
                  </div>

                  <p className="text-slate-300 text-xs leading-relaxed">
                    As a Platform Manager, you have administrative oversight. Bidding is restricted to Customers, but you can officially conclude (hammer down) this auction immediately.
                  </p>

                  {auction.status !== 'ENDED' ? (
                    <div className="pt-2 border-t border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl">
                      <div>
                        <div className="text-[11px] text-slate-400">Current Highest Bidder:</div>
                        <div className="font-bold text-sm text-white">
                          {auction.highest_bidder ? (
                            <span className="text-amber-300 font-mono">@{auction.highest_bidder}</span>
                          ) : (
                            <span className="italic text-slate-500">No bids yet</span>
                          )}
                          <span className="text-xs text-slate-400 font-normal ml-1">
                            ({formatUnits(auction.current_price)})
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleEndAuction}
                        disabled={endingAuction}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-95 cursor-pointer disabled:opacity-50"
                        title="End this auction and declare highest bidder the winner"
                      >
                        <Gavel className="w-4 h-4" />
                        <span>{endingAuction ? 'Concluding...' : 'Hammer Down / End Auction'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-slate-300">
                      <span className="font-bold text-amber-400">Auction Concluded: </span>
                      {auction.highest_bidder ? (
                        <span>Official winner declared as <strong className="text-white">@{auction.highest_bidder}</strong> at <strong className="text-amber-300 font-mono">{formatUnits(auction.current_price)}</strong></span>
                      ) : (
                        <span className="italic text-slate-400">Concluded with no winning bids.</span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handlePlaceBid} className="space-y-3 pt-4 border-t border-slate-800">
                  {/* User Wallet Balance with Rate Disclaimer */}
                  <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400">Available Wallet Balance: </span>
                      <strong className="text-emerald-400 font-mono font-bold text-sm">{formatUnits(currentUser.balance)}</strong>
                      <div className="text-[10px] text-indigo-300 font-mono font-semibold">
                        {WALLET_RATE_LABEL}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">Min Next Bid:</span>
                      <span className="text-xs font-mono font-bold text-white">{formatUnits(auction.current_price + minIncrement)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span>Bidding as</span>
                      <strong className="text-indigo-300">@{currentUser.username}</strong>
                      <span className="text-[9px] px-1.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-300">
                        {currentUser.role}
                      </span>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Insufficient Funds Warning Banner */}
                  {isInsufficient && (
                    <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between gap-3 shadow-inner">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                        <div className="min-w-0">
                          <span className="font-bold text-amber-300">Insufficient Wallet Balance: </span>
                          <span>Short by <strong className="text-white font-mono">{formatUnits(balanceDeficit)}</strong></span>
                        </div>
                      </div>

                      {onOpenChat && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenChat();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 shrink-0 transition-all cursor-pointer shadow-md shadow-amber-500/20"
                          title="Open chat to message Manager Support"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Request Top-Up</span>
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-400 font-mono text-xs font-bold">Units</span>
                      <input
                        type="number"
                        step={minIncrement}
                        min={auction.current_price + minIncrement}
                        value={bidAmount}
                        onChange={(e) => setBidAmount(parseFloat(e.target.value) || 0)}
                        className={`w-full pl-16 pr-4 py-3 rounded-xl bg-slate-900 border font-mono text-lg font-bold focus:outline-none transition-colors ${
                          isInsufficient 
                            ? 'border-amber-500/60 text-amber-200 focus:border-amber-500' 
                            : 'border-slate-700 text-white focus:border-indigo-500'
                        }`}
                        placeholder="Enter bid in Units"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || isInsufficient}
                      className={`px-6 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 ${
                        isInsufficient
                          ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                          : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white shadow-indigo-500/30 transform active:scale-95 cursor-pointer disabled:opacity-50'
                      }`}
                    >
                      <ArrowUpRight className="w-5 h-5" />
                      <span>{loading ? 'Submitting...' : isInsufficient ? 'Insufficient Funds' : 'Place Bid'}</span>
                    </button>
                  </div>

                  {/* Quick Add Presets in Units */}
                  <div className="flex gap-2">
                    {[minIncrement, minIncrement * 2, minIncrement * 5, minIncrement * 10].map((inc) => (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => setBidAmount(Math.round((auction.current_price + inc) * 100) / 100)}
                        className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
                      >
                        +{formatUnitsShort(inc)}
                      </button>
                    ))}
                  </div>
                </form>
              )
            ) : (
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <h5 className="text-sm font-bold text-white">Join the Live Auction</h5>
                  <p className="text-xs text-slate-400">Sign in to your Customer account to place bids.</p>
                </div>
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Live Bid Activity Stream (5 cols) */}
          <div className="md:col-span-5 p-6 bg-slate-950/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400" />
                  Live Bid Stream ({bids.length})
                </h4>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Realtime WS
                </span>
              </div>

              {/* Bids List */}
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {bids.length > 0 ? (
                  bids.map((b, i) => {
                    const bTier = getBidderTierInfo(b.bidder);
                    return (
                      <div
                        key={b.id || i}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                          i === 0
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-white font-medium'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-[11px] border shrink-0 ${bTier.badgeClass}`}>
                            {b.bidder.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                              <span>@{b.bidder}</span>
                              <span className={`text-[9px] font-bold font-mono px-1.5 py-0.2 rounded-md border ${bTier.badgeClass}`}>
                                {bTier.shortTitle}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                              <span>{new Date(b.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                              <span>•</span>
                              <span className="text-slate-400 font-mono">{bTier.winRate}% win rate</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-mono font-bold text-white text-sm">
                            {formatUnits(b.amount)}
                          </div>
                          {i === 0 && (
                            <span className="text-[9px] text-emerald-400 font-semibold uppercase tracking-wider">
                              Latest Bid
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-xs text-slate-500">
                    {isUpcoming ? 'Auction waiting room. Bidding starts on scheduled date.' : 'No bids recorded yet. Be the first to bid!'}
                  </div>
                )}
                <div ref={bidListEndRef} />
              </div>
            </div>

            {/* Guarantee Note */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span>Secure encrypted real-time auction transaction.</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
