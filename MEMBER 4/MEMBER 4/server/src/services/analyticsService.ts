import { citypulseConfig } from '../config/citypulse.config.js';
import {
  listAnomalies,
  listCorrelations,
  listEvents,
  listFeedStatus,
  listZones,
} from '../store/firestore.js';

function parseTs(iso: string): number {
  return new Date(iso.replace('+05:30', '+0530')).getTime();
}

function bucketMs(bucket: string): number {
  if (bucket === '5m') return 5 * 60_000;
  if (bucket === '1h') return 60 * 60_000;
  return 15 * 60_000;
}

export async function getAnalytics(query: { window?: string; bucket?: string }) {
  const windowMs = query.window
    ? Number(query.window) || citypulseConfig.analytics.defaultWindowMs
    : citypulseConfig.analytics.defaultWindowMs;
  const bucket = (query.bucket as '5m' | '15m' | '1h') || citypulseConfig.analytics.defaultBucket;
  const bMs = bucketMs(bucket);
  const now = Date.now();
  const since = now - windowMs;

  const events = await listEvents({ limit: 2000 });
  const inWindow = events.filter((e) => parseTs(e.timestamp) >= since);

  const buckets = new Map<number, number>();
  for (const e of inWindow) {
    const t = parseTs(e.timestamp);
    const start = Math.floor(t / bMs) * bMs;
    buckets.set(start, (buckets.get(start) ?? 0) + 1);
  }
  const eventVolume = [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([bucketStart, count]) => ({
      bucketStart: new Date(bucketStart).toISOString(),
      count,
    }));

  const bySource = new Map<string, number>();
  for (const e of inWindow) {
    bySource.set(e.source, (bySource.get(e.source) ?? 0) + 1);
  }
  const eventsBySource = [...bySource.entries()].map(([source, count]) => ({ source, count }));

  const anomalies = (await listAnomalies()).filter(
    (a) => parseTs(a.detected_at) >= since,
  );
  const anomalyTimeline = anomalies.map((a) => ({
    timestamp: a.detected_at,
    zone: a.zone_id,
    type: a.event_type,
    score: a.score,
  }));

  const zones = await listZones();
  const zoneActivity = zones.map((z) => {
    const ze = inWindow.filter((e) => e.location.zone === z.id);
    const avgSeverity =
      ze.length > 0 ? ze.reduce((s, e) => s + e.severity, 0) / ze.length : 0;
    return {
      zone: z.id,
      eventCount: ze.length,
      avgSeverity: Math.round(avgSeverity * 100) / 100,
      status: z.status ?? 'normal',
    };
  });

  const correlations = await listCorrelations();
  const corrInWindow = correlations.filter((c) => {
    return inWindow.some((e) => e.id === c.event_a || e.id === c.event_b);
  });

  const feedHealth = await listFeedStatus();

  return {
    eventVolume,
    eventsBySource,
    anomalyTimeline,
    zoneActivity,
    correlationCount: corrInWindow.length,
    correlationByZone: Object.entries(
      corrInWindow.reduce<Record<string, number>>((acc, c) => {
        const z = c.zone_id ?? 'unknown';
        acc[z] = (acc[z] ?? 0) + 1;
        return acc;
      }, {}),
    ).map(([zone, count]) => ({ zone, count })),
    feedHealthSummary: feedHealth,
    windowMs,
    bucket,
    anomalyHighlightScoreMin: citypulseConfig.analytics.anomalyHighlightScoreMin,
  };
}
