import { zoneSeedData } from './zones.js';

export const fixtures = {
  zones: zoneSeedData.map((z, idx) => ({
    ...z,
    status: idx === 3 ? 'Elevated' : idx === 1 ? 'Elevated' : 'Normal',
    residents: ['11,800', '14,200', '9,600', '18,400', '12,100', '7,300'][idx],
    place: [
      'North Market & Old Town',
      'East Works & Station',
      'Civic Center',
      'Riverside & Central Loop',
      'Southside & Greenway',
      'Harbor District'
    ][idx]
  })),

  events: [
    {
      id: 'evt_rain_z04_001',
      source: 'weather',
      type: 'weather_alert',
      severity: 0.85,
      location: { lat: 26.91, lng: 75.79, zone: 'Z04' },
      timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      metadata: { subtype: 'heavy_rain', rain_mm: 42.5, synthetic: true, scenario_id: 'rain_zone4_chain' },
      confidence: 0.94,
    },
    {
      id: 'evt_traf_z04_002',
      source: 'traffic',
      type: 'traffic_incident',
      severity: 0.78,
      location: { lat: 26.912, lng: 75.788, zone: 'Z04' },
      timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      metadata: { category: 'flooding_congestion', delay_minutes: 45, synthetic: true, scenario_id: 'rain_zone4_chain' },
      confidence: 0.90,
    },
    {
      id: 'evt_tran_z04_003',
      source: 'transit',
      type: 'transit_delay',
      severity: 0.60,
      location: { lat: 26.908, lng: 75.792, zone: 'Z04' },
      timestamp: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
      metadata: { route_name: 'Route 12 - Riverside', delay_minutes: 18, synthetic: true, scenario_id: 'rain_zone4_chain' },
      confidence: 0.85,
    },
    {
      id: 'evt_traf_z02_004',
      source: 'traffic',
      type: 'traffic_incident',
      severity: 0.40,
      location: { lat: 26.924, lng: 75.827, zone: 'Z02' },
      timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
      metadata: { category: 'congestion', delay_minutes: 15, synthetic: true },
      confidence: 0.80,
    },
    {
      id: 'evt_weat_z01_005',
      source: 'weather',
      type: 'weather_alert',
      severity: 0.35,
      location: { lat: 26.9855, lng: 75.8513, zone: 'Z01' },
      timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
      metadata: { subtype: 'high_wind', wind_kph: 35, synthetic: true },
      confidence: 0.90,
    },
    {
      id: 'evt_road_z05_006',
      source: 'traffic',
      type: 'road_hazard',
      severity: 0.50,
      location: { lat: 26.885, lng: 75.74, zone: 'Z05' },
      timestamp: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
      metadata: { hazard: 'surface_water', synthetic: true },
      confidence: 0.82,
    },
    {
      id: 'evt_civic_z03_007',
      source: 'synthetic',
      type: 'civic_complaint',
      severity: 0.25,
      location: { lat: 26.85, lng: 75.8, zone: 'Z03' },
      timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      metadata: { category: 'drainage_check', synthetic: true },
      confidence: 0.88,
    }
  ],

  anomalies: [
    {
      id: 'anom_z04_traffic_001',
      zone_id: 'Z04',
      event_type: 'traffic_incident',
      score: 2.4,
      detected_at: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
      evidence: ['evt_rain_z04_001', 'evt_traf_z04_002'],
      simulation_id: 'rain_zone4_chain',
    },
  ],

  correlations: [
    {
      id: 'corr_rain_traffic_z04',
      event_a: 'evt_rain_z04_001',
      event_b: 'evt_traf_z04_002',
      time_gap: 4,
      distance: 0.35,
      score: 0.86,
      interpretation: 'Heavy rain localized in Zone 4 immediately preceded a surge in traffic congestion.',
      zone_id: 'Z04',
      simulation_id: 'rain_zone4_chain',
    },
    {
      id: 'corr_traffic_transit_z04',
      event_a: 'evt_traf_z04_002',
      event_b: 'evt_tran_z04_003',
      time_gap: 3,
      distance: 0.42,
      score: 0.74,
      interpretation: 'Traffic congestion on Riverside corridor is propagating into bus Route 12 transit delays.',
      zone_id: 'Z04',
      simulation_id: 'rain_zone4_chain',
    }
  ],

  alerts: [
    {
      id: 'alt_z04_spike_001',
      severity: 'high',
      title: 'Incident spike in Zone 4',
      body: 'Multiple severe traffic disruptions and weather warnings active in Riverside & Central Loop.',
      zone_id: 'Z04',
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      status: 'active',
      source_refs: {
        anomaly_ids: ['anom_z04_traffic_001'],
        correlation_ids: ['corr_rain_traffic_z04'],
        event_ids: ['evt_rain_z04_001', 'evt_traf_z04_002'],
      },
      simulation_id: 'rain_zone4_chain',
    }
  ],

  feed_status: [
    {
      source: 'weather',
      last_success: new Date(Date.now() - 28 * 1000).toISOString(),
      latency_ms: 320,
      health: 'healthy',
      error_count: 0,
      mode: 'synthetic',
      expected_interval_s: 300,
    },
    {
      source: 'traffic',
      last_success: new Date(Date.now() - 15 * 1000).toISOString(),
      latency_ms: 180,
      health: 'healthy',
      error_count: 0,
      mode: 'synthetic',
      expected_interval_s: 60,
    },
    {
      source: 'transit',
      last_success: new Date(Date.now() - 40 * 1000).toISOString(),
      latency_ms: 240,
      health: 'healthy',
      error_count: 0,
      mode: 'synthetic',
      expected_interval_s: 60,
    },
    {
      source: 'synthetic',
      last_success: new Date(Date.now() - 60 * 1000).toISOString(),
      latency_ms: 50,
      health: 'healthy',
      error_count: 0,
      mode: 'synthetic',
      expected_interval_s: 60,
    }
  ],

  pulse: {
    status: 'Elevated',
    active_incidents: 7,
    top_zone: 'Z04',
    top_anomaly: { type: 'traffic_incident', score: 2.4 },
    last_updated: new Date().toISOString(),
    brief: {
      headline: 'Heavy rain triggering traffic spikes in Zone 4',
      what_happened: 'A localized weather alert with 42.5mm/hr rain in Zone 4 was followed by multiple traffic incidents and transit delays along the Riverside corridor.',
      why_it_matters: 'Zone 4 traffic volume is running at 2.4x the historical baseline, with Route 12 transit delays extending to 18 minutes.',
      evidence: ['evt_rain_z04_001', 'evt_traf_z04_002', 'evt_tran_z04_003'],
      uncertainty: 'Observed temporal overlap strongly indicates traffic response to precipitation, though unmeasured road maintenance could also be a contributing factor.',
      source: 'fallback'
    },
    evidence: {
      zone: 'Z04',
      active_events: 3,
      top_anomaly: { type: 'traffic_incident', score: 2.4 },
      preceding_events: ['evt_rain_z04_001'],
      possible_correlations: [{ a: 'evt_rain_z04_001', b: 'evt_traf_z04_002', time_gap_min: 4 }],
      confidence: 0.88,
      uncertainty: 'Correlation does not establish direct causation.'
    }
  }
};
