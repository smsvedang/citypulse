export async function POST() {
  return Response.json({ status: 'replay_started', replay_id: 'replay_001' });
}