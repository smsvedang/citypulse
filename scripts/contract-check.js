import {
  SOURCES,
  EVENT_TYPES,
  FEED_HEALTH,
  civicEventSchema,
  zoneSchema,
  zoneSeedData,
  fixtures,
} from '../shared/src/index.js';

console.log('--- CityPulse Contract Verification ---');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed += 1;
  } else {
    console.error(`[FAIL] ${message}`);
    failed += 1;
  }
}

// 1. Enums
assert(SOURCES.includes('weather') && SOURCES.includes('synthetic'), 'Sources enum matches contract');
assert(EVENT_TYPES.includes('weather_alert') && EVENT_TYPES.includes('traffic_incident'), 'Event types enum matches contract');
assert(FEED_HEALTH.includes('healthy') && FEED_HEALTH.includes('down'), 'Feed health enum matches contract');

// 2. Zones Seed
assert(zoneSeedData.length === 6, `Expected exactly 6 zones, found ${zoneSeedData.length}`);
const zoneIds = zoneSeedData.map(z => z.id);
assert(zoneIds.every((id, i) => id === `Z0${i + 1}`), 'Zone IDs adhere strictly to Z01..Z06 convention');

// 3. Schema validation against fixtures
let eventValidationPassed = true;
for (const event of fixtures.events) {
  const result = civicEventSchema.safeParse(event);
  if (!result.success) {
    console.error(`Event ${event.id} validation failed:`, result.error.format());
    eventValidationPassed = false;
  }
}
assert(eventValidationPassed, 'All fixture events pass civicEventSchema');

let zoneValidationPassed = true;
for (const zone of fixtures.zones) {
  const result = zoneSchema.safeParse({
    id: zone.id,
    name: zone.name,
    center: zone.center,
    baseline_config: zone.baseline_config,
    status: zone.status,
  });
  if (!result.success) {
    console.error(`Zone ${zone.id} validation failed:`, result.error.format());
    zoneValidationPassed = false;
  }
}
assert(zoneValidationPassed, 'All fixture zones pass zoneSchema');

console.log(`\nContract check complete: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
