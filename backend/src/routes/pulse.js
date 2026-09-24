import { Router } from 'express';
import { listZones } from '../repositories/zones.js';
import { listEvents } from '../repositories/events.js';
import { listFeedStatus } from '../repositories/feedStatus.js';
import { computePulse } from '../services/pulseService.js';

const router = Router();

router.get('/pulse', async (_req, res, next) => {
  try {
    const zones = await listZones();
    const recent = await listEvents({ limit: 500 });
    const feedStatus = await listFeedStatus();
    const payload = computePulse({ zones, recentEvents: recent, feedStatus, now: Date.now() });
    res.set('Cache-Control', 'no-store');
    res.json({ data: payload, meta: { generated_at: new Date().toISOString(), interim: true } });
  } catch (error) {
    next(error);
  }
});

export default router;
