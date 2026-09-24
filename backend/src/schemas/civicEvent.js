import { z } from 'zod';

export const SOURCES = ['weather', 'traffic', 'transit', 'synthetic'];
export const EVENT_TYPES = ['weather_alert', 'traffic_incident', 'transit_delay', 'civic_complaint', 'power_outage', 'road_hazard', 'air_quality_alert'];
export const FEED_SOURCES = ['weather', 'traffic', 'transit', 'synthetic'];

export const civicEventSchema = z.object({
  id: z.string().regex(/^evt_[a-z0-9_]{3,32}$/),
  source: z.enum(SOURCES),
  type: z.enum(EVENT_TYPES),
  severity: z.number().finite().min(0).max(1),
  location: z.object({
    lat: z.number().finite().min(-90).max(90),
    lng: z.number().finite().min(-180).max(180),
    zone: z.string().min(1),
  }),
  timestamp: z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: 'Invalid timestamp',
  }),
  metadata: z.object({}).passthrough(),
  confidence: z.number().finite().min(0).max(1),
});

export const zoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  center: z.object({ lat: z.number(), lng: z.number() }),
  baseline_config: z.object({ window_minutes: z.number(), threshold: z.number() }),
});
