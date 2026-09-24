import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useZones, useEvents, usePulse, useAlerts } from '../../lib/hooks';

export function LiveMapPage() {
  const navigate = useNavigate();
  const { zones } = useZones();
  const { events } = useEvents(50);
  const { pulse } = usePulse();
  const { alerts } = useAlerts();
  const [selectedZoneId, setSelectedZoneId] = useState('Z04');
  const [activeFilter, setActiveFilter] = useState('all');

  const selectedZone = zones.find((z) => z.id === selectedZoneId) || zones[3] || {
    id: 'Z04',
    name: 'Zone 4',
    status: 'Elevated',
    residents: '18,400',
    place: 'Riverside & Central Loop',
  };

  const zoneEvents = events.filter((e) => e.location?.zone === selectedZoneId);
  const filteredEvents = activeFilter === 'all'
    ? events
    : events.filter((e) => e.source === activeFilter);

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'weather': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'traffic': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'transit': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>CITY PULSE</span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              pulse?.status === 'Critical' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {pulse?.status || 'ELEVATED'}
            </span>
          </div>
          <div className="text-2xl font-black text-white">{pulse?.status || 'Elevated'}</div>
          <p className="text-xs text-slate-400 mt-1">
            Top focus area: <strong className="text-cyan-400">{pulse?.top_zone || 'Z04'}</strong>
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>ACTIVE SIGNALS</span>
            <span className="text-cyan-400 font-mono text-xs">LIVE</span>
          </div>
          <div className="text-2xl font-black text-white">{events.length}</div>
          <p className="text-xs text-slate-400 mt-1">Across {zones.length} monitored city zones</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>MOST AFFECTED</span>
            <span className="text-rose-400 font-bold text-xs">PRIORITY 1</span>
          </div>
          <div className="text-2xl font-black text-white">{selectedZone.name}</div>
          <p className="text-xs text-slate-400 mt-1">{zoneEvents.length} active disruptions reported</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>ACTIVE ALERTS</span>
            <span className="text-amber-400 font-mono text-xs">{alerts.length} Total</span>
          </div>
          <div className="text-2xl font-black text-white">{alerts.filter(a => a.status === 'active').length}</div>
          <p className="text-xs text-slate-400 mt-1">Triggered by threshold / correlation rules</p>
        </div>
      </div>

      {/* Main Grid: Interactive Map & Zone Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Zone Map (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Live Map</span>
              <h2 className="text-xl font-bold text-white">Jaipur City Civic Grid</h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"/> Critical</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"/> Elevated</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"/> Normal</span>
            </div>
          </div>

          {/* Interactive Visual Map Layout */}
          <div className="relative bg-slate-950/80 rounded-xl border border-slate-800 p-6 flex-1 min-h-[360px] flex items-center justify-center overflow-hidden">
            {/* Grid background effect */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

            {/* River feature */}
            <div className="absolute w-2 h-full bg-cyan-600/30 blur-[2px] rotate-12 left-1/2 -translate-x-1/2" />

            <div className="relative grid grid-cols-3 gap-4 w-full max-w-xl">
              {zones.map((zone) => {
                const zoneEvts = events.filter((e) => e.location?.zone === zone.id);
                const isSelected = zone.id === selectedZoneId;
                const isElevated = zone.status === 'Elevated' || zoneEvts.length >= 2;
                const isCritical = zone.status === 'Critical' || zoneEvts.length >= 4;

                const statusColor = isCritical
                  ? 'border-rose-500/60 bg-rose-950/30 text-rose-300 hover:border-rose-400'
                  : isElevated
                  ? 'border-amber-500/60 bg-amber-950/30 text-amber-300 hover:border-amber-400'
                  : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-cyan-500/50';

                return (
                  <button
                    key={zone.id}
                    onClick={() => setSelectedZoneId(zone.id)}
                    className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 group ${statusColor} ${
                      isSelected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950 scale-105 shadow-lg shadow-cyan-500/10' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-sm tracking-wider font-mono">{zone.id}</span>
                      {zoneEvts.length > 0 && (
                        <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-bold text-xs flex items-center justify-center animate-pulse">
                          {zoneEvts.length}
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-xs text-white group-hover:text-cyan-300 transition-colors">{zone.name}</div>
                    <div className="text-[11px] text-slate-400 truncate">{zone.place || 'Metro District'}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
            <span>Click any zone above to inspect or navigate to full breakdown.</span>
            <button
              onClick={() => navigate(`/zone/${selectedZoneId}`)}
              className="text-cyan-400 font-semibold hover:text-cyan-300 transition-colors flex items-center gap-1"
            >
              Open Full {selectedZone.name} Report &rarr;
            </button>
          </div>
        </div>

        {/* Selected Zone Quick Detail Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs font-bold text-cyan-400 tracking-wider uppercase font-mono">{selectedZone.id}</span>
                <h3 className="text-lg font-bold text-white">{selectedZone.name}</h3>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                selectedZone.status === 'Critical' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {selectedZone.status || 'Elevated'}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Location Profile</span>
                <p className="text-xs text-slate-200">{selectedZone.place || 'Central Urban Sector'}</p>
                <p className="text-[11px] text-slate-400 mt-1">Population: ~{selectedZone.residents || '15,000'} residents</p>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                  Active Signals ({zoneEvents.length})
                </span>
                {zoneEvents.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-950/40 rounded-lg">No current disruptions in this zone.</p>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {zoneEvents.map((evt) => (
                      <div key={evt.id} className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/70 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`px-1.5 py-0.5 rounded border text-[10px] uppercase font-bold ${getSourceBadgeColor(evt.source)}`}>
                            {evt.source}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Sev: {(evt.severity * 10).toFixed(1)}/10
                          </span>
                        </div>
                        <p className="font-semibold text-slate-200 capitalize">{evt.type.replace('_', ' ')}</p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {evt.metadata?.subtype || evt.metadata?.category || evt.metadata?.route_name || 'Active signal'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate(`/zone/${selectedZoneId}`)}
            className="w-full mt-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-md shadow-cyan-600/20"
          >
            Explore Zone Detail Page
          </button>
        </div>
      </div>

      {/* Activity Stream Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Activity Stream</span>
            <h3 className="text-lg font-bold text-white">Recent Civic Signal Ingestion</h3>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {['all', 'weather', 'traffic', 'transit'].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1 rounded-md font-medium capitalize transition-all ${
                  activeFilter === filter
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredEvents.slice(0, 6).map((evt) => (
            <div key={evt.id} className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${getSourceBadgeColor(evt.source)}`}>
                  {evt.source}
                </span>
                <span className="text-xs font-mono font-bold text-cyan-400">{evt.location?.zone}</span>
              </div>
              <h4 className="font-bold text-sm text-white capitalize">{evt.type.replace('_', ' ')}</h4>
              <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                {evt.metadata?.subtype || evt.metadata?.category || evt.metadata?.route_name || 'Standard sensor telemetry'}
              </p>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/80 pt-2 font-mono">
                <span>{new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span>Conf: {(evt.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
