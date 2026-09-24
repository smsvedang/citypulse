import { listAnomalies, listCorrelations, listEvents } from '../store/firestore.js';
import type { CivicEvent, EvidenceObject } from '../types/civic.js';

export async function buildEvidence(zoneId: string): Promise<EvidenceObject> {
  const events = await listEvents({ zone: zoneId, limit: 100 });
  const anomalies = (await listAnomalies()).filter((a) => a.zone_id === zoneId);
  const correlations = (await listCorrelations()).filter((c) => c.zone_id === zoneId);

  anomalies.sort((a, b) => b.score - a.score);
  const top = anomalies[0] ?? null;

  const typeCounts = new Map<string, number>();
  for (const e of events) {
    typeCounts.set(String(e.type), (typeCounts.get(String(e.type)) ?? 0) + 1);
  }

  const preceding = [...typeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);

  const possible_correlations = correlations.slice(0, 5).map((c) => ({
    a: c.event_a,
    b: c.event_b,
    time_gap_min: c.time_gap,
  }));

  const avgConf =
    events.length > 0
      ? events.reduce((s, e) => s + e.confidence, 0) / events.length
      : 0.5;

  return {
    zone: zoneId,
    active_events: events.length,
    top_anomaly: top ? { type: top.event_type, score: top.score } : null,
    preceding_events: preceding,
    possible_correlations,
    confidence: Math.round(avgConf * 100) / 100,
    uncertainty: 'Correlation does not establish causation.',
  };
}

export function eventsForZone(events: CivicEvent[], zone: string): CivicEvent[] {
  return events.filter((e) => e.location.zone === zone);
}
