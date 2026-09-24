import React from 'react';
import { useFeedStatus } from '../../lib/hooks';

export function FeedStatusPage() {
  const { feedStatus, overallHealth, refresh } = useFeedStatus();

  const getStatusBadge = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'delayed':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'degraded':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
      default:
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Telemetry Health</span>
          <h1 className="text-2xl font-black text-white">Ingestion Feed Status</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time feed health checks, latencies, failure counters, and graceful degradation monitoring
          </p>
        </div>
        <button
          onClick={refresh}
          className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors border border-slate-700 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>↻</span> Refresh Telemetry
        </button>
      </div>

      {/* Overall Status Banner */}
      <div
        className={`p-5 rounded-2xl border flex items-center justify-between ${
          overallHealth === 'healthy'
            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
            : overallHealth === 'delayed'
            ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
            : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">
            {overallHealth === 'healthy' ? '🟢' : overallHealth === 'delayed' ? '🟡' : '🔴'}
          </span>
          <div>
            <h3 className="font-bold text-base capitalize">Overall Telemetry: {overallHealth}</h3>
            <p className="text-xs opacity-80 mt-0.5">
              {overallHealth === 'healthy'
                ? 'All civic data adapters are operating within SLA latency and error thresholds.'
                : 'Degraded or delayed signals observed. Dashboard is continuing to serve cached readings gracefully.'}
            </p>
          </div>
        </div>
        <span className="font-mono text-xs font-bold uppercase px-3 py-1 rounded-full bg-slate-950/60 border border-slate-800">
          Jaipur Gateway
        </span>
      </div>

      {/* Feeds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {feedStatus.map((feed) => (
          <div key={feed.source} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="font-extrabold text-base text-white capitalize">{feed.source}</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${getStatusBadge(
                  feed.health
                )}`}
              >
                {feed.health}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">Latency:</span>
                <span className="font-mono font-bold text-slate-200">{feed.latency_ms || 120} ms</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">Mode:</span>
                <span className="font-mono text-cyan-400 capitalize">{feed.mode || 'synthetic'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">Error Count:</span>
                <span className="font-mono text-slate-200">{feed.error_count || 0}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Last Success:</span>
                <span className="font-mono text-slate-400 text-[11px]">
                  {feed.last_success
                    ? new Date(feed.last_success).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : 'Just now'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reliability Rule Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-sm text-white mb-2">CityPulse Fault Tolerance Principles</h3>
        <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
          <li><strong>Graceful Degradation:</strong> One failed feed will never crash the dashboard.</li>
          <li><strong>Confidence Weighting:</strong> Stale or delayed data is decayed with a lower confidence multiplier.</li>
          <li><strong>Live Recomputation:</strong> Feed health is dynamically evaluated on read, detecting stopped schedulers.</li>
        </ul>
      </div>
    </div>
  );
}
