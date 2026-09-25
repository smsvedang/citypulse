import React, { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAlerts } from '../../lib/hooks';

const VOLUNTEER_SESSION = 'citypulse-volunteer-session';
const VOLUNTEER_HEADERS = { 'x-volunteer-username': 'volunteer', 'x-volunteer-password': 'volunteer123' };

type VolunteerAlert = {
  id: string;
  title: string;
  body: string;
  severity: string;
  status: string;
  zone_id?: string;
  created_at?: string;
};

export function VolunteerLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (username === 'volunteer' && password === 'volunteer123') {
      window.sessionStorage.setItem(VOLUNTEER_SESSION, 'true');
      navigate('/volunteer/dashboard', { replace: true });
      return;
    }
    setError('Volunteer credentials were not accepted.');
  };

  return (
    <main className="admin-login min-h-screen bg-slate-950 px-5 py-10 text-slate-100 md:px-10">
      <div className="login-art">
        <div className="eyebrow">CITYPULSE / VOLUNTEER UNIT</div>
        <h1>Response ready<br /><em>for every alert.</em></h1>
        <p>Dispatch teams and read real-time civic updates across Jaipur.</p>
        <div className="signal-line" />
      </div>

      <form onSubmit={submit} className="login-form">
        <div className="eyebrow">Volunteer access</div>
        <h2>Field response sign in</h2>
        <p className="muted">Read-only access: volunteers receive civic alerts, while only the admin can publish or send new notices.</p>
        <label>
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
        </label>
        <label>
          Password
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
        </label>
        {error && <p role="alert" className="error-text">{error}</p>}
        <button className="button button-primary">Enter volunteer dashboard <span>↗</span></button>
        <small>Demo access: volunteer / volunteer123</small>
      </form>
    </main>
  );
}

export function VolunteerGuard() {
  return window.sessionStorage.getItem(VOLUNTEER_SESSION) === 'true' ? <VolunteerLayout /> : <Navigate to="/volunteer" replace />;
}

function VolunteerLayout() {
  const navigate = useNavigate();
  const { alerts } = useAlerts();
  const notificationCount = alerts.filter((alert) => alert.status === 'active').length;
  const navItems = [{ path: '/volunteer/dashboard', label: 'Alerts', icon: '⚑' }];

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <NavLink to="/volunteer/dashboard" className="brand">
          <span className="brand-mark">VP</span>
          <span>City<span>Pulse</span></span>
        </NavLink>
        <div className="sidebar-label">Volunteer response</div>
        <nav>
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => isActive ? 'side-link active' : 'side-link'}>
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="live-dot"><span /> All alerts live</div>
          <button className="side-link signout" onClick={() => { window.sessionStorage.removeItem(VOLUNTEER_SESSION); navigate('/'); }}>
            ↪ Sign out
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="eyebrow">JAIPUR / RESPONSE UNIT</span>
            <p>Volunteer operations centre</p>
          </div>
          <div className="topbar-status">
            <button type="button" aria-label="View notifications" className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-200">
              <span aria-hidden="true">🔔</span>
              <span>{notificationCount}</span>
            </button>
            <span className="pulse-dot" /> Live alert feed <span className="avatar">VR</span>
          </div>
        </header>
        <main className="admin-content"><Outlet /></main>
      </div>
    </div>
  );
}

export function VolunteerDashboardPage() {
  const { alerts } = useAlerts();
  const volunteerAlerts = alerts.filter((alert) => alert.status !== 'dismissed');

  return (
    <div className="space-y-8">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Volunteer control</span>
          <h1>Every alert, every team.</h1>
          <p>Read-only response view: volunteers receive alerts in real time, but the admin remains the only authority that can publish and send new notices.</p>
        </div>
      </div>

      <section className="metric-grid compact">
        <div className="metric-card blue"><span>Open alerts</span><strong>{String(volunteerAlerts.length)}</strong><small>Active field notices</small></div>
        <div className="metric-card green"><span>High priority</span><strong>{String(volunteerAlerts.filter((alert) => alert.severity === 'high').length)}</strong><small>Urgent dispatch items</small></div>
        <div className="metric-card gold"><span>Zones covered</span><strong>{String(new Set(volunteerAlerts.map((alert) => alert.zone_id || 'CITY')).size)}</strong><small>Monitored areas</small></div>
      </section>

      <section className="panel table-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Alert</th>
                <th>Zone</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {volunteerAlerts.map((alert: VolunteerAlert) => (
                <tr key={alert.id}>
                  <td>
                    <strong>{alert.title}</strong>
                    <small>{alert.body}</small>
                  </td>
                  <td>{alert.zone_id || 'CITY'}</td>
                  <td><Status active={alert.severity === 'high' || alert.severity === 'medium'} tone={alert.severity} /></td>
                  <td>{alert.status}</td>
                  <td>{alert.created_at ? new Date(alert.created_at).toLocaleString() : 'now'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Status({ active, tone }: { active: boolean; tone?: string }) {
  const className = `status ${active ? 'on' : ''} ${tone || ''}`;
  return <span className={className}><i />{active ? (tone === 'high' ? 'High' : tone === 'medium' ? 'Medium' : 'On') : 'Off'}</span>;
}
