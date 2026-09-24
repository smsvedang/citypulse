import { v4 as uuid } from 'uuid';
import { citypulseConfig } from '../config/citypulse.config.js';
import { listEvents, writeAnomaly } from '../store/firestore.js';
import type { AnomalyDoc, CivicEvent } from '../types/civic.js';

function parseTs(iso: string): number {
  return new Date(iso.replace('+05:30', '+0530')).getTime();
}

export async function runAnomalyDetection(
  triggerEvent: CivicEvent,
): Promise<AnomalyDoc | null> {
  const windowMs = citypulseConfig.intelligence.rollingWindowMinutes * 60_000;
  const now = parseTs(triggerEvent.timestamp);
  const zone = triggerEvent.location.zone;
  const eventType = triggerEvent.type;

  const events = await listEvents({ zone, type: eventType, limit: 500 });
  const recent = events.filter((e) => {
    const t = parseTs(e.timestamp);
    return now - t <= windowMs && t <= now;
  });

  const currentCount = recent.length;
  const older = events.filter((e) => {
    const t = parseTs(e.timestamp);
    return now - t > windowMs && now - t <= windowMs * 2;
  });
  const recentAverage = older.length / Math.max(citypulseConfig.intelligence.rollingWindowMinutes / 60, 1);
  const score = currentCount / Math.max(recentAverage, 1);

  if (score < citypulseConfig.intelligence.anomalyThreshold) {
    return null;
  }

  const simulationId =
    typeof triggerEvent.metadata?.simulation_id === 'string'
      ? triggerEvent.metadata.simulation_id
      : undefined;

  const doc: AnomalyDoc = {
    id: `an_${uuid().slice(0, 8)}`,
    zone_id: zone,
    event_type: String(eventType),
    score: Math.round(score * 100) / 100,
    detected_at: triggerEvent.timestamp,
    evidence: recent.slice(-5).map((e) => e.id),
    simulation_id: simulationId,
  };

  await writeAnomaly(doc);
  return doc;
}
