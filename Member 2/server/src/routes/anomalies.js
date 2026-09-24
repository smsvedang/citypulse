import { Router } from 'express';
import { z } from 'zod';
import { listAnomalies } from '../repositories/anomalies.js';

const router = Router();

const querySchema = z.object({
  zone: z.string().optional(),
  since: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

router.get('/anomalies', async (req, res, next) => {
  try {
    const parsed = querySchema.parse(req.query);
    const data = await listAnomalies({ zone: parsed.zone, since: parsed.since, limit: parsed.limit || 50 });
    res.set('Cache-Control', 'no-store');
    res.json({ data, meta: { count: data.length, generated_at: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
});

export default router;
