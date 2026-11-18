import React, { useState } from 'react';
import { 
  X, Bell, Trophy, Crown, UserCheck, Shield, CheckCircle2, 
  XCircle, Clock, Check, Sparkles, AlertCircle, ArrowUpRight, Flame
} from 'lucide-react';
import { AppNotification, User } from '../types';
import { api } from '../services/api';
import { formatUnits } from '../services/currencyHelper';
import { getCollectorTier } from '../services/collectorHelper';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  currentUser: User | null;
  onRefreshNotifications: () => void;
  onOpenAuction?: (auctionId: string) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  notifications,
  currentUser,
  onRefreshNotifications,
  onOpenAuction,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'WINS' | 'LEVELS' | 'REQUESTS'>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isManager = currentUser?.role === 'MANAGER';
  const unreadCount = notifications.filter(n => !n.read).length;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead();
    onRefreshNotifications();
    showToast('All notifications marked as read.');
  };

  const handleApprove = async (reqId: string, username: string) => {
    setActionLoadingId(reqId);
    try {
      await api.approveAccountRequest(reqId);
      showToast(`Account @${username} approved & activated successfully!`);
      onRefreshNotifications();
    } catch (err: any) {
      showToast(err.message || 'Approval failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDecline = async (reqId: string, username: string) => {
    setActionLoadingId(reqId);
    try {
      await api.declineAccountRequest(reqId);
      showToast(`Account request for @${username} was declined.`);
      onRefreshNotifications();
    } catch (err: any) {
      showToast(err.message || 'Decline failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'ALL') return true;
    if (filter === 'WINS') return n.type === 'AUCTION_WON';
    if (filter === 'LEVELS') return n.type === 'LEVEL_ACHIEVED';
    if (filter === 'REQUESTS') return n.type === 'ACCOUNT_APPROVAL_REQUEST';
    return true;
  });

  const getTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'AUCTION_WON':
        return <Trophy className="w-4 h-4 text-amber-400" />;
      case 'LEVEL_ACHIEVED':
        return <Crown className="w-4 h-4 text-fuchsia-400" />;
      case 'ACCOUNT_APPROVAL_REQUEST':
        return <UserCheck className="w-4 h-4 text-purple-400" />;
      default:
        return <Flame className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] glass-card rounded-3xl overflow-hidden border border-slate-700/80 shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-purple-600/30 to-pink-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-lg shadow-purple-500/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Notifications & Alerts</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-pink-500 text-white shadow-md shadow-pink-500/30 animate-pulse">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {isManager 
                  ? 'Real-time winning bids, collector level promotions, and account approval requests'
                  : 'Your auction victories, collector milestones, and bidding alerts'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mark All Read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="px-6 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-3 border-b border-slate-800 bg-slate-950/40 overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Notifications', count: notifications.length },
            { id: 'WINS', label: isManager ? 'Customer Wins' : 'My Wins', count: notifications.filter(n => n.type === 'AUCTION_WON').length },
            { id: 'LEVELS', label: 'Collector Levels', count: notifications.filter(n => n.type === 'LEVEL_ACHIEVED').length },
            ...(isManager ? [{ id: 'REQUESTS', label: 'Account Requests', count: notifications.filter(n => n.type === 'ACCOUNT_APPROVAL_REQUEST').length }] : [])
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/80'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  filter === tab.id ? 'bg-purple-900/80 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notification Feed List */}
        <div className="p-6 space-y-3 overflow-y-auto flex-1 max-h-[500px]">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((n) => {
              const isPending = n.actionStatus === 'PENDING';
              const isApproved = n.actionStatus === 'APPROVED';
              const isDeclined = n.actionStatus === 'DECLINED';

              return (
                <div
                  key={n.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    !n.read 
                      ? 'bg-slate-900/90 border-slate-700 shadow-md ring-1 ring-purple-500/20' 
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    
                    {/* Icon and Content */}
                    <div className="flex items-start gap-3.5">
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0 mt-0.5 shadow-sm">
                        {getNotificationIcon(n.type)}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-white">{n.title}</h4>
                          <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
                            {getTimeAgo(n.timestamp)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {n.message}
                        </p>

                        {/* Extra Details Banner based on Type */}
                        {n.details && (
                          <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                            {n.details.amount && (
                              <span className="font-mono font-bold text-amber-300 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                {formatUnits(n.details.amount)}
                              </span>
                            )}
                            {n.details.winner && (
                              <span className="font-mono text-indigo-300 px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                Collector: @{n.details.winner}
                              </span>
                            )}
                            {n.details.tier && (
                              <span className="font-mono font-bold text-fuchsia-300 px-2 py-0.5 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20">
                                Tier: {n.details.tier} ({n.details.win_rate || 0}% Win Rate)
                              </span>
                            )}
                            {n.details.auction_id && onOpenAuction && (
                              <button
                                onClick={() => {
                                  onClose();
                                  onOpenAuction(n.details!.auction_id!);
                                }}
                                className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-0.5 cursor-pointer ml-auto"
                              >
                                <span>View Lot</span>
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}

                        {/* Account Approval / Decline Actions for Manager */}
                        {n.type === 'ACCOUNT_APPROVAL_REQUEST' && isManager && (
                          <div className="pt-3 border-t border-slate-800/80 mt-2 flex items-center justify-between">
                            <div className="text-[11px] text-slate-400">
                              Applicant Email: <strong className="text-slate-200">{n.details?.requester_email || '—'}</strong>
                            </div>

                            <div className="flex items-center gap-2">
                              {isPending ? (
                                <>
                                  <button
                                    onClick={() => handleDecline(n.id, n.details?.requester_username || '')}
                                    disabled={actionLoadingId === n.id}
                                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-300 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                                  >
                                    Decline
                                  </button>

                                  <button
                                    onClick={() => handleApprove(n.id, n.details?.requester_username || '')}
                                    disabled={actionLoadingId === n.id}
                                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Approve Account</span>
                                  </button>
                                </>
                              ) : isApproved ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Account Approved
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg">
                                  <XCircle className="w-3.5 h-3.5" />
                                  Request Declined
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-16 space-y-2">
              <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <Bell className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-300">No notifications found</h4>
              <p className="text-xs text-slate-500">
                {filter === 'ALL' 
                  ? 'All notifications and activity milestones will appear here.'
                  : 'No alerts found matching this filter tab.'}
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
