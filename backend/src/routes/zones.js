import { Router } from 'express';
import { listZones } from '../repositories/zones.js';

const router = Router();

router.get('/zones', async (_req, res, next) => {
  try {
    const data = await listZones();
    res.set('Cache-Control', 'no-store');
    res.json({ data, meta: { count: data.length, generated_at: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
});

export default router;
