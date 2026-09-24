import { citypulseConfig } from '../config/citypulse.config.js';
import { runAnomalyDetection } from '../intelligence/anomalyEngine.js';
import { runCorrelationDetection } from '../intelligence/correlationEngine.js';
import { buildEvidence } from '../intelligence/evidence.js';
import { generateGroqBrief } from '../intelligence/groqBrief.js';
import { validateCivicEvent } from '../ingest/validateEvent.js';
import { isoNow, listEvents, updateZone, writeEvent, upsertFeedStatus, listAnomalies, listZones } from '../store/firestore.js';
import type { CivicEvent, GroqBrief, PulseResponse } from '../types/civic.js';
import { evaluateAlertsAfterPipeline } from './alertEngine.js';

let lastPulse: PulseResponse | null = null;

export async function ingestEvent(raw: Partial<CivicEvent>): Promise<{
  event: CivicEvent;
  anomaly: Awaited<ReturnType<typeof runAnomalyDetection>>;
  correlations: Awaited<ReturnType<typeof runCorrelationDetection>>;
  alerts: Awaited<ReturnType<typeof evaluateAlertsAfterPipeline>>;
  brief: GroqBrief | null;
}> {
  const event = validateCivicEvent(raw);
  await writeEvent(event);
  // Update feed status timestamp for this source
  await upsertFeedStatus({
    source: event.source,
    last_success: isoNow(),
    latency_ms: 0,
    health: 'healthy',
    error_count: 0,
  });

  const anomaly = await runAnomalyDetection(event);
  const correlations = await runCorrelationDetection(event);
  const alerts = await evaluateAlertsAfterPipeline({ event, anomaly, correlations });

const { incidentSeverityMin, elevatedAnomalyScore, criticalAnomalyScore, elevatedIncidentCount } = citypulseConfig.zoneStatus;
    const zones = await listZones();
    const currentZone = zones.find(z => z.id === event.location.zone);
    const existingStatus = currentZone?.status ?? 'normal';

  let status = 'normal';
    const rollingMinutes = citypulseConfig.intelligence.rollingWindowMinutes;
    const now = new Date();
    const windowStart = new Date(now.getTime() - rollingMinutes * 60_000);
    const anomalies = await listAnomalies();
    const zoneAnomalies = anomalies.filter(a => a.zone_id === event.location.zone && new Date(a.detected_at) >= windowStart);
    let maxScore = 0;
    for (const a of zoneAnomalies) {
      if (a.score > maxScore) maxScore = a.score;
    }
    if (maxScore >= criticalAnomalyScore) status = 'critical';
    else if (maxScore >= elevatedAnomalyScore) status = 'elevated';

  

  const evidence = await buildEvidence(event.location.zone);
  const brief = await generateGroqBrief(evidence);

  const allEvents = await listEvents({ limit: 200 });
  const incidents = allEvents.filter((e) => e.severity >= incidentSeverityMin);
// Incident‑count‑based elevation (never downgrade)
if (incidents.length > elevatedIncidentCount && status !== 'critical') {
  if (status !== 'elevated') status = 'elevated';
}
// Preserve higher existing status (do not downgrade)
if (existingStatus === 'critical') {
  status = 'critical';
} else if (existingStatus === 'elevated' && status === 'normal') {
  status = 'elevated';
}
await updateZone(event.location.zone, { status });
  const zoneCounts = new Map<string, number>();
  for (const e of incidents) {
    zoneCounts.set(e.location.zone, (zoneCounts.get(e.location.zone) ?? 0) + 1);
  }
  let top_zone: string | null = null;
  let max = 0;
  for (const [z, c] of zoneCounts) {
    if (c > max) {
      max = c;
      top_zone = z;
    }
  }

  lastPulse = {
    status: incidents.length > elevatedIncidentCount ? 'elevated' : status,
    active_incidents: incidents.length,
    top_zone,
    top_anomaly: evidence.top_anomaly,
    last_updated: isoNow(),
    brief,
    evidence,
  };

  return { event, anomaly, correlations, alerts, brief };
}

export function getLastPulse(): PulseResponse | null {
  return lastPulse;
}

export async function computePulse(): Promise<PulseResponse> {
  if (lastPulse) return lastPulse;
  const events = await listEvents({ limit: 100 });
  const incidents = events.filter((e) => e.severity >= citypulseConfig.zoneStatus.incidentSeverityMin);
  return {
    status: 'normal',
    active_incidents: incidents.length,
    top_zone: incidents[0]?.location.zone ?? null,
    top_anomaly: null,
    last_updated: isoNow(),
    brief: null,
    evidence: null,
  };
}
export function clearPulseCache(): void {
  // Reset the cached pulse so that computePulse will recalculate on next request
  lastPulse = null;
}
