const API = process.env.API_URL || 'http://localhost:4000/api';

async function req(method: string, path: string, body?: unknown) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { ok: r.ok, status: r.status, json };
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

const results: Record<string, string> = {};

async function main() {
  results['1-health'] = (await req('GET', '/health')).ok ? 'PASS' : 'FAIL';

  const sim = await req('POST', '/simulate/zone4');
  results['3-sim-start'] = sim.ok ? 'PASS' : 'FAIL';

  await sleep(35000);

  const events = await req('GET', '/events?zone=Z04');
  const evList = (events.json as unknown[]) ?? [];
  results['4-rain-traffic-transit'] =
    evList.length >= 5 ? 'PASS' : `FAIL (${evList.length} events)`;

  const anomalies = await req('GET', '/anomalies');
  results['7-anomaly'] =
    ((anomalies.json as unknown[])?.length ?? 0) > 0 ? 'PASS' : 'FAIL';

  const correlations = await req('GET', '/correlations');
  results['8-correlation'] =
    ((correlations.json as unknown[])?.length ?? 0) > 0 ? 'PASS' : 'FAIL';

  const zones = await req('GET', '/zones');
  const z4 = ((zones.json as Array<{ id: string; status?: string }>) ?? []).find(
    (z) => z.id === 'Z04',
  );
  results['9-zone4-status'] = z4?.status && z4.status !== 'normal' ? 'PASS' : 'NOT VERIFIED';

  const pulse = await req('GET', '/pulse');
  const brief = (pulse.json as { brief?: { source?: string } })?.brief;
  results['10-groq-or-fallback'] = brief?.source ? 'PASS' : 'FAIL';

  const alerts = await req('GET', '/alerts');
  results['11-alerts'] = ((alerts.json as unknown[])?.length ?? 0) > 0 ? 'PASS' : 'FAIL';

  const analytics = await req('GET', '/analytics');
  results['12-analytics'] = analytics.ok ? 'PASS' : 'FAIL';

  const failFeed = await req('POST', '/simulate/feed-failure', { feed: 'traffic' });
  const health = await req('GET', '/health');
  results['13-feed-failure'] =
    failFeed.ok && (health.json as { traffic?: string })?.traffic === 'Failed' ? 'PASS' : 'FAIL';
  await req('POST', '/simulate/feed-recover', { feed: 'traffic' });

  await req('POST', '/simulate/reset');
  const sim2 = await req('POST', '/simulate/zone4');
  results['15-reset-rerun'] = sim2.ok ? 'PASS' : 'FAIL';

  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
