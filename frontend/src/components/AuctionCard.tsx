import React, { useState, useEffect } from 'react';
import { Clock, Tag, Flame, User as UserIcon, ArrowUpRight, Zap, Shield, Calendar, Gavel } from 'lucide-react';
import { Auction, User } from '../types';
import { getItemImage } from '../services/imageHelper';
import { formatUnits, formatUnitsShort, formatUnitsConversions, getAdaptiveIncrements } from '../services/currencyHelper';

interface AuctionCardProps {
  auction: Auction;
  currentUser: User | null;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onPlaceQuickBid: (auctionId: string, amount: number) => Promise<void>;
  onOpenRoom: (auction: Auction) => void;
  isMostBidded?: boolean;
  onEndAuction?: (auction: Auction) => void;
}

export const AuctionCard: React.FC<AuctionCardProps> = ({
  auction,
  currentUser,
  onOpenAuth,
  onPlaceQuickBid,
  onOpenRoom,
  isMostBidded,
  onEndAuction,
}) => {
  const [countdownText, setCountdownText] = useState<string>('');
  const [isEnded, setIsEnded] = useState<boolean>(auction.status === 'ENDED');
  const [isUpcoming, setIsUpcoming] = useState<boolean>(auction.status === 'UPCOMING');
  const [biddingLoading, setBiddingLoading] = useState<boolean>(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();

      if (auction.status === 'UPCOMING' || auction.start_time > now) {
        setIsUpcoming(true);
        setIsEnded(false);
        const diff = auction.start_time - now;
        if (diff <= 0) {
          setIsUpcoming(false);
          setCountdownText('Starting now');
        } else {
          const totalSecs = Math.floor(diff / 1000);
          const days = Math.floor(totalSecs / 86400);
          const hours = Math.floor((totalSecs % 86400) / 3600);
          const mins = Math.floor((totalSecs % 3600) / 60);
          const secs = totalSecs % 60;
          if (days > 0) {
            setCountdownText(`Starts in ${days}d ${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`);
          } else {
            setCountdownText(`Starts in ${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`);
          }
        }
      } else {
        const diff = auction.end_time - now;
        if (diff <= 0 || auction.status === 'ENDED') {
          setCountdownText('ENDED');
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
            setCountdownText(`${days}d ${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`);
          } else {
            setCountdownText(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
          }
        }
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [auction.start_time, auction.end_time, auction.status]);

  const handleQuickBid = async (e: React.MouseEvent, increment: number) => {
    e.stopPropagation();
    if (!currentUser) {
      onOpenAuth('login');
      return;
    }
    if (isEnded || isUpcoming || biddingLoading) return;
    setBiddingLoading(true);
    try {
      const newAmount = Math.round((auction.current_price + increment) * 100) / 100;
      await onPlaceQuickBid(auction.id, newAmount);
    } catch (err: any) {
      alert(err.message || 'Bid failed');
    } finally {
      setBiddingLoading(false);
    }
  };

  const isLeading = currentUser && auction.highest_bidder === currentUser.username;
  const itemImage = getItemImage(auction);
  const increments = getAdaptiveIncrements(auction.current_price);

  return (
    <div
      onClick={() => onOpenRoom(auction)}
      className="group relative rounded-3xl glass-card glass-card-hover p-4 cursor-pointer flex flex-col justify-between overflow-hidden border border-slate-800 hover:border-indigo-500/50 transition-all duration-300"
    >
      {/* Top Background Glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />

      <div>
        {/* Product Image Header */}
        <div className="relative w-full h-48 rounded-2xl overflow-hidden bg-slate-900 mb-3.5 border border-slate-800/80">
          <img
            src={itemImage}
            alt={auction.title}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent pointer-events-none" />

          {/* Badges Overlay */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 pointer-events-none">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-slate-950/80 text-slate-200 backdrop-blur-md border border-slate-700/60 shadow-md truncate">
                {auction.category || 'General'}
              </span>
              {isMostBidded && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 flex items-center gap-1 shadow-lg shadow-amber-500/30 animate-pulse shrink-0">
                  <Flame className="w-3 h-3 fill-slate-950" />
                  Most Bidded
                </span>
              )}
            </div>

            {/* Countdown Badge */}
            <span
              className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full flex items-center gap-1 backdrop-blur-md shadow-md ${
                isEnded
                  ? 'bg-rose-950/80 text-rose-400 border border-rose-500/30'
                  : isUpcoming
                  ? 'bg-purple-950/85 text-purple-300 border border-purple-500/40'
                  : 'bg-slate-950/80 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {isUpcoming ? <Calendar className="w-3 h-3 text-purple-400" /> : <Clock className="w-3 h-3" />}
              {countdownText}
            </span>
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="font-bold text-base text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-1 mb-1">
          {auction.title}
        </h3>
        <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
          {auction.description || 'No item description provided.'}
        </p>
      </div>

      {/* Pricing & Bidder Info */}
      <div className="pt-3 border-t border-slate-800/80">
        <div className="flex items-end justify-between mb-3">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              {isUpcoming ? 'Starting Estimate' : 'Current Bid'}
            </span>
            <div className="text-xl font-extrabold text-white tracking-tight font-mono mt-0.5">
              {formatUnits(auction.current_price)}
            </div>
            <div className="text-[10px] text-slate-400 font-mono tracking-tight mt-0.5">
              {formatUnitsConversions(auction.current_price)}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-500 flex items-center justify-end gap-1">
              <Flame className="w-3 h-3 text-amber-400" />
              {isUpcoming ? 'Upcoming' : `${auction.total_bids} bids`}
            </span>
            {auction.highest_bidder ? (
              <div
                className={`text-xs font-medium flex items-center justify-end gap-1 mt-0.5 ${
                  isLeading ? 'text-emerald-400 font-bold' : 'text-slate-300'
                }`}
              >
                <UserIcon className="w-3 h-3" />
                {isLeading ? '★ Winning' : auction.highest_bidder}
              </div>
            ) : (
              <span className="text-xs text-slate-500 italic">
                {isUpcoming ? 'Opens soon' : 'No bids yet'}
              </span>
            )}
          </div>
        </div>

        {/* Quick Bid Actions / Upcoming Notice / Manager Notice */}
        {isEnded ? (
          <div className="w-full py-2 rounded-lg bg-slate-900/60 text-center text-xs font-medium text-slate-500 border border-slate-800">
            Auction Ended • {auction.highest_bidder ? `Won by ${auction.highest_bidder}` : 'Concluded'}
          </div>
        ) : isUpcoming ? (
          <div className="w-full py-2 px-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center text-xs font-semibold text-purple-300 flex items-center justify-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-purple-400" />
            <span>Upcoming Auction • Bidding Opens Soon</span>
          </div>
        ) : currentUser?.role === 'MANAGER' ? (
          <div className="flex items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onEndAuction) onEndAuction(auction);
              }}
              className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold shadow-md shadow-rose-500/20 flex items-center justify-center gap-1.5 transition-all transform active:scale-95 cursor-pointer"
              title="Officially conclude this auction immediately (Hammer Down)"
            >
              <Gavel className="w-3.5 h-3.5" />
              <span>Hammer Down</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenRoom(auction);
              }}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
            >
              Monitor
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {increments.map((inc, i) => (
              <button
                key={i}
                onClick={(e) => handleQuickBid(e, inc)}
                disabled={biddingLoading}
                className="py-1.5 px-2 text-xs font-semibold rounded-lg bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/20 transition-all flex items-center justify-center gap-0.5"
              >
                <Zap className="w-3 h-3 text-indigo-400" />
                +{formatUnitsShort(inc)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

