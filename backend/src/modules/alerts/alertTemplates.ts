import { citypulseConfig } from '../config/citypulse.config.js';
import type { AlertDoc, AnomalyDoc, CorrelationDoc, CivicEvent, FeedStatusDoc } from '../types/civic.js';

export function alertFromAnomaly(anomaly: AnomalyDoc): Pick<AlertDoc, 'title' | 'body' | 'severity'> {
  const { anomalyHigh, anomalyMedium } = citypulseConfig.alerts.thresholds;
  const sev: AlertDoc['severity'] =
    anomaly.score >= anomalyHigh ? 'high' : anomaly.score >= anomalyMedium ? 'medium' : 'low';
  return {
    severity: sev,
    title: `Possible disruption in ${anomaly.zone_id}`,
    body: `Elevated ${anomaly.event_type.replace(/_/g, ' ')} activity was detected (anomaly score ${anomaly.score}). This may indicate unusual conditions; correlation does not prove causation.`,
  };
}

export function alertFromCorrelation(
  zoneId: string,
  correlations: CorrelationDoc[],
): Pick<AlertDoc, 'title' | 'body' | 'severity'> {
  const { correlationHigh } = citypulseConfig.alerts.thresholds;
  return {
    severity: correlations.some((c) => c.score >= correlationHigh) ? 'high' : 'medium',
    title: `Possible connection detected in ${zoneId}`,
    body: `Multiple civic signals in the same area occurred close in time and space (${correlations.length} possible link(s)). Heavy weather and traffic or transit signals may be related; this is not confirmed causation.`,
  };
}

export function alertFromHighSeverityEvent(event: CivicEvent): Pick<AlertDoc, 'title' | 'body' | 'severity'> {
  const { eventHigh } = citypulseConfig.alerts.thresholds;
  return {
    severity: event.severity >= eventHigh ? 'high' : 'medium',
    title: `High-severity ${event.type.replace(/_/g, ' ')} in ${event.location.zone}`,
    body: `A ${event.type.replace(/_/g, ' ')} event with severity ${event.severity.toFixed(2)} was recorded. Review nearby incidents for context; do not assume root cause without verification.`,
  };
}

export function alertFromFeedOutage(feed: FeedStatusDoc): Pick<AlertDoc, 'title' | 'body' | 'severity'> {
  return {
    severity: feed.health === 'failed' ? 'high' : 'medium',
    title: `${feed.source} feed ${feed.health}`,
    body: `The ${feed.source} data feed appears ${feed.health}. Other feeds and the dashboard should remain usable; treat missing ${feed.source} data with lower confidence.`,
  };
}
