import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageSquare, Send, X, ShieldCheck, Search, Crown, 
  Sparkles, User, RefreshCw, Maximize2, Minimize2, ChevronLeft, 
  ExternalLink, Filter, Plus, ArrowDown
} from 'lucide-react';
import { User as UserType, ChatMessage, ChatConversation } from '../types';
import { api } from '../services/api';
import { getCollectorTier } from '../services/collectorHelper';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType | null;
  targetCustomerUsername?: string | null;
  onOpenUserManagement?: () => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  targetCustomerUsername,
  onOpenUserManagement,
}) => {
  const isManager = currentUser?.role === 'MANAGER';
  
  // State
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'unread'>('all');
  const [isMaximized, setIsMaximized] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initializedForOpenRef = useRef(false);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // 1. Initial selection when drawer opens
  useEffect(() => {
    if (isOpen && currentUser) {
      if (!initializedForOpenRef.current) {
        initializedForOpenRef.current = true;
        if (isManager) {
          if (targetCustomerUsername) {
            setSelectedCustomer(targetCustomerUsername);
          }
        } else {
          setSelectedCustomer(currentUser.username);
        }
      } else if (targetCustomerUsername && isManager) {
        // If targetCustomerUsername changed while already open
        setSelectedCustomer(targetCustomerUsername);
      }
    } else {
      initializedForOpenRef.current = false;
    }
  }, [isOpen, targetCustomerUsername, isManager, currentUser]);

  // 2. Fetch conversations list without overriding selectedCustomer
  const fetchConversations = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoadingConversations(true);
      const data = await api.getChatConversations(currentUser.username, currentUser.role);
      setConversations(data);

      // If manager and no customer selected yet, select first conversation
      if (isManager) {
        setSelectedCustomer(prev => {
          if (!prev && data.length > 0) {
            return data[0].customer_username;
          }
          return prev;
        });
      } else {
        setSelectedCustomer(currentUser.username);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, [currentUser, isManager]);

  useEffect(() => {
    if (isOpen && currentUser) {
      fetchConversations();
    }
  }, [isOpen, currentUser, fetchConversations]);

  // 3. Fetch messages for the selected customer conversation
  const fetchMessages = useCallback(async (custUsername: string) => {
    if (!currentUser || !custUsername) return;
    try {
      setLoadingMessages(true);
      const msgs = await api.getChatMessages(custUsername, currentUser.username, currentUser.role);
      setMessages(msgs);
      
      // Mark as read in backend
      await api.markChatRead(custUsername, currentUser.role);
      
      // Update local unread badge on that conversation
      setConversations(prev => 
        prev.map(c => c.customer_username === custUsername ? { ...c, unread_count: 0 } : c)
      );

      setTimeout(() => scrollToBottom('auto'), 50);
    } catch (err) {
      console.error('Failed to load chat messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [currentUser]);

  // When selectedCustomer changes, fetch messages
  useEffect(() => {
    if (isOpen && selectedCustomer) {
      fetchMessages(selectedCustomer);
    }
  }, [isOpen, selectedCustomer, fetchMessages]);

  // 4. Periodic polling for live chat updates every 3.5 seconds
  useEffect(() => {
    if (!isOpen || !selectedCustomer || !currentUser) return;

    const interval = setInterval(async () => {
      try {
        const msgs = await api.getChatMessages(selectedCustomer, currentUser.username, currentUser.role);
        setMessages(prev => {
          if (msgs.length !== prev.length || (msgs.length > 0 && msgs[msgs.length - 1].id !== prev[prev.length - 1]?.id)) {
            setTimeout(() => scrollToBottom('smooth'), 50);
            return msgs;
          }
          return prev;
        });
      } catch {}
    }, 3500);

    return () => clearInterval(interval);
  }, [isOpen, selectedCustomer, currentUser]);

  // Handle manual customer switch by Manager
  const handleSelectCustomer = (custUsername: string) => {
    if (custUsername === selectedCustomer) return;
    setSelectedCustomer(custUsername);
    // On small screens, hide sidebar to view active chat
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
    fetchMessages(custUsername);
  };

  // Handle send message
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = inputText.trim();
    if (!content || !currentUser || !selectedCustomer || sending) return;

    try {
      setSending(true);
      const newMsg = await api.sendChatMessage({
        sender_username: currentUser.username,
        sender_role: currentUser.role,
        sender_name: currentUser.full_name,
        content: content,
        customer_username: selectedCustomer,
        recipient_username: isManager ? selectedCustomer : 'MANAGER_SUPPORT'
      });

      setMessages(prev => [...prev, newMsg]);
      setInputText('');
      setTimeout(() => scrollToBottom('smooth'), 50);

      // Update snippet in conversation list locally
      setConversations(prev => 
        prev.map(c => c.customer_username === selectedCustomer ? {
          ...c,
          last_message: content,
          last_message_time: Date.now()
        } : c)
      );
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  if (!isOpen) return null;

  // Selected conversation metadata
  const currentConversation = conversations.find(c => c.customer_username === selectedCustomer);
  const selectedTier = getCollectorTier('CUSTOMER', currentConversation?.customer_win_rate || 0);

  // Filtered conversations for Manager
  const filteredConversations = conversations.filter(c => {
    const matchesSearch = 
      c.customer_username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterTab === 'active') {
      return !!c.last_message;
    }
    if (filterTab === 'unread') {
      return c.unread_count > 0;
    }
    return true;
  });

  const totalUnreadAll = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);
  const totalActiveAll = conversations.filter(c => !!c.last_message).length;

  const customerPresetQueries = [
    "💎 Question about an active luxury lot",
    "⚡ Escrow & instant settlement inquiry",
    "👑 How do I upgrade my Collector tier?",
    "💵 Requesting wallet balance clearance"
  ];

  const managerPresetReplies = [
    "Your account verification and credentials have been approved.",
    "Congratulations on your recent winning bid! Private escrow is ready.",
    "Your wallet balance has been credited and cleared for live bidding.",
    "The authentic archival provenance documentation has been dispatched."
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className={`relative w-full flex flex-col bg-slate-950 border border-amber-500/30 rounded-2xl shadow-2xl shadow-amber-500/10 transition-all duration-300 overflow-hidden ${
          isMaximized 
            ? 'w-[96vw] h-[95vh] max-w-none' 
            : isManager 
            ? 'max-w-5xl h-[88vh] max-h-[850px]' 
            : 'max-w-2xl h-[82vh] max-h-[800px]'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-slate-900/90 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {isManager && !showSidebar && (
              <button
                onClick={() => setShowSidebar(true)}
                className="md:hidden p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white mr-1"
                title="Back to Conversations"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-slate-100 tracking-wide truncate">
                  {isManager ? 'Customer Communications Center' : 'Platform Concierge & Support'}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live & Encrypted
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {isManager 
                  ? 'Switch between customer threads or initiate direct support' 
                  : 'Private VIP channel with Platform Chief Auctioneer'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Maximize / Flexible toggle */}
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
              title={isMaximized ? "Restore size" : "Expand to Fullscreen"}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
              title="Close Chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Layout */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* MANAGER VIEW: Left Panel Conversation Switcher */}
          {isManager && (
            <div className={`w-full md:w-80 lg:w-88 border-r border-slate-800 bg-slate-950/80 flex flex-col min-h-0 shrink-0 ${
              showSidebar ? 'flex' : 'hidden md:flex'
            }`}>
              {/* Search & Filter Header */}
              <div className="p-3 border-b border-slate-800/80 space-y-2 shrink-0">
                {/* Search Customer */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search collector username..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-[11px] font-semibold">
                  <button
                    onClick={() => setFilterTab('all')}
                    className={`flex-1 py-1 rounded-lg transition-all ${
                      filterTab === 'all' 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All ({conversations.length})
                  </button>
                  <button
                    onClick={() => setFilterTab('active')}
                    className={`flex-1 py-1 rounded-lg transition-all ${
                      filterTab === 'active' 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Active ({totalActiveAll})
                  </button>
                  <button
                    onClick={() => setFilterTab('unread')}
                    className={`flex-1 py-1 rounded-lg transition-all flex items-center justify-center gap-1 ${
                      filterTab === 'unread' 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>Unread</span>
                    {totalUnreadAll > 0 && (
                      <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black flex items-center justify-center">
                        {totalUnreadAll}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Scrollable Conversations List */}
              <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-800/40 custom-scrollbar">
                {loadingConversations ? (
                  <div className="flex flex-col items-center justify-center p-8 text-slate-500 gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                    <span className="text-xs">Loading collector threads...</span>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-6 text-center space-y-2">
                    <p className="text-xs text-slate-500">No matching conversations found.</p>
                    {searchQuery && (
                      <button
                        onClick={() => {
                          const cleanQuery = searchQuery.trim().toLowerCase();
                          handleSelectCustomer(cleanQuery);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold hover:bg-amber-500/30 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Start Chat with @{searchQuery.trim()}</span>
                      </button>
                    )}
                  </div>
                ) : (
                  filteredConversations.map(conv => {
                    const isSelected = selectedCustomer === conv.customer_username;
                    const tierInfo = getCollectorTier('CUSTOMER', conv.customer_win_rate || 0);

                    return (
                      <button
                        key={conv.conversation_id}
                        onClick={() => handleSelectCustomer(conv.customer_username)}
                        className={`w-full text-left p-3.5 flex items-start gap-3 transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-amber-500/20 border-l-4 border-amber-500 shadow-inner' 
                            : 'hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="relative shrink-0 mt-0.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isSelected 
                              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}>
                            {conv.customer_username.slice(0, 2).toUpperCase()}
                          </div>
                          {conv.unread_count > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-md animate-bounce">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className={`font-bold text-xs truncate ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                              @{conv.customer_username}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                              {conv.customer_win_rate ? `${conv.customer_win_rate.toFixed(0)}% WR` : ''}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded border ${tierInfo.badgeClass}`}>
                              {tierInfo.shortTitle}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate">
                              {conv.customer_name}
                            </span>
                          </div>

                          <p className={`text-[11px] truncate leading-tight ${
                            isSelected ? 'text-slate-200 font-medium' : 'text-slate-400'
                          }`}>
                            {conv.last_message || <span className="italic text-slate-600">No messages yet</span>}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Chat Message Window */}
          <div className={`flex-1 min-h-0 flex flex-col bg-slate-900/40 ${
            isManager && showSidebar ? 'hidden md:flex' : 'flex'
          }`}>
            {/* Active Thread Header */}
            {isManager && currentConversation && (
              <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 bg-slate-900/90 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold text-xs shrink-0">
                    {currentConversation.customer_username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-slate-100 truncate">
                        {currentConversation.customer_name}
                      </span>
                      <span className="text-xs text-amber-400/90 font-mono">
                        (@{currentConversation.customer_username})
                      </span>
                      <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border ${selectedTier.badgeClass}`}>
                        {selectedTier.title}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                      Collector Win Rate: <strong className="text-slate-200">{currentConversation.customer_win_rate?.toFixed(1) || '0.0'}%</strong>
                      {currentConversation.customer_email && ` • ${currentConversation.customer_email}`}
                    </p>
                  </div>
                </div>

                {onOpenUserManagement && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenUserManagement();
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 hover:text-amber-300 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors shrink-0"
                    title="Open User Profile in Management Table"
                  >
                    <span className="hidden sm:inline">Manage Account</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* CUSTOMER VIEW: Welcome Concierge Banner */}
            {!isManager && (
              <div className="p-3.5 sm:p-4 bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent border-b border-amber-500/20 flex items-start gap-3 shrink-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <h4 className="font-semibold text-amber-300 mb-0.5">
                    Nova Luxury Private Concierge
                  </h4>
                  <p className="text-slate-400 leading-relaxed text-[11px] sm:text-xs">
                    You are connected directly with the platform management team. Inquire about active lot provenance, high-liquidity escrow, private VIP rooms, or account upgrades.
                  </p>
                </div>
              </div>
            )}

            {/* Scrollable Message History Stream */}
            <div 
              ref={messageContainerRef}
              className="flex-1 min-h-0 p-4 sm:p-5 overflow-y-auto space-y-3.5 custom-scrollbar"
            >
              {loadingMessages ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                  <span className="text-xs">Loading conversation history...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center p-6 gap-2">
                  <MessageSquare className="w-8 h-8 text-slate-600" />
                  <p className="text-sm font-semibold text-slate-400">No messages in this channel yet</p>
                  <p className="text-xs text-slate-500 max-w-sm">
                    {isManager 
                      ? `Initiate direct communication with @${selectedCustomer} using the message bar below.`
                      : 'Send a message to contact the Platform Management team directly.'}
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMine = msg.sender_username === currentUser?.username;
                  const isManagerMsg = msg.sender_role === 'MANAGER';

                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      {/* Sender Label */}
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        {isManagerMsg ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            Platform Manager
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                            <User className="w-2.5 h-2.5 text-slate-400" />
                            @{msg.sender_username}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Bubble */}
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-lg ${
                          isMine
                            ? isManagerMsg
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none border border-blue-400/30'
                              : 'bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-tr-none border border-amber-400/30'
                            : isManagerMsg
                            ? 'bg-slate-900 border border-amber-500/25 text-slate-100 rounded-tl-none'
                            : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Chips */}
            <div className="px-3 sm:px-4 py-2 bg-slate-950/70 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 shrink-0">
                Quick:
              </span>
              {(isManager ? managerPresetReplies : customerPresetQueries).map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputText(chip)}
                  className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-slate-900 hover:bg-amber-500/20 border border-slate-800 hover:border-amber-500/40 text-slate-400 hover:text-amber-300 transition-all text-left truncate max-w-[280px] cursor-pointer"
                  title={chip}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Message Input Form */}
            <form onSubmit={handleSend} className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2 shrink-0">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={
                  isManager 
                    ? `Message @${selectedCustomer || 'customer'} directly...`
                    : 'Type a message to Platform Manager Support...'
                }
                className="flex-1 bg-slate-950 border border-slate-700/90 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all"
                disabled={sending}
              />

              <button
                type="submit"
                disabled={!inputText.trim() || sending}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer shrink-0"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
