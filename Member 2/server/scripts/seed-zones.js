#!/usr/bin/env node
import { seedZones } from '../src/repositories/zones.js';

try {
  const zones = await seedZones();
  console.log(`Seeded ${zones.length} zones`);
} catch (error) {
  console.error(error);
  process.exit(1);
}
