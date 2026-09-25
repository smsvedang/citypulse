import React, { useState, useEffect } from 'react';
import { usePulse } from '../../lib/hooks';
import { api } from '../../lib/api';

export function BriefPage() {
  const { pulse, refresh } = usePulse();
  const [brief, setBrief] = useState<any>(pulse?.brief);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pulse?.brief) {
      setBrief(pulse.brief);
    }
  }, [pulse]);

  const requestFreshBrief = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<any>('/api/brief?zone=Z04');
      if (res && res.headline) {
        setBrief(res);
      } else {
        await refresh();
      }
    } catch {
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  const currentBrief = brief || pulse?.brief;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Intelligence Layer</span>
          <h1 className="text-2xl font-black text-white">AI Situation Brief</h1>
          <p className="text-xs text-slate-400 mt-1">
            Grounded plain-language synthesis computed from structured civic events and anomalies
          </p>
        </div>
        <button
          onClick={requestFreshBrief}
          disabled={loading}
          className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-cyan-600/20 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <span>✦</span>
          <span>{loading ? 'Synthesizing...' : 'Generate Fresh Brief'}</span>
        </button>
      </div>

      {/* Main Brief Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 blur-3xl pointer-events-none rounded-full" />

        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-md shadow-cyan-500/20">
              ✦
            </div>
            <div>
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">CIVIC PULSE SUMMARY</span>
              <h2 className="text-xl md:text-2xl font-extrabold text-white">{currentBrief?.headline || 'No verified brief available'}</h2>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
              currentBrief?.source === 'groq'
                ? 'bg-purple-950/60 border-purple-500/50 text-purple-300'
                : 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
            }`}
          >
            {currentBrief?.source === 'groq' ? 'Groq Llama 3.3' : 'No verified brief'}
          </span>
        </div>

        {/* Brief Sections */}
        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">
              What Happened
            </h3>
            <p className="text-sm md:text-base text-slate-200 leading-relaxed font-normal bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
              {currentBrief?.what_happened || 'The backend has not returned verified event data for this brief.'}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">
              Why It Matters
            </h3>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
              {currentBrief?.why_it_matters || 'No impact assessment is available without verified events.'}
            </p>
          </div>

          {/* Grounded Evidence List */}
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">
              Grounded Evidence
            </h3>
            <div className="flex flex-wrap gap-2">
              {(currentBrief?.evidence || []).map((item: string, idx: number) => (
                <div
                  key={idx}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-300 flex items-center gap-1.5"
                >
                  <span className="text-slate-500">#{idx + 1}</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Uncertainty & Reliability Rule */}
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3">
            <span className="text-amber-400 text-lg leading-none mt-0.5">⚠️</span>
            <div>
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-1">
                Uncertainty &amp; Causation Notice
              </h4>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                {currentBrief?.uncertainty ||
                  'Never claim causation from correlation alone. Models synthesize structured evidence without raw speculation.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
