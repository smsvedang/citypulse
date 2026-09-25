import { Router } from 'express';
import { listFeedStatus } from '../repositories/feedStatus.js';
import { computeHealth } from '../services/feedHealth.js';

const router = Router();

router.get('/feed-status', async (_req, res, next) => {
  try {
    const docs = await listFeedStatus();
    const entries = docs.map((item) => {
      const nextItem = { ...item };
      const now = Date.now();
      const lastAttemptMs = nextItem.last_attempt ? new Date(nextItem.last_attempt).getTime() : null;
      const lastSuccessMs = nextItem.last_success ? new Date(nextItem.last_success).getTime() : null;
      const health = computeHealth({
        last_success: lastSuccessMs,
        last_attempt: lastAttemptMs,
        consecutive_failures: nextItem.consecutive_failures || 0,
        expected_interval_s: nextItem.expected_interval_s || 60,
        latency_ms: nextItem.latency_ms || 0,
        rejection_ratio: nextItem.rejection_ratio || 0,
        now,
      });
      return { ...nextItem, health };
    });

    const missing = ['weather', 'traffic', 'transit', 'synthetic'].filter((source) => !entries.some((item) => item.source === source));
    for (const source of missing) {
      entries.push({ source, health: 'down', error_count: 0, last_success: null, latency_ms: 0, mode: source === 'synthetic' ? 'disabled' : 'live', expected_interval_s: 60, consecutive_failures: 0 });
    }

    const overall = entries.every((item) => item.health === 'healthy') ? 'healthy' : entries.every((item) => item.health === 'down') ? 'down' : 'degraded';
    res.set('Cache-Control', 'no-store');
    res.json({ data: entries, meta: { count: entries.length, generated_at: new Date().toISOString(), overall } });
  } catch (error) {
    next(error);
  }
});

export default router;
