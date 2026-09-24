import { clamp } from '../lib/time.js';

export function generateTransitDelay(zoneId, { now = new Date(), seed = 1, routes = 3 } = {}) {
  const zoneCenters = { Z01: { lat: 26.9855, lng: 75.8513 }, Z02: { lat: 26.9240, lng: 75.8270 }, Z03: { lat: 26.8500, lng: 75.8000 }, Z04: { lat: 26.9100, lng: 75.7900 }, Z05: { lat: 26.8850, lng: 75.7400 }, Z06: { lat: 26.9500, lng: 75.7300 } };
  const center = zoneCenters[zoneId] || zoneCenters.Z04;
  const out = [];
  for (let i = 0; i < routes; i += 1) {
    const delay = 12 + ((seed + i) % 16);
    out.push({
      kind: 'transit',
      type: 'transit_delay',
      severity: clamp(delay / 30, 0, 1),
      lat: center.lat + ((seed + i) % 7 - 3) * 0.001,
      lng: center.lng + ((seed + i) % 9 - 4) * 0.001,
      zone: zoneId,
      timestamp: new Date(now.getTime() + i * 15000).toISOString(),
      confidence: 0.85,
      metadata: { route_id: `R-${i + 1}`, mode: 'bus', delay_minutes: delay, synthetic: true },
      scenario_id: 'rain_zone4_chain',
    });
  }
  return out;
}
