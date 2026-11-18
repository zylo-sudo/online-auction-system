import React, { useEffect, useState } from 'react';
import { Server, Database, Cpu, Radio, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export const SystemHealthBadge: React.FC = () => {
  const [online, setOnline] = useState<boolean>(true);

  useEffect(() => {
    const check = async () => {
      const res = await api.getHealth();
      setOnline(res.status === 'online');
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-slate-950/60 border-b border-slate-800/60 py-2 px-4">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">Marketplace Status:</span>
          {online ? (
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 -ml-3"></span>
              Operational
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="h-2 w-2 rounded-full bg-rose-500"></span>
              Offline / Reconnecting
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 font-medium text-[11px]">
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
            <Server className="w-3.5 h-3.5 text-indigo-400" />
            <span>Auction Exchange</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
            <Radio className="w-3.5 h-3.5 text-pink-400" />
            <span>Live Bidding Feed</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Secure Database</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>Market Analytics</span>
          </div>
        </div>
      </div>
    </div>
  );
};
