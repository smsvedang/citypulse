import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { deleteSyntheticScenarioEvents } from '../repositories/events.js';

const router = Router();

const startSchema = z.object({
  scenario: z.string().optional(),
  zone: z.string().optional(),
  speed: z.enum(['1', '2', '5', '10']).optional(),
  clear_previous: z.boolean().optional(),
  seed_baseline: z.boolean().optional(),
})
  .transform((input) => ({
    ...input,
    speed: Number(input.speed || 1),
  }));

const activeRuns = new Map();

router.post('/replay/start', async (req, res) => {
  if (env.DEMO_MODE === false) {
    return res.status(403).json({ error: { code: 'DEMO_MODE_DISABLED', message: 'Replay is disabled outside demo mode.' } });
  }

  const parsed = startSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid replay payload.', details: parsed.error.issues } });
  }

  if (activeRuns.size > 0) {
    const [runId, run] = Array.from(activeRuns.entries())[0];
    return res.status(409).json({ error: { code: 'REPLAY_ALREADY_RUNNING', message: 'A replay is already active.', details: { run_id: runId, zone: run.zone } } });
  }

  const { scenario = 'rain_zone4_chain', zone = 'Z04', speed = 1, clear_previous = true, seed_baseline = true } = parsed.data;
  const runId = `run_${Date.now()}`;
  if (clear_previous) {
    await deleteSyntheticScenarioEvents(scenario);
  }

  activeRuns.set(runId, { runId, scenario, zone, speed, started_at: new Date().toISOString(), ends_at: new Date(Date.now() + 150000).toISOString() });

  return res.status(202).json({ data: { run_id: runId, scenario, zone, started_at: activeRuns.get(runId).started_at, ends_at: activeRuns.get(runId).ends_at } });
});

router.post('/replay/stop', (req, res) => {
  if (env.DEMO_MODE === false) {
    return res.status(403).json({ error: { code: 'DEMO_MODE_DISABLED', message: 'Replay is disabled outside demo mode.' } });
  }

  const [runId, run] = Array.from(activeRuns.entries())[0] || [null, null];
  if (runId) {
    activeRuns.delete(runId);
    return res.json({ data: { stopped: true, run_id: runId } });
  }

  return res.json({ data: { stopped: false, run_id: null } });
});

export { activeRuns };
export default router;
