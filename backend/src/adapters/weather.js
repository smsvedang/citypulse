import { BaseAdapter } from './baseAdapter.js';
import { generateHeavyRain } from '../generators/heavyRain.js';
import { normalizeWeather } from '../normalizers/weather.js';
import { zoneSeedData } from '../config/zones.seed.js';

export class WeatherAdapter extends BaseAdapter {
  constructor(mode = 'synthetic', intervalSeconds = 300) {
    super({ source: 'weather', mode, intervalSeconds });
  }

  async fetchRaw() {
    if (this.mode === 'synthetic') {
      const now = new Date();
      return generateHeavyRain('Z04', { now, seed: 3, rainMm: 41 });
    }

    return Promise.all(zoneSeedData.map(async (zone) => {
      const params = new URLSearchParams({
        latitude: String(zone.center.lat),
        longitude: String(zone.center.lng),
        current: 'precipitation,rain,wind_speed_10m',
        timezone: 'UTC',
      });
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (!response.ok) throw new Error(`OPEN_METEO_${response.status}`);
      const data = await response.json();
      return {
        lat: zone.center.lat,
        lng: zone.center.lng,
        zone: zone.id,
        provider: 'open-meteo',
        observed_at: data.current?.time ? `${data.current.time}:00Z` : new Date().toISOString(),
        rain_mm_per_hr: Number(data.current?.rain || 0),
        wind_kph: Number(data.current?.wind_speed_10m || 0),
      };
    }));
  }

  normalize(raw) {
    return normalizeWeather(raw);
  }
}
