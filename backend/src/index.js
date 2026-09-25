import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { runFeed } from './ingestion/feedRunner.js';
import { WeatherAdapter } from './adapters/weather.js';
import { TrafficAdapter } from './adapters/traffic.js';
import { TransitAdapter } from './adapters/transit.js';

const app = createApp();
const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'server started');
});

const adapters = [
  new WeatherAdapter(env.FEED_MODE_WEATHER, env.FEED_INTERVAL_WEATHER_S),
  new TrafficAdapter(env.FEED_MODE_TRAFFIC, env.FEED_INTERVAL_TRAFFIC_S),
  new TransitAdapter(env.FEED_MODE_TRANSIT, env.FEED_INTERVAL_TRANSIT_S),
];
const feedTimers = adapters.map((adapter) => {
  const run = () => runFeed(adapter).catch((error) => logger.error({ feed: adapter.source, error }, 'feed run failed'));
  run();
  return setInterval(run, adapter.intervalSeconds * 1000);
});

const shutdown = async (signal) => {
  logger.info({ signal }, 'shutdown signal received');
  feedTimers.forEach((timer) => clearInterval(timer));
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default app;
