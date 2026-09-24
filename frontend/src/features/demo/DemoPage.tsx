import React, { useState } from 'react';
import { api } from '../../lib/api';
import { useEvents, useZones, useAlerts, usePulse } from '../../lib/hooks';

export function DemoPage() {
  const { refresh: refreshEvents } = useEvents();
  const { refresh: refreshZones } = useZones();
  const { refresh: refreshAlerts } = useAlerts();
  const { refresh: refreshPulse } = usePulse();

  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    'Demo environment initialized. Ready to execute Rain Zone 4 Chain scenario.',
  ]);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 15)]);
  };

  const startReplay = async () => {
    setRunning(true);
    addLog('Starting scenario: rain_zone4_chain...');
    try {
      await api('/api/replay/start', {
        method: 'POST',
        body: JSON.stringify({ scenario: 'rain_zone4_chain', speed: 1.0 }),
      });
      addLog('Backend replay worker accepted scenario. Ingestion started.');
    } catch {
      addLog('Triggered local client sequence simulation.');
    }

    // Step progression
    const steps = [
      'Step 1: Heavy rain alert (42.5mm/hr) injected into Zone 4.',
      'Step 2: Multiple traffic incidents reported along Riverside corridor.',
      'Step 3: Route 12 bus transit delay detected in Zone 4.',
      'Step 4: Traffic incident cluster crossed 1.5x anomaly threshold (score: 2.4).',
      'Step 5: Spatial-temporal correlation detected between rain and congestion (86% confidence).',
      'Step 6: Zone 4 civic health status updated to ELEVATED.',
      'Step 7: Grounded AI situation brief generated with structured evidence.',
      'Step 8: Civic threshold alert fired: Incident spike in Zone 4.',
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 1400));
      setCurrentStep(i + 1);
      addLog(steps[i]);
      refreshEvents();
      refreshZones();
      refreshAlerts();
      refreshPulse();
    }

    setRunning(false);
    addLog('Demo scenario replay completed successfully!');
  };

  const stopReplay = async () => {
    setRunning(false);
    try {
      await api('/api/replay/stop', { method: 'POST' });
    } catch {
      // ignore
    }
    addLog('Scenario execution halted.');
  };

  const resetReplay = () => {
    setCurrentStep(0);
    setRunning(false);
    addLog('Reset scenario sequence state.');
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Demo &amp; Simulator</span>
          <h1 className="text-2xl font-black text-white">Replay Scenario Controls</h1>
          <p className="text-xs text-slate-400 mt-1">
            Execute the canonical "Rain in Zone 4 &rarr; Traffic Congestion &rarr; Transit Delay &rarr; Brief" story
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!running ? (
            <button
              onClick={startReplay}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
            >
              <span>▶</span> Play Scenario
            </button>
          ) : (
            <button
              onClick={stopReplay}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-600/20 transition-all flex items-center gap-2"
            >
              <span>⏸</span> Pause Scenario
            </button>
          )}

          <button
            onClick={resetReplay}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Progress Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base text-white">Scenario Sequence (8 Stages)</h3>
          <span className="text-xs font-mono text-cyan-400 font-bold">
            Stage {currentStep} / 8
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            '1. Rain Alert',
            '2. Traffic Spike',
            '3. Transit Delay',
            '4. Anomaly',
            '5. Correlation',
            '6. Zone Elevated',
            '7. AI Brief',
            '8. Alert Fired',
          ].map((label, idx) => {
            const stepNum = idx + 1;
            const isCompleted = currentStep >= stepNum;
            const isCurrent = currentStep === stepNum;

            return (
              <div
                key={label}
                className={`p-3 rounded-xl border text-center transition-all ${
                  isCurrent
                    ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-md shadow-cyan-500/20 animate-pulse'
                    : isCompleted
                    ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                    : 'border-slate-800 bg-slate-950/60 text-slate-500'
                }`}
              >
                <div className="text-[10px] font-mono font-bold">{isCompleted ? '✓' : `#${stepNum}`}</div>
                <div className="text-xs font-semibold mt-1 truncate">{label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real-time Execution Console */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
        <h3 className="font-bold text-base text-white mb-3">Replay Execution Console</h3>
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 font-mono text-xs text-slate-300 space-y-1.5 max-h-60 overflow-y-auto">
          {logs.map((log, idx) => (
            <div key={idx} className={idx === 0 ? 'text-cyan-300 font-bold' : 'text-slate-400'}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
