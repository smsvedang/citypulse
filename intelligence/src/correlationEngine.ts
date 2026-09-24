import { v4 as uuid } from 'uuid';
import { citypulseConfig } from '../config/citypulse.config.js';
import { listEvents, writeCorrelation } from '../store/firestore.js';
import type { CivicEvent, CorrelationDoc } from '../types/civic.js';

function parseTs(iso: string): number {
  return new Date(iso.replace('+05:30', '+0530')).getTime();
}

function haversineKm(a: CivicEvent, b: CivicEvent): number {
  const R = 6371;
  const dLat = ((b.location.lat - a.location.lat) * Math.PI) / 180;
  const dLng = ((b.location.lng - a.location.lng) * Math.PI) / 180;
  const lat1 = (a.location.lat * Math.PI) / 180;
  const lat2 = (b.location.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export async function runCorrelationDetection(
  triggerEvent: CivicEvent,
): Promise<CorrelationDoc[]> {
  const windowMs = citypulseConfig.intelligence.correlationWindowMinutes * 60_000;
  const maxDist = citypulseConfig.intelligence.correlationRadiusKm;
  const zone = triggerEvent.location.zone;
  const now = parseTs(triggerEvent.timestamp);

  const events = await listEvents({ zone, limit: 200 });
  const candidates = events.filter((e) => e.id !== triggerEvent.id);
  const created: CorrelationDoc[] = [];

  const simulationId =
    typeof triggerEvent.metadata?.simulation_id === 'string'
      ? triggerEvent.metadata.simulation_id
      : undefined;

  for (const other of candidates) {
    const tOther = parseTs(other.timestamp);
    const gapMin = Math.abs(now - tOther) / 60_000;
    if (gapMin > citypulseConfig.intelligence.correlationWindowMinutes) continue;

    const dist = haversineKm(triggerEvent, other);
    if (dist > maxDist) continue;

    const temporal = 1 - gapMin / citypulseConfig.intelligence.correlationWindowMinutes;
    const spatial = 1 - dist / maxDist;
    const score =
      Math.round((temporal * 0.4 + spatial * 0.3 + triggerEvent.confidence * 0.15 + other.confidence * 0.15) * 100) / 100;

    if (score < citypulseConfig.alerts.correlationMinStrength) continue;

    const doc: CorrelationDoc = {
      id: `corr_${uuid().slice(0, 8)}`,
      event_a: other.timestamp < triggerEvent.timestamp ? other.id : triggerEvent.id,
      event_b: other.timestamp < triggerEvent.timestamp ? triggerEvent.id : other.id,
      time_gap: Math.round(gapMin),
      distance: Math.round(dist * 100) / 100,
      score,
      interpretation: 'possible temporal/spatial relationship',
      zone_id: zone,
      simulation_id: simulationId,
    };
    await writeCorrelation(doc);
    created.push(doc);
  }

  return created;
}
