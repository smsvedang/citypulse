export class BaseAdapter {
  constructor({ source, mode = 'synthetic', intervalSeconds = 60 }) {
    this.source = source;
    this.mode = mode;
    this.intervalSeconds = intervalSeconds;
  }

  async fetchRaw() {
    return [];
  }

  normalize(raw) {
    return raw;
  }
}
