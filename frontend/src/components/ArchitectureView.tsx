import React from 'react';
import { Layers, Server, Radio, Database, Cpu, Globe, Shield, Zap } from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Overview Banner */}
      <div className="rounded-3xl glass-card p-8 border border-indigo-500/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <Layers className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Distributed Architecture Breakdown</h2>
            <p className="text-xs text-slate-400">Comparing Java RMI (Original) vs. Modern Stack (Current)</p>
          </div>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed max-w-4xl">
          This system replaces the legacy Java RMI & MySQL setup with a high-throughput, horizontally partitioned microservice architecture using <strong>gRPC over HTTP/2</strong>, <strong>FastAPI WebSockets</strong>, <strong>MongoDB</strong>, and <strong>PySpark</strong>.
        </p>
      </div>

      {/* Layer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Layer 1: Client & Web Gateway */}
        <div className="rounded-3xl glass-card p-6 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">1. Client & API Gateway Layer</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            The <strong>React 18</strong> frontend connects via HTTP REST and persistent bidirectional <strong>WebSockets</strong> to the <strong>FastAPI Gateway</strong> on port 8000.
          </p>
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 font-mono text-xs space-y-1 text-slate-300">
            <div className="text-indigo-400 font-semibold">• WebSocket Hub: /ws/auctions/{'{id}'} & /ws/live</div>
            <div className="text-slate-400">• Dynamic JSON Event Broadcasting</div>
            <div className="text-slate-400">• Automatic OpenAPI / Swagger Documentation</div>
          </div>
        </div>

        {/* Layer 2: gRPC Sharded RPC */}
        <div className="rounded-3xl glass-card p-6 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-pink-400" />
            <h3 className="text-base font-bold text-white">2. Distributed gRPC Shards (Replaces RMI)</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Inter-service communication is powered by <strong>Google Protocol Buffers (gRPC)</strong> across multiple auction partitions (Shard 1: 50051, Shard 2: 50052).
          </p>
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 font-mono text-xs space-y-1 text-slate-300">
            <div className="text-pink-400 font-semibold">• Strong Contract: auction.proto</div>
            <div className="text-slate-400">• Consistent Hashing Shard Router</div>
            <div className="text-slate-400">• Sub-millisecond Binary Serialization</div>
          </div>
        </div>

        {/* Layer 3: MongoDB Document Store */}
        <div className="rounded-3xl glass-card p-6 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">3. High-Throughput NoSQL Storage</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            <strong>MongoDB</strong> stores active auctions, real-time bid streams, and analytics caches.
          </p>
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 font-mono text-xs space-y-1 text-slate-300">
            <div className="text-emerald-400 font-semibold">• Atomic Concurrency: findOneAndUpdate</div>
            <div className="text-slate-400">• Events Collection for PySpark Consumption</div>
            <div className="text-slate-400">• Indexed on shard_id, status, and timestamps</div>
          </div>
        </div>

        {/* Layer 4: PySpark Big Data Engine */}
        <div className="rounded-3xl glass-card p-6 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">4. PySpark Distributed Analytics</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            <strong>Apache Spark (PySpark)</strong> runs batch and streaming jobs against MongoDB events to produce high-value business intelligence.
          </p>
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 font-mono text-xs space-y-1 text-slate-300">
            <div className="text-amber-400 font-semibold">• Trending Velocity Formula</div>
            <div className="text-slate-400">• User Collaborative Filtering (Recommendations)</div>
            <div className="text-slate-400">• Outlier & High-Frequency Shill Bidding Scanner</div>
          </div>
        </div>

      </div>
    </div>
  );
};
