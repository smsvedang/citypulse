import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
dotenv.config({ path: path.join(repositoryRoot, '.env.local') });
dotenv.config({ path: path.join(repositoryRoot, '.env') });
dotenv.config({ path: '.env.local' });
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8080),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_B64: z.string().optional(),
  FIRESTORE_EMULATOR_HOST: z.string().optional(),
  DEMO_MODE: z.coerce.boolean().default(true),
  FEED_MODE_WEATHER: z.enum(['live', 'synthetic']).default('live'),
  FEED_MODE_TRAFFIC: z.enum(['live', 'synthetic']).default('live'),
  FEED_MODE_TRANSIT: z.enum(['live', 'synthetic']).default('live'),
  FEED_INTERVAL_WEATHER_S: z.coerce.number().int().positive().default(300),
  FEED_INTERVAL_TRAFFIC_S: z.coerce.number().int().positive().default(60),
  FEED_INTERVAL_TRANSIT_S: z.coerce.number().int().positive().default(60),
  FEED_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  AUTO_BASELINE: z.coerce.boolean().default(true),
  CITY_BBOX: z.string().default('26.70,75.55,27.15,76.05'),
  ZONE_MAX_RADIUS_KM: z.coerce.number().positive().default(8),
  MAX_EVENT_AGE_HOURS: z.coerce.number().int().positive().default(24),
  LOG_LEVEL: z.string().default('info'),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
});

export const env = envSchema.parse(process.env);
export const config = env;
