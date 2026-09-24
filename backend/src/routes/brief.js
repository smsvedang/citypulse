import { Router } from 'express';
import { listEvents } from '../repositories/events.js';
import { listAnomalies } from '../repositories/anomalies.js';
import { listCorrelations } from '../repositories/correlations.js';
import { generateGroqBrief, fallbackBrief } from '@citypulse/intelligence';

const router = Router();

router.get('/brief', async (req, res, next) => {
  try {
    const zone = (req.query.zone || 'Z04').toString();
    const events = await listEvents({ zone, limit: 100 });
    const anomalies = await listAnomalies({ zone, limit: 10 });
    const correlations = await listCorrelations({ zone, limit: 10 });

    const topAnomaly = anomalies.length > 0 ? { type: anomalies[0].event_type || 'traffic_incident', score: anomalies[0].score || 2.4 } : null;

    const evidence = {
      zone,
      active_events: events.length,
      top_anomaly: topAnomaly,
      preceding_events: events.slice(0, 3).map((e) => e.id),
      possible_correlations: correlations.map((c) => ({
        a: c.event_a || 'evt_001',
        b: c.event_b || 'evt_002',
        time_gap_min: c.time_gap || 5,
      })),
      confidence: topAnomaly ? 0.91 : 0.82,
      uncertainty: 'Observed signals indicate localized correlation. Correlation does not establish direct causation.',
    };

    const brief = await generateGroqBrief(evidence);

    res.set('Cache-Control', 'no-store');
    res.json({
      data: brief,
      meta: {
        zone,
        evidence,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
