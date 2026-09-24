import { useState } from 'react';
import { api, ApiError } from '../api/client';

export interface SimStatus {
  running: boolean;
  stage: string;
  stageIndex: number;
  totalStages: number;
}

export function SimulatorButton({
  status,
  onChange,
  error: externalError,
}: {
  status: SimStatus | null;
  onChange: () => void;
  error: string | null;
}) {
  const [internalError, setInternalError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<(() => Promise<any>) | null>(null);
  const running = status?.running ?? false;
  const error = externalError || internalError;

  const handleAction = async (action: () => Promise<any>) => {
    try {
      setInternalError(null);
      setLastAction(() => action);
      await action();
      onChange();
    } catch (e) {
      setInternalError(e instanceof ApiError ? e.message : 'Simulation operation failed');
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-civic-muted">
        Demo simulator
      </h2>
      <button
        type="button"
        disabled={running}
        onClick={() => handleAction(() => api('/simulate/zone4', { method: 'POST' }))}
        className="mt-3 w-full rounded-xl bg-civic-ink px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {running ? 'SIMULATION RUNNING' : 'SIMULATE ZONE 4 DISRUPTION'}
      </button>
      {status && (
        <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs">
          <div className="flex items-center justify-between text-civic-muted">
            <span className="font-semibold uppercase tracking-wider text-[11px]">
              {running ? 'Simulation in Progress' : status.stage === 'done' ? 'Completed' : 'Ready'}
            </span>
            <span>
              {status.stageIndex} of {status.totalStages} stages
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  status.stageIndex >= step
                    ? running
                      ? 'bg-civic-accent animate-pulse'
                      : 'bg-civic-accent'
                    : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <p className="mt-2 font-medium capitalize text-civic-ink">
            {status.stage === 'rain'
              ? 'Stage 1: Heavy rain detected in Zone 4 (42mm)'
              : status.stage === 'traffic'
                ? 'Stage 2: Multiple traffic incidents reported'
                : status.stage === 'transit'
                  ? 'Stage 3: Transit delay reported'
                  : status.stage === 'pipeline'
                    ? 'Processing: Running anomaly, correlation & brief models'
                    : status.stage === 'done'
                      ? 'Story complete: Anomalies & alerts generated'
                      : 'Idle — ready to simulate'}
          </p>
        </div>
      )}
      <button
        type="button"
        className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        onClick={() => handleAction(() => api('/simulate/reset', { method: 'POST' }))}
      >
        RESET DEMO
      </button>
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
    </section>
  );
}
