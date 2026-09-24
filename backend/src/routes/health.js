import { Router } from 'express';
import { env } from '../config/env.js';

const router = Router();

router.get('/', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, service: 'CityPulse Data Module', uptime_s: Math.floor(process.uptime()), message: 'CityPulse data service is running.' });
});

router.get('/healthz', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, uptime_s: Math.floor(process.uptime()) });
});

router.get('/api/healthz', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, uptime_s: Math.floor(process.uptime()) });
});

router.get('/health', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, uptime_s: Math.floor(process.uptime()), node_env: env.NODE_ENV });
});

router.get('/api/health', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, uptime_s: Math.floor(process.uptime()), node_env: env.NODE_ENV });
});

export default router;
