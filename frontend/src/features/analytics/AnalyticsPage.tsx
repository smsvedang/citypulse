import React, { useState, useEffect, useCallback } from 'react';
import { AnalyticsSection } from '../../components/AnalyticsSection';
import { api } from '../../lib/api';
import { useEvents, useZones, useAnomalies, useFeedStatus, useCorrelations } from '../../lib/hooks';

export function AnalyticsPage() {
  const { events } = useEvents(200);
  const { zones } = useZones();
  const { anomalies } = useAnomalies();
  const { feedStatus } = useFeedStatus();
  const { correlations } = useCorrelations();

  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api<any>('/api/analytics');
      if (res && res.eventsBySource) {
        setAnalyticsData(res);
        setError(null);
        return;
      }
    } catch {
      setAnalyticsData(null);
      setError('Analytics service is unavailable. No sample data is shown.');
      setLoading(false);
      return;
    }

    // Dynamic computation from loaded data
    const sourcesCount: Record<string, number> = { weather: 0, traffic: 0, transit: 0, synthetic: 0 };
    for (const evt of events) {
      if (sourcesCount[evt.source] !== undefined) {
        sourcesCount[evt.source]++;
      }
    }

    const eventsBySource = Object.entries(sourcesCount).map(([source, count]) => ({
      source,
      count,
    }));

    const zoneActivity = zones.map((z) => {
      const zEvts = events.filter((e) => e.location?.zone === z.id);
      const avgSev = zEvts.length
        ? zEvts.reduce((sum, e) => sum + (e.severity || 0), 0) / zEvts.length
        : 0;
      return {
        zone: z.id,
        eventCount: zEvts.length,
        avgSeverity: Number(avgSev.toFixed(2)),
        status: z.status || (zEvts.length >= 3 ? 'Elevated' : 'Normal'),
      };
    });

    const anomalyTimeline = anomalies.map((a) => ({
      timestamp: a.detected_at,
      zone: a.zone_id,
      type: a.event_type,
      score: a.score,
    }));

    const feedHealthSummary = feedStatus.map((f) => ({
      source: f.source,
      health: f.health,
      latency_ms: f.latency_ms || 200,
    }));

    setAnalyticsData({
      eventVolume: [],
      eventsBySource,
      anomalyTimeline,
      zoneActivity,
      correlationCount: correlations.length,
      feedHealthSummary,
    });
    setError(null);
    setLoading(false);
  }, [events, zones, anomalies, feedStatus, correlations]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Analytics</span>
          <h1 className="text-2xl font-black text-white">City Activity &amp; Metric Trends</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time event volume, source ratios, anomaly timeline, and cross-zone severity
          </p>
        </div>
        <button
          onClick={loadAnalytics}
          className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors border border-slate-700 flex items-center gap-1.5"
        >
          <span>↻</span> Refresh Metrics
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
        <AnalyticsSection
          data={analyticsData}
          loading={loading}
          error={error}
          onRetry={loadAnalytics}
        />
      </div>
    </div>
  );
}
