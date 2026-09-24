import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useZones, useEvents, useAnomalies, useCorrelations } from '../../lib/hooks';

export function ZoneDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { zones } = useZones();
  const { events } = useEvents(100);
  const { anomalies } = useAnomalies();
  const { correlations } = useCorrelations();

  // Normalize zone id (Z01..Z06 or 1..6)
  const normalizedId = id
    ? id.startsWith('Z')
      ? id
      : `Z0${id}`
    : 'Z04';

  const zone = zones.find((z) => z.id === normalizedId) || {
    id: normalizedId,
    name: `Zone ${normalizedId.replace('Z0', '')}`,
    center: { lat: 26.91, lng: 75.79 },
    baseline_config: { window_minutes: 60, threshold: 2.0 },
    status: 'Elevated',
    place: 'Jaipur Urban District',
    residents: '15,000',
  };

  const zoneEvents = events.filter((e) => e.location?.zone === normalizedId);
  const zoneAnomalies = anomalies.filter((a) => a.zone_id === normalizedId);
  const zoneCorrelations = correlations.filter((c) => c.zone_id === normalizedId || !c.zone_id);

  return (
    <div className="space-y-6">
      {/* Zone Switcher Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-black px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              {zone.id}
            </span>
            <h1 className="text-2xl font-extrabold text-white">{zone.name}</h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                zone.status === 'Critical'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {zone.status || 'Elevated'}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {zone.place || 'Jaipur Central Sector'} &middot; ~{zone.residents || '12,000'} Estimated Residents
          </p>
        </div>

        {/* Zone Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {zones.map((z) => (
            <button
              key={z.id}
              onClick={() => navigate(`/zone/${z.id}`)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                z.id === normalizedId
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {z.id}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Coordinates & Baseline Specs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs font-semibold text-slate-400 block mb-1">GEO CENTER</span>
          <div className="text-lg font-mono font-bold text-white">
            {zone.center?.lat?.toFixed(4)}, {zone.center?.lng?.toFixed(4)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Bounding Radius: 8km max resolution</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs font-semibold text-slate-400 block mb-1">BASELINE WINDOW</span>
          <div className="text-lg font-mono font-bold text-cyan-400">
            {zone.baseline_config?.window_minutes || 60} Minutes
          </div>
          <p className="text-xs text-slate-500 mt-1">Rolling historical reference period</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs font-semibold text-slate-400 block mb-1">ANOMALY THRESHOLD</span>
          <div className="text-lg font-mono font-bold text-amber-400">
            {zone.baseline_config?.threshold || 2.0}x Multiplier
          </div>
          <p className="text-xs text-slate-500 mt-1">Trigger score for automated alerts</p>
        </div>
      </div>

      {/* Active Anomalies & Correlations in this zone */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Anomalies Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <span className="text-rose-400">⚠️</span> Detected Anomalies ({zoneAnomalies.length})
            </h3>
            <span className="text-xs text-slate-500">Auto-scored by Intelligence Engine</span>
          </div>

          {zoneAnomalies.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-4 bg-slate-950/40 rounded-xl">
              No anomaly threshold exceeded in {zone.name}.
            </p>
          ) : (
            <div className="space-y-3">
              {zoneAnomalies.map((anom) => (
                <div key={anom.id} className="p-3 bg-slate-950/70 border border-rose-500/30 rounded-xl text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-rose-300 capitalize">{anom.event_type.replace('_', ' ')} Spike</span>
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold">
                      Score: {anom.score}x (vs 2.0x threshold)
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Detected at: {new Date(anom.detected_at).toLocaleTimeString()}
                  </p>
                  {anom.evidence && anom.evidence.length > 0 && (
                    <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                      <span className="text-slate-500">Evidence Events:</span>
                      <span className="font-mono text-cyan-400">{anom.evidence.join(', ')}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Correlations Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <span className="text-cyan-400">🔗</span> Cross-Signal Correlations ({zoneCorrelations.length})
            </h3>
            <span className="text-xs text-slate-500">Spatio-temporal analysis</span>
          </div>

          {zoneCorrelations.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-4 bg-slate-950/40 rounded-xl">
              No cross-domain correlations detected in this zone.
            </p>
          ) : (
            <div className="space-y-3">
              {zoneCorrelations.map((corr) => (
                <div key={corr.id} className="p-3 bg-slate-950/70 border border-cyan-500/30 rounded-xl text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-cyan-300">Correlated Disruptions</span>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                      {(corr.score * 100).toFixed(0)}% Confidence
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">{corr.interpretation}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>Time Gap: {corr.time_gap} min</span>
                    <span>Distance: {corr.distance} km</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Zone Events List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-base text-white mb-4">
          All Events in {zone.name} ({zoneEvents.length})
        </h3>
        {zoneEvents.length === 0 ? (
          <p className="text-xs text-slate-500 italic p-4 bg-slate-950/40 rounded-xl">
            No events currently registered in this zone.
          </p>
        ) : (
          <div className="divide-y divide-slate-800">
            {zoneEvents.map((evt) => (
              <div key={evt.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-cyan-400 font-bold">{evt.id}</span>
                  <span className="capitalize font-semibold text-white">{evt.type.replace('_', ' ')}</span>
                  <span className="text-slate-400">
                    {evt.metadata?.subtype || evt.metadata?.category || evt.metadata?.route_name || 'Standard reading'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-slate-400 font-mono">
                  <span>Sev: {(evt.severity * 10).toFixed(1)}/10</span>
                  <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
