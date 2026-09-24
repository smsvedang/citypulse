export const citypulseConfig = {
  alerts: {
    anomalyScoreMin: 2.0,
    eventSeverityMin: 0.75,
    correlationMinStrength: 0.65,
    correlationMinEvents: 2,
    feedOutageAfterMs: 120_000,
    dedupeWindowMs: 5 * 60_000,
    thresholds: {
      anomalyHigh: 3.0,
      anomalyMedium: 2.2,
      correlationHigh: 0.8,
      eventHigh: 0.85,
    },
  },
  analytics: {
    defaultBucket: '15m' as '5m' | '15m' | '1h',
    defaultWindowMs: 6 * 60 * 60_000,
    anomalyHighlightScoreMin: 2.0,
  },
  simulator: {
    zoneId: 'Z04',
    coordinates: { lat: 26.91, lng: 75.79 },
    stageDelaysMs: [8000, 10000, 12000],
    trafficIncidentCount: 3,
    templates: {
      rain: {
        source: 'weather',
        type: 'weather_alert',
        severity: 0.82,
        confidence: 0.94,
        metadata: { rain_mm: 42 },
      },
      traffic: {
        source: 'traffic',
        type: 'traffic_incident',
        baseSeverity: 0.55,
        severityStep: 0.12,
        confidence: 0.88,
      },
      transit: {
        source: 'transit',
        type: 'transit_delay',
        severity: 0.72,
        confidence: 0.9,
        metadata: { delay_min: 18 },
      },
    },
  },
  replay: {
    speeds: [1, 2, 5] as const,
    defaultSpeed: 1,
  },
  health: {
    feedDelayedAfterMs: 90_000,
    feedFailedAfterMs: 180_000,
  },
  zoneStatus: {
    incidentSeverityMin: 0.5,
    elevatedAnomalyScore: 2.0,
    criticalAnomalyScore: 3.0,
    elevatedIncidentCount: 10,
  },
  intelligence: {
    anomalyThreshold: 2.0,
    correlationRadiusKm: 5,
    correlationWindowMinutes: 45,
    rollingWindowMinutes: 60,
  },
  demoCity: {
    timezoneOffset: '+05:30',
  },
} as const;

export type ReplaySpeed = (typeof citypulseConfig.replay.speeds)[number];

