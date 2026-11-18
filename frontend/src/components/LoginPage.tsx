import React, { useState } from 'react';
import { Gavel, Lock, User as UserIcon, Shield, ArrowRight, KeyRound, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { User, UserRole } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  onContinueAsGuest: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onContinueAsGuest,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Sign In state - strictly empty defaults
  const [loginRole, setLoginRole] = useState<UserRole>('CUSTOMER');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign Up state
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('CUSTOMER');

  const [pendingApprovalData, setPendingApprovalData] = useState<{ username: string; role: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRoleSelect = (role: UserRole) => {
    setLoginRole(role);
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword) {
      setError('Please enter your username or email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.login(loginIdentifier.trim(), loginPassword, loginRole);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regFullName.trim() || !regEmail.trim() || !regPassword) {
      setError('Please complete all registration fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.register({
        username: regUsername.trim(),
        full_name: regFullName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: regRole,
      });
      if (res.pending_approval) {
        setPendingApprovalData({
          username: regUsername.trim(),
          role: regRole === 'MANAGER' ? 'Manager' : 'Customer'
        });
        setLoginIdentifier(regUsername.trim());
      } else {
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a14] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      
      {/* Background Animated Glowing Ambient Orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 items-center justify-center shadow-xl shadow-indigo-500/30 mb-2">
            <Gavel className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
            NovaAuction
          </h1>
          <p className="text-xs text-slate-400">
            Real-Time Auction & Live Bidding Marketplace
          </p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
          
          {/* Tab Selector */}
          <div className="flex p-1 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => { setTab('login'); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl transition-all cursor-pointer ${
                tab === 'login'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setTab('register'); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl transition-all cursor-pointer ${
                tab === 'register'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {tab === 'login' ? (
            /* Sign In Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Username or Email
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Enter username or email"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="Enter password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              {/* Select User Role (Clean Customer and Manager without extra text) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Select User Role
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRoleSelect('CUSTOMER')}
                    className={`py-3 px-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      loginRole === 'CUSTOMER'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/15 ring-1 ring-indigo-500/50'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-2 text-indigo-300">
                      <UserIcon className="w-4 h-4" />
                      <span>Customer</span>
                    </div>
                    {loginRole === 'CUSTOMER' && (
                      <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleSelect('MANAGER')}
                    className={`py-3 px-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      loginRole === 'MANAGER'
                        ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg shadow-purple-500/15 ring-1 ring-purple-500/50'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-2 text-purple-300">
                      <Shield className="w-4 h-4" />
                      <span>Manager</span>
                    </div>
                    {loginRole === 'MANAGER' && (
                      <CheckCircle2 className="w-4 h-4 text-purple-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 transition-all transform active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{loading ? 'Authenticating...' : `Sign In as ${loginRole === 'MANAGER' ? 'Manager' : 'Customer'}`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : pendingApprovalData ? (
            /* Pending Manager Approval Confirmation */
            <div className="py-4 space-y-5 text-center">
              <div className="mx-auto w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-purple-500/20 to-pink-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-xl shadow-amber-500/20 animate-pulse">
                <Shield className="w-8 h-8 text-amber-400" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold font-mono">
                  <span>PENDING MANAGER APPROVAL</span>
                </div>
                <h3 className="text-xl font-bold text-white">Registration Submitted!</h3>
                <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
                  Your new <strong className="text-white">{pendingApprovalData.role}</strong> account for <strong className="text-indigo-300">@{pendingApprovalData.username}</strong> has been submitted to the Platform Manager for review.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-left text-xs text-slate-400 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span>Requested Username:</span>
                  <span className="font-mono font-bold text-slate-200">@{pendingApprovalData.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Requested Role:</span>
                  <span className="font-mono font-bold text-purple-300">{pendingApprovalData.role}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Approval Status:</span>
                  <span className="font-bold text-amber-400">Waiting on Manager Review</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                A notification was sent to the Manager's dashboard. You can log in once approved.
              </p>

              <button
                type="button"
                onClick={() => {
                  setPendingApprovalData(null);
                  setTab('login');
                  setError('');
                }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-bold text-xs shadow-xl shadow-indigo-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Back to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Sign Up Form */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter full name"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter username"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="Enter email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Select User Role */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Select User Role *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegRole('CUSTOMER')}
                    className={`py-2.5 px-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      regRole === 'CUSTOMER'
                        ? 'bg-indigo-500/20 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-2 text-indigo-300">
                      <UserIcon className="w-4 h-4" />
                      <span>Customer</span>
                    </div>
                    {regRole === 'CUSTOMER' && (
                      <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegRole('MANAGER')}
                    className={`py-2.5 px-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      regRole === 'MANAGER'
                        ? 'bg-purple-500/20 border-purple-500 text-white shadow-md'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-2 text-purple-300">
                      <Shield className="w-4 h-4" />
                      <span>Manager</span>
                    </div>
                    {regRole === 'MANAGER' && (
                      <CheckCircle2 className="w-4 h-4 text-purple-400" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-bold text-xs shadow-xl shadow-indigo-500/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Creating Account...' : `Register as ${regRole === 'MANAGER' ? 'Manager' : 'Customer'}`}
              </button>
            </form>
          )}

        </div>

        {/* Footer Guest Link */}
        <div className="text-center">
          <button
            onClick={onContinueAsGuest}
            className="text-xs text-slate-500 hover:text-slate-300 underline transition-colors cursor-pointer"
          >
            Explore live auctions as Guest →
          </button>
        </div>

      </div>
    </div>
  );
};
