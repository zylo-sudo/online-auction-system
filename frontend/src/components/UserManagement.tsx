import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Shield, User as UserIcon, Wallet, Plus, Trash2, Edit3, 
  Search, RefreshCw, CheckCircle2, AlertCircle, Crown, Award, Star, Zap, X, MessageSquare
} from 'lucide-react';
import { User, UserRole } from '../types';
import { api } from '../services/api';
import { formatUnits, formatUnitsShort, formatUnitsConversions, WALLET_RATE_LABEL } from '../services/currencyHelper';
import { getCollectorTier, CollectorTier } from '../services/collectorHelper';

interface UserManagementProps {
  currentUser: User | null;
  onDirectMessageCustomer?: (username: string) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser, onDirectMessageCustomer }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'LEGEND' | 'MASTER' | 'ELITE' | 'ACTIVE' | 'MANAGER'>('ALL');
  
  // Balance edit modal state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newBalance, setNewBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // New user modal state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('password123');
  const [newRole, setNewRole] = useState<UserRole>('CUSTOMER');
  const [createLoading, setCreateLoading] = useState(false);

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const isManager = currentUser?.role === 'MANAGER';

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listUsers();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
      showNotification('Failed to fetch user list.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isManager) {
      loadUsers();
    }
  }, [isManager, loadUsers]);

  if (!isManager) {
    return (
      <div className="py-16 text-center space-y-4">
        <div className="h-16 w-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Access Restricted</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Only Platform Managers have authorization to access and manage user accounts.
        </p>
      </div>
    );
  }

  const handleUpdateBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setBalanceLoading(true);
    try {
      await api.updateUserBalance(editingUser.username, newBalance);
      showNotification(`Successfully updated ${editingUser.username}'s wallet to ${formatUnits(newBalance)}`, 'success');
      setEditingUser(null);
      await loadUsers();
    } catch (err: any) {
      showNotification(err.message || 'Failed to update balance', 'error');
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (username === currentUser?.username) {
      alert('You cannot delete your own active account.');
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete user account @${username}?`)) {
      return;
    }
    try {
      await api.deleteUser(username);
      showNotification(`User @${username} was deleted successfully.`, 'success');
      await loadUsers();
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete user', 'error');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newFullName.trim() || !newEmail.trim() || !newPassword) {
      showNotification('Please fill in all fields', 'error');
      return;
    }
    setCreateLoading(true);
    try {
      await api.register({
        username: newUsername.trim(),
        full_name: newFullName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
      });
      showNotification(`User @${newUsername} created successfully.`, 'success');
      setIsAddUserOpen(false);
      setNewUsername('');
      setNewFullName('');
      setNewEmail('');
      setNewPassword('password123');
      await loadUsers();
    } catch (err: any) {
      showNotification(err.message || 'Failed to create user', 'error');
    } finally {
      setCreateLoading(false);
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
      case 'Shield':
        return <Shield className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
      default:
        return <Zap className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    }
  };

  const filteredUsers = users.filter((u) => {
    const tierInfo = getCollectorTier(u.role, u.win_rate, u.auctions_won, u.auctions_participated);
    const matchesTier = 
      tierFilter === 'ALL' ||
      (tierFilter === 'MANAGER' && u.role === 'MANAGER') ||
      (tierFilter !== 'MANAGER' && tierInfo.tier === tierFilter);
      
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !query ||
      u.username.toLowerCase().includes(query) ||
      u.full_name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query);
    return matchesTier && matchesSearch;
  });

  const totalLegends = users.filter((u) => u.role === 'CUSTOMER' && (u.win_rate || 0) >= 50).length;
  const totalMasters = users.filter((u) => u.role === 'CUSTOMER' && (u.win_rate || 0) >= 35 && (u.win_rate || 0) < 50).length;
  const totalManagers = users.filter((u) => u.role === 'MANAGER').length;
  const totalWalletSum = users.reduce((sum, u) => sum + (u.balance || 0), 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`p-4 rounded-2xl flex items-center justify-between border shadow-xl animate-fadeIn ${
          notification.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center gap-2 text-sm font-semibold">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                User & Collector Management
              </h1>
              <p className="text-xs text-slate-400">
                Collector level tier rankings, win rate analytics, customer wallets, and platform security
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Refresh Users"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsAddUserOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl glass-card border border-slate-800/80 space-y-1">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            Total Accounts
          </span>
          <div className="text-2xl font-extrabold text-white font-mono">{users.length}</div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-fuchsia-500/20 bg-fuchsia-950/10 space-y-1">
          <span className="text-xs text-fuchsia-300 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-fuchsia-400" />
            Diamond VIP Legends (≥50% Win)
          </span>
          <div className="text-2xl font-extrabold text-fuchsia-400 font-mono">{totalLegends}</div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-cyan-500/20 bg-cyan-950/10 space-y-1">
          <span className="text-xs text-cyan-300 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-cyan-400" />
            Platinum Masters (≥35% Win)
          </span>
          <div className="text-2xl font-extrabold text-cyan-400 font-mono">{totalMasters}</div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-slate-800/80 space-y-1">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            Total Bidder Liquidity
          </span>
          <div className="text-2xl font-extrabold text-white font-mono">
            {formatUnits(totalWalletSum)}
          </div>
          <div className="text-[10px] text-indigo-300 font-mono font-semibold">
            {WALLET_RATE_LABEL}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-3 items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search username, name, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Tier / Role Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
          {[
            { id: 'ALL', label: 'All Accounts' },
            { id: 'LEGEND', label: 'Diamond VIP', icon: 'Crown', color: 'text-fuchsia-400' },
            { id: 'MASTER', label: 'Platinum Master', icon: 'Award', color: 'text-cyan-400' },
            { id: 'ELITE', label: 'Gold Elite', icon: 'Star', color: 'text-amber-400' },
            { id: 'ACTIVE', label: 'Silver Active', icon: 'Zap', color: 'text-slate-400' },
            { id: 'MANAGER', label: 'Managers', icon: 'Shield', color: 'text-purple-400' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTierFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                tierFilter === tab.id
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.icon && renderTierIcon(tab.icon)}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Collector Profile</th>
                <th className="px-5 py-4">Collector Level</th>
                <th className="px-5 py-4">Win Rate & Record</th>
                <th className="px-5 py-4">Total Bids</th>
                <th className="px-5 py-4">
                  <div>Wallet Balance</div>
                  <div className="text-[9.5px] text-indigo-300 font-mono tracking-tight font-normal normal-case">
                    (1 Unit = 10 USD and 1 Unit = 45000 MMK)
                  </div>
                </th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => {
                  const isManagerRole = u.role === 'MANAGER';
                  const tierInfo = getCollectorTier(u.role, u.win_rate, u.auctions_won, u.auctions_participated);
                  const winRateVal = u.win_rate ?? 0;
                  const wonCount = u.auctions_won ?? 0;
                  const partCount = u.auctions_participated ?? (wonCount > 0 ? wonCount + 1 : 0);

                  return (
                    <tr key={u.id || u.username} className="hover:bg-slate-900/40 transition-colors">
                      {/* Avatar & Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-2xl flex items-center justify-center font-bold text-xs shadow-md border ${
                            isManagerRole
                              ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white border-purple-400/40'
                              : tierInfo.badgeClass
                          }`}>
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-white flex items-center gap-1.5">
                              {u.full_name}
                              {u.username === currentUser?.username && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-normal">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-slate-400 font-mono text-[11px]">@{u.username} • {u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Collector Level Badge */}
                      <td className="px-5 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold font-mono border backdrop-blur-md shadow-sm ${tierInfo.badgeClass}`}>
                          {renderTierIcon(tierInfo.iconName)}
                          <span>{tierInfo.shortTitle}</span>
                        </div>
                      </td>

                      {/* Win Rate & Record */}
                      <td className="px-5 py-4">
                        {isManagerRole ? (
                          <span className="text-slate-500 text-[11px] italic">Platform Admin</span>
                        ) : (
                          <div className="space-y-1.5 min-w-[130px]">
                            <div className="flex items-center justify-between text-xs">
                              <span className={`font-mono font-bold ${
                                winRateVal >= 50 ? 'text-fuchsia-300' : winRateVal >= 35 ? 'text-cyan-300' : winRateVal >= 20 ? 'text-amber-300' : 'text-slate-400'
                              }`}>
                                {winRateVal.toFixed(1)}% Win Rate
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {wonCount}/{partCount} won
                              </span>
                            </div>
                            {/* Win Rate Progress Bar */}
                            <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  winRateVal >= 50
                                    ? 'bg-gradient-to-r from-purple-500 to-fuchsia-400'
                                    : winRateVal >= 35
                                    ? 'bg-gradient-to-r from-sky-500 to-cyan-400'
                                    : winRateVal >= 20
                                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                                    : 'bg-slate-600'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(winRateVal > 0 ? winRateVal : 5, 5))}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Total Bids Placed */}
                      <td className="px-5 py-4">
                        {isManagerRole ? (
                          <span className="text-slate-500 text-[11px]">—</span>
                        ) : (
                          <div className="font-mono text-xs text-slate-300">
                            <span className="font-bold text-white">{u.total_bids_placed || 0}</span> bids
                          </div>
                        )}
                      </td>

                      {/* Wallet Balance */}
                      <td className="px-5 py-4">
                        {isManagerRole ? (
                          <span className="text-slate-500 text-[11px] italic">Admin Account</span>
                        ) : (
                          <div>
                            <div className="font-mono font-bold text-sm text-white flex items-center gap-1.5">
                              <span>{formatUnits(u.balance || 0)}</span>
                              <button
                                onClick={() => {
                                  setEditingUser(u);
                                  setNewBalance(u.balance || 0);
                                }}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                                title="Adjust Wallet Balance"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono tracking-tight mt-0.5">
                              (1 Unit = 10 USD and 1 Unit = 45000 MMK)
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {u.role === 'CUSTOMER' && onDirectMessageCustomer && (
                            <button
                              onClick={() => onDirectMessageCustomer(u.username)}
                              className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all cursor-pointer flex items-center gap-1 text-xs font-medium"
                              title={`Direct Message @${u.username}`}
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                              <span>Message</span>
                            </button>
                          )}

                          {u.username !== currentUser?.username ? (
                            <button
                              onClick={() => handleDeleteUser(u.username)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/20 transition-all cursor-pointer flex items-center gap-1 text-xs"
                              title="Delete Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">Current Session</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No users found matching current collector tier and filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Adjust Wallet Balance */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-sm glass-card rounded-3xl p-6 border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">Adjust Bidder Wallet</h3>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-400">
              Update available bidding funds for <strong className="text-white">@{editingUser.username}</strong>
            </div>

            <form onSubmit={handleUpdateBalance} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-0.5">
                  New Wallet Balance (in Units)
                </label>
                <div className="text-[10px] text-indigo-300 font-mono font-semibold mb-2">
                  (1 Unit = 10 USD and 1 Unit = 45000 MMK)
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-indigo-400">Units</span>
                  <input
                    type="number"
                    step="10"
                    min="0"
                    required
                    value={newBalance}
                    onChange={(e) => setNewBalance(parseFloat(e.target.value) || 0)}
                    className="w-full pl-16 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="mt-1.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono gap-1">
                  <span className="text-indigo-300 font-bold">Preview: {formatUnits(newBalance)}</span>
                  <span className="text-slate-400 text-[11px]">{formatUnitsConversions(newBalance)}</span>
                </div>
              </div>

              {/* Units quick presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: '500 Units', val: 500 },
                  { label: '5,000 Units', val: 5000 },
                  { label: '50,000 Units', val: 50000 },
                  { label: '500,000 Units', val: 500000 },
                  { label: '5,000,000 Units', val: 5000000 }
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setNewBalance(preset.val)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={balanceLoading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  {balanceLoading ? 'Updating...' : 'Save Balance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create User */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md glass-card rounded-3xl p-6 border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white text-base">Register New Account</h3>
              </div>
              <button onClick={() => setIsAddUserOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. elena_curator"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Elena Rostova"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="elena@auction.io"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Account Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="CUSTOMER">Customer (Collector / Bidder)</option>
                  <option value="MANAGER">Platform Manager (Publishing & Admin)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Initial Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                >
                  {createLoading ? 'Creating User...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
