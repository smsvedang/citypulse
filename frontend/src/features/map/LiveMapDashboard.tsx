import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAlerts, useEvents, usePulse, useZones } from '../../lib/hooks';
import { RealMap } from '../../components/RealMap';

export function LiveMapDashboard() {
  const navigate = useNavigate();
  const { zones } = useZones();
  const { events } = useEvents(80);
  const { pulse } = usePulse();
  const { alerts } = useAlerts();
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [filter, setFilter] = useState('all');

  const selectedZone = zones.find((zone) => zone.id === selectedZoneId) || zones[0];
  const zoneEvents = events.filter((event) => event.location?.zone === selectedZone?.id);
  const visibleEvents = filter === 'all' ? events : events.filter((event) => event.source === filter);
  const status = pulse?.status || 'Monitoring';
  const alertCount = alerts.filter((alert) => alert.status === 'active').length;

  return (
    <div className="citizen-dashboard">
      <section className="citizen-hero">
        <div>
          <span className="citizen-kicker">JAIPUR METRO / LIVE BRIEFING</span>
          <h1>What is happening<br /><em>around you.</em></h1>
          <p>CityPulse turns weather, traffic, and transit signals into one clear view of your city.</p>
        </div>
        <div className="pulse-summary">
          <span>City pulse</span>
          <strong>{status}</strong>
          <small>{pulse?.top_zone ? `Focus: ${pulse.top_zone}` : 'Watching the civic grid now'}</small>
        </div>
      </section>

      <section className="citizen-stats">
        <Stat label="Signals now" value={events.length} detail="last 60 minutes" />
        <Stat label="Active alerts" value={alertCount} detail="need your attention" />
        <Stat label="Monitored zones" value={zones.length} detail="across Jaipur" />
        <Stat label="Top zone" value={pulse?.top_zone || selectedZone?.id || '—'} detail="highest current pressure" />
      </section>

      <section className="citizen-map-layout">
        <div className="citizen-map-panel">
          <div className="citizen-panel-head">
            <div>
              <span className="citizen-kicker">LIVE MAP</span>
              <h2>See the grid in motion.</h2>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="View notifications" className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-200">
                <span aria-hidden="true">🔔</span>
                <span>{events.length}</span>
              </button>
              <span className="map-legend"><i className="critical" /> critical <i className="elevated" /> elevated <i className="normal" /> normal</span>
            </div>
          </div>
          <div className="citizen-map">
            <RealMap zones={zones} events={events} selectedZoneId={selectedZoneId} onSelect={setSelectedZoneId} />
          </div>
          <div className="map-foot">
            <span>Select a zone to inspect its latest signals.</span>
            {selectedZone && <button onClick={() => navigate(`/citizen/zone/${selectedZone.id}`)}>Open {selectedZone.name} report ↗</button>}
          </div>
        </div>

        <aside className="zone-brief">
          <span className="citizen-kicker">SELECTED ZONE</span>
          <div className="zone-brief-title">
            <h2>{selectedZone?.name || 'Choose a zone'}</h2>
            <span>{selectedZone?.id || '—'}</span>
          </div>
          {selectedZone ? (
            <>
              <p>{selectedZone.place || 'Civic monitoring area'}<br /><small>{zoneEvents.length} current signals detected</small></p>
              <div className="mini-signals">
                {zoneEvents.slice(0, 3).map((event) => (
                  <div key={event.id}>
                    <strong>{event.title || event.type || 'Signal'}</strong>
                    <small>{event.description || event.source || 'System update'}</small>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p>No zone selected yet.</p>
          )}
        </aside>
      </section>

      <section className="activity-panel">
        <div className="citizen-panel-head">
          <div>
            <span className="citizen-kicker">SIGNAL STREAM</span>
            <h2>Recent civic activity</h2>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="View notifications" className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-200">
              <span aria-hidden="true">🔔</span>
              <span>{visibleEvents.length}</span>
            </button>
            <div className="filter-tabs">
              <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
              <button className={filter === 'weather' ? 'active' : ''} onClick={() => setFilter('weather')}>Weather</button>
              <button className={filter === 'traffic' ? 'active' : ''} onClick={() => setFilter('traffic')}>Traffic</button>
              <button className={filter === 'transit' ? 'active' : ''} onClick={() => setFilter('transit')}>Transit</button>
            </div>
          </div>
        </div>

        <div className="activity-grid">
          {visibleEvents.length > 0 ? (
            visibleEvents.slice(0, 6).map((event) => (
              <article key={event.id}>
                <h3>{event.title || event.type || 'System event'}</h3>
                <p>{event.description || event.body || 'Civic update logged.'}</p>
                <footer>
                  <span>{event.source || 'System'}</span>
                  <small>{event.location?.zone || event.zone_id || 'CITY'} • {event.created_at ? new Date(event.created_at).toLocaleString() : 'now'}</small>
                </footer>
              </article>
            ))
          ) : (
            <article className="empty-state">
              <h3>No civic activity</h3>
              <p>Signals will appear once monitoring reports are active.</p>
            </article>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
