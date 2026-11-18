import React, { useState, useRef, useEffect } from 'react';
import { Gavel, Plus, Sparkles, Activity, Layers, User as UserIcon, Shield, LogOut, ChevronDown, Wallet, LogIn, UserPlus, Users, Crown, Award, Star, Zap, Bell, MessageSquare } from 'lucide-react';
import { User } from '../types';
import { formatUnits, WALLET_RATE_LABEL } from '../services/currencyHelper';
import { getCollectorTier } from '../services/collectorHelper';

interface NavbarProps {
  activeTab: 'auctions' | 'analytics' | 'architecture' | 'users';
  setActiveTab: (tab: 'auctions' | 'analytics' | 'architecture' | 'users') => void;
  currentUser: User | null;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onLogout: () => void;
  onOpenCreate: () => void;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
  unreadChatCount?: number;
  onOpenChat?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenCreate,
  unreadNotificationsCount = 0,
  onOpenNotifications,
  unreadChatCount = 0,
  onOpenChat,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isManager = currentUser?.role === 'MANAGER';
  const collectorTier = currentUser ? getCollectorTier(currentUser.role, currentUser.win_rate, currentUser.auctions_won, currentUser.auctions_participated) : null;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('auctions')}>
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/20 group hover:scale-105 transition-transform">
            <div className="h-full w-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Gavel className="w-6 h-6 text-indigo-400 group-hover:rotate-12 transition-transform" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
                NOVA
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 tracking-wider">
                AUCTION
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400">
              <span>Distributed Bidding Exchange</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1.5 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800/80 backdrop-blur-md">
          <button
            onClick={() => setActiveTab('auctions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'auctions'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-4 h-4" />
            Auctions
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-4 h-4 text-pink-400" />
            Market Analytics
          </button>

          {/* Manager Only: User Account Management Tab */}
          {isManager && (
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-purple-300 hover:text-white hover:bg-purple-600/20'
              }`}
            >
              <Users className="w-4 h-4 text-purple-300" />
              Manage Users
            </button>
          )}
        </nav>

        {/* Right Section: Auth State & Action Button */}
        <div className="flex items-center gap-2.5">
          
          {/* Notifications Button for Both Managers, Customers, and Visitors */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer shadow-md"
            title="View Notifications"
          >
            <Bell className="w-5 h-5 text-slate-300" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold font-mono text-white shadow-lg shadow-pink-500/50 animate-pulse">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Direct Chat / Concierge Button for Logged-in Users (Manager & Customers) */}
          {currentUser && (
            <button
              onClick={onOpenChat}
              className="relative p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-300 transition-all cursor-pointer shadow-md group"
              title={isManager ? "Customer Communications Center" : "Chat with Platform Manager Support"}
            >
              <MessageSquare className="w-5 h-5 text-slate-300 group-hover:text-amber-400 transition-colors" />
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black font-mono text-slate-950 shadow-lg shadow-amber-500/50 animate-bounce">
                  {unreadChatCount > 9 ? '9+' : unreadChatCount}
                </span>
              )}
            </button>
          )}

          {/* If Logged In: User Profile Dropdown */}
          {currentUser ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-all text-left cursor-pointer"
              >
                {/* Avatar Icon */}
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-bold text-xs shadow-md border ${
                  isManager
                    ? 'bg-gradient-to-tr from-purple-600 to-pink-600 text-white border-purple-400/40'
                    : collectorTier ? collectorTier.badgeClass : 'bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white border-indigo-400/40'
                }`}>
                  {currentUser.username.charAt(0).toUpperCase()}
                </div>

                <div className="hidden sm:block text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-white leading-tight truncate max-w-[110px]">
                      {currentUser.username}
                    </span>
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded font-mono ${
                      isManager
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : collectorTier ? collectorTier.badgeClass : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {isManager ? 'MANAGER' : collectorTier?.shortTitle || 'BIDDER'}
                    </span>
                  </div>
                  {isManager ? (
                    <span className="text-[10px] text-slate-400 block font-mono">Platform Admin</span>
                  ) : (
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-emerald-400 font-mono leading-tight">
                        {formatUnits(currentUser.balance)}
                      </span>
                      <span className="text-[8.5px] text-slate-400 font-mono tracking-tighter">
                        (1 Unit = 10 USD and 1 Unit = 45000 MMK)
                      </span>
                    </div>
                  )}
                </div>

                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Account Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 glass-card rounded-2xl border border-slate-700/80 shadow-2xl p-2 z-50 animate-fadeIn">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-bold text-xs border ${
                        isManager ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : collectorTier?.badgeClass
                      }`}>
                        {isManager ? <Shield className="w-4 h-4" /> : <Crown className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white">{currentUser.full_name}</div>
                        <div className="text-[10px] text-slate-400">@{currentUser.username}</div>
                      </div>
                    </div>

                    {!isManager && (
                      <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-2 text-[11px]">
                        {/* Dedicated Wallet Balance Box */}
                        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Wallet Balance:</span>
                            <span className="font-bold text-emerald-400 font-mono text-xs">
                              {formatUnits(currentUser.balance)}
                            </span>
                          </div>
                          <div className="text-[9.5px] text-indigo-300 font-mono font-semibold">
                            (1 Unit = 10 USD and 1 Unit = 45000 MMK)
                          </div>
                          <div className="text-[9px] text-slate-400 font-mono">
                            ≈ ${(currentUser.balance * 10).toLocaleString()} USD • {(currentUser.balance * 45000).toLocaleString()} MMK
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-slate-400">Collector Level:</span>
                          <span className={`font-bold font-mono ${collectorTier?.badgeText}`}>
                            {collectorTier?.title}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Win Rate:</span>
                          <span className="font-bold font-mono text-emerald-300">
                            {currentUser.win_rate ?? 0}% ({currentUser.auctions_won ?? 0} wins)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {isManager && (
                    <button
                      onClick={() => { setDropdownOpen(false); setActiveTab('users'); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-purple-300 hover:text-white hover:bg-purple-600/20 rounded-xl transition-all mb-1"
                    >
                      <Users className="w-4 h-4 text-purple-400" />
                      Manage User Accounts
                    </button>
                  )}

                  {onOpenChat && (
                    <button
                      onClick={() => { setDropdownOpen(false); onOpenChat(); }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 rounded-xl transition-all mb-1"
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-amber-400" />
                        <span>{isManager ? 'Communications Hub' : 'Chat with Platform Support'}</span>
                      </div>
                      {unreadChatCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[9px]">
                          {unreadChatCount} new
                        </span>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => { setDropdownOpen(false); onOpenAuth('login'); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl transition-all"
                  >
                    <UserIcon className="w-4 h-4 text-indigo-400" />
                    Switch Account
                  </button>

                  <button
                    onClick={() => { setDropdownOpen(false); onLogout(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 transition-all"
              >
                <LogIn className="w-3.5 h-3.5 text-indigo-400" />
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Sign Up
              </button>
            </div>
          )}

          {/* Create Auction Button */}
          <button
            onClick={onOpenCreate}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg ${
              isManager
                ? 'bg-gradient-to-r from-purple-500 via-indigo-600 to-pink-500 text-white shadow-purple-500/25'
                : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-indigo-500/25'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">
              {isManager ? 'Publish Auction' : 'Create Auction'}
            </span>
          </button>

        </div>

      </div>
    </header>
  );
};
