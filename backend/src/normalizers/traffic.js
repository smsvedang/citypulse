import { clamp, roundTo2 } from '../lib/time.js';

export function normalizeTraffic(raw) {
  const category = raw.category || 'congestion';
  const severity = clamp((Number(raw.delay_minutes) || 0) / 60, 0, 1);
  const type = ['waterlogging', 'road_closed', 'debris'].includes(category) ? 'road_hazard' : 'traffic_incident';
  return {
    source: 'traffic',
    type,
    severity: roundTo2(severity),
    location: { lat: Number(raw.lat), lng: Number(raw.lng), zone: raw.zone || 'Z04' },
    timestamp: raw.reported_at || raw.timestamp || new Date().toISOString(),
    metadata: {
      category,
      delay_minutes: Number(raw.delay_minutes || 0),
      road_name: raw.road_name,
      provider: raw.provider || 'traffic',
    },
    confidence: raw.provider && raw.provider === 'synthetic' ? 0.9 : 0.8,
  };
}
