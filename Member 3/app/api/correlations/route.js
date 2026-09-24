export async function GET() {
  return Response.json([{
    id: 'corr_001',
    event_a: 'evt_weather_001',
    event_b: 'evt_traffic_001',
    zone_id: 'Z04',
    time_gap_minutes: 8,
    spatial_distance_km: 1.2,
    score: 0.86,
    detected_at: new Date().toISOString(),
    interpretation: 'possible temporal/spatial relationship',
    confidence: 0.89,
    metadata: { source_a: 'weather', source_b: 'traffic', interpretation_type: 'precedes' },
  }]);
}