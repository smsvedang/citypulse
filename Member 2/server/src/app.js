import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { notFoundMiddleware, errorHandler } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.js';
import zoneRoutes from './routes/zones.js';
import eventRoutes from './routes/events.js';
import feedStatusRoutes from './routes/feedStatus.js';
import replayRoutes from './routes/replay.js';
import pulseRoutes from './routes/pulse.js';
import anomaliesRoutes from './routes/anomalies.js';
import correlationsRoutes from './routes/correlations.js';
import alertsRoutes from './routes/alerts.js';

export function createApp() {
  const app = express();
  const origins = (env.CORS_ORIGINS || '').split(',').map((item) => item.trim()).filter(Boolean);

  app.use(helmet());
  app.use(cors({ origin: origins.length ? origins : true, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use((req, _res, next) => {
    logger.info({ method: req.method, path: req.path }, 'request');
    next();
  });

  app.use(rateLimit({ windowMs: 60 * 1000, max: 120, message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded' } } }));
  app.use(rateLimit({ windowMs: 60 * 1000, max: 20, keyGenerator: (req) => req.ip, skipSuccessfulRequests: false, handler: (_req, res) => res.status(429).json({ error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded' } }) }));

  app.use(healthRoutes);
  app.use('/api', zoneRoutes);
  app.use('/api', eventRoutes);
  app.use('/api', feedStatusRoutes);
  app.use('/api', replayRoutes);
  app.use('/api', pulseRoutes);
  app.use('/api', anomaliesRoutes);
  app.use('/api', correlationsRoutes);
  app.use('/api', alertsRoutes);
  app.use(notFoundMiddleware);
  app.use(errorHandler);

  return app;
}
