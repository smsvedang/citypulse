export async function GET() {
  const timestamp = new Date().toISOString();
  return Response.json({
    status: 'success',
    timestamp,
    zones: [{
      zone: 'Z04',
      active_events_total: 17,
      anomalies: [{ id: 'an_001', event_type: 'traffic_incident', score: 2.4, detected_at: timestamp }],
      explanation: {
        headline: 'Traffic surge in Zone 4',
        what_happened: 'Traffic incidents are running at 2.4x the recent baseline.',
        why_it_matters: 'Travel times may be affected across the south corridor.',
        evidence: ['Traffic incidents 12', 'Weather alert 01'],
        uncertainty: 'Possible temporal relationship identified. Correlation does not establish causation.',
      },
      feed_health: {
        weather: { status: 'ok', last_update: timestamp },
        traffic: { status: 'ok', last_update: timestamp },
        transit: { status: 'delayed', last_update: timestamp },
      },
    }],
    generated_at: timestamp,
  });
}