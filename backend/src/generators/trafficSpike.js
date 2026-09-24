import { clamp } from '../lib/time.js';

export function generateTrafficSpike(zoneId, { now = new Date(), seed = 1, count = 8, severityFrom = 0.45, severityTo = 0.9 } = {}) {
  const zoneCenters = { Z01: { lat: 26.9855, lng: 75.8513 }, Z02: { lat: 26.9240, lng: 75.8270 }, Z03: { lat: 26.8500, lng: 75.8000 }, Z04: { lat: 26.9100, lng: 75.7900 }, Z05: { lat: 26.8850, lng: 75.7400 }, Z06: { lat: 26.9500, lng: 75.7300 } };
  const center = zoneCenters[zoneId] || zoneCenters.Z04;
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const ratio = count === 1 ? 0 : i / (count - 1);
    const severity = clamp(severityFrom + (severityTo - severityFrom) * ratio, 0, 1);
    const category = i % 5 === 0 ? 'flooding_congestion' : i % 4 === 0 ? 'accident' : i % 3 === 0 ? 'stalled_vehicle' : 'congestion';
    const type = i % 5 === 0 ? 'road_hazard' : 'traffic_incident';
    const delay = Math.round(severity * 60);
    out.push({
      kind: 'traffic',
      type,
      severity,
      lat: center.lat + ((seed + i) % 7 - 3) * 0.001,
      lng: center.lng + ((seed + i) % 9 - 4) * 0.001,
      zone: zoneId,
      timestamp: new Date(now.getTime() + i * 1000).toISOString(),
      confidence: 0.9,
      metadata: { category, delay_minutes: delay, synthetic: true },
      scenario_id: 'rain_zone4_chain',
    });
  }
  return out;
}
