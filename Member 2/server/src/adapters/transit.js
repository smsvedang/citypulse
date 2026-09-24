import { BaseAdapter } from './baseAdapter.js';
import { generateTransitDelay } from '../generators/transitDelay.js';
import { normalizeTransit } from '../normalizers/transit.js';

export class TransitAdapter extends BaseAdapter {
  constructor(mode = 'synthetic', intervalSeconds = 60) {
    super({ source: 'transit', mode, intervalSeconds });
  }

  async fetchRaw() {
    if (this.mode !== 'synthetic') return [];
    const now = new Date();
    return generateTransitDelay('Z04', { now, seed: 5, routes: 2 });
  }

  normalize(raw) {
    return normalizeTransit(raw);
  }
}
