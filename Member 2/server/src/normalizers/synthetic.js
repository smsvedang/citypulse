import { clamp, roundTo2 } from '../lib/time.js';

export function normalizeSynthetic(raw) {
  const source = raw.kind === 'civic' ? 'synthetic' : (raw.kind || 'weather');
  const event = {
    source,
    type: raw.type,
    severity: roundTo2(clamp(Number(raw.severity) || 0, 0, 1)),
    location: { lat: Number(raw.lat), lng: Number(raw.lng), zone: raw.zone || 'Z04' },
    timestamp: raw.timestamp || new Date().toISOString(),
    metadata: { ...(raw.metadata || {}), synthetic: true },
    confidence: Number(raw.confidence) || 0.9,
  };

  if (raw.scenario_id) event.metadata.scenario_id = raw.scenario_id;
  if (raw.run_id) event.metadata.run_id = raw.run_id;

  return event;
}
