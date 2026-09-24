import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, api } from './api/client';
import { AnalyticsSection } from './components/AnalyticsSection';
import { Member4ErrorBoundary } from './components/ErrorBoundary';
import { HealthPanel } from './components/HealthPanel';
import { ReplayControls } from './components/ReplayControls';
import { SimulatorButton, type SimStatus } from './components/SimulatorButton';

export default function App() {
  const [health, setHealth] = useState<Awaited<ReturnType<typeof fetchHealth>> | null>(null);
  const [healthErr, setHealthErr] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsErr, setAnalyticsErr] = useState<string | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [simStatus, setSimStatus] = useState<SimStatus | null>(null);
  const [replayStatus, setReplayStatus] = useState<any>(null);
  const [pulse, setPulse] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [apiDown, setApiDown] = useState<string | null>(null);
  const tickRef = useRef(0);

  async function fetchHealth() {
    return api<{
      weather: string;
      traffic: string;
      transit: string;
      firestore: string;
      groq: string;
      lastUpdate: string;
      storeMode?: string;
    }>('/health');
  }

  const refresh = useCallback(async () => {
    tickRef.current += 1;
    const tick = tickRef.current;
    try {
      setApiDown(null);
      const [h, a, p, al, sim, rep] = await Promise.all([
        fetchHealth(),
        api('/analytics'),
        api('/pulse'),
        api<any[]>('/alerts'),
        api<SimStatus>('/simulate/status'),
        api('/replay/status'),
      ]);
      if (tick !== tickRef.current) return;
      setHealth(h);
      setHealthErr(null);
      setAnalytics(a);
      setAnalyticsErr(null);
      setPulse(p);
      setAlerts(al);
      setSimStatus(sim);
      setReplayStatus(rep);
    } catch (e) {
      if (tick !== tickRef.current) return;
      const msg = e instanceof ApiError ? e.message : 'API unavailable';
      setApiDown(msg);
      setHealthErr(msg);
      setAnalyticsErr(msg);
    } finally {
      if (tick === tickRef.current) setLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 4000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-civic-accent">
          CityPulse · Member 4
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Analytics, alerts, health & demo</h1>
        <p className="mt-1 text-sm text-civic-muted">
          Integration slice — hooks Member 1 map via shared `/api/*` when merged.
        </p>
        {apiDown && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {apiDown}{' '}
            <button type="button" className="underline" onClick={() => void refresh()}>
              Retry
            </button>
          </div>
        )}
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Member4ErrorBoundary label="Simulator">
          <SimulatorButton status={simStatus} onChange={refresh} error={null} />
        </Member4ErrorBoundary>
        <Member4ErrorBoundary label="Health">
          <HealthPanel health={health} error={healthErr} onRetry={refresh} />
        </Member4ErrorBoundary>
        <Member4ErrorBoundary label="Replay">
          <ReplayControls status={replayStatus} onChange={refresh} />
        </Member4ErrorBoundary>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Member4ErrorBoundary label="Pulse & brief">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase text-civic-muted">Pulse & brief</h2>
            {!pulse && <p className="mt-2 text-sm text-civic-muted">Waiting for pulse…</p>}
            {pulse && (
              <>
                <p className="mt-2 text-lg font-semibold capitalize">{pulse.status}</p>
                <p className="text-sm text-civic-muted">
                  {pulse.active_incidents} incidents · top zone {pulse.top_zone ?? '—'}
                </p>
                {pulse.brief && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                    <p className="font-medium">{pulse.brief.headline}</p>
                    <p className="mt-1">{pulse.brief.what_happened}</p>
                    <p className="mt-2 text-xs text-civic-muted">
                      Source: {pulse.brief.source} · {pulse.brief.uncertainty}
                    </p>
                  </div>
                )}
              </>
            )}
          </section>
        </Member4ErrorBoundary>

        <Member4ErrorBoundary label="Active alerts">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase text-civic-muted">Active alerts</h2>
            {alerts.length === 0 && (
              <p className="mt-2 text-sm text-civic-muted">No active alerts.</p>
            )}
            <ul className="mt-2 space-y-2">
              {alerts.slice(0, 5).map((a) => (
                <li
                  key={a.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-slate-100 p-2 text-sm"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                          a.severity === 'high'
                            ? 'bg-red-100 text-red-800'
                            : a.severity === 'medium'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {a.severity}
                      </span>
                      <span className="font-medium">{a.title}</span>
                    </div>
                    <p className="mt-1 text-xs text-civic-muted">{a.body}</p>
                  </div>
                  {a.status === 'active' && (
                    <button
                      type="button"
                      className="shrink-0 rounded border border-slate-200 px-2 py-1 text-xs text-civic-muted hover:bg-slate-50"
                      onClick={() =>
                        api(`/alerts/${a.id}`, {
                          method: 'PATCH',
                          body: JSON.stringify({ status: 'acknowledged' }),
                        }).then(refresh)
                      }
                    >
                      Acknowledge
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </Member4ErrorBoundary>
      </div>

      <div className="mt-4">
        <Member4ErrorBoundary label="Analytics">
          <AnalyticsSection
            data={analytics}
            loading={loadingAnalytics}
            error={analyticsErr}
            onRetry={refresh}
          />
        </Member4ErrorBoundary>
      </div>
    </div>
  );
}
