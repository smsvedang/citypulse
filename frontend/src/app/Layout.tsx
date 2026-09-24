import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useFeedStatus, useEvents } from '../lib/hooks';

export function Layout() {
  const { overallHealth, feedStatus } = useFeedStatus();
  const { events } = useEvents(20);
  const location = useLocation();
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }) +
          ' ' +
          now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const hasSynthetic = events.some((e) => e.metadata?.synthetic === true);

  const navItems = [
    { path: '/', label: 'Live Map', icon: '🗺️' },
    { path: '/zone/Z04', label: 'Zone Detail', icon: '🏙️' },
    { path: '/analytics', label: 'Analytics', icon: '📊' },
    { path: '/alerts', label: 'Alerts', icon: '🚨' },
    { path: '/brief', label: 'AI Brief', icon: '✦' },
    { path: '/demo', label: 'Demo Controls', icon: '🎮' },
    { path: '/feed-status', label: 'Feed Status', icon: '📡' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <NavLink to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              CP
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">
              City<span className="text-cyan-400">Pulse</span>
            </span>
          </NavLink>

          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium">UPDATED:</span>
            <span className="font-mono text-cyan-300">{timeStr || 'LIVE'}</span>
          </div>
        </div>

        {/* Status Indicators & Navigation Center */}
        <div className="flex items-center gap-3">
          {/* Feed Health Banner */}
          <NavLink
            to="/feed-status"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition-all border ${
              overallHealth === 'healthy'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                : overallHealth === 'delayed'
                ? 'bg-amber-950/60 border-amber-500/40 text-amber-300 hover:bg-amber-900/60'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300 hover:bg-rose-900/60'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                overallHealth === 'healthy'
                  ? 'bg-emerald-400'
                  : overallHealth === 'delayed'
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
            />
            <span>FEEDS: {overallHealth}</span>
          </NavLink>

          {/* SIMULATED Badge */}
          {hasSynthetic && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 border border-amber-500/50 text-amber-300 shadow-sm shadow-amber-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              SIMULATED
            </span>
          )}

          <NavLink
            to="/demo"
            className="px-3 py-1 rounded-md text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-sm shadow-cyan-600/30"
          >
            ▶ Replay Scenario
          </NavLink>
        </div>
      </header>

      {/* Nav Menu */}
      <nav className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-1.5 overflow-x-auto">
        <ul className="flex items-center gap-1 sm:gap-2 max-w-7xl mx-auto text-sm">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                  }`
                }
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main Outlet */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-900/40 px-4 py-3 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-500" />
          <span>CityPulse Unified Civic Health Intelligence Dashboard</span>
        </div>
        <div>
          Contract-compliant &middot; Connected modules &middot; Jaipur Metro Area
        </div>
      </footer>
    </div>
  );
}
