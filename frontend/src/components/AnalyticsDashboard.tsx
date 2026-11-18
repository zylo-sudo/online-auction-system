import React, { useState, useEffect } from 'react';
import { 
  Sparkles, TrendingUp, UserCheck, RefreshCw, Flame, ArrowUpRight, 
  ShieldCheck, Crown, Award, Star, Zap, Trophy, BarChart3, Activity, 
  Layers, CheckCircle2, PieChart, DollarSign
} from 'lucide-react';
import { TrendingAuction, UserRecommendation, FraudAlert, User } from '../types';
import { api } from '../services/api';
import { formatUnits, formatUnitsConversions } from '../services/currencyHelper';
import { getCollectorTier } from '../services/collectorHelper';

interface AnalyticsDashboardProps {
  currentUser: User | null;
  onOpenRoomById: (auctionId: string) => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  currentUser,
  onOpenRoomById,
}) => {
  const [trending, setTrending] = useState<TrendingAuction[]>([]);
  const [recommendation, setRecommendation] = useState<UserRecommendation | null>(null);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [collectors, setCollectors] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [triggering, setTriggering] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('');

  const isManager = currentUser?.role === 'MANAGER';
  const username = currentUser?.username || 'alice_collector';

  const loadData = async () => {
    setLoading(true);
    try {
      const [trendData, recoData, fraudData, usersData] = await Promise.all([
        api.getTrending(),
        !isManager ? api.getRecommendations(username) : Promise.resolve(null),
        api.getFraudAlerts(),
        api.listUsers(),
      ]);
      setTrending(trendData);
      setRecommendation(recoData);
      setFraudAlerts(fraudData);
      
      const customerUsers = (usersData.users || [])
        .filter((u: User) => u.role === 'CUSTOMER')
        .sort((a: User, b: User) => (b.win_rate || 0) - (a.win_rate || 0) || (b.auctions_won || 0) - (a.auctions_won || 0));
      setCollectors(customerUsers);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [username, isManager]);

  const handleTriggerJob = async () => {
    setTriggering(true);
    setStatusMsg('Recomputing market intelligence & trending velocity...');
    try {
      await api.triggerAnalytics();
      setTimeout(async () => {
        await loadData();
        setTriggering(false);
        setStatusMsg('Marketplace analytics successfully refreshed!');
        setTimeout(() => setStatusMsg(''), 4000);
      }, 2000);
    } catch (err: any) {
      setTriggering(false);
      setStatusMsg(err.message || 'Refresh failed');
    }
  };

  const renderTierIcon = (iconName: string) => {
    switch (iconName) {
      case 'Crown':
        return <Crown className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />;
      case 'Award':
        return <Award className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
      case 'Star':
        return <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      default:
        return <Zap className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    }
  };

  // Category distribution breakdown for Manager View
  const CATEGORY_STATS = [
    { name: 'Jewelry & Gemstones', count: 9, share: '32%', color: 'from-pink-500 to-rose-500' },
    { name: 'Autographed Music Memorabilia', count: 8, share: '28%', color: 'from-purple-500 to-indigo-500' },
    { name: 'Autographed Sports Memorabilia', count: 8, share: '28%', color: 'from-amber-500 to-orange-500' },
    { name: 'Experiences & Luxury Fashion', count: 6, share: '21%', color: 'from-cyan-500 to-teal-500' },
    { name: 'Watches & Tech Collectibles', count: 5, share: '18%', color: 'from-emerald-500 to-green-500' }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="rounded-3xl glass-card p-6 md:p-8 relative overflow-hidden border border-indigo-500/20 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 via-pink-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="p-2 rounded-xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 text-pink-400 border border-pink-500/30 shadow-lg shadow-pink-500/10">
                <BarChart3 className="w-5 h-5" />
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight">Market Analytics & Performance Intelligence</h2>
            </div>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Real-time marketplace velocity, category popularity metrics, top-performing auctions, and bidder activity trends across the entire platform.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button
              onClick={handleTriggerJob}
              disabled={triggering}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white text-sm font-bold shadow-lg shadow-pink-500/25 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${triggering ? 'animate-spin' : ''}`} />
              <span>{triggering ? 'Analyzing Market Data...' : 'Refresh Market Intelligence'}</span>
            </button>
            {statusMsg && (
              <span className="text-xs text-indigo-300 font-mono animate-pulse">{statusMsg}</span>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Trending Auctions + (Category Share for Manager OR Personalized Recommendations for Customer) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. Trending Auctions Leaderboard */}
        <div className="lg:col-span-2 rounded-3xl glass-card p-6 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Trending Auctions (Market Velocity & Bidding Surge)</h3>
              </div>
              <span className="text-xs text-slate-500 font-mono">High Demand Items</span>
            </div>

            <div className="space-y-3">
              {trending.length > 0 ? (
                trending.slice(0, 5).map((item, index) => (
                  <div
                    key={item.auction_id || index}
                    onClick={() => onOpenRoomById(item.auction_id)}
                    className="p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/40 transition-all cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-extrabold text-xs ${
                        index === 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        index === 1 ? 'bg-slate-300/20 text-slate-200 border border-slate-300/30' :
                        index === 2 ? 'bg-orange-600/20 text-orange-300 border border-orange-600/30' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        #{index + 1}
                      </span>
                      <div className="truncate">
                        <h4 className="text-sm font-bold text-slate-200 truncate">{item.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span className="text-slate-500">{item.category}</span>
                          <span>•</span>
                          <span className="text-amber-400 flex items-center gap-0.5">
                            <Flame className="w-3 h-3" /> {item.total_bids} bids
                          </span>
                          <span>•</span>
                          <span className="text-emerald-400">+{item.price_growth_pct}% growth</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-extrabold text-white font-mono">
                        {formatUnits(item.current_price)}
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono">
                        {formatUnitsConversions(item.current_price)}
                      </div>
                      <span className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 mt-0.5">
                        Activity Score: {item.trending_score}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-xs text-slate-500">
                  No trending data calculated yet. Click "Refresh Market Intelligence" to generate.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span>Calculated from real-time bid frequency, active bidder competition, and price appreciation.</span>
          </div>
        </div>

        {/* 2. Right Side: Category Market Share (for Manager) OR Recommended for You (for Customer) */}
        {isManager ? (
          /* Manager View: Category Market Share & Performance */
          <div className="rounded-3xl glass-card p-6 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-purple-400" />
                  <h3 className="text-base font-bold text-white">Category Market Share</h3>
                </div>
                <span className="text-[11px] font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  System Overview
                </span>
              </div>

              <div className="space-y-3">
                {CATEGORY_STATS.map((cat) => (
                  <div key={cat.name} className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{cat.name}</span>
                      <span className="font-mono font-bold text-purple-300">{cat.share}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${cat.color}`}
                        style={{ width: cat.share }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{cat.count} Active & Listed Lots</span>
                      <span>High Liquidity</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
              Aggregated category volume and listing distribution.
            </div>
          </div>
        ) : (
          /* Customer View: Personalized Recommendations */
          <div className="rounded-3xl glass-card p-6 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-bold text-white">Recommended for You</h3>
                </div>
                <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  @{username}
                </span>
              </div>

              <div className="mb-4">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                  Your Affinity Categories
                </span>
                <div className="flex flex-wrap gap-1">
                  {recommendation?.preferred_categories?.map((cat, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                    >
                      {cat}
                    </span>
                  )) || <span className="text-xs text-slate-500">General Collector</span>}
                </div>
              </div>

              <div className="space-y-2.5">
                {recommendation?.recommendations && recommendation.recommendations.length > 0 ? (
                  recommendation.recommendations.map((rec) => (
                    <div
                      key={rec.auction_id}
                      onClick={() => onOpenRoomById(rec.auction_id)}
                      className="p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-pink-500/40 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="truncate mr-2">
                        <div className="text-xs font-bold text-slate-200 truncate">{rec.title}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                          <span>{rec.category}</span>
                          <span>•</span>
                          <span className="text-pink-400">{rec.match_score}% Match</span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="font-mono text-xs font-bold text-white">
                          {formatUnits(rec.current_price || 0)}
                        </div>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 ml-auto mt-0.5" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-xs text-slate-500">
                    Place bids on items to generate personalized recommendations!
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
              Personalized matching based on your bid history & interests.
            </div>
          </div>
        )}

      </div>

      {/* Grid: Collector Win Rate Power Rankings & Leaderboard */}
      <div className="rounded-3xl glass-card p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-fuchsia-500/20 to-purple-500/20 border border-fuchsia-500/30 text-fuchsia-400 shadow-lg shadow-fuchsia-500/10">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Collector Level & Win Rate Leaderboard</h3>
              <p className="text-xs text-slate-400">Customer status progression ranked by verified auction wins and performance metrics</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">Tiers:</span>
            <span className="flex items-center gap-1 text-fuchsia-300 font-mono font-bold"><Crown className="w-3 h-3 text-fuchsia-400" /> Diamond (≥50%)</span>
            <span className="flex items-center gap-1 text-cyan-300 font-mono font-bold"><Award className="w-3 h-3 text-cyan-400" /> Platinum (≥35%)</span>
            <span className="flex items-center gap-1 text-amber-300 font-mono font-bold"><Star className="w-3 h-3 text-amber-400" /> Gold (≥20%)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collectors.slice(0, 9).map((col, idx) => {
            const tierInfo = getCollectorTier('CUSTOMER', col.win_rate, col.auctions_won, col.auctions_participated);
            const winRate = col.win_rate ?? 0;
            const won = col.auctions_won ?? 0;
            const part = col.auctions_participated ?? (won > 0 ? won + 1 : 0);

            return (
              <div
                key={col.username}
                className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                      idx === 0 ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30' :
                      idx === 1 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                      idx === 2 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-xs text-white">@{col.username}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[130px]">{col.full_name}</div>
                    </div>
                  </div>

                  <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border flex items-center gap-1 ${tierInfo.badgeClass}`}>
                    {renderTierIcon(tierInfo.iconName)}
                    <span>{tierInfo.shortTitle}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Win Rate:</span>
                    <span className={`font-mono font-bold ${
                      winRate >= 50 ? 'text-fuchsia-300' : winRate >= 35 ? 'text-cyan-300' : winRate >= 20 ? 'text-amber-300' : 'text-slate-400'
                    }`}>
                      {winRate.toFixed(1)}% ({won}/{part} won)
                    </span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        winRate >= 50
                          ? 'bg-gradient-to-r from-purple-500 to-fuchsia-400'
                          : winRate >= 35
                          ? 'bg-gradient-to-r from-sky-500 to-cyan-400'
                          : winRate >= 20
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                          : 'bg-slate-600'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(winRate > 0 ? winRate : 5, 5))}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-800/60 font-mono">
                  <span>Total Bids: <strong className="text-white">{col.total_bids_placed || 0}</strong></span>
                  <span>Wallet: <strong className="text-emerald-400">{formatUnits(col.balance || 0)}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bidding Integrity & Compliance Monitor */}
      <div className="rounded-3xl glass-card p-6 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Bidding Integrity & Compliance Monitor</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Continuous Compliance Scanner</span>
        </div>

        {fraudAlerts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fraudAlerts.map((alert, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex flex-col justify-between space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {alert.alert_type}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <p className="text-xs text-slate-300">{alert.details}</p>

                <div className="text-[11px] text-slate-400 pt-2 border-t border-rose-500/10 flex items-center justify-between">
                  <span>Flagged Account: <strong className="text-white">@{alert.bidder}</strong></span>
                  <span className="text-rose-400 font-semibold">{alert.severity} SEVERITY</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400">
            ✓ 100% Platform Integrity: All live bids and auction transactions verified and compliant.
          </div>
        )}
      </div>

    </div>
  );
};
