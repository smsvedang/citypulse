import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
interface AnalyticsData {
  eventVolume: Array<{ bucketStart: string; count: number }>;
  eventsBySource: Array<{ source: string; count: number }>;
  anomalyTimeline: Array<{ timestamp: string; zone: string; type: string; score: number }>;
  zoneActivity: Array<{ zone: string; eventCount: number; avgSeverity: number; status: string }>;
  correlationCount: number;
  feedHealthSummary: Array<{ source: string; health: string; latency_ms: number }>;
  anomalyHighlightScoreMin?: number;
}

function ChartShell({
  title,
  empty,
  loading,
  error,
  onRetry,
  children,
}: {
  title: string;
  empty: boolean;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
      <h3 className="text-xs font-semibold uppercase text-civic-muted">{title}</h3>
      {loading && <p className="mt-4 text-sm text-civic-muted">Loading…</p>}
      {error && (
        <p className="mt-2 text-sm text-red-600">
          {error}{' '}
          <button type="button" className="underline" onClick={onRetry}>
            Retry
          </button>
        </p>
      )}
      {!loading && !error && empty && (
        <p className="mt-4 text-sm text-civic-muted">No data in this window yet.</p>
      )}
      {!loading && !error && !empty && <div className="mt-2 h-44">{children}</div>}
    </div>
  );
}

export function AnalyticsSection({
  data,
  loading,
  error,
  onRetry,
}: {
  data: AnalyticsData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const volume = data?.eventVolume ?? [];
  const bySource = data?.eventsBySource ?? [];
  const anomalies = data?.anomalyTimeline ?? [];
  const zones = data?.zoneActivity ?? [];
  const feeds = data?.feedHealthSummary ?? [];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-civic-muted">
            Civic Analytics
          </h2>
          <p className="text-xs text-civic-muted">Real-time aggregated metrics across city zones</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium">
            <span className="text-civic-muted">Correlation Count: </span>
            <span className="font-bold text-civic-ink">{data?.correlationCount ?? 0}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ChartShell
          title="1. Event volume over time"
          empty={volume.length === 0}
          loading={loading}
          error={error}
          onRetry={onRetry}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={volume}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucketStart" hide />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#0ea5e9" fill="#bae6fd" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell
          title="2. Events by source"
          empty={bySource.length === 0}
          loading={loading}
          error={error}
          onRetry={onRetry}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bySource}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="source" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#334155" />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell
          title="3. Anomaly timeline"
          empty={anomalies.length === 0}
          loading={loading}
          error={error}
          onRetry={onRetry}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={anomalies}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="score">
                {anomalies.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.score >= (data?.anomalyHighlightScoreMin ?? 2.0)
                        ? '#ef4444'
                        : '#f59e0b'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>

        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
          <h3 className="text-xs font-semibold uppercase text-civic-muted">4. Zone activity</h3>
          {loading && <p className="mt-4 text-sm text-civic-muted">Loading…</p>}
          {error && (
            <p className="mt-2 text-sm text-red-600">
              {error}{' '}
              <button type="button" className="underline" onClick={onRetry}>
                Retry
              </button>
            </p>
          )}
          {!loading && !error && zones.length === 0 && (
            <p className="mt-4 text-sm text-civic-muted">No zone activity yet.</p>
          )}
          {!loading && !error && zones.length > 0 && (
            <ul className="mt-2 space-y-1.5 text-sm">
              {zones.map((z) => (
                <li key={z.zone} className="flex justify-between border-b border-slate-100 py-1">
                  <span className="font-medium">
                    {z.zone} ·{' '}
                    <span
                      className={`text-xs ${
                        z.status === 'critical'
                          ? 'font-bold text-red-600'
                          : z.status === 'elevated'
                            ? 'font-semibold text-amber-600'
                            : 'text-civic-muted'
                      }`}
                    >
                      {z.status}
                    </span>
                  </span>
                  <span className="text-civic-muted">
                    {z.eventCount} evt · sev {z.avgSeverity}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
          <h3 className="text-xs font-semibold uppercase text-civic-muted">5. Correlation metrics</h3>
          {loading && <p className="mt-4 text-sm text-civic-muted">Loading…</p>}
          {error && (
            <p className="mt-2 text-sm text-red-600">
              {error}{' '}
              <button type="button" className="underline" onClick={onRetry}>
                Retry
              </button>
            </p>
          )}
          {!loading && !error && (
            <div className="mt-3 flex flex-col items-center justify-center p-4">
              <span className="text-4xl font-extrabold text-civic-accent">
                {data?.correlationCount ?? 0}
              </span>
              <p className="mt-1 text-xs text-civic-muted">Active Spatiotemporal Correlations</p>
              <p className="mt-2 text-[11px] text-civic-muted text-center">
                Threshold: r &ge; 0.65 within 45m / 5km
              </p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
          <h3 className="text-xs font-semibold uppercase text-civic-muted">6. Feed latency & health</h3>
          {loading && <p className="mt-4 text-sm text-civic-muted">Loading…</p>}
          {error && (
            <p className="mt-2 text-sm text-red-600">
              {error}{' '}
              <button type="button" className="underline" onClick={onRetry}>
                Retry
              </button>
            </p>
          )}
          {!loading && !error && feeds.length === 0 && (
            <p className="mt-4 text-sm text-civic-muted">No feed data available.</p>
          )}
          {!loading && !error && feeds.length > 0 && (
            <ul className="mt-2 space-y-1.5 text-sm">
              {feeds.map((f) => (
                <li
                  key={f.source}
                  className="flex items-center justify-between border-b border-slate-100 py-1 capitalize"
                >
                  <span className="font-medium">{f.source}</span>
                  <span className="flex items-center gap-2 text-xs">
                    <span className="text-civic-muted">{f.latency_ms} ms</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                        f.health === 'healthy'
                          ? 'bg-emerald-100 text-emerald-800'
                          : f.health === 'delayed'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {f.health}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
