import { useState } from 'react';
import { api, ApiError } from '../api/client';

interface ReplayStatus {
  state: string;
  speed: number;
  progress: { current: number; total: number };
}

export function ReplayControls({
  status,
  onChange,
}: {
  status: ReplayStatus | null;
  onChange: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<(() => Promise<any>) | null>(null);
  const st = status?.state ?? 'idle';
  const speeds = [1, 2, 5];

  const handleAction = async (action: () => Promise<any>) => {
    try {
      setError(null);
      setLastAction(() => action);
      await action();
      onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Replay operation failed');
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-civic-muted">
        Historical replay
      </h2>
      <p className="mt-1 text-xs text-civic-muted">
        {st} · {status?.speed ?? 1}x · {status?.progress.current ?? 0}/
        {status?.progress.total ?? 0}
      </p>

      {error && (
        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800">
          <span>{error}</span>{' '}
          {lastAction && (
            <button
              type="button"
              className="ml-1 underline font-medium"
              onClick={() => void handleAction(lastAction)}
            >
              Retry
            </button>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-civic-accent px-3 py-1.5 text-xs text-white"
          onClick={() => handleAction(() => api('/replay/start', { method: 'POST', body: '{}' }))}
        >
          Play
        </button>
        <button
          type="button"
          className="rounded-lg border px-3 py-1.5 text-xs"
          onClick={() => handleAction(() => api('/replay/pause', { method: 'POST' }))}
        >
          Pause
        </button>
        <button
          type="button"
          className="rounded-lg border px-3 py-1.5 text-xs"
          onClick={() => handleAction(() => api('/replay/resume', { method: 'POST' }))}
        >
          Resume
        </button>
        {speeds.map((s) => (
          <button
            key={s}
            type="button"
            className="rounded-lg border px-3 py-1.5 text-xs"
            onClick={() =>
              handleAction(() =>
                api('/replay/speed', { method: 'POST', body: JSON.stringify({ speed: s }) }),
              )
            }
          >
            {s}x
          </button>
        ))}
        <button
          type="button"
          className="rounded-lg border px-3 py-1.5 text-xs"
          onClick={() => handleAction(() => api('/replay/reset', { method: 'POST' }))}
        >
          Reset
        </button>
      </div>
    </section>
  );
}
