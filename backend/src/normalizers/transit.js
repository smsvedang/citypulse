import { clamp, roundTo2 } from '../lib/time.js';

export function normalizeTransit(raw) {
  const delay = Number(raw.delay_minutes || 0);
  const severity = clamp(delay / 30, 0, 1);
  return {
    source: 'transit',
    type: 'transit_delay',
    severity: roundTo2(severity),
    location: { lat: Number(raw.lat), lng: Number(raw.lng), zone: raw.zone || 'Z04' },
    timestamp: raw.observed_at || raw.timestamp || new Date().toISOString(),
    metadata: {
      route_id: raw.route_id || 'R-unknown',
      mode: raw.mode || 'bus',
      delay_minutes: delay,
      provider: raw.provider || 'transit',
    },
    confidence: 0.85,
  };
}
