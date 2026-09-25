import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../../app/ThemeContext';

export function RoleChooserPage() {
  const navigate = useNavigate();
  const demoMode = window.sessionStorage.getItem('citypulse-demo-mode') === 'true';

  const workspaceCards = [
    {
      tone: 'citizen',
      icon: '◉',
      label: 'Citizen panel',
      text: 'See live city conditions, local alerts, and neighborhood-based recommendations in one place.',
      cta: 'Enter citizen panel',
      action: () => navigate('/citizen'),
      metrics: ['18 live signals', '4 alert channels'],
    },
    {
      tone: 'volunteer',
      icon: '✦',
      label: 'Volunteer board',
      text: 'Coordinate field response, monitor evolving incidents, and stay aligned with public guidance.',
      cta: 'Open volunteer board',
      action: () => navigate('/volunteer'),
      metrics: ['12 teams online', '3 urgent areas'],
    },
    {
      tone: 'admin',
      icon: '▣',
      label: 'Admin dashboard',
      text: 'Operate the city command center with analytics, dispatch oversight, and fast civic messaging.',
      cta: 'Admin sign in',
      action: () => navigate('/admin'),
      metrics: ['6 district feeds', '1 live control room'],
    },
  ];

  return (
    <main className="role-chooser-page">
      <div className="role-chooser-shell">
        <header className="role-topbar">
          <div className="role-brand-row">
            <span className="brand-mark">CP</span>
            <div>
              <span className="eyebrow">CityPulse</span>
              <strong>civic intelligence</strong>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <section className="role-hero">
          <div className="role-hero-copy">
            <span className="eyebrow">LIVE CIVIC OPS / JAIPUR METRO</span>
            <h1>Turn city noise into confident action.</h1>
            <p>
              CityPulse brings together weather, traffic, transit, incident intelligence, and public communication into
              one command platform built for fast, informed decisions.
            </p>

            <div className="role-badges">
              <span>Real-time visibility</span>
              <span>Multi-role command</span>
              <span>{demoMode ? 'Demo synced' : 'Live operations'}</span>
            </div>
          </div>

          <div className="role-hero-panel">
            <div className="mini-grid">
              <div>
                <span>City pulse</span>
                <strong>Stable</strong>
                <small>89% system health</small>
              </div>
              <div>
                <span>Active alerts</span>
                <strong>12</strong>
                <small>4 critical zones</small>
              </div>
              <div>
                <span>District coverage</span>
                <strong>6/6</strong>
                <small>All zones online</small>
              </div>
              <div>
                <span>Response SLA</span>
                <strong>11 min</strong>
                <small>Avg. dispatch time</small>
              </div>
            </div>
          </div>
        </section>

        <section className="role-cards" aria-label="CityPulse workspaces">
          {workspaceCards.map((card) => (
            <button
              key={card.label}
              type="button"
              onClick={card.action}
              className={`role-card role-card-${card.tone}`}
            >
              <div className="role-card-head">
                <span className="role-card-icon" aria-hidden="true">{card.icon}</span>
                <span className="role-card-tag">{card.label}</span>
              </div>
              <h2>{card.label}</h2>
              <p>{card.text}</p>
              <div className="role-metrics">
                {card.metrics.map((metric) => (
                  <span key={metric}>{metric}</span>
                ))}
              </div>
              <span className="role-cta">{card.cta}</span>
            </button>
          ))}
        </section>
      </div>
    </main>
  );
}
