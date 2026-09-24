import { ApiError, api } from '../api/client';

type HealthState = string;

interface HealthResponse {
  weather: HealthState;
  traffic: HealthState;
  transit: HealthState;
  firestore: HealthState;
  groq: HealthState;
  lastUpdate: string;
  storeMode?: string;
}

function dot(state: HealthState) {
  if (state === 'Healthy') return 'bg-civic-ok';
  if (state === 'Delayed') return 'bg-civic-warn';
  if (state === 'Failed') return 'bg-civic-bad';
  if (state === 'Unavailable') return 'bg-slate-400';
  return 'bg-slate-300';
}

export function HealthPanel({
  health,
  error,
  onRetry,
}: {
  health: HealthResponse | null;
  error: string | null;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-civic-muted">
          System health
        </h2>
        <p className="mt-2 text-sm text-red-600">{error}</p>
        <button type="button" onClick={onRetry} className="mt-2 text-sm text-civic-accent underline">
          Retry
        </button>
      </section>
    );
  }

  if (!health) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-civic-muted">Loading health…</p>
      </section>
    );
  }

  const rows: Array<[string, HealthState]> = [
    ['Weather', health.weather],
    ['Traffic', health.traffic],
    ['Transit', health.transit],
    ['Firestore', health.firestore],
    ['AI/Groq', health.groq],
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-civic-muted">
        System health
      </h2>
      <ul className="mt-3 space-y-2 text-sm">
        {rows.map(([label, state]) => (
          <li key={label} className="flex items-center justify-between gap-2">
            <span>{label}</span>
            <span className="flex items-center gap-2 font-medium">
              <span className={`h-2.5 w-2.5 rounded-full ${dot(state)}`} />
              {state}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-civic-muted">
        Last update {health.lastUpdate}
        {health.storeMode ? ` · store: ${health.storeMode}` : ''}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          id="feed-select"
          aria-label="Feed selection"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
          defaultValue="traffic"
          onChange={(e) => {
            (window as any).__selectedFeed = e.target.value;
          }}
        >
          <option value="traffic">Traffic</option>
          <option value="weather">Weather</option>
          <option value="transit">Transit</option>
        </select>
        <button
          type="button"
          className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
          onClick={() => {
            const feed = (window as any).__selectedFeed || 'traffic';
            api('/simulate/feed-failure', { method: 'POST', body: JSON.stringify({ feed }) })
              .then(onRetry)
              .catch((e: ApiError) => alert(e.message));
          }}
        >
          Simulate failure
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-civic-muted hover:bg-slate-50"
          onClick={() => {
            const feed = (window as any).__selectedFeed || 'traffic';
            api('/simulate/feed-recover', { method: 'POST', body: JSON.stringify({ feed }) })
              .then(onRetry)
              .catch((e: ApiError) => alert(e.message));
          }}
        >
          Recover
        </button>
      </div>
    </section>
  );
}
