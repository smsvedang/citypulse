const BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';

async function checkEndpoint(path) {
  try {
    const res = await fetch(`${BASE_URL}${path}`);
    const status = res.status;
    const body = await res.json().catch(() => null);
    if (res.ok) {
      console.log(`[PASS] ${path} -> HTTP ${status}`);
      return true;
    } else {
      console.error(`[FAIL] ${path} -> HTTP ${status}`, body);
      return false;
    }
  } catch (err) {
    console.error(`[ERROR] ${path} -> ${err.message}`);
    return false;
  }
}

async function runSmokeTests() {
  console.log(`--- Running CityPulse Smoke Tests against ${BASE_URL} ---`);
  const paths = [
    '/api/health',
    '/api/zones',
    '/api/events',
    '/api/pulse',
    '/api/feed-status',
    '/api/anomalies',
    '/api/correlations',
    '/api/alerts',
  ];

  let passed = 0;
  for (const path of paths) {
    const ok = await checkEndpoint(path);
    if (ok) passed++;
  }

  console.log(`\nSmoke tests finished: ${passed}/${paths.length} endpoints succeeded.`);
  if (passed < paths.length) {
    process.exit(1);
  }
}

runSmokeTests();
