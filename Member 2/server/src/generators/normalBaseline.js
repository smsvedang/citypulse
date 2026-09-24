import { clamp } from '../lib/time.js';

export function generateNormalBaseline(zoneId, { now = new Date(), seed = 1 } = {}) {
  const zoneCenters = { Z01: { lat: 26.9855, lng: 75.8513 }, Z02: { lat: 26.9240, lng: 75.8270 }, Z03: { lat: 26.8500, lng: 75.8000 }, Z04: { lat: 26.9100, lng: 75.7900 }, Z05: { lat: 26.8850, lng: 75.7400 }, Z06: { lat: 26.9500, lng: 75.7300 } };
  const center = zoneCenters[zoneId] || zoneCenters.Z04;
  const events = [];
  const trafficCount = (seed % 3) + 1;
  for (let i = 0; i < trafficCount; i += 1) {
    events.push({
      kind: 'traffic',
      type: 'traffic_incident',
      severity: clamp(0.1 + ((seed + i) % 5) * 0.06, 0, 1),
      lat: center.lat + ((seed + i) % 5 - 2) * 0.001,
      lng: center.lng + ((seed + i) % 7 - 3) * 0.001,
      zone: zoneId,
      timestamp: new Date(now.getTime() + i * 60000).toISOString(),
      confidence: 0.8,
      metadata: { category: 'congestion', delay_minutes: 5 + ((seed + i) % 10), synthetic: true },
      scenario_id: 'normal_baseline',
    });
  }
  const transitCount = (seed % 2) === 0 ? 1 : 0;
  for (let i = 0; i < transitCount; i += 1) {
    events.push({
      kind: 'transit',
      type: 'transit_delay',
      severity: 0.2,
      lat: center.lat + ((seed + i) % 5 - 2) * 0.001,
      lng: center.lng + ((seed + i) % 7 - 3) * 0.001,
      zone: zoneId,
      timestamp: new Date(now.getTime() + i * 90000).toISOString(),
      confidence: 0.85,
      metadata: { route_id: `R-${seed + i}`, mode: 'bus', delay_minutes: 6 + ((seed + i) % 4), synthetic: true },
      scenario_id: 'normal_baseline',
    });
  }
  return events;
}
