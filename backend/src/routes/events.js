import { Router } from 'express';
import { z } from 'zod';
import { listEvents, addEvent } from '../repositories/events.js';
import { env } from '../config/env.js';
import { createRandomEventId } from '../lib/ids.js';
import { scrubPii } from '../lib/pii.js';
import { validateEvent } from '../validators/eventValidator.js';
import { normalizeSynthetic, normalizeTraffic, normalizeTransit, normalizeWeather } from '../normalizers/index.js';

const router = Router();

const querySchema = z.object({
  zone: z.string().optional(),
  source: z.string().optional(),
  type: z.string().optional(),
  since: z.string().optional(),
  severity: z.coerce.number().min(0).max(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

router.get('/events', async (req, res, next) => {
  try {
    const safe = querySchema.parse(req.query);
    const since = safe.since || new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const data = await listEvents({
      zone: safe.zone,
      source: safe.source ? safe.source.split(',') : undefined,
      type: safe.type ? safe.type.split(',') : undefined,
      since,
      severity: safe.severity,
      limit: safe.limit || 100,
    });
    res.set('Cache-Control', 'no-store');
    res.json({ data, meta: { count: data.length, generated_at: new Date().toISOString(), last_event_at: data[0]?.timestamp || null, filters: safe } });
  } catch (error) {
    next(error);
  }
});

router.post('/events', async (req, res, next) => {
  try {
    if (env.DEMO_MODE === false) {
      return res.status(403).json({ error: { code: 'DEMO_MODE_DISABLED', message: 'This endpoint is disabled in non-demo mode.' } });
    }

    const payload = req.body || {};
    const events = Array.isArray(payload.events) ? payload.events : [payload];
    const accepted = [];
    const rejected = [];

    for (let index = 0; index < events.length; index += 1) {
      const item = events[index];
      let candidate = { ...item };
      if (!candidate.id && !payload.preset) candidate.id = createRandomEventId();
      if (payload.preset) {
        const presetMap = {
          heavy_rain: { source: 'weather', type: 'weather_alert', severity: 0.82, location: { lat: 26.91, lng: 75.79, zone: 'Z04' }, timestamp: new Date().toISOString(), metadata: { synthetic: true, subtype: 'heavy_rain', rain_mm: 41, scenario_id: payload.preset }, confidence: 0.94 },
          traffic_spike: { source: 'traffic', type: 'traffic_incident', severity: 0.6, location: { lat: 26.91, lng: 75.79, zone: 'Z04' }, timestamp: new Date().toISOString(), metadata: { synthetic: true, scenario_id: payload.preset }, confidence: 0.9 },
          transit_delay: { source: 'transit', type: 'transit_delay', severity: 0.4, location: { lat: 26.91, lng: 75.79, zone: 'Z04' }, timestamp: new Date().toISOString(), metadata: { synthetic: true, scenario_id: payload.preset }, confidence: 0.85 },
          normal_baseline: { source: 'traffic', type: 'traffic_incident', severity: 0.2, location: { lat: 26.91, lng: 75.79, zone: 'Z04' }, timestamp: new Date().toISOString(), metadata: { synthetic: true, scenario_id: payload.preset }, confidence: 0.8 },
        };
        candidate = { ...presetMap[payload.preset], ...payload.options, location: { ...presetMap[payload.preset].location, ...(payload.options?.location || {}) }, metadata: { ...presetMap[payload.preset].metadata, ...(payload.options?.metadata || {}) } };
      }

      if (candidate.metadata) candidate.metadata = scrubPii(candidate.metadata);
      if (candidate.source === 'weather' && candidate.type === 'weather_alert' && candidate.metadata?.synthetic === true) {
        candidate.metadata.synthetic = true;
      }
      if (!candidate.id) candidate.id = createRandomEventId();
      candidate.metadata = candidate.metadata || {};
      if (!candidate.source && candidate.kind) {
        candidate.source = candidate.kind === 'civic' ? 'synthetic' : candidate.kind;
      }
      if (candidate.source && candidate.source !== 'synthetic' && candidate.metadata.synthetic === true) {
        candidate.metadata.synthetic = true;
      }
      candidate.metadata.manual = true;
      if (candidate.type === 'weather_alert' && candidate.metadata?.subtype === 'heavy_rain') {
        candidate.metadata.subtype = 'heavy_rain';
      }

      const validation = await validateEvent(candidate);
      if (!validation.ok) {
        rejected.push({ index, errors: validation.errors });
        continue;
      }
      const event = validation.event;
      await addEvent(event);
      accepted.push(event);
    }

    if (!accepted.length) {
      return res.status(422).json({ error: { code: 'VALIDATION_FAILED', message: 'No events were accepted.', details: rejected } });
    }

    return res.status(201).json({ data: { accepted, rejected } });
  } catch (error) {
    next(error);
  }
});

export default router;
