import crypto from 'node:crypto';

export function createDeterministicEventId({ source, type, zone, dedupeKey }) {
  const raw = `${source}|${type}|${zone}|${dedupeKey}`;
  return `evt_${crypto.createHash('sha1').update(raw).digest('hex').slice(0, 16)}`;
}

export function createRandomEventId() {
  return `evt_${crypto.randomBytes(8).toString('hex')}`;
}
