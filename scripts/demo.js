const BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';

async function triggerDemo() {
  console.log(`--- Starting CityPulse Demo Replay on ${BASE_URL} ---`);
  try {
    const res = await fetch(`${BASE_URL}/api/replay/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: 'rain_zone4_chain', speed: 1.0 })
    });
    const data = await res.json();
    console.log('Replay trigger response:', data);
  } catch (err) {
    console.error('Failed to trigger replay:', err.message);
  }
}

triggerDemo();
