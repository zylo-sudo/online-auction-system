// Collector Level & Win Rate Progression Helper

export type CollectorTier = 'LEGEND' | 'MASTER' | 'ELITE' | 'ACTIVE' | 'STAFF';

export interface CollectorTierInfo {
  tier: CollectorTier;
  title: string;
  shortTitle: string;
  badgeClass: string;
  badgeBorder: string;
  badgeBg: string;
  badgeText: string;
  glowClass: string;
  gradient: string;
  iconName: 'Crown' | 'Award' | 'Star' | 'Zap' | 'Shield';
  minWinRate: number;
  description: string;
}

export const COLLECTOR_TIERS: Record<CollectorTier, CollectorTierInfo> = {
  LEGEND: {
    tier: 'LEGEND',
    title: 'Diamond VIP Legend',
    shortTitle: 'Diamond VIP',
    badgeClass: 'bg-gradient-to-r from-fuchsia-500/20 via-purple-500/20 to-pink-500/20 border-fuchsia-500/40 text-fuchsia-300',
    badgeBorder: 'border-fuchsia-500/40',
    badgeBg: 'bg-fuchsia-950/80',
    badgeText: 'text-fuchsia-300',
    glowClass: 'shadow-fuchsia-500/25',
    gradient: 'from-fuchsia-500 via-purple-500 to-pink-500',
    iconName: 'Crown',
    minWinRate: 50.0,
    description: 'Premier High-Roller Collector with ≥50% Auction Win Rate.'
  },
  MASTER: {
    tier: 'MASTER',
    title: 'Platinum Master Collector',
    shortTitle: 'Platinum Master',
    badgeClass: 'bg-gradient-to-r from-cyan-500/20 via-sky-500/20 to-emerald-500/20 border-cyan-500/40 text-cyan-300',
    badgeBorder: 'border-cyan-500/40',
    badgeBg: 'bg-cyan-950/80',
    badgeText: 'text-cyan-300',
    glowClass: 'shadow-cyan-500/25',
    gradient: 'from-cyan-500 via-sky-500 to-emerald-500',
    iconName: 'Award',
    minWinRate: 35.0,
    description: 'Distinguished Connoisseur with 35% - 49% Auction Win Rate.'
  },
  ELITE: {
    tier: 'ELITE',
    title: 'Gold Elite Bidder',
    shortTitle: 'Gold Elite',
    badgeClass: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-500/40 text-amber-300',
    badgeBorder: 'border-amber-500/40',
    badgeBg: 'bg-amber-950/80',
    badgeText: 'text-amber-300',
    glowClass: 'shadow-amber-500/25',
    gradient: 'from-amber-500 to-yellow-500',
    iconName: 'Star',
    minWinRate: 20.0,
    description: 'Proven Competitive Bidder with 20% - 34% Auction Win Rate.'
  },
  ACTIVE: {
    tier: 'ACTIVE',
    title: 'Silver Active Bidder',
    shortTitle: 'Silver Active',
    badgeClass: 'bg-slate-800/80 border-slate-700 text-slate-300',
    badgeBorder: 'border-slate-700',
    badgeBg: 'bg-slate-900/80',
    badgeText: 'text-slate-300',
    glowClass: 'shadow-slate-500/10',
    gradient: 'from-slate-600 to-slate-400',
    iconName: 'Zap',
    minWinRate: 0.0,
    description: 'Emerging Marketplace Collector with <20% Win Rate.'
  },
  STAFF: {
    tier: 'STAFF',
    title: 'Platform Administrator',
    shortTitle: 'Manager',
    badgeClass: 'bg-purple-950/80 border-purple-500/30 text-purple-300',
    badgeBorder: 'border-purple-500/30',
    badgeBg: 'bg-purple-950/80',
    badgeText: 'text-purple-300',
    glowClass: 'shadow-purple-500/20',
    gradient: 'from-purple-600 to-indigo-600',
    iconName: 'Shield',
    minWinRate: 0.0,
    description: 'Official Platform Manager with administrative oversight.'
  }
};

export const getCollectorTier = (
  role?: string,
  winRate: number = 0,
  auctionsWon: number = 0,
  auctionsParticipated: number = 0
): CollectorTierInfo => {
  if (role === 'MANAGER') {
    return COLLECTOR_TIERS.STAFF;
  }

  if (winRate >= 50.0 || (auctionsWon >= 3 && auctionsParticipated >= 4)) {
    return COLLECTOR_TIERS.LEGEND;
  }
  if (winRate >= 35.0 || auctionsWon >= 2) {
    return COLLECTOR_TIERS.MASTER;
  }
  if (winRate >= 20.0 || auctionsWon >= 1) {
    return COLLECTOR_TIERS.ELITE;
  }
  return COLLECTOR_TIERS.ACTIVE;
};

// Map of known bidders to their collector tiers for instant lookups in bid lists
export const KNOWN_BIDDER_TIERS: Record<string, { tier: CollectorTier; winRate: number; won: number; participated: number }> = {
  alice_collector: { tier: 'LEGEND', winRate: 71.4, won: 5, participated: 7 },
  diana_vip: { tier: 'LEGEND', winRate: 66.7, won: 4, participated: 6 },
  aisha_gems: { tier: 'LEGEND', winRate: 60.0, won: 3, participated: 5 },
  bob_trader: { tier: 'MASTER', winRate: 42.9, won: 3, participated: 7 },
  charlie_sniper: { tier: 'MASTER', winRate: 37.5, won: 3, participated: 8 },
  hannah_vip: { tier: 'MASTER', winRate: 40.0, won: 2, participated: 5 },
  marcus_horology: { tier: 'ELITE', winRate: 28.6, won: 2, participated: 7 },
  lucas_memorabilia: { tier: 'ELITE', winRate: 25.0, won: 2, participated: 8 },
  elena_curator: { tier: 'ELITE', winRate: 25.0, won: 1, participated: 4 },
  viktor_art: { tier: 'ELITE', winRate: 20.0, won: 1, participated: 5 },
  tariq_heritage: { tier: 'ELITE', winRate: 20.0, won: 1, participated: 5 },
  chloe_guitars: { tier: 'ACTIVE', winRate: 0.0, won: 0, participated: 6 },
  kenji_nagata: { tier: 'ACTIVE', winRate: 0.0, won: 0, participated: 5 },
  olivia_sound: { tier: 'ACTIVE', winRate: 0.0, won: 0, participated: 4 }
};

export interface BidderProfileSummary extends CollectorTierInfo {
  winRate: number;
  won: number;
  participated: number;
}

export const getBidderTierInfo = (username: string): BidderProfileSummary => {
  const known = KNOWN_BIDDER_TIERS[username.toLowerCase().trim()];
  if (known) {
    const tier = COLLECTOR_TIERS[known.tier];
    return {
      ...tier,
      winRate: known.winRate,
      won: known.won,
      participated: known.participated,
    };
  }
  return {
    ...COLLECTOR_TIERS.ACTIVE,
    winRate: 0.0,
    won: 0,
    participated: 1,
  };
};
