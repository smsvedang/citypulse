import React, { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAlerts, useEvents, useFeedStatus, useZones } from '../../lib/hooks';
import { ThemeToggle } from '../../app/ThemeContext';

type AdminUser = { uid: string; email: string | null; displayName: string | null; emailOptIn: boolean; webOptIn: boolean; criticalOnly: boolean; updatedAt: string | null };
const ADMIN_SESSION = 'citypulse-admin-session';
const adminHeaders = { 'x-admin-username': 'admin', 'x-admin-password': 'admin123' };

type DemoResponse = {
  delivery?: {
    web?: { sent?: number; skipped?: boolean; demo?: boolean };
    email?: { sent?: number; skipped?: boolean; demo?: boolean };
  };
};

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (username === 'admin' && password === 'admin123') {
      window.sessionStorage.setItem(ADMIN_SESSION, 'true');
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    setError('The operations credentials were not accepted.');
  };

  return (
    <main className="admin-login">
      <div className="login-art">
        <div className="eyebrow">CITYPULSE / CONTROL ROOM</div>
        <h1>Read the city<br /><em>before it shifts.</em></h1>
        <p>Live civic intelligence for teams keeping Jaipur moving.</p>
        <div className="signal-line" />
      </div>
      <form onSubmit={submit} className="login-form">
        <ThemeToggle />
        <div className="eyebrow">Authorized access</div>
        <h2>Operations sign in</h2>
        <p className="muted">Use the operator account to open the live control room.</p>
        <label>
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
        </label>
        <label>
          Password
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
        </label>
        {error && <p role="alert" className="error-text">{error}</p>}
        <button className="button button-primary">Enter control room <span>↗</span></button>
        <small>Demo access: admin / admin123</small>
      </form>
    </main>
  );
}

export function AdminGuard() {
  return window.sessionStorage.getItem(ADMIN_SESSION) === 'true' ? <AdminLayout /> : <Navigate to="/admin" replace />;
}

function AdminLayout() {
  const navigate = useNavigate();
  const { alerts } = useAlerts();
  const notificationCount = alerts.filter((alert) => alert.status === 'active').length;
  const navItems = [
    { path: '/admin/dashboard', label: 'Overview', icon: '⌂' },
    { path: '/admin/messages', label: 'Zone messages', icon: '✦' },
    { path: '/admin/users', label: 'Audience', icon: '◎' },
  ];

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <NavLink to="/admin/dashboard" className="brand">
          <span className="brand-mark">CP</span>
          <span>City<span>Pulse</span></span>
        </NavLink>
        <div className="sidebar-label">Operations</div>
        <nav>
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => (isActive ? 'side-link active' : 'side-link')}>
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="live-dot"><span /> All systems live</div>
          <button className="side-link signout" onClick={() => { window.sessionStorage.removeItem(ADMIN_SESSION); navigate('/'); }}>
            ↪ Sign out
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="eyebrow">JAIPUR METRO / OPERATIONS</span>
            <p>Friday, 25 September 2026</p>
          </div>
          <div className="topbar-status">
            <NavLink
              to="/admin/messages"
              aria-label="View notifications"
              className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-200 transition hover:border-cyan-500/50 hover:text-white"
            >
              <span aria-hidden="true">🔔</span>
              <span>{notificationCount}</span>
            </NavLink>
            <ThemeToggle />
            <span className="pulse-dot" /> Live data stream <span className="avatar">OP</span>
          </div>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { zones } = useZones();
  const { events } = useEvents(100);
  const { alerts } = useAlerts();
  const { feedStatus, overallHealth } = useFeedStatus();
  const activeAlerts = alerts.filter((alert) => alert.status === 'active');
  const highSignals = events.filter((event) => Number(event.severity) >= 0.7);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [demoMode, setDemoMode] = useState<boolean>(() => {
    const stored = window.sessionStorage.getItem('citypulse-demo-mode');
    return stored === null ? true : stored === 'true';
  });
  const [manualType, setManualType] = useState<'weather' | 'traffic'>('weather');
  const [manualZoneId, setManualZoneId] = useState(zones[0]?.id || 'ZONE-1');
  const [manualTitle, setManualTitle] = useState('Heavy rain alert');
  const [manualBody, setManualBody] = useState('Waterlogging is affecting the main corridor. Please allow extra travel time.');
  const [manualSeverity, setManualSeverity] = useState<number>(0.8);
  const [manualBusy, setManualBusy] = useState(false);
  const [manualMessage, setManualMessage] = useState('');

  const incidentQueue = [
    { title: 'Waterlogging near Ring Road', zone: 'ZONE-4', severity: 'High', status: 'Dispatching team', delta: '12 min ago' },
    { title: 'Traffic gridlock on Amber Avenue', zone: 'ZONE-2', severity: 'Medium', status: 'Reroute active', delta: '7 min ago' },
    { title: 'Metro platform crowding', zone: 'ZONE-1', severity: 'Medium', status: 'Monitoring', delta: '3 min ago' },
    { title: 'Wind advisory for north belt', zone: 'ZONE-5', severity: 'Low', status: 'Alert broadcast', delta: '2 min ago' },
  ];

  const managementCards = [
    { name: 'Zone operations', detail: '6 districts active', value: '94%', tone: 'cyan' },
    { name: 'Volunteer network', detail: '42 field members', value: '7 teams', tone: 'emerald' },
    { name: 'Public sendouts', detail: '3 channels', value: '2.4k users', tone: 'amber' },
  ];

  const healthRows = [
    { name: 'Weather feeds', value: 92, tone: 'cyan' },
    { name: 'Traffic flow', value: 74, tone: 'amber' },
    { name: 'Transit sensors', value: 88, tone: 'green' },
    { name: 'Citizen reach', value: 81, tone: 'red' },
  ];

  useEffect(() => {
    window.sessionStorage.setItem('citypulse-demo-mode', String(demoMode));
  }, [demoMode]);

  useEffect(() => {
    if (zones.length && !zones.some((zone) => zone.id === manualZoneId)) {
      setManualZoneId(zones[0].id);
    }
  }, [manualZoneId, zones]);

  const actions = [
    { label: 'Open alert board', onClick: () => navigate('/admin/messages') },
    { label: 'Review citizens', onClick: () => navigate('/admin/users') },
    { label: 'Refresh now', onClick: () => setLastUpdated(new Date()) },
    { label: demoMode ? 'Demo mode on' : 'Live mode on', onClick: () => setDemoMode((value) => !value) },
  ];

  const submitManualUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    setManualBusy(true);
    setManualMessage('');

    try {
      const zone = zones.find((item) => item.id === manualZoneId) || zones[0];
      if (!zone) {
        throw new Error('No zones are available to attach this update to.');
      }

      const payload = {
        source: manualType,
        type: manualType === 'weather' ? 'weather_alert' : 'traffic_incident',
        severity: Number(manualSeverity),
        confidence: 0.88,
        location: {
          lat: zone.center?.lat ?? 26.9124,
          lng: zone.center?.lng ?? 75.7873,
          zone: zone.id,
        },
        timestamp: new Date().toISOString(),
        metadata: {
          manual: true,
          title: manualTitle.trim() || (manualType === 'weather' ? 'Weather update' : 'Traffic update'),
          message: manualBody.trim() || 'Manual civic update logged by admin.',
          subtype: manualType === 'weather' ? 'manual_weather' : 'manual_traffic',
        },
      };

      const response = await api<{ data?: { accepted?: unknown[]; rejected?: unknown[] } }>('/api/events', {
        method: 'POST',
        headers: { ...adminHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const acceptedCount = (response?.data?.accepted ?? response?.accepted ?? []).length;
      const statusLabel = manualType === 'weather' ? 'Weather' : 'Traffic';
      setManualMessage(`${statusLabel} update added successfully for ${zone.id}. ${acceptedCount} event(s) recorded.`);
      setManualTitle(manualType === 'weather' ? 'Heavy rain alert' : 'Traffic disruption alert');
      setManualBody(manualType === 'weather' ? 'Waterlogging is affecting the main corridor. Please allow extra travel time.' : 'Traffic is slowed near the key corridor. Consider alternate routes.');
      setLastUpdated(new Date());
    } catch (reason) {
      setManualMessage(reason instanceof Error ? reason.message : 'Manual update could not be posted.');
    } finally {
      setManualBusy(false);
    }
  };

  return (
    <div className="ops-suite">
      <PageHeading
        eyebrow="Command center"
        title="The city, under control."
        description="Monitor signals, coordinate response, and push precise civic updates across every district."
        action={
          <div className="ops-header-actions">
            <span className="last-sync"><span className="pulse-dot" /> Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <button type="button" className="dashboard-ghost-button" onClick={() => setLastUpdated(new Date())}>Refresh</button>
          </div>
        }
      />

      <section className="metric-grid">
        <Metric label="City pulse" value={overallHealth} detail={`${feedStatus.length || 0} feeds reporting`} tone={overallHealth === 'healthy' ? 'green' : 'amber'} />
        <Metric label="Active alerts" value={String(activeAlerts.length)} detail="Thresholds requiring attention" tone="red" />
        <Metric label="Live signals" value={String(events.length)} detail={`${highSignals.length} high-confidence signals`} tone="blue" />
        <Metric label="Monitored zones" value={String(zones.length)} detail="Jaipur civic grid" tone="gold" />
      </section>

      <section className="panel">
        <PanelHeader title="Operations shortcuts" meta="Fast access" />
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-500 hover:text-white"
            >
              {action.label}
            </button>
          ))}
        </div>
      </section>

      <section className="ops-boards">
        <div className="panel ops-panel">
          <PanelHeader title="Priority incident board" meta="Live queue" />
          <div className="ops-incident-list">
            {incidentQueue.map((item) => (
              <div key={item.title} className="ops-incident-item">
                <div className="ops-incident-copy">
                  <strong>{item.title}</strong>
                  <small>{item.zone} · {item.delta}</small>
                </div>
                <div className="ops-incident-meta">
                  <span className={`priority-pill ${item.severity.toLowerCase()}`}>{item.severity}</span>
                  <small>{item.status}</small>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel ops-panel">
          <PanelHeader title="Operational health" meta="Cross-domain" />
          <div className="health-stack">
            {healthRows.map((row) => (
              <div key={row.name} className="health-row">
                <div className="health-label-row">
                  <span>{row.name}</span>
                  <strong>{row.value}%</strong>
                </div>
                <div className="health-bar-track">
                  <span className={`health-bar ${row.tone}`} style={{ width: `${row.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ops-management-grid">
        <div className="panel">
          <PanelHeader title="Zone operations" meta="6 districts" />
          <div className="resource-list">
            {zones.slice(0, 4).map((zone) => (
              <div key={zone.id} className="resource-row">
                <div>
                  <strong>{zone.name}</strong>
                  <small>{zone.id}</small>
                </div>
                <span>{zone.place || 'Urban district'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <PanelHeader title="Response teams" meta="Dispatch" />
          <div className="resource-list">
            {[
              ['Field unit 14', 'On route'],
              ['Traffic control', 'Active'],
              ['Medical desk', 'Monitoring'],
              ['Transit ops', 'Ready'],
            ].map(([name, status]) => (
              <div key={name} className="resource-row">
                <div>
                  <strong>{name}</strong>
                  <small>Jaipur dispatch</small>
                </div>
                <span className="status-badge">{status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <PanelHeader title="Public comms" meta="Delivery" />
          <div className="resource-list">
            {managementCards.map((card) => (
              <div key={card.name} className="resource-row accent-row">
                <div>
                  <strong>{card.name}</strong>
                  <small>{card.detail}</small>
                </div>
                <span className={`resource-value ${card.tone}`}>{card.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <PanelHeader title="Manual civic update" meta="Add live feed input" />
        <form onSubmit={submitManualUpdate} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              Update type
              <select value={manualType} onChange={(event) => setManualType(event.target.value as 'weather' | 'traffic')}>
                <option value="weather">Weather</option>
                <option value="traffic">Traffic</option>
              </select>
            </label>

            <label>
              Zone
              <select value={manualZoneId} onChange={(event) => setManualZoneId(event.target.value)}>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>{zone.id} · {zone.name}</option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Title
            <input value={manualTitle} onChange={(event) => setManualTitle(event.target.value)} placeholder={manualType === 'weather' ? 'Heavy rain alert' : 'Traffic disruption alert'} required />
          </label>

          <label>
            Details
            <textarea value={manualBody} onChange={(event) => setManualBody(event.target.value)} rows={4} placeholder="Add the operational details for residents or volunteers." required />
          </label>

          <label>
            Severity ({manualSeverity.toFixed(2)})
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={manualSeverity}
              onChange={(event) => setManualSeverity(Number(event.target.value))}
            />
          </label>

          {manualMessage && <p className={manualMessage.includes('successfully') || manualMessage.includes('recorded') ? 'success-text' : 'error-text'}>{manualMessage}</p>}
          <button type="submit" disabled={manualBusy} className="button button-primary">{manualBusy ? 'Posting update...' : `Add ${manualType} update ↗`}</button>
        </form>
      </section>
    </div>
  );
}

export function AdminMessagesPage() {
  const { zones } = useZones();
  const { alerts } = useAlerts();
  const [zoneId, setZoneId] = useState('CITY');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [web, setWeb] = useState(true);
  const [email, setEmail] = useState(true);
  const [volunteer, setVolunteer] = useState(false);
  const [demoMode, setDemoMode] = useState<boolean>(() => {
    const stored = window.sessionStorage.getItem('citypulse-demo-mode');
    return stored === null ? true : stored === 'true';
  });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const messageTemplates = [
    {
      label: 'Weather alert',
      title: 'Heavy rain affecting commute routes',
      body: 'Slow-moving rain is reducing visibility and increasing water accumulation near major corridors. Residents should avoid low-lying routes and allow extra travel time.',
      zone: 'CITY',
    },
    {
      label: 'Traffic reroute',
      title: 'Traffic diversion active on the ring road',
      body: 'Authorities have rerouted traffic around the ring road due to congestion and roadwork. Please expect slower travel for the next 45 minutes.',
      zone: 'ZONE-4',
    },
    {
      label: 'Transit update',
      title: 'Metro headway reduced due to weather delay',
      body: 'Train frequency is temporarily reduced while operations stabilize after the weather impact. Follow agent instructions and expect minor delays.',
      zone: 'ZONE-2',
    },
  ];

  useEffect(() => {
    window.sessionStorage.setItem('citypulse-demo-mode', String(demoMode));
  }, [demoMode]);

  const applyTemplate = (template: (typeof messageTemplates)[number]) => {
    setZoneId(template.zone);
    setTitle(template.title);
    setBody(template.body);
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setResult('');

    try {
      const response = await api<DemoResponse>('/api/notifications/messages', {
        method: 'POST',
        headers: { ...adminHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zoneId,
          title,
          body,
          channels: [web && 'web', email && 'email', demoMode && volunteer && 'volunteer'].filter(Boolean),
          demoMode,
        }),
      });

      const delivery = response?.delivery || response?.data?.delivery;
      const formatChannel = (channel: any) => {
        if (!channel) return 'unavailable';
        if (channel.demo) return `demo ${channel.sent ?? 0} sent`;
        if (channel.skipped) return 'unavailable';
        return `${channel.sent ?? 0} sent`;
      };

      setResult(`Message published. Web: ${formatChannel(delivery?.web)} · Email: ${formatChannel(delivery?.email)}${delivery?.volunteer ? ` · Volunteer: ${formatChannel(delivery.volunteer)}` : ''}`);
      setTitle('');
      setBody('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Message could not be sent.');
    } finally {
      setBusy(false);
    }
  };

  const messages = alerts.filter((alert) => alert.source_refs?.operator).slice(0, 6);

  return (
    <div className="space-y-8">
      <PageHeading
        eyebrow="Reach the city"
        title="Send a zone message."
        description="Admin-only publishing: send alerts and updates to citizens and volunteer recipients from this control panel."
      />

      <section className="message-layout">
        <form className="panel message-form" onSubmit={send}>
          <PanelHeader title="Compose notice" meta={demoMode ? 'Demo delivery enabled' : 'Live delivery mode'} />

          <div className="mb-4 flex flex-wrap gap-2">
            {messageTemplates.map((template) => (
              <button
                key={template.label}
                type="button"
                onClick={() => applyTemplate(template)}
                className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition hover:border-cyan-500 hover:text-white"
              >
                {template.label}
              </button>
            ))}
          </div>

          <label>
            Audience
            <select value={zoneId} onChange={(event) => setZoneId(event.target.value)}>
              <option value="CITY">All monitored zones</option>
              {zones.map((zone) => (
                <option value={zone.id} key={zone.id}>{zone.id} · {zone.name}</option>
              ))}
            </select>
          </label>

          <label>
            Headline
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Waterlogging reported near Zone 4" required />
          </label>

          <label>
            Message
            <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Give residents the useful next step..." rows={5} required />
          </label>

          <div className="channel-options">
            <span>Delivery channels</span>
            <label className="check"><input type="checkbox" checked={web} onChange={(event) => setWeb(event.target.checked)} /> Web push</label>
            <label className="check"><input type="checkbox" checked={email} onChange={(event) => setEmail(event.target.checked)} /> Email</label>
            <label className="check"><input type="checkbox" checked={volunteer} onChange={(event) => setVolunteer(event.target.checked)} /> Volunteer</label>
            <label className="check"><input type="checkbox" checked={demoMode} onChange={(event) => setDemoMode(event.target.checked)} /> Demo mode</label>
          </div>

          {error && <p className="error-text">{error}</p>}
          {result && <p className="success-text">{result}</p>}
          <button disabled={busy || (!web && !email && !volunteer)} className="button button-primary">{busy ? 'Publishing...' : 'Publish message ↗'}</button>
        </form>

        <div className="panel message-guide">
          <span className="eyebrow">Delivery logic</span>
          <h2>Be precise, stay useful.</h2>
          <p>Messages are stored as live alerts for the selected zone. Registered browser tokens receive FCM push when configured; opted-in addresses receive SMTP email when configured.</p>
          <div className="guide-rule" />
          <div>
            <small>Current audience</small>
            <strong>{zoneId === 'CITY' ? 'All monitored zones' : zones.find((zone) => zone.id === zoneId)?.name || zoneId}</strong>
          </div>
          <div>
            <small>Recent operator posts</small>
            {messages.length ? (
              <ul className="mini-list">{messages.map((message) => <li key={message.id}>{message.title}</li>)}</ul>
            ) : (
              <p>No operator posts yet</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export function AdminUsersPage() {
  const demoUsers: AdminUser[] = [
    { uid: 'demo-user-1', email: 'ravi@jaipur.local', displayName: 'Ravi Sharma', emailOptIn: true, webOptIn: true, criticalOnly: false, updatedAt: new Date().toISOString() },
    { uid: 'demo-user-2', email: 'meera@jaipur.local', displayName: 'Meera Singh', emailOptIn: true, webOptIn: true, criticalOnly: true, updatedAt: new Date().toISOString() },
    { uid: 'demo-user-3', email: 'aakash@jaipur.local', displayName: 'Aakash Verma', emailOptIn: false, webOptIn: true, criticalOnly: false, updatedAt: new Date().toISOString() },
  ];

  const [demoMode, setDemoMode] = useState<boolean>(() => {
    const stored = window.sessionStorage.getItem('citypulse-demo-mode');
    return stored === null ? true : stored === 'true';
  });
  const [users, setUsers] = useState<AdminUser[]>(demoMode ? demoUsers : []);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'web' | 'email' | 'critical'>('all');

  useEffect(() => {
    if (demoMode) {
      setUsers(demoUsers);
      setError('');
      return;
    }

    api<AdminUser[]>('/api/admin/users', { headers: adminHeaders })
      .then(setUsers)
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Audience unavailable.'));
  }, [demoMode]);

  const visibleUsers = users.filter((user) => {
    const matchesQuery = `${user.displayName || ''} ${user.email || ''}`.toLowerCase().includes(query.trim().toLowerCase());
    if (!matchesQuery) return false;
    if (filter === 'web') return user.webOptIn;
    if (filter === 'email') return user.emailOptIn;
    if (filter === 'critical') return user.criticalOnly;
    return true;
  });

  const exportAudience = () => {
    const rows = [
      ['Name', 'Email', 'Web', 'Email Opt-in', 'Critical Only', 'Updated At'],
      ...users.map((user) => [
        user.displayName || 'Unnamed citizen',
        user.email || '',
        user.webOptIn ? 'yes' : 'no',
        user.emailOptIn ? 'yes' : 'no',
        user.criticalOnly ? 'yes' : 'no',
        user.updatedAt || '',
      ]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'citypulse-audience.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <PageHeading
        eyebrow="Audience"
        title="Know who you can reach."
        description="Citizen accounts joined with browser, email, and critical-alert preferences."
        action={<button className="button button-secondary" onClick={() => setDemoMode((value) => !value)}>{demoMode ? 'Demo data on' : 'Live data on'}</button>}
      />

      <section className="metric-grid compact">
        <Metric label="Registered citizens" value={String(users.length)} detail="Active accounts" tone="blue" />
        <Metric label="Web reachable" value={String(users.filter((user) => user.webOptIn).length)} detail="Browser push enabled" tone="green" />
        <Metric label="Email opted in" value={String(users.filter((user) => user.emailOptIn).length)} detail="Email delivery audience" tone="gold" />
      </section>

      <section className="panel table-panel">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search citizen or email"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 md:max-w-xs"
          />
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'web', 'email', 'critical'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${filter === option ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-300'}`}
              >
                {option}
              </button>
            ))}
            <button type="button" onClick={exportAudience} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-cyan-500 hover:text-white">
              Export CSV
            </button>
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Citizen</th>
                <th>Email</th>
                <th>Web</th>
                <th>Delivery</th>
                <th>Mode</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((user) => (
                <tr key={user.uid}>
                  <td>
                    <strong>{user.displayName || 'Unnamed citizen'}</strong>
                    <small>{user.uid.slice(0, 12)}...</small>
                  </td>
                  <td>{user.email || 'Not provided'}</td>
                  <td><Status active={user.webOptIn} /></td>
                  <td><Status active={user.emailOptIn} /></td>
                  <td>{user.criticalOnly ? 'Critical only' : 'All alerts'}</td>
                  <td>{user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visibleUsers.length && !error && <Empty text="No matching citizens found" />}
      </section>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function PanelHeader({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="panel-header">
      <h2>{title}</h2>
      <span>{meta}</span>
    </div>
  );
}

function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return (
    <div className={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function Status({ active }: { active: boolean }) {
  return <span className={`status ${active ? 'on' : ''}`}><i />{active ? 'On' : 'Off'}</span>;
}

function Empty({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}
