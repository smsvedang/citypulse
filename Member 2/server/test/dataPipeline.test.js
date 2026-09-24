import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { normalizeWeather } from '../src/normalizers/weather.js';
import { scrubPii } from '../src/lib/pii.js';
import { validateEvent } from '../src/validators/eventValidator.js';

describe('data pipeline', () => {
  it('normalizes weather alerts according to the PRD', () => {
    const events = normalizeWeather({ observed_at: '2026-09-24T12:30:00+05:30', lat: 26.91, lng: 75.79, zone: 'Z04', rain_mm_per_hr: 41, wind_kph: 38, temp_c: 27, provider: 'synthetic' });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('weather_alert');
    expect(events[0].metadata.subtype).toBe('heavy_rain');
    expect(events[0].severity).toBeCloseTo(0.82, 2);
  });

  it('scrubs pii fields and redacts values', () => {
    const scrubbed = scrubPii({ email: 'user@example.com', phone: '9999999999', route_name: 'Route 7', note: 'test' });
    expect(scrubbed.email).toBeUndefined();
    expect(scrubbed.phone).toBeUndefined();
    expect(scrubbed.route_name).toBe('Route 7');
    expect(scrubbed.pii_redactions).toBeGreaterThan(0);
  });

  it('canonicalizes timestamp to UTC and validates zone data', async () => {
    const result = await validateEvent({
      id: 'evt_1234567890abcdef',
      source: 'weather',
      type: 'weather_alert',
      severity: 0.82,
      location: { lat: 26.91, lng: 75.79, zone: 'Z04' },
      timestamp: '2026-09-24T12:30:00+05:30',
      metadata: { subtype: 'heavy_rain', rain_mm: 41 },
      confidence: 0.94,
    });
    expect(result.ok).toBe(true);
    expect(result.event.timestamp).toBe('2026-09-24T07:00:00.000Z');
  });

  it('returns seeded zone list from the API', async () => {
    const app = createApp();
    const response = await request(app).get('/api/zones');
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(6);
    expect(response.body.meta.count).toBe(6);
  });
});
