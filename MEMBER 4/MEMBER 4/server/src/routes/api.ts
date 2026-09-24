import { Router } from 'express';
import { citypulseConfig } from '../config/citypulse.config.js';
import {
  listAlerts,
  listAnomalies,
  listCorrelations,
  listEvents,
  listFeedStatus,
  listZones,
  patchAlert,
  upsertFeedStatus,
  isoNow,
} from '../store/firestore.js';
import { getAnalytics } from '../services/analyticsService.js';
import { computePulse, getLastPulse, ingestEvent } from '../services/eventPipeline.js';
import {
  getSystemHealth,
  simulateFeedFailure,
  simulateFeedRecover,
} from '../services/healthService.js';
import {
  replayPause,
  replayReset,
  replayResume,
  replaySetSpeed,
  replayStart,
  replayStatus,
  replayStop,
} from '../services/replayController.js';
import { evaluateFeedOutageAlert } from '../services/alertEngine.js';
import { getSimulatorStatus, resetSimulation, startZone4Simulation } from '../services/simulator.js';
import type { ReplaySpeed } from '../config/citypulse.config.js';

export const apiRouter = Router();

apiRouter.get('/config', (_req, res) => {
  res.json(citypulseConfig);
});

apiRouter.get('/events', async (req, res) => {
  try {
    const events = await listEvents({
      zone: req.query.zone as string,
      source: req.query.source as string,
      type: req.query.type as string,
      since: req.query.since as string,
      minSeverity: req.query.severity ? Number(req.query.severity) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res.json(events);
  } catch (e) {
    res.status(500).json({ message: (e as Error).message });
  }
});

apiRouter.post('/events', async (req, res) => {
  try {
    const result = await ingestEvent(req.body);
    res.status(201).json(result);
  } catch (e) {
    res.status(400).json({ message: (e as Error).message });
  }
});

apiRouter.get('/zones', async (_req, res) => {
  try {
    res.json(await listZones());
  } catch (e) {
    res.status(500).json({ message: (e as Error).message });
  }
});

apiRouter.get('/pulse', async (_req, res) => {
  try {
    const pulse = getLastPulse() ?? (await computePulse());
    res.json(pulse);
  } catch (e) {
    res.status(500).json({ message: (e as Error).message });
  }
});

apiRouter.get('/anomalies', async (_req, res) => {
  try {
    res.json(await listAnomalies());
  } catch (e) {
    res.status(500).json({ message: (e as Error).message });
  }
});

apiRouter.get('/correlations', async (_req, res) => {
  try {
    res.json(await listCorrelations());
  } catch (e) {
    res.status(500).json({ message: (e as Error).message });
  }
});

apiRouter.get('/alerts', async (req, res) => {
  try {
    res.json(await listAlerts(req.query.status as string));
  } catch (e) {
    res.status(500).json({ message: (e as Error).message });
  }
});

apiRouter.patch('/alerts/:id', async (req, res) => {
  try {
    const updated = await patchAlert(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: 'Alert not found' });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ message: (e as Error).message });
  }
});

apiRouter.get('/feed-status', async (_req, res) => {
  try {
    res.json(await listFeedStatus());
  } catch (e) {
    res.status(500).json({ message: (e as Error).message });
  }
});

apiRouter.get('/analytics', async (req, res) => {
  try {
    res.json(await getAnalytics({ window: req.query.window as string, bucket: req.query.bucket as string }));
  } catch (e) {
    res.status(500).json({ message: (e as Error).message });
  }
});

apiRouter.get('/health', async (_req, res) => {
  try {
    res.json(await getSystemHealth());
  } catch {
    res.json({
      weather: 'Unknown',
      traffic: 'Unknown',
      transit: 'Unknown',
      firestore: 'Unknown',
      groq: 'Unknown',
      lastUpdate: isoNow(),
    });
  }
});

apiRouter.post('/replay/start', async (req, res) => {
  const speed = Number(req.body?.speed) as ReplaySpeed;
  const result = await replayStart({
    speed: citypulseConfig.replay.speeds.includes(speed) ? speed : undefined,
  });
  res.status(result.ok ? 200 : 400).json({ ...result, status: replayStatus() });
});

apiRouter.post('/replay/stop', (_req, res) => {
  replayStop();
  res.json({ ok: true, status: replayStatus() });
});

apiRouter.post('/replay/pause', (_req, res) => {
  replayPause();
  res.json({ ok: true, status: replayStatus() });
});

apiRouter.post('/replay/resume', (_req, res) => {
  replayResume();
  res.json({ ok: true, status: replayStatus() });
});

apiRouter.post('/replay/speed', (req, res) => {
  const speed = Number(req.body?.speed) as ReplaySpeed;
  replaySetSpeed(speed);
  res.json({ ok: true, status: replayStatus() });
});

apiRouter.post('/replay/reset', async (_req, res) => {
  await replayReset();
  res.json({ ok: true, status: replayStatus() });
});


apiRouter.get('/replay/status', (_req, res) => {
  res.json(replayStatus());
});

apiRouter.post('/simulate/zone4', async (_req, res) => {
  const result = await startZone4Simulation();
  res.status(result.ok ? 202 : 409).json({ ...result, status: getSimulatorStatus() });
});

apiRouter.post('/simulate/reset', async (_req, res) => {
  const result = await resetSimulation();
  res.json({ ...result, status: getSimulatorStatus() });
});

apiRouter.get('/simulate/status', (_req, res) => {
  res.json(getSimulatorStatus());
});

apiRouter.post('/simulate/feed-failure', async (req, res) => {
  const feed = String(req.body?.feed ?? '').trim();
  if (!['weather', 'traffic', 'transit'].includes(feed)) {
    return res.status(400).json({ message: 'feed must be weather, traffic, or transit' });
  }
  simulateFeedFailure(feed);
  await upsertFeedStatus({
    source: feed,
    last_success: isoNow(),
    latency_ms: 9999,
    health: 'failed',
    error_count: 1,
  });
  const feeds = await listFeedStatus();
  const f = feeds.find((x) => x.source === feed);
  if (f) await evaluateFeedOutageAlert(f);
  res.json({ ok: true, feed });
});

apiRouter.post('/simulate/feed-recover', async (req, res) => {
  const feed = String(req.body?.feed ?? '').trim();
  if (!['weather', 'traffic', 'transit'].includes(feed)) {
    return res.status(400).json({ message: 'feed must be weather, traffic, or transit' });
  }
  simulateFeedRecover(feed);
  await upsertFeedStatus({
    source: feed,
    last_success: isoNow(),
    latency_ms: 350,
    health: 'healthy',
    error_count: 0,
  });
  res.json({ ok: true, feed });
});
