import { validateEvent } from '../validators/eventValidator.js';
import { scrubPii } from '../lib/pii.js';
import { addEvent } from '../repositories/events.js';
import { upsertFeedStatus } from '../repositories/feedStatus.js';
import { logger } from '../lib/logger.js';
import { createDeterministicEventId } from '../lib/ids.js';

export async function runFeed(adapter, { now = new Date() } = {}) {
  const t0 = Date.now();
  let accepted = 0;
  let rejected = 0;
  const rejections = [];

  try {
    const rawRecords = await adapter.fetchRaw({ signal: undefined, now });
    const normalized = [];

    for (const raw of rawRecords) {
      try {
        const candidates = Array.isArray(adapter.normalize(raw)) ? adapter.normalize(raw) : [adapter.normalize(raw)];
        for (const candidate of candidates) {
          const cleaned = { ...candidate, metadata: scrubPii(candidate.metadata || {}) };
          cleaned.id = cleaned.id || createDeterministicEventId({ source: cleaned.source, type: cleaned.type, zone: cleaned.location?.zone || 'Z04', dedupeKey: `${cleaned.timestamp}-${cleaned.metadata?.scenario_id || cleaned.metadata?.route_id || 'synthetic'}` });
          const result = await validateEvent(cleaned);
          if (!result.ok) {
            rejected += 1;
            rejections.push({ source: adapter.source, code: result.errors[0]?.code || 'VALIDATION_FAILED' });
            continue;
          }
          normalized.push(result.event);
        }
      } catch (error) {
        rejected += 1;
        rejections.push({ source: adapter.source, code: 'NORMALIZATION_FAILED' });
      }
    }

    const batch = normalized.slice(0, 400);
    for (const event of batch) {
      await addEvent(event);
      accepted += 1;
    }

    await upsertFeedStatus(adapter.source, {
      source: adapter.source,
      last_success: new Date().toISOString(),
      latency_ms: Date.now() - t0,
      health: 'healthy',
      error_count: 0,
      mode: adapter.mode,
      last_attempt: new Date().toISOString(),
      consecutive_failures: 0,
      expected_interval_s: adapter.intervalSeconds,
      events_ingested_total: accepted,
      events_rejected_total: rejected,
      last_rejection_reason: rejections[0]?.code || null,
    });

    logger.info({ feed: adapter.source, mode: adapter.mode, fetched: rawRecords.length, accepted, rejected, latency_ms: Date.now() - t0, health: 'healthy' }, 'feed run success');
    return { ok: true, accepted, rejected };
  } catch (error) {
    await upsertFeedStatus(adapter.source, {
      source: adapter.source,
      last_success: null,
      latency_ms: Date.now() - t0,
      health: 'down',
      error_count: 1,
      mode: adapter.mode,
      last_attempt: new Date().toISOString(),
      last_error: String(error.message || error).slice(0, 200),
      consecutive_failures: 1,
      expected_interval_s: adapter.intervalSeconds,
      events_ingested_total: 0,
      events_rejected_total: rejected,
      last_rejection_reason: 'FAILED_RUN',
    });

    logger.warn({ feed: adapter.source, error: String(error.message || error) }, 'feed run failed');
    return { ok: false, accepted: 0, rejected: 1 };
  }
}
