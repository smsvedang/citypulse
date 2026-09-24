import { clamp } from '../lib/time.js';

export function generateHeavyRain(zoneId, { now = new Date(), seed = 1, rainMm = 41 } = {}) {
  const zoneCenters = { Z01: { lat: 26.9855, lng: 75.8513 }, Z02: { lat: 26.9240, lng: 75.8270 }, Z03: { lat: 26.8500, lng: 75.8000 }, Z04: { lat: 26.9100, lng: 75.7900 }, Z05: { lat: 26.8850, lng: 75.7400 }, Z06: { lat: 26.9500, lng: 75.7300 } };
  const center = zoneCenters[zoneId] || zoneCenters.Z04;
  const lat = center.lat + ((seed % 7) - 3) * 0.001;
  const lng = center.lng + ((seed % 9) - 4) * 0.001;

  return [{
    kind: 'weather',
    type: 'weather_alert',
    severity: clamp(rainMm / 50, 0, 1),
    lat,
    lng,
    zone: zoneId,
    timestamp: new Date(now).toISOString(),
    confidence: 0.94,
    metadata: { subtype: 'heavy_rain', rain_mm: rainMm, wind_kph: 30 + (seed % 15), synthetic: true },
    scenario_id: 'rain_zone4_chain',
  }];
}
