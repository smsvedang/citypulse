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
  const { zones } = useZones();
  const { events, loading: eventsLoading } = useEvents(100);
  const { alerts } = useAlerts();
  const { feedStatus, overallHealth } = useFeedStatus();
  const activeAlerts = alerts.filter((alert) => alert.status === 'active');
  const highSignals = events.filter((event) => Number(event.severity) >= 0.7);

  return (
    <div className="space-y-8">
      <PageHeading
        eyebrow="Live overview"
        title="The city, at a glance."
        description="Signals, pressure points, and reach across the monitored grid."
        action={<span className="last-sync"><span className="pulse-dot" /> Refreshing every few seconds</span>}
      />

      <section className="metric-grid">
        <Metric label="City pulse" value={overallHealth} detail={`${feedStatus.length || 0} feeds reporting`} tone={overallHealth === 'healthy' ? 'green' : 'amber'} />
        <Metric label="Active alerts" value={String(activeAlerts.length)} detail="Thresholds requiring attention" tone="red" />
        <Metric label="Live signals" value={String(events.length)} detail={`${highSignals.length} high-confidence signals`} tone="blue" />
        <Metric label="Monitored zones" value={String(zones.length)} detail="Jaipur civic grid" tone="gold" />
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

  useEffect(() => {
    window.sessionStorage.setItem('citypulse-demo-mode', String(demoMode));
  }, [demoMode]);

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
        {error && <p className="error-text">{error}</p>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Citizen</th>
                <th>Email</th>
                <th>Web</th>
                <th>Email</th>
                <th>Mode</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
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
        {!users.length && !error && <Empty text="No registered citizens yet" />}
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
