import { BaseAdapter } from './baseAdapter.js';
import { generateHeavyRain } from '../generators/heavyRain.js';
import { normalizeWeather } from '../normalizers/weather.js';

export class WeatherAdapter extends BaseAdapter {
  constructor(mode = 'synthetic', intervalSeconds = 300) {
    super({ source: 'weather', mode, intervalSeconds });
  }

  async fetchRaw() {
    if (this.mode !== 'synthetic') return [];
    const now = new Date();
    const events = generateHeavyRain('Z04', { now, seed: 3, rainMm: 41 });
    return events;
  }

  normalize(raw) {
    return normalizeWeather(raw);
  }
}
