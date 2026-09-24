import { v4 as uuid } from 'uuid';
import { citypulseConfig } from '../config/citypulse.config.js';
import { isoNow, listAlerts, writeAlert } from '../store/firestore.js';
import type {
  AlertDoc,
  AnomalyDoc,
  CorrelationDoc,
  CivicEvent,
  FeedStatusDoc,
} from '../types/civic.js';
import {
  alertFromAnomaly,
  alertFromCorrelation,
  alertFromFeedOutage,
  alertFromHighSeverityEvent,
} from './alertTemplates.js';

type TriggerKind = 'anomaly' | 'correlation' | 'event' | 'feed';

function dedupeKey(zoneId: string, kind: TriggerKind, detail: string): string {
  return `${zoneId}:${kind}:${detail}`;
}

async function isDuplicate(zoneId: string, kind: TriggerKind, detail: string): Promise<boolean> {
  const windowMs = citypulseConfig.alerts.dedupeWindowMs;
  const cutoff = Date.now() - windowMs;
  const alerts = await listAlerts();
  return alerts.some((a) => {
    if (a.zone_id !== zoneId || a.status === 'resolved') return false;
    const created = new Date(a.created_at.replace('+05:30', '+0530')).getTime();
    if (created < cutoff) return false;

    if (kind === 'anomaly' && a.source_refs?.anomaly_ids?.length) {
      return a.body.includes(detail.replace(/_/g, ' ')) || a.title.includes(detail.replace(/_/g, ' '));
    }
    if (kind === 'correlation' && a.source_refs?.correlation_ids?.length) {
      return true;
    }
    if (kind === 'event' && a.source_refs?.event_ids?.length && !a.source_refs?.anomaly_ids?.length) {
      return a.title.toLowerCase().includes(detail.replace(/_/g, ' ').toLowerCase());
    }
    if (kind === 'feed') {
      return a.title.toLowerCase().includes(detail.toLowerCase());
    }
    return false;
  });
}

async function createAlert(
  zoneId: string,
  partial: Pick<AlertDoc, 'title' | 'body' | 'severity'>,
  source_refs: AlertDoc['source_refs'],
  simulationId?: string,
): Promise<AlertDoc | null> {
  const doc: AlertDoc = {
    id: `alert_${uuid().slice(0, 8)}`,
    ...partial,
    zone_id: zoneId,
    created_at: isoNow(),
    status: 'active',
    source_refs,
    simulation_id: simulationId,
  };
  await writeAlert(doc);
  return doc;
}

export async function evaluateAlertsAfterPipeline(ctx: {
  event: CivicEvent;
  anomaly: AnomalyDoc | null;
  correlations: CorrelationDoc[];
}): Promise<AlertDoc[]> {
  const created: AlertDoc[] = [];
  const simId =
    typeof ctx.event.metadata?.simulation_id === 'string'
      ? ctx.event.metadata.simulation_id
      : undefined;
  const zone = ctx.event.location.zone;

  if (ctx.anomaly && ctx.anomaly.score >= citypulseConfig.alerts.anomalyScoreMin) {
    const detail = ctx.anomaly.event_type;
    if (!(await isDuplicate(zone, 'anomaly', detail))) {
      const a = await createAlert(
        zone,
        alertFromAnomaly(ctx.anomaly),
        { anomaly_ids: [ctx.anomaly.id], event_ids: ctx.anomaly.evidence },
        simId,
      );
      if (a) created.push(a);
    }
  }

  if (
    ctx.correlations.length >= citypulseConfig.alerts.correlationMinEvents &&
    ctx.correlations.some((c) => c.score >= citypulseConfig.alerts.correlationMinStrength)
  ) {
    if (!(await isDuplicate(zone, 'correlation', 'connection'))) {
      const a = await createAlert(
        zone,
        alertFromCorrelation(zone, ctx.correlations),
        { correlation_ids: ctx.correlations.map((c) => c.id) },
        simId,
      );
      if (a) created.push(a);
    }
  }

  if (ctx.event.severity >= citypulseConfig.alerts.eventSeverityMin) {
    if (!(await isDuplicate(zone, 'event', ctx.event.type))) {
      const a = await createAlert(
        zone,
        alertFromHighSeverityEvent(ctx.event),
        { event_ids: [ctx.event.id] },
        simId,
      );
      if (a) created.push(a);
    }
  }

  return created;
}

export async function evaluateFeedOutageAlert(feed: FeedStatusDoc): Promise<AlertDoc | null> {
  if (feed.health !== 'failed' && feed.health !== 'delayed') return null;
  const zone = 'CITY';
  if (await isDuplicate(zone, 'feed', feed.source)) return null;
  return createAlert(zone, alertFromFeedOutage(feed), { event_ids: [] });
}
