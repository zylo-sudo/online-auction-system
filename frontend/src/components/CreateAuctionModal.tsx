import React, { useState, useRef } from 'react';
import { X, Plus, Shield, AlertCircle, Calendar, Upload, CheckCircle, Trash2, Link as LinkIcon } from 'lucide-react';
import { api } from '../services/api';
import { Auction, User } from '../types';
import { PRESET_IMAGES } from '../services/imageHelper';
import { formatUnits, formatUnitsConversions, WALLET_RATE_LABEL } from '../services/currencyHelper';

interface CreateAuctionModalProps {
  currentUser: User | null;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onClose: () => void;
  onAuctionCreated: (auction: Auction) => void;
}

const CATEGORIES = [
  'Jewelry',
  'Experiences, Homeware & Luxury Fashion',
  'Autographed Music Memorabilia',
  'Autographed Sports Memorabilia & Game Tickets',
  'Watches & Luxury',
  'Electronics',
  'Art & Collectibles',
  'Gaming & Tech',
  'Automotive'
];

export const CreateAuctionModal: React.FC<CreateAuctionModalProps> = ({
  currentUser,
  onOpenAuth,
  onClose,
  onAuctionCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [startPriceStr, setStartPriceStr] = useState<string>('');
  
  // Date pickers for From: and To: (MM/DD/YYYY) - empty by default
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Photo state (Browse from device or URL/Preset)
  const [imageUrl, setImageUrl] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [photoMode, setPhotoMode] = useState<'upload' | 'url'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isManager = currentUser?.role === 'MANAGER';

  // Helper to format YYYY-MM-DD into MM/DD/YYYY
  const formatDateToMDY = (dateStr: string): string => {
    if (!dateStr) return 'MM/DD/YYYY';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Handle local file selection from device
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image size exceeds 10MB limit.');
      return;
    }

    setError('');
    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
      }
    };
    reader.onerror = () => {
      setError('Failed to read image file from device.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setImageUrl('');
    setUploadedFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const numericStartPrice = parseFloat(startPriceStr) || 0;

  // Calculate duration and timestamps when dates are selected
  const hasDates = Boolean(fromDate && toDate);
  const fromTimestamp = fromDate ? new Date(fromDate + 'T00:00:00').getTime() : Date.now();
  const toTimestamp = toDate ? new Date(toDate + 'T23:59:59').getTime() : (fromTimestamp + 14 * 86400000);
  const durationSeconds = Math.max(60, Math.floor((toTimestamp - fromTimestamp) / 1000));
  const durationDays = Math.max(1, Math.round(durationSeconds / 86400));
  const isUpcoming = fromDate ? fromTimestamp > (Date.now() + 60000) : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth('login');
      return;
    }
    if (!title.trim()) {
      setError('Please enter an auction title.');
      return;
    }
    if (!fromDate || !toDate) {
      setError('Please select both From: and To: dates (MM/DD/YYYY) for auction duration.');
      return;
    }
    if (toTimestamp <= fromTimestamp) {
      setError('End date (To) must be after start date (From).');
      return;
    }
    if (numericStartPrice <= 0) {
      setError('Please enter a valid starting price.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const created = await api.createAuction({
        title: title.trim(),
        description: description.trim(),
        category,
        image_url: imageUrl.trim() || undefined,
        start_price: numericStartPrice,
        duration_seconds: durationSeconds,
        start_time: fromTimestamp,
        end_time: toTimestamp,
      });

      onAuctionCreated(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create auction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      {/* Scrollable Modal Container */}
      <div className="relative w-full max-w-xl glass-card rounded-3xl overflow-hidden border border-slate-700/80 shadow-2xl max-h-[92vh] flex flex-col">
        
        {/* Pinned Sticky Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shadow-lg shadow-purple-500/10">
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Publish Auction</h2>
              <p className="text-xs text-slate-400">Add an exclusive item to live bidding</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-4 max-h-[calc(92vh-80px)] scrollbar-thin scrollbar-thumb-slate-700">
          
          {/* Manager Authorization Notice if Customer */}
          {!isManager && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3 text-xs text-amber-300">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                <span>
                  {currentUser
                    ? 'You are logged in as a Customer. Managers have official publishing rights.'
                    : 'Sign in as a Manager to publish auctions.'}
                </span>
              </div>
              <button
                onClick={() => onOpenAuth('login')}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold whitespace-nowrap text-[11px] cursor-pointer"
              >
                Manager Login
              </button>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* 1. Auction Title Box */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Auction Title *
              </label>
              <input
                type="text"
                required
                placeholder="Enter Auction Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* 2. Category Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Auction Duration (From: and To: with Date Select Box MM/DD/YYYY - No Default Values) */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  Auction Duration
                </label>
                {hasDates && (
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    isUpcoming
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {isUpcoming ? 'Scheduled as Upcoming' : 'Active Immediately'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* From Date */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-400">From (MM/DD/YYYY):</span>
                    {fromDate && (
                      <span className="text-[10px] text-indigo-300 font-mono">
                        {formatDateToMDY(fromDate)}
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    required
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  />
                </div>

                {/* To Date */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-400">To (MM/DD/YYYY):</span>
                    {toDate && (
                      <span className="text-[10px] text-indigo-300 font-mono">
                        {formatDateToMDY(toDate)}
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    required
                    min={fromDate || undefined}
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="text-[11px] text-slate-400 pt-1 flex items-center justify-between border-t border-slate-800/60">
                {hasDates ? (
                  <>
                    <span>Calculated Duration: <strong className="text-white font-mono">{durationDays} Days</strong></span>
                    <span>From: <strong className="text-indigo-300 font-mono">{formatDateToMDY(fromDate)}</strong> To: <strong className="text-purple-300 font-mono">{formatDateToMDY(toDate)}</strong></span>
                  </>
                ) : (
                  <span className="text-slate-500">Select start and end dates (MM/DD/YYYY)</span>
                )}
              </div>
            </div>

            {/* 4. Starting Price Box */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Starting Price (in Units) *
                  </label>
                  <span className="text-[10px] text-indigo-300 font-mono font-semibold">
                    (1 Unit = 10 USD and 1 Unit = 45000 MMK)
                  </span>
                </div>
                {numericStartPrice > 0 && (
                  <div className="text-right">
                    <span className="text-xs font-bold font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
                      {formatUnits(numericStartPrice)}
                    </span>
                    <div className="text-[9.5px] text-slate-400 font-mono tracking-tight mt-0.5">
                      {formatUnitsConversions(numericStartPrice)}
                    </div>
                  </div>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-indigo-400">Units</span>
                <input
                  type="number"
                  min="1"
                  step="10"
                  required
                  placeholder="Enter Starting price in Units"
                  value={startPriceStr}
                  onChange={(e) => setStartPriceStr(e.target.value)}
                  className="w-full pl-16 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* 5. Item Photo (Browse from Device + URL/Preset Options - No Fullscreen Review Box) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Item Photo
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPhotoMode('upload')}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                      photoMode === 'upload'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Browse Device
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoMode('url')}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                      photoMode === 'url'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Preset / URL
                  </button>
                </div>
              </div>

              {photoMode === 'upload' ? (
                /* Browse from Device UI */
                <div className="space-y-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {imageUrl ? (
                    <div className="relative p-3 rounded-2xl bg-slate-900 border border-indigo-500/40 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
                          <img
                            src={imageUrl}
                            alt="Upload preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            {uploadedFileName || 'Image loaded from device'}
                          </div>
                          <span className="text-[10px] text-emerald-400">Selected from your device</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all cursor-pointer"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer"
                          title="Remove file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="group p-6 rounded-2xl border-2 border-dashed border-slate-800 hover:border-indigo-500/60 bg-slate-900/40 hover:bg-slate-900/80 transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-2"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6 text-indigo-400" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          Click to Browse Device for Item Photo
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Supports JPG, PNG, WEBP, and GIF up to 10MB
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* URL & Presets UI */
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={imageUrl}
                      onChange={(e) => {
                        setImageUrl(e.target.value);
                        setUploadedFileName('');
                      }}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <LinkIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_IMAGES.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setImageUrl(preset.url);
                          setUploadedFileName(preset.name);
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                          imageUrl === preset.url
                            ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 6. Description */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Item Description
              </label>
              <textarea
                rows={3}
                placeholder="Provide item history, condition, specifications, and provenance..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none transition-colors"
              />
            </div>

            {/* 7. Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 via-indigo-600 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold text-sm shadow-lg shadow-purple-500/25 transition-all transform active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{loading ? 'Publishing Auction...' : isUpcoming ? 'Publish as Upcoming Auction' : 'Publish Live Auction'}</span>
              </button>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
};
