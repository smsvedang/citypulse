export const CIVIC_EVENT_TYPES = [
  'weather_alert',
  'traffic_incident',
  'transit_delay',
  'civic_complaint',
  'power_outage',
  'road_hazard',
  'air_quality_alert',
] as const;

export type CivicEventType = (typeof CIVIC_EVENT_TYPES)[number];

export interface CivicEvent {
  id: string;
  source: string;
  type: CivicEventType | string;
  severity: number;
  location: { lat: number; lng: number; zone: string };
  timestamp: string;
  metadata: Record<string, unknown>;
  confidence: number;
}

export interface ZoneDoc {
  id: string;
  name: string;
  center: { lat: number; lng: number };
  status?: string;
  baseline_config?: { window_minutes: number; threshold: number };
  last_updated?: string;
}

export interface AnomalyDoc {
  id: string;
  zone_id: string;
  event_type: string;
  score: number;
  detected_at: string;
  evidence: string[];
  simulation_id?: string;
}

export interface CorrelationDoc {
  id: string;
  event_a: string;
  event_b: string;
  time_gap: number;
  distance: number;
  score: number;
  interpretation: string;
  zone_id?: string;
  simulation_id?: string;
}

export interface AlertDoc {
  id: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  body: string;
  zone_id: string;
  created_at: string;
  status: 'active' | 'acknowledged' | 'resolved';
  source_refs?: {
    anomaly_ids?: string[];
    correlation_ids?: string[];
    event_ids?: string[];
  };
  simulation_id?: string;
}

export interface FeedStatusDoc {
  source: string;
  last_success: string;
  latency_ms: number;
  health: 'healthy' | 'delayed' | 'failed';
  error_count: number;
}

export interface PulseResponse {
  status: string;
  active_incidents: number;
  top_zone: string | null;
  top_anomaly: { type: string; score: number } | null;
  last_updated: string;
  brief?: GroqBrief | null;
  evidence?: EvidenceObject | null;
}

export interface EvidenceObject {
  zone: string;
  active_events: number;
  top_anomaly: { type: string; score: number } | null;
  preceding_events: string[];
  possible_correlations: Array<{ a: string; b: string; time_gap_min: number }>;
  confidence: number;
  uncertainty: string;
}

export interface GroqBrief {
  headline: string;
  what_happened: string;
  why_it_matters: string;
  evidence: string[];
  uncertainty: string;
  source: 'groq' | 'fallback';
}
