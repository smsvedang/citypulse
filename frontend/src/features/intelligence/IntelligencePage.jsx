'use client';

import { useEffect, useRef, useState } from 'react';

const events = [
  { id: 'evt_001', name: 'Heavy rain alert', source: 'weather', zone: 'Z04', severity: 0.82, time: '8 min ago', status: 'Observed', icon: '≈', color: 'blue' },
  { id: 'evt_002', name: 'Traffic incident cluster', source: 'traffic', zone: 'Z04', severity: 0.88, time: '2 min ago', status: 'Anomaly', icon: '!', color: 'red' },
  { id: 'evt_003', name: 'Bus route delays', source: 'transit', zone: 'Z04', severity: 0.54, time: '27 min ago', status: 'Observed', icon: '▤', color: 'yellow' },
  { id: 'evt_004', name: 'Road surface report', source: 'civic', zone: 'Z02', severity: 0.29, time: '32 min ago', status: 'Resolved', icon: '●', color: 'green' },
];

function buildEvidence(step, activeEvents) {
  const evidence = { zone: 'Z04', active_events: { total: activeEvents, by_type: {} }, anomalies: { detected: [], top_anomaly: null }, preceding_events: [], possible_correlations: [], confidence: step >= 2 ? 0.91 : 0.76, uncertainty: 'This is a synthetic replay. Correlation does not establish causation.' };
  if (step >= 1) { evidence.active_events.by_type.weather_alert = 1; evidence.preceding_events.push({ event_type: 'weather_alert', count: 1, time_window_minutes: 10 }); }
  if (step >= 2) { evidence.active_events.by_type.traffic_incident = 12; evidence.anomalies.detected.push({ event_type: 'traffic_incident', score: 2.4, threshold: 1.5 }); evidence.anomalies.top_anomaly = { event_type: 'traffic_incident', score: 2.4 }; evidence.possible_correlations.push({ metadata: { source_a: 'weather', source_b: 'traffic' }, time_gap_minutes: 8 }); }
  if (step >= 3) { evidence.active_events.by_type.transit_delay = 4; evidence.preceding_events.push({ event_type: 'transit_delay', count: 4, time_window_minutes: 30 }); }
  return evidence;
}

function deterministicSummary(evidence) {
  const anomaly = evidence.anomalies.detected.length > 0;
  return { headline: anomaly ? 'Traffic activity is above normal' : 'Weather signal detected in Zone 04', summary: anomaly ? 'A cluster of traffic incidents is developing in South Central.' : 'Synthetic weather signal queued for Zone 04.', details: anomaly ? `Zone ${evidence.zone}: ${evidence.active_events.total} active events. Traffic incidents are running at 2.4x the recent baseline.` : `Zone ${evidence.zone}: ${evidence.active_events.total} active events. A synthetic weather alert is being monitored.` };
}

export default function Dashboard() {
  const [activeEvents, setActiveEvents] = useState(17);
  const [replayStep, setReplayStep] = useState(0);
  const [replayRunning, setReplayRunning] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [selectedNav, setSelectedNav] = useState('Pulse');
  const [selectedLayer, setSelectedLayer] = useState('Pulse');
  const [selectedZone, setSelectedZone] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef(null);

  const evidence = buildEvidence(replayStep, activeEvents);
  const summary = deterministicSummary(evidence);
  const anomalyDetected = replayStep >= 2;

  useEffect(() => () => clearInterval(timerRef.current), []);

  function notify(message) {
    setToastMessage(message);
    window.clearTimeout(window.cityPulseToastTimer);
    window.cityPulseToastTimer = window.setTimeout(() => setToastMessage(''), 2800);
  }

  function runReplay() {
    if (replayRunning) { clearInterval(timerRef.current); setReplayRunning(false); notify('Demo replay paused'); return; }
    setReplayStep(0); setActiveEvents(17); setReplayRunning(true); notify('Replay ready: Synthetic weather signal queued.');
    let step = 0;
    timerRef.current = setInterval(() => {
      step += 1; setReplayStep(step); setActiveEvents(17 + step * 2);
      notify(['Weather alert injected into Zone 04 evidence trail.', 'Traffic anomaly detected: Score crossed 1.5x threshold.', 'Transit delay detected: Possible temporal relationship identified.'][step - 1]);
      if (step === 3) { clearInterval(timerRef.current); setReplayRunning(false); notify('Replay complete: Evidence is ready for review'); }
    }, 2000);
  }

  function refresh() { setRefreshing(true); notify('Dashboard refreshed from live feeds'); window.setTimeout(() => setRefreshing(false), 850); }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark"><span className="brand-pulse" /><span>city<span>pulse</span></span></div>
        <div className="workspace-label">OPERATIONS / LIVE</div>
        <nav className="nav-list" aria-label="Primary navigation">{['Pulse', 'Event stream', 'Zones', 'Reports'].map((item, index) => <button key={item} className={`nav-item ${selectedNav === item ? 'is-active' : ''}`} onClick={() => { setSelectedNav(item); notify(`${item} view selected`); }}><span className="nav-icon">{['◈', '⌁', '◌', '↗'][index]}</span>{item}{index === 0 && <span className="nav-count">04</span>}</button>)}</nav>
        <div className="sidebar-spacer" />
        <div className="system-card"><div className="system-card__top"><span className="status-dot" />All systems nominal</div><div className="system-card__sub">Last sync 12 seconds ago</div><div className="system-bar"><span /></div></div>
        <div className="user-row"><div className="avatar">RN</div><div><strong>R. Nirmaniya</strong><span>City operations</span></div><span className="more">•••</span></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="breadcrumb"><span>City operations</span><b>/</b><strong>Intelligence pulse</strong></div><div className="top-actions"><span className="live-indicator"><i /> Live feed</span><button className="icon-button" aria-label="Notifications">♧<span className="notification-dot" /></button><button className="avatar avatar--small">RN</button></div></header>
        <section className="page-heading"><div><p className="eyebrow">Wednesday, September 24, 2026 <span>•</span> 12:35 PM IST</p><h1>Good afternoon, Ridhima<span className="heading-mark">.</span></h1><p className="heading-copy">Here is what is shaping the city right now.</p></div><div className="heading-actions"><button className={`secondary-button ${refreshing ? 'is-loading' : ''}`} onClick={refresh}><span>↻</span>{refreshing ? 'Syncing' : 'Refresh'}</button><button className="primary-button" onClick={runReplay}><span>{replayRunning ? 'Ⅱ' : replayStep === 3 ? '↻' : '▶'}</span>{replayRunning ? 'Pause replay' : replayStep === 3 ? 'Replay again' : 'Run demo replay'}</button></div></section>

        <section className="metrics-grid" aria-label="City metrics"><MetricCard className="metric-card--warm" title="ACTIVE EVENTS" value={String(activeEvents).padStart(2, '0')} icon="✦" footer={<><span className="trend trend--up">↗ 18%</span><span>vs. 1 hour ago</span></>} /><MetricCard title="ANOMALIES DETECTED" value={anomalyDetected ? '01' : '00'} icon="△" footer={<><span className="pill pill--amber">{anomalyDetected ? 'Attention' : 'Clear'}</span><span>{anomalyDetected ? 'Traffic surge / Z04' : 'No active anomaly'}</span></>} /><MetricCard className="metric-card--mint" title="FEED HEALTH" value="98.4" suffix="%" icon="◎" footer={<><span className="trend trend--good">● Healthy</span><span>6 of 6 feeds</span></>} /><MetricCard title="PEOPLE IMPACTED" value="8.2" suffix="k" icon="♧" footer={<><span className="trend trend--neutral">→ Stable</span><span>estimated today</span></>} /></section>

        <section className="main-grid">
          <article className="panel map-panel"><PanelHeader kicker="SPATIAL OVERVIEW" title="Live city pulse"><div className="map-controls">{['Pulse', 'Events', 'Zones'].map(layer => <button key={layer} className={`map-control ${selectedLayer === layer ? 'is-selected' : ''}`} onClick={() => { setSelectedLayer(layer); notify(`${layer} layer selected`); }}>{layer}</button>)}</div></PanelHeader><div className="map-canvas"><div className="map-grid" /><div className="road road--one" /><div className="road road--two" /><div className="road road--three" /><div className="road road--four" /><div className="river" /><div className="zone-label zone-label--one">Z01<small>North bank</small></div><div className="zone-label zone-label--two">Z02<small>Old town</small></div><div className="zone-label zone-label--three">Z03<small>East market</small></div><div className="zone-label zone-label--four">Z04<small>South central</small></div>{[['Z04', 'pin--rain', '↯', '17'], ['Z01', 'pin--green', '●', '03'], ['Z02', 'pin--blue', '≋', '05'], ['Z03', 'pin--yellow', '!', '02']].map(([zone, pin, icon, count]) => <button key={zone} className={`map-pin ${pin} ${selectedZone === zone ? 'is-focused' : ''}`} onClick={() => { setSelectedZone(zone); notify(`${zone} selected on live pulse`); }}><span className="pin-ring" /><span className="pin-core">{icon}</span><strong>{count}</strong></button>)}<div className="map-legend"><span><i className="legend-dot legend-dot--red" /> Anomaly</span><span><i className="legend-dot legend-dot--green" /> Active</span><span><i className="legend-dot legend-dot--blue" /> Weather</span></div><div className="map-attribution">CITYPULSE BASEMAP <span>•</span> 12:35:18</div></div></article>
          <article className="panel situation-panel"><PanelHeader kicker="AI SITUATION BRIEF" title={<>Zone 04 <span className="zone-status">● Monitoring</span></>}><button className="more-button">•••</button></PanelHeader><div className="situation-headline"><span className="situation-mark">!</span><div><h3>{summary.headline}</h3><p>{summary.summary}</p></div></div><div className="confidence-row"><span>Confidence <strong>{Math.round(evidence.confidence * 100)}%</strong></span><div className="confidence-bar"><span style={{ width: `${evidence.confidence * 100}%` }} /></div><span className="confidence-label">High</span></div><BriefSection number="01" title="What happened"><p>{summary.details}</p></BriefSection><BriefSection number="02" title="Why it matters"><p>Travel times may be affected across the south corridor. Transit is monitoring downstream delays.</p></BriefSection><div className="brief-evidence"><div className="brief-title"><span className="brief-number">03</span><span>Evidence trail</span></div><div className="evidence-list"><span>Traffic incidents <b>12</b></span><span>Weather alert <b>01</b></span><span>Transit delays <b>04</b></span></div></div><div className="uncertainty"><span>◌</span><p>{evidence.uncertainty}</p></div></article>
        </section>

        <section className="lower-grid"><article className="panel activity-panel"><PanelHeader kicker="LAST 60 MINUTES" title="Event activity"><div className="chart-legend"><span><i className="legend-line legend-line--yellow" /> Current</span><span><i className="legend-line legend-line--gray" /> Baseline</span></div></PanelHeader><div className="chart-wrap"><div className="y-labels"><span>20</span><span>15</span><span>10</span><span>5</span><span>0</span></div><div className="chart"><div className="chart-lines"><i /><i /><i /><i /><i /></div><svg viewBox="0 0 760 180" preserveAspectRatio="none" aria-label="Event activity chart"><path className="area" d="M0,145 C55,150 65,132 105,137 S145,128 178,135 S220,112 255,120 S300,103 330,112 S370,90 400,108 S450,92 480,100 S520,75 550,84 S595,58 620,73 S665,20 700,38 S735,8 760,16 L760,180 L0,180 Z" /><path className="baseline" d="M0,145 C55,142 105,143 160,139 S270,136 330,132 S440,127 520,122 S650,116 760,110" /><path className="current" d="M0,145 C55,150 65,132 105,137 S145,128 178,135 S220,112 255,120 S300,103 330,112 S370,90 400,108 S450,92 480,100 S520,75 550,84 S595,58 620,73 S665,20 700,38 S735,8 760,16" /></svg><div className="x-labels"><span>11:35</span><span>11:50</span><span>12:05</span><span>12:20</span><span>12:35</span></div></div></div></article><FeedHealth /></section>
        <EventsTable />
        <footer className="footer-note"><span><i className="status-dot" /> Intelligence engine synced</span><span>Evidence generated before explanation <b>•</b> No causal claims</span></footer>
      </main>
      {toastMessage && <div className="toast is-visible"><span className="toast-icon">✓</span><span>{toastMessage}</span></div>}
    </div>
  );
}

function MetricCard({ className = '', title, value, suffix, icon, footer }) { return <article className={`metric-card ${className}`}><div className="metric-card__header"><span>{title}</span><span className="metric-icon">{icon}</span></div><div className="metric-value">{value}{suffix && <span>{suffix}</span>}</div><div className="metric-footer">{footer}</div></article>; }
function PanelHeader({ kicker, title, children }) { return <div className="panel-header"><div><span className="section-kicker">{kicker}</span><h2>{title}</h2></div>{children}</div>; }
function BriefSection({ number, title, children }) { return <div className="brief-section"><div className="brief-title"><span className="brief-number">{number}</span><span>{title}</span></div>{children}</div>; }
function FeedHealth() { return <article className="panel feeds-panel"><PanelHeader kicker="CONNECTIVITY" title="Feed health"><button className="text-button">View all <span>→</span></button></PanelHeader><div className="feed-list">{[['≈', 'feed-icon--rain', 'Weather service', 'Updated 2 min ago', 'Operational', 'feed-status--good'], ['⌁', 'feed-icon--road', 'Traffic network', 'Updated 30 sec ago', 'Operational', 'feed-status--good'], ['▤', 'feed-icon--train', 'Transit authority', 'Updated 4 min ago', 'Delayed', 'feed-status--warn'], ['♧', 'feed-icon--civic', 'Civic reports', 'Updated 1 min ago', 'Operational', 'feed-status--good']].map(([icon, color, name, update, status, statusColor]) => <div className="feed-row" key={name}><span className={`feed-icon ${color}`}>{icon}</span><div><strong>{name}</strong><small>{update}</small></div><span className={`feed-status ${statusColor}`}>{status}</span></div>)}</div></article>; }
function EventsTable() { return <section className="panel events-panel"><PanelHeader kicker="PROVENANCE LOG" title="Recent events"><div className="event-filters"><button className="filter-button is-active">All events <span>17</span></button><button className="filter-button">Anomalies <span>1</span></button><button className="text-button">Open event stream <span>→</span></button></div></PanelHeader><div className="table-wrap"><table><thead><tr><th>EVENT</th><th>SOURCE</th><th>ZONE</th><th>SEVERITY</th><th>REPORTED</th><th>STATUS</th></tr></thead><tbody>{events.map(event => <tr key={event.id}><td><span className={`table-icon table-icon--${event.color}`}>{event.icon}</span><strong>{event.name}</strong></td><td>{event.source}</td><td><span className="zone-tag">{event.zone}</span></td><td><span className="severity"><i style={{ width: `${event.severity * 100}%` }} /></span><b>{event.severity.toFixed(2)}</b></td><td>{event.time}</td><td><span className={`table-status ${event.status === 'Anomaly' ? 'table-status--alert' : ''}`}>{event.status}</span></td></tr>)}</tbody></table></div></section>; }