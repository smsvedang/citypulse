export function toUtcIso(date) {
  return new Date(date).toISOString().replace(/\.\d{3}Z$/, '.000Z');
}

export function parseSince(value, now = new Date()) {
  if (!value) return new Date(now.getTime() - 60 * 60 * 1000);
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const match = value.match(/^([0-9]+)([smhd])$/i);
    if (match) {
      const amount = Number(match[1]);
      const unit = match[2].toLowerCase();
      const multiplier = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit];
      return new Date(now.getTime() - amount * multiplier);
    }
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  throw new Error('INVALID_SINCE');
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function roundTo2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}
