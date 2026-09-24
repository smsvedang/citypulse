import { BaseAdapter } from './baseAdapter.js';
import { generateTrafficSpike } from '../generators/trafficSpike.js';
import { normalizeTraffic } from '../normalizers/traffic.js';

export class TrafficAdapter extends BaseAdapter {
  constructor(mode = 'synthetic', intervalSeconds = 60) {
    super({ source: 'traffic', mode, intervalSeconds });
  }

  async fetchRaw() {
    if (this.mode !== 'synthetic') return [];
    const now = new Date();
    return generateTrafficSpike('Z04', { now, seed: 11, count: 3, severityFrom: 0.45, severityTo: 0.7 });
  }

  normalize(raw) {
    return normalizeTraffic(raw);
  }
}
