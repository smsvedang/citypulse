import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('health endpoint', () => {
  it('returns health status', async () => {
    const app = createApp();
    const response = await request(app).get('/healthz');
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.uptime_s).toBeTypeOf('number');
  });

  it('returns a root landing response', async () => {
    const app = createApp();
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.service).toBe('CityPulse Data Module');
  });
});
