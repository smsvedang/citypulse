import { clamp, roundTo2 } from '../lib/time.js';
import { createDeterministicEventId } from '../lib/ids.js';

export function normalizeWeather(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('RAW_INVALID');
  const now = new Date();
  const records = [];
  const timestamp = raw.observed_at || raw.timestamp || new Date().toISOString();
  const base = {
    source: 'weather',
    location: { lat: Number(raw.lat), lng: Number(raw.lng), zone: raw.zone || 'Z04' },
    timestamp,
    metadata: { provider: raw.provider || 'weather' },
    confidence: 0.94,
  };

  if (Number(raw.rain_mm_per_hr) >= 7.6) {
    const severity = clamp(Number(raw.rain_mm_per_hr) / 50, 0, 1);
    records.push({
      ...base,
      type: 'weather_alert',
      severity: roundTo2(severity),
      metadata: {
        ...base.metadata,
        subtype: 'heavy_rain',
        rain_mm: Number(raw.rain_mm_per_hr),
      },
      confidence: 0.94,
    });
  }

  if (Number(raw.wind_kph) >= 60) {
    const severity = clamp(Number(raw.wind_kph) / 100, 0, 1);
    records.push({
      ...base,
      type: 'weather_alert',
      severity: roundTo2(severity),
      metadata: {
        ...base.metadata,
        subtype: 'high_wind',
        wind_kph: Number(raw.wind_kph),
      },
      confidence: 0.9,
    });
  }

  return records;
}
