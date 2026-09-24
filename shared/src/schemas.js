import { z } from 'zod';
import {
  SOURCES,
  EVENT_TYPES,
  FEED_HEALTH,
  ALERT_SEVERITIES,
  ALERT_STATUSES,
  ZONE_STATUSES,
} from './enums.js';

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
  timestamp: z.string().refine((val) => !Number.isNaN(new Date(val).getTime()), {
    message: 'Invalid ISO timestamp',
  }),
  metadata: z.record(z.unknown()).default({}),
  confidence: z.number().finite().min(0).max(1),
});

export const zoneSchema = z.object({
  id: z.string().regex(/^Z0[1-9]$/),
  name: z.string().min(1),
  center: z.object({
    lat: z.number().finite().min(-90).max(90),
    lng: z.number().finite().min(-180).max(180),
  }),
  baseline_config: z.object({
    window_minutes: z.number().positive(),
    threshold: z.number().positive(),
  }),
  status: z.enum(ZONE_STATUSES).optional(),
});

export const anomalySchema = z.object({
  id: z.string(),
  zone_id: z.string(),
  event_type: z.string(),
  score: z.number(),
  detected_at: z.string(),
  evidence: z.array(z.string()),
  simulation_id: z.string().optional(),
});

export const correlationSchema = z.object({
  id: z.string(),
  event_a: z.string(),
  event_b: z.string(),
  time_gap: z.number(),
  distance: z.number(),
  score: z.number(),
  interpretation: z.string(),
  zone_id: z.string().optional(),
  simulation_id: z.string().optional(),
});

export const alertSchema = z.object({
  id: z.string(),
  severity: z.enum(ALERT_SEVERITIES),
  title: z.string(),
  body: z.string(),
  zone_id: z.string(),
  created_at: z.string(),
  status: z.enum(ALERT_STATUSES),
  source_refs: z
    .object({
      anomaly_ids: z.array(z.string()).optional(),
      correlation_ids: z.array(z.string()).optional(),
      event_ids: z.array(z.string()).optional(),
    })
    .optional(),
  simulation_id: z.string().optional(),
});

export const feedStatusSchema = z.object({
  source: z.enum(SOURCES),
  last_success: z.string(),
  latency_ms: z.number(),
  health: z.enum(FEED_HEALTH),
  error_count: z.number().nonnegative(),
  mode: z.enum(['live', 'synthetic']).optional(),
  last_attempt: z.string().optional(),
  last_error: z.string().nullable().optional(),
  consecutive_failures: z.number().nonnegative().optional(),
  expected_interval_s: z.number().positive().optional(),
  events_ingested_total: z.number().nonnegative().optional(),
  events_rejected_total: z.number().nonnegative().optional(),
});

export const apiEnvelopeSchema = (itemSchema) =>
  z.object({
    data: z.array(itemSchema),
    meta: z.record(z.unknown()),
  });

export const apiSingleEnvelopeSchema = (itemSchema) =>
  z.object({
    data: itemSchema,
    meta: z.record(z.unknown()),
  });

