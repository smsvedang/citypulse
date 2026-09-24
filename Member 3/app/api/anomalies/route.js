export async function GET() {
  return Response.json([{
    id: 'an_001',
    zone_id: 'Z04',
    event_type: 'traffic_incident',
    score: 2.4,
    threshold: 1.5,
    is_triggered: true,
    current_count: 12,
    recent_average: 5,
    time_window_minutes: 60,
    detected_at: new Date().toISOString(),
    evidence: ['evt_001', 'evt_003', 'evt_005'],
    confidence: 0.91,
    metadata: { trend: 'increasing', spike_magnitude: 140, historical_context: '2.4x baseline' },
  }]);
}