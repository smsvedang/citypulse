#!/usr/bin/env node
import { generateNormalBaseline } from '../src/generators/normalBaseline.js';
import { normalizeSynthetic } from '../src/normalizers/synthetic.js';
import { validateEvent } from '../src/validators/eventValidator.js';
import { addEvent } from '../src/repositories/events.js';
import { zoneSeedData } from '../src/config/zones.seed.js';

const minutes = Number(process.argv[2]?.replace('--minutes=', '') || 120);
const now = new Date();

for (const zone of zoneSeedData) {
  const raw = generateNormalBaseline(zone.id, { now, seed: 1 });
  for (const item of raw) {
    const normalized = normalizeSynthetic(item);
    const validated = await validateEvent({ ...normalized, id: `evt_seed_${zone.id}_${Math.random().toString(16).slice(2, 10)}` });
    if (validated.ok) {
      await addEvent(validated.event);
    }
  }
}

console.log(`Backfilled baseline for ${zoneSeedData.length} zones with ${minutes} minutes of synthetic data`);
