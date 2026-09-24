import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAlerts } from '../../lib/hooks';

export function AlertsPage() {
  const navigate = useNavigate();
  const { alerts, acknowledgeAlert } = useAlerts();
  const [filter, setFilter] = useState<'all' | 'active' | 'acknowledged'>('all');

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'all') return true;
    return a.status === filter;
  });

  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case 'high':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'medium':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Threshold Monitor</span>
          <h1 className="text-2xl font-black text-white">Civic Disruption Alerts</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time threshold breaches, multi-incident clusters, and operator notifications
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          {(['all', 'active', 'acknowledged'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-md font-semibold capitalize transition-all ${
                filter === tab
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab} ({alerts.filter((a) => tab === 'all' || a.status === tab).length})
            </button>
          ))}
        </div>
      </div>

      {filteredAlerts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl mx-auto mb-3">
            ✓
          </div>
          <h3 className="text-base font-bold text-white">No {filter !== 'all' ? filter : ''} alerts found</h3>
          <p className="text-xs text-slate-500 mt-1">
            System thresholds are within normal ranges.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-5 rounded-2xl border transition-all ${
                alert.status === 'active'
                  ? 'bg-slate-900 border-rose-500/30 shadow-lg shadow-rose-950/20'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border ${getSeverityStyle(
                      alert.severity
                    )}`}
                  >
                    {alert.severity} SEVERITY
                  </span>
                  <button
                    onClick={() => navigate(`/zone/${alert.zone_id}`)}
                    className="font-mono text-xs font-bold text-cyan-400 hover:underline"
                  >
                    {alert.zone_id}
                  </button>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                  <span>{new Date(alert.created_at).toLocaleTimeString()}</span>
                  <span className="capitalize px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {alert.status}
                  </span>
                </div>
              </div>

              <h2 className="text-base font-bold text-white mt-1">{alert.title}</h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{alert.body}</p>

              {/* Source refs / evidence links */}
              {alert.source_refs && (
                <div className="mt-3 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400">
                  {alert.source_refs.anomaly_ids?.length ? (
                    <div>
                      <span className="text-slate-500">Anomaly: </span>
                      <span className="font-mono text-amber-300">
                        {alert.source_refs.anomaly_ids.join(', ')}
                      </span>
                    </div>
                  ) : null}
                  {alert.source_refs.correlation_ids?.length ? (
                    <div>
                      <span className="text-slate-500">Correlation: </span>
                      <span className="font-mono text-cyan-300">
                        {alert.source_refs.correlation_ids.join(', ')}
                      </span>
                    </div>
                  ) : null}
                  {alert.source_refs.event_ids?.length ? (
                    <div>
                      <span className="text-slate-500">Evidence Events: </span>
                      <span className="font-mono text-slate-300">
                        {alert.source_refs.event_ids.join(', ')}
                      </span>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3">
                <button
                  onClick={() => navigate(`/zone/${alert.zone_id}`)}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  View Affected Zone &rarr;
                </button>
                {alert.status === 'active' && (
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors border border-slate-700"
                  >
                    Acknowledge Alert
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
